import {
  sanitizeAvatarDataUrl,
  type LocalUserAccount,
  type SocialSharePayload,
} from '../game/userAccountLogic';

const ACCOUNT_LOCAL_KEY = 'wordvibe_user_account_v1';
const IDB_NAME = 'wordvibe_offline_accounts_db';
const IDB_STORE = 'profiles';
const IDB_RECORD_KEY = 'current_user';

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function openAccountDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function normalizeStoredAccount(raw: Partial<LocalUserAccount> | null): LocalUserAccount | null {
  if (!raw || typeof raw.username !== 'string' || !raw.username.trim()) {
    return null;
  }
  const cleanDataUrl = sanitizeAvatarDataUrl(raw.avatarDataUrl);
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `user:${raw.username.toLowerCase()}`,
    realName: typeof raw.realName === 'string' ? raw.realName : raw.username,
    username: raw.username.trim(),
    email: typeof raw.email === 'string' ? raw.email : '',
    passwordHash: typeof raw.passwordHash === 'string' ? raw.passwordHash : '',
    passwordSalt: typeof raw.passwordSalt === 'string' ? raw.passwordSalt : '',
    avatarType: raw.avatarType === 'photo' && cleanDataUrl ? 'photo' : 'builtin',
    builtinAvatarId: raw.builtinAvatarId || 'crown',
    avatarDataUrl: cleanDataUrl,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

export function loadLocalUserAccount(): LocalUserAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACCOUNT_LOCAL_KEY);
    if (!raw) return null;
    return normalizeStoredAccount(JSON.parse(raw) as Partial<LocalUserAccount>);
  } catch {
    return null;
  }
}

export async function hydrateLocalUserAccountFromIdb(): Promise<LocalUserAccount | null> {
  const fromLs = loadLocalUserAccount();
  if (fromLs) return fromLs;

  const db = await openAccountDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_RECORD_KEY);
      req.onsuccess = () => {
        const parsed = normalizeStoredAccount(req.result as Partial<LocalUserAccount> | null);
        if (parsed && typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(ACCOUNT_LOCAL_KEY, JSON.stringify(parsed));
          } catch {
            // ignore quota failure
          }
        }
        resolve(parsed);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveLocalUserAccount(account: LocalUserAccount): Promise<void> {
  const cleanAccount = normalizeStoredAccount(account) || account;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ACCOUNT_LOCAL_KEY, JSON.stringify(cleanAccount));
    } catch {
      // Ignore quota exceeded on localStorage; IndexedDB still saves full thumbnail
    }
  }

  const db = await openAccountDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(cleanAccount, IDB_RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function resizeImageFileToThumbnail(
  file: File,
  maxSize = 128
): Promise<string> {
  const mime = (file.type || '').toLowerCase();
  if (mime && (!mime.startsWith('image/') || mime.includes('svg'))) {
    throw new Error('Please choose a JPG, PNG, GIF, or WebP photo.');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('Please choose a photo smaller than 12 MB.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not read the selected photo.'));
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = maxSize;
    canvas.height = maxSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Image resizing is unavailable in this browser.');
    }

    // Center-crop to square thumbnail for crisp circular display
    const srcMin = Math.min(img.naturalWidth || maxSize, img.naturalHeight || maxSize);
    const sx = Math.max(0, Math.floor(((img.naturalWidth || maxSize) - srcMin) / 2));
    const sy = Math.max(0, Math.floor(((img.naturalHeight || maxSize) - srcMin) / 2));

    ctx.drawImage(img, sx, sy, srcMin, srcMin, 0, 0, maxSize, maxSize);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
    const safeUrl = sanitizeAvatarDataUrl(dataUrl);
    if (!safeUrl) {
      throw new Error('Unable to save photo thumbnail.');
    }
    return safeUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function copyMessageText(message: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
      return true;
    }
  } catch {
    // Fall through to execCommand fallback
  }

  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = message;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function shareOrCopyMessage(
  payload: SocialSharePayload
): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const fullMessage = payload.url ? `${payload.text} ${payload.url}` : payload.text;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'cancelled';
      }
      // Native share rejected (e.g. desktop / iframe permissions) -> fall back to clipboard copy
    }
  }

  const copied = await copyMessageText(fullMessage);
  return copied ? 'copied' : 'failed';
}
