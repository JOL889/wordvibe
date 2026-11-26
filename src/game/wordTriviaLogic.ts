export interface PuzzleWordTrivia {
  riddle: string;
  lateralClue: string;
  domain: string;
  answerFormatNote: string;
  difficulty: 'moderate' | 'medium' | 'easy';
  personalizedFor?: string;
  funFact?: string;
  generatedAt: number;
}

export interface RowWordTriviaClue {
  rowNumber: number;
  clue: string;
  lateralNudge: string;
}

export interface PuzzleCluesBundle {
  riddle: string;
  lateralClue: string;
  domain: string;
  answerFormatNote: string;
  personalizedFor?: string;
  funFact?: string;
  rowClues: RowWordTriviaClue[];
  generatedAt: number;
}

export interface WordTriviaValidationResult {
  riddle: string;
  lateralClue: string;
  domain: string;
  answerFormatNote: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Ensures the hidden horizontal target word (or obvious plural/inflected forms)
 * never appears verbatim inside the generated trivia text.
 */
export function maskTargetWordIfLeaked(text: string, targetWord: string): string {
  const cleanWord = targetWord.trim().toUpperCase();
  if (!cleanWord || cleanWord.length < 3) return text.trim();

  const blank = '_'.repeat(cleanWord.length);
  const pattern = new RegExp(`\\b${escapeRegExp(cleanWord)}(?:s|es|ed|ing)?\\b`, 'gi');
  return text.replace(pattern, blank).replace(/\s+/g, ' ').trim();
}

export function buildCuratedWordFunFact(targetWord: string, categoryName = 'English'): string {
  const clean = targetWord.trim().toUpperCase();
  const uniqueLetters = new Set(clean.split('')).size;
  const scrabbleMap: Record<string, number> = {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
    N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
  };
  const tileScore = clean.split('').reduce((sum, ch) => sum + (scrabbleMap[ch] || 1), 0);
  const isIsogram = uniqueLetters === clean.length;
  return `${clean} (${categoryName}) scores ${tileScore} classic board-game points and features ${isIsogram ? 'all distinct characters!' : 'a clever repeated motif!'}`;
}

export function isValidWordTriviaPayload(raw: unknown): raw is WordTriviaValidationResult {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.riddle !== 'string' || obj.riddle.trim().length < 8) return false;
  if (typeof obj.lateralClue !== 'string' || obj.lateralClue.trim().length < 4) return false;
  if (typeof obj.domain !== 'string' || obj.domain.trim().length < 2) return false;
  if (typeof obj.answerFormatNote !== 'string' || obj.answerFormatNote.trim().length < 2) {
    return false;
  }
  return true;
}

export function isValidPuzzleCluesBundlePayload(raw: unknown): boolean {
  if (!isValidWordTriviaPayload(raw)) return false;
  const obj = raw as unknown as Record<string, unknown>;
  if (!Array.isArray(obj.rowClues) || obj.rowClues.length === 0) return false;
  return obj.rowClues.every((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const item = entry as Record<string, unknown>;
    return (
      typeof item.rowNumber === 'number' &&
      Number.isInteger(item.rowNumber) &&
      item.rowNumber >= 1 &&
      typeof item.clue === 'string' &&
      item.clue.trim().length >= 8
    );
  });
}

export function sanitizePuzzleCluesBundle(
  raw: {
    riddle: string;
    lateralClue: string;
    domain: string;
    answerFormatNote: string;
    personalizedFor?: string;
    funFact?: string;
    rowClues?: Array<{ rowNumber?: number; clue?: string; lateralNudge?: string }>;
  },
  targetWord: string,
  categoryName: string,
  maxRows = 7
): PuzzleCluesBundle {
  const cleanRiddle = maskTargetWordIfLeaked(raw.riddle, targetWord);
  const cleanLateral = maskTargetWordIfLeaked(
    raw.lateralClue?.trim() ||
      `Think about everyday ${categoryName} clues for this ${targetWord.length}-letter word.`,
    targetWord
  );
  const cleanDomain = (raw.domain?.trim() || categoryName).slice(0, 48);
  const cleanFormat = maskTargetWordIfLeaked(
    raw.answerFormatNote?.trim() || `${targetWord.length}-letter word`,
    targetWord
  ).slice(0, 48);
  const cleanPersonalizedFor = raw.personalizedFor?.trim()
    ? raw.personalizedFor.trim().slice(0, 64)
    : undefined;
  const cleanFunFact =
    typeof raw.funFact === 'string' && raw.funFact.trim().length >= 12
      ? raw.funFact.trim().slice(0, 220)
      : buildCuratedWordFunFact(targetWord, cleanDomain);

  const byRow = new Map<number, RowWordTriviaClue>();
  if (Array.isArray(raw.rowClues)) {
    for (const item of raw.rowClues) {
      if (
        item &&
        typeof item.rowNumber === 'number' &&
        Number.isInteger(item.rowNumber) &&
        item.rowNumber >= 1 &&
        item.rowNumber <= maxRows &&
        typeof item.clue === 'string' &&
        item.clue.trim().length >= 8
      ) {
        byRow.set(item.rowNumber, {
          rowNumber: item.rowNumber,
          clue: maskTargetWordIfLeaked(item.clue, targetWord),
          lateralNudge: maskTargetWordIfLeaked(
            typeof item.lateralNudge === 'string' && item.lateralNudge.trim()
              ? item.lateralNudge
              : cleanLateral,
            targetWord
          ),
        });
      }
    }
  }

  const rowClues: RowWordTriviaClue[] = [];
  for (let row = 1; row <= maxRows; row++) {
    const existing = byRow.get(row);
    rowClues.push(
      existing || {
        rowNumber: row,
        clue: cleanRiddle,
        lateralNudge: cleanLateral,
      }
    );
  }

  return {
    riddle: cleanRiddle,
    lateralClue: cleanLateral,
    domain: cleanDomain,
    answerFormatNote: cleanFormat,
    personalizedFor: cleanPersonalizedFor,
    funFact: cleanFunFact,
    rowClues,
    generatedAt: Date.now(),
  };
}

export function pickClueForRow(bundle: PuzzleCluesBundle, rowNumber: number): PuzzleWordTrivia {
  const matched = bundle.rowClues.find((item) => item.rowNumber === rowNumber);
  return {
    riddle: matched?.clue || bundle.riddle,
    lateralClue: matched?.lateralNudge || bundle.lateralClue,
    domain: bundle.domain,
    answerFormatNote: bundle.answerFormatNote,
    difficulty: 'moderate',
    personalizedFor: bundle.personalizedFor,
    funFact: bundle.funFact,
    generatedAt: bundle.generatedAt,
  };
}
