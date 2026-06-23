import { toSoniApiUrl } from './apiBaseConfig';

const RFID_SAMPLE_BASE = '/api/RFIDSample';
const RFID_USER_BASE = '/api/RFIDUserManagement';

/**
 * RFID Sample Out/In APIs — Soni host (online/offline via REACT_APP_API_MODE + SONI URLs).
 * Override online: REACT_APP_API_URL / REACT_APP_SONI_API_BASE_URL
 * Override offline: REACT_APP_SONI_API_BASE_OFFLINE_URL (default http://localhost:8080)
 */
export const rfidSampleUrl = (relativePath) => {
  const suffix = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return toSoniApiUrl(`${RFID_SAMPLE_BASE}${suffix}`);
};

export const getSubmitSampleOutUrl = () => rfidSampleUrl('/SubmitSampleOut');

/** Preview next lot (does not increment). Query: clientCode= */
export const getLastNextSampleLotNumberUrl = () => rfidSampleUrl('/GetLastNextSampleLotNumber');

/** Alternate preview endpoint */
export const getNextLotNumberUrl = () => rfidSampleUrl('/GetNextLotNumber');

export const getLookupProductByRfidUrl = () => rfidSampleUrl('/LookupProductByRfid');

/** Live scan: 1st scan = Sample Out, 2nd scan (already out) = Sample In. */
export const getCheckScanStatusUrl = () => rfidSampleUrl('/CheckScanStatus');

export const getScanSampleInUrl = () => rfidSampleUrl('/ScanSampleIn');

export const getScanTagUrl = () => rfidSampleUrl('/ScanTag');

export const getPartyLookupUrl = (partyType, clientCode = '') => {
  const q = new URLSearchParams();
  q.set('partyType', String(partyType || '').trim());
  const cc = String(clientCode || '').trim();
  if (cc) q.set('clientCode', cc);
  return rfidSampleUrl(`/GetPartyLookup?${q.toString()}`);
};

/** Dashboard sub-users for Assign To (employee login / guid). */
export const getAllSubUsersUrl = () => toSoniApiUrl(`${RFID_USER_BASE}/GetAllSubUsers`);

export const sampleAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

export const getMyAssignedLotsUrl = (clientCode, lotStatus = 'PendingAcceptance') =>
  rfidSampleUrl(
    `/GetMyAssignedLots?clientCode=${encodeURIComponent(clientCode || '')}&lotStatus=${encodeURIComponent(lotStatus)}`
  );

export const getLotByIdUrl = (clientCode, lotId) =>
  rfidSampleUrl(
    `/GetLotById?clientCode=${encodeURIComponent(clientCode || '')}&lotId=${encodeURIComponent(lotId)}`
  );

/** Whether assigned employee accepted the lot and returns are allowed. */
export const getLotAcceptanceStatusUrl = (clientCode, lotId) =>
  rfidSampleUrl(
    `/GetLotAcceptanceStatus?clientCode=${encodeURIComponent(clientCode || '')}&lotId=${encodeURIComponent(lotId)}`
  );

export const getAcceptLotUrl = () => rfidSampleUrl('/AcceptLot');

/** Admin-only: bulk return Out items without employee scan. */
export const getAdminBulkSampleReturnUrl = () => rfidSampleUrl('/AdminBulkSampleReturn');

/** ScanSampleIn / AdminBulkSampleReturn — lot closure and counts from API body. */
export const parseRfidSampleLotReturnMeta = (data = {}) => {
  const lotStatus = String(data?.lotStatus ?? data?.LotStatus ?? '').trim();
  const lotCompleted = Boolean(data?.lotCompleted ?? data?.LotCompleted);
  const totalItems = data?.totalItems ?? data?.TotalItems;
  const returnedItems = data?.returnedItems ?? data?.ReturnedItems;
  const pendingItems = data?.pendingItems ?? data?.PendingItems;
  const message = String(data?.message ?? data?.Message ?? '').trim();
  return { lotStatus, lotCompleted, totalItems, returnedItems, pendingItems, message };
};

export const normalizeRfidSampleLotStatus = (lotStatus) =>
  String(lotStatus || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

/** Scan path — every product returned via RFID/TID/item scan. */
export const isRfidSampleLotClosed = ({ lotStatus } = {}) =>
  normalizeRfidSampleLotStatus(lotStatus) === 'closed';

/** Admin manual finish — bulk select all Out items or CompleteLot force-close. */
export const isRfidSampleLotCompleted = ({ lotStatus } = {}) =>
  normalizeRfidSampleLotStatus(lotStatus) === 'completed';

export const isRfidSampleLotPartialReturn = ({ lotStatus } = {}) => {
  const status = normalizeRfidSampleLotStatus(lotStatus);
  return status === 'partialreturn' || status === 'partialreturned' || status === 'partiallyreturned';
};

export const isRfidSampleLotFinalized = (meta = {}) =>
  isRfidSampleLotClosed(meta) || isRfidSampleLotCompleted(meta);

export const formatRfidSampleLotClosedMessage = (message) =>
  message || 'All products returned via scan. Sample lot is closed.';

export const formatRfidSampleLotCompletedMessage = (message) =>
  message || 'All products force-returned by admin. Sample lot is completed.';

export const getRfidSampleLotFinishUi = (meta = {}, { fallbackMessage } = {}) => {
  if (isRfidSampleLotClosed(meta)) {
    return {
      title: 'Lot closed',
      message: formatRfidSampleLotClosedMessage(meta.message),
      accent: '#1d4ed8',
      bg: '#eff6ff',
      border: '#bfdbfe',
    };
  }
  if (isRfidSampleLotCompleted(meta)) {
    return {
      title: 'Lot completed',
      message: formatRfidSampleLotCompletedMessage(meta.message),
      accent: '#6d28d9',
      bg: '#f5f3ff',
      border: '#ddd6fe',
    };
  }
  return {
    title: 'Return successful',
    message: fallbackMessage || meta.message || '',
    accent: '#059669',
    bg: '#ecfdf5',
    border: '#bbf7d0',
  };
};

/** Bulk/tray admin return vs accurate admin scan vs employee scan. */
export const isForceReturnItem = (line) =>
  line?.isForceReturn === true ||
  line?.IsForceReturn === true ||
  String(line?.returnedByType ?? line?.ReturnedByType ?? '').trim() === 'ForceReturn';

export const getItemReturnedByTypeMeta = (line) => {
  if (isForceReturnItem(line)) {
    return { label: 'Manual Return by Admin', color: '#c2410c', bg: '#fff7ed', bd: '#fdba74' };
  }
  const raw = String(line?.returnedByType ?? line?.ReturnedByType ?? '').trim().toLowerCase();
  if (raw === 'admin') {
    return { label: 'Returned by Admin', color: '#047857', bg: '#ecfdf5', bd: '#bbf7d0' };
  }
  if (raw === 'employee') {
    return { label: 'Returned by Employee', color: '#0c4a6e', bg: '#e0f2fe', bd: '#bae6fd' };
  }
  if (!raw) return null;
  return { label: `Returned by ${raw}`, color: '#475569', bg: '#f1f5f9', bd: '#cbd5e1' };
};

const pickReturnRemark = (obj) => {
  if (!obj || typeof obj !== 'object') return '';
  const keys = [
    'AdminReturnRemark',
    'adminReturnRemark',
    'ReturnRemark',
    'returnRemark',
    'AdminRemark',
    'adminRemark',
    'Remark',
    'remark',
    'Remarks',
    'remarks',
    'SampleInRemark',
    'sampleInRemark',
  ];
  for (let i = 0; i < keys.length; i += 1) {
    const v = obj[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

const pickAdminReviewRemark = (obj) => {
  if (!obj || typeof obj !== 'object') return '';
  const keys = ['AdminReviewRemark', 'adminReviewRemark'];
  for (let i = 0; i < keys.length; i += 1) {
    const v = obj[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

const pickLineReturnRemarkOnly = (obj) => {
  if (!obj || typeof obj !== 'object') return '';
  const keys = ['ReturnRemark', 'returnRemark'];
  for (let i = 0; i < keys.length; i += 1) {
    const v = obj[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

/** Per-product admin review note (force return / admin scan). */
export const getLineAdminReviewRemark = (line, lotHeader) =>
  pickAdminReviewRemark(line) || (isForceReturnItem(line) ? pickReturnRemark(lotHeader) : '');

/** Bulk/lot return note stored on the line or lot header. */
export const getLineReturnRemark = (line, lotHeader) =>
  pickLineReturnRemarkOnly(line) || pickReturnRemark(lotHeader);

/** Primary remark shown on force-returned item cards. */
export const getLineForceReturnRemark = (line, lotHeader) => {
  if (!isForceReturnItem(line)) return '';
  return getLineAdminReviewRemark(line, lotHeader) || getLineReturnRemark(line, lotHeader);
};

/** Line still with customer / not yet returned. */
export const isOutItemStatus = (status) => {
  const s = String(status || '').trim().toLowerCase();
  if (!s) return false;
  if (s.includes('return')) return false;
  return s === 'out' || s.includes('sampleout');
};

export const countOutItemsFromLines = (lines) =>
  (lines || []).filter((line) => isOutItemStatus(line?.ItemStatus ?? line?.itemStatus)).length;

/**
 * Align header lot status with line-level Out counts.
 * Prevents Closed/Completed when items are still Out; keeps PartialReturn accurate.
 */
export const reconcileRfidSampleLotStatus = ({
  lotStatus = '',
  lineItems = [],
  totalItems,
  returnedItems,
  outItems,
} = {}) => {
  const status = String(lotStatus || '').trim();
  const outFromLines = countOutItemsFromLines(lineItems);
  const outCount = Math.max(Number(outItems) || 0, outFromLines);
  const returned = Number(returnedItems) || 0;

  if (outCount > 0) {
    if (returned > 0) return 'PartialReturn';
    if (status) return status;
    return 'Open';
  }

  if (isRfidSampleLotClosed({ lotStatus: status })) return 'Closed';
  if (isRfidSampleLotCompleted({ lotStatus: status })) return 'Completed';
  if (isRfidSampleLotPartialReturn({ lotStatus: status })) return 'PartialReturn';

  const total = Number(totalItems) || 0;
  if (total > 0 && returned >= total) return status || 'Closed';

  return status || 'Open';
};

/** All sample-out lots with line items (admin list; sub-user sees assigned only). */
export const getAllSampleOutListUrl = () => rfidSampleUrl('/GetAllSampleOutList');

export const getLotListUrl = () => rfidSampleUrl('/GetLotList');

export const buildGetAllSampleOutListQuery = ({
  clientCode,
  pageNumber = 1,
  pageSize = 50,
  lotStatus,
  partyType,
  assignedToUserId,
  search,
} = {}) => {
  const q = new URLSearchParams();
  if (clientCode) q.set('clientCode', clientCode);
  q.set('pageNumber', String(pageNumber));
  q.set('pageSize', String(pageSize));
  if (lotStatus) q.set('lotStatus', lotStatus);
  if (partyType) q.set('partyType', partyType);
  if (assignedToUserId) q.set('assignedToUserId', assignedToUserId);
  if (search) q.set('search', search);
  const qs = q.toString();
  return `${getAllSampleOutListUrl()}?${qs}`;
};
