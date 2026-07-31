import axios from 'axios';
import { toSoniApiUrl } from '../../../../services/apiBaseConfig';

const varakrupaHttp = axios.create();

const getDeleteAllCustomersUrl = () =>
  toSoniApiUrl('/api/ClientOnboarding/DeleteAllCustomers');
const getAddBulkCustomerUrl = () =>
  toSoniApiUrl('/api/ClientOnboarding/AddBulkCustomer');
const getGetAllCustomerUrl = () =>
  toSoniApiUrl('/api/ClientOnboarding/GetAllCustomer');
const getAddCustomerUrl = () =>
  toSoniApiUrl('/api/ClientOnboarding/AddCustomer');

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
const VARAKRUPA_STOCK_SELL_URL =
  'https://varakrupa.jewelmarts.com/callback/StockSell';

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

/**
 * Sync sold items — https://varakrupa.jewelmarts.com/callback/StockSell
 * form-data: username, password, rfid_value, voucher_id, user_id
 */
export const postVarakrupaStockSell = async ({
  rfidValue,
  voucherId,
  userId,
}) => {
  const rfid = String(rfidValue || '').trim();
  const voucher = String(voucherId || '').trim();
  const uid = String(userId || '').trim();

  if (!rfid) throw new Error('RFID value is required for StockSell.');
  if (!voucher) throw new Error('Delivery Challan No (voucher_id) is required.');
  if (!uid) throw new Error('User ID is required for StockSell.');

  const formData = buildAuthPayload();
  formData.append('rfid_value', rfid);
  formData.append('voucher_id', voucher);
  formData.append('user_id', uid);

  const requestUrl = VARAKRUPA_STOCK_SELL_URL;

  try {
    if (isElectronRuntime()) {
      const response = await window.electronAPI.varakrupaInventoryStock({
        username: USERNAME,
        password: PASSWORD,
        url: requestUrl,
        rfid_value: rfid,
        voucher_id: voucher,
        user_id: uid,
      });

      if (!response?.ok) {
        throw createVarakrupaError(
          {
            message: response?.error || 'Varakrupa StockSell electron call failed',
            response: { status: response?.debug?.status, data: response?.data },
            code: response?.debug?.code,
          },
          requestUrl
        );
      }

      return response.data;
    }

    const { data } = await varakrupaHttp.post(requestUrl, formData, {
      timeout: 60000,
      headers: {
        Accept: 'application/json',
      },
      params: {
        _ts: Date.now(),
      },
    });

    return data;
  } catch (err) {
    if (err?.name === 'VarakrupaApiError') throw err;
    throw createVarakrupaError(err, requestUrl);
  }
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

/**
 * Map Varakrupa UserData → LoyalString AddBulkCustomer rows.
 * FirstName = full_name, LastName = user_id
 */
export const mapVarakrupaUsersToBulkCustomers = (payload) =>
  normalizeVarakrupaUsers(payload)
    .map((user) => ({
      FirstName: user.full_name || user.user_id,
      LastName: user.user_id,
    }))
    .filter((row) => row.FirstName || row.LastName);

const countListItems = (data) => {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data.data)) return data.data.length;
  if (Array.isArray(data.result)) return data.result.length;
  if (Array.isArray(data.Result)) return data.Result.length;
  if (Array.isArray(data.customers)) return data.customers.length;
  return 0;
};

/** Fallback when AddBulkCustomer is not deployed yet — one-by-one AddCustomer. */
const addCustomersOneByOne = async (clientCode, customers, authHeaders) => {
  const url = getAddCustomerUrl();
  let createdCount = 0;
  let skippedCount = 0;
  const errors = [];

  for (const row of customers) {
    try {
      const res = await axios.post(
        url,
        {
          ClientCode: clientCode,
          FirstName: row.FirstName || '',
          LastName: row.LastName || '',
          CompanyName: '',
          Email: '',
          Mobile: '',
          AadharNumber: '0',
          PanNumber: '',
          Remarks: '',
          Street: '',
          Area: '',
          Town: '',
          City: '',
          Country: 'India',
          State: '',
          Pincode: '',
        },
        { headers: authHeaders }
      );

      const body = res?.data;
      const failed =
        body?.success === false ||
        (typeof body?.message === 'string' &&
          /error|fail|invalid|duplicate/i.test(body.message) &&
          !/success|created|added/i.test(body.message));

      if (failed) {
        skippedCount += 1;
        errors.push(
          `${row.FirstName}/${row.LastName}: ${body?.message || 'failed'}`
        );
      } else {
        createdCount += 1;
      }
    } catch (err) {
      skippedCount += 1;
      errors.push(
        `${row.FirstName}/${row.LastName}: ${
          err?.response?.data?.message || err?.message || 'request failed'
        }`
      );
    }
  }

  return {
    success: createdCount > 0,
    createdCount,
    skippedCount,
    totalRequested: customers.length,
    errors: errors.length ? errors : null,
    message: `Created ${createdCount} customer(s) via AddCustomer fallback. Skipped ${skippedCount}.`,
    usedFallback: true,
  };
};

/**
 * Background sync after stock push:
 * 1) Fetch Varakrupa UserData
 * 2) DeleteAllCustomers (soni)
 * 3) GetAllCustomer (soni, background verify)
 * 4) AddBulkCustomer (soni) — falls back to AddCustomer if bulk route missing
 * No UI — callers should not surface this to the user.
 */
export const syncVarakrupaUsersToLoyalstring = async (clientCode, token) => {
  const code = String(clientCode || '').trim();
  if (!code) {
    throw new Error('ClientCode is required for customer sync.');
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // 1) Varakrupa users → bulk payload
  const userPayload = await getVarakrupaUserData();
  const customers = mapVarakrupaUsersToBulkCustomers(userPayload);
  console.log(
    '[Varakrupa] UserData fetched for sync:',
    customers.length,
    'user(s)'
  );

  if (!customers.length) {
    return {
      success: true,
      deletedCount: 0,
      createdCount: 0,
      message: 'No Varakrupa users to sync.',
    };
  }

  // 2) Delete all existing LoyalString customers for this client
  const deleteRes = await axios.post(
    getDeleteAllCustomersUrl(),
    { ClientCode: code },
    { headers: authHeaders }
  );

  const deleteBody = deleteRes?.data || {};
  console.log('[Varakrupa] DeleteAllCustomers:', deleteBody);

  if (deleteBody.success === false) {
    throw new Error(
      deleteBody.message || 'DeleteAllCustomers returned failure.'
    );
  }

  // 3) GetAllCustomer — background verify after delete (not shown in UI)
  let afterDeleteCount = null;
  try {
    const getRes = await axios.post(
      getGetAllCustomerUrl(),
      { ClientCode: code },
      { headers: authHeaders }
    );
    afterDeleteCount = countListItems(getRes?.data);
    console.log(
      '[Varakrupa] GetAllCustomer after delete:',
      afterDeleteCount,
      'row(s)'
    );
  } catch (getErr) {
    console.warn(
      '[Varakrupa] GetAllCustomer after delete failed (continuing to bulk):',
      getErr?.response?.data || getErr?.message || getErr
    );
  }

  // 4) Bulk upload (or AddCustomer fallback if AddBulkCustomer is not deployed)
  try {
    const bulkRes = await axios.post(
      getAddBulkCustomerUrl(),
      { ClientCode: code, Customers: customers },
      { headers: authHeaders }
    );

    const bulkBody = bulkRes?.data || {};
    console.log('[Varakrupa] AddBulkCustomer:', bulkBody);

    if (bulkBody.success === false) {
      throw new Error(bulkBody.message || 'AddBulkCustomer returned failure.');
    }

    return {
      success: true,
      deletedCount: deleteBody.deletedCount ?? null,
      afterDeleteCount,
      createdCount: bulkBody.createdCount ?? customers.length,
      skippedCount: bulkBody.skippedCount ?? 0,
      totalRequested: bulkBody.totalRequested ?? customers.length,
      message:
        bulkBody.message ||
        `Synced ${customers.length} Varakrupa user(s) to LoyalString.`,
    };
  } catch (bulkErr) {
    const status = bulkErr?.response?.status;
    console.warn(
      '[Varakrupa] AddBulkCustomer failed, falling back to AddCustomer:',
      status,
      bulkErr?.response?.data || bulkErr?.message || bulkErr
    );

    const fallback = await addCustomersOneByOne(code, customers, authHeaders);
    console.log('[Varakrupa] AddCustomer fallback result:', fallback);

    return {
      ...fallback,
      deletedCount: deleteBody.deletedCount ?? null,
      afterDeleteCount,
    };
  }
};

export const getVarakrupaBaseUrl = () => VARAKRUPA_API_URL;

export const getVarakrupaSoldProductsUrl = () => VARAKRUPA_SOLD_PRODUCTS_URL;

export const getVarakrupaUserDataUrl = () => VARAKRUPA_USER_DATA_URL;

export const getVarakrupaStockSellUrl = () => VARAKRUPA_STOCK_SELL_URL;

export const getVarakrupaDirectBaseUrl = () => VARAKRUPA_API_URL;

export const hasVarakrupaCredentials = () => !!USERNAME && !!PASSWORD;