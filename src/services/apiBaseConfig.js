const API_MODE = String(process.env.REACT_APP_API_MODE || 'online').trim().toLowerCase();

const ONLINE_SONI_BASE = 'https://soni.loyalstring.co.in';
const ONLINE_RRGOLD_BASE = 'https://rrgold.loyalstring.co.in';
const OFFLINE_SONI_BASE = 'http://localhost:8080';
const OFFLINE_RRGOLD_BASE = 'http://localhost:8081';

const normalizeBase = (value) => String(value || '').trim().replace(/\/$/, '');

const resolveByMode = ({ onlineEnv, offlineEnv, onlineDefault, offlineDefault }) => {
  const online = normalizeBase(process.env[onlineEnv] || onlineDefault);
  const offline = normalizeBase(process.env[offlineEnv] || offlineDefault);
  return API_MODE === 'offline' ? offline : online;
};

export const getApiMode = () => API_MODE;

export const getSoniApiBaseUrl = () => resolveByMode({
  onlineEnv: 'REACT_APP_SONI_API_BASE_URL',
  offlineEnv: 'REACT_APP_SONI_API_BASE_OFFLINE_URL',
  onlineDefault: ONLINE_SONI_BASE,
  offlineDefault: OFFLINE_SONI_BASE,
});

export const getRrgoldApiBaseUrl = () => resolveByMode({
  onlineEnv: 'REACT_APP_RRGOLD_API_BASE_URL',
  offlineEnv: 'REACT_APP_RRGOLD_API_BASE_OFFLINE_URL',
  onlineDefault: ONLINE_RRGOLD_BASE,
  offlineDefault: OFFLINE_RRGOLD_BASE,
});

export const toSoniApiUrl = (apiPath = '') => `${getSoniApiBaseUrl()}${String(apiPath || '').startsWith('/') ? '' : '/'}${String(apiPath || '')}`;
export const toRrgoldApiUrl = (apiPath = '') => `${getRrgoldApiBaseUrl()}${String(apiPath || '').startsWith('/') ? '' : '/'}${String(apiPath || '')}`;

/**
 * Sample In/Out APIs use RRGOLD host by mode by default.
 * Optional overrides:
 * - REACT_APP_SAMPLE_API_BASE_URL (online override)
 * - REACT_APP_SAMPLE_API_BASE_OFFLINE_URL (offline override)
 */
export const getSampleApiBaseUrl = () => resolveByMode({
  onlineEnv: 'REACT_APP_SAMPLE_API_BASE_URL',
  offlineEnv: 'REACT_APP_SAMPLE_API_BASE_OFFLINE_URL',
  onlineDefault: ONLINE_RRGOLD_BASE,
  offlineDefault: OFFLINE_RRGOLD_BASE,
});

export const toSampleApiUrl = (apiPath = '') =>
  `${getSampleApiBaseUrl()}${String(apiPath || '').startsWith('/') ? '' : '/'}${String(apiPath || '')}`;

