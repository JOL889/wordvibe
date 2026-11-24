import type { WordLength } from './words';

export type CategoryGroup =
  | 'Entertainment'
  | 'Mystic & Mind'
  | 'Mystery & Lore'
  | 'Wealth & Strategy'
  | 'Pop Culture & Arts'
  | 'Science & Tech'
  | 'Food & Lifestyle'
  | 'Nature & Earth'
  | 'Travel & History';

export interface PuzzleCategory {
  id: string;
  name: string;
  group: CategoryGroup;
  tagline: string;
  isPremium: boolean;
  popularityScore: number; // Higher = higher statistical user draw
  words4: string[];
  words5: string[];
  words6: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  'Entertainment',
  'Mystic & Mind',
  'Mystery & Lore',
  'Wealth & Strategy',
  'Pop Culture & Arts',
  'Science & Tech',
  'Food & Lifestyle',
  'Nature & Earth',
  'Travel & History',
];

export const PREMIUM_UNLOCK_PLAYS = 5;

function sanitizeWords(list: string[], len: number): string[] {
  const re = new RegExp(`^[A-Z]{${len}}$`);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of list) {
    const clean = w.trim().toUpperCase();
    if (re.test(clean) && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out;
}

function cat(
  id: string,
  name: string,
  group: CategoryGroup,
  tagline: string,
  isPremium: boolean,
  popularityScore: number,
  w4: string[],
  w5: string[],
  w6: string[]
): PuzzleCategory {
  return {
    id,
    name,
    group,
    tagline,
    isPremium,
    popularityScore,
    words4: sanitizeWords(w4, 4),
    words5: sanitizeWords(w5, 5),
    words6: sanitizeWords(w6, 6),
  };
}

export const CATEGORIES: PuzzleCategory[] = [
  // === 0. ENTERTAINMENT & TRENDING NOW (12 NEW + 8 CURATED = 20) ===
  cat(
    'awards-red-carpet',
    'Awards & Red Carpet',
    'Entertainment',
    'Oscars, Grammys, Emmys, gala fashion, and trophy nights.',
    true,
    97,
    ['GOLD', 'STAR', 'GALA', 'GOWN', 'FAME', 'SHOW', 'HOST', 'VOTE', 'FILM', 'SONG'],
    ['AWARD', 'OSCAR', 'STAGE', 'DRESS', 'CROWD', 'PRIZE', 'GLORY', 'FLASH', 'SUITE', 'MUSIC'],
    ['TROPHY', 'WINNER', 'CAMERA', 'STATUE', 'RIBBON', 'FAMOUS', 'TALENT', 'ARTIST', 'PARADE', 'SPEECH']
  ),
  cat(
    'streaming-binge',
    'Streaming & Binge TV',
    'Entertainment',
    'Hit series drops, cliffhangers, season finales, and watchlists.',
    true,
    96,
    ['SHOW', 'CAST', 'PLOT', 'CLIP', 'NEXT', 'PLAY', 'DROP', 'VIEW', 'HYPE', 'HOME'],
    ['BINGE', 'DRAMA', 'WATCH', 'PILOT', 'SCENE', 'CABLE', 'ACTOR', 'AUDIO', 'VIDEO', 'MEDIA'],
    ['SERIES', 'STREAM', 'SEASON', 'FINALE', 'SCREEN', 'THRILL', 'COMEDY', 'VIEWER', 'STUDIO', 'SEQUEL']
  ),
  cat(
    'box-office-hits',
    'Box Office Blockbusters',
    'Entertainment',
    'Opening weekends, IMAX epics, trailers, and big-screen thrills.',
    true,
    95,
    ['FILM', 'HERO', 'STAR', 'SEAT', 'BOOM', 'HITS', 'EPIC', 'TICK', 'SHOW', 'ROLE'],
    ['MOVIE', 'DEBUT', 'CHART', 'CROWD', 'GENRE', 'SCORE', 'STUNT', 'MAGIC', 'SOUND', 'DRAMA'],
    ['CINEMA', 'TICKET', 'ACTION', 'SEQUEL', 'POSTER', 'SCREEN', 'STUDIO', 'THRILL', 'LEADER', 'VISUAL']
  ),
  cat(
    'celebrity-buzz',
    'Celebrity & Star Buzz',
    'Entertainment',
    'Headline scoops, viral interviews, star couples, and glamour.',
    true,
    95,
    ['FAME', 'STAR', 'ICON', 'DATE', 'NEWS', 'PAIR', 'GLOW', 'HYPE', 'CHAT', 'POSE'],
    ['CELEB', 'RUMOR', 'VOGUE', 'TREND', 'STYLE', 'CHARM', 'FLASH', 'PARTY', 'CRUSH', 'GLOSS'],
    ['GOSSIP', 'FAMOUS', 'AFFAIR', 'COUPLE', 'GLOSSY', 'CAMERA', 'RUMORS', 'BEAUTY', 'STARRY', 'MODELS']
  ),
  cat(
    'kpop-global-pop',
    'K-Pop & Global Hits',
    'Entertainment',
    'World tour stages, fan chants, comebacks, and global charts.',
    true,
    94,
    ['BEAT', 'SONG', 'IDOL', 'FANS', 'TOUR', 'HYPE', 'CREW', 'LIVE', 'STAR', 'SOLO'],
    ['CHART', 'STAGE', 'DANCE', 'MUSIC', 'ALBUM', 'VOCAL', 'LIGHT', 'CROWD', 'TEMPO', 'STYLE'],
    ['SINGLE', 'SINGER', 'GLOBAL', 'ANTHEM', 'RHYTHM', 'CHORUS', 'ARTIST', 'ENERGY', 'BRIGHT', 'RECORD']
  ),
  cat(
    'reality-tv-drama',
    'Reality TV & Drama',
    'Entertainment',
    'Rose ceremonies, rival alliances, eliminations, and reunions.',
    true,
    93,
    ['SHOW', 'HOST', 'VOTE', 'ALLY', 'DATE', 'TEAM', 'GAME', 'FAME', 'FEUD', 'ROSE'],
    ['DRAMA', 'CLASH', 'RIVAL', 'CHAOS', 'TRUST', 'BLUFF', 'JUDGE', 'PARTY', 'VILLA', 'TRIBE'],
    ['GOSSIP', 'WINNER', 'COUPLE', 'SCHEME', 'SECRET', 'CHANCE', 'DEBATE', 'RESORT', 'JUDGES', 'SERIES']
  ),
  cat(
    'hiphop-rnb',
    'Hip-Hop & R&B',
    'Entertainment',
    'Studio beats, lyricism, platinum albums, and live cyphers.',
    true,
    92,
    ['BEAT', 'FLOW', 'BASS', 'DROP', 'SOUL', 'SPIN', 'GOLD', 'STAR', 'CREW', 'COOL'],
    ['RHYME', 'TEMPO', 'TRACK', 'VINYL', 'VOCAL', 'CHORD', 'LYRIC', 'SOUND', 'DISCO', 'PARTY'],
    ['RHYTHM', 'LYRICS', 'STUDIO', 'RECORD', 'SINGLE', 'ANTHEM', 'MELODY', 'SMOOTH', 'CHORUS', 'ARTIST']
  ),
  cat(
    'superhero-comics',
    'Superheroes & Comics',
    'Entertainment',
    'Multiverse sagas, origin stories, capes, and comic clashes.',
    false,
    89,
    ['HERO', 'CAPE', 'MASK', 'BOLT', 'FURY', 'SAVE', 'FOES', 'DUEL', 'STAR', 'MIND'],
    ['POWER', 'SUPER', 'COMIC', 'LASER', 'FORCE', 'GUARD', 'BRAVE', 'TITAN', 'FLASH', 'ARMOR'],
    ['SHIELD', 'HEROIC', 'BATTLE', 'ACTION', 'ORIGIN', 'GALAXY', 'RESCUE', 'PORTAL', 'DANGER', 'SAVIOR']
  ),
  cat(
    'music-festivals',
    'Music Tours & Festivals',
    'Entertainment',
    'Headliner lineups, summer stages, encore sets, and live crowds.',
    false,
    87,
    ['FEST', 'BAND', 'TOUR', 'LIVE', 'GATE', 'SONG', 'TENT', 'BEAT', 'WARM', 'GLOW'],
    ['STAGE', 'CROWD', 'SOUND', 'DANCE', 'MUSIC', 'LIGHT', 'CHEER', 'PARTY', 'SHOUT', 'RADIO'],
    ['ANTHEM', 'GUITAR', 'TICKET', 'SUMMER', 'CHORUS', 'SINGER', 'PARADE', 'SPRING', 'ENERGY', 'ENCORE']
  ),
  cat(
    'sports-spectacle',
    'Live Sports & Halftime',
    'Entertainment',
    'Championship nights, halftime shows, and buzzer-beating drama.',
    false,
    86,
    ['GOAL', 'GAME', 'FANS', 'TEAM', 'STAR', 'PLAY', 'RING', 'SHOW', 'WINS', 'ROAR'],
    ['CHAMP', 'SCORE', 'ARENA', 'CROWD', 'MEDAL', 'MATCH', 'CHEER', 'STAGE', 'FINAL', 'PRIZE'],
    ['TROPHY', 'LEAGUE', 'WINNER', 'ANTHEM', 'FINALE', 'MEDALS', 'PLAYER', 'ACTION', 'THRILL', 'RECORD']
  ),
  cat(
    'comedy-standup',
    'Comedy & Late Night',
    'Entertainment',
    'Stand-up specials, punchlines, monologues, and sitcom laughs.',
    false,
    85,
    ['JOKE', 'JEST', 'GRIN', 'HOST', 'SHOW', 'CLAP', 'WITS', 'PLAY', 'CLIP', 'CHAT'],
    ['LAUGH', 'HUMOR', 'WITTY', 'STAGE', 'FUNNY', 'SMILE', 'PRANK', 'ROAST', 'GUEST', 'IRONY'],
    ['COMEDY', 'SATIRE', 'SITCOM', 'LIVELY', 'JESTER', 'CLEVER', 'TALENT', 'PARODY', 'SKETCH', 'STUDIO']
  ),
  cat(
    'podcasts-creators',
    'Creators & Podcasts',
    'Entertainment',
    'Viral clips, studio mics, livestreams, and creator talk shows.',
    false,
    84,
    ['HOST', 'CLIP', 'CHAT', 'POST', 'LIVE', 'FEED', 'VIEW', 'LINK', 'FANS', 'IDEA'],
    ['AUDIO', 'VOICE', 'MEDIA', 'TREND', 'VIRAL', 'TOPIC', 'GUEST', 'SHARE', 'SOUND', 'DAILY'],
    ['STUDIO', 'SCRIPT', 'CAMERA', 'LISTEN', 'STREAM', 'VIEWER', 'VOICES', 'RECORD', 'UPLOAD', 'DEBATE']
  ),

  // === 1. MYSTIC & MIND (14) ===
  cat(
    'astrology',
    'Astrology & Zodiac',
    'Mystic & Mind',
    'Celestial signs, ruling planets, and cosmic alignments.',
    true,
    99,
    ['STAR', 'MOON', 'MARS', 'SIGN', 'FATE', 'AURA', 'VOID', 'NOVA', 'OMEN', 'SOUL'],
    ['ARIES', 'LIBRA', 'VIRGO', 'ORION', 'VENUS', 'SOLAR', 'LUNAR', 'COMET', 'ORBIT', 'PLUTO'],
    ['ZODIAC', 'TAURUS', 'GEMINI', 'CANCER', 'SATURN', 'URANUS', 'ASTRAL', 'PLANET', 'COSMIC', 'ORACLE']
  ),
  cat(
    'dark-psychology',
    'Dark Psychology',
    'Mystic & Mind',
    'Hidden motives, persuasion tactics, and shadow behavior.',
    true,
    98,
    ['MIND', 'FEAR', 'MASK', 'ENVY', 'LURE', 'TRAP', 'BAIT', 'BIAS', 'EGOS', 'PLOT'],
    ['SHADE', 'GUISE', 'CHARM', 'DOUBT', 'TRUST', 'BLUFF', 'SNARE', 'POWER', 'FEIGN', 'DRAMA'],
    ['SHADOW', 'MIRROR', 'DECEIT', 'MOTIVE', 'SUBTLE', 'SCHEME', 'SECRET', 'CYNICS', 'UNSEEN', 'MALICE']
  ),
  cat(
    'tarot-mysticism',
    'Tarot & Mysticism',
    'Mystic & Mind',
    'Arcana symbols, intuition cards, and ancient divination.',
    true,
    95,
    ['CARD', 'FOOL', 'WAND', 'CUPS', 'MOON', 'STAR', 'FATE', 'VEIL', 'SEER', 'DECK'],
    ['TAROT', 'MAGIC', 'CHARM', 'TOWER', 'DEATH', 'DEVIL', 'SWORN', 'SIGIL', 'RUNES', 'ALTAR'],
    ['ARCANA', 'HERMIT', 'LOVERS', 'ORACLE', 'MYSTIC', 'AMULET', 'SPIRIT', 'VISION', 'RITUAL', 'DIVINE']
  ),
  cat(
    'dream-symbols',
    'Dream Symbols',
    'Mystic & Mind',
    'Subconscious imagery, lucid nights, and sleep visions.',
    true,
    94,
    ['WAKE', 'REST', 'DEEP', 'MIST', 'FALL', 'SOAR', 'DOOR', 'MAZE', 'EYES', 'DUSK'],
    ['DREAM', 'SLEEP', 'LUCID', 'NIGHT', 'CLOUD', 'DRIFT', 'GHOST', 'VOICE', 'IMAGE', 'AWAKE'],
    ['SHADOW', 'NIGHTS', 'VISION', 'FLIGHT', 'MIRAGE', 'WANDER', 'MEMORY', 'SILENT', 'UNSEEN', 'AWAKEN']
  ),
  cat(
    'personality-mbti',
    'Personality & Traits',
    'Mystic & Mind',
    'Character archetypes, temperament, and inner strengths.',
    true,
    92,
    ['BOLD', 'CALM', 'KEEN', 'WARM', 'WISE', 'TRUE', 'FAIR', 'KIND', 'WITS', 'PURE'],
    ['BRAVE', 'LOYAL', 'QUIET', 'WITTY', 'NOBLE', 'PROUD', 'EAGER', 'SMART', 'STOIC', 'VIVID'],
    ['HONEST', 'GENTLE', 'HUMBLE', 'DRIVEN', 'CANDID', 'CLEVER', 'STRONG', 'DARING', 'BRIGHT', 'MODEST']
  ),
  cat(
    'love-romance',
    'Love & Romance',
    'Mystic & Mind',
    'Affection, chemistry, devotion, and tender moments.',
    true,
    97,
    ['LOVE', 'KISS', 'DATE', 'SOUL', 'CARE', 'DEAR', 'WARM', 'BOND', 'VOWS', 'PAIR'],
    ['HEART', 'CRUSH', 'CHARM', 'LOVER', 'SWEET', 'FLIRT', 'BLUSH', 'ADORE', 'SPARK', 'AMOUR'],
    ['LOVERS', 'TENDER', 'DESIRE', 'DEVOTE', 'AFFAIR', 'COUPLE', 'WARMTH', 'BEAUTY', 'GENTLE', 'ARDENT']
  ),
  cat(
    'philosophy-stoic',
    'Philosophy & Stoicism',
    'Mystic & Mind',
    'Timeless wisdom, virtue, reason, and mental clarity.',
    true,
    90,
    ['MIND', 'SOUL', 'GOOD', 'TRUE', 'DUTY', 'CALM', 'SAGE', 'PATH', 'WILL', 'FORM'],
    ['STOIC', 'LOGIC', 'ETHIC', 'TRUTH', 'MORAL', 'IDEAL', 'TENET', 'VALUE', 'ORDER', 'THINK'],
    ['VIRTUE', 'WISDOM', 'REASON', 'ETHICS', 'NOTION', 'THEORY', 'SPIRIT', 'HUMBLE', 'CALMLY', 'MENTAL']
  ),
  cat(
    'meditation-zen',
    'Meditation & Zen',
    'Mystic & Mind',
    'Breathwork, stillness, mindfulness, and inner peace.',
    true,
    88,
    ['CALM', 'EASE', 'SOFT', 'FLOW', 'REST', 'HUSH', 'MIND', 'PURE', 'DEEP', 'GLOW'],
    ['PEACE', 'QUIET', 'LOTUS', 'STILL', 'RELAX', 'PAUSE', 'FOCUS', 'GRACE', 'SOUND', 'BLISS'],
    ['BREATH', 'SILENT', 'SERENE', 'GENTLE', 'CENTER', 'GROUND', 'SPIRIT', 'TEMPLE', 'NATURE', 'GARDEN']
  ),
  cat(
    'neuroscience',
    'Brain & Neuroscience',
    'Mystic & Mind',
    'Neural pathways, cognition, focus, and perception.',
    true,
    89,
    ['MIND', 'CELL', 'AXON', 'LOBE', 'SYNC', 'WAVE', 'STEM', 'CORE', 'GENE', 'WIRE'],
    ['BRAIN', 'NERVE', 'PULSE', 'SENSE', 'THINK', 'FOCUS', 'ALPHA', 'GAMMA', 'SLEEP', 'SPARK'],
    ['NEURAL', 'MEMORY', 'CORTEX', 'SIGNAL', 'REFLEX', 'MENTAL', 'SENSOR', 'OPTICS', 'ACTIVE', 'VISION']
  ),
  cat(
    'crystals-gems',
    'Crystals & Gemstones',
    'Mystic & Mind',
    'Precious stones, mineral luster, and faceted treasures.',
    true,
    91,
    ['RUBY', 'JADE', 'OPAL', 'GOLD', 'ONYX', 'MICA', 'ROCK', 'GEMS', 'PURE', 'GLOW'],
    ['PEARL', 'AMBER', 'TOPAZ', 'AGATE', 'FACET', 'JEWEL', 'SHINY', 'STONE', 'GLINT', 'CARAT'],
    ['QUARTZ', 'SILVER', 'COBALT', 'MARBLE', 'BRONZE', 'LUSTER', 'BRIGHT', 'FACETS', 'POLISH', 'JEWELS']
  ),
  cat(
    'aura-energy',
    'Intuition & Energy',
    'Mystic & Mind',
    'Gut instincts, personal energy, and vibrant presence.',
    false,
    78,
    ['AURA', 'GLOW', 'VIBE', 'FLOW', 'WARM', 'SOUL', 'FIRE', 'WIND', 'CALM', 'REAL'],
    ['SPARK', 'FLAME', 'LIGHT', 'PULSE', 'VITAL', 'SHINE', 'SENSE', 'CHILL', 'ALIVE', 'BLISS'],
    ['ENERGY', 'SPIRIT', 'RADIAL', 'GOLDEN', 'BRIGHT', 'ASTRAL', 'VISION', 'WARMTH', 'CENTER', 'SERENE']
  ),
  cat(
    'emotional-iq',
    'Emotional Intelligence',
    'Mystic & Mind',
    'Empathy, self-awareness, listening, and connection.',
    false,
    76,
    ['CARE', 'KIND', 'HEAR', 'FEEL', 'WARM', 'CALM', 'OPEN', 'HELP', 'BOND', 'HOPE'],
    ['HEART', 'TRUST', 'MERCY', 'GRACE', 'SMILE', 'SHARE', 'PEACE', 'VOICE', 'AWARE', 'QUIET'],
    ['EMPATH', 'LISTEN', 'GENTLE', 'HONEST', 'SOCIAL', 'CARING', 'HUMBLE', 'RELATE', 'FRIEND', 'TENDER']
  ),
  cat(
    'memory-focus',
    'Memory & Focus',
    'Mystic & Mind',
    'Concentration, recall, clarity, and sharp attention.',
    false,
    75,
    ['MIND', 'KEEN', 'NOTE', 'PLAN', 'READ', 'TEST', 'CLUE', 'LIST', 'FACT', 'IDEA'],
    ['FOCUS', 'STUDY', 'LEARN', 'THINK', 'SHARP', 'CLEAR', 'SOLVE', 'BRAIN', 'LOGIC', 'SKILL'],
    ['MEMORY', 'RECALL', 'MENTAL', 'LESSON', 'REVIEW', 'DETAIL', 'PUZZLE', 'NOTICE', 'REASON', 'RECORD']
  ),
  cat(
    'habits-mindset',
    'Habits & Mindset',
    'Mystic & Mind',
    'Daily routines, momentum, grit, and steady growth.',
    false,
    79,
    ['GOAL', 'STEP', 'PLAN', 'WORK', 'GROW', 'PACE', 'RISE', 'GAIN', 'WILL', 'DONE'],
    ['HABIT', 'DAILY', 'START', 'DRIVE', 'CRAFT', 'GRIND', 'BUILD', 'TRACK', 'FOCUS', 'SCORE'],
    ['GROWTH', 'EFFORT', 'ACTIVE', 'STEADY', 'METHOD', 'ENERGY', 'RESULT', 'FINISH', 'CREATE', 'TARGET']
  ),

  // === 2. MYSTERY & LORE (12) ===
  cat(
    'true-crime',
    'True Crime & Mystery',
    'Mystery & Lore',
    'Cold cases, alibis, evidence trails, and investigations.',
    true,
    96,
    ['CLUE', 'CASE', 'JAIL', 'CELL', 'LIES', 'TRAP', 'LOCK', 'DEED', 'PLOT', 'JURY'],
    ['CRIME', 'ALIBI', 'THEFT', 'FRAUD', 'JUDGE', 'PROOF', 'GUILT', 'TRACE', 'SCENE', 'TRIAL'],
    ['VICTIM', 'MURDER', 'DETECT', 'SECRET', 'PRISON', 'ESCAPE', 'DANGER', 'SEARCH', 'RECORD', 'FELONY']
  ),
  cat(
    'forensics',
    'Forensics & Clues',
    'Mystery & Lore',
    'Lab evidence, DNA traces, fingerprints, and ballistics.',
    true,
    89,
    ['CLUE', 'TEST', 'SCAN', 'LENS', 'DATA', 'HAIR', 'SPOT', 'SEAL', 'FILE', 'MARK'],
    ['TRACE', 'FIBER', 'BLOOD', 'MATCH', 'PROOF', 'PRINT', 'AUDIT', 'FLUID', 'GLASS', 'TOXIN'],
    ['SAMPLE', 'DETAIL', 'TISSUE', 'SIGNAL', 'DEVICE', 'RECORD', 'SEARCH', 'RESULT', 'MARKER', 'REPORT']
  ),
  cat(
    'mythology-gods',
    'Mythology & Legends',
    'Mystery & Lore',
    'Olympian deities, heroic quests, and ancient epics.',
    true,
    93,
    ['MYTH', 'GODS', 'HERO', 'LORE', 'FATE', 'EPIC', 'TALE', 'FIRE', 'BOLT', 'KING'],
    ['TITAN', 'FABLE', 'DEITY', 'VALOR', 'GLORY', 'CROWN', 'REALM', 'QUEST', 'SIREN', 'FLAME'],
    ['ORACLE', 'LEGEND', 'THRONE', 'SACRED', 'TEMPLE', 'SHIELD', 'DRAGON', 'SPIRIT', 'EMPIRE', 'HEROIC']
  ),
  cat(
    'secret-societies',
    'Secret Societies',
    'Mystery & Lore',
    'Ciphers, hidden vaults, oaths, and shadowed orders.',
    true,
    91,
    ['OATH', 'CODE', 'RING', 'VEIL', 'SEAL', 'KEYS', 'LOCK', 'DARK', 'MASK', 'PACT'],
    ['CRYPT', 'CODEX', 'VAULT', 'LODGE', 'GUILD', 'ORDER', 'SIGIL', 'CLOAK', 'TOKEN', 'GUARD'],
    ['SECRET', 'CIPHER', 'SYMBOL', 'RITUAL', 'HIDDEN', 'SHADOW', 'PALACE', 'TEMPLE', 'KEEPER', 'MEMBER']
  ),
  cat(
    'horror-gothic',
    'Horror & Gothic',
    'Mystery & Lore',
    'Moonlit manors, eerie fog, suspense, and midnight chills.',
    true,
    90,
    ['DARK', 'FEAR', 'TOMB', 'BONE', 'MIST', 'DUSK', 'HOWL', 'COLD', 'OMEN', 'GRIM'],
    ['GHOST', 'HAUNT', 'CREEP', 'SKULL', 'CRYPT', 'DREAD', 'BLOOD', 'SHADE', 'EERIE', 'SPINE'],
    ['HORROR', 'SHADOW', 'CASTLE', 'TERROR', 'FRIGHT', 'WICKED', 'CURSED', 'RAVENS', 'HOLLOW', 'SILENT']
  ),
  cat(
    'folklore-fables',
    'Folklore & Fables',
    'Mystery & Lore',
    'Enchanted woods, old proverbs, and timeless tales.',
    false,
    77,
    ['TALE', 'LORE', 'WOLF', 'WOOD', 'WISH', 'GOLD', 'KING', 'FROG', 'BELL', 'PATH'],
    ['FABLE', 'FAIRY', 'MAGIC', 'CHARM', 'GNOME', 'ELVES', 'CROWN', 'STORY', 'GIANT', 'TOWER'],
    ['FOREST', 'LEGEND', 'CASTLE', 'MAIDEN', 'PRINCE', 'SPIRIT', 'DRAGON', 'RIDDLE', 'WIZARD', 'MIRROR']
  ),
  cat(
    'detective-noir',
    'Detective & Noir',
    'Mystery & Lore',
    'Rainy alleys, trench coats, and sharp deduction.',
    false,
    80,
    ['RAIN', 'CITY', 'CASE', 'CLUE', 'DARK', 'COAT', 'DESK', 'LAMP', 'FILE', 'EXIT'],
    ['NIGHT', 'SMOKE', 'ALIAS', 'SHADE', 'PROOF', 'WATCH', 'TRACK', 'STAKE', 'CRIME', 'VOICE'],
    ['STREET', 'SEARCH', 'SECRET', 'DANGER', 'DETECT', 'FOLLOW', 'INSIDE', 'BORDER', 'SHADOW', 'TARGET']
  ),
  cat(
    'espionage',
    'Espionage & Spies',
    'Mystery & Lore',
    'Covert missions, dead drops, and double agents.',
    true,
    88,
    ['CODE', 'MOLE', 'VISA', 'DATA', 'PASS', 'FILE', 'EXIT', 'MASK', 'TRAP', 'SAFE'],
    ['AGENT', 'COVER', 'DECOY', 'INTEL', 'VAULT', 'LASER', 'PROXY', 'TRACE', 'GUARD', 'ROGUE'],
    ['COVERT', 'CIPHER', 'BORDER', 'SIGNAL', 'TARGET', 'ESCAPE', 'SECRET', 'SCHEME', 'PATROL', 'SENSOR']
  ),
  cat(
    'ancient-magic',
    'Alchemy & Lore',
    'Mystery & Lore',
    'Elixirs, arcane manuscripts, and philosopher stones.',
    false,
    79,
    ['GOLD', 'LEAD', 'VIAL', 'DUST', 'RUNE', 'BOOK', 'FIRE', 'SALT', 'HERB', 'MOON'],
    ['TONIC', 'SPELL', 'VAPOR', 'STONE', 'CHARM', 'FLAME', 'SIGIL', 'METAL', 'SMOKE', 'MYTHS'],
    ['POTION', 'ARCANE', 'ORACLE', 'AMULET', 'SYMBOL', 'SILVER', 'POWDER', 'VESSEL', 'RITUAL', 'MYSTIC']
  ),
  cat(
    'unsolved-riddles',
    'Riddles & Paradox',
    'Mystery & Lore',
    'Clever brain-bending clues and wordplay puzzles.',
    false,
    81,
    ['CLUE', 'MAZE', 'KNOT', 'WORD', 'MIND', 'HINT', 'QUIZ', 'TEST', 'ODDS', 'SPIN'],
    ['TRICK', 'LOGIC', 'TWIST', 'SOLVE', 'GUESS', 'THINK', 'BRAIN', 'CHESS', 'CRYPT', 'QUERY'],
    ['RIDDLE', 'PUZZLE', 'SECRET', 'ANSWER', 'SOLVED', 'JIGSAW', 'CLEVER', 'NOTION', 'SEARCH', 'HIDDEN']
  ),
  cat(
    'pirates-seas',
    'Pirates & Treasure',
    'Mystery & Lore',
    'Sunken chests, compasses, and high-seas adventure.',
    false,
    78,
    ['SHIP', 'GOLD', 'COIN', 'ISLE', 'SAIL', 'CREW', 'PORT', 'REEF', 'DECK', 'MAPS'],
    ['CHEST', 'PLANK', 'SKULL', 'SWORD', 'OCEAN', 'CORAL', 'COAST', 'STORM', 'TROVE', 'PEARL'],
    ['PIRATE', 'ISLAND', 'ANCHOR', 'HARBOR', 'SILVER', 'VESSEL', 'GALLEY', 'VOYAGE', 'SAILOR', 'WEALTH']
  ),
  cat(
    'ghosts-hauntings',
    'Haunted & Eerie',
    'Mystery & Lore',
    'Creaking floorboards, candlelit halls, and phantoms.',
    false,
    77,
    ['MIST', 'GRIM', 'DOOR', 'WIND', 'DARK', 'MOON', 'HOWL', 'ECHO', 'DUSK', 'PALE'],
    ['GHOST', 'HAUNT', 'EERIE', 'CREAK', 'SPOOK', 'ATTIC', 'CHILL', 'SHADE', 'VOICE', 'MANOR'],
    ['GHOSTS', 'SPIRIT', 'HOLLOW', 'SHADOW', 'CANDLE', 'SILENT', 'UNSEEN', 'CELLAR', 'MIRROR', 'WINDOW']
  ),

  // === 3. WEALTH & STRATEGY (11) ===
  cat(
    'wealth-investing',
    'Wealth & Investing',
    'Wealth & Strategy',
    'Compounding, portfolios, dividends, and financial freedom.',
    true,
    95,
    ['GOLD', 'BANK', 'BOND', 'FUND', 'GAIN', 'CASH', 'BULL', 'BEAR', 'DEBT', 'RATE'],
    ['STOCK', 'ASSET', 'YIELD', 'TRADE', 'VALUE', 'SHARE', 'PRICE', 'AUDIT', 'TRUST', 'BONUS'],
    ['WEALTH', 'PROFIT', 'EQUITY', 'INCOME', 'MARKET', 'INVEST', 'MARGIN', 'BUDGET', 'SALARY', 'RETURN']
  ),
  cat(
    'crypto-web3',
    'Crypto & Digital Assets',
    'Wealth & Strategy',
    'Ledgers, nodes, tokens, and decentralized networks.',
    true,
    91,
    ['COIN', 'HASH', 'NODE', 'BYTE', 'KEYS', 'MINT', 'SWAP', 'POOL', 'FORK', 'CODE'],
    ['TOKEN', 'CHAIN', 'BLOCK', 'DIGIT', 'MINER', 'STAKE', 'VAULT', 'PROOF', 'TRADE', 'SMART'],
    ['WALLET', 'CRYPTO', 'MINING', 'LEDGER', 'SERVER', 'BINARY', 'ONLINE', 'SECURE', 'ASSETS', 'TOKENS']
  ),
  cat(
    'luxury-fashion',
    'Luxury & Haute Couture',
    'Wealth & Strategy',
    'Runway tailoring, silk, ateliers, and timeless elegance.',
    true,
    92,
    ['SILK', 'GOWN', 'SUIT', 'GOLD', 'CHIC', 'LACE', 'COAT', 'RING', 'BAGS', 'HEEL'],
    ['STYLE', 'SUEDE', 'SATIN', 'DRESS', 'PURSE', 'SCARF', 'PEARL', 'GLOSS', 'VOGUE', 'MODEL'],
    ['LUXURY', 'VELVET', 'JACKET', 'TAILOR', 'DESIGN', 'FABRIC', 'GLOVES', 'RIBBON', 'STUDIO', 'BEAUTY']
  ),
  cat(
    'poker-strategy',
    'Poker & High Stakes',
    'Wealth & Strategy',
    'Bluffs, odds, river cards, and calculated risks.',
    true,
    89,
    ['CARD', 'DECK', 'DEAL', 'HAND', 'CHIP', 'FOLD', 'CALL', 'ODDS', 'KING', 'ACES'],
    ['POKER', 'BLUFF', 'FLUSH', 'RAISE', 'CHECK', 'RIVER', 'STAKE', 'ROYAL', 'HOUSE', 'WAGER'],
    ['DEALER', 'GAMBLE', 'CASINO', 'CHANCE', 'DOUBLE', 'SPADES', 'HEARTS', 'JOKERS', 'WINNER', 'STAKES']
  ),
  cat(
    'chess-tactics',
    'Chess & Strategy',
    'Wealth & Strategy',
    'Checkmates, gambits, forks, and endgame precision.',
    true,
    88,
    ['KING', 'ROOK', 'PAWN', 'MATE', 'MOVE', 'RANK', 'FILE', 'FORK', 'DRAW', 'TRAP'],
    ['CHESS', 'QUEEN', 'BOARD', 'GUARD', 'CHECK', 'TEMPO', 'CLOCK', 'BLITZ', 'MATCH', 'SCORE'],
    ['KNIGHT', 'BISHOP', 'CASTLE', 'GAMBIT', 'ATTACK', 'DEFEND', 'SQUARE', 'TACTIC', 'MASTER', 'WINNER']
  ),
  cat(
    'entrepreneurship',
    'Startups & Founders',
    'Wealth & Strategy',
    'Product launches, scaling, pitches, and bold ventures.',
    false,
    82,
    ['TEAM', 'PLAN', 'IDEA', 'GROW', 'LEAD', 'USER', 'RISK', 'SELL', 'SHIP', 'GOAL'],
    ['PITCH', 'BUILD', 'SCALE', 'BRAND', 'VALUE', 'PIVOT', 'STAGE', 'MAKER', 'SCOPE', 'DRIVE'],
    ['LAUNCH', 'GROWTH', 'STUDIO', 'CLIENT', 'DESIGN', 'CREATE', 'FUNDED', 'MARKET', 'RETAIL', 'LEADER']
  ),
  cat(
    'real-estate',
    'Real Estate & Estates',
    'Wealth & Strategy',
    'Properties, architecture, mortgages, and curb appeal.',
    false,
    78,
    ['HOME', 'LAND', 'DEED', 'RENT', 'LOFT', 'YARD', 'ROOF', 'DOOR', 'HALL', 'WALL'],
    ['HOUSE', 'VILLA', 'MANOR', 'PATIO', 'PORCH', 'LEASE', 'VALUE', 'FLOOR', 'BRICK', 'STONE'],
    ['ESTATE', 'RENTAL', 'GARDEN', 'PARLOR', 'SUBURB', 'GARAGE', 'SELLER', 'BUYERS', 'CLOSER', 'MODERN']
  ),
  cat(
    'watches-horology',
    'Luxury Watches',
    'Wealth & Strategy',
    'Mechanical movements, bezels, dials, and Swiss craft.',
    true,
    86,
    ['TIME', 'DIAL', 'HAND', 'CASE', 'GEAR', 'GOLD', 'TICK', 'BAND', 'GEMS', 'HOUR'],
    ['WATCH', 'BEZEL', 'CROWN', 'STRAP', 'STEEL', 'ROTOR', 'JEWEL', 'SWISS', 'TIMER', 'PHASE'],
    ['SILVER', 'BRONZE', 'CHROME', 'MINUTE', 'SECOND', 'MANUAL', 'SPRING', 'DESIGN', 'LEGACY', 'QUARTZ']
  ),
  cat(
    'royal-dynasties',
    'Royal Dynasties',
    'Wealth & Strategy',
    'Crowns, palaces, heraldry, and sovereign courts.',
    true,
    87,
    ['KING', 'DUKE', 'HEIR', 'RULE', 'HALL', 'GOLD', 'SILK', 'ROBE', 'OATH', 'RING'],
    ['CROWN', 'QUEEN', 'ROYAL', 'REIGN', 'COURT', 'NOBLE', 'REALM', 'SWORD', 'GUARD', 'TIARA'],
    ['PALACE', 'PRINCE', 'THRONE', 'EMPIRE', 'CASTLE', 'KNIGHT', 'MAIDEN', 'ESTATE', 'RULING', 'LEGACY']
  ),
  cat(
    'economics',
    'Markets & Economics',
    'Wealth & Strategy',
    'Supply, demand, trade balances, and global commerce.',
    false,
    75,
    ['COST', 'RATE', 'LOAN', 'DEBT', 'EARN', 'GOOD', 'WORK', 'SALE', 'BANK', 'MINT'],
    ['PRICE', 'TRADE', 'MONEY', 'LABOR', 'INDEX', 'SHARE', 'DEBIT', 'YIELD', 'SPEND', 'VALUE'],
    ['SUPPLY', 'DEMAND', 'MARKET', 'EXPORT', 'IMPORT', 'FISCAL', 'CREDIT', 'INCOME', 'OUTPUT', 'SECTOR']
  ),
  cat(
    'negotiation',
    'Leadership & Deals',
    'Wealth & Strategy',
    'Persuasion, alignment, strategy, and clear decisions.',
    false,
    76,
    ['DEAL', 'PACT', 'TERM', 'PLAN', 'TALK', 'TEAM', 'LEAD', 'FAIR', 'SIGN', 'VOTE'],
    ['OFFER', 'AGREE', 'TRUST', 'VALUE', 'CLAIM', 'VOICE', 'UNITY', 'MERIT', 'PIVOT', 'TERMS'],
    ['ACCORD', 'DEBATE', 'MANAGE', 'MENTOR', 'DECIDE', 'TREATY', 'CLAUSE', 'PLEDGE', 'COMMIT', 'OPTION']
  ),

  // === 4. POP CULTURE & ARTS (ENTERTAINMENT & FINE ARTS) ===
  cat(
    'anime-manga',
    'Anime & Manga',
    'Entertainment',
    'Shonen rivalries, studio animation, and epic arcs.',
    true,
    94,
    ['HERO', 'MASK', 'DUEL', 'CLAN', 'SOUL', 'FIRE', 'STAR', 'INKS', 'BOOK', 'EPIC'],
    ['MANGA', 'ANIME', 'NINJA', 'GHOST', 'SWORD', 'MAGIC', 'DEMON', 'QUEST', 'POWER', 'BLADE'],
    ['SPIRIT', 'DRAGON', 'LEGEND', 'ARCADE', 'STUDIO', 'SHADOW', 'MASTER', 'BATTLE', 'ACTION', 'MYSTIC']
  ),
  cat(
    'pop-icons',
    'Pop Icons & Fame',
    'Entertainment',
    'Chart-toppers, tour stages, spotlights, and fandom.',
    true,
    93,
    ['STAR', 'SONG', 'FAME', 'SHOW', 'BAND', 'TOUR', 'FANS', 'SING', 'BEAT', 'GOLD'],
    ['STAGE', 'ALBUM', 'MUSIC', 'CHART', 'DANCE', 'CROWD', 'STYLE', 'VOICE', 'VOCAL', 'LYRIC'],
    ['SINGER', 'ARTIST', 'FAMOUS', 'SINGLE', 'LYRICS', 'CAMERA', 'GLOSSY', 'STUDIO', 'TALENT', 'WINNER']
  ),
  cat(
    'cinematography',
    'Cinema & Film Craft',
    'Entertainment',
    'Directors, lenses, dramatic scripts, and box office.',
    true,
    88,
    ['FILM', 'REEL', 'CAST', 'SHOT', 'LENS', 'ROLE', 'PLOT', 'STAR', 'EDIT', 'FADE'],
    ['SCENE', 'ACTOR', 'DRAMA', 'FRAME', 'LIGHT', 'SOUND', 'GENRE', 'STAGE', 'MOVIE', 'SCORE'],
    ['CINEMA', 'SCRIPT', 'CAMERA', 'EDITOR', 'SCREEN', 'SEQUEL', 'STUDIO', 'VISUAL', 'ACTION', 'FINALE']
  ),
  cat(
    'streetwear',
    'Streetwear & Sneakers',
    'Pop Culture & Arts',
    'Limited drops, denim, graphic hoodies, and skate culture.',
    true,
    89,
    ['SHOE', 'LACE', 'HOOD', 'CAPS', 'DROP', 'LOGO', 'COOL', 'SOCK', 'JEAN', 'KICK'],
    ['STYLE', 'DENIM', 'SHIRT', 'BRAND', 'FRESH', 'URBAN', 'SKATE', 'JEANS', 'TREND', 'SUEDE'],
    ['JACKET', 'SLEEVE', 'DESIGN', 'COPPER', 'STREET', 'COTTON', 'GLOSSY', 'BRIGHT', 'CUSTOM', 'PRINTS']
  ),
  cat(
    'slang-trends',
    'Modern Slang & Viral',
    'Entertainment',
    'Internet culture, memes, hot takes, and daily buzz.',
    true,
    91,
    ['VIBE', 'MOOD', 'HYPE', 'REAL', 'MEME', 'FLEX', 'DRIP', 'CHAT', 'POST', 'LIKE'],
    ['VIRAL', 'TREND', 'CHILL', 'EXTRA', 'SALTY', 'BASIC', 'SHADE', 'SAVVY', 'DRAMA', 'SPICY'],
    ['GOSSIP', 'QUOTES', 'STATUS', 'TRENDS', 'SAVAGE', 'CLEVER', 'DARING', 'HUMBLE', 'MODERN', 'UNIQUE']
  ),
  cat(
    'jazz-blues',
    'Jazz & Soul Music',
    'Entertainment',
    'Brass solos, velvet clubs, vinyl grooves, and rhythm.',
    true,
    85,
    ['JAZZ', 'BLUE', 'SOUL', 'HORN', 'BASS', 'BEAT', 'NOTE', 'SONG', 'TUNE', 'CLUB'],
    ['BLUES', 'BRASS', 'PIANO', 'SWING', 'TEMPO', 'CHORD', 'VOCAL', 'VINYL', 'SMOKE', 'STAGE'],
    ['MELODY', 'RHYTHM', 'SMOOTH', 'VELVET', 'GUITAR', 'SINGER', 'RECORD', 'LOUNGE', 'GOLDEN', 'CHORDS']
  ),
  cat(
    'sci-fi-worlds',
    'Sci-Fi & Superpowers',
    'Entertainment',
    'Starships, portals, cybernetics, and future worlds.',
    true,
    90,
    ['STAR', 'VOID', 'WARP', 'BEAM', 'SHIP', 'MARS', 'HERO', 'SUIT', 'ATOM', 'TIME'],
    ['ALIEN', 'LASER', 'ROBOT', 'ORBIT', 'SPACE', 'DRONE', 'CLONE', 'CYBER', 'POWER', 'SOLAR'],
    ['GALAXY', 'PORTAL', 'PLANET', 'ROCKET', 'FUTURE', 'VECTOR', 'SIGNAL', 'MATRIX', 'SHIELD', 'COSMIC']
  ),
  cat(
    'gaming-arcade',
    'Video Games & Esports',
    'Entertainment',
    'Boss fights, high scores, quests, and retro arcades.',
    false,
    83,
    ['GAME', 'PLAY', 'BOSS', 'LOOT', 'COIN', 'JUMP', 'TEAM', 'RANK', 'WINS', 'HERO'],
    ['QUEST', 'LEVEL', 'SCORE', 'SKILL', 'ARENA', 'PIXEL', 'MATCH', 'STAGE', 'POWER', 'SPEED'],
    ['ARCADE', 'PLAYER', 'KEYPAD', 'WINNER', 'ACTION', 'SHIELD', 'SPRINT', 'TARGET', 'ATTACK', 'DEFEND']
  ),
  cat(
    'music-theory',
    'Music & Instruments',
    'Pop Culture & Arts',
    'Chords, scales, symphonies, and acoustic craft.',
    false,
    78,
    ['NOTE', 'SONG', 'TUNE', 'BEAT', 'DRUM', 'HARP', 'BELL', 'SING', 'BASS', 'TONE'],
    ['CHORD', 'SCALE', 'PIANO', 'FLUTE', 'TEMPO', 'OPERA', 'CHOIR', 'LYRIC', 'PITCH', 'SOUND'],
    ['MELODY', 'RHYTHM', 'GUITAR', 'VIOLIN', 'TUNING', 'ANTHEM', 'SINGER', 'RECORD', 'CHORUS', 'SONATA']
  ),
  cat(
    'books-literature',
    'Classic Literature',
    'Pop Culture & Arts',
    'Novels, chapters, prose, and library shelves.',
    false,
    79,
    ['BOOK', 'PAGE', 'POEM', 'POET', 'TALE', 'WORD', 'TEXT', 'PLOT', 'LORE', 'READ'],
    ['NOVEL', 'PROSE', 'STORY', 'VERSE', 'ESSAY', 'TITLE', 'FABLE', 'DRAMA', 'QUOTE', 'WRITE'],
    ['AUTHOR', 'WRITER', 'READER', 'LETTER', 'POETRY', 'LEGEND', 'EDITOR', 'PHRASE', 'SCRIPT', 'SONNET']
  ),
  cat(
    'theater-stage',
    'Theater & Broadway',
    'Entertainment',
    'Curtain calls, monologues, costumes, and spotlights.',
    false,
    74,
    ['PLAY', 'CAST', 'ROLE', 'MASK', 'SEAT', 'SHOW', 'SONG', 'HALL', 'EXIT', 'CLAP'],
    ['STAGE', 'DRAMA', 'ACTOR', 'SCENE', 'OPERA', 'DANCE', 'VOICE', 'LIGHT', 'PROPS', 'CROWD'],
    ['COMEDY', 'TRAGIC', 'SCRIPT', 'FINALE', 'CHORUS', 'TICKET', 'PARADE', 'RIBBON', 'ACTORS', 'ENCORE']
  ),
  cat(
    'photography',
    'Photography & Lens',
    'Pop Culture & Arts',
    'Aperture, exposure, darkrooms, and candid frames.',
    false,
    77,
    ['LENS', 'FILM', 'SHOT', 'ZOOM', 'CROP', 'GLOW', 'VIEW', 'TONE', 'DARK', 'BLUR'],
    ['PHOTO', 'FRAME', 'FLASH', 'FOCUS', 'LIGHT', 'SHADE', 'COLOR', 'PRINT', 'IMAGE', 'ALBUM'],
    ['CAMERA', 'IMAGES', 'FRAMES', 'PRINTS', 'STUDIO', 'LIGHTS', 'VISUAL', 'BRIGHT', 'SHADOW', 'FILTER']
  ),
  cat(
    'painting-fine-art',
    'Painting & Fine Art',
    'Pop Culture & Arts',
    'Canvas, oil pigments, galleries, and brushstrokes.',
    false,
    76,
    ['ARTS', 'DRAW', 'LINE', 'HUES', 'TINT', 'TONE', 'FORM', 'GLOW', 'WALL', 'INKS'],
    ['PAINT', 'BRUSH', 'EASEL', 'COLOR', 'SHADE', 'MURAL', 'FRAME', 'CRAFT', 'DRAFT', 'IMAGE'],
    ['CANVAS', 'ARTIST', 'MUSEUM', 'SKETCH', 'COLORS', 'BORDER', 'STUDIO', 'DESIGN', 'BRIGHT', 'DETAIL']
  ),
  cat(
    'sculpture-craft',
    'Sculpture & Pottery',
    'Pop Culture & Arts',
    'Clay wheels, marble chisels, kilns, and tactile forms.',
    false,
    72,
    ['CLAY', 'KILN', 'MOLD', 'FORM', 'WOOD', 'IRON', 'VASE', 'BOWL', 'TILE', 'ARCH'],
    ['CARVE', 'STONE', 'SHAPE', 'GLAZE', 'WHEEL', 'CRAFT', 'GLASS', 'METAL', 'SHARD', 'TERRA'],
    ['MARBLE', 'BRONZE', 'STATUE', 'COPPER', 'POTTER', 'FIGURE', 'SMOOTH', 'WOODEN', 'CREATE', 'STUDIO']
  ),
  cat(
    'dance-ballet',
    'Dance & Choreography',
    'Pop Culture & Arts',
    'Graceful leaps, rhythm, tempo, and expressive motion.',
    false,
    73,
    ['STEP', 'LEAP', 'SPIN', 'TURN', 'BEAT', 'SWAY', 'FLOW', 'PAIR', 'FOOT', 'MOVE'],
    ['DANCE', 'WALTZ', 'TANGO', 'SALSA', 'TEMPO', 'GRACE', 'POISE', 'TWIRL', 'STAGE', 'MUSIC'],
    ['DANCER', 'BALLET', 'MOTION', 'RHYTHM', 'RIBBON', 'FLIGHT', 'SMOOTH', 'LIVELY', 'ARTIST', 'ENERGY']
  ),

  // === 5. SCIENCE & TECH (14) ===
  cat(
    'space-cosmos',
    'Space & Black Holes',
    'Science & Tech',
    'Nebulas, gravity wells, supernovas, and deep space.',
    true,
    93,
    ['STAR', 'MOON', 'MARS', 'VOID', 'NOVA', 'DUST', 'RING', 'BEAM', 'WARP', 'DARK'],
    ['SPACE', 'ORBIT', 'SOLAR', 'LUNAR', 'COMET', 'EARTH', 'PLUTO', 'LIGHT', 'QUARK', 'FLARE'],
    ['GALAXY', 'PLANET', 'ROCKET', 'COSMIC', 'METEOR', 'SATURN', 'RADIUS', 'ORBITS', 'ENERGY', 'ASTRAL']
  ),
  cat(
    'ai-robotics',
    'AI & Robotics',
    'Science & Tech',
    'Neural nets, autonomous agents, sensors, and servos.',
    true,
    92,
    ['CODE', 'DATA', 'CHIP', 'NODE', 'BYTE', 'TASK', 'MIND', 'CORE', 'GEAR', 'UNIT'],
    ['ROBOT', 'MODEL', 'AGENT', 'LOGIC', 'BRAIN', 'SMART', 'INPUT', 'SERVO', 'LASER', 'DRONE'],
    ['NEURAL', 'SENSOR', 'SERVER', 'BINARY', 'SYSTEM', 'ENGINE', 'SYNTAX', 'MODULE', 'OUTPUT', 'VISION']
  ),
  cat(
    'quantum-physics',
    'Quantum Physics',
    'Science & Tech',
    'Photons, spin states, wavefunctions, and subatomic laws.',
    true,
    87,
    ['ATOM', 'WAVE', 'SPIN', 'MASS', 'VOLT', 'IONS', 'BEAM', 'FLUX', 'TIME', 'ZERO'],
    ['QUARK', 'PHASE', 'LIGHT', 'FORCE', 'PRISM', 'ORBIT', 'IONIC', 'FIELD', 'PULSE', 'GAMMA'],
    ['PROTON', 'ENERGY', 'VECTOR', 'MATTER', 'ATOMIC', 'PHOTON', 'THEORY', 'FINITE', 'RADIAL', 'SIGNAL']
  ),
  cat(
    'cybersecurity',
    'Cyber & Hacking',
    'Science & Tech',
    'Firewalls, encryption keys, packets, and zero-days.',
    true,
    89,
    ['CODE', 'HASH', 'PORT', 'LOCK', 'KEYS', 'PING', 'ROOT', 'DATA', 'BUGS', 'TRAP'],
    ['CYBER', 'TOKEN', 'PATCH', 'LOGIN', 'VIRUS', 'PROXY', 'GUARD', 'ALERT', 'SHELL', 'AUDIT'],
    ['SECURE', 'BREACH', 'SERVER', 'ROUTER', 'SOCKET', 'PACKET', 'SYSTEM', 'DETECT', 'SHIELD', 'ACCESS']
  ),
  cat(
    'biotech-genetics',
    'Biotech & Genetics',
    'Science & Tech',
    'DNA helices, enzymes, gene editing, and longevity.',
    true,
    86,
    ['GENE', 'CELL', 'LIFE', 'GROW', 'CODE', 'TEST', 'LABS', 'SEED', 'PURE', 'HOST'],
    ['CLONE', 'HELIX', 'VIRUS', 'FLORA', 'FAUNA', 'SERUM', 'SPORE', 'ORGAN', 'PLANT', 'BLOOD'],
    ['ENZYME', 'TISSUE', 'HEALTH', 'IMMUNE', 'SAMPLE', 'NATURE', 'EVOLVE', 'CARBON', 'OXYGEN', 'ACTIVE']
  ),
  cat(
    'astronomy-basics',
    'Stars & Planets',
    'Science & Tech',
    'Telescopes, eclipses, constellations, and moons.',
    false,
    79,
    ['STAR', 'MOON', 'HALO', 'MARS', 'DUSK', 'DAWN', 'RING', 'DARK', 'GLOW', 'EAST'],
    ['EARTH', 'VENUS', 'SOLAR', 'LUNAR', 'ORBIT', 'COMET', 'NORTH', 'SOUTH', 'SHINE', 'NIGHT'],
    ['PLANET', 'SATURN', 'URANUS', 'GALAXY', 'BRIGHT', 'SHADOW', 'COSMIC', 'SUMMIT', 'ASTRAL', 'CRATER']
  ),
  cat(
    'chemistry-elements',
    'Chemistry & Lab',
    'Science & Tech',
    'Reactions, elements, flasks, and periodic matter.',
    false,
    76,
    ['ACID', 'SALT', 'ZINC', 'IRON', 'GOLD', 'BOND', 'ATOM', 'BOIL', 'FUME', 'PURE'],
    ['FLASK', 'OXIDE', 'METAL', 'IONIC', 'VAPOR', 'SOLID', 'FLUID', 'MIXER', 'GLASS', 'REACT'],
    ['CARBON', 'OXYGEN', 'SODIUM', 'LIQUID', 'COPPER', 'SILVER', 'POWDER', 'MATTER', 'BUFFER', 'FILTER']
  ),
  cat(
    'mathematics',
    'Math & Geometry',
    'Science & Tech',
    'Prime numbers, angles, proofs, and crisp equations.',
    false,
    75,
    ['PLUS', 'ZERO', 'NINE', 'FOUR', 'FIVE', 'LINE', 'AREA', 'CUBE', 'AXIS', 'ROOT'],
    ['ANGLE', 'GRAPH', 'EQUAL', 'RATIO', 'PRIME', 'PROOF', 'DIGIT', 'CHORD', 'CURVE', 'COUNT'],
    ['NUMBER', 'CIRCLE', 'SQUARE', 'RADIUS', 'LINEAR', 'DEGREE', 'FACTOR', 'DIVIDE', 'AMOUNT', 'VECTOR']
  ),
  cat(
    'biology-cells',
    'Biology & Life',
    'Science & Tech',
    'Ecosystems, organisms, habitats, and living science.',
    false,
    74,
    ['LIFE', 'CELL', 'ROOT', 'LEAF', 'SEED', 'BONE', 'SKIN', 'WING', 'BEAK', 'STEM'],
    ['PLANT', 'HEART', 'BRAIN', 'NERVE', 'FUNGI', 'FLORA', 'FAUNA', 'BLOOD', 'BLOOM', 'SPORE'],
    ['ANIMAL', 'NATURE', 'INSECT', 'FOREST', 'BREATH', 'GROWTH', 'NATIVE', 'LIVING', 'TISSUE', 'ORIGIN']
  ),
  cat(
    'dinosaurs-fossils',
    'Dinosaurs & Fossils',
    'Science & Tech',
    'Prehistoric giants, amber fossils, and ancient bones.',
    false,
    80,
    ['BONE', 'ROCK', 'CLAW', 'TAIL', 'EGGS', 'FERN', 'PAST', 'AGED', 'HUNT', 'ROAR'],
    ['AMBER', 'STONE', 'GIANT', 'SCALE', 'TEETH', 'TRACK', 'EARTH', 'BEAST', 'SKULL', 'RIDGE'],
    ['FOSSIL', 'BEASTS', 'CANYON', 'VALLEY', 'STONES', 'MUSEUM', 'CRATER', 'DESERT', 'JUNGLE', 'TRACKS']
  ),
  cat(
    'geology-minerals',
    'Geology & Rocks',
    'Science & Tech',
    'Tectonic plates, canyons, crystals, and strata.',
    false,
    73,
    ['ROCK', 'SAND', 'CLAY', 'COAL', 'MICA', 'CAVE', 'PEAK', 'RIFT', 'DUST', 'IRON'],
    ['STONE', 'SHALE', 'CHALK', 'SLATE', 'FAULT', 'CRUST', 'MAGMA', 'CLIFF', 'FLINT', 'EARTH'],
    ['GRAVEL', 'MARBLE', 'QUARTZ', 'CANYON', 'CAVERN', 'VALLEY', 'FOSSIL', 'GROUND', 'COPPER', 'BRONZE']
  ),
  cat(
    'weather-climate',
    'Weather & Storms',
    'Science & Tech',
    'Thunderheads, gales, snowfall, and shifting skies.',
    false,
    76,
    ['RAIN', 'WIND', 'SNOW', 'HAIL', 'GALE', 'GUST', 'MIST', 'COLD', 'WARM', 'THAW'],
    ['STORM', 'CLOUD', 'FROST', 'SLEET', 'FOGGY', 'SUNNY', 'WINDY', 'HUMID', 'FLASH', 'FLOOD'],
    ['BREEZE', 'SHOWER', 'CLOUDS', 'FROZEN', 'WINTER', 'SUMMER', 'AUTUMN', 'SPRING', 'SEASON', 'BRIGHT']
  ),
  cat(
    'computing-code',
    'Software & Code',
    'Science & Tech',
    'Algorithms, syntax, servers, and clean architectures.',
    false,
    81,
    ['CODE', 'DATA', 'BYTE', 'DISK', 'NODE', 'LOOP', 'VOID', 'TYPE', 'TEST', 'USER'],
    ['STACK', 'QUEUE', 'ARRAY', 'DEBUG', 'BUILD', 'PATCH', 'INPUT', 'LOGIC', 'CACHE', 'LOGIN'],
    ['SYNTAX', 'SERVER', 'BINARY', 'MODULE', 'SCRIPT', 'ROUTER', 'KERNEL', 'OUTPUT', 'OBJECT', 'UPDATE']
  ),
  cat(
    'engineering',
    'Engineering & Machines',
    'Science & Tech',
    'Bridges, turbines, steel trusses, and precision.',
    false,
    74,
    ['GEAR', 'BOLT', 'IRON', 'WIRE', 'PUMP', 'LOAD', 'BEAM', 'PIPE', 'WELD', 'TOOL'],
    ['STEEL', 'LEVER', 'ROTOR', 'MOTOR', 'POWER', 'CRAFT', 'RIVET', 'FRAME', 'TURBO', 'GAUGE'],
    ['ENGINE', 'BRIDGE', 'SOCKET', 'PULLEY', 'SPRING', 'SYSTEM', 'DESIGN', 'CHROME', 'COPPER', 'DEVICE']
  ),

  // === 6. FOOD & LIFESTYLE (12) ===
  cat(
    'gourmet-cuisine',
    'Gourmet & Fine Dining',
    'Food & Lifestyle',
    'Michelin kitchens, tasting menus, and savory craft.',
    true,
    87,
    ['CHEF', 'DISH', 'SOUP', 'MEAT', 'HERB', 'WINE', 'TART', 'SALT', 'PEAR', 'CAKE'],
    ['ROAST', 'SAUCE', 'SAUTE', 'STEAK', 'PASTA', 'BROTH', 'FEAST', 'OLIVE', 'SPICE', 'CREAM'],
    ['DINNER', 'FLAVOR', 'GARLIC', 'PEPPER', 'BUTTER', 'RECIPE', 'SALMON', 'CHEESE', 'BISTRO', 'PASTRY']
  ),
  cat(
    'espresso-coffee',
    'Espresso & Cafe Culture',
    'Food & Lifestyle',
    'Freshly pulled shots, crema, roasts, and morning cafés.',
    true,
    88,
    ['BREW', 'CAFE', 'MILK', 'FOAM', 'BEAN', 'WARM', 'MUGS', 'POUR', 'DARK', 'RICH'],
    ['LATTE', 'MOCHA', 'ROAST', 'AROMA', 'COCOA', 'CREAM', 'SUGAR', 'STEAM', 'GRIND', 'TASTE'],
    ['COFFEE', 'ROASTS', 'BITTER', 'SMOOTH', 'BAKERY', 'COOKIE', 'FILTER', 'GOLDEN', 'KETTLE', 'WARMTH']
  ),
  cat(
    'wine-spirits',
    'Wine & Sommelier',
    'Food & Lifestyle',
    'Vineyards, oak barrels, vintages, and tasting notes.',
    true,
    85,
    ['WINE', 'CORK', 'VINE', 'AGED', 'ROSE', 'SOUR', 'POUR', 'BODY', 'NOSE', 'OAKS'],
    ['GRAPE', 'TASTE', 'AROMA', 'CRISP', 'SWEET', 'GLASS', 'OAKEN', 'JUICY', 'SPICE', 'BLUSH'],
    ['BARREL', 'CELLAR', 'BOTTLE', 'SMOOTH', 'BITTER', 'VALLEY', 'GOLDEN', 'FRUITS', 'SUMMER', 'AUTUMN']
  ),
  cat(
    'perfume-scents',
    'Perfume & Fragrance',
    'Food & Lifestyle',
    'Botanical notes, ambergris, cedar, and signature scents.',
    true,
    86,
    ['ROSE', 'LILY', 'IRIS', 'MINT', 'SAGE', 'PINE', 'MUSK', 'VIAL', 'SOFT', 'PURE'],
    ['SCENT', 'AROMA', 'CEDAR', 'AMBER', 'LILAC', 'SPICE', 'FRESH', 'PETAL', 'SWEET', 'BLOOM'],
    ['ORCHID', 'VIOLET', 'FLOWER', 'CITRUS', 'GARDEN', 'POWDER', 'BOTTLE', 'GINGER', 'SUMMER', 'SUBTLE']
  ),
  cat(
    'baking-pastry',
    'Baking & Patisserie',
    'Food & Lifestyle',
    'Golden crusts, sourdough, sugar glazes, and ovens.',
    false,
    81,
    ['CAKE', 'LOAF', 'OVEN', 'BAKE', 'MILK', 'TART', 'ROLL', 'BUNS', 'WARM', 'SIFT'],
    ['BREAD', 'DOUGH', 'FLOUR', 'SUGAR', 'CRUST', 'SWEET', 'GLAZE', 'YEAST', 'CREAM', 'CRUMB'],
    ['BAKERY', 'BUTTER', 'COOKIE', 'GOLDEN', 'RECIPE', 'CANDLE', 'SMOOTH', 'COFFEE', 'CHERRY', 'BANANA']
  ),
  cat(
    'fruits-orchard',
    'Fruits & Orchard',
    'Food & Lifestyle',
    'Sun-ripened harvests, citrus groves, and berries.',
    false,
    77,
    ['PEAR', 'PLUM', 'LIME', 'KIWI', 'FIGS', 'DATE', 'SEED', 'TREE', 'RIPE', 'ZEST'],
    ['APPLE', 'PEACH', 'MANGO', 'BERRY', 'LEMON', 'MELON', 'GRAPE', 'OLIVE', 'GUAVA', 'JUICY'],
    ['ORANGE', 'CHERRY', 'BANANA', 'CITRUS', 'FRUITS', 'GARDEN', 'SUMMER', 'AUTUMN', 'TOMATO', 'SWEETS']
  ),
  cat(
    'spices-herbs',
    'Spices & Herbs',
    'Food & Lifestyle',
    'Aromatic kitchens, botanical seasonings, and zest.',
    false,
    75,
    ['HERB', 'SALT', 'MINT', 'SAGE', 'DILL', 'ZEST', 'WARM', 'LEAF', 'SEED', 'ROOT'],
    ['SPICE', 'BASIL', 'THYME', 'CURRY', 'CHILI', 'ANISE', 'CLOVE', 'CUMIN', 'PESTO', 'ZESTY'],
    ['GARLIC', 'PEPPER', 'GINGER', 'FLAVOR', 'GARDEN', 'HERBAL', 'POWDER', 'SAVORY', 'TOMATO', 'SALMON']
  ),
  cat(
    'home-interior',
    'Interior Design',
    'Food & Lifestyle',
    'Warm lighting, linen textures, and calm living spaces.',
    false,
    78,
    ['ROOM', 'SOFA', 'LAMP', 'RUGS', 'WOOD', 'VASE', 'TILE', 'DOOR', 'DESK', 'COZY'],
    ['CHAIR', 'TABLE', 'COUCH', 'SHELF', 'FRAME', 'LINEN', 'FLOOR', 'DECOR', 'LIGHT', 'GLASS'],
    ['CARPET', 'MIRROR', 'WINDOW', 'CANDLE', 'FABRIC', 'MODERN', 'WOODEN', 'PARLOR', 'GARDEN', 'BRIGHT']
  ),
  cat(
    'gardening-flora',
    'Gardening & Flora',
    'Food & Lifestyle',
    'Seedlings, greenhouse blooms, and rich garden soil.',
    false,
    76,
    ['SEED', 'SOIL', 'LEAF', 'STEM', 'ROOT', 'FERN', 'MOSS', 'ROSE', 'BULB', 'GROW'],
    ['PLANT', 'BLOOM', 'PETAL', 'FLORA', 'DAISY', 'LILAC', 'TULIP', 'MULCH', 'GREEN', 'WATER'],
    ['GARDEN', 'FLOWER', 'ORCHID', 'VIOLET', 'CLOVER', 'BRANCH', 'LEAVES', 'NATURE', 'SPRING', 'SUMMER']
  ),
  cat(
    'wellness-fitness',
    'Fitness & Recovery',
    'Food & Lifestyle',
    'Strength, mobility, endurance, and healthy habits.',
    false,
    80,
    ['SWIM', 'HIKE', 'WALK', 'YOGA', 'PACE', 'REST', 'LIFT', 'JUMP', 'CORE', 'RUNS'],
    ['SPORT', 'TRAIN', 'PULSE', 'SWEAT', 'AGILE', 'VITAL', 'POWER', 'SPEED', 'SLEEP', 'DAILY'],
    ['HEALTH', 'ACTIVE', 'RUNNER', 'SPRINT', 'STRONG', 'ENERGY', 'BREATH', 'HIKING', 'ROBUST', 'STEADY']
  ),
  cat(
    'tea-rituals',
    'Tea & Botanicals',
    'Food & Lifestyle',
    'Steeped leaves, porcelain teapots, and quiet mornings.',
    false,
    74,
    ['LEAF', 'HERB', 'BREW', 'POUR', 'WARM', 'CALM', 'MINT', 'PURE', 'ROSE', 'COZY'],
    ['STEAM', 'AROMA', 'SWEET', 'LEMON', 'HONEY', 'CHINA', 'STEEP', 'SPICE', 'GREEN', 'QUIET'],
    ['KETTLE', 'HERBAL', 'GINGER', 'GARDEN', 'ORANGE', 'FLOWER', 'SERENE', 'GENTLE', 'WARMTH', 'RITUAL']
  ),
  cat(
    'street-food',
    'Global Street Food',
    'Food & Lifestyle',
    'Night markets, sizzling woks, and bold local bites.',
    false,
    79,
    ['TACO', 'SOUP', 'RICE', 'ROLL', 'MEAT', 'CORN', 'PORK', 'CHEF', 'CART', 'WARM'],
    ['SPICY', 'RAMEN', 'SUSHI', 'KEBAB', 'PASTA', 'SALSA', 'SNACK', 'GRILL', 'TASTE', 'FRESH'],
    ['MARKET', 'BURGER', 'PEPPER', 'GARLIC', 'NOODLE', 'SAUCES', 'DINNER', 'FLAVOR', 'STREET', 'SAVORY']
  ),

  // === 7. NATURE & EARTH (11) ===
  cat(
    'ocean-abyss',
    'Deep Ocean & Abyss',
    'Nature & Earth',
    'Bioluminescent trenches, coral reefs, and wild tides.',
    true,
    88,
    ['WAVE', 'TIDE', 'REEF', 'DEEP', 'KELP', 'CRAB', 'FISH', 'SEAL', 'SWIM', 'BLUE'],
    ['OCEAN', 'WHALE', 'SHARK', 'CORAL', 'PEARL', 'SQUID', 'COAST', 'SHELL', 'DRIFT', 'WATER'],
    ['MARINE', 'LAGOON', 'SHRIMP', 'ISLAND', 'HARBOR', 'ANCHOR', 'LIQUID', 'SHADOW', 'SAILOR', 'TURTLE']
  ),
  cat(
    'animals-wildlife',
    'Wildlife & Safari',
    'Nature & Earth',
    'Savannah herds, elusive predators, and wild habitats.',
    false,
    83,
    ['LION', 'BEAR', 'WOLF', 'DEER', 'HARE', 'FROG', 'SEAL', 'GOAT', 'LYNX', 'HAWK'],
    ['TIGER', 'ZEBRA', 'MOOSE', 'HYENA', 'KOALA', 'OTTER', 'LLAMA', 'PANDA', 'BISON', 'CAMEL'],
    ['ANIMAL', 'JAGUAR', 'MONKEY', 'RABBIT', 'LIZARD', 'BADGER', 'FERRET', 'TURTLE', 'SALMON', 'WOLVES']
  ),
  cat(
    'birds-flight',
    'Birds & Raptors',
    'Nature & Earth',
    'Soaring wings, migration routes, and dawn songs.',
    false,
    76,
    ['BIRD', 'HAWK', 'CROW', 'DOVE', 'SWAN', 'DUCK', 'WREN', 'NEST', 'WING', 'BEAK'],
    ['EAGLE', 'ROBIN', 'HERON', 'RAVEN', 'FINCH', 'STORK', 'GOOSE', 'CRANE', 'SWIFT', 'MACAW'],
    ['FLIGHT', 'FALCON', 'TALONS', 'FOREST', 'BRANCH', 'SPRING', 'GARDEN', 'TURKEY', 'NESTED', 'SOARED']
  ),
  cat(
    'forest-woodland',
    'Forests & Timber',
    'Nature & Earth',
    'Ancient canopies, pine needles, and woodland trails.',
    false,
    75,
    ['TREE', 'WOOD', 'BARK', 'LEAF', 'MOSS', 'FERN', 'PINE', 'DEER', 'PATH', 'ROOT'],
    ['WOODS', 'CEDAR', 'MAPLE', 'SHADE', 'TRAIL', 'GROVE', 'ACORN', 'BIRCH', 'GREEN', 'QUIET'],
    ['FOREST', 'TIMBER', 'BRANCH', 'LEAVES', 'MEADOW', 'NATURE', 'VALLEY', 'WOODEN', 'CANOPY', 'AUTUMN']
  ),
  cat(
    'mountains-alpine',
    'Mountains & Peaks',
    'Nature & Earth',
    'Granite ridges, alpine passes, and crisp summit air.',
    false,
    77,
    ['PEAK', 'HILL', 'ROCK', 'HIKE', 'SNOW', 'COLD', 'MIST', 'VIEW', 'GOAT', 'PATH'],
    ['RIDGE', 'CLIFF', 'TRAIL', 'SLOPE', 'STONE', 'EAGLE', 'FROST', 'CLOUD', 'CLIMB', 'CREST'],
    ['ALPINE', 'SUMMIT', 'VALLEY', 'CANYON', 'HIKING', 'HEIGHT', 'FROZEN', 'BREEZE', 'WINTER', 'CAVERN']
  ),
  cat(
    'desert-dunes',
    'Deserts & Oasis',
    'Nature & Earth',
    'Wind-carved dunes, canyons, and star-filled desert skies.',
    false,
    74,
    ['SAND', 'DUNE', 'HEAT', 'WIND', 'ARID', 'DUST', 'PALM', 'HAWK', 'STAR', 'ROCK'],
    ['OASIS', 'CAMEL', 'SNAKE', 'SOLAR', 'GECKO', 'DUNES', 'STONE', 'GLARE', 'TRAIL', 'LIGHT'],
    ['DESERT', 'CACTUS', 'CANYON', 'MIRAGE', 'VALLEY', 'LIZARD', 'GOLDEN', 'SUNSET', 'SILENT', 'BARREN']
  ),
  cat(
    'arctic-tundra',
    'Arctic & Glaciers',
    'Nature & Earth',
    'Polar auroras, icebergs, and crisp northern stillness.',
    false,
    73,
    ['SNOW', 'COLD', 'GLOW', 'BEAR', 'SEAL', 'WOLF', 'WIND', 'PALE', 'DARK', 'MIST'],
    ['FROST', 'CHILL', 'NORTH', 'POLAR', 'WHALE', 'SLEET', 'WHITE', 'DRIFT', 'GLEAM', 'CLEAR'],
    ['ARCTIC', 'FROZEN', 'WINTER', 'AURORA', 'BRIGHT', 'SILENT', 'WOLVES', 'TUNDRA', 'SILVER', 'ICICLE']
  ),
  cat(
    'tropical-jungle',
    'Tropical Rainforest',
    'Nature & Earth',
    'Lush palms, monsoon showers, and vibrant biodiversity.',
    false,
    75,
    ['RAIN', 'PALM', 'VINE', 'FROG', 'LEAF', 'WARM', 'MIST', 'LUSH', 'FERN', 'TREE'],
    ['TIGER', 'MACAW', 'MANGO', 'COCOA', 'HUMID', 'SNAKE', 'GREEN', 'FLORA', 'RIVER', 'BLOOM'],
    ['JUNGLE', 'ORCHID', 'MONKEY', 'BANANA', 'JAGUAR', 'INSECT', 'FLOWER', 'LEAVES', 'BRANCH', 'NATURE']
  ),
  cat(
    'rivers-waterfalls',
    'Rivers & Lakes',
    'Nature & Earth',
    'Flowing currents, pebble banks, and calm reflections.',
    false,
    72,
    ['FLOW', 'BOAT', 'FISH', 'BANK', 'POND', 'LAKE', 'RAIN', 'SWIM', 'REED', 'DUCK'],
    ['RIVER', 'CREEK', 'BROOK', 'WATER', 'FLOAT', 'OTTER', 'TROUT', 'RAPID', 'CANOE', 'CLEAR'],
    ['STREAM', 'PEBBLE', 'PADDLE', 'SALMON', 'BRIDGE', 'VALLEY', 'MEADOW', 'LIQUID', 'SMOOTH', 'NATURE']
  ),
  cat(
    'volcanoes-earth',
    'Volcanoes & Tectonics',
    'Nature & Earth',
    'Molten magma, basalt ridges, and geothermal power.',
    false,
    73,
    ['LAVA', 'FIRE', 'HEAT', 'ROCK', 'RIFT', 'FUME', 'GLOW', 'CORE', 'DEEP', 'DUST'],
    ['MAGMA', 'ERUPT', 'SMOKE', 'STONE', 'CRUST', 'FAULT', 'FLAME', 'SPARK', 'EARTH', 'BLAST'],
    ['CRATER', 'ENERGY', 'MATTER', 'GROUND', 'ISLAND', 'MOLTEN', 'CANYON', 'CARBON', 'FIERCE', 'BRIGHT']
  ),
  cat(
    'pets-companions',
    'Pets & Companions',
    'Nature & Earth',
    'Loyal dogs, purring cats, and cozy home companions.',
    false,
    82,
    ['CATS', 'DOGS', 'PAWS', 'BARK', 'PURR', 'TAIL', 'PLAY', 'BONE', 'CAGE', 'HOME'],
    ['PUPPY', 'KITTY', 'TABBY', 'POOCH', 'HOUND', 'FETCH', 'LEASH', 'TREAT', 'LOYAL', 'HAPPY'],
    ['RABBIT', 'TURTLE', 'FERRET', 'ANIMAL', 'FRIEND', 'GENTLE', 'LIVELY', 'CARING', 'GARDEN', 'FAMILY']
  ),

  // === 8. TRAVEL, HISTORY & CLASSIC (11) ===
  cat(
    'general-classic',
    'General Vocabulary',
    'Travel & History',
    'Balanced everyday English words across all skill levels.',
    false,
    90,
    ['GAME', 'WORD', 'TIME', 'HAND', 'LIFE', 'WORK', 'HOME', 'PLAY', 'MIND', 'STAR'],
    ['CRANE', 'SLATE', 'AUDIO', 'HEART', 'HOUSE', 'STONE', 'LIGHT', 'WORLD', 'TRAIN', 'MUSIC'],
    ['PLANET', 'GARDEN', 'FRIEND', 'BRIDGE', 'SILVER', 'BRIGHT', 'PUZZLE', 'FUTURE', 'MARKET', 'NATURE']
  ),
  cat(
    'ancient-empires',
    'Ancient Civilizations',
    'Travel & History',
    'Pyramids, aqueducts, scrolls, and lost empires.',
    true,
    88,
    ['ROME', 'TOMB', 'GOLD', 'KING', 'ARMY', 'IRON', 'COIN', 'ARCH', 'CITY', 'SHIP'],
    ['STONE', 'CROWN', 'REIGN', 'SWORD', 'SPEAR', 'EGYPT', 'GREEK', 'FORUM', 'GUARD', 'NOBLE'],
    ['EMPIRE', 'TEMPLE', 'STATUE', 'CASTLE', 'THRONE', 'LEGACY', 'SENATE', 'SACRED', 'BRONZE', 'MARBLE']
  ),
  cat(
    'architecture',
    'Iconic Architecture',
    'Travel & History',
    'Skyscrapers, domes, arches, and spatial geometry.',
    true,
    85,
    ['ARCH', 'DOME', 'WALL', 'ROOF', 'HALL', 'BEAM', 'LINE', 'ROOM', 'DOOR', 'TILE'],
    ['TOWER', 'PLAZA', 'STONE', 'BRICK', 'GLASS', 'STEEL', 'SPIRE', 'VAULT', 'FLOOR', 'PORCH'],
    ['BRIDGE', 'PALACE', 'PILLAR', 'DESIGN', 'MODERN', 'MARBLE', 'COLUMN', 'WINDOW', 'CASTLE', 'MUSEUM']
  ),
  cat(
    'martial-arts',
    'Martial Arts & Honor',
    'Travel & History',
    'Discipline, dojo mastery, balance, and swift strikes.',
    true,
    86,
    ['BELT', 'KICK', 'FIST', 'BOWS', 'MIND', 'CALM', 'FAST', 'GRIP', 'MOVE', 'BOLD'],
    ['FIGHT', 'GUARD', 'BLOCK', 'FOCUS', 'AGILE', 'SWIFT', 'HONOR', 'POWER', 'TRAIN', 'SENSE'],
    ['STRIKE', 'STANCE', 'MASTER', 'SPIRIT', 'ACTIVE', 'STRONG', 'DEFEND', 'ATTACK', 'ENERGY', 'WINNER']
  ),
  cat(
    'travel-wanderlust',
    'World Travel & Cities',
    'Travel & History',
    'Passports, scenic trains, coastlines, and departures.',
    false,
    84,
    ['TRIP', 'ROAD', 'CITY', 'PORT', 'TOUR', 'MAPS', 'TAXI', 'TRAM', 'RAIL', 'STAY'],
    ['TRAIN', 'PLANE', 'HOTEL', 'COAST', 'BEACH', 'TRAIL', 'GUIDE', 'ROUTE', 'WORLD', 'FERRY'],
    ['TRAVEL', 'TICKET', 'ISLAND', 'HARBOR', 'RESORT', 'STREET', 'MUSEUM', 'AVENUE', 'HOSTEL', 'BORDER']
  ),
  cat(
    'olympic-sports',
    'Sports & Athletics',
    'Travel & History',
    'Gold medals, stadium sprints, and team triumphs.',
    false,
    80,
    ['GOAL', 'TEAM', 'RACE', 'SWIM', 'JUMP', 'PASS', 'BALL', 'GOLF', 'TIME', 'FAST'],
    ['SCORE', 'TRACK', 'FIELD', 'MEDAL', 'MATCH', 'COACH', 'ARENA', 'RUGBY', 'COURT', 'PRIZE'],
    ['RUNNER', 'SPRINT', 'TENNIS', 'SOCCER', 'TROPHY', 'WINNER', 'LEAGUE', 'MEDALS', 'PLAYER', 'RECORD']
  ),
  cat(
    'sailing-maritime',
    'Sailing & Maritime',
    'Travel & History',
    'Harbor bells, rigging, knots, and open-sea voyages.',
    false,
    74,
    ['SAIL', 'SHIP', 'BOAT', 'CREW', 'PORT', 'DOCK', 'PIER', 'KNOT', 'WAVE', 'WIND'],
    ['OCEAN', 'COAST', 'STERN', 'FLEET', 'CHART', 'WAVES', 'FERRY', 'SLOOP', 'WHARF', 'CABIN'],
    ['ANCHOR', 'HARBOR', 'VESSEL', 'SAILOR', 'ISLAND', 'MARINE', 'BREEZE', 'VOYAGE', 'GALLEY', 'LAGOON']
  ),
  cat(
    'aviation-flight',
    'Aviation & Flight',
    'Travel & History',
    'Runways, cockpits, cloud layers, and jetstreams.',
    false,
    76,
    ['WING', 'SOAR', 'WIND', 'TAIL', 'CREW', 'GATE', 'TRIP', 'HIGH', 'FAST', 'LAND'],
    ['PLANE', 'PILOT', 'RADAR', 'CLOUD', 'GLIDE', 'CABIN', 'TURBO', 'ROUTE', 'CRAFT', 'HOVER'],
    ['FLIGHT', 'RUNWAY', 'TICKET', 'TRAVEL', 'HEIGHT', 'ENGINE', 'DEPART', 'ARRIVE', 'SIGNAL', 'CLOUDS']
  ),
  cat(
    'medieval-knights',
    'Medieval & Castles',
    'Travel & History',
    'Stone fortresses, tournaments, and chivalrous codes.',
    false,
    78,
    ['KING', 'FORT', 'MOAT', 'WALL', 'IRON', 'GOLD', 'HELM', 'DUKE', 'OATH', 'HORN'],
    ['SWORD', 'ARMOR', 'JOUST', 'GUARD', 'CROWN', 'LANCE', 'TORCH', 'TOWER', 'STEED', 'NOBLE'],
    ['CASTLE', 'KNIGHT', 'SHIELD', 'THRONE', 'BATTLE', 'BANNER', 'PRINCE', 'HELMET', 'TAVERN', 'DRAGON']
  ),
  cat(
    'mythic-creatures',
    'Mythic Beasts',
    'Travel & History',
    'Dragons, phoenixes, sirens, and legendary beasts.',
    false,
    81,
    ['MYTH', 'WING', 'FIRE', 'CLAW', 'ROAR', 'FANG', 'TALE', 'LORE', 'MOON', 'WILD'],
    ['BEAST', 'SIREN', 'GIANT', 'GNOME', 'FAIRY', 'TROLL', 'FLAME', 'SCALE', 'MAGIC', 'GHOST'],
    ['DRAGON', 'SPIRIT', 'LEGEND', 'ORACLE', 'SHADOW', 'FIERCE', 'MYSTIC', 'WIZARD', 'SACRED', 'GOLDEN']
  ),
  cat(
    'colors-pigments',
    'Colors & Pigments',
    'Travel & History',
    'Rich hues, mineral shades, and chromatic palettes.',
    false,
    75,
    ['BLUE', 'GRAY', 'PINK', 'GOLD', 'RUBY', 'JADE', 'TEAL', 'ROSE', 'ROSY', 'PALE'],
    ['GREEN', 'BLACK', 'WHITE', 'BROWN', 'AMBER', 'CORAL', 'IVORY', 'OLIVE', 'LILAC', 'AZURE'],
    ['SILVER', 'ORANGE', 'YELLOW', 'VIOLET', 'PURPLE', 'MAROON', 'COBALT', 'BRONZE', 'GOLDEN', 'BRIGHT']
  ),
];

export const CATEGORY_MAP: Record<string, PuzzleCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

export function getCategoryById(id: string): PuzzleCategory {
  return CATEGORY_MAP[id] || CATEGORY_MAP['general-classic'];
}

export function getCategoryWords(categoryId: string, length: WordLength): string[] {
  const category = getCategoryById(categoryId);
  if (length === 4) return category.words4;
  if (length === 6) return category.words6;
  return category.words5;
}
