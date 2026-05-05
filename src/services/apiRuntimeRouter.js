import axios from 'axios';
import { getRrgoldApiBaseUrl, getSoniApiBaseUrl } from './apiBaseConfig';

const SONI_HOSTS = ['https://soni.loyalstring.co.in'];
const RRGOLD_HOSTS = ['https://rrgold.loyalstring.co.in'];
const LOCAL_AUTH_HOSTS = ['https://localhost:7095'];

const safeParseUrl = (value) => {
  try {
    return new URL(String(value || ''));
  } catch {
    return null;
  }
};

const mapKnownHost = (host) => {
  if (SONI_HOSTS.includes(host)) return getSoniApiBaseUrl();
  if (RRGOLD_HOSTS.includes(host)) return getRrgoldApiBaseUrl();
  if (LOCAL_AUTH_HOSTS.includes(host)) return getSoniApiBaseUrl();
  return '';
};

export const remapApiUrl = (rawUrl) => {
  const parsed = safeParseUrl(rawUrl);
  if (!parsed) return rawUrl;
  // Sample / RFIDDashboard APIs may live on same host as auth (e.g. localhost:7095) — do not rewrite.
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

