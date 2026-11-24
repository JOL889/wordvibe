import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import { VALID_WORDS, type WordLength } from './src/data/words.ts';
import {
  resolveDailyEntertainmentSpotlight,
  type DailyEntertainmentSpotlight,
} from './src/game/entertainmentLogic.ts';
import {
  guessLocationFromTimezone,
  pickFallbackPersonalizedPuzzle,
  type InterestTagId,
  type PersonalizedPuzzleData,
  type UserLocationData,
} from './src/game/playerProfileLogic.ts';
import {
  getTriviaCategoryById,
  getTriviaDifficultyForStreak,
  pickFallbackTriviaQuestion,
  type GroundingSourceLink,
  type TriviaDifficulty,
  type TriviaQuestion,
} from './src/game/triviaLogic.ts';
import {
  isValidWordTriviaPayload,
  maskTargetWordIfLeaked,
  pickClueForRow,
  sanitizePuzzleCluesBundle,
  type PuzzleCluesBundle,
  type PuzzleWordTrivia,
} from './src/game/wordTriviaLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_BACKUP_MODEL = 'gemini-4-hydrogen';
const GEMINI_MODEL_LADDER = [
  GEMINI_MODEL,
  GEMINI_BACKUP_MODEL,
  'gemini-3.1-flash-lite',
] as const;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const COUNTRY_CODE_RE = /^[A-Z]{2}$/;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours per local calendar date
const TREND_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes per country/city
const MAX_CACHE_ENTRIES = 30;

interface CacheEntry {
  expiresAt: number;
  data: DailyEntertainmentSpotlight;
}

interface TrendCacheEntry {
  expiresAt: number;
  headlines: string[];
  wikiTopics: string[];
}

const spotlightCache = new Map<string, CacheEntry>();
const regionalTrendCache = new Map<string, TrendCacheEntry>();

function getServerLocalDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : '';
    });
}

function extractRssHeadlines(xml: string, limit = 12): string[] {
  const headlines: string[] = [];
  const itemMatches = xml.matchAll(/<item\b[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/gi);
  for (const match of itemMatches) {
    const raw = decodeXmlEntities(match[1] || '');
    // Strip trailing " - Publisher" suffix commonly added by Google News RSS
    const cleaned = raw
      .replace(/<[^>]+>/g, '')
      .replace(/\s+-\s+[^-]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length >= 12 && !headlines.includes(cleaned)) {
      headlines.push(cleaned);
      if (headlines.length >= limit) break;
    }
  }
  return headlines;
}

async function fetchRssFeed(url: string): Promise<string[]> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(3500),
    headers: {
      'User-Agent': 'WordVibe/1.0 (+https://wordvibe.app)',
      Accept: 'application/rss+xml, application/xml, text/xml;q=0.9',
    },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  return extractRssHeadlines(xml, 10);
}

async function fetchLiveEntertainmentHeadlines(dateKey: string): Promise<string[]> {
  const sources = [
    'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en',
    'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
  ];

  const results = await Promise.allSettled(sources.map((src) => fetchRssFeed(src)));
  const combined: string[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const h of r.value) {
        if (!combined.includes(h)) combined.push(h);
      }
    }
  }

  if (combined.length > 0) {
    return combined.slice(0, 12);
  }

  const parts = dateKey.split('-');
  const mm = parts[1] || '01';
  const dd = parts[2] || '01';
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${encodeURIComponent(mm)}/${encodeURIComponent(dd)}`,
      {
        signal: AbortSignal.timeout(3000),
        headers: { 'User-Agent': 'WordVibe/1.0' },
      }
    );
    if (wikiRes.ok) {
      const json = (await wikiRes.json()) as { events?: Array<{ text?: string }> };
      return (json.events || [])
        .map((ev) => (ev.text || '').replace(/\s+/g, ' ').trim())
        .filter((t) =>
          /(film|movie|music|album|song|award|broadway|television|concert|stage|actor|singer)/i.test(t)
        )
        .slice(0, 6);
    }
  } catch {
    // Graceful offline fallback
  }

  return [];
}

async function fetchLiveTrendingContext(params: {
  countryCode?: string;
  city?: string;
}): Promise<{ headlines: string[]; wikiTopics: string[] }> {
  const cc = COUNTRY_CODE_RE.test((params.countryCode || '').toUpperCase())
    ? params.countryCode!.toUpperCase()
    : 'US';
  const safeCity = (params.city || '').replace(/[^a-zA-Z0-9\s-]/g, '').trim().slice(0, 40);
  const cacheKey = `${cc}::${safeCity.toLowerCase()}`;
  const now = Date.now();
  const cached = regionalTrendCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { headlines: cached.headlines, wikiTopics: cached.wikiTopics };
  }

  const countryNewsUrl = `https://news.google.com/rss?hl=en-${cc}&gl=${cc}&ceid=${cc}:en`;
  const citySearchUrl = safeCity
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(safeCity)}&hl=en-${cc}&gl=${cc}&ceid=${cc}:en`
    : null;

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const wy = yesterday.getUTCFullYear();
  const wm = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
  const wd = String(yesterday.getUTCDate()).padStart(2, '0');
  const wikiTopUrl = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${wy}/${wm}/${wd}`;

  const [countryNews, cityNews, wikiRes] = await Promise.allSettled([
    fetchRssFeed(countryNewsUrl),
    citySearchUrl ? fetchRssFeed(citySearchUrl) : Promise.resolve([]),
    fetch(wikiTopUrl, {
      signal: AbortSignal.timeout(3000),
      headers: { 'User-Agent': 'WordVibe/1.0 (+https://wordvibe.app)' },
    }).then((r) => (r.ok ? r.json() : null)),
  ]);

  const headlines: string[] = [];
  if (cityNews.status === 'fulfilled') {
    for (const h of cityNews.value.slice(0, 5)) {
      if (!headlines.includes(h)) headlines.push(h);
    }
  }
  if (countryNews.status === 'fulfilled') {
    for (const h of countryNews.value.slice(0, 8)) {
      if (!headlines.includes(h)) headlines.push(h);
    }
  }

  const wikiTopics: string[] = [];
  if (wikiRes.status === 'fulfilled' && wikiRes.value) {
    const articles = (
      wikiRes.value as { items?: Array<{ articles?: Array<{ article?: string }> }> }
    ).items?.[0]?.articles;
    if (Array.isArray(articles)) {
      for (const art of articles) {
        const title = (art.article || '').replace(/_/g, ' ').trim();
        if (
          title &&
          !title.includes(':') &&
          title !== 'Main Page' &&
          title.length >= 3 &&
          !wikiTopics.includes(title)
        ) {
          wikiTopics.push(title);
          if (wikiTopics.length >= 8) break;
        }
      }
    }
  }

  if (regionalTrendCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = regionalTrendCache.keys().next().value;
    if (oldest) regionalTrendCache.delete(oldest);
  }
  regionalTrendCache.set(cacheKey, {
    expiresAt: now + TREND_CACHE_TTL_MS,
    headlines: headlines.slice(0, 10),
    wikiTopics: wikiTopics.slice(0, 8),
  });

  return {
    headlines: headlines.slice(0, 10),
    wikiTopics: wikiTopics.slice(0, 8),
  };
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

function extractJsonObject(rawText: string): unknown {
  const cleaned = rawText.trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function extractGroundingSources(response: unknown): GroundingSourceLink[] {
  const r = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      };
    }>;
  };
  const chunks = r?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const out: GroundingSourceLink[] = [];
  const seen = new Set<string>();
  for (const ch of chunks) {
    const uri = ch?.web?.uri?.trim();
    const title = ch?.web?.title?.trim() || 'Source';
    if (uri && (uri.startsWith('https://') || uri.startsWith('http://')) && !seen.has(uri)) {
      seen.add(uri);
      out.push({ title: title.slice(0, 64), url: uri });
      if (out.length >= 4) break;
    }
  }
  return out;
}

function isValidTriviaPayload(raw: unknown): raw is TriviaQuestion {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.question !== 'string' || obj.question.trim().length < 10) return false;
  if (!Array.isArray(obj.options) || obj.options.length !== 4) return false;
  if (!obj.options.every((opt) => typeof opt === 'string' && opt.trim().length > 0)) return false;
  if (
    typeof obj.correctIndex !== 'number' ||
    !Number.isInteger(obj.correctIndex) ||
    obj.correctIndex < 0 ||
    obj.correctIndex > 3
  ) {
    return false;
  }
  if (typeof obj.explanation !== 'string' || obj.explanation.trim().length < 5) return false;
  if (typeof obj.category !== 'string') return false;
  if (obj.difficulty !== 'easy' && obj.difficulty !== 'medium' && obj.difficulty !== 'hard') {
    return false;
  }
  return true;
}

const TRIVIA_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    question: {
      type: Type.STRING,
      description: 'Conversational, witty "Aha!" trivia question with relatable hooks—never dry or academic.',
    },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Exactly 4 distinct multiple-choice answer strings.',
    },
    correctIndex: {
      type: Type.INTEGER,
      description: '0-based index (0..3) of the single correct option.',
    },
    explanation: {
      type: Type.STRING,
      description: 'Crisp, friendly 1-sentence explanation of why the answer is right.',
    },
    funFact: {
      type: Type.STRING,
      description: 'Punchy, surprising 1-sentence "Did You Know?" takeaway revealed after answering.',
    },
    category: { type: Type.STRING, description: 'Category label for this question.' },
    difficulty: {
      type: Type.STRING,
      description: 'Difficulty tier: easy, medium, or hard.',
    },
    personalizationReason: {
      type: Type.STRING,
      description: 'Short 4-9 word explanation of how location, trends, or player taste shaped this question.',
    },
  },
  required: ['question', 'options', 'correctIndex', 'explanation', 'funFact', 'category', 'difficulty'],
};

const TRIVIA_BATCH_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: TRIVIA_RESPONSE_SCHEMA,
      description: 'Array of distinct trivia questions for the full round.',
    },
  },
  required: ['questions'],
};

const PERSONALIZED_PUZZLE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    target: {
      type: Type.STRING,
      description: 'Uppercase English word selected strictly from the supplied dictionary candidates.',
    },
    clue: {
      type: Type.STRING,
      description: 'Playful, conversational 8-16 word "Aha!" clue connecting the word to everyday life or local buzz without naming it.',
    },
    trendReason: {
      type: Type.STRING,
      description: 'Short badge caption (e.g. "Tuned for London, GB · Music & Culture").',
    },
    culturalNote: {
      type: Type.STRING,
      description: '1-2 sentence entertaining note revealed after finishing the puzzle.',
    },
    funFact: {
      type: Type.STRING,
      description: 'Punchy 1-sentence "Did You Know?" surprising fact revealed on solve.',
    },
  },
  required: ['target', 'clue', 'trendReason', 'culturalNote', 'funFact'],
};

const ROW_CLUE_ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    rowNumber: {
      type: Type.INTEGER,
      description: '1-based horizontal row index (1 to 7).',
    },
    clue: {
      type: Type.STRING,
      description:
        'A witty, relatable 1-2 sentence "Aha!" wordplay clue for the target word from a unique everyday angle for this horizontal line, never mentioning or spelling the target word.',
    },
    lateralNudge: {
      type: Type.STRING,
      description: 'Brief playful synonym, rhyme wink, or category nudge for this row.',
    },
  },
  required: ['rowNumber', 'clue', 'lateralNudge'],
};

const WORD_TRIVIA_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    riddle: {
      type: Type.STRING,
      description:
        'A witty, conversational, moderately solvable 2-sentence "Aha!" wordplay clue whose single-word answer is the target word, personalized to the player region without writing or spelling the answer.',
    },
    lateralClue: {
      type: Type.STRING,
      description:
        'A friendly 1-sentence relatable nudge (synonym or pop-culture wink) that makes players smile when they crack it.',
    },
    domain: {
      type: Type.STRING,
      description: 'Concise 2-3 word everyday theme label (e.g. "Daily Culture").',
    },
    answerFormatNote: {
      type: Type.STRING,
      description: 'Brief grammatical note (e.g. "5-letter noun").',
    },
    funFact: {
      type: Type.STRING,
      description: 'Punchy 1-sentence "Did You Know?" surprising trivia takeaway displayed once the word is solved.',
    },
    rowClues: {
      type: Type.ARRAY,
      items: ROW_CLUE_ITEM_SCHEMA,
      description:
        'Complete list of 7 distinct playful, conversational, moderately solvable clues covering horizontal Rows 1 through 7 in one JSON payload.',
    },
  },
  required: ['riddle', 'lateralClue', 'domain', 'answerFormatNote', 'funFact', 'rowClues'],
};

const PERSONALIZED_PUZZLE_CLUES_BUNDLE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    target: PERSONALIZED_PUZZLE_SCHEMA.properties.target,
    clue: PERSONALIZED_PUZZLE_SCHEMA.properties.clue,
    trendReason: PERSONALIZED_PUZZLE_SCHEMA.properties.trendReason,
    culturalNote: PERSONALIZED_PUZZLE_SCHEMA.properties.culturalNote,
    funFact: PERSONALIZED_PUZZLE_SCHEMA.properties.funFact,
    riddle: WORD_TRIVIA_SCHEMA.properties.riddle,
    lateralClue: WORD_TRIVIA_SCHEMA.properties.lateralClue,
    domain: WORD_TRIVIA_SCHEMA.properties.domain,
    answerFormatNote: WORD_TRIVIA_SCHEMA.properties.answerFormatNote,
    rowClues: WORD_TRIVIA_SCHEMA.properties.rowClues,
  },
  required: [
    'target',
    'clue',
    'trendReason',
    'culturalNote',
    'funFact',
    'riddle',
    'lateralClue',
    'domain',
    'answerFormatNote',
    'rowClues',
  ],
};

function sanitizeLocationPayload(raw: unknown): UserLocationData | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const city = typeof obj.city === 'string' ? obj.city.trim().slice(0, 60) : '';
  if (!city) return null;
  const rawCc = typeof obj.countryCode === 'string' ? obj.countryCode.trim().toUpperCase() : 'US';
  return {
    city,
    region: typeof obj.region === 'string' ? obj.region.trim().slice(0, 60) : '',
    countryCode: COUNTRY_CODE_RE.test(rawCc) ? rawCc : 'US',
    countryName:
      typeof obj.countryName === 'string' ? obj.countryName.trim().slice(0, 60) : 'United States',
    timezone: typeof obj.timezone === 'string' ? obj.timezone.trim().slice(0, 60) : 'UTC',
    source:
      obj.source === 'gps' || obj.source === 'ip' || obj.source === 'manual'
        ? obj.source
        : 'timezone',
    updatedAt: Date.now(),
  };
}

async function createAppServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '64kb' }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  app.post('/api/location/resolve', async (req, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      lat?: unknown;
      lon?: unknown;
      timezone?: unknown;
    };
    const tz = typeof body.timezone === 'string' ? body.timezone.slice(0, 60) : undefined;
    const lat = typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : null;
    const lon = typeof body.lon === 'number' && Number.isFinite(body.lon) ? body.lon : null;

    // 1. Reverse-geocode GPS coordinates when provided cleanly
    if (lat !== null && lon !== null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
            lat.toFixed(4)
          )}&lon=${encodeURIComponent(lon.toFixed(4))}&zoom=10`,
          {
            signal: AbortSignal.timeout(3500),
            headers: { 'User-Agent': 'WordVibe/1.0 (+https://wordvibe.app)' },
          }
        );
        if (nomRes.ok) {
          const geo = (await nomRes.json()) as {
            address?: {
              city?: string;
              town?: string;
              village?: string;
              county?: string;
              state?: string;
              country?: string;
              country_code?: string;
            };
          };
          const addr = geo.address;
          const city = addr?.city || addr?.town || addr?.village || addr?.county || '';
          const cc = (addr?.country_code || '').toUpperCase();
          if (city && COUNTRY_CODE_RE.test(cc)) {
            const loc: UserLocationData = {
              city,
              region: addr?.state || '',
              countryCode: cc,
              countryName: addr?.country || cc,
              lat,
              lon,
              timezone: tz || 'UTC',
              source: 'gps',
              updatedAt: Date.now(),
            };
            res.json({ location: loc });
            return;
          }
        }
      } catch {
        // Fall through cleanly to IP / timezone resolution
      }
    }

    // 2. IP-based city lookup when online without GPS coords
    try {
      const ipRes = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(2500),
        headers: { 'User-Agent': 'WordVibe/1.0' },
      });
      if (ipRes.ok) {
        const ipData = (await ipRes.json()) as {
          city?: string;
          region?: string;
          country_code?: string;
          country_name?: string;
          timezone?: string;
        };
        const cc = (ipData.country_code || '').toUpperCase();
        if (ipData.city && COUNTRY_CODE_RE.test(cc)) {
          const loc: UserLocationData = {
            city: ipData.city,
            region: ipData.region || '',
            countryCode: cc,
            countryName: ipData.country_name || cc,
            timezone: ipData.timezone || tz || 'UTC',
            source: 'ip',
            updatedAt: Date.now(),
          };
          res.json({ location: loc });
          return;
        }
      }
    } catch {
      // Offline / rate-limited -> fall through to timezone heuristic
    }

    res.json({ location: guessLocationFromTimezone(tz) });
  });

  app.get('/api/trending-local', async (req, res) => {
    const rawCc = typeof req.query.cc === 'string' ? req.query.cc.trim().toUpperCase() : 'US';
    const rawCity = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const trends = await fetchLiveTrendingContext({ countryCode: rawCc, city: rawCity });
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.json({
      countryCode: COUNTRY_CODE_RE.test(rawCc) ? rawCc : 'US',
      city: rawCity,
      headlines: trends.headlines.slice(0, 6),
      wikiTopics: trends.wikiTopics.slice(0, 6),
      fetchedAt: Date.now(),
    });
  });

  app.get('/api/entertainment-daily', async (req, res) => {
    const rawDate = typeof req.query.date === 'string' ? req.query.date.trim() : '';
    const dateKey = DATE_KEY_RE.test(rawDate) ? rawDate : getServerLocalDateKey();

    const now = Date.now();
    const cached = spotlightCache.get(dateKey);
    if (cached && cached.expiresAt > now) {
      res.setHeader('Cache-Control', 'public, max-age=900');
      res.json(cached.data);
      return;
    }

    let headlines: string[] = [];
    try {
      headlines = await fetchLiveEntertainmentHeadlines(dateKey);
    } catch {
      headlines = [];
    }

    const spotlight = resolveDailyEntertainmentSpotlight(dateKey, headlines);

    if (spotlightCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = spotlightCache.keys().next().value;
      if (oldestKey) spotlightCache.delete(oldestKey);
    }
    spotlightCache.set(dateKey, {
      expiresAt: now + CACHE_TTL_MS,
      data: spotlight,
    });

    res.setHeader('Cache-Control', 'public, max-age=900');
    res.json(spotlight);
  });

  app.post('/api/trivia', async (req, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      categoryId?: unknown;
      difficulty?: unknown;
      count?: unknown;
      startingStreak?: unknown;
      recentQuestions?: unknown;
      location?: unknown;
      playerSummary?: unknown;
      interests?: unknown;
      religion?: unknown;
    };

    const rawCategoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : 'general-knowledge';
    const categorySpec = getTriviaCategoryById(rawCategoryId);
    const religionTag = typeof body.religion === 'string' ? body.religion.trim().slice(0, 32) : '';
    const difficulty: TriviaDifficulty =
      body.difficulty === 'hard' || body.difficulty === 'medium' ? body.difficulty : 'easy';
    const requestedCount =
      typeof body.count === 'number' && Number.isInteger(body.count)
        ? Math.max(1, Math.min(body.count, 5))
        : 1;
    const startingStreak =
      typeof body.startingStreak === 'number' && Number.isFinite(body.startingStreak)
        ? Math.max(0, Math.floor(body.startingStreak))
        : 0;
    const recentQuestions = Array.isArray(body.recentQuestions)
      ? body.recentQuestions
          .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
          .slice(-15)
          .map((q) => q.slice(0, 180))
      : [];
    const location = sanitizeLocationPayload(body.location);
    const playerSummary =
      typeof body.playerSummary === 'string' ? body.playerSummary.trim().slice(0, 400) : '';
    const interests = Array.isArray(body.interests)
      ? body.interests.filter((x): x is string => typeof x === 'string').slice(0, 5)
      : [];

    const locationLabel = location ? `${location.city}, ${location.countryCode}` : undefined;
    const ai = getGeminiClient();

    const buildFallbackBatch = (): TriviaQuestion[] => {
      const seen = [...recentQuestions];
      const out: TriviaQuestion[] = [];
      for (let i = 0; i < requestedCount; i++) {
        const diff =
          i === 0 ? difficulty : getTriviaDifficultyForStreak(startingStreak + i);
        const q = pickFallbackTriviaQuestion(categorySpec.id, diff, seen, {
          locationLabel,
          interests,
        });
        out.push(q);
        seen.push(q.question);
      }
      return out;
    };

    if (!ai) {
      const fallbackBatch = buildFallbackBatch();
      res.json({
        question: fallbackBatch[0],
        questions: fallbackBatch,
        source: 'fallback',
        notice: 'Running curated trivia bank (set GEMINI_API_KEY for live Gemini generation).',
      });
      return;
    }

    const shouldFetchTrends =
      Boolean(location) ||
      categorySpec.id === 'local-trending' ||
      categorySpec.id === 'for-you-local' ||
      categorySpec.id === 'pop-culture';

    const trends = shouldFetchTrends
      ? await fetchLiveTrendingContext({
          countryCode: location?.countryCode || 'US',
          city: location?.city || '',
        }).catch(() => ({ headlines: [], wikiTopics: [] }))
      : { headlines: [], wikiTopics: [] };

    const avoidBlock =
      recentQuestions.length > 0
        ? `Do NOT repeat or closely paraphrase any of these already-asked questions or topics:\n${recentQuestions
            .map((q, idx) => `${idx + 1}. ${q}`)
            .join('\n')}`
        : 'Pick fresh, intriguing angles.';

    const personalizationBlock = [
      location
        ? `User Location: ${location.city}${location.region ? `, ${location.region}` : ''}, ${location.countryName} (${location.countryCode}).`
        : 'User Location: Global.',
      playerSummary ? `Studied Player Profile: ${playerSummary}.` : '',
      trends.headlines.length > 0
        ? `Live Regional Headlines Near User:\n- ${trends.headlines.slice(0, 5).join('\n- ')}`
        : '',
      trends.wikiTopics.length > 0
        ? `Trending Knowledge Topics Online Today: ${trends.wikiTopics.slice(0, 6).join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = [
      `Generate ${requestedCount} original, distinct multiple-choice trivia question${requestedCount > 1 ? 's' : ''} in ONE JSON response.`,
      `Category: ${categorySpec.name} (${categorySpec.tagline}).`,
      categorySpec.id === 'faith-study' && religionTag
        ? `Respectful Faith Tradition Focus: ${religionTag}.`
        : '',
      requestedCount > 1
        ? `Progressive difficulty across the ${requestedCount} questions: start at "${difficulty}" and keep questions engaging with "desirable difficulty".`
        : `Target difficulty: ${difficulty}.`,
      personalizationBlock,
      `Style & Engagement Rules:`,
      `- Write conversational, witty "Aha!" questions with pop-culture, everyday-life, or storytelling hooks—NEVER dry textbook phrasing.`,
      `- Every question must be 100% factually accurate, unambiguous, and cover a different sub-topic.`,
      `- Provide exactly 4 distinct plausible options per question; only 1 option is clearly correct.`,
      `- Set correctIndex to an integer 0, 1, 2, or 3 matching the correct option.`,
      `- Keep explanation to 1 crisp sentence, AND include a surprising, bite-sized 1-sentence funFact ("Did You Know?").`,
      `- Set category to "${categorySpec.name}" and difficulty to "easy", "medium", or "hard".`,
      `- Include personalizationReason (4-9 words explaining why this fits the user/region).`,
      avoidBlock,
    ]
      .filter(Boolean)
      .join('\n');

    const sanitizeQuestion = (rawQ: TriviaQuestion, sources?: GroundingSourceLink[]): TriviaQuestion => ({
      question: rawQ.question.trim(),
      options: [
        rawQ.options[0].trim(),
        rawQ.options[1].trim(),
        rawQ.options[2].trim(),
        rawQ.options[3].trim(),
      ],
      correctIndex: rawQ.correctIndex,
      explanation: rawQ.explanation.trim(),
      funFact:
        typeof (rawQ as { funFact?: unknown }).funFact === 'string' &&
        (rawQ as { funFact: string }).funFact.trim().length >= 8
          ? (rawQ as { funFact: string }).funFact.trim()
          : undefined,
      category: categorySpec.name,
      difficulty: rawQ.difficulty,
      personalizationReason:
        typeof (rawQ as { personalizationReason?: unknown }).personalizationReason === 'string' &&
        (rawQ as { personalizationReason: string }).personalizationReason.trim()
          ? (rawQ as { personalizationReason: string }).personalizationReason.trim()
          : locationLabel
          ? `Tailored for ${locationLabel}`
          : undefined,
      groundingSources: sources && sources.length > 0 ? sources : undefined,
    });

    const useGoogleSearch =
      categorySpec.id === 'local-trending' ||
      categorySpec.id === 'for-you-local' ||
      (Boolean(location) && categorySpec.id === 'pop-culture');

    if (useGoogleSearch) {
      try {
        const groundedPrompt = `${prompt}\n\nReturn ONLY raw valid JSON (no markdown fences) matching:\n{"questions":[{"question":string,"options":[string,string,string,string],"correctIndex":0|1|2|3,"explanation":string,"category":"${categorySpec.name}","difficulty":"${difficulty}","personalizationReason":string}]}`;
        const groundedRes = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: groundedPrompt,
          config: {
            tools: [{ googleSearch: {} }],
            abortSignal: AbortSignal.timeout(8500),
          },
        });
        const parsedGrounded = extractJsonObject(groundedRes.text || '') as {
          questions?: unknown[];
        } | null;
        const candidateList = Array.isArray(parsedGrounded?.questions)
          ? parsedGrounded!.questions
          : isValidTriviaPayload(parsedGrounded)
          ? [parsedGrounded]
          : [];
        const validGrounded = candidateList.filter(isValidTriviaPayload);
        if (validGrounded.length > 0) {
          const sources = extractGroundingSources(groundedRes);
          const sanitizedList = validGrounded.map((q) => sanitizeQuestion(q, sources));
          res.json({
            question: sanitizedList[0],
            questions: sanitizedList,
            source: 'gemini',
          });
          return;
        }
      } catch {
        // Fall through cleanly to structured schema generation
      }
    }

    try {
      let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
      let lastTriviaErr: unknown = null;
      let modelIdx = 0;
      for (let attempt = 0; attempt < 3; attempt++) {
        const activeModel = GEMINI_MODEL_LADDER[Math.min(modelIdx, GEMINI_MODEL_LADDER.length - 1)];
        try {
          response = await ai.models.generateContent({
            model: activeModel,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema:
                requestedCount > 1 ? TRIVIA_BATCH_RESPONSE_SCHEMA : TRIVIA_RESPONSE_SCHEMA,
              abortSignal: AbortSignal.timeout(12000),
            },
          });
          break;
        } catch (err) {
          lastTriviaErr = err;
          const msg = err instanceof Error ? err.message : '';
          const errName = err instanceof Error ? err.name : '';
          const status =
            typeof (err as { status?: unknown })?.status === 'number'
              ? (err as { status: number }).status
              : 0;
          const isTimeoutOrBusy =
            errName === 'TimeoutError' ||
            errName === 'AbortError' ||
            status === 503 ||
            status === 404 ||
            status === 429 ||
            /503|UNAVAILABLE|404|NOT_FOUND|429|RESOURCE_EXHAUSTED|timeout|aborted/i.test(msg);
          if (attempt < 2 && isTimeoutOrBusy) {
            if (status !== 429) {
              modelIdx = Math.min(modelIdx + 1, GEMINI_MODEL_LADDER.length - 1);
            }
            await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
            continue;
          }
          throw err;
        }
      }
      if (!response) {
        throw lastTriviaErr || new Error('Empty response from Gemini');
      }

      const parsed = JSON.parse(response.text || '{}') as {
        questions?: unknown[];
      };
      const candidateList =
        requestedCount > 1 && Array.isArray(parsed.questions)
          ? parsed.questions
          : isValidTriviaPayload(parsed)
          ? [parsed]
          : [];
      const validQuestions = candidateList.filter(isValidTriviaPayload);
      if (validQuestions.length > 0) {
        const sanitizedList = validQuestions.map((q) => sanitizeQuestion(q));
        res.json({
          question: sanitizedList[0],
          questions: sanitizedList,
          source: 'gemini',
        });
        return;
      }
      throw new Error('Invalid JSON trivia schema returned by model');
    } catch {
      const fallbackBatch = buildFallbackBatch();
      res.json({
        question: fallbackBatch[0],
        questions: fallbackBatch,
        source: 'fallback',
        notice: 'Switched to offline question bank cleanly for uninterrupted play.',
      });
    }
  });

  const puzzleCluesCache = new Map<
    string,
    { expiresAt: number; bundle: PuzzleCluesBundle }
  >();
  const WORD_TRIVIA_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

  function buildPuzzleClueCacheKey(
    targetWord: string,
    categoryName: string,
    location: UserLocationData | null,
    interests: string[]
  ): string {
    const locKey = location ? `${location.countryCode}:${location.city.toLowerCase()}` : 'global';
    const intKey = interests.slice(0, 3).join(',').toLowerCase() || 'general';
    return `${targetWord}::${categoryName.toLowerCase()}::${locKey}::${intKey}`;
  }

  function cachePuzzleCluesBundle(
    cacheKey: string,
    bundle: PuzzleCluesBundle
  ): void {
    if (puzzleCluesCache.size >= 150) {
      const oldestKey = puzzleCluesCache.keys().next().value;
      if (oldestKey) puzzleCluesCache.delete(oldestKey);
    }
    puzzleCluesCache.set(cacheKey, {
      expiresAt: Date.now() + WORD_TRIVIA_CACHE_TTL_MS,
      bundle,
    });
  }

  async function generateUnifiedWordTriviaBundle(params: {
    ai: GoogleGenAI;
    targetWord: string;
    categoryName: string;
    rowNumber: number;
    maxRows: number;
    location: UserLocationData | null;
    interests: string[];
    userDossier?: string;
    localHeadlines?: string[];
  }): Promise<PuzzleCluesBundle> {
    const {
      ai,
      targetWord,
      categoryName,
      rowNumber,
      maxRows,
      location,
      interests,
      userDossier,
      localHeadlines = [],
    } = params;
    const locationLabel = location
      ? `${location.city}${location.region ? `, ${location.region}` : ''}, ${location.countryName}`
      : 'Global';

    const prompt = [
      `Generate ALL horizontal-line puzzle clues for the single target word "${targetWord}" (${targetWord.length} letters) in ONE JSON response.`,
      `Puzzle Category Context: ${categoryName}. Primary requested line: Row ${rowNumber}.`,
      `Player Location: ${locationLabel}.`,
      interests.length > 0 ? `Player Interests: ${interests.join(', ')}.` : '',
      userDossier ? `Researched Player Profile: ${userDossier}.` : '',
      localHeadlines.length > 0
        ? `Regional Context / Today's Local Buzz:\n- ${localHeadlines.slice(0, 3).join('\n- ')}`
        : '',
      `Strict "Aha!" Clue Style & Calibration Rules:`,
      `1. Write clever, conversational, relatable wordplay clues (like top daily puzzle games—never dry dictionary definitions!) that spark an "Aha!" smile when solved. Keep difficulty balanced ("desirable difficulty"): relatable pop-culture, everyday life, or regional cues near ${locationLabel}.`,
      `2. Personalize the framing subtly to the player's location (${locationLabel}) and interests/profile when natural.`,
      `3. NEVER write "${targetWord}", any plural/inflected form of "${targetWord}", or spell out its letters (like "starts with ${targetWord[0]}").`,
      `4. Include a playful lateralClue (synonym wink or everyday association), a 2-3 word domain label, answerFormatNote (e.g. "${targetWord.length}-letter noun"), AND a punchy 1-sentence "funFact" ("Did You Know?") for when the player solves the word.`,
      `5. In rowClues, generate ${maxRows} distinct, concise (1-2 short sentences), witty entries (rowNumber 1 through ${maxRows}) offering varied relatable angles on "${targetWord}" for each row.`,
    ]
      .filter(Boolean)
      .join('\n');

    let lastErr: unknown = null;
    let parsed: unknown = null;
    let modelIdx = 0;
    const attemptTrail: string[] = [];

    for (let attempt = 0; attempt < 3; attempt++) {
      const activeModel = GEMINI_MODEL_LADDER[Math.min(modelIdx, GEMINI_MODEL_LADDER.length - 1)];
      try {
        const response = await ai.models.generateContent({
          model: activeModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: WORD_TRIVIA_SCHEMA,
            abortSignal: AbortSignal.timeout(12000 + attempt * 2000),
          },
        });
        parsed = extractJsonObject(response.text || '');
        if (parsed && typeof parsed === 'object') break;
        attemptTrail.push(`${activeModel}:empty`);
        lastErr = new Error('Unexpected response format from Gemini.');
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : '';
        const errName = err instanceof Error ? err.name : '';
        const errStatus =
          typeof (err as { status?: unknown })?.status === 'number'
            ? (err as { status: number }).status
            : 0;
        attemptTrail.push(`${activeModel}:${errStatus || errName || 'err'}`);
        if (
          errStatus === 400 ||
          errStatus === 403 ||
          /API_KEY_INVALID|PERMISSION_DENIED|INVALID_ARGUMENT/i.test(msg)
        ) {
          break;
        }
        const isTimedOut =
          errName === 'TimeoutError' ||
          errName === 'AbortError' ||
          /timeout|aborted/i.test(msg);
        const isModelBusyOrMissing =
          isTimedOut ||
          errStatus === 503 ||
          errStatus === 404 ||
          /UNAVAILABLE|NOT_FOUND|high demand|503|404/i.test(msg);
        if (isModelBusyOrMissing) {
          modelIdx = Math.min(modelIdx + 1, GEMINI_MODEL_LADDER.length - 1);
        }
        if (attempt < 2) {
          const delayMs =
            errStatus === 429 || /RESOURCE_EXHAUSTED|429/i.test(msg)
              ? 1200
              : 700 * (attempt + 1);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      const baseErr =
        lastErr instanceof Error
          ? lastErr
          : new Error('Gemini returned an unexpected format for puzzle clues.');
      (baseErr as Error & { attemptTrail?: string[] }).attemptTrail = attemptTrail;
      throw baseErr;
    }

    const candidateObj = parsed as {
      riddle?: unknown;
      lateralClue?: unknown;
      domain?: unknown;
      answerFormatNote?: unknown;
      funFact?: unknown;
      rowClues?: Array<{ rowNumber?: number; clue?: string; lateralNudge?: string }>;
    };

    const normalizedForValidation = {
      riddle: typeof candidateObj.riddle === 'string' ? candidateObj.riddle : '',
      lateralClue:
        typeof candidateObj.lateralClue === 'string' && candidateObj.lateralClue.trim()
          ? candidateObj.lateralClue
          : `Think about everyday ${categoryName} clues for this ${targetWord.length}-letter word.`,
      domain:
        typeof candidateObj.domain === 'string' && candidateObj.domain.trim()
          ? candidateObj.domain
          : categoryName,
      answerFormatNote:
        typeof candidateObj.answerFormatNote === 'string' && candidateObj.answerFormatNote.trim()
          ? candidateObj.answerFormatNote
          : `${targetWord.length}-letter word`,
    };

    if (!isValidWordTriviaPayload(normalizedForValidation)) {
      throw new Error('Gemini returned an incomplete puzzle clue payload.');
    }

    const bundle = sanitizePuzzleCluesBundle(
      {
        ...normalizedForValidation,
        personalizedFor: location ? `${location.city}, ${location.countryCode}` : undefined,
        funFact: typeof candidateObj.funFact === 'string' ? candidateObj.funFact : undefined,
        rowClues: Array.isArray(candidateObj.rowClues) ? candidateObj.rowClues : [],
      },
      targetWord,
      categoryName,
      maxRows
    );
    cachePuzzleCluesBundle(
      buildPuzzleClueCacheKey(targetWord, categoryName, location, interests),
      bundle
    );
    return bundle;
  }

  async function handlePersonalizedPuzzleWithClues(req: express.Request, res: express.Response) {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      length?: unknown;
      location?: unknown;
      interests?: unknown;
      recentWords?: unknown;
      playerSummary?: unknown;
      maxRows?: unknown;
    };

    const length: WordLength = body.length === 4 || body.length === 6 ? body.length : 5;
    const maxRows =
      typeof body.maxRows === 'number' && Number.isInteger(body.maxRows)
        ? Math.max(6, Math.min(body.maxRows, 7))
        : 7;
    const location = sanitizeLocationPayload(body.location);
    const interests = Array.isArray(body.interests)
      ? (body.interests.filter((x): x is InterestTagId => typeof x === 'string').slice(0, 5))
      : (['pop-culture', 'science-tech'] as InterestTagId[]);
    const recentWords = Array.isArray(body.recentWords)
      ? body.recentWords.filter((w): w is string => typeof w === 'string').map((w) => w.toUpperCase())
      : [];
    const playerSummary =
      typeof body.playerSummary === 'string' ? body.playerSummary.trim().slice(0, 400) : '';

    const trends = await fetchLiveTrendingContext({
      countryCode: location?.countryCode || 'US',
      city: location?.city || '',
    }).catch(() => ({ headlines: [], wikiTopics: [] }));

    const ai = getGeminiClient();
    const validSet = VALID_WORDS[length];
    const fallbackData = pickFallbackPersonalizedPuzzle({
      length,
      interests,
      location,
      excludeWords: recentWords,
      trendingHeadlines: trends.headlines,
    });

    if (!ai) {
      res.json({
        puzzle: fallbackData,
        bundle: null,
        source: 'fallback',
        headlines: trends.headlines.slice(0, 3),
      });
      return;
    }

    const allValid = Array.from(validSet).filter((w) => !recentWords.includes(w));
    const sampleStep = Math.max(1, Math.floor(allValid.length / 45));
    const candidates: string[] = [];
    for (let i = 0; i < allValid.length && candidates.length < 45; i += sampleStep) {
      candidates.push(allValid[i]);
    }
    if (!candidates.includes(fallbackData.target)) {
      candidates.unshift(fallbackData.target);
    }

    const locationLabel = location ? `${location.city}, ${location.countryCode}` : 'Global';
    const puzzlePrompt = [
      `Pick 1 English target word of exact length ${length} letters from the approved list below and generate ALL puzzle clues for it in ONE single JSON response.`,
      `Match the word as closely as possible to the user's location, live local trends, or studied interests.`,
      `User Location: ${locationLabel}.`,
      playerSummary ? `Studied Player Profile: ${playerSummary}.` : '',
      trends.headlines.length > 0
        ? `Live Headlines Near User:\n- ${trends.headlines.slice(0, 5).join('\n- ')}`
        : '',
      `Approved ${length}-letter English candidates (MUST pick exactly one word verbatim):`,
      candidates.join(', '),
      `Requirements:`,
      `1. Write a crisp 8-15 word clue ("clue") and a 1-2 sentence post-game "culturalNote" that NEVER spell the chosen word.`,
      `2. Also generate the full horizontal word trivia bundle in the same JSON: "riddle" (2-3 sentences), "lateralClue" (1 sentence), "domain" (2-3 words), "answerFormatNote" (e.g. "${length}-letter noun"), and "rowClues" (1 through ${maxRows}) without ever leaking the chosen word.`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
      try {
        response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: puzzlePrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: PERSONALIZED_PUZZLE_CLUES_BUNDLE_SCHEMA,
            abortSignal: AbortSignal.timeout(12000),
          },
        });
      } catch (primaryErr) {
        const msg = primaryErr instanceof Error ? primaryErr.message : '';
        const errName = primaryErr instanceof Error ? primaryErr.name : '';
        const errStatus =
          typeof (primaryErr as { status?: unknown })?.status === 'number'
            ? (primaryErr as { status: number }).status
            : 0;
        if (
          errName === 'TimeoutError' ||
          errName === 'AbortError' ||
          errStatus === 503 ||
          errStatus === 404 ||
          /timeout|aborted|UNAVAILABLE|NOT_FOUND|503|404/i.test(msg)
        ) {
          response = await ai.models.generateContent({
            model: GEMINI_BACKUP_MODEL,
            contents: puzzlePrompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: PERSONALIZED_PUZZLE_CLUES_BUNDLE_SCHEMA,
              abortSignal: AbortSignal.timeout(15000),
            },
          });
        } else {
          throw primaryErr;
        }
      }
      const parsed = JSON.parse(response.text || '{}') as Partial<PersonalizedPuzzleData> & {
        riddle?: string;
        lateralClue?: string;
        domain?: string;
        answerFormatNote?: string;
        rowClues?: Array<{ rowNumber?: number; clue?: string; lateralNudge?: string }>;
      };
      const chosenWord = typeof parsed.target === 'string' ? parsed.target.trim().toUpperCase() : '';
      if (
        chosenWord.length === length &&
        validSet.has(chosenWord) &&
        !recentWords.includes(chosenWord) &&
        typeof parsed.clue === 'string' &&
        parsed.clue.trim().length >= 8
      ) {
        const puzzle: PersonalizedPuzzleData = {
          target: chosenWord,
          length,
          clue: maskTargetWordIfLeaked(parsed.clue, chosenWord),
          trendReason:
            typeof parsed.trendReason === 'string' && parsed.trendReason.trim()
              ? parsed.trendReason.trim()
              : `Tuned for ${locationLabel}`,
          culturalNote:
            typeof parsed.culturalNote === 'string' && parsed.culturalNote.trim()
              ? parsed.culturalNote.trim()
              : fallbackData.culturalNote,
          funFact:
            typeof parsed.funFact === 'string' && parsed.funFact.trim()
              ? parsed.funFact.trim()
              : fallbackData.funFact,
          locationLabel,
        };

        let bundle: PuzzleCluesBundle | null = null;
        if (typeof parsed.riddle === 'string' && parsed.riddle.trim().length >= 8) {
          bundle = sanitizePuzzleCluesBundle(
            {
              riddle: parsed.riddle,
              lateralClue: parsed.lateralClue || '',
              domain: parsed.domain || 'Curated Spotlight',
              answerFormatNote: parsed.answerFormatNote || `${length}-letter word`,
              personalizedFor: location ? `${location.city}, ${location.countryCode}` : undefined,
              funFact: typeof parsed.funFact === 'string' ? parsed.funFact : undefined,
              rowClues: Array.isArray(parsed.rowClues) ? parsed.rowClues : [],
            },
            chosenWord,
            'For You',
            maxRows
          );
          cachePuzzleCluesBundle(
            buildPuzzleClueCacheKey(chosenWord, 'General Vocabulary', location, interests),
            bundle
          );
          cachePuzzleCluesBundle(
            buildPuzzleClueCacheKey(chosenWord, 'For You', location, interests),
            bundle
          );
        }

        res.json({
          puzzle,
          bundle,
          source: 'gemini',
          headlines: trends.headlines.slice(0, 3),
        });
        return;
      }
      throw new Error('Model selected word outside dictionary');
    } catch {
      res.json({
        puzzle: fallbackData,
        bundle: null,
        source: 'fallback',
        headlines: trends.headlines.slice(0, 3),
      });
    }
  }

  app.post('/api/personalized-puzzle', handlePersonalizedPuzzleWithClues);

  async function handleUnifiedPuzzleClues(req: express.Request, res: express.Response) {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      mode?: unknown;
      targetWord?: unknown;
      categoryName?: unknown;
      rowNumber?: unknown;
      maxRows?: unknown;
      location?: unknown;
      interests?: unknown;
      playerSummary?: unknown;
    };

    if (body.mode === 'personalized') {
      await handlePersonalizedPuzzleWithClues(req, res);
      return;
    }

    const targetWord =
      typeof body.targetWord === 'string' ? body.targetWord.trim().toUpperCase() : '';
    if (!/^[A-Z]{4,6}$/.test(targetWord)) {
      res.status(400).json({ error: 'Valid 4-to-6 letter targetWord is required.' });
      return;
    }

    const categoryName =
      typeof body.categoryName === 'string' && body.categoryName.trim()
        ? body.categoryName.trim().slice(0, 60)
        : 'General Vocabulary';
    const maxRows =
      typeof body.maxRows === 'number' && Number.isInteger(body.maxRows)
        ? Math.max(6, Math.min(body.maxRows, 7))
        : 7;
    const rowNumber =
      typeof body.rowNumber === 'number' && Number.isInteger(body.rowNumber) && body.rowNumber >= 1
        ? Math.min(body.rowNumber, maxRows)
        : 1;

    const location = sanitizeLocationPayload(body.location);
    const interests = Array.isArray(body.interests)
      ? body.interests.filter((x): x is string => typeof x === 'string').slice(0, 5)
      : [];
    const userDossier =
      typeof body.playerSummary === 'string' ? body.playerSummary.trim().slice(0, 600) : '';

    const cacheKey = buildPuzzleClueCacheKey(targetWord, categoryName, location, interests);
    const cachedEntry = puzzleCluesCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      res.json({
        bundle: cachedEntry.bundle,
        trivia: pickClueForRow(cachedEntry.bundle, rowNumber),
        source: 'gemini-cache',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Live AI word trivia requires GEMINI_API_KEY configured in Settings > Secrets.',
      });
      return;
    }

    const trends = location
      ? await Promise.race([
          fetchLiveTrendingContext({
            countryCode: location.countryCode || 'US',
            city: location.city || '',
          }).catch(() => ({ headlines: [] as string[], wikiTopics: [] as string[] })),
          new Promise<{ headlines: string[]; wikiTopics: string[] }>((resolve) =>
            setTimeout(() => resolve({ headlines: [], wikiTopics: [] }), 1800)
          ),
        ])
      : { headlines: [], wikiTopics: [] };

    try {
      const bundle = await generateUnifiedWordTriviaBundle({
        ai,
        targetWord,
        categoryName,
        rowNumber,
        maxRows,
        location,
        interests,
        userDossier,
        localHeadlines: trends.headlines,
      });

      res.json({
        bundle,
        trivia: pickClueForRow(bundle, rowNumber),
        source: 'gemini',
      });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Unable to reach Gemini API.';
      const errName = err instanceof Error ? err.name : '';
      const errStatus =
        typeof (err as { status?: unknown })?.status === 'number'
          ? (err as { status: number }).status
          : 0;
      const status =
        errName === 'TimeoutError' || errName === 'AbortError' || /timeout|aborted/i.test(rawMessage)
          ? 504
          : errStatus === 403 || /API_KEY_INVALID|PERMISSION_DENIED|403/i.test(rawMessage)
          ? 403
          : errStatus === 404 || /NOT_FOUND|404/i.test(rawMessage)
          ? 404
          : errStatus === 429 || /RESOURCE_EXHAUSTED|429|quota/i.test(rawMessage)
          ? 429
          : errStatus === 503 || /UNAVAILABLE|503|high demand/i.test(rawMessage)
          ? 503
          : errStatus === 400 || /INVALID_ARGUMENT|400/i.test(rawMessage)
          ? 400
          : 502;
      const attemptTrail = (err as { attemptTrail?: string[] })?.attemptTrail;
      console.warn(
        `[puzzle-clues] Gemini upstream error (${status}, errStatus=${errStatus}${
          attemptTrail?.length ? `, trail=${attemptTrail.join(',')}` : ''
        }):`,
        rawMessage
      );
      res.status(status).json({
        error:
          status === 504
            ? 'AI word trivia timed out waiting for Gemini. Tap Retry to try again.'
            : status === 403
            ? 'Gemini API key rejected. Please verify GEMINI_API_KEY in Settings > Secrets.'
            : status === 404
            ? 'Gemini model unavailable for this API key. Check model access in Settings > Secrets.'
            : status === 429
            ? 'Gemini API rate limit reached. Wait a moment and retry, or check your key quota in Settings > Secrets.'
            : status === 503
            ? 'Gemini is experiencing temporary high demand. Tap Retry in a moment.'
            : 'Could not generate AI word trivia right now. Please retry.',
      });
    }
  }

  app.post('/api/puzzle-clues', handleUnifiedPuzzleClues);
  app.post('/api/puzzle-word-trivia', handleUnifiedPuzzleClues);

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: null,
      },
      appType: 'spa',
    });
    // Vite 8 injects /@vite/client into index.html and opens a WebSocket to port 24678
    // in middlewareMode even when hmr/ws are false; serve a minimal HMR-disabled client
    // module so CSS injection and module helpers work cleanly without WebSocket errors.
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript; charset=utf-8').send([
        'const sheetsMap = new Map();',
        'const linkSheetsMap = new Map();',
        'if (typeof document !== "undefined") {',
        '  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {',
        '    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);',
        '  });',
        '  document.querySelectorAll(\'link[rel="stylesheet"][data-vite-dev-id]\').forEach((el) => {',
        '    linkSheetsMap.set(el.getAttribute("data-vite-dev-id"), el);',
        '  });',
        '}',
        'export function updateStyle(id, content) {',
        '  if (linkSheetsMap.has(id)) return;',
        '  let style = sheetsMap.get(id);',
        '  if (!style) {',
        '    style = document.createElement("style");',
        '    style.setAttribute("type", "text/css");',
        '    style.setAttribute("data-vite-dev-id", id);',
        '    style.textContent = content;',
        '    document.head.appendChild(style);',
        '  } else if (style.textContent !== content) {',
        '    style.textContent = content;',
        '  }',
        '  sheetsMap.set(id, style);',
        '}',
        'export function removeStyle(id) {',
        '  if (linkSheetsMap.has(id)) {',
        '    document.querySelectorAll(\'link[rel="stylesheet"][data-vite-dev-id="\' + CSS.escape(id) + \'"]\').forEach((el) => el.remove());',
        '    linkSheetsMap.delete(id);',
        '  }',
        '  const style = sheetsMap.get(id);',
        '  if (style) {',
        '    style.remove();',
        '    sheetsMap.delete(id);',
        '  }',
        '}',
        'export function createHotContext() {',
        '  return {',
        '    data: {},',
        '    accept() {},',
        '    acceptExports() {},',
        '    dispose() {},',
        '    prune() {},',
        '    decline() {},',
        '    invalidate() {},',
        '    on() {},',
        '    off() {},',
        '    send() {},',
        '  };',
        '}',
        'export function injectQuery(url, queryToInject) {',
        '  if (url[0] !== "." && url[0] !== "/") return url;',
        '  const pathname = url.replace(/[?#].*$/, "");',
        '  const { search, hash } = new URL(url, "http://vite.dev");',
        '  return `${pathname}?${queryToInject}${search ? "&" + search.slice(1) : ""}${hash || ""}`;',
        '}',
        'export class ErrorOverlay {}',
      ].join('\n'));
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output missing. Run npm run build first.');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`WordVibe server listening on http://0.0.0.0:${port}`);
  });
}

createAppServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
