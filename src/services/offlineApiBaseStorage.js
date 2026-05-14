const STORAGE_SONI = 'rfid_offline_user_soni_api_base';
const STORAGE_RRGOLD = 'rfid_offline_user_rrgold_api_base';

export const OFFLINE_API_BASES_EVENT = 'rfid-offline-api-bases-changed';

export const DEFAULT_OFFLINE_SONI_BASE = 'http://localhost:8080';
export const DEFAULT_OFFLINE_RRGOLD_BASE = 'http://localhost:8081';

const normalizeBase = (value) => String(value || '').trim().replace(/\/$/, '');

/** Returns normalized origin[+path] or '' if invalid. */
export const parseApiBaseUrl = (raw) => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    if (!u.hostname) return '';
    const path = u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : '';
    return normalizeBase(`${u.origin}${path}`);
  } catch {
    return '';
  }
};

const readStored = (key) => {
  try {
    if (typeof localStorage === 'undefined') return '';
    const parsed = parseApiBaseUrl(localStorage.getItem(key));
    return parsed;
  } catch {
    return '';
  }
};

export const getUserOfflineSoniBase = () => readStored(STORAGE_SONI);

export const getUserOfflineRrgoldBase = () => readStored(STORAGE_RRGOLD);

export const setUserOfflineSoniBase = (raw) => {
  const v = parseApiBaseUrl(raw);
  if (!v) {
    try {
      localStorage.removeItem(STORAGE_SONI);
    } catch {
      /* ignore */
    }
    return '';
  }
  try {
    localStorage.setItem(STORAGE_SONI, v);
  } catch {
    /* ignore */
  }
  return v;
};

export const setUserOfflineRrgoldBase = (raw) => {
  const v = parseApiBaseUrl(raw);
  if (!v) {
    try {
      localStorage.removeItem(STORAGE_RRGOLD);
    } catch {
      /* ignore */
    }
    return '';
  }
  try {
    localStorage.setItem(STORAGE_RRGOLD, v);
  } catch {
    /* ignore */
  }
  return v;
};

export const clearUserOfflineApiBases = () => {
  try {
    localStorage.removeItem(STORAGE_SONI);
    localStorage.removeItem(STORAGE_RRGOLD);
  } catch {
    /* ignore */
  }
};

export const notifyOfflineApiBasesChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OFFLINE_API_BASES_EVENT));
  }
};
