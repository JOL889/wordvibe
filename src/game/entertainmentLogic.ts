export type EntertainmentSubCollection =
  | 'Screen & Streaming'
  | 'Music & Live Tours'
  | 'Celebrity, Awards & Viral'
  | 'Gaming, Stage & Spectacle';

export interface EntertainmentTopicSpec {
  id: string;
  subCollection: EntertainmentSubCollection;
  eventTag: string;
  fallbackEventTitle: string;
  fallbackReason: string;
  keywords: string[];
}

export interface DailyEntertainmentSpotlight {
  dateKey: string;
  source: 'live' | 'calendar';
  heroCategoryId: string;
  featuredCategoryIds: string[];
  eventTitle: string;
  eventSubtitle: string;
  matchedHeadline: string | null;
  headlines: string[];
}

export const ENTERTAINMENT_SUBCOLLECTION_ORDER: EntertainmentSubCollection[] = [
  'Screen & Streaming',
  'Music & Live Tours',
  'Celebrity, Awards & Viral',
  'Gaming, Stage & Spectacle',
];

export const ENTERTAINMENT_TOPIC_SPECS: EntertainmentTopicSpec[] = [
  {
    id: 'awards-red-carpet',
    subCollection: 'Celebrity, Awards & Viral',
    eventTag: 'Awards Watch',
    fallbackEventTitle: 'Awards Season & Red Carpet',
    fallbackReason: 'Nominees, gala looks, and trophy predictions leading today’s spotlight.',
    keywords: [
      'oscar',
      'oscars',
      'grammy',
      'grammys',
      'emmy',
      'emmys',
      'golden globe',
      'bafta',
      'tony',
      'vma',
      'red carpet',
      'award',
      'awards',
      'nominee',
      'nomination',
      'met gala',
      'gala',
    ],
  },
  {
    id: 'streaming-binge',
    subCollection: 'Screen & Streaming',
    eventTag: 'Streaming Premiere',
    fallbackEventTitle: 'Peak TV & Binge Premieres',
    fallbackReason: 'Fresh season drops, cliffhanger finales, and top streaming charts.',
    keywords: [
      'netflix',
      'hbo',
      'max',
      'disney',
      'hulu',
      'apple tv',
      'prime video',
      'paramount',
      'peacock',
      'streaming',
      'season',
      'finale',
      'episode',
      'series',
      'showrunner',
      'renewed',
    ],
  },
  {
    id: 'box-office-hits',
    subCollection: 'Screen & Streaming',
    eventTag: 'Box Office Buzz',
    fallbackEventTitle: 'Box Office & Cinema Spotlight',
    fallbackReason: 'Opening-weekend blockbusters, trailers, and major theater releases.',
    keywords: [
      'box office',
      'movie',
      'movies',
      'film',
      'cinema',
      'trailer',
      'sequel',
      'imax',
      'blockbuster',
      'opening weekend',
      'theaters',
      'hollywood',
    ],
  },
  {
    id: 'celebrity-buzz',
    subCollection: 'Celebrity, Awards & Viral',
    eventTag: 'Celebrity Headlines',
    fallbackEventTitle: 'Celebrity & Star Buzz',
    fallbackReason: 'Breaking interviews, red-carpet appearances, and entertainment scoops.',
    keywords: [
      'celebrity',
      'star',
      'actor',
      'actress',
      'singer',
      'couple',
      'wedding',
      'romance',
      'interview',
      'memoir',
      'cover',
      'magazine',
    ],
  },
  {
    id: 'kpop-global-pop',
    subCollection: 'Music & Live Tours',
    eventTag: 'Global Pop Drop',
    fallbackEventTitle: 'K-Pop & Global Chart Hits',
    fallbackReason: 'World tour dates, comeback singles, and global fan favorites.',
    keywords: [
      'k-pop',
      'kpop',
      'bts',
      'blackpink',
      'stray kids',
      'newjeans',
      'seventeen',
      'twice',
      'seoul',
      'comeback',
      'fandom',
      'world tour',
    ],
  },
  {
    id: 'pop-icons',
    subCollection: 'Music & Live Tours',
    eventTag: 'Music Charts',
    fallbackEventTitle: 'Chart-Toppers & Pop Icons',
    fallbackReason: 'Number-one albums, surprise singles, and sold-out arena tours.',
    keywords: [
      'album',
      'single',
      'billboard',
      'spotify',
      'taylor swift',
      'beyonce',
      'billie eilish',
      'ariana',
      'sabrina',
      'chappell',
      'pop star',
      'chart',
      'music video',
    ],
  },
  {
    id: 'reality-tv-drama',
    subCollection: 'Celebrity, Awards & Viral',
    eventTag: 'Reality TV Buzz',
    fallbackEventTitle: 'Reality TV & Reunion Drama',
    fallbackReason: 'Elimination twists, reunion specials, and fan-favorite casts.',
    keywords: [
      'reality',
      'bachelor',
      'bachelorette',
      'survivor',
      'housewives',
      'kardashian',
      'love island',
      'traitors',
      'idol',
      'voice',
      'contestant',
      'reunion',
    ],
  },
  {
    id: 'hiphop-rnb',
    subCollection: 'Music & Live Tours',
    eventTag: 'Hip-Hop & R&B',
    fallbackEventTitle: 'Hip-Hop, R&B & Studio Drops',
    fallbackReason: 'New verses, platinum beats, and headline music collaborations.',
    keywords: [
      'rap',
      'rapper',
      'hip-hop',
      'hip hop',
      'r&b',
      'kendrick',
      'drake',
      'sza',
      'travis',
      'weeknd',
      'freestyle',
      'mixtape',
    ],
  },
  {
    id: 'slang-trends',
    subCollection: 'Celebrity, Awards & Viral',
    eventTag: 'Viral Moments',
    fallbackEventTitle: 'Viral Trends & Pop Culture',
    fallbackReason: 'Internet moments, trending memes, and overnight social buzz.',
    keywords: [
      'viral',
      'tiktok',
      'meme',
      'trending',
      'internet',
      'social media',
      'instagram',
      'challenge',
      'clip',
    ],
  },
  {
    id: 'superhero-comics',
    subCollection: 'Screen & Streaming',
    eventTag: 'Multiverse & Heroes',
    fallbackEventTitle: 'Superheroes & Comic Sagas',
    fallbackReason: 'Franchise reveals, casting news, and cinematic universe events.',
    keywords: [
      'marvel',
      'mcu',
      'dc',
      'batman',
      'superman',
      'spider-man',
      'avengers',
      'superhero',
      'comic',
      'comic-con',
      'multiverse',
    ],
  },
  {
    id: 'anime-manga',
    subCollection: 'Screen & Streaming',
    eventTag: 'Anime Spotlight',
    fallbackEventTitle: 'Anime & Manga Premieres',
    fallbackReason: 'Hit seasonal arcs, animated features, and global manga releases.',
    keywords: [
      'anime',
      'manga',
      'ghibli',
      'crunchyroll',
      'shonen',
      'naruto',
      'one piece',
      'jujutsu',
      'demon slayer',
      'animated',
    ],
  },
  {
    id: 'sci-fi-worlds',
    subCollection: 'Screen & Streaming',
    eventTag: 'Sci-Fi Frontiers',
    fallbackEventTitle: 'Sci-Fi Worlds & Epics',
    fallbackReason: 'Space operas, dystopian series, and blockbuster world-building.',
    keywords: [
      'sci-fi',
      'science fiction',
      'star wars',
      'star trek',
      'dune',
      'avatar',
      'alien',
      'galaxy',
      'future',
    ],
  },
  {
    id: 'cinematography',
    subCollection: 'Screen & Streaming',
    eventTag: 'Film Craft',
    fallbackEventTitle: 'Directors & Film Festival Spotlight',
    fallbackReason: 'Festival premieres, standout cinematography, and auteur releases.',
    keywords: [
      'director',
      'cannes',
      'sundance',
      'tiff',
      'venice',
      'cinematography',
      'screenplay',
      'indie film',
      'a24',
    ],
  },
  {
    id: 'music-festivals',
    subCollection: 'Music & Live Tours',
    eventTag: 'Live Festivals',
    fallbackEventTitle: 'Concerts, Lineups & Festivals',
    fallbackReason: 'Headliner announcements, encore sets, and festival stages.',
    keywords: [
      'festival',
      'coachella',
      'glastonbury',
      'lollapalooza',
      'bonnaroo',
      'concert',
      'lineup',
      'headliner',
      'stage',
      'tour',
    ],
  },
  {
    id: 'gaming-arcade',
    subCollection: 'Gaming, Stage & Spectacle',
    eventTag: 'Gaming & Esports',
    fallbackEventTitle: 'Gaming Releases & Esports',
    fallbackReason: 'Major game launches, showcases, and tournament championships.',
    keywords: [
      'game',
      'gaming',
      'nintendo',
      'playstation',
      'xbox',
      'esports',
      'gta',
      'fortnite',
      'twitch',
      'steam',
      'switch',
    ],
  },
  {
    id: 'comedy-standup',
    subCollection: 'Celebrity, Awards & Viral',
    eventTag: 'Comedy & Late Night',
    fallbackEventTitle: 'Comedy Specials & Late Night',
    fallbackReason: 'Stand-up specials, talk show monologues, and sketch highlights.',
    keywords: [
      'comedy',
      'comedian',
      'stand-up',
      'snl',
      'saturday night live',
      'late night',
      'sitcom',
      'roast',
      'monologue',
    ],
  },
  {
    id: 'sports-spectacle',
    subCollection: 'Gaming, Stage & Spectacle',
    eventTag: 'Live Spectacle',
    fallbackEventTitle: 'Championships & Halftime Show',
    fallbackReason: 'Big-game halftime spectacles, buzzer-beaters, and live broadcasts.',
    keywords: [
      'super bowl',
      'halftime',
      'nba',
      'nfl',
      'world cup',
      'olympics',
      'championship',
      'ufc',
      'wrestlemania',
      'formula 1',
    ],
  },
  {
    id: 'podcasts-creators',
    subCollection: 'Celebrity, Awards & Viral',
    eventTag: 'Creators & Audio',
    fallbackEventTitle: 'Trending Podcasts & Creators',
    fallbackReason: 'Top podcast episodes, creator collabs, and livestream moments.',
    keywords: [
      'podcast',
      'youtube',
      'youtuber',
      'creator',
      'influencer',
      'livestream',
      'streamer',
      'episode',
    ],
  },
  {
    id: 'theater-stage',
    subCollection: 'Gaming, Stage & Spectacle',
    eventTag: 'Broadway & Stage',
    fallbackEventTitle: 'Broadway & Musical Theater',
    fallbackReason: 'Opening nights, cast albums, and standing-ovation stage shows.',
    keywords: [
      'broadway',
      'musical',
      'west end',
      'theater',
      'theatre',
      'playbill',
      'wicked',
      'opera',
    ],
  },
  {
    id: 'jazz-blues',
    subCollection: 'Music & Live Tours',
    eventTag: 'Soul & Vinyl',
    fallbackEventTitle: 'Soul, Jazz & Classic Vinyl',
    fallbackReason: 'Timeless brass sessions, tributes, and iconic vinyl reissues.',
    keywords: ['jazz', 'blues', 'soul', 'vinyl', 'motown', 'orchestra', 'symphony'],
  },
];

export const ENTERTAINMENT_SUBCOLLECTIONS: Record<string, EntertainmentSubCollection> =
  Object.fromEntries(ENTERTAINMENT_TOPIC_SPECS.map((s) => [s.id, s.subCollection]));

const SPEC_MAP: Record<string, EntertainmentTopicSpec> = Object.fromEntries(
  ENTERTAINMENT_TOPIC_SPECS.map((s) => [s.id, s])
);

interface MonthlyCalendarTheme {
  eventTitle: string;
  eventSubtitle: string;
  primaryIds: string[];
}

const MONTHLY_CALENDAR_THEMES: Record<number, MonthlyCalendarTheme> = {
  1: {
    eventTitle: 'Winter Premieres & Awards Kickoff',
    eventSubtitle: 'Awards contenders, binge dramas, and Sundance buzz.',
    primaryIds: ['awards-red-carpet', 'streaming-binge', 'cinematography', 'comedy-standup'],
  },
  2: {
    eventTitle: 'Music Honors & Big-Game Spectacle',
    eventSubtitle: 'Grammy & halftime energy across music and live broadcasts.',
    primaryIds: ['pop-icons', 'sports-spectacle', 'awards-red-carpet', 'hiphop-rnb'],
  },
  3: {
    eventTitle: 'Academy Awards & Spring Cinema',
    eventSubtitle: 'Red-carpet winners, blockbusters, and breakout performances.',
    primaryIds: ['awards-red-carpet', 'box-office-hits', 'cinematography', 'celebrity-buzz'],
  },
  4: {
    eventTitle: 'Spring Festivals & Tour Kickoffs',
    eventSubtitle: 'Desert festival headliners, pop tours, and viral moments.',
    primaryIds: ['music-festivals', 'kpop-global-pop', 'slang-trends', 'podcasts-creators'],
  },
  5: {
    eventTitle: 'Met Gala Fashion & Finale Season',
    eventSubtitle: 'Red-carpet glamour, season finales, and summer previews.',
    primaryIds: ['celebrity-buzz', 'streaming-binge', 'awards-red-carpet', 'reality-tv-drama'],
  },
  6: {
    eventTitle: 'Summer Blockbusters & Stadium Tours',
    eventSubtitle: 'Summer box office openings, anthems, and festival nights.',
    primaryIds: ['box-office-hits', 'pop-icons', 'music-festivals', 'superhero-comics'],
  },
  7: {
    eventTitle: 'Comic-Con, Sci-Fi & Mid-Summer Hits',
    eventSubtitle: 'Superhero reveals, anime drops, and multiverse trailers.',
    primaryIds: ['superhero-comics', 'sci-fi-worlds', 'anime-manga', 'box-office-hits'],
  },
  8: {
    eventTitle: 'Late-Summer Tours & Video Awards',
    eventSubtitle: 'Chart-topping collaborations, VMAs, and creator buzz.',
    primaryIds: ['kpop-global-pop', 'hiphop-rnb', 'slang-trends', 'podcasts-creators'],
  },
  9: {
    eventTitle: 'Fall TV Premieres & Emmy Night',
    eventSubtitle: 'Returning hit dramas, Emmy winners, and Broadway openings.',
    primaryIds: ['streaming-binge', 'awards-red-carpet', 'theater-stage', 'comedy-standup'],
  },
  10: {
    eventTitle: 'Autumn Cinema & Fandom Culture',
    eventSubtitle: 'Festival favorites, anime arcs, and cult classics.',
    primaryIds: ['cinematography', 'anime-manga', 'gaming-arcade', 'reality-tv-drama'],
  },
  11: {
    eventTitle: 'Holiday Box Office & Music Spotlight',
    eventSubtitle: 'Big-screen holiday releases, year-end tour stops, and streaming hits.',
    primaryIds: ['box-office-hits', 'streaming-binge', 'kpop-global-pop', 'celebrity-buzz'],
  },
  12: {
    eventTitle: 'Year-End Charts & Awards Buzz',
    eventSubtitle: 'Best-of-the-year lists, wrapped charts, and holiday premieres.',
    primaryIds: ['pop-icons', 'awards-red-carpet', 'streaming-binge', 'comedy-standup'],
  },
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function getMonthAndDayOfWeek(dateKey: string): { month: number; dayOfWeek: number } {
  const parts = dateKey.split('-').map(Number);
  const y = parts[0] || 2026;
  const m = parts[1] || 1;
  const d = parts[2] || 1;
  const utc = new Date(Date.UTC(y, m - 1, d));
  return {
    month: Math.min(12, Math.max(1, m)),
    dayOfWeek: utc.getUTCDay(), // 0=Sun..6=Sat
  };
}

function scoreHeadlineForSpec(headline: string, spec: EntertainmentTopicSpec): number {
  const lower = headline.toLowerCase();
  let score = 0;
  for (const kw of spec.keywords) {
    if (lower.includes(kw)) {
      // Multi-word exact phrases get slightly higher specificity weight
      score += kw.includes(' ') ? 3 : 2;
    }
  }
  return score;
}

/**
 * Resolves today's daily rotating entertainment spotlight from live headlines (when present)
 * combined with calendar events & deterministic daily rotation so topics shift every single day.
 */
export function resolveDailyEntertainmentSpotlight(
  dateKey: string,
  rawHeadlines: string[] = []
): DailyEntertainmentSpotlight {
  const cleanHeadlines = rawHeadlines
    .map((h) => h.replace(/\s+/g, ' ').trim())
    .filter((h) => h.length >= 12)
    .slice(0, 12);

  const { month, dayOfWeek } = getMonthAndDayOfWeek(dateKey);
  const calendarTheme = MONTHLY_CALENDAR_THEMES[month] || MONTHLY_CALENDAR_THEMES[1];
  const daySeed = hashString(`ENT-${dateKey}`);

  // Weekday rhythm rotates spotlight focus naturally even on quiet news days
  const weekdayFocusPool: string[] = (() => {
    switch (dayOfWeek) {
      case 0: // Sunday: Awards, Binge TV & Halftime Spectacle
        return ['awards-red-carpet', 'streaming-binge', 'sports-spectacle', 'reality-tv-drama'];
      case 1: // Monday: Box Office Weekend Wrap & Viral Buzz
        return ['box-office-hits', 'celebrity-buzz', 'slang-trends', 'podcasts-creators'];
      case 2: // Tuesday: Music Charts & K-Pop / Hip-Hop Drops
        return ['kpop-global-pop', 'pop-icons', 'hiphop-rnb', 'music-festivals'];
      case 3: // Wednesday: Midweek Streaming & Reality Drama
        return ['streaming-binge', 'reality-tv-drama', 'comedy-standup', 'celebrity-buzz'];
      case 4: // Thursday: Sci-Fi, Superheroes & Anime Drops
        return ['superhero-comics', 'anime-manga', 'sci-fi-worlds', 'gaming-arcade'];
      case 5: // Friday: New Movie & New Music Friday
        return ['box-office-hits', 'pop-icons', 'hiphop-rnb', 'music-festivals'];
      default: // Saturday: Live Spectacle, Gaming, Broadway & Celeb
        return ['celebrity-buzz', 'gaming-arcade', 'theater-stage', 'sports-spectacle'];
    }
  })();

  const scores = new Map<string, { total: number; bestHeadline: string | null; newsScore: number }>();

  for (let idx = 0; idx < ENTERTAINMENT_TOPIC_SPECS.length; idx++) {
    const spec = ENTERTAINMENT_TOPIC_SPECS[idx];
    let newsScore = 0;
    let bestHeadline: string | null = null;
    let bestHeadlineScore = 0;

    for (const headline of cleanHeadlines) {
      const s = scoreHeadlineForSpec(headline, spec);
      if (s > 0) {
        newsScore += s;
        if (s > bestHeadlineScore) {
          bestHeadlineScore = s;
          bestHeadline = headline;
        }
      }
    }

    const calIdx = calendarTheme.primaryIds.indexOf(spec.id);
    const calBonus = calIdx !== -1 ? 4 - calIdx : 0;

    const weekIdx = weekdayFocusPool.indexOf(spec.id);
    const weekBonus = weekIdx !== -1 ? 3 - weekIdx * 0.5 : 0;

    // Deterministic daily jitter guarantees each day rotates cleanly even with equal ties
    const dailyJitter = ((hashString(`${dateKey}:${spec.id}`) + daySeed) % 100) / 100;

    const total = newsScore * 5 + calBonus + weekBonus + dailyJitter;
    scores.set(spec.id, { total, bestHeadline, newsScore });
  }

  const ranked = [...ENTERTAINMENT_TOPIC_SPECS].sort((a, b) => {
    const sa = scores.get(a.id)?.total || 0;
    const sb = scores.get(b.id)?.total || 0;
    return sb - sa;
  });

  const heroSpec = ranked[0];
  const heroScoreInfo = scores.get(heroSpec.id);
  const hasLiveMatch = cleanHeadlines.length > 0 && (heroScoreInfo?.newsScore || 0) > 0;

  const featuredCategoryIds = ranked.slice(0, 4).map((s) => s.id);
  const matchedHeadline =
    heroScoreInfo?.bestHeadline || (cleanHeadlines.length > 0 ? cleanHeadlines[0] : null);

  return {
    dateKey,
    source: hasLiveMatch || cleanHeadlines.length > 0 ? 'live' : 'calendar',
    heroCategoryId: heroSpec.id,
    featuredCategoryIds,
    eventTitle: hasLiveMatch ? `${heroSpec.eventTag} · Trending Today` : calendarTheme.eventTitle,
    eventSubtitle: hasLiveMatch
      ? heroSpec.fallbackReason
      : calendarTheme.eventSubtitle,
    matchedHeadline,
    headlines: cleanHeadlines.slice(0, 4),
  };
}

export function getEntertainmentSubCollection(categoryId: string): EntertainmentSubCollection | null {
  return ENTERTAINMENT_SUBCOLLECTIONS[categoryId] || null;
}

export function getEntertainmentSpec(categoryId: string): EntertainmentTopicSpec | null {
  return SPEC_MAP[categoryId] || null;
}
