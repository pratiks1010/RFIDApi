import axios from 'axios';
import { getRrgoldApiBaseUrl, toRrgoldApiUrl } from './apiBaseConfig';

const stripJsonContentType = (headers) => {
  if (!headers) return;
  if (typeof headers.delete === 'function') {
    headers.delete('Content-Type');
    headers.delete('content-type');
    return;
  }
  delete headers['Content-Type'];
  delete headers['content-type'];
  if (headers.common) {
    delete headers.common['Content-Type'];
    delete headers.common['content-type'];
  }
  if (headers.post) {
    delete headers.post['Content-Type'];
    delete headers.post['content-type'];
  }
};

const isFileLike = (file) =>
  !!file &&
  typeof file === 'object' &&
  typeof file.size === 'number' &&
  (typeof File === 'undefined' || file instanceof File || file instanceof Blob);

// Dedicated client so global axios interceptors cannot force application/json.
const multipartAxios = axios.create();
multipartAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    stripJsonContentType(config.headers);
  }
  return config;
});

export const ACCEPTED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
export const ACCEPTED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const WARN_FILE_COUNT = 200;
export const WARN_TOTAL_BYTES = 200 * 1024 * 1024;
export const UPLOAD_TIMEOUT_MS = 600000;

/**
 * @typedef {Object} BulkImageMapRow
 * @property {string} ItemCode
 * @property {string[]} ImageKeys
 */

/**
 * @typedef {Object} BulkUploadFileItem
 * @property {File} file
 * @property {string} itemCode
 */

/**
 * @typedef {Object} BulkUploadProductResult
 * @property {string} ItemCode
 * @property {number} [UploadedCount]
 * @property {string[]} [Images]
 * @property {string} [Action]
 * @property {string} [Message]
 */

/**
 * @typedef {Object} BulkUploadResult
 * @property {boolean} ok
 * @property {string} status
 * @property {string} message
 * @property {string} clientCode
 * @property {boolean} replaceExisting
 * @property {number} totalFiles
 * @property {number} uploadedFiles
 * @property {number} updatedProducts
 * @property {number} skippedProducts
 * @property {number} failedFiles
 * @property {BulkUploadProductResult[]} products
 * @property {BulkUploadProductResult[]} skipped
 * @property {Array} errors
 * @property {object} raw
 */

export const getUploadBulkProductImagesUrl = () =>
  toRrgoldApiUrl('/api/ProductMaster/UploadBulkProductImagesByItemCode');

export const getLabelledStockUrl = () => toRrgoldApiUrl('/api/ProductMaster/GetAllLabeledStock');

export const getProductImagePreviewUrl = (relativePath) => {
  const path = String(relativePath || '').trim();
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  const base = String(getRrgoldApiBaseUrl() || '').replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
};

export const resolveLoggedInClientCode = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return String(
      stored?.ClientCode || stored?.clientCode || stored?.clientcode || ''
    ).trim();
  } catch {
    return '';
  }
};

export const itemCodeFromFileName = (fileName) => {
  const base = String(fileName || '')
    .trim()
    .replace(/^.*[\\/]/, '')
    .replace(/\.[^.]+$/, '');
  return base.trim();
};

export const isAcceptedImageFile = (file) => {
  if (!file) return false;
  const name = String(file.name || '').toLowerCase();
  const extOk = ACCEPTED_IMAGE_EXT.some((ext) => name.endsWith(ext));
  const mime = String(file.type || '').toLowerCase();
  const mimeOk = !mime || mime.startsWith('image/') || ACCEPTED_IMAGE_MIME.includes(mime);
  return extOk && mimeOk;
};

const pickArray = (...candidates) => {
  for (let i = 0; i < candidates.length; i += 1) {
    if (Array.isArray(candidates[i])) return candidates[i];
  }
  return [];
};

export const parseBulkUploadResponse = (data = {}) => {
  const status = String(data.status || data.Status || '').trim();
  const message = String(data.Message || data.message || '').trim();
  const ok = status.toLowerCase() !== 'error';
  return {
    ok,
    status: status || (ok ? 'Success' : 'Error'),
    message: message || (ok ? 'Bulk product images uploaded.' : 'Upload failed.'),
    clientCode: String(data.ClientCode || data.clientCode || '').trim(),
    replaceExisting: data.ReplaceExisting === true || data.replaceExisting === true,
    totalFiles: Number(data.TotalFiles ?? data.totalFiles ?? 0) || 0,
    uploadedFiles: Number(data.UploadedFiles ?? data.uploadedFiles ?? 0) || 0,
    updatedProducts: Number(data.UpdatedProducts ?? data.updatedProducts ?? 0) || 0,
    skippedProducts: Number(data.SkippedProducts ?? data.skippedProducts ?? 0) || 0,
    failedFiles: Number(data.FailedFiles ?? data.failedFiles ?? 0) || 0,
    products: pickArray(data.Products, data.products),
    skipped: pickArray(data.Skipped, data.skipped),
    errors: pickArray(data.Errors, data.errors),
    raw: data,
  };
};

/**
 * POST multipart UploadBulkProductImagesByItemCode.
 * @param {{ clientCode: string, replaceExisting?: boolean, items: BulkUploadFileItem[] }} payload
 * @returns {Promise<BulkUploadResult>}
 */
export const uploadBulkProductImagesByItemCode = async ({
  clientCode,
  replaceExisting = false,
  items = [],
  onUploadProgress,
}) => {
  const code = String(clientCode || '').trim();
  if (!code) {
    const err = new Error('ClientCode is required.');
    err.isClientError = true;
    throw err;
  }
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) {
    const err = new Error('Select at least one image.');
    err.isClientError = true;
    throw err;
  }

  const formData = new FormData();
  formData.append('ClientCode', code);
  formData.append('ReplaceExisting', replaceExisting ? 'true' : 'false');

  const imageMap = [];
  rows.forEach((item, index) => {
    const file = item?.file;
    if (!isFileLike(file)) {
      const err = new Error(`Image ${index + 1} is not a valid file.`);
      err.isClientError = true;
      throw err;
    }
    const key = `img_${index}`;
    formData.append(key, file, file.name || `${key}.jpg`);
    imageMap.push({ ItemCode: String(item.itemCode || '').trim(), ImageKeys: [key] });
  });

  const merged = Object.values(
    imageMap.reduce((acc, row) => {
      const itemCode = row.ItemCode;
      if (!acc[itemCode]) acc[itemCode] = { ItemCode: itemCode, ImageKeys: [] };
      acc[itemCode].ImageKeys.push(...row.ImageKeys);
      return acc;
    }, {})
  );
  formData.append('ImageMap', JSON.stringify(merged));

  const token = localStorage.getItem('token');
  const response = await multipartAxios.post(getUploadBulkProductImagesUrl(), formData, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: UPLOAD_TIMEOUT_MS,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    onUploadProgress: (event) => {
      if (typeof onUploadProgress !== 'function') return;
      const total = Number(event?.total || 0);
      const loaded = Number(event?.loaded || 0);
      if (total > 0) {
        onUploadProgress(Math.min(95, Math.round((loaded / total) * 100)));
      }
    },
    transformRequest: [
      (data, headers) => {
        if (data instanceof FormData) {
          stripJsonContentType(headers);
          return data;
        }
        return data;
      },
    ],
  });
  const parsed = parseBulkUploadResponse(response.data || {});
  if (!parsed.ok) {
    const err = new Error(parsed.message || 'Upload failed.');
    err.isApiError = true;
    err.result = parsed;
    throw err;
  }
  return parsed;
};

export const pickLabelledItemCode = (row) =>
  String(
    row?.Itemcode ?? row?.ItemCode ?? row?.itemcode ?? row?.ITEMCODE ?? row?.Item_Code ?? ''
  ).trim();

export const mapLabelledStockHit = (row = {}) => ({
  itemCode: pickLabelledItemCode(row),
  product: String(row.ProductName || row.Product || row.product_id || '').trim(),
  category: String(row.CategoryName || row.Category || row.category_id || '').trim(),
  design: String(row.DesignName || row.Design || row.design_id || '').trim(),
  rfid: String(row.RFIDCode || row.RFIDNumber || row.RFID || '').trim(),
});

export const searchLabelledStockByItemCode = async (clientCode, searchTerm) => {
  const code = String(clientCode || '').trim();
  const q = String(searchTerm || '').trim();
  if (!code || !q) return [];
  const token = localStorage.getItem('token');
  const response = await axios.post(
    getLabelledStockUrl(),
    {
      ClientCode: code,
      ItemCode: q,
      SearchQuery: q,
      CategoryId: 0,
      ProductId: 0,
      DesignId: 0,
      PurityId: 0,
      FromDate: null,
      ToDate: null,
      RFIDCode: '',
      PageNumber: 1,
      PageSize: 25,
      BranchId: 0,
      Status: 'ApiActive',
      ListType: 'ascending',
      SortColumn: null,
    },
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 20000,
      skipGlobalLoader: true,
    }
  );
  const rows = Array.isArray(response.data)
    ? response.data
    : Array.isArray(response.data?.data)
      ? response.data.data
      : [];
  const seen = new Set();
  const hits = [];
  rows.forEach((row) => {
    const mapped = mapLabelledStockHit(row);
    if (!mapped.itemCode) return;
    const key = mapped.itemCode.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    hits.push(mapped);
  });
  return hits;
};
