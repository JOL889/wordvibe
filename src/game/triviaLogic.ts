export type TriviaDifficulty =
  | 'novice'
  | 'beginner'
  | 'intermediate'
  | 'expert'
  | 'legendary'
  | 'easy'
  | 'medium'
  | 'hard';

export interface GroundingSourceLink {
  title: string;
  url: string;
}

export interface TriviaQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  funFact?: string;
  category: string;
  difficulty: TriviaDifficulty;
  personalizationReason?: string;
  groundingSources?: GroundingSourceLink[];
}

export function getTriviaDifficultyForStreak(streak: number, selectedLevel?: TriviaDifficulty): TriviaDifficulty {
  if (selectedLevel) return selectedLevel;
  if (streak >= 8) return 'legendary';
  if (streak >= 5) return 'expert';
  if (streak >= 3) return 'intermediate';
  if (streak >= 2) return 'beginner';
  return 'novice';
}

export function getStreakMultiplier(streak: number): number {
  const s = Math.max(0, Math.floor(streak));
  if (s >= 8) return 3;
  if (s >= 5) return 2.5;
  if (s >= 3) return 2;
  if (s >= 2) return 1.5;
  return 1;
}

export function calculateTriviaXp(difficulty: TriviaDifficulty, streakAfterAnswer: number): number {
  const base =
    difficulty === 'legendary'
      ? 150
      : difficulty === 'expert'
      ? 120
      : difficulty === 'intermediate'
      ? 80
      : difficulty === 'beginner'
      ? 50
      : 30;
  const mult = getStreakMultiplier(streakAfterAnswer);
  return Math.round(base * mult);
}

/**
 * Picks exact 2 wrong option indices (0..3) cleanly for 50-50 Eliminate.
 */
export function computeFiftyFiftyIndices(
  correctIndex: number,
  seedHint: number = Date.now()
): [number, number] {
  const wrongIndices = [0, 1, 2, 3].filter((idx) => idx !== correctIndex);
  const start = Math.abs(seedHint) % wrongIndices.length;
  const first = wrongIndices[start];
  const second = wrongIndices[(start + 1) % wrongIndices.length];
  return [first, second].sort((a, b) => a - b) as [number, number];
}

export interface TriviaCategorySpec {
  id: string;
  name: string;
  tagline: string;
  isBonusLocked: boolean;
}

export const TRIVIA_ROUND_LENGTH = 5;
export const TRIVIA_BONUS_UNLOCK_HOURS = 24;

export const TRIVIA_CATEGORIES: TriviaCategorySpec[] = [
  {
    id: 'for-you-local',
    name: 'For You · Personal Mix',
    tagline: 'Studied from your interests, local buzz & win pace',
    isBonusLocked: false,
  },
  {
    id: 'local-trending',
    name: 'Trending Near You',
    tagline: 'Live regional headlines, sports, culture & events',
    isBonusLocked: false,
  },
  {
    id: 'general-knowledge',
    name: 'General Knowledge',
    tagline: 'History, geography, arts & everyday wonders',
    isBonusLocked: false,
  },
  {
    id: 'science',
    name: 'Science & Cosmos',
    tagline: 'Physics, biology, tech breakthroughs & space',
    isBonusLocked: false,
  },
  {
    id: 'pop-culture',
    name: 'Pop Culture',
    tagline: 'Cinema, music hits, awards & viral moments',
    isBonusLocked: false,
  },
  {
    id: 'logic-riddles',
    name: 'Logic & Riddles',
    tagline: 'Lateral puzzles, wordplay & deductive twists',
    isBonusLocked: false,
  },
  {
    id: 'faith-study',
    name: 'Faith Study',
    tagline: 'Bible, Quran, Torah, Gita, Dharma & World Wisdom',
    isBonusLocked: false,
  },
  {
    id: 'surprise-me',
    name: 'Surprise Me',
    tagline: 'Dynamic mix tuned to your live win streak',
    isBonusLocked: false,
  },
  {
    id: 'mastermind-vault',
    name: 'Mastermind Vault',
    tagline: '24-hour elite bonus theme: deep curiosities & tough twists',
    isBonusLocked: true,
  },
];

export function getTriviaCategoryById(id: string): TriviaCategorySpec {
  return TRIVIA_CATEGORIES.find((c) => c.id === id) || TRIVIA_CATEGORIES[0];
}

export function isTriviaCategoryUnlocked(
  categoryId: string,
  unlockExpiryMap: Record<string, number>,
  nowMs: number = Date.now()
): boolean {
  const spec = getTriviaCategoryById(categoryId);
  if (!spec.isBonusLocked) return true;
  const expiresAt = unlockExpiryMap[spec.id] || 0;
  return expiresAt > nowMs;
}

export function getTriviaUnlockRemainingHours(
  categoryId: string,
  unlockExpiryMap: Record<string, number>,
  nowMs: number = Date.now()
): number {
  const expiresAt = unlockExpiryMap[categoryId] || 0;
  if (expiresAt <= nowMs) return 0;
  return Math.max(1, Math.ceil((expiresAt - nowMs) / (60 * 60 * 1000)));
}

export const LOCAL_FALLBACK_TRIVIA: Record<string, TriviaQuestion[]> = {
  'local-trending': [
    {
      question: 'Which mega-tournament is expanding to 48 national teams across 16 North American host cities in 2026?',
      options: ['FIFA World Cup', 'UEFA Euro', 'Rugby World Cup', 'Commonwealth Games'],
      correctIndex: 0,
      explanation: 'The 2026 FIFA World Cup spans cities across the United States, Canada, and Mexico with an expanded 48-nation bracket.',
      funFact: 'It marks the first World Cup hosted by three countries simultaneously and features 104 total matches.',
      category: 'Trending Near You',
      difficulty: 'easy',
    },
    {
      question: 'Which NASA lunar flight is slated to carry four astronauts around the far side of the Moon for the first time since Apollo 17?',
      options: ['Artemis II', 'Voyager III', 'Cassini-Huygens', 'Juno Prime'],
      correctIndex: 0,
      explanation: 'NASA’s Artemis II carries a four-person crew on a sweeping lunar flyby ahead of future surface landings.',
      funFact: 'Its free-return loop will carry astronauts farther from Earth than any human crew has ever traveled.',
      category: 'Trending Near You',
      difficulty: 'medium',
    },
    {
      question: 'Which global pledge committed nearly 200 nations to protect 30% of Earth’s land and oceans by 2030?',
      options: ['Kunming-Montreal Global Framework', 'Treaty of Tordesillas', 'Bretton Woods Accord', 'Dayton Agreement'],
      correctIndex: 0,
      explanation: 'Adopted at COP15, the Kunming-Montreal Framework anchors the global “30 by 30” conservation target.',
      funFact: 'That 30% ocean slice covers an area more than three times the size of Africa.',
      category: 'Trending Near You',
      difficulty: 'hard',
    },
  ],
  'general-knowledge': [
    {
      question: 'Which bustling metropolis lets you eat breakfast in Europe and catch a ferry for lunch in Asia—without leaving city limits?',
      options: ['Athens', 'Istanbul', 'Baku', 'Nicosia'],
      correctIndex: 1,
      explanation: 'Istanbul straddles the Bosphorus Strait, placing its western side in Europe and eastern side in Asia.',
      funFact: 'Commuters ride ferries and an undersea rail tunnel between two continents every morning.',
      category: 'General Knowledge',
      difficulty: 'easy',
    },
    {
      question: 'Which single letter of the English alphabet never shows up anywhere in the name of any of the 50 U.S. states?',
      options: ['X', 'Z', 'Q', 'J'],
      correctIndex: 2,
      explanation: 'Texas has X, Arizona has Z, and New Jersey has J—only Q sits out of all 50 state names.',
      funFact: 'The next rarest letter is J, showing up exclusively in New Jersey.',
      category: 'General Knowledge',
      difficulty: 'medium',
    },
    {
      question: 'Which legendary ancient library was run by Eratosthenes, the scholar who measured Earth’s size using two midday shadows?',
      options: ['Library of Ashurbanipal', 'Library of Alexandria', 'Library of Pergamum', 'Imperial Library of Constantinople'],
      correctIndex: 1,
      explanation: 'Eratosthenes served as chief librarian at Alexandria around 240 BCE and calculated Earth’s circumference within ~2%.',
      funFact: 'Legend says visiting ships docked in Alexandria had to hand over scrolls so scribes could copy them for the collection.',
      category: 'General Knowledge',
      difficulty: 'hard',
    },
    {
      question: 'Which Scandinavian neighbor shares the currency name “Krone” alongside Norway?',
      options: ['Finland', 'Denmark', 'Switzerland', 'Poland'],
      correctIndex: 1,
      explanation: 'Denmark and Norway both use currencies named krone (DKK and NOK), while Sweden uses krona.',
      funFact: 'In Danish and Norwegian, "krone" literally means "crown"—hence the royal motifs on the coins.',
      category: 'General Knowledge',
      difficulty: 'easy',
    },
    {
      question: 'Which surrealist artist dreamed up “The Persistence of Memory,” famous for pocket watches melting over tree branches?',
      options: ['Joan Miró', 'René Magritte', 'Salvador Dalí', 'Pablo Picasso'],
      correctIndex: 2,
      explanation: 'Spanish surrealist Salvador Dalí painted the dreamlike canvas in 1931 when he was just 26 years old.',
      funFact: 'The entire iconic masterpiece is surprisingly tiny—only about the size of a standard laptop screen (9.5 × 13 inches).',
      category: 'General Knowledge',
      difficulty: 'medium',
    },
  ],
  science: [
    {
      question: 'Which ice-giant planet essentially rolls sideways around the Sun at an extreme 98-degree tilt?',
      options: ['Neptune', 'Uranus', 'Saturn', 'Venus'],
      correctIndex: 1,
      explanation: 'Uranus has a dramatic 98-degree axial tilt, giving its poles 42 years of continuous sunlight followed by 42 years of darkness.',
      funFact: 'Uranus was the very first planet discovered with a telescope, spotted by William Herschel in 1781.',
      category: 'Science & Cosmos',
      difficulty: 'easy',
    },
    {
      question: 'Which shiny precious metal actually beats copper and gold as Earth’s top conductor of electricity?',
      options: ['Gold', 'Copper', 'Silver', 'Aluminum'],
      correctIndex: 2,
      explanation: 'Silver leads every element in electrical conductivity, though copper wins household wiring for cost and tarnish resistance.',
      funFact: 'Even small dashes of silver still appear inside high-end radio circuits and solar cell contacts.',
      category: 'Science & Cosmos',
      difficulty: 'medium',
    },
    {
      question: 'In quantum computing, what mind-bending effect lets a qubit blend 0 and 1 together before anyone checks it?',
      options: ['Superposition', 'Thermal Annealing', 'Refraction', 'Magnetic Hysteresis'],
      correctIndex: 0,
      explanation: 'Superposition allows a quantum bit to exist as a weighted combination of states until measured.',
      funFact: 'Adding just one extra qubit doubles the number of combined states a quantum processor can represent.',
      category: 'Science & Cosmos',
      difficulty: 'hard',
    },
    {
      question: 'If the Sun flickered out right now, how long would it take that news to reach your eyes across 150 million km?',
      options: ['8 seconds', '8 minutes 20 seconds', '45 minutes', '2 hours'],
      correctIndex: 1,
      explanation: 'Traveling at ~300,000 km/s, sunlight takes roughly 8 minutes and 20 seconds to cross space to Earth.',
      funFact: 'Before escaping the Sun’s dense core, though, a newborn photon can spend over 100,000 years bouncing around inside!',
      category: 'Science & Cosmos',
      difficulty: 'easy',
    },
    {
      question: 'Which famous “powerhouse” organelle carries its own tiny loop of DNA completely separate from the cell nucleus?',
      options: ['Golgi Apparatus', 'Ribosome', 'Mitochondrion', 'Lysosome'],
      correctIndex: 2,
      explanation: 'Mitochondria preserve their own circular genome—evidence they began billions of years ago as free-living bacteria.',
      funFact: 'Humans inherit mitochondrial DNA almost exclusively from their mothers.',
      category: 'Science & Cosmos',
      difficulty: 'medium',
    },
  ],
  'pop-culture': [
    {
      question: 'Which razor-sharp 2019 South Korean thriller made Oscars history as the first non-English-language Best Picture winner?',
      options: ['Minari', 'Parasite', 'Oldboy', 'Decision to Leave'],
      correctIndex: 1,
      explanation: 'Bong Joon-ho’s “Parasite” swept four Academy Awards at the 92nd Oscars, including Best Picture and Director.',
      funFact: 'Bong Joon-ho famously told the audience he was going to drink until next morning after winning Best International Feature.',
      category: 'Pop Culture',
      difficulty: 'easy',
    },
    {
      question: 'Which pop superstar surprised fans in 2020 with indie-folk sister albums “Folklore” and “Evermore” five months apart?',
      options: ['Billie Eilish', 'Taylor Swift', 'Lana Del Rey', 'Olivia Rodrigo'],
      correctIndex: 1,
      explanation: 'Taylor Swift dropped “Folklore” in July 2020 with less than 24 hours’ notice and followed with “Evermore” in December.',
      funFact: 'She collaborated remotely with Aaron Dessner of The National during lockdown to write much of both records.',
      category: 'Pop Culture',
      difficulty: 'easy',
    },
    {
      question: 'In HBO’s Emmy-winning hit “Succession,” what is the name of the Roy family’s sprawling media empire?',
      options: ['Pierce Global', 'Waystar Royco', 'Pierce-Roy Media', 'Starbright Corp'],
      correctIndex: 1,
      explanation: 'Logan Roy built Waystar Royco from local print and parks into a global media titan.',
      funFact: 'Composer Nicholas Britell blended classical strings with hip-hop 808 beats for the iconic opening theme.',
      category: 'Pop Culture',
      difficulty: 'medium',
    },
    {
      question: 'Which Hollywood composer recorded a thunderous 19th-century London church pipe organ for “Interstellar” and later scored “Dune”?',
      options: ['Ludwig Göransson', 'Hans Zimmer', 'Alexandre Desplat', 'Michael Giacchino'],
      correctIndex: 1,
      explanation: 'Hans Zimmer tracked a massive pipe organ inside Temple Church for “Interstellar” and won his second Oscar for “Dune.”',
      funFact: 'For “Dune,” Zimmer invented new hybrid wind instruments because he wanted sounds from another world.',
      category: 'Pop Culture',
      difficulty: 'medium',
    },
    {
      question: 'Which Studio Ghibli classic ruled as Japan’s top-grossing film ever for nearly 20 years—starting with a bathhouse for spirits?',
      options: ['Princess Mononoke', 'Howl’s Moving Castle', 'Spirited Away', 'My Neighbor Totoro'],
      correctIndex: 2,
      explanation: 'Hayao Miyazaki’s 2001 masterpiece “Spirited Away” also took home the Oscar for Best Animated Feature.',
      funFact: 'Miyazaki wrote the story without a traditional finished script, letting animators discover the plot alongside him.',
      category: 'Pop Culture',
      difficulty: 'hard',
    },
  ],
  'logic-riddles': [
    {
      question: 'An analog clock reads exactly 3:15. What is the narrow angle hiding between the hour hand and minute hand?',
      options: ['0 degrees', '7.5 degrees', '15 degrees', '22.5 degrees'],
      correctIndex: 1,
      explanation: 'At 3:15, the minute hand sits squarely at 90°, while the hour hand has crept one-fourth past 3 to 97.5°—leaving 7.5°.',
      funFact: 'Clock hands line up in a straight zero-degree overlap 11 times every 12 hours, not 12!',
      category: 'Logic & Riddles',
      difficulty: 'hard',
    },
    {
      question: 'Which everyday 5-letter word actually gets “shorter” the moment you tack two extra letters onto the end?',
      options: ['Brief', 'Small', 'Short', 'Quick'],
      correctIndex: 2,
      explanation: 'Add “-er” to “Short” and it magically turns into “Shorter”!',
      funFact: 'Linguists call playful spelling quirks like this wordplay cousins of “heterological” riddles.',
      category: 'Logic & Riddles',
      difficulty: 'easy',
    },
    {
      question: 'If 5 bakery ovens bake 5 loaves in 5 minutes flat, how long do 100 ovens need to bake 100 loaves at the same time?',
      options: ['100 minutes', '20 minutes', '5 minutes', '1 minute'],
      correctIndex: 2,
      explanation: 'Each oven takes 5 minutes per loaf, so 100 ovens baking in parallel finish all 100 loaves in 5 minutes.',
      funFact: 'Cognitive psychologists use this classic question—from Shane Frederick’s CRT test—to spot fast intuition vs. slow checks.',
      category: 'Logic & Riddles',
      difficulty: 'medium',
    },
    {
      question: 'In a marathon sprint, you surge past the runner holding 2nd place just steps before the tape. What spot are you in now?',
      options: ['1st place', '2nd place', '3rd place', 'Tied for 1st'],
      correctIndex: 1,
      explanation: 'Passing the person in 2nd place puts you in 2nd place—the 1st-place leader is still ahead!',
      funFact: 'Our brains love shortcuts, often jumping straight to "winner!" whenever we hear the word "overtake."',
      category: 'Logic & Riddles',
      difficulty: 'easy',
    },
    {
      question: 'Spot the hidden pattern and pick the missing number: 2, 6, 12, 20, 30, ___',
      options: ['38', '40', '42', '44'],
      correctIndex: 2,
      explanation: 'Each step follows n × (n + 1): 1×2=2, 2×3=6, 3×4=12, 4×5=20, 5×6=30, so 6×7 = 42.',
      funFact: 'Numbers of the form n(n+1) are called "pronic numbers" because they always form neat near-square rectangles.',
      category: 'Logic & Riddles',
      difficulty: 'medium',
    },
  ],
  'faith-study': [
    {
      question: 'Which ethical teaching—“Treat others as you wish to be treated”—is shared across Christianity, Islam, Judaism, Hinduism, and Buddhism?',
      options: ['The Golden Rule', 'The Silver Maxim', 'The Iron Law', 'The Brass Compass'],
      correctIndex: 0,
      explanation: 'Virtually every major world religion teaches a variation of the Golden Rule as the bedrock of neighborly kindness.',
      funFact: 'In the Talmud, Rabbi Hillel famously summed up the whole Torah while standing on one foot using a version of this rule.',
      category: 'Faith Study',
      difficulty: 'easy',
    },
    {
      question: 'Which vibrant five-day autumn festival is celebrated around the world with rows of clay oil lamps as the “Festival of Lights”?',
      options: ['Passover', 'Diwali', 'Vesak', 'Eid al-Fitr'],
      correctIndex: 1,
      explanation: 'Diwali (from Sanskrit "Deepavali," meaning row of lamps) celebrates light overcoming darkness and new beginnings.',
      funFact: 'Many homes craft intricate colored-rice or flower-petal patterns called Rangoli right at the front doorway.',
      category: 'Faith Study',
      difficulty: 'easy',
    },
    {
      question: 'Which phrase—meaning “In the name of God, the Most Gracious, the Most Merciful”—opens 113 of the 114 chapters of the Quran?',
      options: ['Inshallah', 'Bismillah ir-Rahman ir-Rahim', 'Salaam', 'SubhanAllah'],
      correctIndex: 1,
      explanation: 'Every Surah except Surah At-Tawbah opens with the Bismillah invocation of mercy and grace.',
      funFact: 'Traditional Islamic calligraphy turns this opening line into shapes ranging from birds to sweeping geometric domes.',
      category: 'Faith Study',
      difficulty: 'medium',
    },
    {
      question: 'In Christian Scripture, which three enduring virtues are linked in 1 Corinthians 13, naming love “the greatest of these”?',
      options: ['Hope, patience, joy', 'Faith, hope, love', 'Mercy, honor, truth', 'Grace, peace, courage'],
      correctIndex: 1,
      explanation: 'Paul writes: "And now these three remain: faith, hope and love. But the greatest of these is love."',
      funFact: 'This passage is among the most widely read readings at weddings and community dedications worldwide.',
      category: 'Faith Study',
      difficulty: 'easy',
    },
    {
      question: 'On the Buddhist Dharma Wheel (Dharmachakra), what do the eight spokes traditionally represent?',
      options: ['Eight lunar phases', 'The Noble Eightfold Path', 'Eight mountains', 'Eight seasons'],
      correctIndex: 1,
      explanation: 'The eight spokes symbolize the Noble Eightfold Path of wisdom, ethical living, and mindful awareness.',
      funFact: 'India’s national flag features a 24-spoke Ashoka Chakra inspired by ancient Buddhist stone pillars.',
      category: 'Faith Study',
      difficulty: 'medium',
    },
  ],
  'mastermind-vault': [
    {
      question: 'Beside the humble tetrahedron, what is the only known polyhedron where every vertex connects directly to every other vertex without internal diagonals?',
      options: ['Octahedron', 'Császár polyhedron', 'Icosahedron', 'Dodecahedron'],
      correctIndex: 1,
      explanation: 'Discovered by Ákos Császár in 1949, this donut-shaped 7-vertex polyhedron leaves zero unused diagonals.',
      funFact: 'Its 14 triangular faces fold into a ring with a tunnel straight through the middle!',
      category: 'Mastermind Vault',
      difficulty: 'hard',
    },
    {
      question: 'Which British composer hid an unplayed “ghost melody” inside his 1899 “Enigma Variations,” challenging listeners for over a century?',
      options: ['Edward Elgar', 'Gustav Holst', 'Ralph Vaughan Williams', 'Benjamin Britten'],
      correctIndex: 0,
      explanation: 'Sir Edward Elgar dedicated each variation to a friend while insisting a secret well-known tune fit silently over the theme.',
      funFact: 'Even after 125+ years of sleuthing by musicians and cryptographers, Elgar’s hidden tune remains officially unsolved.',
      category: 'Mastermind Vault',
      difficulty: 'hard',
    },
    {
      question: 'In book typography, what tiny decorative stroke at the tips of letters takes its name from an old Dutch word for a pen stroke?',
      options: ['Ligature', 'Serif', 'Descender', 'Kerning'],
      correctIndex: 1,
      explanation: '“Serif” traces to Dutch “schreef,” meaning a crisp stroke or line drawn by a scribe’s pen.',
      funFact: 'Roman stone carvers originally added tiny flares at the ends of carved letters to keep the chisel from splitting the marble.',
      category: 'Mastermind Vault',
      difficulty: 'medium',
    },
    {
      question: 'Which mathematical theorem guarantees that no matter how carefully you stir your morning coffee, at least one molecule ends up right where it started?',
      options: ['Fermat’s Little Theorem', 'Brouwer Fixed-Point Theorem', 'Bayes’ Theorem', 'Gauss-Bonnet Theorem'],
      correctIndex: 1,
      explanation: 'Proved by L.E.J. Brouwer in 1911, any continuous map of a closed disk onto itself leaves at least one point unmoved.',
      funFact: 'It also means if you crumple a map of your city and drop it anywhere inside city limits, one dot sits directly above its real spot!',
      category: 'Mastermind Vault',
      difficulty: 'hard',
    },
  ],
};

export function pickFallbackTriviaQuestion(
  categoryId: string,
  difficulty: TriviaDifficulty,
  seenQuestions: string[],
  context?: {
    locationLabel?: string;
    interests?: string[];
  }
): TriviaQuestion {
  const seenSet = new Set(seenQuestions.map((q) => q.trim().toLowerCase()));
  const pool =
    categoryId === 'surprise-me' || categoryId === 'for-you-local'
      ? [
          ...LOCAL_FALLBACK_TRIVIA['local-trending'],
          ...LOCAL_FALLBACK_TRIVIA['general-knowledge'],
          ...LOCAL_FALLBACK_TRIVIA['science'],
          ...LOCAL_FALLBACK_TRIVIA['pop-culture'],
          ...LOCAL_FALLBACK_TRIVIA['logic-riddles'],
          ...LOCAL_FALLBACK_TRIVIA['faith-study'],
        ]
      : LOCAL_FALLBACK_TRIVIA[categoryId] || LOCAL_FALLBACK_TRIVIA['general-knowledge'];

  const unseen = pool.filter((q) => !seenSet.has(q.question.trim().toLowerCase()));
  const candidates = unseen.length > 0 ? unseen : pool;

  const exactDiff = candidates.filter((q) => q.difficulty === difficulty);
  const picked =
    exactDiff.length > 0
      ? exactDiff[Math.floor(Math.random() * exactDiff.length)]
      : candidates[Math.floor(Math.random() * candidates.length)];

  let personalizationReason: string | undefined;
  if (categoryId === 'for-you-local') {
    const interestNote = context?.interests?.length ? context.interests.slice(0, 2).join(' & ') : 'Your Mix';
    personalizationReason = context?.locationLabel
      ? `Tuned for ${context.locationLabel} · ${interestNote}`
      : `Tuned for your profile · ${interestNote}`;
  } else if (categoryId === 'local-trending' || context?.locationLabel) {
    personalizationReason = context?.locationLabel
      ? `Curated regional highlight for ${context.locationLabel}`
      : 'Regional Trending Highlight';
  }

  return personalizationReason
    ? {
        ...picked,
        personalizationReason,
      }
    : picked;
}
