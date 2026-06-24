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

export const getMyAssignedLotsUrl = (clientCode, lotStatus = 'PendingAcceptance') => {
  const q = new URLSearchParams();
  q.set('clientCode', String(clientCode || '').trim());
  if (lotStatus) q.set('lotStatus', String(lotStatus).trim());
  return rfidSampleUrl(`/GetMyAssignedLots?${q.toString()}`);
};

export const getLotByIdUrl = (clientCode, lotId, { includeItems = true } = {}) => {
  const q = new URLSearchParams();
  q.set('clientCode', String(clientCode || '').trim());
  q.set('lotId', String(lotId));
  if (includeItems) q.set('includeItems', 'true');
  return rfidSampleUrl(`/GetLotById?${q.toString()}`);
};

/** Whether assigned employee accepted the lot and returns are allowed. */
export const getLotAcceptanceStatusUrl = (clientCode, lotId) =>
  rfidSampleUrl(
    `/GetLotAcceptanceStatus?clientCode=${encodeURIComponent(clientCode || '')}&lotId=${encodeURIComponent(lotId)}`
  );

export const getAcceptLotUrl = () => rfidSampleUrl('/AcceptLot');

/** Admin-only: bulk return Out items without employee scan. */
export const getAdminBulkSampleReturnUrl = () => rfidSampleUrl('/AdminBulkSampleReturn');

/** Preview returning vs remaining Out items before Sample In or admin bulk return. */
export const getLotPartialReturnSummaryUrl = () => rfidSampleUrl('/GetLotPartialReturnSummary');

const mapPartialReturnBucket = (bucket) => ({
  items: Number(bucket?.itemCount ?? bucket?.ItemCount ?? 0) || 0,
  pieces: Number(bucket?.totalPcs ?? bucket?.TotalPcs ?? 0) || 0,
  gross: parseFloat(bucket?.totalGrossWt ?? bucket?.TotalGrossWt ?? 0) || 0,
  net: parseFloat(bucket?.totalNetWt ?? bucket?.TotalNetWt ?? 0) || 0,
});

const mapPartialReturnItem = (item) => ({
  lotItemId: item?.lotItemId ?? item?.LotItemId,
  itemCode: item?.itemCode ?? item?.ItemCode ?? '—',
  rfidCode: item?.rfidCode ?? item?.RFIDCode ?? item?.RFIDNumber ?? '—',
  designName: item?.designName ?? item?.DesignName ?? '—',
  pcs: item?.pcs ?? item?.Pcs ?? item?.mrp ?? item?.MRP ?? '0',
  grossWt: item?.grossWt ?? item?.GrossWt ?? '0.000',
  netWt: item?.netWt ?? item?.NetWt ?? '0.000',
  mrp: item?.mrp ?? item?.MRP,
  itemStatus: item?.itemStatus ?? item?.ItemStatus ?? '',
});

/** Normalize GetLotPartialReturnSummary / AdminBulkSampleReturn partialReturnSummary. */
export const parseLotPartialReturnSummary = (payload = {}) => {
  const data = payload?.data ?? payload?.Data ?? payload;
  if (!data || typeof data !== 'object') return null;
  const lotOutTotal = data.lotOutTotal ?? data.LotOutTotal;
  const returning = data.returning ?? data.Returning;
  const remainingOut = data.remainingOut ?? data.RemainingOut;
  if (!lotOutTotal && !returning && !remainingOut) return null;
  return {
    lotId: data.lotId ?? data.LotId,
    lotNumber: data.lotNumber ?? data.LotNumber ?? '—',
    lotStatus: data.lotStatus ?? data.LotStatus ?? '',
    assignedToUserName: data.assignedToUserName ?? data.AssignedToUserName ?? '',
    summaryMessage: String(data.summaryMessage ?? data.SummaryMessage ?? '').trim(),
    lotOutTotal: mapPartialReturnBucket(lotOutTotal),
    returning: mapPartialReturnBucket(returning),
    remainingOut: mapPartialReturnBucket(remainingOut),
    returningItems: (data.returningItems ?? data.ReturningItems ?? []).map(mapPartialReturnItem),
    remainingOutItems: (data.remainingOutItems ?? data.RemainingOutItems ?? []).map(mapPartialReturnItem),
    allOutItems: (data.allOutItems ?? data.AllOutItems ?? []).map(mapPartialReturnItem),
  };
};

export const breakdownFromPartialReturnSummary = (summary) => {
  if (!summary) return null;
  return {
    lotTotal: summary.lotOutTotal,
    returning: summary.returning,
    pending: summary.remainingOut,
  };
};

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
export const isRfidSamplePartialAcceptedLot = ({ lotStatus } = {}) =>
  normalizeRfidSampleLotStatus(lotStatus) === 'partialaccepted';

export const isRfidSamplePendingAcceptanceLot = ({ lotStatus } = {}) =>
  normalizeRfidSampleLotStatus(lotStatus) === 'pendingacceptance';

/** Employee still has items to accept (PendingAcceptance or PartialAccepted lot). */
export const isEmployeeLotAcceptancePending = (lot) => {
  if (!lot || typeof lot !== 'object') return false;
  if (lot.canEmployeeAcceptMore === true || lot.CanEmployeeAcceptMore === true) return true;
  if (lot.canEmployeeAcceptMore === false || lot.CanEmployeeAcceptMore === false) return false;
  const employeeStatus = String(lot.employeeLotStatus ?? lot.EmployeeLotStatus ?? '').trim();
  if (normalizeRfidSampleLotStatus(employeeStatus) === 'pendingacceptance') return true;
  const pending = Number(lot.pendingAcceptanceItems ?? lot.PendingAcceptanceItems ?? 0);
  return pending > 0;
};

/** Line eligible for employee AcceptLot (partial or full). */
export const canEmployeeAcceptSampleLine = (line) => {
  if (!line || typeof line !== 'object') return false;
  if (line.canEmployeeAccept === true || line.CanEmployeeAccept === true) return true;
  if (line.canEmployeeAccept === false || line.CanEmployeeAccept === false) return false;
  if (line.isPendingAcceptance === true || line.IsPendingAcceptance === true) return true;
  const s = String(line.ItemStatus ?? line.itemStatus ?? '').trim().toLowerCase();
  return s === 'pending' || s.includes('pendingacceptance');
};

export const pickLotPendingAcceptanceItems = (lot) =>
  Number(lot?.pendingAcceptanceItems ?? lot?.PendingAcceptanceItems ?? 0) || 0;

export const pickLotAcceptedOutItems = (lot) =>
  Number(lot?.outItems ?? lot?.OutItems ?? 0) || 0;

export const isRfidSampleFullyAcceptedLot = (lot) => {
  if (!lot || typeof lot !== 'object') return false;
  if (lot.isFullyAccepted === true || lot.IsFullyAccepted === true) return true;
  const statusKey = normalizeRfidSampleLotStatus(lot.lotStatus ?? lot.LotStatus ?? lot.Status);
  const pendingAccept = pickLotPendingAcceptanceItems(lot);
  const out = pickLotAcceptedOutItems(lot);
  return statusKey === 'open' && pendingAccept === 0 && out > 0;
};

export const isRfidSamplePartiallyAcceptedLot = (lot) => {
  if (isRfidSampleFullyAcceptedLot(lot)) return false;
  return (
    lot?.isPartiallyAccepted === true ||
    lot?.IsPartiallyAccepted === true ||
    isRfidSamplePartialAcceptedLot({ lotStatus: lot?.lotStatus ?? lot?.LotStatus ?? lot?.Status })
  );
};

export const reconcileRfidSampleLotStatus = ({
  lotStatus = '',
  lineItems = [],
  totalItems,
  returnedItems,
  outItems,
  isFullyAccepted,
} = {}) => {
  const status = String(lotStatus || '').trim();
  const statusKey = normalizeRfidSampleLotStatus(status);

  if (isFullyAccepted === true) return 'Open';

  if (statusKey === 'open' && !isRfidSampleLotPartialReturn({ lotStatus: status })) {
    return status || 'Open';
  }

  if (statusKey === 'partialaccepted' || statusKey === 'pendingacceptance') {
    return status || (statusKey === 'partialaccepted' ? 'PartialAccepted' : 'PendingAcceptance');
  }
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

/** Dashboard counters from GetAllSampleOutList (e.g. partialAccepted, open). */
export const parseRfidSampleListDashboard = (payload = {}) => {
  const root =
    payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
      ? payload.data
      : payload;
  return {
    partialAccepted: Number(root?.partialAccepted ?? root?.PartialAccepted ?? 0) || 0,
    pendingAcceptance: Number(root?.pendingAcceptance ?? root?.PendingAcceptance ?? 0) || 0,
    open: Number(root?.open ?? root?.Open ?? 0) || 0,
  };
};

/** Parse list rows + totals from GetAllSampleOutList (GET or POST). */
export const extractRfidSampleOutListFromResponse = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { rows: [], totalRecords: 0, dashboard: parseRfidSampleListDashboard() };
  }
  if (payload.success === false || payload.Success === false) {
    throw new Error(payload.message || payload.Message || 'Could not load sample out list');
  }

  const pickArray = (source) => {
    if (!source) return null;
    if (Array.isArray(source)) return source;
    if (typeof source !== 'object') return null;
    const direct = [
      source.Data,
      source.data,
      source.Result,
      source.result,
      source.Items,
      source.items,
      source.Lots,
      source.lots,
      source.SampleLots,
      source.sampleLots,
    ];
    for (let i = 0; i < direct.length; i += 1) {
      if (Array.isArray(direct[i])) return direct[i];
    }
    const nested = source.Data ?? source.data ?? source.Result ?? source.result;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const nestedLists = [
        nested.Lots,
        nested.lots,
        nested.SampleLots,
        nested.sampleLots,
        nested.Items,
        nested.items,
        nested.Data,
        nested.data,
      ];
      for (let i = 0; i < nestedLists.length; i += 1) {
        if (Array.isArray(nestedLists[i])) return nestedLists[i];
      }
    }
    return null;
  };

  const rows = pickArray(payload) ?? [];
  const root =
    payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
      ? payload.data
      : payload;
  const totalRecords =
    Number(
      root?.totalRecords ??
        root?.TotalRecords ??
        payload?.totalRecords ??
        payload?.TotalRecords ??
        rows.length
    ) || rows.length;
  return { rows, totalRecords, dashboard: parseRfidSampleListDashboard(payload) };
};

/** All sample-out lots with line items (admin list; sub-user sees assigned only). */
export const getAllSampleOutListUrl = () => rfidSampleUrl('/GetAllSampleOutList');

export const getLotListUrl = () => rfidSampleUrl('/GetLotList');

/** Server IST display string, e.g. "24 Jun 2026, 16:30". */
export const pickFormattedDateField = (obj, baseName) => {
  if (!obj || typeof obj !== 'object' || !baseName) return '';
  const camel = String(baseName).charAt(0).toLowerCase() + String(baseName).slice(1);
  const pascal = String(baseName).charAt(0).toUpperCase() + String(baseName).slice(1);
  for (const k of [`${camel}Formatted`, `${pascal}Formatted`]) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

export const pickRawDateField = (obj, ...keys) => {
  if (!obj || typeof obj !== 'object') return '';
  for (let i = 0; i < keys.length; i += 1) {
    const v = obj[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
};

/** Prefer API *Formatted for display; raw keys for fallback formatting. */
export const displayRfidSampleDate = (obj, rawKeys, fallbackFormat) => {
  for (let i = 0; i < rawKeys.length; i += 1) {
    const formatted = pickFormattedDateField(obj, rawKeys[i]);
    if (formatted) return formatted;
  }
  const raw = pickRawDateField(obj, ...rawKeys);
  if (!raw) return '—';
  return typeof fallbackFormat === 'function' ? fallbackFormat(raw) : String(raw);
};

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
