import { computeWeeklyGrade, getUtcWeekKey, type WeeklyGradeId } from './weeklyLogic';

export type LeaderboardScope = 'weekly' | 'all_time';

export interface LeaderboardEntry {
  id: string;
  name: string;
  weeklyXp: number;
  totalXp: number;
  puzzlesSolved: number;
  triviaCorrect: number;
  streak: number;
  weekKey?: string;
  isActiveThisWeek?: boolean;
  isCurrentUser?: boolean;
  rank?: number;
  gradeId?: WeeklyGradeId;
}

export interface PlayerLeaderboardSummary {
  rank: number;
  totalPlayers: number;
  activeThisWeekCount: number;
  weekKey: string;
  playerXp: number;
  nextRivalName: string | null;
  xpToOvertake: number;
  topEntryName: string;
  topEntryXp: number;
  entries: LeaderboardEntry[];
}

interface RosterSeed {
  id: string;
  name: string;
  baseWeeklyXp: number;
  baseTotalXp: number;
  puzzlesSolved: number;
  triviaCorrect: number;
  streak: number;
}

const WEEK_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns realistic progress multiplier (0.18 at Monday 00:00 UTC -> 1.00 by Sunday night UTC)
 * so active weekly contenders' XP climbs steadily through the week.
 */
export function getWeekElapsedProgress(nowMs: number = Date.now()): number {
  const weekKey = getUtcWeekKey(nowMs);
  const [y, m, d] = weekKey.split('-').map(Number);
  const mondayMs = Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  const elapsed = Math.max(0, Math.min(WEEK_DURATION_MS, nowMs - mondayMs));
  const fraction = elapsed / WEEK_DURATION_MS;
  return Number((0.18 + 0.82 * fraction).toFixed(4));
}

// 63 active weekly players (64 total when combined with the current player).
const ACTIVE_WEEKLY_ROSTER_SEEDS: RosterSeed[] = [
  { id: 'c-aria', name: 'Aria_Lexicon', baseWeeklyXp: 4250, baseTotalXp: 14800, puzzlesSolved: 64, triviaCorrect: 118, streak: 19 },
  { id: 'c-solomon', name: 'Solomon_Wise', baseWeeklyXp: 3920, baseTotalXp: 13400, puzzlesSolved: 58, triviaCorrect: 109, streak: 16 },
  { id: 'c-kenji', name: 'Kenji_Cross', baseWeeklyXp: 3680, baseTotalXp: 12150, puzzlesSolved: 52, triviaCorrect: 104, streak: 14 },
  { id: 'c-nadia', name: 'Nadia_Vibe', baseWeeklyXp: 3410, baseTotalXp: 11200, puzzlesSolved: 49, triviaCorrect: 96, streak: 13 },
  { id: 'c-mateo', name: 'Mateo_Grid', baseWeeklyXp: 3150, baseTotalXp: 10450, puzzlesSolved: 47, triviaCorrect: 91, streak: 12 },
  { id: 'c-chloe', name: 'Chloe_Clue', baseWeeklyXp: 2940, baseTotalXp: 9640, puzzlesSolved: 45, triviaCorrect: 88, streak: 11 },
  { id: 'c-tariq', name: 'Tariq_Spark', baseWeeklyXp: 2710, baseTotalXp: 8920, puzzlesSolved: 42, triviaCorrect: 81, streak: 10 },
  { id: 'c-elena', name: 'Elena_Verse', baseWeeklyXp: 2540, baseTotalXp: 8340, puzzlesSolved: 39, triviaCorrect: 76, streak: 9 },
  { id: 'c-samir', name: 'Samir_Mind', baseWeeklyXp: 2380, baseTotalXp: 7920, puzzlesSolved: 38, triviaCorrect: 72, streak: 9 },
  { id: 'c-maya', name: 'Maya_Tiles', baseWeeklyXp: 2210, baseTotalXp: 7350, puzzlesSolved: 35, triviaCorrect: 68, streak: 8 },
  { id: 'c-noah', name: 'Noah_Quiz', baseWeeklyXp: 2060, baseTotalXp: 6890, puzzlesSolved: 33, triviaCorrect: 63, streak: 8 },
  { id: 'c-ivy', name: 'Ivy_Learner', baseWeeklyXp: 1890, baseTotalXp: 6150, puzzlesSolved: 31, triviaCorrect: 59, streak: 8 },
  { id: 'c-lucas', name: 'Lucas_Quill', baseWeeklyXp: 1760, baseTotalXp: 5720, puzzlesSolved: 29, triviaCorrect: 55, streak: 7 },
  { id: 'c-zara', name: 'Zara_Glyph', baseWeeklyXp: 1640, baseTotalXp: 5390, puzzlesSolved: 27, triviaCorrect: 52, streak: 7 },
  { id: 'c-devon', name: 'Devon_Spell', baseWeeklyXp: 1520, baseTotalXp: 5040, puzzlesSolved: 25, triviaCorrect: 49, streak: 7 },
  { id: 'c-priya', name: 'Priya_Word', baseWeeklyXp: 1440, baseTotalXp: 4820, puzzlesSolved: 24, triviaCorrect: 47, streak: 7 },
  { id: 'c-omar', name: 'Omar_Logic', baseWeeklyXp: 1360, baseTotalXp: 4510, puzzlesSolved: 23, triviaCorrect: 45, streak: 6 },
  { id: 'c-hanna', name: 'Hanna_Bloom', baseWeeklyXp: 1290, baseTotalXp: 4230, puzzlesSolved: 22, triviaCorrect: 43, streak: 6 },
  { id: 'c-felix', name: 'Felix_Note', baseWeeklyXp: 1210, baseTotalXp: 3960, puzzlesSolved: 21, triviaCorrect: 40, streak: 6 },
  { id: 'c-amara', name: 'Amara_Sage', baseWeeklyXp: 1140, baseTotalXp: 3720, puzzlesSolved: 20, triviaCorrect: 38, streak: 6 },
  { id: 'c-liam', name: 'Liam_Atlas', baseWeeklyXp: 1080, baseTotalXp: 3490, puzzlesSolved: 19, triviaCorrect: 36, streak: 6 },
  { id: 'c-leila', name: 'Leila_Star', baseWeeklyXp: 1015, baseTotalXp: 3280, puzzlesSolved: 18, triviaCorrect: 34, streak: 5 },
  { id: 'c-ethan', name: 'Ethan_Rune', baseWeeklyXp: 960, baseTotalXp: 3090, puzzlesSolved: 17, triviaCorrect: 33, streak: 5 },
  { id: 'c-naomi', name: 'Naomi_Crest', baseWeeklyXp: 905, baseTotalXp: 2890, puzzlesSolved: 16, triviaCorrect: 31, streak: 5 },
  { id: 'c-soren', name: 'Soren_Peak', baseWeeklyXp: 850, baseTotalXp: 2710, puzzlesSolved: 15, triviaCorrect: 30, streak: 5 },
  { id: 'c-claire', name: 'Claire_Mint', baseWeeklyXp: 795, baseTotalXp: 2540, puzzlesSolved: 15, triviaCorrect: 29, streak: 5 },
  { id: 'c-kofi', name: 'Kofi_Bridge', baseWeeklyXp: 760, baseTotalXp: 2410, puzzlesSolved: 14, triviaCorrect: 28, streak: 5 },
  { id: 'c-tessa', name: 'Tessa_Vow', baseWeeklyXp: 710, baseTotalXp: 2240, puzzlesSolved: 13, triviaCorrect: 26, streak: 4 },
  { id: 'c-rafael', name: 'Rafael_Ink', baseWeeklyXp: 670, baseTotalXp: 2090, puzzlesSolved: 13, triviaCorrect: 25, streak: 4 },
  { id: 'c-nora', name: 'Nora_Fable', baseWeeklyXp: 630, baseTotalXp: 1950, puzzlesSolved: 12, triviaCorrect: 24, streak: 4 },
  { id: 'c-darius', name: 'Darius_Key', baseWeeklyXp: 590, baseTotalXp: 1820, puzzlesSolved: 12, triviaCorrect: 23, streak: 4 },
  { id: 'c-ananya', name: 'Ananya_Zen', baseWeeklyXp: 555, baseTotalXp: 1690, puzzlesSolved: 11, triviaCorrect: 22, streak: 4 },
  { id: 'c-julian', name: 'Julian_Oak', baseWeeklyXp: 520, baseTotalXp: 1580, puzzlesSolved: 10, triviaCorrect: 21, streak: 4 },
  { id: 'c-yuna', name: 'Yuna_Cloud', baseWeeklyXp: 485, baseTotalXp: 1460, puzzlesSolved: 10, triviaCorrect: 19, streak: 4 },
  { id: 'c-gavin', name: 'Gavin_Echo', baseWeeklyXp: 455, baseTotalXp: 1350, puzzlesSolved: 9, triviaCorrect: 18, streak: 3 },
  { id: 'c-freya', name: 'Freya_North', baseWeeklyXp: 425, baseTotalXp: 1250, puzzlesSolved: 9, triviaCorrect: 17, streak: 3 },
  { id: 'c-victor', name: 'Victor_Arc', baseWeeklyXp: 395, baseTotalXp: 1160, puzzlesSolved: 8, triviaCorrect: 16, streak: 3 },
  { id: 'c-simone', name: 'Simone_Lark', baseWeeklyXp: 365, baseTotalXp: 1070, puzzlesSolved: 8, triviaCorrect: 15, streak: 3 },
  { id: 'c-isaac', name: 'Isaac_Root', baseWeeklyXp: 340, baseTotalXp: 980, puzzlesSolved: 7, triviaCorrect: 14, streak: 3 },
  { id: 'c-camila', name: 'Camila_Sun', baseWeeklyXp: 315, baseTotalXp: 905, puzzlesSolved: 7, triviaCorrect: 13, streak: 3 },
  { id: 'c-hugo', name: 'Hugo_Cipher', baseWeeklyXp: 290, baseTotalXp: 830, puzzlesSolved: 6, triviaCorrect: 12, streak: 3 },
  { id: 'c-meera', name: 'Meera_Dawn', baseWeeklyXp: 270, baseTotalXp: 765, puzzlesSolved: 6, triviaCorrect: 12, streak: 3 },
  { id: 'c-owen', name: 'Owen_Trail', baseWeeklyXp: 250, baseTotalXp: 705, puzzlesSolved: 5, triviaCorrect: 11, streak: 2 },
  { id: 'c-ines', name: 'Ines_Pearl', baseWeeklyXp: 230, baseTotalXp: 650, puzzlesSolved: 5, triviaCorrect: 10, streak: 2 },
  { id: 'c-caleb', name: 'Caleb_Stone', baseWeeklyXp: 210, baseTotalXp: 595, puzzlesSolved: 5, triviaCorrect: 10, streak: 2 },
  { id: 'c-linnea', name: 'Linnea_Pine', baseWeeklyXp: 190, baseTotalXp: 540, puzzlesSolved: 4, triviaCorrect: 9, streak: 2 },
  { id: 'c-tomas', name: 'Tomas_Breeze', baseWeeklyXp: 175, baseTotalXp: 490, puzzlesSolved: 4, triviaCorrect: 8, streak: 2 },
  { id: 'c-farah', name: 'Farah_Light', baseWeeklyXp: 160, baseTotalXp: 445, puzzlesSolved: 4, triviaCorrect: 8, streak: 2 },
  { id: 'c-miles', name: 'Miles_Brook', baseWeeklyXp: 148, baseTotalXp: 405, puzzlesSolved: 3, triviaCorrect: 7, streak: 2 },
  { id: 'c-ruby', name: 'Ruby_Chime', baseWeeklyXp: 135, baseTotalXp: 365, puzzlesSolved: 3, triviaCorrect: 7, streak: 2 },
  { id: 'c-arjun', name: 'Arjun_Spark', baseWeeklyXp: 124, baseTotalXp: 330, puzzlesSolved: 3, triviaCorrect: 6, streak: 2 },
  { id: 'c-elise', name: 'Elise_Reed', baseWeeklyXp: 114, baseTotalXp: 300, puzzlesSolved: 3, triviaCorrect: 6, streak: 1 },
  { id: 'c-jonah', name: 'Jonah_Wave', baseWeeklyXp: 104, baseTotalXp: 270, puzzlesSolved: 2, triviaCorrect: 5, streak: 1 },
  { id: 'c-talia', name: 'Talia_Moon', baseWeeklyXp: 94, baseTotalXp: 245, puzzlesSolved: 2, triviaCorrect: 5, streak: 1 },
  { id: 'c-bram', name: 'Bram_Leaf', baseWeeklyXp: 85, baseTotalXp: 230, puzzlesSolved: 2, triviaCorrect: 4, streak: 1 },
  { id: 'c-kiara', name: 'Kiara_Frost', baseWeeklyXp: 78, baseTotalXp: 205, puzzlesSolved: 2, triviaCorrect: 4, streak: 1 },
  { id: 'c-declan', name: 'Declan_Vale', baseWeeklyXp: 70, baseTotalXp: 185, puzzlesSolved: 2, triviaCorrect: 3, streak: 1 },
  { id: 'c-hana', name: 'Hana_Sora', baseWeeklyXp: 64, baseTotalXp: 165, puzzlesSolved: 1, triviaCorrect: 3, streak: 1 },
  { id: 'c-nico', name: 'Nico_Frame', baseWeeklyXp: 58, baseTotalXp: 145, puzzlesSolved: 1, triviaCorrect: 3, streak: 1 },
  { id: 'c-sienna', name: 'Sienna_Gem', baseWeeklyXp: 52, baseTotalXp: 128, puzzlesSolved: 1, triviaCorrect: 2, streak: 1 },
  { id: 'c-leo', name: 'Leo_Anchor', baseWeeklyXp: 46, baseTotalXp: 110, puzzlesSolved: 1, triviaCorrect: 2, streak: 1 },
  { id: 'c-vera', name: 'Vera_Loom', baseWeeklyXp: 40, baseTotalXp: 92, puzzlesSolved: 1, triviaCorrect: 2, streak: 1 },
  { id: 'c-finn', name: 'Finn_Glade', baseWeeklyXp: 32, baseTotalXp: 75, puzzlesSolved: 1, triviaCorrect: 1, streak: 1 },
];

// Dormant players from prior cycles: never included in weekly active rankings.
const INACTIVE_DORMANT_PLAYERS: Omit<LeaderboardEntry, 'rank' | 'gradeId'>[] = [
  {
    id: 'dormant-old-1',
    name: 'Archive_Knight',
    weeklyXp: 0,
    totalXp: 11200,
    puzzlesSolved: 48,
    triviaCorrect: 84,
    streak: 0,
    weekKey: '2024-01-01',
    isActiveThisWeek: false,
  },
  {
    id: 'dormant-old-2',
    name: 'Paused_Voyager',
    weeklyXp: 0,
    totalXp: 7600,
    puzzlesSolved: 32,
    triviaCorrect: 58,
    streak: 0,
    weekKey: '2024-01-01',
    isActiveThisWeek: false,
  },
];

export interface BuildLeaderboardInput {
  playerId?: string;
  playerName: string;
  playerWeeklyXp: number;
  playerTotalXp: number;
  playerPuzzlesSolved: number;
  playerTriviaCorrect: number;
  playerStreak: number;
  scope: LeaderboardScope;
  nowMs?: number;
  weekKey?: string;
  remoteEntries?: LeaderboardEntry[];
}

function sanitizeDisplayName(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, ' ').slice(0, 24);
  return cleaned.length > 0 ? cleaned : 'You';
}

function isActiveEntryForWeek(entry: LeaderboardEntry, currentWeekKey: string): boolean {
  if (entry.isCurrentUser) return true;
  if (entry.isActiveThisWeek === false) return false;
  if (entry.weekKey && entry.weekKey !== currentWeekKey) return false;
  return entry.weeklyXp > 0;
}

export function buildXpLeaderboard(input: BuildLeaderboardInput): LeaderboardEntry[] {
  const nowMs = input.nowMs ?? Date.now();
  const currentWeekKey = input.weekKey || getUtcWeekKey(nowMs);
  const weekProgress = getWeekElapsedProgress(nowMs);

  const playerId = input.playerId || 'local-player';
  const playerName = sanitizeDisplayName(input.playerName);
  const playerWeeklyXp = Math.max(0, Math.round(input.playerWeeklyXp));
  const playerTotalXp = Math.max(playerWeeklyXp, Math.round(input.playerTotalXp));

  const pool = new Map<string, LeaderboardEntry>();

  for (const seed of ACTIVE_WEEKLY_ROSTER_SEEDS) {
    const scaledWeeklyXp = Math.max(10, Math.round(seed.baseWeeklyXp * weekProgress));
    const priorWeeksXp = Math.max(0, seed.baseTotalXp - seed.baseWeeklyXp);
    pool.set(seed.id, {
      id: seed.id,
      name: seed.name,
      weeklyXp: scaledWeeklyXp,
      totalXp: priorWeeksXp + scaledWeeklyXp,
      puzzlesSolved: Math.max(1, Math.round(seed.puzzlesSolved * weekProgress)),
      triviaCorrect: Math.max(1, Math.round(seed.triviaCorrect * weekProgress)),
      streak: seed.streak,
      weekKey: currentWeekKey,
      isActiveThisWeek: true,
      isCurrentUser: false,
    });
  }

  for (const dormant of INACTIVE_DORMANT_PLAYERS) {
    pool.set(dormant.id, { ...dormant, isCurrentUser: false });
  }

  if (Array.isArray(input.remoteEntries)) {
    for (const remote of input.remoteEntries) {
      if (!remote || !remote.id || remote.id === playerId) continue;
      const cleanName = sanitizeDisplayName(remote.name);
      if (cleanName.toLowerCase() === playerName.toLowerCase() && remote.id.startsWith('user:')) {
        continue;
      }
      const remoteWeekly = Math.max(0, Math.round(remote.weeklyXp || 0));
      const remoteActive =
        remote.isActiveThisWeek !== undefined
          ? remote.isActiveThisWeek
          : remoteWeekly > 0 && (!remote.weekKey || remote.weekKey === currentWeekKey);
      pool.set(remote.id, {
        id: remote.id,
        name: cleanName,
        weeklyXp: remoteWeekly,
        totalXp: Math.max(remoteWeekly, Math.round(remote.totalXp || 0)),
        puzzlesSolved: Math.max(0, Math.round(remote.puzzlesSolved || 0)),
        triviaCorrect: Math.max(0, Math.round(remote.triviaCorrect || 0)),
        streak: Math.max(0, Math.round(remote.streak || 0)),
        weekKey: remote.weekKey,
        isActiveThisWeek: remoteActive,
        isCurrentUser: false,
      });
    }
  }

  pool.set(playerId, {
    id: playerId,
    name: playerName,
    weeklyXp: playerWeeklyXp,
    totalXp: playerTotalXp,
    puzzlesSolved: Math.max(0, Math.round(input.playerPuzzlesSolved)),
    triviaCorrect: Math.max(0, Math.round(input.playerTriviaCorrect)),
    streak: Math.max(0, Math.round(input.playerStreak)),
    weekKey: currentWeekKey,
    isActiveThisWeek: true,
    isCurrentUser: true,
  });

  const filtered =
    input.scope === 'weekly'
      ? Array.from(pool.values()).filter((entry) => isActiveEntryForWeek(entry, currentWeekKey))
      : Array.from(pool.values());

  const sorted = filtered.sort((a, b) => {
    const aXp = input.scope === 'all_time' ? a.totalXp : a.weeklyXp;
    const bXp = input.scope === 'all_time' ? b.totalXp : b.weeklyXp;
    if (bXp !== aXp) return bXp - aXp;
    if (b.puzzlesSolved !== a.puzzlesSolved) return b.puzzlesSolved - a.puzzlesSolved;
    if (a.isCurrentUser && !b.isCurrentUser) return -1;
    if (!a.isCurrentUser && b.isCurrentUser) return 1;
    return a.name.localeCompare(b.name);
  });

  return sorted.map((entry, idx) => {
    const xpVal = input.scope === 'all_time' ? entry.totalXp : entry.weeklyXp;
    const approxAch = entry.puzzlesSolved >= 10 && entry.triviaCorrect >= 15 ? 4 : 1;
    const grade = computeWeeklyGrade(entry.weeklyXp, approxAch).current.id;
    return {
      ...entry,
      rank: idx + 1,
      gradeId: grade,
      weeklyXp: entry.weeklyXp,
      totalXp: Math.max(entry.totalXp, xpVal),
    };
  });
}

export function getPlayerLeaderboardSummary(
  input: BuildLeaderboardInput
): PlayerLeaderboardSummary {
  const nowMs = input.nowMs ?? Date.now();
  const weekKey = input.weekKey || getUtcWeekKey(nowMs);
  const entries = buildXpLeaderboard({ ...input, nowMs, weekKey });
  const activeWeeklyEntries =
    input.scope === 'weekly'
      ? entries
      : buildXpLeaderboard({ ...input, scope: 'weekly', nowMs, weekKey });

  const playerIdx = entries.findIndex((e) => e.isCurrentUser);
  const rank = playerIdx >= 0 ? playerIdx + 1 : entries.length;
  const playerEntry = playerIdx >= 0 ? entries[playerIdx] : entries[entries.length - 1];
  const playerXp =
    input.scope === 'all_time' ? playerEntry.totalXp : playerEntry.weeklyXp;

  let nextRivalName: string | null = null;
  let xpToOvertake = 0;
  if (playerIdx > 0) {
    const above = entries[playerIdx - 1];
    const aboveXp = input.scope === 'all_time' ? above.totalXp : above.weeklyXp;
    nextRivalName = above.name;
    xpToOvertake = Math.max(1, aboveXp - playerXp + 1);
  }

  const top = entries[0];
  const topXp = input.scope === 'all_time' ? top.totalXp : top.weeklyXp;

  return {
    rank,
    totalPlayers: entries.length,
    activeThisWeekCount: activeWeeklyEntries.length,
    weekKey,
    playerXp,
    nextRivalName,
    xpToOvertake,
    topEntryName: top.name,
    topEntryXp: topXp,
    entries,
  };
}
