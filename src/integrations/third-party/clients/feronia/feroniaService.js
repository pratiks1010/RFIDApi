import axios from 'axios';
const feroniaHttp = axios.create();

const AUTH_TOKEN = (
  process.env.REACT_APP_FERONIA_AUTH_TOKEN ||
  process.env.REACT_APP_TAMANNAAH_BS_AUTH_TOKEN ||
  'EC3276D0-6700-4B2A-82D4-A1C028827625'
).trim();

const DEFAULT_DIRECT_BASE = 'http://192.168.29.245:93';
const DEFAULT_BROWSER_PROXY = '/feronia-proxy.php';
const FERONIA_PATH = (process.env.REACT_APP_FERONIA_API_PATH || '/api/TamannaahBS').trim();
const normalizedPath = FERONIA_PATH.startsWith('/') ? FERONIA_PATH : `/${FERONIA_PATH}`;
const FERONIA_BASE = process.env.REACT_APP_FERONIA_API_URL || DEFAULT_DIRECT_BASE;
const baseURL = `${FERONIA_BASE.replace(/\/$/, '')}${normalizedPath}`;
const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
const browserProxyUrl = process.env.REACT_APP_FERONIA_BROWSER_PROXY || DEFAULT_BROWSER_PROXY;

const headers = () => ({
  AuthorizationToken: AUTH_TOKEN,
  Accept: 'application/json',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
});

const isElectronRuntime = () =>
  typeof window !== 'undefined' &&
  !!window.electronAPI &&
  typeof window.electronAPI.feroniaTestService === 'function' &&
  typeof window.electronAPI.feroniaGetStockOnHand === 'function';

const buildDebugMessage = (err, requestUrl) => {
  const pageProtocol = typeof window !== 'undefined' ? window.location?.protocol : '';
  const apiProtocol = String(requestUrl || '').startsWith('https://') ? 'https:' : 'http:';
  const isMixedContent = pageProtocol === 'https:' && apiProtocol === 'http:';
  const isNetworkOnly = err?.code === 'ERR_NETWORK' && !err?.response;
  const timeoutMessage = String(err?.message || '').toLowerCase().includes('timeout');
  const upstreamMessage = String(err?.response?.data?.error || err?.response?.data?.message || '').toLowerCase();
  const isGateway502 = Number(err?.response?.status) === 502;
  const isPrivateUpstream = /http:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(String(requestUrl || ''));

  if (isMixedContent && isNetworkOnly) {
    return `Blocked by browser security (HTTPS page cannot call HTTP LAN API). Open app on HTTP/Electron or use same-origin backend proxy. URL: ${requestUrl}`;
  }
  if (isGateway502 && isPrivateUpstream) {
    return `Proxy reached but upstream failed (502). Hosting server likely cannot access private LAN IP (${requestUrl}). Move proxy to same LAN/VPN as Feronia API or expose Feronia API on reachable HTTPS endpoint.`;
  }
  if (timeoutMessage) {
    return `Timeout while calling Feronia API. Check if ${requestUrl} is reachable from this machine/network.`;
  }
  if (isGateway502 && upstreamMessage.includes('timed out')) {
    return `Proxy timed out while reaching upstream API ${requestUrl}. Check network route/firewall from hosting server to Feronia server.`;
  }
  if (isNetworkOnly) {
    return `Network/CORS block while calling ${requestUrl}. Verify API CORS/private-network access for browser requests.`;
  }
  return '';
};

const createFeroniaError = (err, requestUrl) => {
  const serverMsg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    (typeof err?.response?.data === 'string' ? err.response.data : '');
  const upstreamError = err?.response?.data?.error;
  const upstreamErrNo = err?.response?.data?.errno;
  const fallback = err?.message || 'Feronia API request failed';
  const debugHint = buildDebugMessage(err, requestUrl);
  const message = [
    serverMsg || fallback,
    upstreamError && upstreamError !== serverMsg ? `upstreamError: ${upstreamError}` : '',
    upstreamErrNo != null ? `errno: ${upstreamErrNo}` : '',
    debugHint,
  ].filter(Boolean).join(' | ');
  const wrapped = new Error(message);
  wrapped.name = 'FeroniaApiError';
  wrapped.debug = {
    requestUrl,
    httpStatus: err?.response?.status || null,
    axiosCode: err?.code || null,
    pageUrl: typeof window !== 'undefined' ? window.location?.href : '',
    pageProtocol: typeof window !== 'undefined' ? window.location?.protocol : '',
  };
  wrapped.cause = err;
  return wrapped;
};

const callFeroniaGet = async (path) => {
  const cleanPath = String(path || '').replace(/^\//, '');
  const requestUrl = `${baseURL}/${cleanPath}`;
  try {
    if (isElectronRuntime()) {
      const response = cleanPath === 'TestService'
        ? await window.electronAPI.feroniaTestService(AUTH_TOKEN)
        : await window.electronAPI.feroniaGetStockOnHand(AUTH_TOKEN);

      if (!response?.ok) {
        const wrapped = new Error(response?.error || 'Feronia electron call failed');
        wrapped.name = 'FeroniaApiError';
        wrapped.debug = {
          requestUrl,
          httpStatus: response?.debug?.status || null,
          axiosCode: response?.debug?.code || null,
          pageUrl: typeof window !== 'undefined' ? window.location?.href : '',
          pageProtocol: typeof window !== 'undefined' ? window.location?.protocol : '',
          transport: 'electron-ipc',
        };
        throw wrapped;
      }
      return response.data;
    }

    const { data } = isHttps
      ? await feroniaHttp.get(browserProxyUrl, {
          timeout: 45000,
          headers: headers(),
          params: { path: cleanPath, _ts: Date.now() },
        })
      : await feroniaHttp.get(requestUrl, {
          timeout: 45000,
          headers: headers(),
          params: { _ts: Date.now() },
        });
    return data;
  } catch (err) {
    throw createFeroniaError(err, requestUrl);
  }
};

export const getFeroniaTestService = async () => {
  return callFeroniaGet('/TestService');
};

export const getFeroniaStockData = async () => {
  return callFeroniaGet('/GetStockOnHand');
};

export const getFeroniaBaseUrl = () => (isHttps ? `${browserProxyUrl}?path=` : baseURL);
export const getFeroniaDirectBaseUrl = () => baseURL;
export const hasFeroniaAuthToken = () => !!AUTH_TOKEN;
