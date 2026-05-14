const DB_NAME = 'rfid-local-image-db';
const DB_VERSION = 1;
const STORE_NAME = 'settings';
const DIRECTORY_KEY = 'itemImageDirectoryHandle';
const META_KEY = 'itemImageDirectoryMeta';
const LOCAL_META_FALLBACK = 'itemImageDirectoryMetaLocal';
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];

let openDbPromise = null;
let cachedDirectoryHandle = null;
let cachedDirectoryIndexPromise = null;
let cachedDirectoryIndexHandle = null;
let cachedPermissionHandle = null;
let cachedPermissionGranted = null;
const blobUrlCache = new Map();
const pendingBlobUrlPromises = new Map();
const MAX_BLOB_URL_CACHE_SIZE = 600;
const blobUrlCacheOrder = [];

const setBlobUrlCacheEntry = (key, url) => {
  if (!key || !url) return;
  if (blobUrlCache.has(key)) {
    const idx = blobUrlCacheOrder.indexOf(key);
    if (idx >= 0) blobUrlCacheOrder.splice(idx, 1);
  }
  blobUrlCache.set(key, url);
  blobUrlCacheOrder.push(key);
  while (blobUrlCacheOrder.length > MAX_BLOB_URL_CACHE_SIZE) {
    const oldestKey = blobUrlCacheOrder.shift();
    if (!oldestKey) continue;
    const oldestUrl = blobUrlCache.get(oldestKey);
    if (oldestUrl && String(oldestUrl).startsWith('blob:')) URL.revokeObjectURL(oldestUrl);
    blobUrlCache.delete(oldestKey);
  }
};

const clearBlobUrlCache = () => {
  blobUrlCache.forEach((url) => {
    if (url && String(url).startsWith('blob:')) URL.revokeObjectURL(url);
  });
  blobUrlCache.clear();
  blobUrlCacheOrder.length = 0;
};

const openDb = () => {
  if (openDbPromise) return openDbPromise;
  openDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Unable to open local database.'));
  });
  return openDbPromise;
};

const idbGet = async (key) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to read local setting.'));
  });
};

const idbSet = async (key, value) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Failed to save local setting.'));
  });
};

const idbDelete = async (key) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Failed to delete local setting.'));
  });
};

const normalizeBaseName = (value) => String(value || '').trim().toLowerCase();

const getFileExtension = (fileName) => {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : '';
};

const getFileBaseName = (fileName) => {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(0, idx) : fileName;
};

const isSupportedImageName = (fileName) => SUPPORTED_EXTENSIONS.includes(getFileExtension(fileName));

const ensureDirectoryReadPermission = async (directoryHandle) => {
  if (!directoryHandle) return false;
  if (cachedPermissionHandle === directoryHandle && typeof cachedPermissionGranted === 'boolean') {
    return cachedPermissionGranted;
  }
  if (typeof directoryHandle.queryPermission !== 'function') return true;
  const current = await directoryHandle.queryPermission({ mode: 'read' });
  if (current === 'granted') {
    cachedPermissionHandle = directoryHandle;
    cachedPermissionGranted = true;
    return true;
  }
  if (typeof directoryHandle.requestPermission === 'function') {
    const requested = await directoryHandle.requestPermission({ mode: 'read' });
    const granted = requested === 'granted';
    cachedPermissionHandle = directoryHandle;
    cachedPermissionGranted = granted;
    return granted;
  }
  cachedPermissionHandle = directoryHandle;
  cachedPermissionGranted = false;
  return false;
};

const buildDirectoryIndex = async (directoryHandle) => {
  const index = new Map();
  for await (const entry of directoryHandle.values()) {
    if (!entry || entry.kind !== 'file') continue;
    if (!isSupportedImageName(entry.name)) continue;
    const key = normalizeBaseName(getFileBaseName(entry.name));
    if (!key || index.has(key)) continue;
    index.set(key, entry);
  }
  return index;
};

const ensureDirectoryIndex = async (directoryHandle) => {
  if (!directoryHandle) return null;
  if (cachedDirectoryIndexPromise && cachedDirectoryIndexHandle === directoryHandle) {
    return cachedDirectoryIndexPromise;
  }
  cachedDirectoryIndexHandle = directoryHandle;
  cachedDirectoryIndexPromise = buildDirectoryIndex(directoryHandle);
  return cachedDirectoryIndexPromise;
};

export const isLocalItemImageFolderSupported = () =>
  typeof window !== 'undefined' &&
  typeof window.indexedDB !== 'undefined' &&
  typeof window.showDirectoryPicker === 'function';

export const saveItemImageDirectoryHandle = async (directoryHandle) => {
  await idbSet(DIRECTORY_KEY, directoryHandle);
  const meta = {
    name: String(directoryHandle?.name || ''),
    savedAt: new Date().toISOString(),
  };
  await idbSet(META_KEY, meta);
  localStorage.setItem(LOCAL_META_FALLBACK, JSON.stringify(meta));
  cachedDirectoryHandle = directoryHandle;
  cachedDirectoryIndexPromise = null;
  cachedDirectoryIndexHandle = null;
  cachedPermissionHandle = null;
  cachedPermissionGranted = null;
  clearBlobUrlCache();
};

export const getItemImageDirectoryMeta = async () => {
  try {
    const meta = await idbGet(META_KEY);
    if (meta && typeof meta === 'object') return meta;
  } catch {
    // fallback below
  }
  try {
    const raw = localStorage.getItem(LOCAL_META_FALLBACK);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

export const getItemImageDirectoryHandle = async () => {
  if (cachedDirectoryHandle) return cachedDirectoryHandle;
  const handle = await idbGet(DIRECTORY_KEY);
  cachedDirectoryHandle = handle || null;
  return cachedDirectoryHandle;
};

export const clearItemImageDirectoryHandle = async () => {
  await idbDelete(DIRECTORY_KEY);
  await idbDelete(META_KEY);
  localStorage.removeItem(LOCAL_META_FALLBACK);
  cachedDirectoryHandle = null;
  cachedDirectoryIndexPromise = null;
  cachedDirectoryIndexHandle = null;
  cachedPermissionHandle = null;
  cachedPermissionGranted = null;
  clearBlobUrlCache();
};

export const warmupLocalItemImageIndex = async () => {
  if (!isLocalItemImageFolderSupported()) return { ok: false, count: 0 };
  const directoryHandle = await getItemImageDirectoryHandle();
  if (!directoryHandle) return { ok: false, count: 0 };
  const granted = await ensureDirectoryReadPermission(directoryHandle);
  if (!granted) return { ok: false, count: 0 };
  const index = await ensureDirectoryIndex(directoryHandle);
  return { ok: true, count: index?.size || 0 };
};

export const resolveLocalItemImageBlobUrl = async (itemCode) => {
  const normalizedCode = normalizeBaseName(itemCode);
  if (!normalizedCode) return '';
  const cached = blobUrlCache.get(normalizedCode);
  if (cached) return cached;
  const pending = pendingBlobUrlPromises.get(normalizedCode);
  if (pending) return pending;
  const resolver = (async () => {
    if (!isLocalItemImageFolderSupported()) return '';
    const directoryHandle = await getItemImageDirectoryHandle();
    if (!directoryHandle) return '';
    const granted = await ensureDirectoryReadPermission(directoryHandle);
    if (!granted) return '';
    const index = await ensureDirectoryIndex(directoryHandle);
    const fileHandle = index?.get(normalizedCode);
    if (!fileHandle) return '';
    const file = await fileHandle.getFile();
    const url = URL.createObjectURL(file);
    setBlobUrlCacheEntry(normalizedCode, url);
    return url;
  })();
  pendingBlobUrlPromises.set(normalizedCode, resolver);
  try {
    return await resolver;
  } finally {
    pendingBlobUrlPromises.delete(normalizedCode);
  }
};

export const resolveLocalItemImageBlobUrls = async (
  itemCodes,
  { concurrency = 4 } = {}
) => {
  const uniqueCodes = Array.from(
    new Set((Array.isArray(itemCodes) ? itemCodes : []).map(normalizeBaseName).filter(Boolean))
  );
  if (!uniqueCodes.length) return {};
  const workerCount = Math.max(1, Math.min(Number(concurrency) || 4, uniqueCodes.length));
  const results = {};
  let cursor = 0;

  const worker = async () => {
    while (cursor < uniqueCodes.length) {
      const index = cursor;
      cursor += 1;
      const code = uniqueCodes[index];
      try {
        const url = await resolveLocalItemImageBlobUrl(code);
        if (url) results[code] = url;
      } catch {
        // ignore per-item resolve failures to keep the grid responsive
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
};

export const canResolveLocalItemImages = async () => {
  if (!isLocalItemImageFolderSupported()) return false;
  const handle = await getItemImageDirectoryHandle();
  if (!handle) return false;
  return ensureDirectoryReadPermission(handle);
};
