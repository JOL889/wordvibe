import { VALID_WORDS, type WordLength } from '../data/words';
import type { TriviaDifficulty, TriviaQuestion } from './triviaLogic';

export type ReligionId =
  | 'christianity'
  | 'islam'
  | 'judaism'
  | 'hinduism'
  | 'buddhism'
  | 'spirituality';

export interface FaithPassage {
  id: string;
  quote: string;
  reference: string;
  reflection: string;
}

export interface FaithWordEntry {
  word: string;
  length: WordLength;
  clue: string;
  funFact: string;
}

export interface FaithTraditionProfile {
  id: ReligionId;
  name: string;
  shortLabel: string;
  sacredTextLabel: string;
  tagline: string;
  accentHex: string;
  passages: FaithPassage[];
  words: FaithWordEntry[];
  trivia: TriviaQuestion[];
}

export const RELIGION_IDS: ReligionId[] = [
  'christianity',
  'islam',
  'judaism',
  'hinduism',
  'buddhism',
  'spirituality',
];

export const FAITH_TRADITIONS: Record<ReligionId, FaithTraditionProfile> = {
  christianity: {
    id: 'christianity',
    name: 'Christianity',
    shortLabel: 'Bible',
    sacredTextLabel: 'Holy Bible',
    tagline: 'Scripture quizzes, parables, and timeless biblical wisdom',
    accentHex: '#10B981',
    passages: [
      {
        id: 'chr-1',
        quote: 'Let all that you do be done in love.',
        reference: '1 Corinthians 16:14',
        reflection: 'A crisp reminder that kindness turns ordinary moments into meaningful service.',
      },
      {
        id: 'chr-2',
        quote: 'Thy word is a lamp unto my feet, and a light unto my path.',
        reference: 'Psalm 119:105',
        reflection: 'Even one clear step ahead is enough when navigating a tough week.',
      },
      {
        id: 'chr-3',
        quote: 'Faith is the substance of things hoped for, the evidence of things not seen.',
        reference: 'Hebrews 11:1',
        reflection: 'Confidence and steady patience often outlast short-term noise.',
      },
      {
        id: 'chr-4',
        quote: 'Blessed are the peacemakers: for they shall be called the children of God.',
        reference: 'Matthew 5:9',
        reflection: 'Building bridges takes courage and calm clarity.',
      },
    ],
    words: [
      {
        word: 'HOPE',
        length: 4,
        clue: 'One of the famous trio alongside faith and love that keeps spirits bright.',
        funFact: 'The Greek word "elpis" used in 1 Corinthians 13 describes confident expectation rather than wishful thinking.',
      },
      {
        word: 'PRAY',
        length: 4,
        clue: 'Quietly lift up gratitude, guidance, or hope in a moment of reflection.',
        funFact: 'The English verb comes from Latin "precari," meaning to ask earnestly or entreat.',
      },
      {
        word: 'HYMN',
        length: 4,
        clue: 'A joyful congregation song echoed from ancient psalms to Sunday choirs.',
        funFact: 'Some of the earliest surviving Christian sheet music includes a 3rd-century Greek hymn found at Oxyrhynchus.',
      },
      {
        word: 'FAITH',
        length: 5,
        clue: 'Trusting the road ahead before every step is visible—central to Hebrews 11.',
        funFact: 'In the New Testament, "pistis" carries the sense of both deep trust and loyal faithfulness.',
      },
      {
        word: 'GRACE',
        length: 5,
        clue: 'Unmerited kindness and favor celebrated in classic hymns and letters of Paul.',
        funFact: 'John Newton wrote "Amazing Grace" in 1772 after surviving a fierce Atlantic storm.',
      },
      {
        word: 'PSALM',
        length: 5,
        clue: 'One of 150 poetic songs and prayers tucked right in the heart of Scripture.',
        funFact: 'Psalm 119 is the longest chapter in the Bible—an acrostic poem with 176 verses following the Hebrew alphabet.',
      },
      {
        word: 'MERCY',
        length: 5,
        clue: 'Choosing compassion over payback—a core theme of the Good Samaritan parable.',
        funFact: 'Many ancient biblical blessings pair mercy and peace together as twin pillars of community life.',
      },
      {
        word: 'CROSS',
        length: 5,
        clue: 'The iconic emblem atop church steeples representing sacrifice and renewal.',
        funFact: 'Early Christians also used the anchor and the fish (Ichthys) as discreet symbols of faith.',
      },
      {
        word: 'GOSPEL',
        length: 6,
        clue: 'Literally meaning "good news," shared across four foundational books.',
        funFact: 'The word descends from Old English "god-spel," translating the Greek "euangelion."',
      },
      {
        word: 'PRAYER',
        length: 6,
        clue: 'Daily conversation with God, whether whispered in stillness or spoken together.',
        funFact: 'The Lord’s Prayer in Matthew 6 runs just 66 words in traditional English yet summarizes worship, provision, and forgiveness.',
      },
      {
        word: 'PARISH',
        length: 6,
        clue: 'A local church neighborhood caring for families right around the corner.',
        funFact: 'It traces back to Greek "paroikia," meaning dwelling beside one’s neighbors.',
      },
    ],
    trivia: [
      {
        question: 'In the Gospel of Luke, which familiar story features travelers helped by an unexpected stranger on the road to Jericho?',
        options: ['The Good Samaritan', 'The Mustard Seed', 'The Ten Talents', 'The Lost Coin'],
        correctIndex: 0,
        explanation: 'A Samaritan pauses to bandage, transport, and pay for the care of an injured traveler when others walked past.',
        funFact: 'In ancient Judea, Samaritans and Judeans rarely mixed—making the hero’s compassion even more striking to first listeners.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'Which poetic Old Testament book contains 150 sacred songs—including "The Lord is my shepherd"?',
        options: ['Proverbs', 'Psalms', 'Ecclesiastes', 'Isaiah'],
        correctIndex: 1,
        explanation: 'Psalm 23 opens with the famous shepherd imagery and remains one of the most memorized chapters worldwide.',
        funFact: 'Nearly half of the Psalms are attributed to King David, a skilled harpist in his youth.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'Which city was the Apostle Paul traveling toward when a sudden bright light changed the course of his life?',
        options: ['Damascus', 'Corinth', 'Ephesus', 'Athens'],
        correctIndex: 0,
        explanation: 'Recorded in Acts 9, Paul’s dramatic encounter on the road to Damascus turned a skeptic into a tireless missionary.',
        funFact: 'Damascus’s "Street Called Straight" mentioned in Acts still runs east-to-west through the old city today.',
        category: 'Faith Study',
        difficulty: 'medium',
      },
      {
        question: 'Which three virtues are linked together at the end of 1 Corinthians 13—with one called "the greatest of these"?',
        options: ['Wisdom, strength, honor', 'Faith, hope, love', 'Peace, patience, joy', 'Grace, mercy, truth'],
        correctIndex: 1,
        explanation: 'Paul concludes his famous chapter on love by highlighting faith, hope, and love—naming love the greatest.',
        funFact: 'Earlier English translations rendered "love" as "charity" from the Latin "caritas," meaning selfless care.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'In the Sermon on the Mount, where did Jesus say a city built to shine cannot be hidden?',
        options: ['Inside a valley', 'Beside a harbor', 'On a hill', 'Behind a wall'],
        correctIndex: 2,
        explanation: 'Matthew 5:14 uses the vivid image of "a city set on a hill" alongside a lamp placed on a stand.',
        funFact: 'Hilltop towns in Galilee like Safed were visible for miles at night from their oil-lamp glow.',
        category: 'Faith Study',
        difficulty: 'medium',
      },
    ],
  },

  islam: {
    id: 'islam',
    name: 'Islam',
    shortLabel: 'Quran',
    sacredTextLabel: 'Holy Quran',
    tagline: 'Quranic verses, Hadith wisdom, prophets, and Islamic heritage',
    accentHex: '#059669',
    passages: [
      {
        id: 'isl-1',
        quote: 'Verily, with hardship comes ease.',
        reference: 'Quran 94:6',
        reflection: 'Difficult seasons never arrive alone—relief and growth are woven right beside them.',
      },
      {
        id: 'isl-2',
        quote: 'Speak good to people.',
        reference: 'Quran 2:83',
        reflection: 'Gentle, truthful words carry lasting weight in every community.',
      },
      {
        id: 'isl-3',
        quote: 'And He found you lost and guided you.',
        reference: 'Quran 93:7',
        reflection: 'Gratitude for quiet guidance brings steadiness to busy days.',
      },
      {
        id: 'isl-4',
        quote: 'The best among you are those who have the best manners and character.',
        reference: 'Sahih al-Bukhari 3559',
        reflection: 'Everyday patience, courtesy, and integrity shine brighter than status.',
      },
    ],
    words: [
      {
        word: 'ALMS',
        length: 4,
        clue: 'Generous giving to neighbors in need—echoed by Zakat, a pillar of faith.',
        funFact: 'Zakat comes from an Arabic root meaning both "purification" and "growth."',
      },
      {
        word: 'FAST',
        length: 4,
        clue: 'Dawn-to-sunset mindful restraint practiced throughout the month of Ramadan.',
        funFact: 'Sawm during Ramadan encourages empathy, self-discipline, and gratitude at sunset Iftar meals.',
      },
      {
        word: 'MOON',
        length: 4,
        clue: 'Its slender crescent marks the start of Ramadan and joyful Eid celebrations.',
        funFact: 'The Islamic Hijri calendar follows pure 12-month lunar cycles of 354 or 355 days.',
      },
      {
        word: 'PEACE',
        length: 5,
        clue: 'The warm greeting "As-salamu alaykum" wishes this blessing upon everyone you meet.',
        funFact: 'Al-Salam ("The Source of Peace") is one of the cherished 99 Beautiful Names in Islamic tradition.',
      },
      {
        word: 'MERCY',
        length: 5,
        clue: 'Every chapter of the Quran except one opens by invoking this boundless compassion.',
        funFact: '"Bismillah ir-Rahman ir-Rahim" highlights two distinct Arabic intensities of mercy.',
      },
      {
        word: 'LIGHT',
        length: 5,
        clue: 'Title of Surah An-Nur (Chapter 24), symbolizing clarity and spiritual guidance.',
        funFact: 'Quran 24:35 contains the poetic "Verse of Light" that inspired centuries of geometric mosque lamps.',
      },
      {
        word: 'HEART',
        length: 5,
        clue: 'In Quran 13:28, remembrance brings calm tranquility directly to this inner core.',
        funFact: 'Arabic poetry and spiritual ethics call a serene, sincere inner self "Qalb Salim" (a sound heart).',
      },
      {
        word: 'HONOR',
        length: 5,
        clue: 'Treating parents, guests, and neighbors with steadfast dignity and care.',
        funFact: 'Hospitality ("Ikram al-Dayf") is celebrated in Hadith as a hallmark of true character.',
      },
      {
        word: 'PRAYER',
        length: 6,
        clue: 'Five daily moments of pause, gratitude, and quiet alignment (Salah).',
        funFact: 'The five daily prayers span dawn (Fajr) through nightfall (Isha), anchoring the rhythm of the day.',
      },
      {
        word: 'SACRED',
        length: 6,
        clue: 'Describes Masjid al-Haram in Mecca and spaces set apart for devotion.',
        funFact: 'Al-Haram denotes sanctuary—where peace, focus, and reverence guide every visitor.',
      },
      {
        word: 'HUMBLE',
        length: 6,
        clue: 'Quran 25:63 praises faithful people who walk softly across the Earth with this grace.',
        funFact: 'In Arabic spiritual literature, "Tawadu" (humility) is paired with strength rather than weakness.',
      },
    ],
    trivia: [
      {
        question: 'Which phrase opens 113 of the 114 Surahs (chapters) of the Holy Quran?',
        options: ['Alhamdulillah', 'Bismillah ir-Rahman ir-Rahim', 'SubhanAllah', 'Allahu Akbar'],
        correctIndex: 1,
        explanation: 'Every Surah except Surah At-Tawbah begins with "In the name of God, the Most Gracious, the Most Merciful."',
        funFact: 'Calligraphers around the world have crafted thousands of artistic styles specifically for the Bismillah opening.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'What is the Arabic term for the sunset meal when families and friends break their Ramadan fast together?',
        options: ['Suhoor', 'Iftar', 'Tawaf', 'Qibla'],
        correctIndex: 1,
        explanation: 'Iftar happens at Maghrib (sunset), traditionally starting with dates and water before sharing dinner.',
        funFact: 'UNESCO inscribed community Iftar traditions on its Intangible Cultural Heritage list in 2023.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'Which iconic medieval center of learning in Baghdad helped preserve and expand astronomy, medicine, and algebra?',
        options: ['House of Wisdom', 'Hall of Mirrors', 'Observatory of Cairo', 'Cordoba Mint'],
        correctIndex: 0,
        explanation: 'Bayt al-Hikmah (the House of Wisdom) drew scholars like Al-Khwarizmi, whose name inspired the word "algorithm."',
        funFact: 'The English word "algebra" comes directly from "al-jabr" in Al-Khwarizmi’s 9th-century treatise.',
        category: 'Faith Study',
        difficulty: 'medium',
      },
      {
        question: 'In Islamic tradition, which Pillar encourages giving a portion of annual savings to support those in need?',
        options: ['Hajj', 'Zakat', 'Shahada', 'Sawm'],
        correctIndex: 1,
        explanation: 'Zakat is charitable almsgiving designed to uplift community welfare and circulate generosity.',
        funFact: 'Historically, Zakat funded neighborhood travelers’ lodges, scholarships, and medical care.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'Which prophet’s devotion and patience are commemorated during Eid al-Adha?',
        options: ['Prophet Ibrahim', 'Prophet Yunus', 'Prophet Sulayman', 'Prophet Idris'],
        correctIndex: 0,
        explanation: 'Eid al-Adha honors Prophet Ibrahim’s steadfast trust and ends the annual Hajj season with shared charity.',
        funFact: 'Festive meals during Eid al-Adha are traditionally divided into three shares: family, friends, and neighbors in need.',
        category: 'Faith Study',
        difficulty: 'medium',
      },
    ],
  },

  judaism: {
    id: 'judaism',
    name: 'Judaism',
    shortLabel: 'Torah',
    sacredTextLabel: 'Torah & Wisdom',
    tagline: 'Torah insights, Hebrew terms, festivals, and heritage trivia',
    accentHex: '#2563EB',
    passages: [
      {
        id: 'jud-1',
        quote: 'Justice, justice shall you pursue.',
        reference: 'Deuteronomy 16:20',
        reflection: 'The double call for justice reminds us that both the goal and the fairness of how we reach it matter.',
      },
      {
        id: 'jud-2',
        quote: 'Who is wise? One who learns from every person.',
        reference: 'Pirkei Avot 4:1',
        reflection: 'Curiosity keeps humility alive and turns any conversation into an education.',
      },
      {
        id: 'jud-3',
        quote: 'If I am not for myself, who will be for me? Yet if I am only for myself, what am I?',
        reference: 'Pirkei Avot 1:14',
        reflection: 'Hillel’s timeless question balances healthy self-respect with community care.',
      },
    ],
    words: [
      {
        word: 'STAR',
        length: 4,
        clue: 'Six-pointed symbol of David representing harmony and heritage.',
        funFact: 'Known as "Magen David" (Shield of David), the six-pointed star appears on synagogues and ancient seals.',
      },
      {
        word: 'SOUL',
        length: 4,
        clue: 'Known as "Neshamah" in Hebrew—sharing the same root as breath.',
        funFact: 'Morning blessings begin by thanking God for returning the breath and soul gently each sunrise.',
      },
      {
        word: 'BOOK',
        length: 4,
        clue: 'Why Jewish tradition has long been called the "People of the ____."',
        funFact: 'Before printed pages, sacred Torah scrolls were handwritten letter-by-letter on parchment by a trained scribe (Sofer).',
      },
      {
        word: 'PEACE',
        length: 5,
        clue: '"Shalom"—used for hello, goodbye, and wholeness in daily Hebrew.',
        funFact: 'Shalom shares its root with "shalem," meaning complete, unharmed, and at peace.',
      },
      {
        word: 'LIGHT',
        length: 5,
        clue: 'Kindled across eight evenings of Hanukkah and every Friday Shabbat sunset.',
        funFact: 'A Hanukkah menorah (hanukkiah) holds nine branches—eight for the nights plus one "shamash" helper candle.',
      },
      {
        word: 'RABBI',
        length: 5,
        clue: 'A Jewish teacher and scholar whose title literally means "my teacher."',
        funFact: 'Rabbinic discussion thrives on lively questioning—Talmud pages preserve debates from centuries ago side by side.',
      },
      {
        word: 'BREAD',
        length: 5,
        clue: 'Braided golden loaves of challah grace the table each Shabbat evening.',
        funFact: 'Two loaves are placed on the table to remember the double portion of manna gathered before Shabbat.',
      },
      {
        word: 'TRUTH',
        length: 5,
        clue: 'Hebrew "Emet"—spelled with the first, middle, and last letters of the alphabet.',
        funFact: 'The Talmud notes that Emet stands solidly on two feet per letter, symbolizing endurance from start to finish.',
      },
      {
        word: 'CANDLE',
        length: 6,
        clue: 'Warm twin flames lit right before sundown to welcome peaceful Shabbat rest.',
        funFact: 'Traditional Shabbat blessings mark the shift from weekday rush into quiet family time.',
      },
      {
        word: 'TEMPLE',
        length: 6,
        clue: 'Ancient Jerusalem sanctuary whose Western Wall remains a place of prayer today.',
        funFact: 'The name "Mount Moriah" connects both ancient Jerusalem architecture and centuries of pilgrimage.',
      },
    ],
    trivia: [
      {
        question: 'What is the Hebrew phrase "Tikkun Olam"—often heard in community service—best translated as?',
        options: ['Singing a psalm', 'Repairing the world', 'Lighting the lamp', 'Crossing the river'],
        correctIndex: 1,
        explanation: 'Tikkun Olam means repairing or healing the world through acts of fairness, charity, and stewardship.',
        funFact: 'The phrase appears in the Mishnah and grew into a guiding motto for modern social responsibility.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'Which joyous holiday uses a four-sided spinning top marked with Hebrew letters celebrating a great miracle?',
        options: ['Passover', 'Hanukkah', 'Sukkot', 'Purim'],
        correctIndex: 1,
        explanation: 'The dreidel bears Nun, Gimel, Hey, and Shin—"A great miracle happened there"—spun during Hanukkah.',
        funFact: 'In Israel, the fourth letter is Pey instead of Shin, reading "A great miracle happened here!"',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'During a Passover Seder, which crispy flatbread reminds participants of the hurried departure from Egypt?',
        options: ['Challah', 'Matzah', 'Bagel', 'Babka'],
        correctIndex: 1,
        explanation: 'Unleavened matzah represents dough that had no time to rise before the Israelites set out.',
        funFact: 'By custom, kosher-for-Passover matzah is mixed and baked in under 18 minutes.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'What small decorated case affixed to Jewish doorposts holds verses from the Shema prayer inside?',
        options: ['Shofar', 'Mezuzah', 'Tallit', 'Yad'],
        correctIndex: 1,
        explanation: 'A mezuzah (literally "doorpost") carries a tiny handwritten parchment roll of Deuteronomy 6:4-9 and 11:13-21.',
        funFact: 'It is traditionally angled slightly inward toward the home as a gentle compromise between two famous sages.',
        category: 'Faith Study',
        difficulty: 'medium',
      },
      {
        question: 'Which musical horn made from a ram’s horn is sounded to usher in Rosh Hashanah, the Jewish New Year?',
        options: ['Shofar', 'Lute', 'Cymbal', 'Lyre'],
        correctIndex: 0,
        explanation: 'The shofar’s resonant blasts—Tekiah, Shevarim, and Teruah—call listeners to reflection and renewal.',
        funFact: 'Because it is natural horn rather than brass, every shofar produces its own distinct warm overtones.',
        category: 'Faith Study',
        difficulty: 'medium',
      },
    ],
  },

  hinduism: {
    id: 'hinduism',
    name: 'Hinduism',
    shortLabel: 'Gita',
    sacredTextLabel: 'Bhagavad Gita',
    tagline: 'Gita wisdom, Sanskrit terms, festivals of light & heritage',
    accentHex: '#F59E0B',
    passages: [
      {
        id: 'hin-1',
        quote: 'You have a right to perform your prescribed duty, but not to the fruits of action.',
        reference: 'Bhagavad Gita 2:47',
        reflection: 'Pour heart into your craft while letting go of anxious obsession over every outcome.',
      },
      {
        id: 'hin-2',
        quote: 'Truth is one; sages call it by many names.',
        reference: 'Rig Veda 1.164.46',
        reflection: 'Ancient poetry celebrating openness, humility, and respect across paths.',
      },
      {
        id: 'hin-3',
        quote: 'Yoga is balance and equanimity of mind.',
        reference: 'Bhagavad Gita 2:48',
        reflection: 'True poise stays steady whether a day brings applause or challenge.',
      },
    ],
    words: [
      {
        word: 'YOGA',
        length: 4,
        clue: 'Sanskrit for "union"—blending breath, posture, and calm awareness.',
        funFact: 'The word shares a root with English "yoke," symbolizing joining body, breath, and focus together.',
      },
      {
        word: 'SOUL',
        length: 4,
        clue: 'Eternal inner essence ("Atman") taught across the Upanishads and Gita.',
        funFact: 'The Gita describes the Atman as timeless—unchanged even as life seasons shift.',
      },
      {
        word: 'GLOW',
        length: 4,
        clue: 'Warm golden radiance of clay oil lamps lined along porches during Diwali.',
        funFact: 'Small terracotta lamps called "diyas" symbolize inner clarity overcoming darkness.',
      },
      {
        word: 'KARMA',
        length: 5,
        clue: 'Sanskrit for "action"—the ripple effect our choices send back into life.',
        funFact: 'In the Gita, Karma Yoga turns everyday work into joyful, selfless service.',
      },
      {
        word: 'SWAMI',
        length: 5,
        clue: 'Respectful Sanskrit title for a spiritual master who has mastered the self.',
        funFact: 'Derived from "sva-mi," meaning owner of oneself—calm and self-possessed.',
      },
      {
        word: 'ATMAN',
        length: 5,
        clue: 'Classic Sanskrit term for the true inner self explored in Vedanta.',
        funFact: 'One of the shortest yet deepest words in Indian philosophy, paired closely with Brahman.',
      },
      {
        word: 'CHANT',
        length: 5,
        clue: 'Melodic mantra repetition that steadies breath and focus during puja.',
        funFact: 'Sacred Sanskrit meters are structured with musical rhythm to aid memory and calm breathing.',
      },
      {
        word: 'LIGHT',
        length: 5,
        clue: 'What Diwali—the Festival of ____—celebrates across homes and streets.',
        funFact: '"Deepavali" literally translates to "a row of lamps."',
      },
      {
        word: 'TEMPLE',
        length: 6,
        clue: 'Carved stone sanctuary ("Mandir") with towering spires welcoming pilgrims.',
        funFact: 'Ancient temple architecture mirrors sacred geometry, aligning courtyards with sunrise light.',
      },
      {
        word: 'WISDOM',
        length: 6,
        clue: '"Jnana"—clarity sought through quiet inquiry and study of the Gita.',
        funFact: 'The Bhagavad Gita outlines distinct paths of wisdom, devotion, and mindful action so every temperament fits.',
      },
    ],
    trivia: [
      {
        question: 'Which radiant autumn celebration—marked by clay oil lamps and sweets—is known globally as the Festival of Lights?',
        options: ['Holi', 'Diwali', 'Pongal', 'Onam'],
        correctIndex: 1,
        explanation: 'Diwali (Deepavali) celebrates the triumph of light over darkness, knowledge over ignorance, and fresh beginnings.',
        funFact: 'In many regions, homes decorate doorsteps with intricate colorful floor patterns called Rangoli to welcome guests.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'The Bhagavad Gita is a classic dialogue between Krishna and which reflective warrior prince?',
        options: ['Arjuna', 'Rama', 'Bharata', 'Karna'],
        correctIndex: 0,
        explanation: 'Before a pivotal moment, Arjuna pauses to ask deep questions about duty, ethics, and purpose.',
        funFact: 'Despite its epic sweep, the entire Bhagavad Gita spans just 700 concise Sanskrit verses.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'In Sanskrit philosophy, what four-letter word means "ethical duty, harmony, and right living"?',
        options: ['Dharma (6L)', 'Kama', 'Yoga', 'Sutra'],
        correctIndex: 2,
        explanation: 'While "Dharma" names cosmic duty and right conduct, "Yoga" translates to union and balanced discipline.',
        funFact: 'Many Sanskrit roots traveled globally—words like "guru," "mantra," and "avatar" are everyday English today.',
        category: 'Faith Study',
        difficulty: 'medium',
      },
      {
        question: 'Which vibrant spring festival fills streets with laughter and clouds of colored powder?',
        options: ['Navratri', 'Holi', 'Raksha Bandhan', 'Makar Sankranti'],
        correctIndex: 1,
        explanation: 'Holi welcomes spring with music, community bonfires, and throwing bright "gulal" colors.',
        funFact: 'Traditional Holi powders were originally crafted from turmeric, hibiscus petals, and neem leaves.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'Why does the lotus flower hold deep symbolic respect across Hindu art and scripture?',
        options: ['It grows only in deserts', 'It blooms unstained above muddy water', 'It blooms once per century', 'It never needs sunlight'],
        correctIndex: 1,
        explanation: 'Rising clean and bright out of murky ponds, the lotus symbolizes spiritual clarity amidst busy worldly life.',
        funFact: 'Botanists call the water-repelling surface of lotus petals the "lotus effect"—inspiring self-cleaning materials.',
        category: 'Faith Study',
        difficulty: 'medium',
      },
    ],
  },

  buddhism: {
    id: 'buddhism',
    name: 'Buddhism',
    shortLabel: 'Dharma',
    sacredTextLabel: 'Dhammapada',
    tagline: 'Mindfulness teachings, Dhammapada verses & calm insight',
    accentHex: '#0EA5E9',
    passages: [
      {
        id: 'bud-1',
        quote: 'Peace comes from within. Do not seek it without.',
        reference: 'Dhammapada Reflection',
        reflection: 'Training attention gently steadies your inner weather even on loud days.',
      },
      {
        id: 'bud-2',
        quote: 'Hatred is never appeased by hatred in this world. By love alone is hatred appeased.',
        reference: 'Dhammapada 1:5',
        reflection: 'Compassion breaks cycles of frustration far faster than sharp replies.',
      },
      {
        id: 'bud-3',
        quote: 'Just as a solid rock is not shaken by the storm, even so the wise are not affected by praise or blame.',
        reference: 'Dhammapada 6:81',
        reflection: 'Grounded awareness keeps both compliments and setbacks in healthy perspective.',
      },
    ],
    words: [
      {
        word: 'CALM',
        length: 4,
        clue: 'Stillness cultivated through steady breathing and mindful attention.',
        funFact: 'Meditation traditions distinguish between calm concentration (Samatha) and clear insight (Vipassana).',
      },
      {
        word: 'MIND',
        length: 4,
        clue: 'The opening verse of the Dhammapada calls this the forerunner of all actions.',
        funFact: '"Mind precedes all phenomena" is the very first line of the Pali Dhammapada.',
      },
      {
        word: 'PATH',
        length: 4,
        clue: 'The Noble Eightfold ____ guides ethical speech, livelihood, and mindfulness.',
        funFact: 'Represented by the eight-spoked Dharma Wheel (Dharmachakra), every spoke reinforces the others.',
      },
      {
        word: 'PEACE',
        length: 5,
        clue: 'Inner stillness nurtured by letting go of clinging and rushing.',
        funFact: 'Thich Nhat Hanh popularized "walking meditation"—treating every calm footstep as arriving in peace.',
      },
      {
        word: 'NOBLE',
        length: 5,
        clue: 'Adjective naming both the Four ____ Truths and the Eightfold Path.',
        funFact: 'In Pali, "Ariya" denotes spiritual maturity and kindness rather than social rank.',
      },
      {
        word: 'QUIET',
        length: 5,
        clue: 'Gentle hush of a Zen courtyard garden before morning meditation.',
        funFact: 'Raked gravel patterns in Zen dry gardens evoke slow ocean ripples to invite calm focus.',
      },
      {
        word: 'STILL',
        length: 5,
        clue: 'Unmoving water reflects the sky clearly—just like an unhurried mind.',
        funFact: 'Forest monasteries around the world emphasize unhurried simplicity close to trees and birdsong.',
      },
      {
        word: 'AWAKE',
        length: 5,
        clue: 'What the title "Buddha" literally means—someone fully ____ to reality.',
        funFact: 'The root Sanskrit word "budh" simply means to wake up or understand deeply.',
      },
      {
        word: 'BREATH',
        length: 6,
        clue: 'Natural anchor used in mindfulness meditation—always right with you.',
        funFact: 'Mindful breathing ("Anapanasati") requires no gear and resets stress responses within seconds.',
      },
      {
        word: 'GENTLE',
        length: 6,
        clue: 'Right Speech encourages words that are truthful, timely, and ____.',
        funFact: 'Metta (loving-kindness) meditation begins by wishing friendliness to oneself, then outward to all beings.',
      },
    ],
    trivia: [
      {
        question: 'What does the honorific title "Buddha" literally translate to in Sanskrit?',
        options: ['The King', 'The Awakened One', 'The Wanderer', 'The Scribe'],
        correctIndex: 1,
        explanation: 'Siddhartha Gautama became known as the Buddha—the Awakened One—after gaining deep insight under the Bodhi tree.',
        funFact: 'Descendants of the original Bodhi tree in Bodh Gaya still shade pilgrims and meditators today.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'How many spokes traditionally appear on the Dharma Wheel (Dharmachakra) symbolizing the path of wise living?',
        options: ['Four', 'Six', 'Eight', 'Twelve'],
        correctIndex: 2,
        explanation: 'The eight spokes represent the Noble Eightfold Path—covering wisdom, ethical conduct, and mental training.',
        funFact: 'Each spoke highlights an everyday practice: right view, intention, speech, action, livelihood, effort, mindfulness, and concentration.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'In Buddhist mindfulness practice, what does "Metta" meditation intentionally cultivate?',
        options: ['Competitive speed', 'Loving-kindness toward all', 'Fasting for a week', 'Silent debate'],
        correctIndex: 1,
        explanation: 'Metta trains warm goodwill—starting gently with yourself and radiating outward to neighbors and strangers alike.',
        funFact: 'Modern psychology studies show regular loving-kindness practice measurably boosts positive mood and empathy.',
        category: 'Faith Study',
        difficulty: 'medium',
      },
      {
        question: 'Which poetic collection opens with the famous line, "Mind precedes all mental states"?',
        options: ['Dhammapada', 'Rig Veda', 'Analects', 'Upanishads'],
        correctIndex: 0,
        explanation: 'The Dhammapada gathers 423 short, memorable verses on clarity, patience, and self-mastery.',
        funFact: 'Its compact aphorisms have been translated into dozens of languages for over two millennia.',
        category: 'Faith Study',
        difficulty: 'medium',
      },
      {
        question: 'What is the Middle Way taught by the Buddha?',
        options: ['Walking only at noon', 'Balance between extremes of luxury and harsh denial', 'Reading two books at once', 'Living on a mountain peak'],
        correctIndex: 1,
        explanation: 'The Middle Way avoids both mindless indulgence and extreme self-punishment in favor of steady balance.',
        funFact: 'It was likened to tuning a stringed instrument—too loose won’t play, too tight snaps the string.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
    ],
  },

  spirituality: {
    id: 'spirituality',
    name: 'World Faiths',
    shortLabel: 'World',
    sacredTextLabel: 'Universal Wisdom',
    tagline: 'Shared ethics, Golden Rule traditions & comparative spirituality',
    accentHex: '#8B5CF6',
    passages: [
      {
        id: 'spi-1',
        quote: 'Treat others as you wish to be treated—echoed across nearly every sacred tradition on Earth.',
        reference: 'The Universal Golden Rule',
        reflection: 'Different languages, symbols, and songs converge on empathy and human dignity.',
      },
      {
        id: 'spi-2',
        quote: 'Gratitude turns what we have into enough.',
        reference: 'Contemplative Proverb',
        reflection: 'Pausing for one thankful breath reframes an entire afternoon.',
      },
      {
        id: 'spi-3',
        quote: 'A candle loses nothing by lighting another candle.',
        reference: 'World Wisdom Tradition',
        reflection: 'Sharing encouragement multiplies warmth without shrinking your own.',
      },
    ],
    words: [
      {
        word: 'DOVE',
        length: 4,
        clue: 'Winged messenger carrying an olive branch—a global emblem of peace.',
        funFact: 'From ancient Mediterranean art to modern flags, the white dove signals truce and renewal.',
      },
      {
        word: 'LOVE',
        length: 4,
        clue: 'The shared heartbeat linking compassion across world religions and poetry.',
        funFact: 'Ancient Greek distinguished four shades of love: family warmth, friendship, romance, and selfless care (agape).',
      },
      {
        word: 'KIND',
        length: 4,
        clue: 'Simple everyday warmth that bridges strangers across every culture.',
        funFact: 'The word "kind" shares origins with "kin"—treating everyone like family.',
      },
      {
        word: 'UNITY',
        length: 5,
        clue: 'Finding harmony across diverse traditions, neighborhoods, and voices.',
        funFact: 'Interfaith gatherings often use shared meals and music to build neighborhood trust.',
      },
      {
        word: 'ETHIC',
        length: 5,
        clue: 'Moral compass guiding fairness, honesty, and respect for neighbors.',
        funFact: 'Traces to Greek "ethos," meaning character and lived habit.',
      },
      {
        word: 'SHARE',
        length: 5,
        clue: 'Hospitality tradition celebrated when feasts welcome guests and strangers.',
        funFact: 'Breaking bread together appears in nearly every sacred calendar from Ramadan to Shabbat to Thanksgiving.',
      },
      {
        word: 'OLIVE',
        length: 5,
        clue: 'Mediterranean branch carried as a timeless symbol of reconciliation.',
        funFact: 'Olive trees can live over 1,500 years, standing as living witnesses across generations.',
      },
      {
        word: 'TRUST',
        length: 5,
        clue: 'Steady confidence built when promises match daily character.',
        funFact: 'In old Germanic languages, "trust" connects to the same root as "true" and sturdy oak trees.',
      },
      {
        word: 'WISDOM',
        length: 6,
        clue: 'Insight seasoned by patience, listening, and compassion.',
        funFact: 'Across traditions, wisdom is pictured less like trivia speed and more like calm judgment.',
      },
      {
        word: 'VIRTUE',
        length: 6,
        clue: 'Practiced courage, generosity, and integrity woven into daily habits.',
        funFact: 'Aristotle and classical scholars alike taught that virtues grow stronger with small daily choices.',
      },
    ],
    trivia: [
      {
        question: 'Which ethical principle—"Treat others as you would wish to be treated"—appears in Christianity, Islam, Judaism, Hinduism, and Buddhism?',
        options: ['The Silver Chord', 'The Golden Rule', 'The Iron Maxim', 'The Bronze Axiom'],
        correctIndex: 1,
        explanation: 'Every major faith and philosophy teaches a form of the Golden Rule—anchoring universal empathy.',
        funFact: 'Confucius phrased a version 2,500 years ago: "Do not impose on others what you do not desire yourself."',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'Across Mediterranean, Abrahamic, and classical traditions, which tree’s branch symbolizes peace and renewal?',
        options: ['Pine branch', 'Olive branch', 'Willow branch', 'Birch branch'],
        correctIndex: 1,
        explanation: 'An olive branch—paired with a dove in Genesis and honored in ancient Greece—remains a global sign of peace.',
        funFact: 'Some olive groves in the Mediterranean still harvest fruit from trees planted over a millennium ago.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'Which comparative word describes welcoming dialogue and shared service across different religious traditions?',
        options: ['Interfaith', 'Monolith', 'Solstice', 'Cartography'],
        correctIndex: 0,
        explanation: 'Interfaith initiatives bring diverse faith communities together for food drives, dialogue, and peacebuilding.',
        funFact: 'The first Parliament of the World’s Religions convened in Chicago in 1893 with delegates from every inhabited continent.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'Why do so many sacred holidays—like Diwali, Hanukkah, Christmas, and Eid lanterns—highlight candles or lamps?',
        options: ['They lower room humidity', 'Light symbolizes hope, clarity, and shared warmth', 'Candles were invented in 1920', 'They count leap years'],
        correctIndex: 1,
        explanation: 'Light cuts across cultural borders as an unmistakable metaphor for guidance, joy, and community.',
        funFact: 'Archaeologists have found decorative clay oil lamps spanning thousands of years across temples and homes.',
        category: 'Faith Study',
        difficulty: 'easy',
      },
      {
        question: 'In gratitude studies across world contemplative traditions, what daily habit most consistently lowers stress?',
        options: ['Multi-tasking faster', 'Pausing to name three things you appreciate', 'Checking breaking alerts at midnight', 'Skipping sleep'],
        correctIndex: 1,
        explanation: 'Named gratitude mirrors centuries of morning and mealtime thanksgiving practices across global faiths.',
        funFact: 'Even two minutes of thankful reflection activates brain regions linked with calm social connection.',
        category: 'Faith Study',
        difficulty: 'medium',
      },
    ],
  },
};

export function isReligionId(val: unknown): val is ReligionId {
  return typeof val === 'string' && RELIGION_IDS.includes(val as ReligionId);
}

export function getFaithTradition(religion: ReligionId): FaithTraditionProfile {
  return FAITH_TRADITIONS[religion] || FAITH_TRADITIONS.christianity;
}

function hashSeed(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getDailyFaithPassage(
  religion: ReligionId,
  dateKey: string
): FaithPassage {
  const profile = getFaithTradition(religion);
  const idx = hashSeed(`${religion}::${dateKey}`) % profile.passages.length;
  return profile.passages[idx];
}

export function pickFaithPuzzleWord(
  religion: ReligionId,
  length: WordLength,
  dateKey: string,
  excludeWords: string[] = []
): FaithWordEntry {
  const profile = getFaithTradition(religion);
  const validSet = VALID_WORDS[length];
  const excluded = new Set(excludeWords.map((w) => w.toUpperCase()));

  const lengthMatches = profile.words.filter(
    (entry) => entry.length === length && validSet.has(entry.word)
  );
  const pool =
    lengthMatches.length > 0
      ? lengthMatches
      : profile.words.filter((entry) => VALID_WORDS[entry.length].has(entry.word));

  const fresh = pool.filter((entry) => !excluded.has(entry.word));
  const candidates = fresh.length > 0 ? fresh : pool;
  const idx = hashSeed(`${religion}::word::${dateKey}::${length}::${excludeWords.length}`) % candidates.length;
  return candidates[idx];
}

export function getFaithTriviaQuestions(
  religion: ReligionId,
  count = 5,
  difficultyFilter?: TriviaDifficulty
): TriviaQuestion[] {
  const profile = getFaithTradition(religion);
  const base = difficultyFilter
    ? profile.trivia.filter((q) => q.difficulty === difficultyFilter)
    : profile.trivia;
  const source = base.length >= count ? base : profile.trivia;
  const out: TriviaQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const q = source[i % source.length];
    out.push({
      ...q,
      category: `Faith Study · ${profile.name}`,
    });
  }
  return out;
}
