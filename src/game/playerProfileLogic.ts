import { getCategoryById } from '../data/categories';
import { SOLUTION_WORDS, VALID_WORDS, type WordLength } from '../data/words';
import type { TriviaDifficulty } from './triviaLogic';
import type { UserEnvironmentSnapshot } from './userResearchLogic';

export type LocationSource = 'gps' | 'ip' | 'timezone' | 'manual';

export interface UserLocationData {
  city: string;
  region: string;
  countryCode: string;
  countryName: string;
  lat?: number;
  lon?: number;
  timezone: string;
  source: LocationSource;
  updatedAt: number;
}

export type InterestTagId =
  | 'pop-culture'
  | 'science-tech'
  | 'travel-history'
  | 'sports-games'
  | 'mystery-crime'
  | 'food-lifestyle'
  | 'astrology-mystic'
  | 'business-finance'
  | 'nature-earth'
  | 'arts-literature';

export interface InterestSpec {
  id: InterestTagId;
  label: string;
  keywords: string[];
  categoryIds: string[];
}

export const INTEREST_CATALOG: InterestSpec[] = [
  {
    id: 'pop-culture',
    label: 'Music & Pop Culture',
    keywords: ['MUSIC', 'STAGE', 'RADIO', 'DANCE', 'DRAMA', 'AUDIO', 'MOVIE', 'STAR', 'SHOW', 'SING'],
    categoryIds: ['awards-red-carpet', 'streaming-binge', 'pop-hits-charts', 'celebrity-buzz'],
  },
  {
    id: 'science-tech',
    label: 'Science & Tech',
    keywords: ['ROBOT', 'LASER', 'ORBIT', 'SMART', 'CLOUD', 'SPACE', 'CYBER', 'PULSE', 'ATOM', 'DATA'],
    categoryIds: ['ai-future-tech', 'astronomy-space', 'cybersecurity', 'robotics-eng'],
  },
  {
    id: 'travel-history',
    label: 'Travel & Landmarks',
    keywords: ['TRAIN', 'COAST', 'GLOBE', 'ROUTE', 'PLAZA', 'HOTEL', 'TRAIL', 'PLANE', 'MAP', 'TOUR'],
    categoryIds: ['world-capitals', 'ancient-empires', 'island-escapes', 'aviation-flight'],
  },
  {
    id: 'sports-games',
    label: 'Sports & Gaming',
    keywords: ['ARENA', 'MATCH', 'MEDAL', 'SCORE', 'QUEST', 'RALLY', 'LEVEL', 'CHESS', 'GOAL', 'TEAM'],
    categoryIds: ['gaming-esports', 'olympic-sports', 'soccer-world', 'basketball-hoops'],
  },
  {
    id: 'mystery-crime',
    label: 'Mystery & Sleuth',
    keywords: ['CLUES', 'ALIBI', 'VAULT', 'PROOF', 'CIPHE', 'TRACE', 'SLEUT', 'GUARD', 'CODE', 'MASK'],
    categoryIds: ['true-crime-files', 'detective-noir', 'secret-societies', 'espionage-spy'],
  },
  {
    id: 'food-lifestyle',
    label: 'Food & Coffee',
    keywords: ['ROAST', 'SPICE', 'FEAST', 'BAKER', 'PASTA', 'OLIVE', 'BERRY', 'CREAM', 'CHEF', 'BREW'],
    categoryIds: ['coffee-cafe', 'gourmet-baking', 'street-food', 'world-spices'],
  },
  {
    id: 'astrology-mystic',
    label: 'Astrology & Mystic',
    keywords: ['ASTRO', 'LUNAR', 'TAROT', 'ZODIA', 'DREAM', 'SOLAR', 'COMET', 'ORACL', 'STAR', 'MOON'],
    categoryIds: ['astrology', 'tarot-mystic', 'lucid-dreams', 'mythical-lore'],
  },
  {
    id: 'business-finance',
    label: 'Markets & Finance',
    keywords: ['TRADE', 'STOCK', 'VALUE', 'PRIME', 'TRUST', 'GRANT', 'SCALE', 'BRAND', 'BANK', 'FUND'],
    categoryIds: ['stock-markets', 'crypto-web3', 'luxury-brands', 'startup-founders'],
  },
  {
    id: 'nature-earth',
    label: 'Nature & Climate',
    keywords: ['RIVER', 'OCEAN', 'CORAL', 'FLORA', 'STORM', 'FROST', 'RIDGE', 'CLOUD', 'TREE', 'RAIN'],
    categoryIds: ['deep-ocean', 'weather-storms', 'rainforest-wild', 'botanical-bloom'],
  },
  {
    id: 'arts-literature',
    label: 'Books & Design',
    keywords: ['NOVEL', 'VERSE', 'PAINT', 'FRAME', 'STYLE', 'PROSE', 'CRAFT', 'CHORD', 'BOOK', 'POEM'],
    categoryIds: ['classic-books', 'modern-art', 'architecture', 'poetry-verse'],
  },
];

export type ChallengePace = 'relaxed' | 'adaptive' | 'brainiac';

export interface TriviaTopicPerformance {
  answered: number;
  correct: number;
}

export interface PlayerProfileState {
  locationEnabled: boolean;
  locationOptOut?: boolean;
  location: UserLocationData | null;
  displayName?: string;
  focusField?: string;
  environmentSnapshot?: UserEnvironmentSnapshot;
  selectedInterests: InterestTagId[];
  challengePace: ChallengePace;
  totalPuzzlesStudied: number;
  puzzleWins: number;
  totalGuessesSum: number;
  boardLengthCounts: Record<number, number>;
  categoryAffinity: Record<string, number>;
  triviaAnswered: number;
  triviaCorrect: number;
  triviaCategoryStats: Record<string, TriviaTopicPerformance>;
  activeHoursCount: Record<'morning' | 'afternoon' | 'evening', number>;
  lastStudiedAt: number;
}

export interface PersonalizedPuzzleData {
  target: string;
  length: WordLength;
  clue: string;
  trendReason: string;
  culturalNote: string;
  funFact?: string;
  locationLabel: string;
}

export interface PlayerStudyInsights {
  topInterests: string[];
  topCategoryNames: string[];
  favoriteLength: WordLength;
  puzzleWinRate: number;
  avgGuesses: number;
  triviaAccuracy: number;
  recommendedDifficulty: TriviaDifficulty;
  peakWindowLabel: 'Morning' | 'Afternoon' | 'Evening';
  promptSummary: string;
}

const TIMEZONE_CITY_MAP: Record<string, { city: string; region: string; countryCode: string; countryName: string }> = {
  'America/New_York': { city: 'New York', region: 'NY', countryCode: 'US', countryName: 'United States' },
  'America/Chicago': { city: 'Chicago', region: 'IL', countryCode: 'US', countryName: 'United States' },
  'America/Denver': { city: 'Denver', region: 'CO', countryCode: 'US', countryName: 'United States' },
  'America/Los_Angeles': { city: 'Los Angeles', region: 'CA', countryCode: 'US', countryName: 'United States' },
  'America/Toronto': { city: 'Toronto', region: 'ON', countryCode: 'CA', countryName: 'Canada' },
  'America/Vancouver': { city: 'Vancouver', region: 'BC', countryCode: 'CA', countryName: 'Canada' },
  'America/Mexico_City': { city: 'Mexico City', region: 'CDMX', countryCode: 'MX', countryName: 'Mexico' },
  'America/Sao_Paulo': { city: 'São Paulo', region: 'SP', countryCode: 'BR', countryName: 'Brazil' },
  'Europe/London': { city: 'London', region: 'England', countryCode: 'GB', countryName: 'United Kingdom' },
  'Europe/Paris': { city: 'Paris', region: 'Île-de-France', countryCode: 'FR', countryName: 'France' },
  'Europe/Berlin': { city: 'Berlin', region: 'Berlin', countryCode: 'DE', countryName: 'Germany' },
  'Europe/Madrid': { city: 'Madrid', region: 'Madrid', countryCode: 'ES', countryName: 'Spain' },
  'Europe/Rome': { city: 'Rome', region: 'Lazio', countryCode: 'IT', countryName: 'Italy' },
  'Africa/Lagos': { city: 'Lagos', region: 'Lagos', countryCode: 'NG', countryName: 'Nigeria' },
  'Africa/Nairobi': { city: 'Nairobi', region: 'Nairobi', countryCode: 'KE', countryName: 'Kenya' },
  'Africa/Johannesburg': { city: 'Johannesburg', region: 'Gauteng', countryCode: 'ZA', countryName: 'South Africa' },
  'Africa/Cairo': { city: 'Cairo', region: 'Cairo', countryCode: 'EG', countryName: 'Egypt' },
  'Asia/Dubai': { city: 'Dubai', region: 'Dubai', countryCode: 'AE', countryName: 'UAE' },
  'Asia/Kolkata': { city: 'Mumbai', region: 'MH', countryCode: 'IN', countryName: 'India' },
  'Asia/Singapore': { city: 'Singapore', region: 'SG', countryCode: 'SG', countryName: 'Singapore' },
  'Asia/Tokyo': { city: 'Tokyo', region: 'Kanto', countryCode: 'JP', countryName: 'Japan' },
  'Asia/Seoul': { city: 'Seoul', region: 'Seoul', countryCode: 'KR', countryName: 'South Korea' },
  'Australia/Sydney': { city: 'Sydney', region: 'NSW', countryCode: 'AU', countryName: 'Australia' },
};

export const QUICK_CITY_PRESETS: Array<Omit<UserLocationData, 'timezone' | 'source' | 'updatedAt'>> = [
  { city: 'New York', region: 'NY', countryCode: 'US', countryName: 'United States' },
  { city: 'London', region: 'UK', countryCode: 'GB', countryName: 'United Kingdom' },
  { city: 'Lagos', region: 'LA', countryCode: 'NG', countryName: 'Nigeria' },
  { city: 'Toronto', region: 'ON', countryCode: 'CA', countryName: 'Canada' },
  { city: 'Tokyo', region: 'Kanto', countryCode: 'JP', countryName: 'Japan' },
];

export function guessLocationFromTimezone(tz?: string): UserLocationData {
  const resolvedTz =
    tz ||
    (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC') ||
    'UTC';

  const exact = TIMEZONE_CITY_MAP[resolvedTz];
  if (exact) {
    return {
      ...exact,
      timezone: resolvedTz,
      source: 'timezone',
      updatedAt: Date.now(),
    };
  }

  // Extract city segment cleanly from IANA timezone like "Europe/Amsterdam"
  const parts = resolvedTz.split('/');
  const rawCity = (parts[parts.length - 1] || 'Global').replace(/_/g, ' ');
  const continent = parts[0] || '';
  const ccMap: Record<string, { cc: string; cname: string }> = {
    America: { cc: 'US', cname: 'Americas' },
    Europe: { cc: 'GB', cname: 'Europe' },
    Africa: { cc: 'NG', cname: 'Africa' },
    Asia: { cc: 'SG', cname: 'Asia' },
    Australia: { cc: 'AU', cname: 'Australia' },
  };
  const fallbackRegion = ccMap[continent] || { cc: 'US', cname: 'Global' };

  return {
    city: rawCity || 'Global',
    region: continent || 'International',
    countryCode: fallbackRegion.cc,
    countryName: fallbackRegion.cname,
    timezone: resolvedTz,
    source: 'timezone',
    updatedAt: Date.now(),
  };
}

export function createDefaultPlayerProfile(): PlayerProfileState {
  return {
    locationEnabled: false,
    locationOptOut: false,
    location: null,
    displayName: '',
    focusField: '',
    selectedInterests: ['pop-culture', 'science-tech'],
    challengePace: 'adaptive',
    totalPuzzlesStudied: 0,
    puzzleWins: 0,
    totalGuessesSum: 0,
    boardLengthCounts: { 4: 0, 5: 0, 6: 0 },
    categoryAffinity: {},
    triviaAnswered: 0,
    triviaCorrect: 0,
    triviaCategoryStats: {},
    activeHoursCount: { morning: 0, afternoon: 0, evening: 0 },
    lastStudiedAt: 0,
  };
}

export function formatLocationLabel(location: UserLocationData | null | undefined): string {
  if (!location || !location.city) return 'Global';
  return location.countryCode ? `${location.city}, ${location.countryCode}` : location.city;
}

function getTimeBucket(nowMs: number): 'morning' | 'afternoon' | 'evening' {
  const hr = new Date(nowMs).getHours();
  if (hr >= 5 && hr < 12) return 'morning';
  if (hr >= 12 && hr < 18) return 'afternoon';
  return 'evening';
}

export function recordPuzzleStudySignal(
  profile: PlayerProfileState,
  signal: {
    categoryId: string;
    won: boolean;
    guessesUsed: number;
    length: WordLength;
    nowMs?: number;
  }
): PlayerProfileState {
  const now = signal.nowMs ?? Date.now();
  const bucket = getTimeBucket(now);
  const weight = signal.won ? 3 : 1;

  return {
    ...profile,
    totalPuzzlesStudied: profile.totalPuzzlesStudied + 1,
    puzzleWins: profile.puzzleWins + (signal.won ? 1 : 0),
    totalGuessesSum: profile.totalGuessesSum + Math.max(1, signal.guessesUsed),
    boardLengthCounts: {
      ...profile.boardLengthCounts,
      [signal.length]: (profile.boardLengthCounts[signal.length] || 0) + 1,
    },
    categoryAffinity: {
      ...profile.categoryAffinity,
      [signal.categoryId]: (profile.categoryAffinity[signal.categoryId] || 0) + weight,
    },
    activeHoursCount: {
      ...profile.activeHoursCount,
      [bucket]: (profile.activeHoursCount[bucket] || 0) + 1,
    },
    lastStudiedAt: now,
  };
}

export function recordTriviaStudySignal(
  profile: PlayerProfileState,
  signal: {
    categoryId: string;
    correct: boolean;
    nowMs?: number;
  }
): PlayerProfileState {
  const now = signal.nowMs ?? Date.now();
  const bucket = getTimeBucket(now);
  const prevCat = profile.triviaCategoryStats[signal.categoryId] || { answered: 0, correct: 0 };

  return {
    ...profile,
    triviaAnswered: profile.triviaAnswered + 1,
    triviaCorrect: profile.triviaCorrect + (signal.correct ? 1 : 0),
    triviaCategoryStats: {
      ...profile.triviaCategoryStats,
      [signal.categoryId]: {
        answered: prevCat.answered + 1,
        correct: prevCat.correct + (signal.correct ? 1 : 0),
      },
    },
    activeHoursCount: {
      ...profile.activeHoursCount,
      [bucket]: (profile.activeHoursCount[bucket] || 0) + 1,
    },
    lastStudiedAt: now,
  };
}

export function summarizePlayerProfile(profile: PlayerProfileState): PlayerStudyInsights {
  const lengthCandidates: WordLength[] = [4, 5, 6];
  let favoriteLength: WordLength = 5;
  let bestLenCount = -1;
  for (const len of lengthCandidates) {
    const count = profile.boardLengthCounts[len] || 0;
    if (count > bestLenCount) {
      bestLenCount = count;
      favoriteLength = len;
    }
  }
  if (bestLenCount <= 0) favoriteLength = 5;

  const topCategoryNames = Object.entries(profile.categoryAffinity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => getCategoryById(id).name);

  const topInterests = profile.selectedInterests
    .map((id) => INTEREST_CATALOG.find((item) => item.id === id)?.label || id)
    .slice(0, 4);

  const puzzleWinRate =
    profile.totalPuzzlesStudied > 0
      ? Math.round((profile.puzzleWins / profile.totalPuzzlesStudied) * 100)
      : 0;
  const avgGuesses =
    profile.totalPuzzlesStudied > 0
      ? Number((profile.totalGuessesSum / profile.totalPuzzlesStudied).toFixed(1))
      : 0;
  const triviaAccuracy =
    profile.triviaAnswered > 0
      ? Math.round((profile.triviaCorrect / profile.triviaAnswered) * 100)
      : 0;

  let recommendedDifficulty: TriviaDifficulty = 'intermediate';
  if (profile.challengePace === 'relaxed') {
    recommendedDifficulty = 'novice';
  } else if (profile.challengePace === 'brainiac') {
    recommendedDifficulty = 'legendary';
  } else {
    if (profile.triviaAnswered >= 5 && triviaAccuracy >= 75) recommendedDifficulty = 'expert';
    else if (profile.triviaAnswered >= 3 && triviaAccuracy < 45) recommendedDifficulty = 'novice';
  }

  const bucketKeys: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];
  const bestBucket = bucketKeys.sort(
    (a, b) => (profile.activeHoursCount[b] || 0) - (profile.activeHoursCount[a] || 0)
  )[0];
  const peakWindowLabel =
    bestBucket === 'morning' ? 'Morning' : bestBucket === 'afternoon' ? 'Afternoon' : 'Evening';

  const locLabel = profile.locationEnabled ? formatLocationLabel(profile.location) : 'Global';
  const summaryParts = [
    profile.displayName?.trim() ? `Player: ${profile.displayName.trim()}` : '',
    profile.focusField?.trim() ? `Focus: ${profile.focusField.trim()}` : '',
    `Region: ${locLabel}`,
    `Interests: ${topInterests.join(', ') || 'General Culture & Wordplay'}`,
    `Pace: ${profile.challengePace} (${recommendedDifficulty} tier)`,
    topCategoryNames.length > 0 ? `Played topics: ${topCategoryNames.join(', ')}` : '',
    profile.triviaAnswered > 0 ? `Trivia accuracy: ${triviaAccuracy}%` : '',
  ].filter(Boolean);

  return {
    topInterests,
    topCategoryNames,
    favoriteLength,
    puzzleWinRate,
    avgGuesses,
    triviaAccuracy,
    recommendedDifficulty,
    peakWindowLabel,
    promptSummary: summaryParts.join(' | '),
  };
}

interface PersonalizedWordCandidate {
  word: string;
  clue: string;
  interestLabel: string;
  culturalNote: string;
}

const CURATED_PERSONALIZED_CLUES: Record<WordLength, PersonalizedWordCandidate[]> = {
  4: [
    {
      word: 'STAR',
      clue: 'Headliner lighting up cinemas, red carpets, or clear night skies.',
      interestLabel: 'Pop Culture & Cosmos',
      culturalNote: 'From box-office marquees to constellation charts, STAR spans entertainment and stargazing alike.',
    },
    {
      word: 'DATA',
      clue: 'Fuel powering AI engines, market dashboards, and live forecasts.',
      interestLabel: 'Science & Tech',
      culturalNote: 'Modern real-time feeds translate local signals and sensors into structured insights.',
    },
    {
      word: 'TOUR',
      clue: 'Multi-city journey for bands, sports teams, or world travelers.',
      interestLabel: 'Travel & Music',
      culturalNote: 'Global stadium tours and landmark city itineraries share this classic four-letter word.',
    },
    {
      word: 'MOON',
      clue: 'Celestial neighbor guiding tides, lunar calendars, and night missions.',
      interestLabel: 'Astrology & Space',
      culturalNote: 'Artemis lunar exploration and zodiac cycles keep MOON trending across science and lore.',
    },
    {
      word: 'CHEF',
      clue: 'Culinary creator behind tasting menus and street-food buzz.',
      interestLabel: 'Food & Lifestyle',
      culturalNote: 'Regional flavors around the world often start in a local kitchen experiment.',
    },
  ],
  5: [
    {
      word: 'STAGE',
      clue: 'Where award nominees, touring musicians, and theatre casts shine.',
      interestLabel: 'Music & Pop Culture',
      culturalNote: 'Live festivals and theatre premieres turn city venues into nightly cultural hubs.',
    },
    {
      word: 'ORBIT',
      clue: 'Curved path traced by satellites, space stations, and planets.',
      interestLabel: 'Science & Tech',
      culturalNote: 'Low-Earth satellites beam weather, GPS, and live regional broadcasts around the globe.',
    },
    {
      word: 'GLOBE',
      clue: 'Spinning model uniting every city, timezone, and travel route.',
      interestLabel: 'Travel & Landmarks',
      culturalNote: 'International news and cultural trends connect neighborhoods across timezones daily.',
    },
    {
      word: 'CLUES',
      clue: 'Breadcrumbs detectives and sharp puzzle solvers piece together.',
      interestLabel: 'Mystery & Sleuth',
      culturalNote: 'Deductive whodunits and daily wordplay both reward spotting subtle patterns.',
    },
    {
      word: 'SPICE',
      clue: 'Aromatic ingredient defining local street dishes and heritage recipes.',
      interestLabel: 'Food & Coffee',
      culturalNote: 'Every region stamps its signature warmth onto classics through prized spices.',
    },
    {
      word: 'ARENA',
      clue: 'Packed bowl hosting championship finals, esports, and encores.',
      interestLabel: 'Sports & Gaming',
      culturalNote: 'From packed derbies to global esports finals, arenas amplify shared crowd energy.',
    },
    {
      word: 'LUNAR',
      clue: 'Relating to moon phases, tides, and deep-space south-pole landings.',
      interestLabel: 'Astrology & Mystic',
      culturalNote: 'Tidal cycles, astrology charts, and modern moon landers share this timeless root.',
    },
    {
      word: 'OCEAN',
      clue: 'Vast blue expanse shaping coastal weather, reefs, and sea routes.',
      interestLabel: 'Nature & Climate',
      culturalNote: 'Warm currents steer storm tracks, marine biodiversity, and coastal city climates.',
    },
  ],
  6: [
    {
      word: 'CINEMA',
      clue: 'Silver-screen temple of weekend box office premieres and awards.',
      interestLabel: 'Music & Pop Culture',
      culturalNote: 'Film festivals and opening-night audiences keep local theaters buzzing worldwide.',
    },
    {
      word: 'SIGNAL',
      clue: 'Radio, satellite, or radar wave carrying real-time updates.',
      interestLabel: 'Science & Tech',
      culturalNote: 'Location receivers lock onto orbital timing signals to pinpoint your city cleanly.',
    },
    {
      word: 'TRAVEL',
      clue: 'Crossing borders, sampling regional dishes, and collecting stamps.',
      interestLabel: 'Travel & Landmarks',
      culturalNote: 'Live weather, local transit, and regional events make every destination unique.',
    },
    {
      word: 'PLANET',
      clue: 'Spinning world studied by astronomers and climate researchers alike.',
      interestLabel: 'Nature & Cosmos',
      culturalNote: 'Shared satellites monitor biodiversity, cloud systems, and cities across our planet.',
    },
    {
      word: 'CIPHER',
      clue: 'Encoded message waiting for a sharp mind to crack its key.',
      interestLabel: 'Mystery & Sleuth',
      culturalNote: 'From historical cryptography to daily word grids, patterns unlock hidden meaning.',
    },
    {
      word: 'GALAXY',
      clue: 'Swirling island of billions of stars captured by deep-space optics.',
      interestLabel: 'Astrology & Space',
      culturalNote: 'Deep-field telescopes continue revealing newborn galaxies across cosmic history.',
    },
  ],
};

export function pickFallbackPersonalizedPuzzle(params: {
  length: WordLength;
  interests: InterestTagId[];
  location: UserLocationData | null;
  excludeWords?: string[];
  trendingHeadlines?: string[];
}): PersonalizedPuzzleData {
  const validSet = VALID_WORDS[params.length];
  const exclude = new Set((params.excludeWords || []).map((w) => w.toUpperCase()));
  const locationLabel = formatLocationLabel(params.location);
  const headlineSnippet = params.trendingHeadlines?.[0]?.slice(0, 72);

  // Build candidate pool preferring curated entries whose word exists in VALID_WORDS[length]
  const curatedPool = CURATED_PERSONALIZED_CLUES[params.length].filter(
    (item) => validSet.has(item.word) && !exclude.has(item.word)
  );

  // Score curated candidates by overlap with selected interests
  const interestLabels = params.interests.map(
    (id) => INTEREST_CATALOG.find((item) => item.id === id)?.label || ''
  );

  const scored = curatedPool.map((item) => {
    const matchedInterest = interestLabels.some((lbl) =>
      lbl && item.interestLabel.toLowerCase().includes(lbl.split(' ')[0].toLowerCase())
    );
    return { item, score: matchedInterest ? 2 : 1 };
  });
  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const topPool = scored.filter((s) => s.score === scored[0].score);
    const chosen = topPool[Math.floor(Math.random() * topPool.length)].item;
    const trendReason = headlineSnippet
      ? `Tuned for ${locationLabel} · Inspired by "${headlineSnippet}"`
      : params.location
      ? `Tuned for ${locationLabel} · ${chosen.interestLabel}`
      : `Picked for your ${chosen.interestLabel} interest`;

    return {
      target: chosen.word,
      length: params.length,
      clue: chosen.clue,
      trendReason,
      culturalNote: chosen.culturalNote,
      funFact: chosen.culturalNote,
      locationLabel,
    };
  }

  // Fallback to general dictionary solution words if curated pool exhausted
  const fallbackPool = SOLUTION_WORDS[params.length].filter((w) => validSet.has(w) && !exclude.has(w));
  const pickedWord =
    fallbackPool[Math.floor(Math.random() * Math.max(1, fallbackPool.length))] ||
    SOLUTION_WORDS[params.length][0];

  return {
    target: pickedWord,
    length: params.length,
    clue: `An everyday ${params.length}-letter crowd favorite matched to your ${locationLabel} vibe.`,
    trendReason: `Personal Mix · ${locationLabel}`,
    culturalNote: `Adapted to your ${params.length}-letter puzzle cadence in ${locationLabel}.`,
    funFact: `Words of ${params.length} letters balance vowel rhythm with crisp consonant anchors.`,
    locationLabel,
  };
}
