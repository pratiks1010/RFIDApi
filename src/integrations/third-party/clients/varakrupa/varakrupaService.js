import axios from 'axios';

const varakrupaHttp = axios.create();

const USERNAME = (
  process.env.REACT_APP_VARAKRUPA_USERNAME ||
  'varakrupa'
).trim();

const PASSWORD = (
  process.env.REACT_APP_VARAKRUPA_PASSWORD ||
  'varakrupa@123'
).trim();

/*
  Localhost proxy URL.

  setupProxy.js:
  /api/Varakrupa/Inventory_stock
  -> https://varakrupa.jewelmarts.com/callback/Inventory_stock
  /api/Varakrupa/SoldProducts
  -> https://varakrupa.jewelmarts.com/callback/SoldProducts
  /api/Varakrupa/UserData
  -> https://varakrupa.jewelmarts.com/callback/UserData
*/
// const VARAKRUPA_API_URL = '/api/Varakrupa/Inventory_stock';
const VARAKRUPA_API_URL = 'https://varakrupa.jewelmarts.com/callback/Inventory_stock';
const VARAKRUPA_SOLD_PRODUCTS_URL =
  'https://varakrupa.jewelmarts.com/callback/SoldProducts';
const VARAKRUPA_USER_DATA_URL =
  'https://varakrupa.jewelmarts.com/callback/UserData';

const buildAuthPayload = () => {
  const formData = new FormData();
  formData.append('username', USERNAME);
  formData.append('password', PASSWORD);
  return formData;
};

const isElectronRuntime = () =>
  typeof window !== 'undefined' &&
  !!window.electronAPI &&
  typeof window.electronAPI.varakrupaInventoryStock === 'function';

const buildDebugMessage = (err, requestUrl) => {
  const pageProtocol =
    typeof window !== 'undefined' ? window.location?.protocol : '';

  const isNetworkOnly = err?.code === 'ERR_NETWORK' && !err?.response;

  const timeoutMessage = String(err?.message || '')
    .toLowerCase()
    .includes('timeout');

  const isGateway502 = Number(err?.response?.status) === 502;

  const upstreamMessage = String(
    err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.response?.data?.msg ||
      ''
  ).toLowerCase();

  if (timeoutMessage) {
    return `Timeout while calling Varakrupa API proxy. Check if ${requestUrl} is reachable from localhost.`;
  }

  if (isGateway502 && upstreamMessage.includes('timed out')) {
    return `Proxy timed out while reaching upstream Varakrupa API.`;
  }

  if (isGateway502) {
    return `Proxy reached but upstream Varakrupa API failed. Check setupProxy.js target/pathRewrite.`;
  }

  if (isNetworkOnly) {
    return `Network/CORS block while calling ${requestUrl}. Make sure React dev server was restarted after setupProxy.js changes.`;
  }

  if (pageProtocol && requestUrl?.startsWith('http')) {
    return `Request is using direct URL instead of localhost proxy. Use /api/Varakrupa/Inventory_stock for localhost.`;
  }

  return '';
};

const createVarakrupaError = (err, requestUrl) => {
  const serverMsg =
    err?.response?.data?.msg ||
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    (typeof err?.response?.data === 'string' ? err.response.data : '');

  const upstreamError = err?.response?.data?.error;
  const upstreamErrNo = err?.response?.data?.errno;

  const fallback = err?.message || 'Varakrupa API request failed';
  const debugHint = buildDebugMessage(err, requestUrl);

  const message = [
    serverMsg || fallback,
    upstreamError && upstreamError !== serverMsg
      ? `upstreamError: ${upstreamError}`
      : '',
    upstreamErrNo != null ? `errno: ${upstreamErrNo}` : '',
    debugHint,
  ]
    .filter(Boolean)
    .join(' | ');

  const wrapped = new Error(message);

  wrapped.name = 'VarakrupaApiError';
  wrapped.debug = {
    requestUrl,
    httpStatus: err?.response?.status || null,
    axiosCode: err?.code || null,
    pageUrl: typeof window !== 'undefined' ? window.location?.href : '',
    pageProtocol:
      typeof window !== 'undefined' ? window.location?.protocol : '',
  };

  wrapped.cause = err;

  return wrapped;
};

export const normalizeVarakrupaRows = (payload) => {
  if (Array.isArray(payload)) return payload;

  if (!payload || typeof payload !== 'object') return [];

  if (Array.isArray(payload.product_data)) return payload.product_data;
  if (Array.isArray(payload.user_data)) return payload.user_data;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.d)) return payload.d;

  if (payload.d && typeof payload.d === 'string') {
    try {
      const parsed = JSON.parse(payload.d);

      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.product_data)) {
        return parsed.product_data;
      }
      if (parsed && Array.isArray(parsed.data)) {
        return parsed.data;
      }
    } catch {
      return [];
    }
  }

  return [];
};

export const isVarakrupaSuccessResponse = (payload) => {
  if (!payload || typeof payload !== 'object') return false;

  const ack = String(payload.ack ?? '').trim();

  return (
    ack === '1' ||
    payload.success === true ||
    Array.isArray(payload.product_data) ||
    Array.isArray(payload.user_data)
  );
};

const callVarakrupaApi = async (requestUrl) => {
  try {
    if (isElectronRuntime()) {
      const response = await window.electronAPI.varakrupaInventoryStock({
        username: USERNAME,
        password: PASSWORD,
        url: requestUrl,
      });

      if (!response?.ok) {
        const wrapped = new Error(
          response?.error || 'Varakrupa electron call failed'
        );

        wrapped.name = 'VarakrupaApiError';
        wrapped.debug = {
          requestUrl,
          httpStatus: response?.debug?.status || null,
          axiosCode: response?.debug?.code || null,
          pageUrl: typeof window !== 'undefined' ? window.location?.href : '',
          pageProtocol:
            typeof window !== 'undefined' ? window.location?.protocol : '',
          transport: 'electron-ipc',
        };

        throw wrapped;
      }

      return response.data;
    }

    const { data } = await varakrupaHttp.post(
      requestUrl,
      buildAuthPayload(),
      {
        timeout: 60000,
        headers: {
          Accept: 'application/json',
        },
        params: {
          _ts: Date.now(),
        },
      }
    );

    return data;
  } catch (err) {
    throw createVarakrupaError(err, requestUrl);
  }
};

const callVarakrupaInventoryStock = async () => {
  return callVarakrupaApi(VARAKRUPA_API_URL);
};

const callVarakrupaSoldProducts = async () => {
  return callVarakrupaApi(VARAKRUPA_SOLD_PRODUCTS_URL);
};

const callVarakrupaUserData = async () => {
  return callVarakrupaApi(VARAKRUPA_USER_DATA_URL);
};

export const getVarakrupaTestService = async () => {
  const data = await callVarakrupaInventoryStock();

  return {
    status: isVarakrupaSuccessResponse(data),
    message: data?.msg || '',
    data,
  };
};

export const getVarakrupaStockData = async () => {
  return callVarakrupaInventoryStock();
};

/** Sold products list — https://varakrupa.jewelmarts.com/callback/SoldProducts */
export const getVarakrupaSoldProducts = async () => {
  return callVarakrupaSoldProducts();
};

/** Users for dropdown — https://varakrupa.jewelmarts.com/callback/UserData */
export const getVarakrupaUserData = async () => {
  return callVarakrupaUserData();
};

export const normalizeVarakrupaUsers = (payload) => {
  const rows = Array.isArray(payload?.user_data)
    ? payload.user_data
    : normalizeVarakrupaRows(payload);

  return rows
    .map((row) => ({
      Id: String(row?.user_id ?? row?.Id ?? '').trim(),
      full_name: String(row?.full_name ?? row?.Name ?? '').trim(),
      user_id: String(row?.user_id ?? row?.Id ?? '').trim(),
    }))
    .filter((row) => row.Id);
};

export const getVarakrupaBaseUrl = () => VARAKRUPA_API_URL;

export const getVarakrupaSoldProductsUrl = () => VARAKRUPA_SOLD_PRODUCTS_URL;

export const getVarakrupaUserDataUrl = () => VARAKRUPA_USER_DATA_URL;

export const getVarakrupaDirectBaseUrl = () => VARAKRUPA_API_URL;

export const hasVarakrupaCredentials = () => !!USERNAME && !!PASSWORD;