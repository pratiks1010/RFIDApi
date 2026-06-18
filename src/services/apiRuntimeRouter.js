import axios from 'axios';
import { getRrgoldApiBaseUrl, getSoniApiBaseUrl } from './apiBaseConfig';

const SONI_HOSTS = ['https://soni.loyalstring.co.in'];
const RRGOLD_HOSTS = ['https://rrgold.loyalstring.co.in'];
/** Legacy online auth host — offline RRGOLD APIs (ProductMaster, BoxRfid, etc.) use RRGOLD base */
const LOCAL_RRGOLD_AUTH_HOSTS = ['https://localhost:7095', 'http://localhost:7095'];
/** Default offline RRGOLD host — remap to active base when mode or user settings change */
const OFFLINE_RRGOLD_HOSTS = ['http://localhost:8081'];

const safeParseUrl = (value) => {
  try {
    return new URL(String(value || ''));
  } catch {
    return null;
  }
};

const configuredOrigin = (baseUrl) => safeParseUrl(baseUrl)?.origin || '';

const mapKnownHost = (host) => {
  if (SONI_HOSTS.includes(host)) return getSoniApiBaseUrl();
  if (RRGOLD_HOSTS.includes(host)) return getRrgoldApiBaseUrl();
  if (LOCAL_RRGOLD_AUTH_HOSTS.includes(host)) return getRrgoldApiBaseUrl();
  if (OFFLINE_RRGOLD_HOSTS.includes(host)) return getRrgoldApiBaseUrl();
  return '';
};

export const remapApiUrl = (rawUrl) => {
  const parsed = safeParseUrl(rawUrl);
  if (!parsed) return rawUrl;

  const rrgoldOrigin = configuredOrigin(getRrgoldApiBaseUrl());
  const soniOrigin = configuredOrigin(getSoniApiBaseUrl());
  // URL already targets saved offline/online Soni or RRGOLD base — do not rewrite.
  if (rrgoldOrigin && parsed.origin === rrgoldOrigin) return rawUrl;
  if (soniOrigin && parsed.origin === soniOrigin) return rawUrl;

  // These paths keep the request host as built (e.g. Sample on dedicated host).
  if (parsed.pathname.includes('/api/Sample/')) return rawUrl;
  if (parsed.pathname.includes('/api/RFIDDashboard/')) return rawUrl;

  const mappedBase = mapKnownHost(parsed.origin);
  if (!mappedBase) return rawUrl;
  return `${mappedBase}${parsed.pathname}${parsed.search}${parsed.hash}`;
};

let initialized = false;

export const setupApiRuntimeRouter = () => {
  if (initialized) return;
  initialized = true;

  axios.interceptors.request.use((config) => {
    if (typeof config?.url === 'string') {
      return { ...config, url: remapApiUrl(config.url) };
    }
    return config;
  });

  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (typeof input === 'string') {
        return nativeFetch(remapApiUrl(input), init);
      }
      if (input instanceof Request) {
        return nativeFetch(new Request(remapApiUrl(input.url), input), init);
      }
      return nativeFetch(input, init);
    };
  }
};

