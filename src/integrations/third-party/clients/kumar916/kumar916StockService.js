import axios from 'axios';

const STOCK_PATH = '/916Advanced/StockMasterService.svc/GetStockMasterByRFIdChecking';
const DEFAULT_DIRECT_BASE = 'http://103.87.92.69:8080';

const directBase = (process.env.REACT_APP_KUMAR916_API_URL || DEFAULT_DIRECT_BASE).replace(/\/$/, '');

/** Same URL as webpack dev (setupProxy): Apache .htaccess forwards /api/kumar916/* → kumar916-proxy.php */
const relativeApiUrl = (queryString) => `/api/kumar916${STOCK_PATH}?${queryString}`;

const isLocalhost = () =>
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const buildUrl = (queryString) => {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return `${directBase}${STOCK_PATH}?${queryString}`;
  }
  if (isLocalhost() && process.env.NODE_ENV !== 'development') {
    return `${directBase}${STOCK_PATH}?${queryString}`;
  }
  return relativeApiUrl(queryString);
};

const isHtmlSpaFallback = (data, contentType) => {
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('text/html')) return true;
  if (typeof data === 'string' && (data.includes('enable JavaScript') || /^\s*</.test(data))) return true;
  return false;
};

const defaultQueryParams = () => ({
  intITEM_ID: process.env.REACT_APP_KUMAR916_ITEM_ID ?? '00',
  intCOUNTER_ID: process.env.REACT_APP_KUMAR916_COUNTER_ID ?? '0',
  intITEMGROUP_ID: process.env.REACT_APP_KUMAR916_ITEMGROUP_ID ?? '0',
  intCAT_ID: process.env.REACT_APP_KUMAR916_CAT_ID ?? '1',
  strDatabase: process.env.REACT_APP_KUMAR916_DATABASE || 'KUMAR',
});

const toQueryString = (params) =>
  new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => {
      acc[k] = v == null ? '' : String(v);
      return acc;
    }, {})
  ).toString();

const unwrapPayload = (data) => {
  if (Array.isArray(data)) return data;
  if (data == null) return [];
  if (typeof data === 'string') {
    try {
      return unwrapPayload(JSON.parse(data));
    } catch {
      return [];
    }
  }
  if (typeof data === 'object') {
    if (Array.isArray(data.d)) return data.d;
    if (data.d != null) return unwrapPayload(data.d);
    if (Array.isArray(data.data)) return data.data;
    if (data.GetStockMasterByRFIdCheckingResult != null) {
      return unwrapPayload(data.GetStockMasterByRFIdCheckingResult);
    }
  }
  return [];
};

const fmtWt3 = (v) => {
  if (v === '' || v == null) return '';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toFixed(3);
};

export const mapKumar916StockRow = (raw, index) => {
  const im = raw?.ItemMaster_DO;
  const ig = im?.ItemGroupMaster_DO;
  const cat = ig?.CategoryMaster_DO;
  const stId = raw?.ST_ID;
  const tagNo = raw?.ST_TAGNo ?? raw?.ST_TAGNO;
  const stRfid = raw?.ST_RFID ?? raw?.ST_Rfid ?? raw?.st_rfid;
  return {
    _rowId: stId != null ? String(stId) : `r-${index}-${im?.ITEM_ID ?? ''}-${im?.ITEM_CODE ?? ''}`,
    counterName: raw?.CounterMaster_DO?.COUNTER_NAME ?? '',
    itemCode: tagNo != null && tagNo !== '' ? String(tagNo) : '',
    rfidCode: stRfid != null && stRfid !== '' ? String(stRfid).trim() : '',
    productCode: im?.ITEM_CODE ?? '',
    category: cat?.CAT_NAME ?? '',
    productName: ig?.ITEMGROUP_NAME ?? '',
    design: ig?.ITEMGROUP_NAME ?? '',
    grWt: fmtWt3(raw?.ST_GROSS),
    ntWt: fmtWt3(raw?.ST_NETWT),
    qty: raw?.ST_QTY ?? '',
    purity: im?.ITEM_PURITY != null && im?.ITEM_PURITY !== '' ? String(im.ITEM_PURITY) : '',
    stGross: raw?.ST_GROSS,
    stNetwt: raw?.ST_NETWT,
  };
};

export const fetchKumar916StockMaster = async (overrides = {}) => {
  const params = { ...defaultQueryParams(), ...overrides };
  const url = buildUrl(toQueryString(params));
  const res = await axios.get(url, {
    timeout: 120000,
    headers: { Accept: 'application/json, text/plain, */*' },
  });
  const { data } = res;
  const ct = res.headers?.['content-type'] || res.headers?.['Content-Type'];
  if (isHtmlSpaFallback(data, ct)) {
    throw new Error(
      'Got HTML instead of JSON: deploy build output including public/.htaccess and public/kumar916-proxy.php next to index.html. Rule /api/kumar916/ must rewrite to kumar916-proxy.php (same pattern as gati-proxy.php). Nginx: proxy /api/kumar916/ to PHP or upstream.'
    );
  }
  const rows = unwrapPayload(data);
  if (!Array.isArray(rows)) return [];
  return rows.map((raw, i) => mapKumar916StockRow(raw, i));
};
