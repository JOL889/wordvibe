import { formatCrosswordShareText, type CrosswordBoardState } from './crosswordLogic';

export type BuiltInAvatarId =
  | 'crown'
  | 'owl'
  | 'sparkles'
  | 'compass'
  | 'flame'
  | 'brain'
  | 'book'
  | 'star';

export interface BuiltInAvatarOption {
  id: BuiltInAvatarId;
  label: string;
  glyph: string;
  badgeText: string;
}

export const BUILTIN_AVATARS: BuiltInAvatarOption[] = [
  { id: 'crown', label: 'Royal Crown', glyph: '👑', badgeText: 'CR' },
  { id: 'owl', label: 'Night Owl', glyph: '🦉', badgeText: 'OW' },
  { id: 'sparkles', label: 'Word Spark', glyph: '✨', badgeText: 'SP' },
  { id: 'compass', label: 'Explorer', glyph: '🧭', badgeText: 'EX' },
  { id: 'flame', label: 'Streak Flame', glyph: '🔥', badgeText: 'FL' },
  { id: 'brain', label: 'Brainiac', glyph: '🧠', badgeText: 'BR' },
  { id: 'book', label: 'Scholar', glyph: '📖', badgeText: 'SC' },
  { id: 'star', label: 'All-Star', glyph: '⭐', badgeText: 'ST' },
];

export interface LocalUserAccount {
  id: string;
  realName: string;
  username: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  avatarType: 'builtin' | 'photo';
  builtinAvatarId: BuiltInAvatarId;
  avatarDataUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RegistrationFormInput {
  realName: string;
  username: string;
  email: string;
  password: string;
  isEditing?: boolean;
}

export interface RegistrationValidationResult {
  valid: boolean;
  errors: Partial<Record<'realName' | 'username' | 'email' | 'password', string>>;
  normalized: {
    realName: string;
    username: string;
    email: string;
  };
}

export interface SignInFormInput {
  email: string;
  password: string;
}

export interface SignInValidationResult {
  valid: boolean;
  errors: Partial<Record<'email' | 'password', string>>;
  normalized: {
    email: string;
  };
}

const VALID_RASTER_DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;
const USERNAME_RE = /^[a-zA-Z0-9._]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function sanitizeAvatarDataUrl(url?: string): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (trimmed.length > 90_000) return undefined;
  return VALID_RASTER_DATA_URL_RE.test(trimmed) ? trimmed : undefined;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '').replace(/\s+/g, '_').slice(0, 24);
}

export function normalizeEmailKey(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 96);
}

export function validateSignInInput(input: SignInFormInput): SignInValidationResult {
  const email = normalizeEmailKey(input.email);
  const password = input.password;
  const errors: SignInValidationResult['errors'] = {};

  if (!EMAIL_RE.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: { email },
  };
}

export function validateRegistrationInput(
  input: RegistrationFormInput
): RegistrationValidationResult {
  const realName = input.realName.trim().replace(/\s+/g, ' ').slice(0, 48);
  const username = normalizeUsername(input.username);
  const email = normalizeEmailKey(input.email);
  const password = input.password;

  const errors: RegistrationValidationResult['errors'] = {};

  if (realName.length < 2) {
    errors.realName = 'Please enter your real name (at least 2 characters).';
  }
  if (!USERNAME_RE.test(username)) {
    errors.username = 'Username must be 3–24 characters using letters, numbers, dots, or _.';
  }
  if (!EMAIL_RE.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!input.isEditing || password.length > 0) {
    if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: { realName, username, email },
  };
}

/**
 * Pure TypeScript SHA-256 fallback for environments without Web Crypto subtle.
 */
function sha256HexFallback(message: string): string {
  const utf8 = new TextEncoder().encode(message);
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const bitLen = utf8.length * 8;
  const paddedLen = Math.ceil((utf8.length + 9) / 64) * 64;
  const buf = new Uint8Array(paddedLen);
  buf.set(utf8);
  buf[utf8.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return Array.from(H)
    .map((x) => x.toString(16).padStart(8, '0'))
    .join('');
}

export function generateSaltHex(byteCount = 16): string {
  const bytes = new Uint8Array(byteCount);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPasswordLocal(
  password: string,
  providedSalt?: string
): Promise<{ hash: string; salt: string }> {
  const salt = providedSalt || generateSaltHex(16);
  const payload = `mindspark:${salt}:${password}`;

  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoded = new TextEncoder().encode(payload);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    const hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return { hash, salt };
  }

  return {
    hash: sha256HexFallback(payload),
    salt,
  };
}

export async function verifyPasswordLocal(
  password: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  if (!password || !salt || !expectedHash) return false;
  const { hash } = await hashPasswordLocal(password, salt);
  return hash === expectedHash;
}

export function getBuiltinAvatarOption(id?: string): BuiltInAvatarOption {
  return BUILTIN_AVATARS.find((item) => item.id === id) || BUILTIN_AVATARS[0];
}

export interface SocialSharePayload {
  title: string;
  text: string;
  url: string;
}

export function buildPuzzleSharePayload(params: {
  username?: string;
  board: CrosswordBoardState;
  weeklyXp: number;
  rank: number;
  totalActivePlayers: number;
  streak: number;
  appUrl: string;
}): SocialSharePayload {
  const baseGridText = formatCrosswordShareText(params.board);
  const who = params.username ? `@${params.username}` : 'I';
  return {
    title: 'Wordvibe Crossword Solved!',
    text: `${baseGridText}\n\n${who} hit ${params.weeklyXp.toLocaleString()} Weekly XP · Rank #${params.rank} of ${params.totalActivePlayers} active players this week (🔥 ${params.streak} streak)!\nPlay with me:`,
    url: params.appUrl,
  };
}

export function buildLeaderboardSharePayload(params: {
  username?: string;
  weeklyXp: number;
  rank: number;
  totalActivePlayers: number;
  gradeLabel: string;
  streak: number;
  appUrl: string;
}): SocialSharePayload {
  const handle = params.username ? `@${params.username}` : 'Player';
  return {
    title: `Wordvibe Weekly Rank #${params.rank}`,
    text: `${handle} is Rank #${params.rank} of ${params.totalActivePlayers} active players this week on Wordvibe! (${params.weeklyXp.toLocaleString()} Weekly XP · ${params.gradeLabel} · ${params.streak}-day streak)\nJoin this week's challenge:`,
    url: params.appUrl,
  };
}

export function buildInviteFriendsPayload(params: {
  username?: string;
  weeklyXp: number;
  rank: number;
  totalActivePlayers: number;
  appUrl: string;
}): SocialSharePayload {
  const inviter = params.username ? `@${params.username}` : 'Your friend';
  return {
    title: 'Challenge me on Wordvibe!',
    text: `${inviter} invited you to Wordvibe — daily linked crosswords, brain trivia & faith study! I'm currently Rank #${params.rank} of ${params.totalActivePlayers} active players this week (${params.weeklyXp.toLocaleString()} XP). Tap to play:`,
    url: params.appUrl,
  };
}
