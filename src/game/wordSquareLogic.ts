import { VALID_WORDS, type WordLength } from '../data/words';
import { hasCuratedWordMeaning } from './wordMeanings';

export interface CompletedWordSquare {
  length: WordLength;
  target: string;
  /** Row words top-to-bottom (each is a verified English word in VALID_WORDS[length]) */
  rows: string[];
  /** Column words left-to-right (each is a verified English word in VALID_WORDS[length]) */
  cols: string[];
  /** Where the puzzle's target word sits in the completed cross-grid */
  targetPlacement: {
    orientation: 'row' | 'col';
    index: number;
  };
}

interface BitsetDict {
  length: WordLength;
  words: string[];
  wordToId: Map<string, number>;
  wordCount: number;
  numChunks: number;
  posMasks: Uint32Array[];
  allMask: Uint32Array;
}

const DICT_CACHE = new Map<WordLength, BitsetDict>();
const SQUARE_CACHE = new Map<string, CompletedWordSquare>();

/**
 * Offline-verified asymmetric base matrices (every row and column is a distinct English word).
 * Every row word and transposed column word is indexed in PRECOMPUTED_SQUARES for <1ms lookup.
 */
const VERIFIED_BASE_MATRICES: Record<WordLength, string[][]> = {
  4: [
    ['STAR', 'ORCA', 'NARC', 'EPEE'],
    ['GRIP', 'RIDE', 'ISLE', 'DEER'],
    ['TILE', 'ACID', 'LONG', 'KNEE'],
    ['SLOT', 'HOPE', 'OVAL', 'WELL'],
    ['ACID', 'NODE', 'AREA', 'SEAL'],
    ['ATOM', 'NAME', 'AMEN', 'SEND'],
    ['BALL', 'ARIA', 'SEAT', 'EARS'],
    ['CLAY', 'ROLE', 'OVAL', 'PEEL'],
  ],
  5: [
    ['SUPRA', 'CLOUD', 'ACINI', 'RESET', 'PRESS'],
    ['MUSIC', 'ELUDE', 'ACCEL', 'NERAL', 'TRESS'],
    ['SHADE', 'LANAI', 'ACING', 'BELCH', 'SKEET'],
    ['THOSE', 'RIATA', 'ENTER', 'AGENT', 'TENTH'],
    ['SCAPE', 'WORLD', 'ASSAI', 'STENT', 'HADES'],
    ['ARBOR', 'SERAI', 'STATE', 'ORIEL', 'CONNS'],
    ['HERDS', 'AVAIL', 'DIZZY', 'STEEL', 'TEENY'],
    ['OGEED', 'FUNNY', 'FADGE', 'AVOIR', 'LAWNS'],
    ['RUMAL', 'ALULA', 'JELLY', 'EMCEE', 'SATYR'],
    ['FLAIL', 'JOLLY', 'OSIER', 'REVUE', 'DRESS'],
    ['SQUIB', 'TULLE', 'RACER', 'OLEUM', 'PERMS'],
    ['SCRAP', 'WOOZY', 'INBOX', 'STILE', 'SONES'],
    ['SQUID', 'OUTDO', 'MAILS', 'ALLEE', 'SEERS'],
  ],
  6: [
    ['CAVEAT', 'AGENDA', 'MARSHY', 'ARGUER', 'SIERRA', 'SCREES'],
    ['PASTAS', 'ACCUSE', 'SHARPS', 'TERBIA', 'INFORM', 'LESSEE'],
    ['CAMASS', 'AGARIC', 'VERGER', 'ENSURE', 'ADHERE', 'TAYRAS'],
    ['PASTIL', 'ACHENE', 'SCARFS', 'TURBOS', 'ASPIRE', 'SESAME'],
    ['MELDED', 'INLINE', 'STANCE', 'LINGAM', 'AROUSE', 'YESSED'],
    ['SETULA', 'CRORES', 'ARMETS', 'ROTATE', 'CRISES', 'ESTERS'],
  ],
};

function buildPrecomputedMap(): {
  squares: Record<string, string[]>;
  targetsByLength: Record<WordLength, string[]>;
} {
  const squares: Record<string, string[]> = {};
  const targetsByLength: Record<WordLength, string[]> = { 4: [], 5: [], 6: [] };
  const lengths: WordLength[] = [4, 5, 6];

  for (const len of lengths) {
    const seenForLen = new Set<string>();
    for (const rows of VERIFIED_BASE_MATRICES[len]) {
      const cols = Array.from({ length: len }, (_, c) =>
        rows.map((r) => r[c]).join('')
      );
      for (const w of rows) {
        if (!squares[w]) squares[w] = rows;
        if (!seenForLen.has(w)) {
          seenForLen.add(w);
          targetsByLength[len].push(w);
        }
      }
      for (const w of cols) {
        if (!squares[w]) squares[w] = cols;
        if (!seenForLen.has(w)) {
          seenForLen.add(w);
          targetsByLength[len].push(w);
        }
      }
    }
  }

  return { squares, targetsByLength };
}

const PRECOMPUTED_INDEX = buildPrecomputedMap();
const PRECOMPUTED_SQUARES = PRECOMPUTED_INDEX.squares;

export function getPrecomputedTargetsForLength(length: WordLength): string[] {
  return PRECOMPUTED_INDEX.targetsByLength[length] || [];
}

function commonLetterScore(w: string): number {
  let s = 0;
  for (let i = 0; i < w.length; i++) {
    const ch = w[i];
    if ('EAROTLISNC'.includes(ch)) s += 2;
    else if ('UDYPMHGBK'.includes(ch)) s += 1;
    else if ('QXZJV'.includes(ch)) s -= 3;
  }
  return s;
}

function popcount32(v: number): number {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

function getBitsetDict(length: WordLength): BitsetDict {
  const cached = DICT_CACHE.get(length);
  if (cached) return cached;

  const words = Array.from(VALID_WORDS[length]).sort(
    (a, b) =>
      Number(hasCuratedWordMeaning(b)) - Number(hasCuratedWordMeaning(a)) ||
      commonLetterScore(b) - commonLetterScore(a) ||
      a.localeCompare(b)
  );
  const wordCount = words.length;
  const numChunks = (wordCount + 31) >>> 5;
  const wordToId = new Map<string, number>();

  const posMasks: Uint32Array[] = Array.from(
    { length: length * 26 },
    () => new Uint32Array(numChunks)
  );
  const allMask = new Uint32Array(numChunks);

  for (let id = 0; id < wordCount; id++) {
    const w = words[id];
    wordToId.set(w, id);
    const chunk = id >>> 5;
    const bit = 1 << (id & 31);
    allMask[chunk] |= bit;
    for (let pos = 0; pos < length; pos++) {
      const ch = w.charCodeAt(pos) - 65;
      if (ch >= 0 && ch < 26) {
        posMasks[pos * 26 + ch][chunk] |= bit;
      }
    }
  }

  const dict: BitsetDict = {
    length,
    words,
    wordToId,
    wordCount,
    numChunks,
    posMasks,
    allMask,
  };
  DICT_CACHE.set(length, dict);
  return dict;
}

function extractCols(rows: string[], length: number): string[] {
  const cols: string[] = [];
  for (let c = 0; c < length; c++) {
    let word = '';
    for (let r = 0; r < length; r++) {
      word += rows[r][c];
    }
    cols.push(word);
  }
  return cols;
}

function transposeRows(rows: string[], length: number): string[] {
  return extractCols(rows, length);
}

export function hasDistinctRowsAndCols(rows: string[], length: WordLength): boolean {
  if (rows.length !== length) return false;
  const cols = extractCols(rows, length);
  const seen = new Set<string>();
  for (const w of rows) {
    if (seen.has(w)) return false;
    seen.add(w);
  }
  for (const w of cols) {
    if (seen.has(w)) return false;
    seen.add(w);
  }
  return true;
}

export function validateWordSquare(rows: string[], length: WordLength): boolean {
  if (rows.length !== length) return false;
  const dict = VALID_WORDS[length];
  for (let r = 0; r < length; r++) {
    const row = rows[r];
    if (!row || row.length !== length || !dict.has(row)) return false;
  }
  for (let c = 0; c < length; c++) {
    let col = '';
    for (let r = 0; r < length; r++) {
      col += rows[r][c];
    }
    if (!dict.has(col)) return false;
  }
  return hasDistinctRowsAndCols(rows, length);
}

function intersectSlotBitmask(
  dict: BitsetDict,
  knownChars: Int8Array,
  outMask: Uint32Array
): number {
  const { length, numChunks, posMasks, allMask } = dict;
  let firstMask: Uint32Array | null = null;
  const extraMasks: Uint32Array[] = [];

  for (let p = 0; p < length; p++) {
    const ch = knownChars[p];
    if (ch >= 0) {
      const m = posMasks[p * 26 + ch];
      if (!firstMask) firstMask = m;
      else extraMasks.push(m);
    }
  }

  if (!firstMask) {
    outMask.set(allMask);
    return dict.wordCount;
  }

  let count = 0;
  const extraCount = extraMasks.length;
  for (let c = 0; c < numChunks; c++) {
    let v = firstMask[c];
    if (v !== 0) {
      for (let e = 0; e < extraCount; e++) {
        v &= extraMasks[e][c];
        if (v === 0) break;
      }
      if (v !== 0) count += popcount32(v);
    }
    outMask[c] = v;
  }
  return count;
}

function extractIdsFromMask(mask: Uint32Array, limit: number): number[] {
  const ids: number[] = [];
  for (let chunk = 0; chunk < mask.length; chunk++) {
    let v = mask[chunk];
    if (v === 0) continue;
    const base = chunk << 5;
    while (v !== 0) {
      const tz = Math.clz32(v & -v) ^ 31;
      ids.push(base + tz);
      if (ids.length >= limit) return ids;
      v &= v - 1;
    }
  }
  return ids;
}

/**
 * Fast bitset-accelerated asymmetric MRV + forward-checking solver placing `target` at row `fixedRowIdx`.
 * Strictly enforces distinct horizontal row words and vertical column words (no row == col symmetry).
 */
function solveWithFixedRow(
  target: string,
  length: WordLength,
  fixedRowIdx: number,
  dict: BitsetDict,
  maxNodes: number
): string[] | null {
  const grid = new Int8Array(length * length).fill(-1);
  const assignedRows = new Array<number>(length).fill(-1);
  const assignedCols = new Array<number>(length).fill(-1);
  const usedIds = new Set<number>();

  for (let c = 0; c < length; c++) {
    grid[fixedRowIdx * length + c] = target.charCodeAt(c) - 65;
  }
  const targetId = dict.wordToId.get(target);
  if (targetId !== undefined) {
    assignedRows[fixedRowIdx] = targetId;
    usedIds.add(targetId);
  } else {
    assignedRows[fixedRowIdx] = -2;
  }

  const slotChars = new Int8Array(length);
  const scratchMask = new Uint32Array(dict.numChunks);
  const bestMask = new Uint32Array(dict.numChunks);
  let nodes = 0;

  const isForwardConsistent = (): boolean => {
    for (let r = 0; r < length; r++) {
      if (assignedRows[r] !== -1) continue;
      for (let c = 0; c < length; c++) slotChars[c] = grid[r * length + c];
      if (intersectSlotBitmask(dict, slotChars, scratchMask) === 0) return false;
    }
    for (let c = 0; c < length; c++) {
      if (assignedCols[c] !== -1) continue;
      for (let r = 0; r < length; r++) slotChars[r] = grid[r * length + c];
      if (intersectSlotBitmask(dict, slotChars, scratchMask) === 0) return false;
    }
    return true;
  };

  if (!isForwardConsistent()) return null;

  const dfs = (): boolean => {
    if (++nodes > maxNodes) return false;

    let bestKind: 'row' | 'col' | null = null;
    let bestIdx = -1;
    let bestCount = Infinity;

    for (let c = 0; c < length; c++) {
      if (assignedCols[c] !== -1) continue;
      for (let r = 0; r < length; r++) slotChars[r] = grid[r * length + c];
      const count = intersectSlotBitmask(dict, slotChars, scratchMask);
      if (count === 0) return false;
      if (count < bestCount) {
        bestCount = count;
        bestKind = 'col';
        bestIdx = c;
        bestMask.set(scratchMask);
        if (bestCount === 1) break;
      }
    }

    if (bestCount > 1) {
      for (let r = 0; r < length; r++) {
        if (assignedRows[r] !== -1) continue;
        for (let c = 0; c < length; c++) slotChars[c] = grid[r * length + c];
        const count = intersectSlotBitmask(dict, slotChars, scratchMask);
        if (count === 0) return false;
        if (count < bestCount) {
          bestCount = count;
          bestKind = 'row';
          bestIdx = r;
          bestMask.set(scratchMask);
          if (bestCount === 1) break;
        }
      }
    }

    if (!bestKind) {
      return true;
    }

    const candidateIds = extractIdsFromMask(bestMask, 48);
    const prevCells = new Int8Array(length);

    for (let i = 0; i < candidateIds.length; i++) {
      const id = candidateIds[i];
      if (usedIds.has(id)) continue;
      const word = dict.words[id];

      if (bestKind === 'row') {
        for (let c = 0; c < length; c++) {
          prevCells[c] = grid[bestIdx * length + c];
          grid[bestIdx * length + c] = word.charCodeAt(c) - 65;
        }
        assignedRows[bestIdx] = id;
        usedIds.add(id);
        if (isForwardConsistent() && dfs()) return true;
        usedIds.delete(id);
        assignedRows[bestIdx] = -1;
        for (let c = 0; c < length; c++) {
          grid[bestIdx * length + c] = prevCells[c];
        }
      } else {
        for (let r = 0; r < length; r++) {
          prevCells[r] = grid[r * length + bestIdx];
          grid[r * length + bestIdx] = word.charCodeAt(r) - 65;
        }
        assignedCols[bestIdx] = id;
        usedIds.add(id);
        if (isForwardConsistent() && dfs()) return true;
        usedIds.delete(id);
        assignedCols[bestIdx] = -1;
        for (let r = 0; r < length; r++) {
          grid[r * length + bestIdx] = prevCells[r];
        }
      }

      if (nodes > maxNodes) return false;
    }

    return false;
  };

  if (!dfs()) return null;

  const out: string[] = [];
  for (let r = 0; r < length; r++) {
    if (r === fixedRowIdx) {
      out.push(target);
    } else {
      out.push(dict.words[assignedRows[r]]);
    }
  }
  return out;
}

/**
 * Generates an asymmetric L x L English Crossword Square where EVERY horizontal row AND
 * EVERY vertical column is a verified distinct word in VALID_WORDS[length], anchored on `target`.
 */
export function buildCompletedWordSquare(
  target: string,
  length: WordLength
): CompletedWordSquare | null {
  const cleanTarget = target.trim().toUpperCase();
  if (cleanTarget.length !== length) return null;

  const cacheKey = `${length}:${cleanTarget}`;
  const cached = SQUARE_CACHE.get(cacheKey);
  if (cached) return cached;

  const precomputed = PRECOMPUTED_SQUARES[cleanTarget];
  if (precomputed && validateWordSquare(precomputed, length)) {
    const cols = extractCols(precomputed, length);
    const rowIdx = precomputed.indexOf(cleanTarget);
    const colIdx = rowIdx === -1 ? cols.indexOf(cleanTarget) : -1;
    const res: CompletedWordSquare = {
      length,
      target: cleanTarget,
      rows: precomputed,
      cols,
      targetPlacement: {
        orientation: rowIdx !== -1 ? 'row' : 'col',
        index: rowIdx !== -1 ? rowIdx : Math.max(0, colIdx),
      },
    };
    SQUARE_CACHE.set(cacheKey, res);
    return res;
  }

  const dict = getBitsetDict(length);

  // Place target in interior rows/cols first (indices 1..L-2), which impose lighter start/end letter bottlenecks
  const anchorIndices: number[] =
    length === 6
      ? [1, 4, 0]
      : [
          ...Array.from({ length: Math.max(0, length - 2) }, (_, i) => i + 1),
          0,
          length - 1,
        ];

  const rowNodeBudget = length === 6 ? 900 : 1800;
  const colNodeBudget = length === 6 ? 900 : 2200;

  // Pass 1: horizontal row anchor with strictly distinct rows & columns
  for (const rIdx of anchorIndices) {
    const solved = solveWithFixedRow(cleanTarget, length, rIdx, dict, rowNodeBudget);
    if (solved && validateWordSquare(solved, length)) {
      const res: CompletedWordSquare = {
        length,
        target: cleanTarget,
        rows: solved,
        cols: extractCols(solved, length),
        targetPlacement: { orientation: 'row', index: rIdx },
      };
      SQUARE_CACHE.set(cacheKey, res);
      return res;
    }
  }

  // Pass 2: vertical column anchor (transpose) with strictly distinct rows & columns
  for (const cIdx of anchorIndices) {
    const solvedAsRow = solveWithFixedRow(cleanTarget, length, cIdx, dict, colNodeBudget);
    if (solvedAsRow) {
      const transposed = transposeRows(solvedAsRow, length);
      if (validateWordSquare(transposed, length)) {
        const res: CompletedWordSquare = {
          length,
          target: cleanTarget,
          rows: transposed,
          cols: extractCols(transposed, length),
          targetPlacement: { orientation: 'col', index: cIdx },
        };
        SQUARE_CACHE.set(cacheKey, res);
        return res;
      }
    }
  }

  return null;
}
