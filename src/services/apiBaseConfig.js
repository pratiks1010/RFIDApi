import { getUserOfflineRrgoldBase, getUserOfflineSoniBase } from './offlineApiBaseStorage';

const API_MODE = String(process.env.REACT_APP_API_MODE || 'online').trim().toLowerCase();

const ONLINE_SONI_BASE = 'https://soni.loyalstring.co.in';
const ONLINE_RRGOLD_BASE = 'https://rrgold.loyalstring.co.in';
const OFFLINE_SONI_BASE = 'http://localhost:8080';
const OFFLINE_RRGOLD_BASE = 'http://localhost:8081';

const normalizeBase = (value) => String(value || '').trim().replace(/\/$/, '');

const resolveOfflineBase = ({ offlineEnv, offlineDefault, userGetter }) => {
  const user = typeof userGetter === 'function' ? normalizeBase(userGetter()) : '';
  if (user) return user;
  return normalizeBase(process.env[offlineEnv] || offlineDefault);
};

const resolveByMode = ({ onlineEnv, offlineEnv, onlineDefault, offlineDefault, userOfflineGetter }) => {
  const online = normalizeBase(process.env[onlineEnv] || onlineDefault);
  if (API_MODE !== 'offline') return online;
  return resolveOfflineBase({ offlineEnv, offlineDefault, userGetter: userOfflineGetter });
};

export const getApiMode = () => API_MODE;

export const getSoniApiBaseUrl = () => resolveByMode({
  onlineEnv: 'REACT_APP_SONI_API_BASE_URL',
  offlineEnv: 'REACT_APP_SONI_API_BASE_OFFLINE_URL',
  onlineDefault: ONLINE_SONI_BASE,
  offlineDefault: OFFLINE_SONI_BASE,
  userOfflineGetter: getUserOfflineSoniBase,
});

export const getRrgoldApiBaseUrl = () => resolveByMode({
  onlineEnv: 'REACT_APP_RRGOLD_API_BASE_URL',
  offlineEnv: 'REACT_APP_RRGOLD_API_BASE_OFFLINE_URL',
  onlineDefault: ONLINE_RRGOLD_BASE,
  offlineDefault: OFFLINE_RRGOLD_BASE,
  userOfflineGetter: getUserOfflineRrgoldBase,
});

export const toSoniApiUrl = (apiPath = '') => `${getSoniApiBaseUrl()}${String(apiPath || '').startsWith('/') ? '' : '/'}${String(apiPath || '')}`;
export const toRrgoldApiUrl = (apiPath = '') => `${getRrgoldApiBaseUrl()}${String(apiPath || '').startsWith('/') ? '' : '/'}${String(apiPath || '')}`;

/**
 * Sample In/Out APIs use RRGOLD host by mode by default.
 * Optional overrides:
 * - REACT_APP_SAMPLE_API_BASE_URL (online override)
 * - REACT_APP_SAMPLE_API_BASE_OFFLINE_URL (offline override)
 */
export const getSampleApiBaseUrl = () => {
  if (API_MODE === 'offline') {
    const sampleEnv = normalizeBase(process.env.REACT_APP_SAMPLE_API_BASE_OFFLINE_URL);
    if (sampleEnv) return sampleEnv;
    const userRrgold = normalizeBase(getUserOfflineRrgoldBase());
    if (userRrgold) return userRrgold;
  }
  return resolveByMode({
    onlineEnv: 'REACT_APP_SAMPLE_API_BASE_URL',
    offlineEnv: 'REACT_APP_SAMPLE_API_BASE_OFFLINE_URL',
    onlineDefault: ONLINE_RRGOLD_BASE,
    offlineDefault: OFFLINE_RRGOLD_BASE,
  });
};

export const toSampleApiUrl = (apiPath = '') =>
  `${getSampleApiBaseUrl()}${String(apiPath || '').startsWith('/') ? '' : '/'}${String(apiPath || '')}`;

