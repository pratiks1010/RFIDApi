import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { 
  FaUserPlus,
  FaUserFriends,
  FaUserTie,
  FaStore,
  FaCalendarAlt,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaFileInvoice,
  FaInbox,
  FaCheckCircle,
  FaExclamationCircle,
  FaEye,
  FaSync,
  FaPlay,
  FaStop,
} from 'react-icons/fa';
import { useLoading } from '../../App';
import { useNotifications } from '../../context/NotificationContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import CustomerSidebarForm from './CustomerSidebarForm';
import VendorSidebarForm from './VendorSidebarForm';
import EmployeeSidebarForm from './EmployeeSidebarForm';
import {
  getGetAllCustomerUrl,
  getAddCustomerUrl,
  buildAddCustomerPayloadFromSidebar,
  validateSidebarCustomerForm,
} from '../../services/customerOnboardingApi';
import {
  getAddVendorUrl,
  getGetAllVendorUrl,
  getGetAllVendorsAltUrl,
  getAddEmployeeUrl,
  getGetAllEmployeeUrl,
  validateVendorSidebarForm,
  buildAddVendorPayload,
  validateEmployeeSidebarForm,
  buildAddEmployeePayload,
} from '../../services/memberOnboardingApi';
import TrayScanModal from '../common/TrayScanModal';
import GridItemImage from '../common/GridItemImage';
import { isInventoryTrayEnabled } from '../../services/trayModeService';
import { getTrayReaderConfig, parsePowerAttDb10 } from '../../services/trayReaderConfig';
import { getTrayTagIdentity, parseTrayTagLine } from '../../utils/trayTagParse';
import { getApiMode, getRrgoldApiBaseUrl, getSampleApiBaseUrl, getSoniApiBaseUrl, toRrgoldApiUrl, toSoniApiUrl } from '../../services/apiBaseConfig';
import {
  getSubmitSampleOutUrl,
  getPartyLookupUrl,
  getAllSubUsersUrl,
  getLastNextSampleLotNumberUrl,
  getCheckScanStatusUrl,
  getScanSampleInUrl,
  parseRfidSampleLotReturnMeta,
  isRfidSampleLotFinished,
  isRfidSampleLotPartialReturn,
  formatRfidSampleLotCompletedMessage,
  getLotByIdUrl,
  getLotAcceptanceStatusUrl,
  getLotPartialReturnSummaryUrl,
  parseLotPartialReturnSummary,
  breakdownFromPartialReturnSummary,
  sampleAuthHeaders,
} from '../../services/rfidSampleApi';
import { PartialReturnSummaryPanel, PartialReturnApiItemsTable } from './partialReturnSummaryUi';
import { getItemImageLookupKeys, warmupLocalItemImageIndex } from '../../services/localItemImageService';
import { getAuthState, isSuperAdmin } from '../../utils/authState';
import { designNoFromItem, lineDesignFieldValue, normalizeProductDesignFields, parseDesignSortKey, sortProductsByRecencyThenDesign } from '../../utils/designSort';
import { authHeaders as rfidUserAuthHeaders, rfidUserUrls } from '../../services/rfidUserManagementApi';

const EMPLOYEE_MASTER_LINK_HELP =
  'Sub-user login is not linked to Employee Master. Fix: (1) Create Masters — add employee PratikEmp if missing. (2) Sidebar → User Management → From employees — select that employee and Convert (or we auto-link when names match). (3) Sample Out — pick employee from dropdown again.';

/** Fixed page height for sample-out items grid (same as Sample Out list). */
const ITEMS_GRID_PAGE_SIZE = 6;
const SAMPLE_OUT_GRID_COLUMNS = 3;
const BULK_SCAN_THRESHOLD = 5;
/** Above this count, batch review popup shows counts only (not every item code). */
const BULK_REVIEW_DETAIL_CAP = 50;
const SAMPLE_OUT_TRAY_DEVICE_ID = 'Adb';

const normalizeLabeledStockArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.Data && Array.isArray(data.Data)) return data.Data;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.Items && Array.isArray(data.Items)) return data.Items;
  if (data.result && Array.isArray(data.result)) return data.result;
  return [];
};

const buildLabeledStockSearchPayload = (clientCode, term, extra = {}) => ({
  ClientCode: clientCode,
  Search: String(term || '').trim(),
  PageNumber: 1,
  PageSize: 20,
  Status: 'all',
  ...extra,
});

const fetchLabeledStockSearchResults = async (clientCode, searchTerm) => {
  if (!clientCode || !String(searchTerm || '').trim()) return [];
  const headers = {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  };
  const term = searchTerm.trim();
  const response = await axios.post(
    toSoniApiUrl('/api/ProductMaster/SearchLabelledStock'),
    buildLabeledStockSearchPayload(clientCode, term),
    { headers }
  );
  return normalizeLabeledStockArray(response.data);
};

const enrichTrayStockRows = (stockRows, scanRows) => {
  const byEpc = new Map();
  (scanRows || []).forEach((row) => {
    const epc = String(row?.epc || '').trim().toUpperCase();
    if (!epc) return;
    byEpc.set(epc, row);
  });
  return (stockRows || []).map((item) => {
    const tid = String(
      item.TIDValue || item.TIDNumber || item.tidValue || item.tidNumber || item.epc || ''
    ).trim().toUpperCase();
    const scan = byEpc.get(tid);
    const rfid = String(
      item.RFIDCode || item.RFIDNumber || item.RFID || scan?.rfidCode || ''
    ).trim();
    return {
      ...item,
      TIDValue: tid || item.TIDValue,
      TIDNumber: tid || item.TIDNumber,
      RFIDCode: rfid,
      RFIDNumber: rfid,
      epc: tid,
      scanSource: 'tray',
      __persistedScanSource: 'tray',
    };
  });
};

/** Parse GetLabelledStockByTIDNumbers — flat array or nested Products[]. */
const parseLabelledStockByTidResponse = (responseData) => {
  if (!responseData) return [];
  if (Array.isArray(responseData?.Products)) {
    return responseData.Products.map((entry) => {
      const pd = entry?.ProductDetails ?? entry?.productDetails ?? {};
      const tid = String(
        pd.TIDValue ?? pd.TIDNumber ?? entry?.RequestedIdentifier ?? entry?.requestedIdentifier ?? ''
      ).trim();
      const rfid = String(pd.RFIDCode ?? pd.RFIDNumber ?? pd.RfidCode ?? '').trim();
      return {
        ...pd,
        RequestedIdentifier: entry?.RequestedIdentifier ?? entry?.requestedIdentifier ?? '',
        TIDValue: tid,
        TIDNumber: tid,
        RFIDCode: rfid,
        RFIDNumber: rfid,
        ItemCode: pd.ItemCode ?? pd.Itemcode ?? entry?.ItemCode ?? '',
        Itemcode: pd.Itemcode ?? pd.ItemCode ?? entry?.Itemcode ?? '',
        CategoryName: entry?.CategoryName ?? pd.CategoryName ?? pd.Category ?? '',
        ProductName: entry?.ProductName ?? pd.ProductName ?? pd.Product ?? '',
        DesignName: entry?.DesignName ?? pd.DesignName ?? pd.Design ?? '',
        DesignNo: entry?.DesignNo ?? pd.DesignNo ?? pd.DesignCode ?? pd.design_no ?? '',
        PurityName: entry?.PurityName ?? pd.PurityName ?? pd.Purity ?? '',
      };
    });
  }
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.Data)) return responseData.Data;
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData?.Items)) return responseData.Items;
  if (Array.isArray(responseData?.items)) return responseData.items;
  return [];
};

const normalizeRfidDeviceRows = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const filterDeviceRowsForTrayEpcs = (deviceRows, epcs, deviceId = SAMPLE_OUT_TRAY_DEVICE_ID) => {
  const epcSet = new Set((epcs || []).map((e) => String(e || '').trim().toUpperCase()).filter(Boolean));
  if (!epcSet.size) return [];
  const trayDevice = String(deviceId || '').trim().toLowerCase();
  return (deviceRows || []).filter((entry) => {
    const tid = String(
      entry?.TIDValue ??
        entry?.tidValue ??
        entry?.TIDNumber ??
        entry?.ProductDetails?.TIDValue ??
        entry?.ProductDetails?.TIDNumber ??
        ''
    ).trim().toUpperCase();
    if (!tid || !epcSet.has(tid)) return false;
    const entryDevice = String(entry?.DeviceId ?? entry?.deviceId ?? '').trim().toLowerCase();
    return !entryDevice || entryDevice === trayDevice;
  });
};

const normalizeScanRows = (scanned) => {
  if (!Array.isArray(scanned)) return [];
  return scanned
    .map((item) => {
      if (typeof item === 'string') {
        const epc = String(item || '').trim().toUpperCase();
        return epc ? { epc, rfidCode: epc } : null;
      }
      const epc = String(item?.epc || item?.EPC || '').trim().toUpperCase();
      if (!epc) return null;
      const rfidCode = String(item?.rfidCode || item?.RFIDCode || '').trim();
      return { epc, rfidCode: rfidCode || epc };
    })
    .filter(Boolean);
};

const pageBtnStyleItems = (disabled) => ({
  padding: '6px 12px',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: disabled ? '#f1f5f9' : '#ffffff',
  color: disabled ? '#94a3b8' : '#475569',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.95 : 1,
});

const formatSampleApiDateTime = (value) => {
  if (value == null || value === '') return '—';
  try {
    const raw = String(value).trim();
    const naive = raw.replace(/Z$/i, '').replace(/([+-]\d{2}:\d{2})$/, '');
    const d = new Date(naive);
    if (Number.isNaN(d.getTime())) return raw;
    const hasTime =
      raw.includes('T') ||
      /\d{1,2}:\d{2}/.test(raw) ||
      d.getHours() > 0 ||
      d.getMinutes() > 0 ||
      d.getSeconds() > 0;
    if (hasTime) {
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }
    return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return String(value);
  }
};

/** Turn API enums like PendingAcceptance into readable labels. */
const formatSampleLotStatusLabel = (raw) => {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const known = {
    PendingAcceptance: 'Pending acceptance',
    PartialAccepted: 'Partial accepted',
    Pending: 'Pending',
    Accepted: 'Accepted',
    Returned: 'Returned',
    PartiallyReturned: 'Partially returned',
    PartialReturn: 'Partial return',
    PartialReturned: 'Partial return',
    Open: 'Open',
    Closed: 'Completed',
    Completed: 'Completed',
    Cancelled: 'Cancelled',
  };
  if (known[s]) return known[s];
  return s
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
};

const pickScanSampleInResult = (inData, item, rfid, lotId) => {
  const itemCode =
    inData?.itemCode ??
    inData?.ItemCode ??
    (rowItemCodeFromRaw(item) || rowItemCodeFromRaw(item?.fullItemData) || '—');
  const lotMeta = parseRfidSampleLotReturnMeta(inData);
  return {
    itemCode,
    rfid,
    lotNumber: inData?.lotNumber ?? inData?.LotNumber ?? item.__lotNumber ?? '—',
    lotId: inData?.lotId ?? inData?.LotId ?? lotId,
    itemStatus: String(inData?.itemStatus ?? inData?.ItemStatus ?? 'Returned').trim(),
    stockStatus: String(inData?.stockStatus ?? inData?.StockStatus ?? '').trim(),
    sampleInOn: inData?.sampleInOn ?? inData?.SampleInOn ?? '',
    apiMessage: lotMeta.message,
    ...lotMeta,
  };
};

const buildScanSampleInSuccessMessage = (result) => {
  if (isRfidSampleLotFinished(result)) {
    return formatRfidSampleLotCompletedMessage(result.apiMessage);
  }
  const parts = [`Returned ${result.itemCode} — Lot ${result.lotNumber}`];
  const statusLabel = formatSampleLotStatusLabel(result.lotStatus);
  if (statusLabel) parts.push(`Lot status: ${statusLabel}`);
  if (result.totalItems != null) parts.push(`${result.totalItems} total`);
  if (result.returnedItems != null && result.pendingItems != null) {
    parts.push(`${result.returnedItems} returned, ${result.pendingItems} pending`);
  }
  if (result.stockStatus) parts.push(`Stock: ${result.stockStatus}`);
  if (result.sampleInOn) parts.push(`In at ${formatSampleApiDateTime(result.sampleInOn)}`);
  return parts.join(' · ');
};

const buildScanSampleInLotSummaryLine = (result) => {
  const lotNo = result.lotNumber || '—';
  if (isRfidSampleLotFinished(result)) {
    return `Lot ${lotNo}: ${formatRfidSampleLotCompletedMessage(result.apiMessage)}`;
  }
  if (isRfidSampleLotPartialReturn(result)) {
    return `Lot ${lotNo}: Partial return — ${result.returnedItems ?? '—'} returned, ${result.pendingItems ?? '—'} still pending.`;
  }
  const status = String(result.lotStatus || '').toLowerCase();
  if (status.includes('partial')) {
    return `Lot ${lotNo}: Partial return — ${result.returnedItems ?? '—'} returned, ${result.pendingItems ?? '—'} still pending.`;
  }
  const label = formatSampleLotStatusLabel(result.lotStatus);
  return label ? `Lot ${lotNo}: ${label}.` : `Lot ${lotNo} updated.`;
};

const getSampleOutStatusBadgeStyle = (rawStatus) => {
  const key = String(rawStatus ?? '').trim();
  if (/^completed$/i.test(key)) {
    return { bg: '#f5f3ff', border: '#ddd6fe', color: '#6d28d9' };
  }
  if (/pending|accept/i.test(key)) {
    return { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' };
  }
  if (/return|partial/i.test(key)) {
    return { bg: '#fffbeb', border: '#fde68a', color: '#b45309' };
  }
  if (/cancel|reject/i.test(key)) {
    return { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' };
  }
  if (/accept/i.test(key)) {
    return { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' };
  }
  return { bg: '#f1f5f9', border: '#e2e8f0', color: '#475569' };
};

/** One short line for the success modal — avoid repeating lot no. in the banner. */
const formatSampleOutSuccessSubtitle = (apiMessage, lotNo) => {
  const msg = String(apiMessage ?? '').trim();
  if (!msg) return 'Your sample out was recorded successfully.';
  const lot = String(lotNo ?? '').trim();
  let line = msg
    .replace(/\s+/g, ' ')
    .replace(/lot number generated\.?\s*/gi, '')
    .replace(/sample out created\.?\s*/gi, '')
    .trim();
  if (lot && line.toLowerCase().includes(lot.toLowerCase())) {
    line = line.replace(new RegExp(lot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
  }
  line = line.replace(/^[,.\s]+|[,.\s]+$/g, '').trim();
  if (!line) return 'Your sample out was recorded successfully.';
  if (!/[.!?]$/.test(line)) line += '.';
  return line.charAt(0).toUpperCase() + line.slice(1);
};

const pickSampleOutSuccessMessage = (data) =>
  String(
    data?.message ??
      data?.Message ??
      data?.msg ??
      (data?.success ? 'Sample out created successfully.' : '')
  ).trim();

const rowItemCodeFromRaw = (row) =>
  String(
    row?.Itemcode ??
      row?.ItemCode ??
      row?.itemcode ??
      row?.ITEMCODE ??
      row?.Item_Code ??
      row?.ITMCode ??
      ''
  ).trim();

const normalizeDesignSearchTerm = (term) => String(term || '').trim().toLowerCase();

const collectDesignSearchKeys = (item) => {
  const keys = new Set();
  const add = (value) => {
    const t = String(value ?? '').trim();
    if (t) keys.add(t.toLowerCase());
  };
  add(designNoFromItem(item));
  add(item?.DesignName);
  add(item?.designName);
  add(item?.DesignNo);
  add(item?.DesignNO);
  add(item?.DesignCode);
  add(item?.Design);
  return keys;
};

const collectItemIdentifierKeys = (item) => {
  const keys = new Set();
  const add = (value) => {
    const t = String(value ?? '').trim();
    if (t) keys.add(t.toLowerCase());
  };
  add(rowItemCodeFromRaw(item));
  add(item?.RFIDNumber);
  add(item?.RFID);
  add(item?.RFIDCode);
  add(item?.rfidCode);
  add(item?.TIDValue);
  add(item?.TIDNumber);
  add(item?.tidValue);
  add(item?.tidNumber);
  add(item?.epc);
  return keys;
};

/** Row matches typed item / design / RFID query (exact or prefix). */
const itemMatchesSearchTerm = (item, searchTerm) => {
  const term = normalizeDesignSearchTerm(searchTerm);
  if (!term || !item) return false;

  if (collectItemIdentifierKeys(item).has(term)) return true;
  if (collectDesignSearchKeys(item).has(term)) return true;

  const code = rowItemCodeFromRaw(item).toLowerCase();
  if (code && (code === term || code.startsWith(term))) return true;

  const design = normalizeDesignSearchTerm(designNoFromItem(item));
  if (design && (design === term || design.startsWith(term))) return true;

  const { family } = parseDesignSortKey(designNoFromItem(item));
  const designFamily = normalizeDesignSearchTerm(family);
  if (designFamily && (designFamily === term || designFamily.startsWith(term))) return true;

  const designName = normalizeDesignSearchTerm(item?.DesignName ?? item?.designName ?? '');
  if (designName && designName.includes(term)) return true;

  return false;
};

/** After debounced search — auto-add matching labeled-stock rows to the grid (no Enter). */
const shouldAutoAddSearchResults = (searchTerm, results) => {
  if (!results?.length) return false;
  const term = normalizeDesignSearchTerm(searchTerm);
  if (!term) return false;

  if (results.length === 1) {
    return itemMatchesSearchTerm(results[0], term);
  }

  if (term.length >= 3) {
    return true;
  }

  return results.every((item) => itemMatchesSearchTerm(item, term));
};

/** Prefer stored scan source so tray rows stay Tray after mixed RFID/barcode scans. */
const pickItemScanSource = (item) =>
  String(
    item?.__persistedScanSource ??
      item?.scanSource ??
      item?.fullItemData?.scanSource ??
      item?.fullItemData?.__persistedScanSource ??
      ''
  ).trim();

/** Map UI scanSource → API ScanMode (RFID | Barcode | Tray | Manual). */
const resolveScanMode = (item) => {
  const src = pickItemScanSource(item).toLowerCase();
  if (src === 'tray') return 'Tray';
  if (src === 'manual') return 'Manual';
  if (src === 'search' || src === 'barcode' || src === 'direct') return 'Barcode';
  if (src === 'device' || src === 'rfid' || src === 'desktop') return 'RFID';
  const full = item?.fullItemData || {};
  const tid = String(
    item?.TIDValue ?? item?.tidValue ?? item?.epc ?? full.TIDValue ?? full.TIDNumber ?? ''
  ).trim();
  const rfid = String(item?.RFIDNumber ?? item?.RFID ?? item?.RFIDCode ?? full.RFIDCode ?? '').trim();
  const itemCode = rowItemCodeFromRaw(item) || rowItemCodeFromRaw(full);
  if (tid || rfid) return 'RFID';
  if (itemCode) return 'Barcode';
  return 'RFID';
};

/** Map grid row → SubmitSampleOut Items[] entry (at least one identifier). */
const buildSubmitSampleOutItem = (item) => {
  const full = item.fullItemData || {};
  const line = {};
  const tid = String(
    item.TIDValue ??
      item.tidValue ??
      item.epc ??
      full.TIDValue ??
      full.TIDNumber ??
      full.tidValue ??
      ''
  ).trim();
  const rfid = String(
    item.RFIDNumber ?? item.RFID ?? item.RFIDCode ?? full.RFIDCode ?? full.RFIDNumber ?? ''
  ).trim();
  const rawStockId =
    item.LabelledStockId ?? full.LabelledStockId ?? full.LabelledStockID ?? full.Id ?? item.id;
  const labelledStockId = parseInt(rawStockId, 10);
  const itemCode = rowItemCodeFromRaw(item) || rowItemCodeFromRaw(full);

  if (tid) line.TIDValue = tid;
  if (rfid) line.RFIDCode = rfid;
  if (Number.isFinite(labelledStockId) && labelledStockId > 0) line.LabelledStockId = labelledStockId;
  if (itemCode) line.ItemCode = itemCode;
  line.ScanMode = resolveScanMode(item);
  return line;
};

const pickSubmitSampleOutLotNo = (data) =>
  String(
    data?.lotNumber ??
      data?.LotNumber ??
      data?.SampleLotNo ??
      data?.sampleLotNo ??
      data?.Header?.SampleLotNo ??
      ''
  ).trim();

const pickApiResponseMessage = (data) => {
  if (data == null) return '';
  if (typeof data === 'string') return data.trim();
  return String(
    data.message ?? data.Message ?? data.msg ?? data.error ?? data.detail ?? ''
  ).trim();
};

const pickSampleOutErrorMessage = (error) => {
  const fromBody = pickApiResponseMessage(error?.response?.data);
  if (fromBody) return fromBody;
  if (error?.message) return String(error.message).trim();
  return 'Something went wrong.';
};

/** Toast popup + notification bell for every Sample Out message. */
const createSampleOutMessenger = (addNotification) => {
  const toastOpts = {
    position: 'top-right',
    autoClose: 6000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    theme: 'colored',
  };
  return (message, type = 'info', title = 'Sample Out') => {
    const msg = String(message || '').trim();
    if (!msg) return;
    if (type === 'error') toast.error(msg, toastOpts);
    else if (type === 'success') toast.success(msg, toastOpts);
    else if (type === 'warning') toast.warning(msg, toastOpts);
    else toast.info(msg, toastOpts);
    addNotification?.({ type, title, message: msg });
  };
};

/** Backend may wrap payload — normalize to the next lot string (e.g. SO-3). */
const pickNextSampleLotNoFromResponse = (raw) => {
  if (raw == null) return '';
  if (typeof raw === 'string' || typeof raw === 'number') {
    const s = String(raw).trim();
    return s || '';
  }
  if (typeof raw !== 'object') return '';
  const d = raw;
  const tryVals = [
    d.lotNumber,
    d.LotNumber,
    d.nextLotNumber,
    d.NextLotNumber,
    d.NextSampleLotNo,
    d.nextSampleLotNo,
    d.SampleLotNo,
    d.sampleLotNo,
    d.NextLotNo,
    d.nextLotNo,
    d.Data?.NextSampleLotNo,
    d.data?.NextSampleLotNo,
    d.Data?.SampleLotNo,
    d.Result?.NextSampleLotNo,
    d.result?.NextSampleLotNo,
    d.result?.nextSampleLotNo,
    Array.isArray(d.Data) && d.Data[0] ? d.Data[0].NextSampleLotNo || d.Data[0].SampleLotNo : undefined,
  ];
  for (const v of tryVals) {
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

/** Preview label for header — never show raw API hint text like "No sample lot yet…". */
const formatNextLotPreview = (data, clientCode) => {
  const full = pickNextSampleLotNoFromResponse(data);
  if (full && /SO-/i.test(full)) return full;
  const seq = data?.nextLotNumber ?? data?.NextLotNumber ?? data?.nextLotNo ?? data?.NextLotNo;
  const code = String(clientCode || '').trim();
  if (seq != null && code) {
    const num = parseInt(seq, 10);
    if (Number.isFinite(num) && num > 0) {
      return `SO-${code}-${String(num).padStart(5, '0')}`;
    }
  }
  if (full && !/^\d+$/.test(full)) return full;
  return '';
};

const resolveClientCodeForSampleApi = (userInfo) => {
  const u = userInfo?.ClientCode ?? userInfo?.clientCode ?? userInfo?.clientcode;
  if (u) return String(u).trim();
  try {
    const stored = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const c =
      stored.ClientCode || stored.clientCode || stored.clientcode;
    if (c) return String(c).trim();
  } catch {
    /* ignore */
  }
  try {
    const token = localStorage.getItem('token');
    if (!token) return '';
    const body = token.split('.')[1];
    if (!body) return '';
    const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    const c = payload.ClientCode || payload.clientcode || payload.clientCode;
    return c ? String(c).trim() : '';
  } catch {
    return '';
  }
};

const pickScanApiField = (obj, ...keys) => {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
};

const pickActiveLot = (checkData) => checkData?.activeLot ?? checkData?.ActiveLot ?? null;

const pickLotCount = (...values) => {
  for (const v of values) {
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
};

const extractActiveLotMeta = (checkData) => {
  const lot = pickActiveLot(checkData);
  if (!lot || typeof lot !== 'object') {
    return {
      lotNumber: '—',
      lotId: null,
      lotStatus: '',
      assignedToUserName: '',
      assignedToUserId: '',
      canSampleIn: false,
      totalItems: null,
      outItems: null,
      returnedItems: null,
      remainingOutItems: null,
    };
  }
  return {
    lotNumber: lot.lotNumber ?? lot.LotNumber ?? '—',
    lotId: lot.lotId ?? lot.LotId ?? null,
    lotStatus: String(lot.lotStatus ?? lot.LotStatus ?? lot.status ?? lot.Status ?? '').trim(),
    assignedToUserName: String(
      lot.assignedToUserName ??
        lot.AssignedToUserName ??
        lot.employeeName ??
        lot.EmployeeName ??
        ''
    ).trim(),
    assignedToUserId: String(lot.assignedToUserId ?? lot.AssignedToUserId ?? '').trim(),
    canSampleIn: Boolean(lot.canSampleIn ?? lot.CanSampleIn),
    totalItems: pickLotCount(lot.totalItems, lot.TotalItems, lot.itemCount, lot.ItemCount),
    outItems: pickLotCount(lot.outItems, lot.OutItems, lot.itemsOut, lot.ItemsOut),
    returnedItems: pickLotCount(
      lot.returnedItems,
      lot.ReturnedItems,
      lot.itemsReturned,
      lot.ItemsReturned
    ),
    remainingOutItems: pickLotCount(
      lot.remainingOutItems,
      lot.RemainingOutItems,
      lot.itemsStillOut,
      lot.ItemsStillOut
    ),
  };
};

const parseLotDetailResponse = (data) => {
  if (!data || typeof data !== 'object') return { lot: null, items: [] };
  const lot =
    data.data ?? data.Data ?? data.lot ?? data.Lot ?? data.header ?? data.Header ?? data;
  const items = Array.isArray(lot?.Items)
    ? lot.Items
    : Array.isArray(lot?.items)
      ? lot.items
      : Array.isArray(data?.Items)
        ? data.Items
        : Array.isArray(data?.items)
          ? data.items
          : [];
  return { lot: lot && typeof lot === 'object' ? lot : null, items };
};

const countLotLineStatuses = (items) => {
  let total = 0;
  let out = 0;
  let returned = 0;
  (items || []).forEach((line) => {
    total += 1;
    const s = String(line?.ItemStatus ?? line?.itemStatus ?? '').trim().toLowerCase();
    if (s === 'out') out += 1;
    else if (s.includes('return') || s === 'in' || s === 'returned') returned += 1;
  });
  return { total, out, returned };
};

const buildProductDataFromRaw = (item, extras = {}) => {
  const scanSource =
    String(extras.scanSource ?? extras.__persistedScanSource ?? '').trim() ||
    pickItemScanSource(item);
  const designFields = normalizeProductDesignFields(item);
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    __scannedAt: new Date().toISOString(),
    TIDValue:
      item.TIDValue ||
      item.TIDNumber ||
      item.tidValue ||
      item.tidNumber ||
      item.epc ||
      item.fullItemData?.TIDValue ||
      item.fullItemData?.TIDNumber ||
      '',
    RFIDNumber: item.RFIDNumber || item.RFID || item.RFIDCode || item.rfidCode || '',
    Itemcode: rowItemCodeFromRaw(item) || item.Itemcode || item.ItemCode || '',
    LabelledStockId: item.LabelledStockId || item.LabelledStockID || item.Id || item.id || '',
    category_id: item.CategoryName || item.Category || item.category_id || item.categoryName || '',
    product_id: item.ProductName || item.Product || item.product_id || item.productName || '',
    DesignName: designFields.DesignName,
    DesignNo: designFields.DesignNo,
    Design: designFields.DesignName,
    design_id: designFields.design_id,
    purity_id: item.PurityName || item.Purity || item.purity_id || item.purityName || '',
    grosswt: item.GrossWt || item.GrossWeight || item.grosswt || item.grossWt || item.TWt || '0.000',
    stonewt: item.StoneWt || item.StoneWeight || item.stonewt || item.StWt || '0.000',
    diamondweight: item.DiamondWeight || item.diamondweight || item.DiaWt || '0.000',
    netwt: item.NetWt || item.NetWeight || item.netwt || item.netWt || item.NtWt || '0.000',
    FinePercent: item.FinePercent || item.FinePercentage || item['Fine %'] || '0.00',
    WastagePercent: item.WastagePercent || item.WastagePercentage || item['Wastage %'] || '0.00',
    Qty: item.Qty || item.Quantity || 1,
    Pieces: item.Pieces || item.Qty || 1,
    MRP: item.MRP ?? item.mrp ?? item.MRPAmount ?? item.Mrp ?? item.FixedAmt ?? '0',
    TotalWt: item.GrossWt || item.GrossWeight || item.grosswt || item.grossWt || item.TWt || '0.000',
    fullItemData: item,
    __scanAction: 'SampleOut',
    ...extras,
    ...(scanSource ? { scanSource, __persistedScanSource: scanSource } : {}),
  };
};

const enrichItemFromCheckStatus = (item, checkData) => {
  const p = checkData?.product ?? checkData?.Product ?? {};
  const lotItemId =
    pickScanApiField(p, 'lotItemId', 'LotItemId') ||
    pickScanApiField(checkData, 'lotItemId', 'LotItemId') ||
    item.LotItemId ||
    item.lotItemId;
  const merged = {
    ...item,
    ItemCode: pickScanApiField(p, 'itemCode', 'ItemCode') || item.ItemCode,
    Itemcode: pickScanApiField(p, 'itemCode', 'ItemCode') || item.Itemcode,
    RFIDNumber: pickScanApiField(p, 'rfidCode', 'RFIDCode') || item.RFIDNumber,
    RFIDCode: pickScanApiField(p, 'rfidCode', 'RFIDCode') || item.RFIDCode,
    TIDValue: pickScanApiField(p, 'tidNumber', 'TIDNumber') || item.TIDValue,
    LabelledStockId: pickScanApiField(p, 'labelledStockId', 'LabelledStockId') || item.LabelledStockId,
    ProductName: pickScanApiField(p, 'productName', 'ProductName') || item.ProductName,
    CategoryName: pickScanApiField(p, 'categoryName', 'CategoryName') || item.CategoryName,
    DesignName: pickScanApiField(p, 'designName', 'DesignName') || item.DesignName,
    DesignNo: pickScanApiField(p, 'designNo', 'DesignNo', 'DesignCode') || item.DesignNo,
    Design: pickScanApiField(p, 'designName', 'DesignName') || item.Design || item.DesignName,
    design_id:
      pickScanApiField(p, 'designNo', 'DesignNo', 'DesignCode') ||
      pickScanApiField(p, 'designName', 'DesignName') ||
      item.design_id ||
      item.DesignName,
    PurityName: pickScanApiField(p, 'purityName', 'PurityName') || item.PurityName,
    GrossWt: pickScanApiField(p, 'grossWt', 'GrossWt') || item.GrossWt,
    NetWt: pickScanApiField(p, 'netWt', 'NetWt') || item.NetWt,
    MRP: pickScanApiField(p, 'mrp', 'MRP', 'MRPAmount') || item.MRP,
    Status: pickScanApiField(p, 'status', 'Status') || item.Status,
  };
  const priorSource = pickItemScanSource(item);
  if (priorSource) {
    merged.scanSource = priorSource;
    merged.__persistedScanSource = priorSource;
  }
  return buildProductDataFromRaw(merged, {
    __scanAction: 'SampleOut',
    __stockStatus: checkData?.stockStatus ?? checkData?.StockStatus ?? '',
    __scanPhase: checkData?.scanPhase ?? checkData?.ScanPhase ?? 'firstScan',
    __lotItemId: lotItemId ?? null,
    LotItemId: lotItemId ?? undefined,
  });
};

/** Normalize CheckScanStatus scanAction (handles "Sample In", samplein, etc.). */
const normalizeScanAction = (raw) => {
  const compact = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  if (compact === 'samplein' || compact === 'return' || compact === 'samplereturn') return 'SampleIn';
  if (compact === 'sampleout' || compact === 'out') return 'SampleOut';
  if (compact === 'blocked') return 'Blocked';
  if (compact === 'notfound') return 'NotFound';
  return String(raw ?? '').trim();
};

/** Rows waiting for SubmitSampleOut (excludes Sample In queue / completed). */
const pendingSampleOutOnly = (items) =>
  (items || []).filter((item) => item.__scanAction === 'SampleOut');

/** Rows queued for Sample In confirmation (2nd scan — not submitted yet). */
const pendingSampleInOnly = (items) =>
  (items || []).filter((item) => item.__scanAction === 'SampleInPending');

const SCAN_POPUP_THEME = {
  success: { bg: '#ecfdf5', border: '#6ee7b7', fg: '#047857', icon: '#059669' },
  info: { bg: '#eff6ff', border: '#93c5fd', fg: '#1d4ed8', icon: '#2563eb' },
  warning: { bg: '#fffbeb', border: '#fcd34d', fg: '#b45309', icon: '#d97706' },
  error: { bg: '#fef2f2', border: '#fecaca', fg: '#991b1b', icon: '#dc2626' },
};

const formatBlockedScanMessage = (rawMessage, itemCode, checkData) => {
  const msg = String(rawMessage || '').trim();
  const code = String(itemCode || '').trim();
  const lotNo = String(
    checkData?.lotNumber ??
      checkData?.LotNumber ??
      checkData?.sampleOutNo ??
      checkData?.SampleOutNo ??
      ''
  ).trim();
  const lotMatch = msg.match(/in lot\s+([^\s.,]+)/i);
  const detectedLot = lotMatch?.[1] || lotNo;
  const itemLabel = code || 'This item';

  if (/waiting for employee acceptance/i.test(msg) || /return after accept/i.test(msg)) {
    const lotPart = detectedLot ? ` in lot ${detectedLot}` : '';
    return `${itemLabel} is already part of a sample out${lotPart} and is waiting for the employee to accept it. You can scan this item again only after the employee accepts the lot.`;
  }

  if (/already.*sample out/i.test(msg) || /already.*out/i.test(msg)) {
    return msg;
  }

  return (
    msg ||
    `${itemLabel} cannot be scanned right now. Please check its sample out status and try again.`
  );
};

const scanReviewModalTone = (sections) => {
  const types = (sections || []).map((s) => s.type);
  if (types.includes('error')) return 'error';
  if (types.includes('warning')) return 'warning';
  if (types.includes('success')) return 'success';
  return 'info';
};

// Pieces count is stored in the MRP field on labelled-stock rows (same as main scan grid).
const scanRowPieces = (row) => {
  const src = row?.fullItemData ?? row ?? {};
  const v =
    row?.MRP ??
    row?.mrp ??
    src?.MRP ??
    src?.mrp ??
    src?.MRPAmount ??
    src?.Mrp ??
    row?.Qty ??
    row?.qty ??
    row?.Pieces ??
    row?.pieces ??
    0;
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};

const summarizeScanRows = (rows) => {
  let gross = 0;
  let net = 0;
  let pieces = 0;
  let latest = null;
  (rows || []).forEach((row) => {
    gross += parseFloat(row?.grosswt ?? row?.GrossWt ?? 0) || 0;
    net += parseFloat(row?.netwt ?? row?.NetWt ?? 0) || 0;
    pieces += scanRowPieces(row);
    const dt = row?.__scannedAt ? new Date(row.__scannedAt) : null;
    if (dt && !Number.isNaN(dt.getTime()) && (!latest || dt > latest)) latest = dt;
  });
  return { gross, net, pieces, latest };
};

const formatSummaryWeight = (value) => {
  const n = parseFloat(value);
  return Number.isNaN(n) ? '0.000' : n.toFixed(3);
};

const formatSummaryPieces = (value) => {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const resolveSuccessTotalPieces = (header, lineItems, scannedRows) => {
  const direct =
    header?.TotalPieces ??
    header?.totalPieces ??
    header?.TotalMRP ??
    header?.totalMrp ??
    null;
  if (direct != null && direct !== '') return Number(direct) || 0;
  if (Array.isArray(scannedRows) && scannedRows.length) {
    return summarizeScanRows(scannedRows).pieces;
  }
  if (Array.isArray(lineItems) && lineItems.length) {
    return lineItems.reduce((sum, line) => sum + scanRowPieces(line), 0);
  }
  return null;
};

const pendingInRowGrossWt = (row) =>
  String(row?.grosswt ?? row?.GrossWt ?? row?.GrossWeight ?? row?.TWt ?? '0.000');

const pendingInRowNetWt = (row) =>
  String(row?.netwt ?? row?.NetWt ?? row?.NetWeight ?? row?.NtWt ?? '0.000');

const pendingInRowImageUrl = (row) => {
  const src = row?.fullItemData ?? row ?? {};
  const raw = String(
    src?.ImageUrl ??
      src?.ImageURL ??
      src?.ImagePath ??
      src?.Image ??
      src?.PhotoUrl ??
      src?.PhotoURL ??
      src?.Photo ??
      src?.ProductImage ??
      src?.ImageName ??
      ''
  ).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${getRrgoldApiBaseUrl().replace(/\/$/, '')}/${raw.replace(/^\/+/, '')}`;
};

const pendingInRowImageLookupKeys = (row) => {
  const code = rowItemCodeFromRaw(row) || row?.Itemcode || row?.ItemCode || '';
  return getItemImageLookupKeys({
    ...(row?.fullItemData || {}),
    ...row,
    ItemCode: code,
    Itemcode: code,
    RFIDCode: row?.RFIDNumber ?? row?.RFIDCode,
    RFID: row?.RFIDNumber,
      DesignId: row?.design_id ?? row?.DesignId ?? row?.DesignNo,
      design_id: row?.design_id ?? row?.DesignNo ?? row?.DesignName,
      DesignName: row?.DesignName ?? row?.Design ?? row?.design_id ?? row?.DesignNo,
      DesignNo: row?.DesignNo,
      Design: row?.DesignName ?? row?.Design ?? row?.DesignNo,
  });
};

const SampleInReturnItemCard = ({ row, index }) => {
  const code = rowItemCodeFromRaw(row) || row?.Itemcode || row?.ItemCode || '—';
  const design = lineDesignFieldValue(row);
  const rfid = String(row?.RFIDNumber ?? row?.RFIDCode ?? '').trim() || '—';
  return (
    <article
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ position: 'relative', background: '#f8fafc', height: 96 }}>
        <span
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            zIndex: 2,
            fontSize: 9,
            fontWeight: 800,
            color: '#64748b',
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '2px 6px',
          }}
        >
          {index + 1}
        </span>
        <GridItemImage
          src={pendingInRowImageUrl(row)}
          itemCode={code === '—' ? '' : code}
          lookupKeys={pendingInRowImageLookupKeys(row)}
          alt={code}
          eagerLoad
          wrapperStyle={{
            width: '100%',
            height: 96,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 6px',
            boxSizing: 'border-box',
          }}
          imgStyle={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
          }}
          placeholder={
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>No image</div>
          }
        />
      </div>
      <div style={{ padding: '7px 8px 8px', minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: '#0f4c81',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={code}
        >
          {code}
        </div>
        <div style={{ fontSize: 9, fontWeight: 600, color: '#64748b', marginTop: 3, lineHeight: 1.35 }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={design}>
            Design: {design}
          </div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rfid}>
            RFID: {rfid}
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '2px 4px',
            marginTop: 5,
            fontSize: 9,
            fontWeight: 700,
            color: '#334155',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>Gr {pendingInRowGrossWt(row)}</span>
          <span>Net {pendingInRowNetWt(row)}</span>
          <span>Pcs {scanRowPieces(row)}</span>
        </div>
      </div>
    </article>
  );
};

const SampleInReturnItemsGrid = ({ rows, title = 'Returning items', scrollable = true }) => {
  if (!Array.isArray(rows) || !rows.length) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))',
          gap: 8,
          ...(scrollable
            ? {
                maxHeight: 200,
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingRight: 4,
                paddingBottom: 2,
              }
            : {}),
        }}
      >
        {rows.map((row, i) => (
          <SampleInReturnItemCard key={row.id ?? `${rowItemCodeFromRaw(row)}-${i}`} row={row} index={i} />
        ))}
      </div>
    </div>
  );
};

const isLotLineOutStatus = (line) => {
  const s = String(line?.ItemStatus ?? line?.itemStatus ?? '').trim().toLowerCase();
  if (!s) return false;
  if (s.includes('return') || s === 'in' || s === 'returned') return false;
  return s === 'out' || s.includes('sampleout');
};

const lotLineItemId = (line) => {
  const id = parseInt(line?.LotItemId ?? line?.lotItemId ?? line?.__lotItemId ?? line?.Id ?? line?.id, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const summarizeLineItems = (lines) => {
  let items = 0;
  let gross = 0;
  let net = 0;
  let pieces = 0;
  (lines || []).forEach((line) => {
    items += 1;
    gross += parseFloat(line?.GrossWt ?? line?.grosswt ?? line?.grossWt ?? 0) || 0;
    net += parseFloat(line?.NetWt ?? line?.netwt ?? line?.netWt ?? 0) || 0;
    pieces += scanRowPieces(line);
  });
  return { items, gross, net, pieces };
};

const buildPartialReturnBreakdown = (ctx, returningRows, { outOnLot, remainingAfter } = {}) => {
  const returningFromScans = summarizeScanRows(returningRows);
  const returningFallback = {
    items: returningRows.length,
    pieces: returningFromScans.pieces,
    gross: returningFromScans.gross,
    net: returningFromScans.net,
  };

  const outLines = (ctx?.items ?? []).filter(isLotLineOutStatus);
  if (outLines.length) {
    const returningIds = new Set(
      returningRows.map((row) => lotLineItemId(row)).filter((id) => id != null)
    );
    const returningLines = outLines.filter((line) => returningIds.has(lotLineItemId(line)));
    const pendingLines = outLines.filter((line) => !returningIds.has(lotLineItemId(line)));
    const lotTotal = summarizeLineItems(outLines);
    const returning = returningLines.length ? summarizeLineItems(returningLines) : returningFallback;
    // Prefer the matched pending lines, but only when the line IDs actually
    // matched the returning rows (returningLines + pendingLines === lotTotal).
    // Otherwise fall back to (lot total − returning) so Pending never shows the
    // full lot when the returning IDs don't line up with the out lines.
    const matchedConsistently =
      returningLines.length > 0 &&
      pendingLines.length === Math.max(0, outLines.length - returningLines.length);
    const pending = matchedConsistently
      ? summarizeLineItems(pendingLines)
      : {
          items: Math.max(0, lotTotal.items - returning.items),
          gross: Math.max(0, lotTotal.gross - returning.gross),
          net: Math.max(0, lotTotal.net - returning.net),
          pieces: Math.max(0, lotTotal.pieces - returning.pieces),
        };
    return { lotTotal, returning, pending };
  }

  const pendingItems =
    remainingAfter != null
      ? remainingAfter
      : Math.max(0, (outOnLot ?? returningFallback.items) - returningFallback.items);
  const lotTotalItems = outOnLot ?? returningFallback.items + pendingItems;
  const lotTotal = {
    items: lotTotalItems,
    pieces: returningFallback.pieces,
    gross: returningFallback.gross,
    net: returningFallback.net,
  };

  if (pendingItems > 0 && lotTotalItems > returningFallback.items) {
    lotTotal.pieces = returningFallback.pieces;
    lotTotal.gross = returningFallback.gross;
    lotTotal.net = returningFallback.net;
  }

  const pending = {
    items: pendingItems,
    gross: Math.max(0, lotTotal.gross - returningFallback.gross),
    net: Math.max(0, lotTotal.net - returningFallback.net),
    pieces: Math.max(0, lotTotal.pieces - returningFallback.pieces),
  };

  return {
    lotTotal,
    returning: returningFallback,
    pending,
  };
};

const PartialReturnSummaryTable = ({ label, data, rowStyle }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(120px, 1.4fr) repeat(4, minmax(72px, 1fr))',
      gap: '8px 12px',
      alignItems: 'center',
      padding: '10px 12px',
      borderRadius: 10,
      ...rowStyle,
    }}
  >
    <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', lineHeight: 1.3 }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
      {data.items} Item{data.items === 1 ? '' : 's'}
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
      {formatSummaryPieces(data.pieces)} Pcs
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
      {formatSummaryWeight(data.gross)}
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
      {formatSummaryWeight(data.net)}
    </div>
  </div>
);

const SampleInReturnLotsDetailModal = ({ reports, onClose }) => {
  if (!Array.isArray(reports) || !reports.length) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10050,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          padding: 20,
          maxWidth: 580,
          width: '100%',
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Sample In return summary</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: 'none',
              background: '#f1f5f9',
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FaTimes size={14} color="#64748b" />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reports.map((report, idx) => (
            <SampleInReturnLotDetailBody key={report.lotId || report.lotNo || idx} report={report} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const SampleInReturnLotDetailBody = ({ report }) => {
  const isFullReturn = report.isFullLotReturn;
  const tone = report.isPartial ? 'partial' : 'full';
  const titleColor = tone === 'partial' ? '#92400e' : '#15803d';
  const breakdown = report.breakdown;

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <div
        style={{
          padding: '12px 14px',
          background: tone === 'partial' ? '#fffbeb' : '#f0fdf4',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 14, color: titleColor }}>
          {isFullReturn ? 'Complete lot return' : report.isPartial ? 'Partial return' : 'Return summary'}
        </div>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginTop: 4 }}>Lot {report.lotNo}</div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: '10px 12px',
            marginBottom: 12,
          }}
        >
          {[
            ['Employee', report.assignedName && report.assignedName !== '—' ? report.assignedName : '—'],
            ['Returning', `${report.returning ?? 0} item(s)`],
            ['Pieces', formatSummaryPieces(report.pieces ?? 0)],
            ['Gross wt', `${report.grossWt ?? '0.000'} g`],
            ['Net wt', `${report.netWt ?? '0.000'} g`],
            report.outOnLot != null ? ['Out on lot', String(report.outOnLot)] : null,
            report.returned != null ? ['Already returned', String(report.returned)] : null,
            report.remainingAfter != null ? ['Remain out after', String(report.remainingAfter)] : null,
            report.total != null ? ['Lot total items', String(report.total)] : null,
          ]
            .filter(Boolean)
            .map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{value}</div>
              </div>
            ))}
        </div>

        {breakdown ? (
          <div
            style={{
              overflowX: 'auto',
              marginBottom: 12,
              borderRadius: 10,
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(120px, 1.4fr) repeat(4, minmax(72px, 1fr))',
                gap: '8px 12px',
                alignItems: 'center',
                padding: '8px 12px',
                borderBottom: '1px solid #eef2f7',
                background: '#f8fafc',
                minWidth: 520,
              }}
            >
              <div />
              <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Items</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Pcs</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Gross</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Net</div>
            </div>
            <div style={{ minWidth: 520 }}>
              <PartialReturnSummaryTable
                label="Lot total summary"
                data={breakdown.lotTotal}
                rowStyle={{ background: '#fafcff', borderBottom: '1px solid #eef2f7' }}
              />
              <PartialReturnSummaryTable
                label="Returning"
                data={breakdown.returning}
                rowStyle={{ background: '#f0fdf4', borderBottom: '1px solid #eef2f7' }}
              />
              {!isFullReturn && report.isPartial ? (
                <PartialReturnSummaryTable
                  label={report.apiSummary ? 'Remaining' : 'Pending'}
                  data={breakdown.pending}
                  rowStyle={{ background: '#fffbeb' }}
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {report.apiSummary ? (
          <>
            <PartialReturnApiItemsTable items={report.apiSummary.returningItems} title="Returning items" />
            {!isFullReturn && report.isPartial ? (
              <PartialReturnApiItemsTable
                items={report.apiSummary.remainingOutItems}
                title="Remaining out items"
              />
            ) : null}
          </>
        ) : null}

        {report.confirmationMessage ? (
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#475569', lineHeight: 1.5 }}>
            {report.confirmationMessage}
          </p>
        ) : null}

        {!report.isAccepted ? (
          <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 12, color: '#b45309' }}>
            Employee has not accepted this lot yet — return may be blocked until acceptance.
          </p>
        ) : null}
        {report.isAccepted && report.canReturn === false ? (
          <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: '#b45309' }}>
            Lot is not open for returns right now.
          </p>
        ) : null}

        {Array.isArray(report.rows) && report.rows.length > 0 && !report.apiSummary ? (
          <SampleInReturnItemsGrid rows={report.rows} scrollable />
        ) : null}
      </div>
    </div>
  );
};

const SampleInReturnInlineWarnings = ({ reports }) => {
  if (!Array.isArray(reports) || !reports.length) return null;
  const warnings = reports.flatMap((report) => {
    const items = [];
    if (!report.isAccepted) {
      items.push(`Lot ${report.lotNo}: employee has not accepted this lot yet.`);
    }
    if (report.isAccepted && report.canReturn === false) {
      items.push(`Lot ${report.lotNo}: not open for returns right now.`);
    }
    return items;
  });
  if (!warnings.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {warnings.map((text) => (
        <div
          key={text}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: '#fffbeb',
            border: '1px solid #fde68a',
            fontSize: 12,
            fontWeight: 700,
            color: '#b45309',
            lineHeight: 1.45,
          }}
        >
          {text}
        </div>
      ))}
    </div>
  );
};

const pickScannerDisplayName = (src) => {
  if (!src || typeof src !== 'object') return '';
  const firstLast = src.FirstName
    ? `${src.FirstName}${src.LastName ? ` ${src.LastName}` : ''}`.trim()
    : '';
  return String(
    src.Username ??
      src.username ??
      src.LoginName ??
      src.loginName ??
      src.UserName ??
      src.userName ??
      src.EmployeeName ??
      src.employeeName ??
      firstLast ??
      src.Name ??
      src.name ??
      ''
  ).trim();
};

const resolveScannerDisplayName = (userInfo) => {
  const fromState = pickScannerDisplayName(userInfo);
  if (fromState) return fromState;
  try {
    return pickScannerDisplayName(JSON.parse(localStorage.getItem('userInfo') || '{}'));
  } catch {
    return '';
  }
};

const SampleOut = () => {
  const { loading, setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const showSampleOutMessage = useMemo(
    () => createSampleOutMessenger(addNotification),
    [addNotification]
  );
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Sample Out Header State
  const [sampleOutNumber, setSampleOutNumber] = useState('');
  const [nextLotNoLoading, setNextLotNoLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerMobile, setCustomerMobile] = useState('');
  const [fineGold, setFineGold] = useState('0.000');
  const [balanceAmount, setBalanceAmount] = useState('0.000');
  const [finePercent, setFinePercent] = useState('0.00');
  const [advanceAmount, setAdvanceAmount] = useState('0.00');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const [partyType, setPartyType] = useState('employee');

  const [vendorList, setVendorList] = useState([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [loadingVendors, setLoadingVendors] = useState(false);

  const [employeeList, setEmployeeList] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  /** Assign To: AspNet user GUID from GetAllSubUsers / ConvertEmployeeToSubUser — not tblEmployee Id. */
  const [subUserList, setSubUserList] = useState([]);
  const [assignToSearch, setAssignToSearch] = useState('');
  const [filteredSubUsers, setFilteredSubUsers] = useState([]);
  const [showAssignToDropdown, setShowAssignToDropdown] = useState(false);
  const [selectedAssignToUserId, setSelectedAssignToUserId] = useState('');
  const [loadingSubUsers, setLoadingSubUsers] = useState(false);

  // Item Code Search State
  const [itemCodeSearch, setItemCodeSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);
  
  // Sample Out Items State
  const [sampleOutItems, setSampleOutItems] = useState([]);
  const sampleOutItemsRef = useRef(sampleOutItems);
  useEffect(() => {
    sampleOutItemsRef.current = sampleOutItems;
  }, [sampleOutItems]);
  const [scanChecking, setScanChecking] = useState(false);
  const [itemsViewMode, setItemsViewMode] = useState('grid');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [tableSearch, setTableSearch] = useState('');
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showConfirmSampleOut, setShowConfirmSampleOut] = useState(false);
  const [confirmSampleOutPhase, setConfirmSampleOutPhase] = useState('summary');
  const [showConfirmSampleIn, setShowConfirmSampleIn] = useState(false);
  const [showSampleInLotSummary, setShowSampleInLotSummary] = useState(false);
  const [confirmSampleInPhase, setConfirmSampleInPhase] = useState('summary');
  const [sampleInLotDetails, setSampleInLotDetails] = useState({});
  const [sampleInPartialSummaries, setSampleInPartialSummaries] = useState({});
  const [sampleInPartialSummaryLoading, setSampleInPartialSummaryLoading] = useState(false);
  const [scanReviewModal, setScanReviewModal] = useState(null);
  const confirmSampleInLockRef = useRef(false);
  const [formValidationHint, setFormValidationHint] = useState('');
  const confirmSampleOutLockRef = useRef(false);
  const [showRfidTrayModal, setShowRfidTrayModal] = useState(false);
  const [pageResetLoading, setPageResetLoading] = useState(false);
  const pageResetLockRef = useRef(false);
  const [trayEnabled, setTrayEnabled] = useState(isInventoryTrayEnabled());
  // Inline tray scanning (start/stop directly on this page, no popup needed).
  const [inlineTrayScanning, setInlineTrayScanning] = useState(false);
  const [inlineTrayBusy, setInlineTrayBusy] = useState(false);
  const [inlineTrayTagCount, setInlineTrayTagCount] = useState(0);
  const inlineTrayTagsRef = useRef(new Set());
  const inlineTrayUnsubRef = useRef(null);
  const [showCustomerSidebar, setShowCustomerSidebar] = useState(false);
  const [showVendorSidebar, setShowVendorSidebar] = useState(false);
  const [showEmployeeSidebar, setShowEmployeeSidebar] = useState(false);
  const isAdminUser = isSuperAdmin();
  
  const customerDropdownRef = useRef(null);
  const itemCodeSearchRef = useRef(null);
  const itemCodeSearchTermRef = useRef('');
  // Helper function to normalize array responses
  const normalizeArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.Data && Array.isArray(data.Data)) return data.Data;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.Items && Array.isArray(data.Items)) return data.Items;
    if (data.result && Array.isArray(data.result)) return data.result;
    return [];
  };

  /** Labeled-stock row fields — keep search, table, and exports aligned. */
  const rowItemCode = (row) =>
    String(
      row?.Itemcode ??
        row?.ItemCode ??
        row?.itemcode ??
        row?.ITEMCODE ??
        row?.Item_Code ??
        row?.ITMCode ??
        ''
    ).trim();

  const rowDedupKey = (row) => {
    const code = rowItemCode(row);
    if (code) return `C:${code.toUpperCase()}`;
    const tid = String(row?.TIDValue ?? row?.tidValue ?? row?.epc ?? '').trim();
    if (tid) return `T:${tid.toUpperCase()}`;
    const rfid = String(row?.RFIDNumber ?? row?.RFID ?? row?.RFIDCode ?? '').trim();
    if (rfid) return `R:${rfid.toUpperCase()}`;
    const sid = row?.LabelledStockId ?? row?.LabelledStockID ?? row?.Id ?? row?.id;
    if (sid !== '' && sid != null) return `I:${String(sid)}`;
    return '';
  };
  const rowItemCodeOrDash = (row) => rowItemCode(row) || '—';
  const rowRfidOrDash = (row) =>
    String(row?.RFIDNumber ?? row?.RFID ?? row?.RFIDCode ?? row?.rfidCode ?? '').trim() || '—';
  const rowCategoryOrDash = (row) =>
    String(row?.CategoryName ?? row?.Category ?? row?.categoryName ?? row?.category_id ?? '').trim() || '—';
  const rowProductOrDash = (row) =>
    String(row?.product_id ?? row?.ProductName ?? row?.Product ?? '').trim() || '—';
  const rowDesignOrDash = (row) => lineDesignFieldValue(row);
  const rowDesignNameOrDash = (row) => lineDesignFieldValue(row);
  const currentScannerName = useMemo(() => resolveScannerDisplayName(userInfo), [userInfo]);
  const rowScannedByUser = (row) => {
    const stored = String(
      row?.__scannedByUser ?? row?.ScannedByUser ?? row?.scannedByUser ?? ''
    ).trim();
    return stored || currentScannerName || resolveScannerDisplayName(userInfo);
  };
  const stampScannedByUser = (item) => {
    const scanSource = pickItemScanSource(item);
    return {
      ...item,
      __scannedByUser: String(item?.__scannedByUser ?? '').trim() || currentScannerName || '',
      ...(scanSource ? { scanSource, __persistedScanSource: scanSource } : {}),
    };
  };
  const rowGrossWtOrZero = (row) => String(row?.grosswt ?? row?.GrossWt ?? row?.GrossWeight ?? row?.TWt ?? '0.000');
  const rowNetWtOrZero = (row) => String(row?.netwt ?? row?.NetWt ?? row?.NetWeight ?? row?.NtWt ?? '0.000');
  const rowPurityOrZero = (row) => {
    const src = row?.fullItemData ?? row ?? {};
    return (
      String(
        row?.purity_id ??
          src?.PurityName ??
          src?.Purity ??
          src?.purity_id ??
          src?.PurityId ??
          ''
      ).trim() || '0'
    );
  };
  const rowScanMode = (row) => resolveScanMode(row);
  const scanModeBadgeStyle = (mode) => {
    const m = String(mode || 'RFID');
    if (m === 'Tray') return { color: '#0284c7', background: '#e0f2fe' };
    if (m === 'Barcode') return { color: '#7c3aed', background: '#ede9fe' };
    if (m === 'Manual') return { color: '#64748b', background: '#f1f5f9' };
    return { color: '#059669', background: '#ecfdf5' };
  };
const rowPieces = (row) => scanRowPieces(row);
const rowScannedDateTime = (row) => {
  const src = row?.fullItemData ?? row ?? {};
  const values = [
    row?.__scannedAt,
    src?.ScanDateTime,
    src?.ScannedDateTime,
    src?.CreatedDate,
    src?.CreatedOn,
    src?.DateTime,
    row?.ScanDateTime,
    row?.ScannedDateTime,
    row?.CreatedDate,
    row?.CreatedOn,
    row?.DateTime,
  ];
  for (const v of values) {
    if (!v) continue;
    const d = new Date(v);
    if (!Number.isNaN(d.getTime()) && d.getFullYear() >= 2010) return d;
  }
  return null;
};
const formatScannedDateTime = (date) => {
  if (!date) return '—';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const formatScannedTime = (date) => {
  if (!date) return '—';
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};
  const rowImageUrl = (row) => {
    const src = row?.fullItemData ?? row ?? {};
    const raw = String(
      src?.ImageUrl ??
      src?.ImageURL ??
      src?.ImagePath ??
      src?.Image ??
      src?.PhotoUrl ??
      src?.PhotoURL ??
      src?.Photo ??
      src?.ProductImage ??
      src?.ImageName ??
      ''
    ).trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `${getRrgoldApiBaseUrl().replace(/\/$/, '')}/${raw.replace(/^\/+/, '')}`;
  };
  const sampleOutItemImageLookupKeys = (row) =>
    getItemImageLookupKeys({
      ...(row?.fullItemData || {}),
      ItemCode: rowItemCode(row),
      Itemcode: row?.Itemcode,
      RFIDCode: row?.RFIDNumber,
      RFID: row?.RFIDNumber,
      DesignId: row?.design_id,
      design_id: row?.design_id,
      DesignName: row?.design_id || row?.DesignName || row?.Design,
      Design: row?.DesignName || row?.Design,
    });

  // Fetch user info on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserInfo(parsed);
      }
    } catch (err) {
      console.error('Error parsing userInfo:', err);
    }
  }, []);

  useEffect(() => {
    const syncTrayMode = () => setTrayEnabled(isInventoryTrayEnabled());
    window.addEventListener('focus', syncTrayMode);
    window.addEventListener('storage', syncTrayMode);
    return () => {
      window.removeEventListener('focus', syncTrayMode);
      window.removeEventListener('storage', syncTrayMode);
    };
  }, []);

  useEffect(() => {
    warmupLocalItemImageIndex().catch(() => {});
  }, []);

  useEffect(() => {
    const scope = String(
      userInfo?.Username ??
      userInfo?.username ??
      userInfo?.LoginName ??
      userInfo?.loginName ??
      userInfo?.ClientCode ??
      userInfo?.clientCode ??
      'default'
    ).trim().toLowerCase();
    try {
      const raw = localStorage.getItem(SAMPLE_OUT_ITEMS_VIEW_PREF_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const saved = parsed?.[scope];
      if (saved === 'grid' || saved === 'table') {
        setItemsViewMode(saved);
      } else {
        setItemsViewMode('grid');
      }
    } catch {
      setItemsViewMode('grid');
    }
  }, [userInfo]);

  useEffect(() => {
    const scope = String(
      userInfo?.Username ??
      userInfo?.username ??
      userInfo?.LoginName ??
      userInfo?.loginName ??
      userInfo?.ClientCode ??
      userInfo?.clientCode ??
      'default'
    ).trim().toLowerCase();
    if (!scope) return;
    try {
      const raw = localStorage.getItem(SAMPLE_OUT_ITEMS_VIEW_PREF_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const next = { ...(parsed && typeof parsed === 'object' ? parsed : {}), [scope]: itemsViewMode };
      localStorage.setItem(SAMPLE_OUT_ITEMS_VIEW_PREF_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }, [itemsViewMode, userInfo]);

  useEffect(() => {
    const syncItemsViewMode = () => {
      const scope = String(
        userInfo?.Username ??
        userInfo?.username ??
        userInfo?.LoginName ??
        userInfo?.loginName ??
        userInfo?.ClientCode ??
        userInfo?.clientCode ??
        'default'
      ).trim().toLowerCase();
      try {
        const raw = localStorage.getItem(SAMPLE_OUT_ITEMS_VIEW_PREF_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        const saved = parsed?.[scope];
        if ((saved === 'grid' || saved === 'table') && saved !== itemsViewMode) {
          setItemsViewMode(saved);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('focus', syncItemsViewMode);
    window.addEventListener('storage', syncItemsViewMode);
    return () => {
      window.removeEventListener('focus', syncItemsViewMode);
      window.removeEventListener('storage', syncItemsViewMode);
    };
  }, [itemsViewMode, userInfo]);

  const getVendorDisplayName = (v) =>
    (v && (v.VendorName || v.Name || v.vendorName || '')) || 'Unknown';

  const getEmployeeDisplayName = (e) => {
    if (!e) return 'Unknown';
    if (e.FirstName) {
      return `${e.FirstName}${e.LastName ? ` ${e.LastName}` : ''}`.trim();
    }
    return e.EmployeeName || e.employeeName || e.Name || e.name || 'Unknown';
  };

  const getSubUserDisplayName = (u) => {
    const name = String(
      u?.employeeName ?? u?.EmployeeName ?? u?.UserName ?? u?.userName ?? ''
    ).trim();
    const code = String(u?.employeeCode ?? u?.EmployeeCode ?? '').trim();
    if (name && code) return `${name} (${code})`;
    return name || code || String(u?.Email ?? u?.email ?? 'Unknown').trim();
  };

  const getCustomerDisplayName = (customer) => {
    if (!customer) return '';
    if (customer.FirstName) {
      return `${customer.FirstName}${customer.LastName ? ` ${customer.LastName}` : ''}`.trim();
    }
    return customer.Name || customer.CustomerName || 'Unknown';
  };

  const normalizePartyQuery = (s) =>
    String(s || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();

  /** Title-style words for person names in search field and list (vendors keep API casing). */
  const toProperPersonName = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str
      .trim()
      .split(/\s+/)
      .map((word) => {
        if (!word) return '';
        if (word.length === 1) return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Fetch customers
  useEffect(() => {
    if (userInfo?.ClientCode) {
      fetchCustomers();
    }
  }, [userInfo]);

  const fetchSubUsers = async () => {
    setLoadingSubUsers(true);
    try {
      const { data } = await axios.get(getAllSubUsersUrl(), { headers: sampleAuthHeaders() });
      setSubUserList(normalizeArray(data));
    } catch (error) {
      console.error('Error fetching sub-users:', error);
      setSubUserList([]);
    } finally {
      setLoadingSubUsers(false);
    }
  };

  const fetchCustomers = async () => {
    if (!userInfo?.ClientCode) return;
    
    setLoadingCustomers(true);
    try {
      const headers = sampleAuthHeaders();
      let customers = [];
      try {
        const lookup = await axios.get(getPartyLookupUrl('Customer', userInfo.ClientCode), { headers });
        customers = normalizeArray(lookup.data);
      } catch (_) {
        /* fallback */
      }
      if (!customers.length) {
        const response = await axios.post(
          getGetAllCustomerUrl(),
          { ClientCode: userInfo.ClientCode },
          { headers }
        );
        customers = normalizeArray(response.data);
      }
      setCustomerList(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load customers. Please refresh the page.'
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchVendors = async () => {
    if (!userInfo?.ClientCode) return;
    setLoadingVendors(true);
    try {
      const headers = sampleAuthHeaders();
      const body = { ClientCode: userInfo.ClientCode };
      let vendors = [];
      try {
        const lookup = await axios.get(getPartyLookupUrl('Vendor', userInfo.ClientCode), { headers });
        vendors = normalizeArray(lookup.data);
      } catch (_) {
        /* fallback */
      }
      if (!vendors.length) {
        let response;
        try {
          response = await axios.post(getGetAllVendorUrl(), body, { headers });
        } catch {
          response = await axios.post(getGetAllVendorsAltUrl(), body, { headers });
        }
        vendors = normalizeArray(response.data);
      }
      setVendorList(vendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendorList([]);
    } finally {
      setLoadingVendors(false);
    }
  };

  const fetchEmployees = async () => {
    const cc = resolveClientCodeForSampleApi(userInfo);
    if (!cc) return;
    setLoadingEmployees(true);
    try {
      const headers = sampleAuthHeaders();
      let employees = [];
      try {
        const response = await axios.post(
          getGetAllEmployeeUrl(),
          { ClientCode: cc },
          { headers }
        );
        employees = normalizeArray(response.data);
      } catch (_) {
        /* fallback */
      }
      if (!employees.length) {
        try {
          const lookup = await axios.get(getPartyLookupUrl('Employee', cc), { headers });
          employees = normalizeArray(lookup.data);
        } catch (_) {
          /* ignore */
        }
      }
      setEmployeeList(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployeeList([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    if (userInfo?.ClientCode) {
      fetchVendors();
      fetchEmployees();
    }
    fetchSubUsers();
  }, [userInfo]);

  // Filter customers based on search input
  useEffect(() => {
    if (partyType !== 'customer') {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }
    const hasQuery = customerSearch.trim().length > 0;
    if (!hasQuery) {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }

    const searchTerm = customerSearch.toLowerCase();
    const filtered = customerList.filter(customer => {
      const firstName = (customer.FirstName || '').toLowerCase();
      const lastName = (customer.LastName || '').toLowerCase();
      const name = (customer.Name || '').toLowerCase();
      const customerName = (customer.CustomerName || '').toLowerCase();
      const mobile = (customer.Mobile || customer.MobileNumber || '').toLowerCase();
      
      return firstName.includes(searchTerm) || 
             lastName.includes(searchTerm) || 
             name.includes(searchTerm) || 
             customerName.includes(searchTerm) ||
             mobile.includes(searchTerm);
    });

    const selected = selectedCustomerId
      ? customerList.find((c) => String(c.Id) === String(selectedCustomerId))
      : null;
    const lockedLabel = selected
      ? normalizePartyQuery(toProperPersonName(getCustomerDisplayName(selected)))
      : '';
    const q = normalizePartyQuery(customerSearch);
    const selectionLocksDropdown = Boolean(selected && lockedLabel && q === lockedLabel);

    setFilteredCustomers(filtered);
    setShowCustomerDropdown(!selectionLocksDropdown);
  }, [customerSearch, customerList, partyType, selectedCustomerId]);

  useEffect(() => {
    if (partyType !== 'vendor') {
      setFilteredVendors([]);
      setShowVendorDropdown(false);
      return;
    }
    const hasQuery = vendorSearch.trim().length > 0;
    if (!hasQuery) {
      setFilteredVendors([]);
      setShowVendorDropdown(false);
      return;
    }
    const searchTerm = vendorSearch.toLowerCase();
    const filtered = vendorList.filter((v) => {
      const name = (v.VendorName || v.Name || v.vendorName || '').toLowerCase();
      const mobile = (v.Mobile || v.Phone || v.PhoneNumber || '').toLowerCase();
      return name.includes(searchTerm) || mobile.includes(searchTerm);
    });
    const selected = selectedVendorId
      ? vendorList.find((v) => String(v.Id) === String(selectedVendorId))
      : null;
    const lockedLabel = selected ? normalizePartyQuery(getVendorDisplayName(selected).trim()) : '';
    const q = normalizePartyQuery(vendorSearch);
    const selectionLocksDropdown = Boolean(selected && lockedLabel && q === lockedLabel);

    setFilteredVendors(filtered);
    setShowVendorDropdown(!selectionLocksDropdown);
  }, [vendorSearch, vendorList, partyType, selectedVendorId]);

  useEffect(() => {
    if (partyType !== 'employee') {
      setFilteredEmployees([]);
      setShowEmployeeDropdown(false);
      return;
    }
    const hasQuery = employeeSearch.trim().length > 0;
    if (!hasQuery) {
      setFilteredEmployees([]);
      setShowEmployeeDropdown(false);
      return;
    }
    const searchTerm = employeeSearch.toLowerCase();
    const filtered = employeeList.filter((emp) => {
      const first = (emp.FirstName || '').toLowerCase();
      const last = (emp.LastName || '').toLowerCase();
      const ename = (emp.EmployeeName || emp.Name || '').toLowerCase();
      const mobile = (emp.Mobile || emp.Phone || emp.ContactNo || emp.contactNo || '').toLowerCase();
      return (
        first.includes(searchTerm) ||
        last.includes(searchTerm) ||
        ename.includes(searchTerm) ||
        mobile.includes(searchTerm)
      );
    });
    const selected = selectedEmployeeId
      ? employeeList.find((e) => String(e.Id) === String(selectedEmployeeId))
      : null;
    const lockedLabel = selected
      ? normalizePartyQuery(toProperPersonName(getEmployeeDisplayName(selected)))
      : '';
    const q = normalizePartyQuery(employeeSearch);
    const selectionLocksDropdown = Boolean(selected && lockedLabel && q === lockedLabel);

    setFilteredEmployees(filtered);
    setShowEmployeeDropdown(!selectionLocksDropdown);
  }, [employeeSearch, employeeList, partyType, selectedEmployeeId]);

  useEffect(() => {
    if (partyType !== 'employee') return;

    const hasQuery = assignToSearch.trim().length > 0;
    if (!hasQuery) {
      setFilteredSubUsers(showAssignToDropdown ? subUserList : []);
      return;
    }

    const q = assignToSearch.toLowerCase();
    const filtered = subUserList.filter((u) => {
      const name = getSubUserDisplayName(u).toLowerCase();
      const email = String(u.Email || u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
    const selected = selectedAssignToUserId
      ? subUserList.find((u) => String(u.UserId || u.userId) === String(selectedAssignToUserId))
      : null;
    const lockedLabel = selected ? normalizePartyQuery(getSubUserDisplayName(selected)) : '';
    const nq = normalizePartyQuery(assignToSearch);
    const selectionLocksDropdown = lockedLabel && nq === lockedLabel;
    setFilteredSubUsers(filtered);
    setShowAssignToDropdown(!selectionLocksDropdown);
  }, [assignToSearch, subUserList, selectedAssignToUserId, partyType, showAssignToDropdown]);

  useEffect(() => {
    if (partyType !== 'employee' || !selectedAssignToUserId || subUserList.length === 0) return;
    const u = subUserList.find((x) => String(x.UserId || x.userId) === String(selectedAssignToUserId));
    if (u) {
      setAssignToSearch(getSubUserDisplayName(u));
      syncEmployeePartyIdFromSubUser(u);
    }
  }, [selectedAssignToUserId, subUserList, partyType]);

  useEffect(() => {
    if (partyType !== 'customer') return;
    const hasQuery = assignToSearch.trim().length > 0;
    if (!hasQuery) {
      setFilteredCustomers([]);
      setShowAssignToDropdown(false);
      return;
    }
    setCustomerSearch(assignToSearch);
    const searchTerm = assignToSearch.toLowerCase();
    const filtered = customerList.filter((customer) => {
      const firstName = (customer.FirstName || '').toLowerCase();
      const lastName = (customer.LastName || '').toLowerCase();
      const name = (customer.Name || customer.CustomerName || '').toLowerCase();
      const mobile = (customer.Mobile || customer.MobileNumber || '').toLowerCase();
      return (
        firstName.includes(searchTerm) ||
        lastName.includes(searchTerm) ||
        name.includes(searchTerm) ||
        mobile.includes(searchTerm)
      );
    });
    const selected = selectedCustomerId
      ? customerList.find((c) => String(c.PartyId ?? c.Id) === String(selectedCustomerId))
      : null;
    const lockedLabel = selected ? normalizePartyQuery(toProperPersonName(getCustomerDisplayName(selected))) : '';
    const nq = normalizePartyQuery(assignToSearch);
    setFilteredCustomers(filtered);
    setShowAssignToDropdown(!(lockedLabel && nq === lockedLabel));
  }, [assignToSearch, customerList, selectedCustomerId, partyType]);

  useEffect(() => {
    if (partyType !== 'vendor') return;
    const hasQuery = assignToSearch.trim().length > 0;
    if (!hasQuery) {
      setFilteredVendors([]);
      setShowAssignToDropdown(false);
      return;
    }
    setVendorSearch(assignToSearch);
    const searchTerm = assignToSearch.toLowerCase();
    const filtered = vendorList.filter((v) => {
      const name = getVendorDisplayName(v).toLowerCase();
      const mob = (v.Mobile || v.Phone || v.PhoneNumber || '').toLowerCase();
      return name.includes(searchTerm) || mob.includes(searchTerm);
    });
    const selected = selectedVendorId
      ? vendorList.find((v) => String(v.PartyId ?? v.Id) === String(selectedVendorId))
      : null;
    const lockedLabel = selected ? normalizePartyQuery(getVendorDisplayName(selected).trim()) : '';
    const nq = normalizePartyQuery(assignToSearch);
    setFilteredVendors(filtered);
    setShowAssignToDropdown(!(lockedLabel && nq === lockedLabel));
  }, [assignToSearch, vendorList, selectedVendorId, partyType]);

  // Update customer details when customer is selected
  useEffect(() => {
    if (partyType !== 'customer') return;
    if (selectedCustomerId && customerList.length > 0) {
      const customer = customerList.find(c => c.Id == selectedCustomerId || c.Id === selectedCustomerId);
      if (customer) {
        const rawName = getCustomerDisplayName(customer);
        const customerName = toProperPersonName(rawName);
        setCustomerName(customerName);
        setCustomerSearch(customerName);
        setCustomerMobile(customer.Mobile || customer.MobileNumber || '');
        setFineGold(customer.FineGold ? parseFloat(customer.FineGold).toFixed(3) : '0.000');
        setAdvanceAmount(customer.AdvanceAmount ? parseFloat(customer.AdvanceAmount).toFixed(2) : '0.00');
        setBalanceAmount(customer.BalanceAmount ? parseFloat(customer.BalanceAmount).toFixed(3) : '0.000');
        // Calculate Fine% if FineGold is available
        if (customer.FineGold) {
          const fine = parseFloat(customer.FineGold);
          setFinePercent(fine.toFixed(2));
        } else {
          setFinePercent('0.00');
        }
      } else {
        // Reset if customer not found
        setCustomerName('');
        setCustomerSearch('');
        setCustomerMobile('');
        setFineGold('0.000');
        setAdvanceAmount('0.00');
        setBalanceAmount('0.000');
        setFinePercent('0.00');
      }
    } else if (!selectedCustomerId) {
      // Reset when no customer selected
      setCustomerName('');
      setCustomerSearch('');
      setCustomerMobile('');
      setFineGold('0.000');
      setAdvanceAmount('0.00');
      setBalanceAmount('0.000');
      setFinePercent('0.00');
    }
  }, [selectedCustomerId, customerList, partyType]);

  useEffect(() => {
    if (partyType === 'vendor' && !selectedVendorId) {
      setCustomerMobile('');
    }
  }, [partyType, selectedVendorId]);

  useEffect(() => {
    if (partyType === 'employee' && !selectedEmployeeId) {
      setCustomerMobile('');
    }
  }, [partyType, selectedEmployeeId]);

  useEffect(() => {
    if (partyType !== 'vendor' || !selectedVendorId || vendorList.length === 0) {
      return;
    }
    const v = vendorList.find((x) => String(x.Id) === String(selectedVendorId));
    if (v) {
      setVendorSearch(String(getVendorDisplayName(v)).trim());
      setCustomerMobile(String(v.Mobile || v.Phone || v.PhoneNumber || ''));
    }
  }, [selectedVendorId, vendorList, partyType]);

  useEffect(() => {
    if (partyType !== 'employee' || !selectedEmployeeId || employeeList.length === 0) {
      return;
    }
    const e = employeeList.find((x) => String(x.Id) === String(selectedEmployeeId));
    if (e) {
      setEmployeeSearch(toProperPersonName(getEmployeeDisplayName(e)));
      setCustomerMobile(String(e.Mobile || e.Phone || e.ContactNo || e.contactNo || ''));
    }
  }, [selectedEmployeeId, employeeList, partyType]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
        setShowVendorDropdown(false);
        setShowEmployeeDropdown(false);
        setShowAssignToDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle customer selection from dropdown
  const handleCustomerSelect = (customer) => {
    setSelectedCustomerId(customer.PartyId ?? customer.Id);
    setShowCustomerDropdown(false);
  };

  const handleVendorSelect = (v) => {
    setSelectedVendorId(v.PartyId ?? v.Id);
    setShowVendorDropdown(false);
  };

  const handleEmployeeSelect = (e) => {
    setSelectedEmployeeId(e.Id);
    setShowEmployeeDropdown(false);
  };

  const handlePartyTypeChange = (next) => {
    setPartyType(next);
    setSelectedCustomerId('');
    setCustomerSearch('');
    setSelectedVendorId('');
    setVendorSearch('');
    setSelectedEmployeeId('');
    setEmployeeSearch('');
    setSelectedAssignToUserId('');
    setAssignToSearch('');
    setCustomerName('');
    setCustomerMobile('');
    setFineGold('0.000');
    setAdvanceAmount('0.00');
    setBalanceAmount('0.000');
    setFinePercent('0.00');
    setShowCustomerDropdown(false);
    setShowVendorDropdown(false);
    setShowEmployeeDropdown(false);
    setShowAssignToDropdown(false);
  };

  const assignToFieldLabel =
    partyType === 'customer'
      ? 'Customer'
      : partyType === 'vendor'
        ? 'Vendor'
        : 'Employee';

  const assignToPlaceholder =
    partyType === 'customer'
      ? 'Search customer…'
      : partyType === 'vendor'
        ? 'Search vendor…'
        : 'Click or type to select employee…';

  const assignToLoading =
    partyType === 'customer'
      ? loadingCustomers
      : partyType === 'vendor'
        ? loadingVendors
        : loadingSubUsers;

  const hasAssignToSelection = () => {
    if (partyType === 'customer') return Boolean(selectedCustomerId);
    if (partyType === 'vendor') return Boolean(selectedVendorId);
    return Boolean(selectedAssignToUserId);
  };

  const resolveAssignedToUserId = () => {
    if (partyType === 'employee') {
      if (selectedAssignToUserId) return String(selectedAssignToUserId);
      const sub = subUserList.find(
        (u) =>
          partyLabelCore(getSubUserDisplayName(u)) === partyLabelCore(assignToSearch) ||
          partyLabelCore(u.UserName || u.userName) === partyLabelCore(assignToSearch)
      );
      return sub ? String(sub.UserId || sub.userId || '') : '';
    }
    const auth = getAuthState();
    return String(
      auth?.userId ||
        userInfo?.UserId ||
        userInfo?.UserID ||
        userInfo?.Id ||
        userInfo?.id ||
        ''
    );
  };

  const partyTypeLabel = (t) =>
    t === 'customer' ? 'Customer' : t === 'vendor' ? 'Vendor' : 'Employee';

  const getResolvedPartyNameForSummary = () => getResolvedAssignToName();

  const getResolvedAssignToName = () => assignToSearch || '—';

  const assignToDropdownOpen =
    showAssignToDropdown &&
    (partyType === 'employee'
      ? filteredSubUsers.length > 0 || loadingSubUsers
      : assignToSearch.trim().length > 0);

  const noMatchAssignLabel =
    partyType === 'customer' ? 'customer' : partyType === 'vendor' ? 'vendor' : 'employee';

  /** Preview only — GET GetLastNextSampleLotNumber; final lot assigned on SubmitSampleOut. */
  const refreshLotPreviewLabel = async () => {
    const clientCode = resolveClientCodeForSampleApi(userInfo);
    if (!clientCode) {
      setNextLotNoLoading(false);
      setSampleOutNumber('');
      return;
    }
    setNextLotNoLoading(true);
    try {
      const url = `${getLastNextSampleLotNumberUrl()}?clientCode=${encodeURIComponent(clientCode)}`;
      const { data } = await axios.get(url, { headers: sampleAuthHeaders() });
      if (data?.success === false) {
        setSampleOutNumber('');
        return;
      }
      const preview = formatNextLotPreview(data, clientCode);
      setSampleOutNumber(preview);
    } catch (error) {
      console.warn('GetLastNextSampleLotNumber:', error);
      setSampleOutNumber('');
    } finally {
      setNextLotNoLoading(false);
    }
  };

  useEffect(() => {
    refreshLotPreviewLabel();
  }, [userInfo]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    itemCodeSearchTermRef.current = itemCodeSearch;
  }, [itemCodeSearch]);

  // Debounced item code search
  useEffect(() => {
    if (!itemCodeSearch || itemCodeSearch.trim().length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      handleItemCodeSearch(itemCodeSearch);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [itemCodeSearch]);

  // Search labeled stock via ProductMaster SearchLabelledStock (item code / RFID / design no)
  const handleItemCodeSearch = async (searchTerm) => {
    const trimmed = String(searchTerm || '').trim();
    if (!trimmed) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    if (!userInfo?.ClientCode) {
      return;
    }

    setSearching(true);
    try {
      const results = await fetchLabeledStockSearchResults(userInfo.ClientCode, trimmed);
      if (normalizeDesignSearchTerm(itemCodeSearchTermRef.current) !== normalizeDesignSearchTerm(trimmed)) {
        return;
      }

      if (shouldAutoAddSearchResults(trimmed, results)) {
        setSearchResults([]);
        setShowSearchResults(false);
        setScanChecking(true);
        try {
          const batchResult = await processScannedBatch(results, { source: 'search', showReview: false });
          setItemCodeSearch('');
          const totalAdded = (batchResult.added || 0) + (batchResult.inQueued || 0);
          if (totalAdded > 0) {
            addNotification({
              type: 'success',
              title: results.length > 1 ? 'Products added' : 'Product added',
              message:
                results.length > 1
                  ? `Added ${totalAdded} item(s) for "${trimmed}".`
                  : `Added ${totalAdded} item for "${trimmed}".`,
            });
          } else if ((batchResult.blocked || 0) > 0 || (batchResult.errors || 0) > 0) {
            addNotification({
              type: 'warning',
              title: 'Some items skipped',
              message: `${batchResult.blocked || 0} blocked, ${batchResult.errors || 0} could not be added.`,
            });
          }
        } finally {
          setScanChecking(false);
        }
        return;
      }

      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } catch (error) {
      console.error('Error searching item code:', error);
      setSearchResults([]);
      setShowSearchResults(false);
      addNotification({
        type: 'error',
        title: 'Search Error',
        message: 'Failed to search for item. Please try again.'
      });
    } finally {
      setSearching(false);
    }
  };

  const openScanReviewModal = (payload) => {
    setScanReviewModal({
      title: payload.title || 'Scan review',
      subtitle: payload.subtitle || '',
      sections: payload.sections || [],
    });
  };

  const addSampleOutRowToGrid = (productData) => {
    const key = rowDedupKey(productData);
    if (!key) {
      return { ok: false, level: 'error', itemCode: '—', message: 'Could not read item code or stock id.' };
    }

    let duplicate = false;
    setSampleOutItems((prev) => {
      if (
        prev.some(
          (sampleItem) =>
            rowDedupKey(sampleItem) === key &&
            (sampleItem.__scanAction === 'SampleOut' || sampleItem.__scanAction === 'SampleInPending')
        )
      ) {
        duplicate = true;
        return prev;
      }
      return [...prev, stampScannedByUser(productData)];
    });

    if (duplicate) {
      return {
        ok: false,
        level: 'warning',
        itemCode: productData.Itemcode || productData.ItemCode || '—',
        message: 'Already in Sample Out list.',
      };
    }
    const stamped = stampScannedByUser(productData);
    return {
      ok: true,
      level: 'success',
      itemCode: stamped.Itemcode || stamped.ItemCode || '—',
      rfid: stamped.RFIDNumber || '—',
      message: 'Queued for Sample Out.',
      productData: stamped,
    };
  };

  const applySampleInEmployeeFromLot = (lotMeta) => {
    if (!lotMeta) return;
    setPartyType('employee');
    const assignName = String(lotMeta.assignedToUserName ?? lotMeta.AssignedToUserName ?? '').trim();
    const assignUserId = String(lotMeta.assignedToUserId ?? lotMeta.AssignedToUserId ?? '').trim();
    if (assignName) {
      setAssignToSearch(assignName);
      setEmployeeSearch(assignName);
    }
    if (assignUserId) {
      setSelectedAssignToUserId(assignUserId);
      const sub = subUserList.find((u) => String(u.UserId || u.userId) === assignUserId);
      if (sub) {
        setAssignToSearch(getSubUserDisplayName(sub));
      }
      return;
    }
    if (assignName && subUserList.length) {
      const sub = subUserList.find((u) => {
        const n = partyLabelCore(getSubUserDisplayName(u));
        const login = partyLabelCore(u.UserName || u.userName || '');
        const q = partyLabelCore(assignName);
        return n === q || login === q || (n && (n.includes(q) || q.includes(n)));
      });
      if (sub) {
        setSelectedAssignToUserId(String(sub.UserId || sub.userId));
        setAssignToSearch(getSubUserDisplayName(sub));
      }
    }
  };

  const addSampleInPendingRow = (item, checkData, source = 'search') => {
    const lotMeta = extractActiveLotMeta(checkData);
    const lotNo = lotMeta.lotNumber;
    const lotId = lotMeta.lotId;
    const itemCode = rowItemCodeFromRaw(item) || item.Itemcode || item.ItemCode || '—';
    const lotItemId =
      item.__lotItemId ??
      item.LotItemId ??
      item.lotItemId ??
      checkData?.lotItemId ??
      checkData?.LotItemId ??
      checkData?.product?.lotItemId ??
      checkData?.product?.LotItemId ??
      checkData?.Product?.lotItemId ??
      checkData?.Product?.LotItemId ??
      null;
    const key = rowDedupKey(item);
    let duplicate = false;
    const productData = stampScannedByUser(enrichItemFromCheckStatus(item, checkData));
    Object.assign(productData, {
      scanSource: pickItemScanSource(item) || source,
      __persistedScanSource: pickItemScanSource(item) || source,
      __scanAction: 'SampleInPending',
      __scanPhase: 'secondScan',
      __lotNumber: lotNo,
      __lotId: lotId,
      __lotItemId: lotItemId,
      LotItemId: lotItemId ?? undefined,
      __lotStatus: lotMeta.lotStatus,
      __lotAssignedToUserName: lotMeta.assignedToUserName,
      __lotAssignedToUserId: lotMeta.assignedToUserId,
      __lotCanSampleIn: lotMeta.canSampleIn,
      __lotTotalItems: lotMeta.totalItems,
      __lotOutItems: lotMeta.outItems,
      __lotReturnedItems: lotMeta.returnedItems,
      __lotRemainingOutItems: lotMeta.remainingOutItems,
      __checkScanMessage: String(checkData?.message ?? checkData?.Message ?? '').trim(),
    });

    setSampleOutItems((prev) => {
      const existingPending = prev.find(
        (r) => rowDedupKey(r) === key && r.__scanAction === 'SampleInPending'
      );
      if (existingPending) {
        if (source === 'tray') {
          duplicate = false;
          const withoutPriorQueue = prev.filter(
            (r) =>
              rowDedupKey(r) !== key ||
              (r.__scanAction !== 'SampleOut' && r.__scanAction !== 'SampleInPending')
          );
          return [{ ...productData, id: existingPending.id }, ...withoutPriorQueue];
        }
        duplicate = true;
        return prev;
      }
      const withoutPriorQueue = prev.filter(
        (r) =>
          rowDedupKey(r) !== key ||
          (r.__scanAction !== 'SampleOut' && r.__scanAction !== 'SampleInPending')
      );
      return [productData, ...withoutPriorQueue];
    });

    if (duplicate) {
      return {
        ok: false,
        level: 'warning',
        itemCode,
        message: `Already queued for Sample In (lot ${lotNo}).`,
      };
    }
    applySampleInEmployeeFromLot(lotMeta);
    const assignHint = lotMeta.assignedToUserName
      ? ` Assigned to ${lotMeta.assignedToUserName} at Sample Out.`
      : '';
    const refreshedTray = source === 'tray' ? ' Tray rescan updated.' : '';
    return {
      ok: true,
      level: 'info',
      itemCode,
      rfid: productData.RFIDNumber || '—',
      message: `2nd scan — queued Sample In (lot ${lotNo}).${assignHint}${refreshedTray} Confirm with Sample In button.`,
      productData,
    };
  };

  const processScannedProduct = async (
    item,
    {
      clearSearch = true,
      source = 'search',
      silent = false,
      quietSuccess = true,
    } = {}
  ) => {
    const clientCode = resolveClientCodeForSampleApi(userInfo);
    const itemCode = String(rowItemCodeFromRaw(item) || item.Itemcode || item.ItemCode || '').trim();
    const rfid = String(item.RFIDNumber || item.RFID || item.RFIDCode || item.rfidCode || '').trim();
    const tid = String(
      item.TIDValue || item.TIDNumber || item.tidValue || item.tidNumber || item.epc || ''
    ).trim();
    const labelledStockId = parseInt(item.LabelledStockId || item.Id || item.id, 10);

    const fail = (level, message) => ({
      ok: false,
      level,
      itemCode: itemCode || '—',
      rfid,
      message,
    });

    if (!clientCode) {
      const r = fail('error', 'User information not found. Please refresh the page.');
      if (!silent) openScanReviewModal({ title: 'Scan error', sections: [{ type: 'error', heading: 'Error', rows: [r] }] });
      return r;
    }

    if (!tid && !rfid && !itemCode && !(Number.isFinite(labelledStockId) && labelledStockId > 0)) {
      const r = fail('error', 'Scan needs RFID, TID, or item code.');
      if (!silent) openScanReviewModal({ title: 'Scan error', sections: [{ type: 'error', heading: 'Error', rows: [r] }] });
      return r;
    }

    const key = rowDedupKey(item);
    if (key) {
      const existing = sampleOutItemsRef.current.find((r) => rowDedupKey(r) === key);
      if (existing) {
        // Only a re-read of an item already queued for Sample In refreshes it.
        // A row already in the grid as Sample Out is a duplicate, never an
        // automatic return — the server alone decides Sample In status.
        const isTrayReturnRescan =
          source === 'tray' && existing.__scanAction === 'SampleInPending';
        if (!isTrayReturnRescan) {
          const msg =
            existing.__scanAction === 'SampleInPending'
              ? `Already queued for Sample In (lot ${existing.__lotNumber || '—'}).`
              : `Item ${itemCode || rfid || tid} is already added in the grid.`;
          const r = fail('warning', msg);
          if (!silent) {
            openScanReviewModal({
              title: 'Already added',
              subtitle: 'This item is already in your current scan list.',
              sections: [{ type: 'warning', heading: 'Skipped', rows: [r] }],
            });
          }
          if (clearSearch) {
            setSearchResults([]);
            setShowSearchResults(false);
            setItemCodeSearch('');
          }
          return r;
        }
      }
    }

    try {
      const { data: checkData } = await axios.post(
        getCheckScanStatusUrl(),
        {
          ClientCode: clientCode,
          TIDValue: tid || undefined,
          RFIDCode: rfid || undefined,
          ItemCode: itemCode || undefined,
          LabelledStockId: Number.isFinite(labelledStockId) && labelledStockId > 0 ? labelledStockId : undefined,
        },
        { headers: sampleAuthHeaders() }
      );

      let scanAction = normalizeScanAction(checkData?.scanAction ?? checkData?.ScanAction ?? '');
      const scanPhase = String(checkData?.scanPhase ?? checkData?.ScanPhase ?? '')
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, '');
      // Sample In is decided ONLY by the server: an item becomes a return when
      // the backend reports it is genuinely already sampled out (SampleIn action
      // or a second-scan phase). We never force SampleOut -> SampleIn locally,
      // otherwise items that were never sampled out get wrongly queued as returns.
      if (scanPhase === 'secondscan' && scanAction === 'SampleOut') {
        scanAction = 'SampleIn';
      }
      const statusMsg = String(checkData?.message ?? checkData?.Message ?? '').trim();

      if (scanAction === 'NotFound' || checkData?.success === false) {
        const r = fail('error', statusMsg || 'Product not found for this scan.');
        if (!silent) openScanReviewModal({ title: 'Not found', sections: [{ type: 'error', heading: 'Not found', rows: [r] }] });
        return r;
      }

      if (scanAction === 'Blocked') {
        const friendlyMsg = formatBlockedScanMessage(statusMsg, itemCode, checkData);
        const r = fail('error', friendlyMsg);
        if (!silent) {
          openScanReviewModal({
            title: 'Cannot Scan Item',
            subtitle: 'This item is not available for scanning at the moment.',
            sections: [{ type: 'error', heading: 'Scan Not Allowed', rows: [r] }],
          });
        }
        return r;
      }

      if (scanAction === 'SampleIn') {
        const r = addSampleInPendingRow(item, checkData, source);
        if (!silent && !quietSuccess && r.ok) {
          openScanReviewModal({
            title: 'Sample In — 2nd scan',
            subtitle: statusMsg,
            sections: [{ type: 'info', heading: 'Queued for return', rows: [r] }],
          });
        } else if (!silent && !r.ok) {
          openScanReviewModal({ title: 'Sample In', sections: [{ type: 'warning', heading: 'Skipped', rows: [r] }] });
        }
        if (clearSearch) {
          setSearchResults([]);
          setShowSearchResults(false);
          setItemCodeSearch('');
        }
        return r;
      }

      if (scanAction === 'SampleOut') {
        const productData = enrichItemFromCheckStatus(item, checkData);
        const resolvedSource = pickItemScanSource(item) || source;
        productData.scanSource = resolvedSource;
        productData.__persistedScanSource = resolvedSource;
        const r = addSampleOutRowToGrid(productData);
        if (!silent && !quietSuccess) {
          if (r.ok) {
            openScanReviewModal({
              title: 'Sample Out — 1st scan',
              subtitle: statusMsg,
              sections: [{ type: 'success', heading: 'Added', rows: [r] }],
            });
          } else {
            openScanReviewModal({ title: 'Sample Out', sections: [{ type: 'warning', heading: 'Skipped', rows: [r] }] });
          }
        } else if (!silent && quietSuccess && !r.ok) {
          openScanReviewModal({ title: 'Sample Out', sections: [{ type: 'warning', heading: 'Skipped', rows: [r] }] });
        }
        if (clearSearch) {
          setSearchResults([]);
          setShowSearchResults(false);
          setItemCodeSearch('');
        }
        return r;
      }

      const r = fail('warning', statusMsg || `Unknown scan action: ${scanAction || '—'}`);
      if (!silent) openScanReviewModal({ title: 'Scan', sections: [{ type: 'warning', heading: 'Unknown', rows: [r] }] });
      return r;
    } catch (err) {
      const r = fail('error', pickSampleOutErrorMessage(err));
      if (!silent) openScanReviewModal({ title: 'Scan failed', sections: [{ type: 'error', heading: 'Error', rows: [r] }] });
      return r;
    }
  };

  const bulkIngestRfidRows = (items, { source = 'device', showReview = false } = {}) => {
    if (!items?.length) return { added: 0, skipped: 0 };

    let added = 0;
    let skipped = 0;

    setSampleOutItems((prev) => {
      const existing = new Set(
        prev
          .filter((i) => i.__scanAction === 'SampleOut' || i.__scanAction === 'SampleInPending')
          .map(rowDedupKey)
      );
      const next = [...prev];

      items.forEach((raw) => {
        const productData = stampScannedByUser(
          raw.__scanAction
            ? raw
            : buildProductDataFromRaw(raw, { scanSource: source, __scanAction: 'SampleOut' })
        );
        const key = rowDedupKey(productData);
        if (!key || existing.has(key)) {
          skipped += 1;
          return;
        }
        existing.add(key);
        added += 1;
        next.push(productData);
      });

      return next;
    });

    if (showReview && (added > 0 || skipped > 0)) {
      openScanReviewModal({
        title: 'RFID reader load',
        subtitle: `${items.length} tag(s) from GetAllRFIDDetails — one summary, not a popup per item.`,
        sections: [
          ...(added
            ? [
                {
                  type: 'success',
                  heading: `Added to grid (${added})`,
                  rows: [{ itemCode: '—', message: `${added} item(s) ready for Sample Out. Check grid below.` }],
                },
              ]
            : []),
          ...(skipped
            ? [
                {
                  type: 'warning',
                  heading: `Skipped (${skipped})`,
                  rows: [{ itemCode: '—', message: 'Duplicate or already in list.' }],
                },
              ]
            : []),
        ],
      });
    }

    return { added, skipped };
  };

  const processScannedBatch = async (
    items,
    { source = 'tray', showReview = true } = {}
  ) => {
    if (!items?.length) return { added: 0, inQueued: 0, blocked: 0, errors: 0 };

    setScanChecking(true);
    const outAdded = [];
    const inQueued = [];
    const blocked = [];
    const errors = [];
    try {
      for (let i = 0; i < items.length; i += 1) {
        const rowSource = pickItemScanSource(items[i]) || source;
        // Sequential updates keep tray batch dedupe reliable in React state.
        // Each tag's Sample Out vs Sample In is decided per item by the server,
        // so one return in the batch never forces the others to return.
        // eslint-disable-next-line no-await-in-loop
        const result = await processScannedProduct(items[i], {
          clearSearch: false,
          source: rowSource,
          silent: true,
          quietSuccess: true,
        });
        if (!result) continue;
        const row = {
          itemCode: result.itemCode || '—',
          rfid: result.rfid || '—',
          message: result.message || '—',
        };
        if (result.ok && result.productData?.__scanAction === 'SampleInPending') inQueued.push(row);
        else if (result.ok) outAdded.push(row);
        else if (result.level === 'warning') blocked.push(row);
        else errors.push(row);
      }

      if (!showReview) {
        return {
          added: outAdded.length,
          inQueued: inQueued.length,
          blocked: blocked.length,
          errors: errors.length,
        };
      }

      const total = items.length;
      const compact = total > BULK_REVIEW_DETAIL_CAP;
      const capRows = (rows, heading, type) => {
        if (!rows.length) return null;
        if (compact) {
          return {
            type,
            heading: `${heading} (${rows.length})`,
            rows: [{ itemCode: '—', message: `${rows.length} item(s) — see grid for full list.` }],
          };
        }
        return { type, heading: `${heading} (${rows.length})`, rows };
      };

      const sections = [
        capRows(outAdded, 'Sample Out', 'success'),
        capRows(inQueued, 'Sample In queued', 'info'),
        capRows(blocked, 'Blocked', 'warning'),
        capRows(errors, 'Errors', 'error'),
      ].filter(Boolean);

      const trayTitle =
        inQueued.length > 0 && outAdded.length === 0
          ? 'Tray scan — Sample In return'
          : outAdded.length > 0 && inQueued.length === 0
            ? 'Tray scan — Sample Out'
            : 'Tray scan complete';

      openScanReviewModal({
        title: trayTitle,
        subtitle: `${total} tag(s) processed.`,
        sections: sections.length
          ? sections
          : [{ type: 'info', heading: 'No changes', rows: [{ itemCode: '—', message: 'Nothing was added.' }] }],
      });
      return {
        added: outAdded.length,
        inQueued: inQueued.length,
        blocked: blocked.length,
        errors: errors.length,
      };
    } finally {
      setScanChecking(false);
    }
  };

  const handleDirectScan = async (term) => {
    const t = String(term || '').trim();
    if (!t) return;
    const clientCode = resolveClientCodeForSampleApi(userInfo);
    setScanChecking(true);
    try {
      let results = [];
      if (clientCode) {
        results = await fetchLabeledStockSearchResults(clientCode, t);
        setSearchResults(results);
        setShowSearchResults(results.length > 0);
      }

      if (shouldAutoAddSearchResults(t, results)) {
        const batchResult = await processScannedBatch(results, { source: 'search', showReview: false });
        setItemCodeSearch('');
        setSearchResults([]);
        setShowSearchResults(false);
        const totalAdded = (batchResult.added || 0) + (batchResult.inQueued || 0);
        if (totalAdded > 0) {
          addNotification({
            type: 'success',
            title: results.length > 1 ? 'Products added' : 'Product added',
            message:
              results.length > 1
                ? `Added ${totalAdded} item(s) for "${t}".`
                : `Added ${totalAdded} item for "${t}".`,
          });
        }
        return;
      }

      if (results.length === 1) {
        await processScannedProduct(results[0], { clearSearch: true, source: 'search' });
        return;
      }
      if (results.length > 1) {
        setShowSearchResults(true);
        addNotification({
          type: 'info',
          title: 'Multiple matches',
          message: `${results.length} items found — select one from the list.`,
        });
        return;
      }
      await processScannedProduct(
        { ItemCode: t, RFIDCode: t, RFIDNumber: t, TIDValue: t },
        { clearSearch: true, source: 'barcode' }
      );
    } finally {
      setScanChecking(false);
    }
  };

  const selectItemFromSearch = async (item) => {
    setScanChecking(true);
    try {
      await processScannedProduct(item, { clearSearch: true, source: 'search' });
    } finally {
      setScanChecking(false);
    }
  };

  const getTrayAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const fetchLabelledStockProductsByIdentifiers = async (clientCode, identifiers) => {
    const list = (identifiers || []).map((v) => String(v || '').trim()).filter(Boolean);
    if (!clientCode || !list.length) return [];
    const { data } = await axios.post(
      toRrgoldApiUrl('/api/ProductMaster/GetLabelledStockByTIDNumbers'),
      {
        ClientCode: clientCode,
        TIDNumbers: list,
        TidNumbers: list,
        TIDValues: list,
        TidValues: list,
        EPCValues: list,
        EpcValues: list,
      },
      { headers: getTrayAuthHeaders(), timeout: 45000 }
    );
    return parseLabelledStockByTidResponse(data);
  };

  // The RFID device's ProductDetails omits design fields, so backfill design
  // from the labelled-stock master for any tray row that is missing it.
  const backfillTrayDesignFromLabelledStock = async (clientCode, rows) => {
    if (!rows?.length) return rows;
    const rowsMissingDesign = rows.some((row) => {
      const design = lineDesignFieldValue(row);
      return !design || design === '—';
    });
    if (!rowsMissingDesign) return rows;
    try {
      const identifiers = [
        ...new Set(
          rows
            .flatMap((row) => [row.TIDValue, row.RFIDNumber, row.Itemcode])
            .map((v) => String(v || '').trim())
            .filter(Boolean)
        ),
      ];
      const products = await fetchLabelledStockProductsByIdentifiers(clientCode, identifiers);
      if (!products.length) return rows;
      const designByKey = new Map();
      const addKey = (value, fields) => {
        const key = String(value || '').trim().toUpperCase();
        if (key && !designByKey.has(key)) designByKey.set(key, fields);
      };
      products.forEach((product) => {
        const fields = normalizeProductDesignFields(product);
        if (!fields.DesignNo && !fields.DesignName) return;
        addKey(product.TIDValue, fields);
        addKey(product.TIDNumber, fields);
        addKey(product.RFIDCode, fields);
        addKey(product.RFIDNumber, fields);
        addKey(product.ItemCode, fields);
        addKey(product.Itemcode, fields);
      });
      if (!designByKey.size) return rows;
      return rows.map((row) => {
        const existing = lineDesignFieldValue(row);
        if (existing && existing !== '—') return row;
        const match =
          designByKey.get(String(row.TIDValue || '').trim().toUpperCase()) ||
          designByKey.get(String(row.RFIDNumber || '').trim().toUpperCase()) ||
          designByKey.get(String(row.Itemcode || '').trim().toUpperCase());
        if (!match) return row;
        return {
          ...row,
          DesignName: match.DesignName,
          DesignNo: match.DesignNo,
          Design: match.DesignName,
          design_id: match.design_id,
          fullItemData: {
            ...(row.fullItemData || {}),
            DesignName: match.DesignName,
            DesignNo: match.DesignNo,
          },
        };
      });
    } catch {
      return rows;
    }
  };

  const mapDeviceRowsToSampleOutItems = (rows) => {
    const out = [];
    const seen = new Set();
    rows.forEach((entry, idx) => {
      const pd = entry?.ProductDetails ?? entry?.productDetails;
      if (!pd || typeof pd !== 'object') return;
      const itemCode = String(pd.ItemCode || pd.Itemcode || '').trim();
      const tid = String(
        entry?.TIDValue || pd.TIDValue || pd.TIDNumber || entry?.TIDNumber || ''
      ).trim();
      const rfid = String(pd.RFIDCode || pd.RFIDNumber || entry?.RFIDCode || '').trim();
      const dedup = `${itemCode.toUpperCase()}|${tid.toUpperCase()}|${rfid.toUpperCase()}`;
      if (seen.has(dedup)) return;
      seen.add(dedup);
      const designFields = normalizeProductDesignFields(pd);
      out.push({
        id: Date.now() + idx,
        __scannedAt:
          entry?.ScanDateTime ||
          entry?.CreatedDate ||
          entry?.CreatedOn ||
          pd?.ScanDateTime ||
          pd?.CreatedDate ||
          new Date().toISOString(),
        scanSource: String(entry?.DeviceId || '').trim().toLowerCase() === SAMPLE_OUT_TRAY_DEVICE_ID.toLowerCase()
          ? 'tray'
          : 'desktop',
        __persistedScanSource: String(entry?.DeviceId || '').trim().toLowerCase() === SAMPLE_OUT_TRAY_DEVICE_ID.toLowerCase()
          ? 'tray'
          : 'desktop',
        TIDValue: tid,
        RFIDNumber: rfid,
        Itemcode: itemCode,
        LabelledStockId: pd.LabelledStockId || pd.Id || entry?.Id || '',
        category_id: pd.CategoryName || pd.Category || pd.category_id || '',
        product_id: pd.ProductName || pd.Product || pd.product_id || '',
        DesignName: designFields.DesignName,
        DesignNo: designFields.DesignNo,
        Design: designFields.DesignName,
        design_id: designFields.design_id,
        purity_id: pd.PurityName || pd.Purity || pd.purity_id || '',
        grosswt: pd.GrossWt || pd.GrossWeight || pd.grosswt || pd.TWt || '0.000',
        stonewt: pd.StoneWt || pd.StoneWeight || pd.stonewt || pd.StWt || '0.000',
        diamondweight: pd.DiamondWeight || pd.diamondweight || pd.DiaWt || '0.000',
        netwt: pd.NetWt || pd.NetWeight || pd.netwt || pd.NtWt || '0.000',
        FinePercent: pd.FinePercent || pd.FinePercentage || pd['Fine %'] || '0.00',
        WastagePercent: pd.WastagePercent || pd.WastagePercentage || pd['Wastage %'] || '0.00',
        Qty: pd.Qty || pd.Quantity || 1,
        Pieces: pd.Pieces || pd.Qty || 1,
        MRP: pd.MRP ?? pd.mrp ?? pd.MRPAmount ?? pd.Mrp ?? '0',
        TotalWt: pd.GrossWt || pd.GrossWeight || pd.grosswt || pd.TWt || '0.000',
        fullItemData: pd,
      });
    });
    return out;
  };

  /** Same API as Stock Tracking → Clear all scan data (DeleteRFIDByClientAndDevice). */
  const deleteSampleOutRfidScans = async () => {
    const clientCode = resolveClientCodeForSampleApi(userInfo);
    if (!clientCode) return;
    try {
      await axios.post(
        toRrgoldApiUrl('/api/RFIDDevice/DeleteRFIDByClientAndDevice'),
        { ClientCode: clientCode, DeviceId: SAMPLE_OUT_TRAY_DEVICE_ID },
        { headers: getTrayAuthHeaders() }
      );
    } catch {
      /* keep going even if server clear fails */
    }
  };

  const clearTrayScanSession = async () => {
    await deleteSampleOutRfidScans();
    setSampleOutItems((prev) => prev.filter((item) => pickItemScanSource(item) !== 'tray'));
  };

  const handleTrayScanStart = async () => {
    await deleteSampleOutRfidScans();
  };

  const hasTrayBridge = () =>
    typeof window !== 'undefined' && !!window.electronAPI?.rfidBridgeCommand;

  const teardownInlineTrayListeners = () => {
    if (inlineTrayUnsubRef.current) {
      try { inlineTrayUnsubRef.current(); } catch { /* ignore */ }
      inlineTrayUnsubRef.current = null;
    }
  };

  // Start the tray reader directly from this page using saved reader settings.
  const startInlineTrayScan = async () => {
    if (!hasTrayBridge()) {
      toast.error('RFID tray reader works only in the desktop app.');
      return;
    }
    if (inlineTrayScanning || inlineTrayBusy) return;
    setInlineTrayBusy(true);
    try {
      const cfg = getTrayReaderConfig();
      inlineTrayTagsRef.current = new Set();
      setInlineTrayTagCount(0);
      // Clear any prior server-side scan buffer so this session starts clean.
      await handleTrayScanStart();

      const addTag = (tag) => {
        const identity = getTrayTagIdentity(tag);
        if (!identity) return;
        if (!inlineTrayTagsRef.current.has(identity)) {
          inlineTrayTagsRef.current.add(identity);
          setInlineTrayTagCount(inlineTrayTagsRef.current.size);
        }
      };
      teardownInlineTrayListeners();
      const unsubTag = window.electronAPI.onRfidBridgeTag((tag) => addTag(tag));
      const unsubLine = window.electronAPI.onRfidBridgeLine((line) => {
        const parsed = parseTrayTagLine(line);
        if (parsed) addTag(parsed);
      });
      inlineTrayUnsubRef.current = () => {
        unsubTag?.();
        unsubLine?.();
      };

      try { await window.electronAPI.rfidBridgeEnsure?.(); } catch { /* ignore */ }
      await window.electronAPI.rfidBridgeCommand('disconnect');
      await window.electronAPI.rfidBridgeCommand(`connect-serial ${cfg.comPrimary} ${cfg.baudRate}`);
      await window.electronAPI.rfidBridgeCommand(`connect-serial ${cfg.comSecondary} ${cfg.baudRate}`);
      const att = parsePowerAttDb10(cfg.powerAttDb10);
      if (att !== null) {
        try { await window.electronAPI.rfidBridgeCommand(`set-power ${att}`); } catch { /* optional */ }
      }
      await window.electronAPI.rfidBridgeCommand('start');
      setInlineTrayScanning(true);
      toast.info('Tray scan started — place the tray on the reader.');
    } catch (err) {
      teardownInlineTrayListeners();
      setInlineTrayScanning(false);
      toast.error(err?.message || 'Could not start the tray scan. Check reader connection.');
    } finally {
      setInlineTrayBusy(false);
    }
  };

  // Stop scanning and pull all scanned tags into the grid (same pipeline as the popup).
  const stopInlineTrayScan = async () => {
    if (inlineTrayBusy && !inlineTrayScanning) return;
    setInlineTrayBusy(true);
    try {
      if (hasTrayBridge()) {
        try { await window.electronAPI.rfidBridgeCommand('stop'); } catch { /* ignore */ }
      }
      teardownInlineTrayListeners();
      setInlineTrayScanning(false);

      const identities = Array.from(inlineTrayTagsRef.current);
      if (!identities.length) {
        toast.info('No tags were scanned.');
        return;
      }
      const scanRows = identities.map((epc) => ({
        epc: String(epc || '').trim().toUpperCase(),
        rfidCode: '',
      }));
      const result = await handleTrayFetchData(scanRows);
      if (result && result.success === false) {
        toast.warn(result.message || 'No products matched the scanned tray tags.');
      } else if (result && result.message) {
        toast.success(result.message);
      }
      inlineTrayTagsRef.current = new Set();
      setInlineTrayTagCount(0);
    } finally {
      setInlineTrayBusy(false);
    }
  };

  useEffect(() => () => {
    // On unmount: detach tag listeners and stop the reader if still scanning.
    teardownInlineTrayListeners();
    if (hasTrayBridge()) {
      try { window.electronAPI.rfidBridgeCommand('stop'); } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTrayStockRows = async (clientCode, scanRows) => {
    const epcs = scanRows.map((r) => r.epc);
    const headers = getTrayAuthHeaders();

    const loadFromRfidDeviceDetails = async () => {
      const { data } = await axios.post(
        toRrgoldApiUrl('/api/RFIDDevice/GetAllRFIDDetails'),
        { ClientCode: clientCode },
        { headers }
      );
      const deviceRows = normalizeRfidDeviceRows(data);
      const matching = filterDeviceRowsForTrayEpcs(deviceRows, epcs);
      return mapDeviceRowsToSampleOutItems(matching);
    };

    const loadFromLabelledStockApi = async () => {
      const products = await fetchLabelledStockProductsByIdentifiers(clientCode, epcs);
      return enrichTrayStockRows(products, scanRows);
    };

    let rows = await loadFromRfidDeviceDetails();
    if (rows.length) return backfillTrayDesignFromLabelledStock(clientCode, rows);

    await new Promise((resolve) => setTimeout(resolve, 350));
    rows = await loadFromRfidDeviceDetails();
    if (rows.length) return backfillTrayDesignFromLabelledStock(clientCode, rows);

    rows = await loadFromLabelledStockApi();
    return rows;
  };

  const handleTrayFetchData = async (scanned) => {
    const scanRows = normalizeScanRows(scanned);
    const epcs = scanRows.map((r) => r.epc);
    const clientCode = resolveClientCodeForSampleApi(userInfo);
    if (!clientCode || !epcs.length) {
      return { success: false, message: 'No RFID tags to load.' };
    }
    setLoading(true);
    try {
      const payload = scanRows.map((row) => ({
        ClientCode: clientCode,
        DeviceId: SAMPLE_OUT_TRAY_DEVICE_ID,
        TIDValue: row.epc,
        RFIDCode: row.rfidCode || row.epc,
        StatusType: true,
      }));
      await axios.post(
        toRrgoldApiUrl('/api/RFIDDevice/AddRFID'),
        payload,
        { headers: getTrayAuthHeaders() }
      );

      const rows = (await fetchTrayStockRows(clientCode, scanRows)).map((row) => ({
        ...row,
        scanSource: 'tray',
        __persistedScanSource: 'tray',
        __scannedAt: row.__scannedAt || new Date().toISOString(),
      }));
      if (!rows.length) {
        return {
          success: false,
          message: 'No stock matched scanned tags. Check tags are labelled in stock master.',
        };
      }

      const incomingKeys = new Set(rows.map((row) => rowDedupKey(row)).filter(Boolean));

      // Drop any prior local rows for the incoming tags so each tag is re-checked
      // fresh against the server, which alone decides Sample Out vs Sample In.
      const prunedItems = sampleOutItemsRef.current.filter((item) => {
        const key = rowDedupKey(item);
        if (!key || !incomingKeys.has(key)) return true;
        return item.__scanAction !== 'SampleOut' && item.__scanAction !== 'SampleInPending';
      });
      sampleOutItemsRef.current = prunedItems;
      setSampleOutItems(prunedItems);
      setCurrentPage(1);
      const summary = await processScannedBatch(rows, {
        source: 'tray',
        showReview: true,
      });
      const outCount = summary?.added || 0;
      const inCount = summary?.inQueued || 0;
      const added = outCount + inCount;
      if (added === 0) {
        return {
          success: false,
          message:
            summary?.blocked || summary?.errors
              ? 'Tags found but could not be added — see review popup for blocked/error details.'
              : 'No new items added — tags may already be in the list.',
        };
      }
      setShowRfidTrayModal(false);
      let message;
      if (inCount > 0 && outCount === 0) {
        message = `${inCount} of ${rows.length} tag(s) queued for Sample In return.`;
      } else if (inCount > 0 && outCount > 0) {
        message = `${rows.length} tag(s): ${outCount} Sample Out, ${inCount} Sample In return.`;
      } else {
        message = `${outCount} of ${rows.length} tag(s) loaded into the grid for Sample Out.`;
      }
      return { success: true, message };
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.Message ||
        error?.message ||
        'Failed to save/fetch tray scan data.';
      addNotification({ type: 'error', title: 'Tray scan failed', message });
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Clear ALL scan data for this page (in-memory grid + server scan buffer),
  // then hard-refresh the whole page. Guarded so rapid double-clicks can't
  // fire the reset twice.
  const resetSampleOutPage = async () => {
    if (pageResetLockRef.current) return;
    pageResetLockRef.current = true;
    setPageResetLoading(true);
    try {
      // Clear local form/grid state first so a failed reload still looks clean.
      setSampleOutItems([]);
      sampleOutItemsRef.current = [];
      setCurrentPage(1);
      // Clear the server-side scan buffer so reload doesn't restore stale tags.
      await deleteSampleOutRfidScans();
    } catch {
      /* still reload even if the server clear fails */
    } finally {
      // window.location.reload re-initialises every piece of state from scratch.
      window.location.reload();
    }
  };

  // Refresh = pull the latest scanned RFID products from the device buffer
  // (same GetAllRFIDDetails API as Stock Tracking) and load them into the grid,
  // letting the server decide Sample Out vs Sample In per tag.
  const refreshScannedRfidFromDevice = async () => {
    if (pageResetLockRef.current || pageResetLoading) return;
    const clientCode = resolveClientCodeForSampleApi(userInfo);
    if (!clientCode) {
      addNotification({
        type: 'error',
        title: 'Refresh scans',
        message: 'User information not found. Please refresh the page.',
      });
      return;
    }
    setPageResetLoading(true);
    setLoading(true);
    try {
      const { data } = await axios.post(
        toRrgoldApiUrl('/api/RFIDDevice/GetAllRFIDDetails'),
        { ClientCode: clientCode },
        { headers: getTrayAuthHeaders() }
      );
      const deviceRows = normalizeRfidDeviceRows(data);
      let mapped = mapDeviceRowsToSampleOutItems(deviceRows).map((row) => ({
        ...row,
        __scannedAt: row.__scannedAt || new Date().toISOString(),
      }));
      if (!mapped.length) {
        addNotification({
          type: 'info',
          title: 'Refresh scans',
          message: 'No scanned RFID products found. Scan items on the device, then click Refresh.',
        });
        return;
      }
      mapped = await backfillTrayDesignFromLabelledStock(clientCode, mapped);

      // Drop any prior local rows for the incoming tags so each tag is re-checked
      // fresh against the server, which alone decides Sample Out vs Sample In.
      const incomingKeys = new Set(mapped.map((row) => rowDedupKey(row)).filter(Boolean));
      const prunedItems = sampleOutItemsRef.current.filter((item) => {
        const key = rowDedupKey(item);
        if (!key || !incomingKeys.has(key)) return true;
        return item.__scanAction !== 'SampleOut' && item.__scanAction !== 'SampleInPending';
      });
      sampleOutItemsRef.current = prunedItems;
      setSampleOutItems(prunedItems);
      setCurrentPage(1);

      const summary = await processScannedBatch(mapped, { source: 'desktop', showReview: true });
      const outCount = summary?.added || 0;
      const inCount = summary?.inQueued || 0;
      if (outCount + inCount === 0) {
        addNotification({
          type: 'info',
          title: 'Refresh scans',
          message:
            summary?.blocked || summary?.errors
              ? 'Scanned tags found but none could be added — see the review popup for details.'
              : 'No new items added — scanned tags may already be in the list.',
        });
      }
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Refresh scans',
        message:
          err?.response?.data?.Message || err?.message || 'Failed to load scanned RFID data.',
      });
    } finally {
      setLoading(false);
      setPageResetLoading(false);
    }
  };

  const handleClearAndReloadPage = resetSampleOutPage;
  const handleReloadPage = refreshScannedRfidFromDevice;

  // Helper function to get field value or null if empty
  const getValueOrNull = (value) => {
    if (value === null || value === undefined || value === '' || value === '0.000' || value === '0.00' || value === '0') {
      return null;
    }
    return value;
  };

  // Helper function to get category/product/design/purity IDs from names
  const getCategoryId = (categoryName) => {
    if (!categoryName) return 0;
    // Try to find in the item data, otherwise return 0
    return 0; // Will be set from fullItemData if available
  };

  const getProductId = (productName) => {
    if (!productName) return 0;
    return 0; // Will be set from fullItemData if available
  };

  const getDesignId = (designName) => {
    if (!designName) return 0;
    return 0; // Will be set from fullItemData if available
  };

  const getPurityId = (purityName) => {
    if (!purityName) return 0;
    return 0; // Will be set from fullItemData if available
  };

  /** Strip trailing "(code)" from typeahead labels for party matching. */
  const partyLabelCore = (s) =>
    normalizePartyQuery(String(s || '').replace(/\s*\([^)]*\)\s*$/, '').trim());

  const findEmployeeIdInList = (list, label) => {
    const q = partyLabelCore(label);
    if (!q || !Array.isArray(list) || list.length === 0) return 0;
    const emp = list.find((e) => {
      const n = partyLabelCore(getEmployeeDisplayName(e));
      const code = partyLabelCore(e.EmployeeCode ?? e.employeeCode ?? e.Code ?? e.code ?? '');
      const login = partyLabelCore(e.UserName ?? e.userName ?? '');
      return (
        n === q ||
        login === q ||
        code === q ||
        (n && (n.includes(q) || q.includes(n))) ||
        (code && (code.includes(q) || q.includes(code))) ||
        (login && (login.includes(q) || q.includes(login)))
      );
    });
    return parseInt(emp?.Id ?? emp?.id ?? 0, 10) || 0;
  };

  const linkSubUserToEmployeeMaster = async (subUser, employeeId) => {
    const userId = String(subUser?.UserId || subUser?.userId || '').trim();
    const empId = parseInt(employeeId, 10);
    const cc = resolveClientCodeForSampleApi(userInfo);
    if (!userId || !empId || !cc) return false;
    if (parseInt(subUser?.EmployeeId ?? subUser?.employeeId, 10) === empId) return true;
    try {
      await axios.post(
        rfidUserUrls.linkSubUserToEmployee(),
        { ClientCode: cc, UserId: userId, EmployeeId: empId },
        { headers: rfidUserAuthHeaders() }
      );
      subUser.EmployeeId = empId;
      return true;
    } catch (err) {
      console.warn('LinkSubUserToEmployee:', err);
      return false;
    }
  };

  const findEmployeeIdByLabel = (label) => findEmployeeIdInList(employeeList, label);

  const fetchEmployeePartyLookup = async () => {
    const cc = resolveClientCodeForSampleApi(userInfo);
    if (!cc) return [];
    try {
      const { data } = await axios.get(getPartyLookupUrl('Employee', cc), {
        headers: sampleAuthHeaders(),
      });
      return normalizeArray(data);
    } catch (err) {
      console.warn('GetPartyLookup Employee:', err);
      return [];
    }
  };

  const syncEmployeePartyIdFromSubUser = async (subUser) => {
    if (!subUser) return 0;
    const fromSub = parseInt(subUser.EmployeeId ?? subUser.employeeId, 10);
    if (fromSub > 0) {
      setSelectedEmployeeId(String(fromSub));
      return fromSub;
    }
    const labels = [
      subUser.UserName,
      subUser.userName,
      subUser.employeeName,
      subUser.EmployeeName,
      getSubUserDisplayName(subUser),
    ].filter(Boolean);
    let list = employeeList;
    if (!list.length) {
      list = await fetchEmployeePartyLookup();
      if (list.length) setEmployeeList(list);
    }
    for (const label of labels) {
      const id = findEmployeeIdInList(list, label);
      if (id > 0) {
        setSelectedEmployeeId(String(id));
        await linkSubUserToEmployeeMaster(subUser, id);
        return id;
      }
    }
    return 0;
  };

  const resolveEmployeePartyId = () => {
    const sub = subUserList.find(
      (u) =>
        String(u.UserId || u.userId) === String(selectedAssignToUserId) ||
        partyLabelCore(getSubUserDisplayName(u)) === partyLabelCore(assignToSearch) ||
        partyLabelCore(u.UserName || u.userName) === partyLabelCore(assignToSearch)
    );
    const fromSub = parseInt(sub?.EmployeeId ?? sub?.employeeId, 10);
    if (fromSub > 0) return fromSub;

    if (selectedEmployeeId) {
      const fromPick = parseInt(selectedEmployeeId, 10);
      if (fromPick > 0) return fromPick;
    }

    const labels = [];
    if (sub) {
      labels.push(
        sub.UserName,
        sub.userName,
        sub.employeeName,
        sub.EmployeeName,
        getSubUserDisplayName(sub)
      );
    }
    labels.push(assignToSearch);
    for (const label of labels) {
      const id = findEmployeeIdByLabel(label);
      if (id > 0) return id;
    }

    return 0;
  };

  const resolveEmployeePartyIdForSubmit = async () => {
    let id = resolveEmployeePartyId();
    if (id > 0) return id;

    const sub = subUserList.find(
      (u) =>
        String(u.UserId || u.userId) === String(selectedAssignToUserId) ||
        partyLabelCore(getSubUserDisplayName(u)) === partyLabelCore(assignToSearch) ||
        partyLabelCore(u.UserName || u.userName) === partyLabelCore(assignToSearch)
    );
    if (sub) {
      id = await syncEmployeePartyIdFromSubUser(sub);
      if (id > 0) return id;
    }

    const list = await fetchEmployeePartyLookup();
    if (list.length) {
      setEmployeeList(list);
      for (const label of [assignToSearch, sub?.UserName, sub?.userName]) {
        id = findEmployeeIdInList(list, label);
        if (id > 0) {
          setSelectedEmployeeId(String(id));
          return id;
        }
      }
    }
    return 0;
  };

  const resolvePartyId = () => {
    if (partyType === 'employee') {
      return resolveEmployeePartyId();
    }
    if (partyType === 'customer') {
      const c = customerList.find(
        (x) =>
          String(x.Id) === String(selectedCustomerId) ||
          String(x.PartyId) === String(selectedCustomerId)
      );
      return parseInt(c?.PartyId ?? c?.Id ?? selectedCustomerId, 10) || 0;
    }
    const v = vendorList.find(
      (x) =>
        String(x.Id) === String(selectedVendorId) ||
        String(x.PartyId) === String(selectedVendorId)
    );
    return parseInt(v?.PartyId ?? v?.Id ?? selectedVendorId, 10) || 0;
  };

  const validateSampleOutForm = () => {
    if (!isAdminUser) {
      return 'Sample Out can only be created by an admin account. Use Sample In to return scanned items.';
    }
    if (!hasAssignToSelection()) {
      return `Please ${assignToFieldLabel.toLowerCase()}.`;
    }
    const assignedTo = resolveAssignedToUserId();
    if (!assignedTo) {
      return partyType === 'employee'
        ? 'Please select an employee from the dropdown list.'
        : 'Unable to resolve assignee — please log in again.';
    }
    if (pendingSampleOutOnly(sampleOutItems).length === 0) {
      return 'Please add at least one item to sample out.';
    }
    const badLine = pendingSampleOutOnly(sampleOutItems).some((item) => {
      const line = buildSubmitSampleOutItem(item);
      return !line.TIDValue && !line.RFIDCode && !line.LabelledStockId && !line.ItemCode;
    });
    if (badLine) {
      return 'Each row needs TID, RFID, item code, or labelled stock id.';
    }
    if (!resolveClientCodeForSampleApi(userInfo)) {
      return 'User information not found. Please refresh the page.';
    }
    return null;
  };

  const openSampleOutConfirmModal = () => {
    const err = validateSampleOutForm();
    if (err) {
      setFormValidationHint(err);
      openScanReviewModal({
        title: 'Cannot create Sample Out',
        sections: [{ type: 'error', heading: 'Fix before continuing', rows: [{ itemCode: '—', message: err }] }],
      });
      return;
    }
    setFormValidationHint('');
    confirmSampleOutLockRef.current = false;
    setConfirmSampleOutPhase('summary');
    setShowConfirmSampleOut(true);
  };

  const openSampleInConfirmModal = () => {
    const rows = pendingSampleInOnly(sampleOutItems);
    if (!rows.length) {
      openScanReviewModal({
        title: 'No Sample In items',
        sections: [{ type: 'warning', heading: 'Empty', rows: [{ itemCode: '—', message: 'Scan returned items (2nd scan) first.' }] }],
      });
      return;
    }
    if (sampleInBlockedReason) {
      openScanReviewModal({
        title: 'Cannot return yet',
        sections: [{ type: 'warning', heading: 'Return blocked', rows: [{ itemCode: '—', message: sampleInBlockedReason }] }],
      });
      return;
    }
    confirmSampleInLockRef.current = false;
    setConfirmSampleInPhase('summary');
    setShowConfirmSampleIn(true);
  };

  const executeSampleInSubmit = async () => {
    const clientCode = resolveClientCodeForSampleApi(userInfo);
    const rows = pendingSampleInOnly(sampleOutItems);
    if (!clientCode || !rows.length) {
      throw new Error('No items to return.');
    }
    if (sampleInBlockedReason) {
      throw new Error(sampleInBlockedReason);
    }
    const failures = [];
    const successes = [];
    for (let i = 0; i < rows.length; i += 1) {
      const item = rows[i];
      const tid = String(item.TIDValue || item.TIDNumber || '').trim();
      const rfid = String(item.RFIDNumber || item.RFIDCode || '').trim();
      const itemCode = String(rowItemCode(item) || item.Itemcode || item.ItemCode || '').trim();
      const lotId = parseInt(item.__lotId, 10);
      const lotItemId = parseInt(item.__lotItemId ?? item.LotItemId ?? item.lotItemId, 10);
      try {
        const itemScanMode = resolveScanMode(item);
        const defaultReturnNote = itemScanMode
          ? `Sample in returned via ${itemScanMode}`
          : 'Sample in returned';
        const reviewNote = String(description || '').trim() || defaultReturnNote;
        const scanPayload = {
            ClientCode: clientCode,
            LotId: Number.isFinite(lotId) && lotId > 0 ? lotId : undefined,
            LotItemId: Number.isFinite(lotItemId) && lotItemId > 0 ? lotItemId : undefined,
            TIDValue: tid || undefined,
            RFIDCode: rfid || undefined,
            ItemCode: itemCode || undefined,
            ScanMode: resolveScanMode(item),
          };
        if (isAdminUser) {
          scanPayload.AdminReviewRemark = reviewNote;
        } else {
          scanPayload.ReturnRemark = reviewNote;
        }
        // eslint-disable-next-line no-await-in-loop
        const { data: inData } = await axios.post(
          getScanSampleInUrl(),
          scanPayload,
          { headers: sampleAuthHeaders() }
        );
        if (inData?.success === false) {
          throw new Error(inData?.message || inData?.Message || 'Sample In failed');
        }
        const result = pickScanSampleInResult(inData, item, rfid, lotId);
        successes.push({
          ...result,
          message: buildScanSampleInSuccessMessage(result),
        });
      } catch (err) {
        failures.push({
          itemCode: rowItemCode(item) || '—',
          rfid,
          message: pickSampleOutErrorMessage(err),
        });
      }
    }

    setSampleOutItems((prev) =>
      prev
        .filter((item) => item.__scanAction !== 'SampleInPending')
        .concat(
          successes.map((s, idx) =>
            stampScannedByUser(
              buildProductDataFromRaw(
                { ItemCode: s.itemCode, RFIDNumber: s.rfid },
                {
                  __scanAction: 'SampleInDone',
                  __lotNumber: s.lotNumber,
                  __lotId: s.lotId,
                  __lotStatus: s.lotStatus,
                  __lotCompleted: s.lotCompleted,
                  __itemStatus: s.itemStatus,
                  __totalItems: s.totalItems,
                  __pendingItems: s.pendingItems,
                  __returnedItems: s.returnedItems,
                  __stockStatus: s.stockStatus,
                  __sampleInOn: s.sampleInOn,
                  __returnedOn: s.sampleInOn || new Date().toISOString(),
                  id: Date.now() + idx,
                }
              )
            )
          )
        )
    );

    const sections = [];
    if (successes.length) {
      sections.push({ type: 'success', heading: `Returned (${successes.length})`, rows: successes });
    }
    if (failures.length) {
      sections.push({ type: 'error', heading: `Failed (${failures.length})`, rows: failures });
    }
    const lotSummaryByKey = new Map();
    successes.forEach((s) => {
      const key = String(s.lotId || s.lotNumber || '');
      if (key) lotSummaryByKey.set(key, s);
    });
    const lotStatusNotes = [...lotSummaryByKey.values()].map(buildScanSampleInLotSummaryLine);
    const subtitleParts = [`${successes.length} of ${rows.length} item(s) returned to stock.`];
    if (lotStatusNotes.length) {
      subtitleParts.push(lotStatusNotes.join(' '));
    } else {
      const partialLotNotes = sampleInReturnReports
        .filter((r) => r.remainingAfter != null && r.remainingAfter > 0)
        .map((r) => `Lot ${r.lotNo}: ${r.remainingAfter} item(s) still out with ${r.assignedName}.`);
      if (partialLotNotes.length) {
        subtitleParts.push(`Partial return — ${partialLotNotes.join(' ')}`);
      }
    }
    const allCompleted = [...lotSummaryByKey.values()].every((s) => isRfidSampleLotFinished(s));
    openScanReviewModal({
      title: failures.length
        ? 'Sample In — partial success'
        : allCompleted && lotSummaryByKey.size
          ? 'Sample In complete — lot completed'
          : 'Sample In complete',
      subtitle: subtitleParts.join(' '),
      sections,
    });

    if (failures.length) {
      throw new Error(`${failures.length} item(s) could not be returned. See review popup.`);
    }

    await deleteSampleOutRfidScans();
  };

  const handleConfirmSampleInProceed = async () => {
    if (confirmSampleInLockRef.current) return;
    confirmSampleInLockRef.current = true;
    let submitOk = false;
    try {
      setConfirmSampleInPhase('submitting');
      setLoading(true);
      await executeSampleInSubmit();
      submitOk = true;
    } catch (err) {
      openScanReviewModal({
        title: 'Sample In failed',
        sections: [{ type: 'error', heading: 'Error', rows: [{ itemCode: '—', message: pickSampleOutErrorMessage(err) }] }],
      });
    } finally {
      confirmSampleInLockRef.current = false;
      setLoading(false);
      if (submitOk) {
        setShowConfirmSampleIn(false);
        setConfirmSampleInPhase('summary');
      } else {
        setConfirmSampleInPhase('summary');
      }
    }
  };

  const executeSampleOutSubmit = async () => {
    if (!isAdminUser) {
      throw new Error('Sample Out can only be created by an admin account.');
    }
    setLoading(true);
    try {
      const normalizeDateInput = (value) => {
        if (!value) return new Date().toISOString().split('T')[0];
        const s = String(value);
        if (s.includes('T')) return s.split('T')[0];
        if (s.includes('/')) {
          const parts = s.split('/');
          if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
        return s.slice(0, 10);
      };

      const toIsoFromDateInput = (dateInput) => {
        const dayStr = normalizeDateInput(dateInput);
        const d = new Date(`${dayStr}T12:00:00`);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      };

      const apiPartyType =
        partyType === 'customer' ? 'Customer' : partyType === 'vendor' ? 'Vendor' : 'Employee';
      let partyId =
        partyType === 'employee'
          ? await resolveEmployeePartyIdForSubmit()
          : resolvePartyId();

      if (partyType !== 'employee' && !partyId) {
        const partyMsg = `Invalid party — please ${assignToFieldLabel.toLowerCase()}.`;
        addNotification({ type: 'error', title: 'Sample Out', message: partyMsg });
        throw new Error(partyMsg);
      }

      const headerRemarks = String(description || '').trim();
      const Items = pendingSampleOutOnly(sampleOutItems)
        .map((item) => buildSubmitSampleOutItem(item))
        .filter((line) => line.TIDValue || line.RFIDCode || line.LabelledStockId || line.ItemCode);

      if (Items.length === 0) {
        throw new Error('No valid line items — each row needs TID, RFID, item code, or labelled stock id.');
      }

      const clientCode = resolveClientCodeForSampleApi(userInfo);
      const payload = {
        ClientCode: clientCode,
        PartyType: apiPartyType,
        AssignedToUserId: resolveAssignedToUserId(),
        ExpectedReturnDate: toIsoFromDateInput(returnDate || new Date().toISOString().split('T')[0]),
        AdminRemark: headerRemarks,
        Items,
      };
      if (partyId > 0) payload.PartyId = partyId;

      const response = await axios.post(getSubmitSampleOutUrl(), payload, {
        headers: sampleAuthHeaders(),
      });

      const apiBody = response.data ?? {};
      const apiInlineMsg = pickApiResponseMessage(apiBody);
      if (
        apiBody.success === false ||
        apiBody.Status === 400 ||
        apiBody.status === 400
      ) {
        throw new Error(apiInlineMsg || 'Failed to create sample out');
      }

      let resolvedPartyName = '—';
      if (partyType === 'customer') {
        const selectedCustomer = customerList.find(
          (c) =>
            String(c.Id) === String(selectedCustomerId) ||
            String(c.PartyId) === String(selectedCustomerId)
        );
        resolvedPartyName = selectedCustomer
          ? toProperPersonName(getCustomerDisplayName(selectedCustomer))
          : 'Customer';
      } else if (partyType === 'vendor') {
        const v = vendorList.find((x) => String(x.Id) === String(selectedVendorId));
        resolvedPartyName = v ? getVendorDisplayName(v) : 'Vendor';
      } else {
        resolvedPartyName = getResolvedAssignToName();
      }

      const header = apiBody.Header ?? apiBody.header ?? null;
      const lineItems = Array.isArray(apiBody.Items)
        ? apiBody.Items
        : Array.isArray(apiBody.items)
          ? apiBody.items
          : [];
      const apiSuccessMsg = pickSampleOutSuccessMessage(apiBody);
      const createdLotNo = pickSubmitSampleOutLotNo(apiBody) || sampleOutNumber;

      const partyFromApi = String(
        apiBody.partyName ?? apiBody.PartyName ?? header?.PartyName ?? ''
      ).trim();
      const partyDisplay = partyFromApi || resolvedPartyName;
      const assignName = String(
        apiBody.assignedToUserName ?? apiBody.AssignedToUserName ?? ''
      ).trim();

      const submittedRows = pendingSampleOutOnly(sampleOutItems);
      const enrichedLineItems = lineItems.map((line, idx) => {
        const code = String(line.ItemCode ?? line.Itemcode ?? '').trim().toLowerCase();
        const stockId = line.LabelledStockId ?? line.labelledStockId;
        const match =
          submittedRows.find((item) => {
            const itemCode = rowItemCode(item).toLowerCase();
            if (code && itemCode === code) return true;
            const sid = item.LabelledStockId ?? item.fullItemData?.LabelledStockId ?? item.id;
            return stockId != null && String(sid) === String(stockId);
          }) ?? submittedRows[idx];
        if (!match) return line;
        return {
          ...line,
          ItemCode: line.ItemCode ?? rowItemCode(match),
          DesignName:
            match.design_id ||
            match.DesignName ||
            match.Design ||
            match.fullItemData?.DesignName ||
            match.fullItemData?.Design ||
            line.DesignName ||
            line.Design,
          GrossWt: rowGrossWtOrZero(match),
          NetWt: rowNetWtOrZero(match),
        };
      });

      setSuccessData({
        apiMessage: apiSuccessMsg,
        sampleOutNo: createdLotNo || '—',
        partyName: partyDisplay,
        customerName: partyDisplay,
        assignedToUserName: assignName,
        lotStatus: apiBody.lotStatus ?? apiBody.LotStatus ?? '',
        header,
        lineItems: enrichedLineItems,
        totalItems: header?.TotalItems ?? submittedRows.length ?? enrichedLineItems.length,
        totalPieces: resolveSuccessTotalPieces(header, enrichedLineItems, submittedRows),
      });
      setSampleOutNumber(createdLotNo || sampleOutNumber);
      setShowSuccessModal(true);
      await deleteSampleOutRfidScans();

      // Reset form after success
      setTimeout(() => {
        setSampleOutItems([]);
        setPartyType('employee');
        setCustomerSearch('');
        setSelectedCustomerId('');
        setVendorSearch('');
        setSelectedVendorId('');
        setEmployeeSearch('');
        setSelectedEmployeeId('');
        setCustomerMobile('');
        setFineGold('0.000');
        setBalanceAmount('0.000');
        setFinePercent('0.00');
        const todayIso = new Date().toISOString().split('T')[0];
        setReturnDate(todayIso);
        setDescription('');
        setSelectedAssignToUserId('');
        setAssignToSearch('');
        refreshLotPreviewLabel();
      }, 2000);

    } catch (error) {
      console.error('Error creating sample out:', error);
      let msg = pickSampleOutErrorMessage(error);
      if (/partyid|party id|getpartylookup/i.test(msg)) {
        msg = EMPLOYEE_MASTER_LINK_HELP;
      }
      setFormValidationHint(msg);
      openScanReviewModal({
        title: 'Sample Out failed',
        sections: [{ type: 'error', heading: 'Could not save', rows: [{ itemCode: '—', message: msg }] }],
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSampleOutProceed = async () => {
    if (confirmSampleOutLockRef.current) return;
    confirmSampleOutLockRef.current = true;
    let submitOk = false;
    try {
      setConfirmSampleOutPhase('acknowledge');
      await new Promise((r) => setTimeout(r, 720));
      setConfirmSampleOutPhase('submitting');
      await executeSampleOutSubmit();
      submitOk = true;
    } catch (err) {
      const msg = pickSampleOutErrorMessage(err);
      setFormValidationHint(msg);
      openScanReviewModal({
        title: 'Sample Out failed',
        sections: [{ type: 'error', heading: 'Error', rows: [{ itemCode: '—', message: msg }] }],
      });
    } finally {
      confirmSampleOutLockRef.current = false;
      if (submitOk) {
        setShowConfirmSampleOut(false);
        setConfirmSampleOutPhase('summary');
      } else {
        setConfirmSampleOutPhase('summary');
      }
    }
  };

  const filteredTableItems = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    let list = sampleOutItems;
    if (q) {
      list = sampleOutItems.filter((item) =>
        [
          rowItemCode(item),
          item.Itemcode,
          item.ItemCode,
          item.RFIDNumber,
          item.category_id,
          item.CategoryName,
          item.Category,
          item.product_id,
          item.ProductName,
          item.Product,
          designNoFromItem(item),
          item.design_id,
          item.DesignName,
          item.Design,
          item.DesignId,
          item.DesignCode,
        ].some((v) => String(v || '').toLowerCase().includes(q))
      );
    }
    return sortProductsByRecencyThenDesign(list);
  }, [sampleOutItems, tableSearch]);
  const activePageSize = ITEMS_GRID_PAGE_SIZE;
  const tableItemPages = useMemo(() => {
    // Keep the newest-scanned-first order intact: simple fixed-size chunks so the
    // latest scan always lands on page 1 (no design regrouping across the list).
    if (!filteredTableItems.length) return [];
    const pages = [];
    for (let i = 0; i < filteredTableItems.length; i += activePageSize) {
      pages.push(filteredTableItems.slice(i, i + activePageSize));
    }
    return pages;
  }, [filteredTableItems, activePageSize]);
  const totalPages = Math.max(1, tableItemPages.length);
  const currentItems = tableItemPages[currentPage - 1] || [];
  const startIndex = tableItemPages
    .slice(0, Math.max(0, currentPage - 1))
    .reduce((sum, page) => sum + page.length, 0);
  const itemsSummary = useMemo(() => {
    const totalProducts = filteredTableItems.length;
    const totalGrossWt = filteredTableItems.reduce(
      (sum, item) => sum + (parseFloat(rowGrossWtOrZero(item)) || 0),
      0
    );
    const totalNetWt = filteredTableItems.reduce(
      (sum, item) => sum + (parseFloat(rowNetWtOrZero(item)) || 0),
      0
    );
    const totalPiecesScanned = filteredTableItems.reduce((sum, item) => sum + rowPieces(item), 0);
    const designSet = new Set();
    let latestScanDateTime = null;
    filteredTableItems.forEach((item) => {
      const design = String(designNoFromItem(item) || '').trim().toUpperCase();
      if (design) designSet.add(design);
      const dt = rowScannedDateTime(item);
      if (!dt) return;
      if (!latestScanDateTime || dt.getTime() > latestScanDateTime.getTime()) latestScanDateTime = dt;
    });
    const totalDesigns = designSet.size;
    return { totalProducts, totalGrossWt, totalNetWt, totalPiecesScanned, totalDesigns, latestScanDateTime };
  }, [filteredTableItems]);

  const pendingOutRows = useMemo(() => pendingSampleOutOnly(sampleOutItems), [sampleOutItems]);
  const pendingInRows = useMemo(() => pendingSampleInOnly(sampleOutItems), [sampleOutItems]);
  const pendingOutSummary = useMemo(() => summarizeScanRows(pendingOutRows), [pendingOutRows]);
  const pendingInSummary = useMemo(() => summarizeScanRows(pendingInRows), [pendingInRows]);
  const sampleInBatchLabel = useMemo(() => {
    if (!pendingInRows.length) return '';
    const lots = [...new Set(pendingInRows.map((i) => i.__lotNumber).filter(Boolean))];
    if (lots.length === 1) return lots[0];
    return `${pendingInRows.length} items · ${lots.length} lots`;
  }, [pendingInRows]);
  const sampleInOnlyMode = pendingInRows.length > 0 && pendingOutRows.length === 0;
  const trayModalCopy = useMemo(() => {
    if (sampleInOnlyMode || pendingInRows.length > 0) {
      return {
        title: 'Sample In — Tray return scan',
        subtitle:
          'Place the tray on the reader and start. All scanned tags load into the grid as Sample In return — same as scanning item codes a 2nd time.',
        loadButtonLabel: 'Load tags for Sample In',
      };
    }
    if (pendingOutRows.length > 0) {
      return {
        title: 'Sample Out / In — Tray scan',
        subtitle:
          'Tags already in the grid as Sample Out: scan the tray again to convert them to Sample In return. New tags add as Sample Out.',
        loadButtonLabel: 'Load scanned tags into grid',
      };
    }
    return {
      title: 'Sample Out — Tray scan',
      subtitle:
        'Place the tray on the reader, connect COM ports, and start. Tags load into the grid for Sample Out. Scan the same tray again later for Sample In return.',
      loadButtonLabel: 'Add scanned items to Sample Out',
    };
  }, [sampleInOnlyMode, pendingInRows.length, pendingOutRows.length]);
  const sampleInAssignedEmployee = useMemo(() => {
    if (!pendingInRows.length) return '';
    const names = [
      ...new Set(
        pendingInRows
          .map((row) => String(row.__lotAssignedToUserName || '').trim())
          .filter(Boolean)
      ),
    ];
    if (names.length === 1) return names[0];
    if (names.length > 1) return names.join(', ');
    const lotIds = [...new Set(pendingInRows.map((r) => r.__lotId).filter(Boolean))];
    for (const lotId of lotIds) {
      const ctx = sampleInLotDetails[lotId];
      const name = String(
        ctx?.acceptance?.assignedToUserName ??
          ctx?.acceptance?.AssignedToUserName ??
          ctx?.lot?.AssignedToUserName ??
          ctx?.lot?.assignedToUserName ??
          ''
      ).trim();
      if (name) return name;
    }
    return '';
  }, [pendingInRows, sampleInLotDetails]);
  const sampleInReturnReports = useMemo(() => {
    const byLot = {};
    pendingInRows.forEach((row) => {
      const lotId = row.__lotId;
      const key = String(lotId || row.__lotNumber || 'unknown');
      if (!byLot[key]) {
        byLot[key] = { lotId, lotNumber: row.__lotNumber, rows: [] };
      }
      byLot[key].rows.push(row);
    });
    return Object.values(byLot).map((group) => {
      const lotId = group.lotId;
      const returning = group.rows.length;
      const ctx = lotId ? sampleInLotDetails[lotId] : null;
      const apiSummary = lotId ? sampleInPartialSummaries[lotId] : null;
      const counts = ctx?.counts ?? {};
      const outOnLot = apiSummary?.lotOutTotal?.items ?? counts.out ?? group.rows[0]?.__lotOutItems ?? null;
      const returned = counts.returned ?? group.rows[0]?.__lotReturnedItems ?? 0;
      const total = counts.total ?? group.rows[0]?.__lotTotalItems ?? null;
      const assignedName =
        apiSummary?.assignedToUserName ||
        ctx?.acceptance?.assignedToUserName ||
        ctx?.acceptance?.AssignedToUserName ||
        ctx?.lot?.AssignedToUserName ||
        ctx?.lot?.assignedToUserName ||
        group.rows[0]?.__lotAssignedToUserName ||
        '—';
      const lotNo =
        group.lotNumber ||
        apiSummary?.lotNumber ||
        ctx?.lot?.LotNumber ||
        ctx?.lot?.lotNumber ||
        '—';
      const remainingAfter =
        apiSummary?.remainingOut?.items ??
        (outOnLot != null ? Math.max(0, outOnLot - returning) : null);
      const lotStatus = String(
        apiSummary?.lotStatus ||
          group.rows[0]?.__lotStatus ||
          ctx?.lot?.LotStatus ||
          ctx?.lot?.lotStatus ||
          ''
      ).trim();
      const acceptanceLoaded = !lotId || Boolean(sampleInLotDetails[lotId]);
      const isPartial =
        (remainingAfter != null && remainingAfter > 0) ||
        returned > 0 ||
        lotStatus.toLowerCase().includes('partial');
      const canReturn = acceptanceLoaded
        ? (ctx?.acceptance?.canReturnItems ?? ctx?.acceptance?.CanReturnItems ?? true)
        : false;
      const isAccepted = acceptanceLoaded
        ? (ctx?.acceptance?.isEmployeeAccepted ?? ctx?.acceptance?.IsEmployeeAccepted ?? true)
        : false;

      const rowTotals = summarizeScanRows(group.rows);
      const grossWt = apiSummary
        ? formatSummaryWeight(apiSummary.returning.gross)
        : rowTotals.gross.toFixed(3);
      const netWt = apiSummary ? formatSummaryWeight(apiSummary.returning.net) : rowTotals.net.toFixed(3);
      const pieces = apiSummary ? apiSummary.returning.pieces : rowTotals.pieces;
      const isFullLotReturn =
        apiSummary != null
          ? (apiSummary.remainingOut?.items ?? 0) === 0 && (apiSummary.returning?.items ?? 0) > 0
          : outOnLot != null && remainingAfter === 0 && returning > 0 && returning >= outOnLot;
      const breakdown =
        breakdownFromPartialReturnSummary(apiSummary) ||
        buildPartialReturnBreakdown(ctx, group.rows, { outOnLot, remainingAfter });

      let confirmationMessage = apiSummary?.summaryMessage || '';
      if (!confirmationMessage) {
        if (isFullLotReturn) {
          confirmationMessage = `All ${returning} remaining out item(s) on Lot ${lotNo} will be returned (${grossWt} g gross, ${netWt} g net). Press Sample In to confirm this complete return.`;
        } else if (outOnLot != null && remainingAfter != null && remainingAfter > 0) {
          confirmationMessage = `Returning ${returning} of ${outOnLot} out item(s) on Lot ${lotNo} (${grossWt} g gross, ${netWt} g net). ${remainingAfter} item(s) will remain out after you confirm.`;
          if (returned > 0) confirmationMessage += ` ${returned} already returned on this lot.`;
        } else {
          confirmationMessage = `${returning} item(s) ready for Sample In on Lot ${lotNo} — ${grossWt} g gross, ${netWt} g net. Press Sample In to confirm return.`;
        }
      }

      return {
        lotNo,
        lotId,
        assignedName,
        returning: apiSummary?.returning?.items ?? returning,
        remainingAfter,
        returned,
        total,
        outOnLot,
        isPartial,
        isFullLotReturn,
        grossWt,
        netWt,
        pieces,
        breakdown,
        apiSummary,
        canReturn,
        isAccepted,
        confirmationMessage,
        message: confirmationMessage,
        rows: group.rows,
      };
    });
  }, [pendingInRows, sampleInLotDetails, sampleInPartialSummaries]);
  const sampleInBlockedReason = useMemo(() => {
    if (!pendingInRows.length) return '';
    if (sampleInPartialSummaryLoading) {
      return 'Loading partial return summary — wait a moment before confirming return.';
    }
    const lotIds = [
      ...new Set(
        pendingInRows
          .map((row) => parseInt(row.__lotId, 10))
          .filter((id) => Number.isFinite(id) && id > 0)
      ),
    ];
    if (lotIds.length && lotIds.some((id) => !sampleInLotDetails[id])) {
      return 'Loading lot acceptance status — wait a moment before confirming return.';
    }
    for (const report of sampleInReturnReports) {
      if (!report.isAccepted) {
        return `Lot ${report.lotNo}: employee has not accepted this sample out yet.`;
      }
      if (report.canReturn === false) {
        return `Lot ${report.lotNo}: not open for returns right now.`;
      }
    }
    return '';
  }, [pendingInRows, sampleInReturnReports, sampleInLotDetails, sampleInPartialSummaryLoading]);
  const canSubmitSampleOut =
    isAdminUser && pendingOutRows.length > 0 && hasAssignToSelection() && !scanChecking && !loading;
  const canSubmitSampleIn =
    pendingInRows.length > 0 && !sampleInBlockedReason && !scanChecking && !loading;
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxButtons = 7;
    if (totalPages <= maxButtons) {
      for (let p = 1; p <= totalPages; p += 1) pages.push(p);
      return pages;
    }
    let start = Math.max(1, currentPage - 3);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let p = start; p <= end; p += 1) pages.push(p);
    return pages;
  }, [currentPage, totalPages]);

  useEffect(() => {
    const clientCode = resolveClientCodeForSampleApi(userInfo);
    const lotIds = [
      ...new Set(
        pendingInRows
          .map((row) => parseInt(row.__lotId, 10))
          .filter((id) => Number.isFinite(id) && id > 0)
      ),
    ];
    if (!clientCode || !lotIds.length) {
      setSampleInLotDetails({});
      return undefined;
    }

    let cancelled = false;
    (async () => {
      const next = {};
      for (let i = 0; i < lotIds.length; i += 1) {
        const lotId = lotIds[i];
        try {
          // eslint-disable-next-line no-await-in-loop
          const [lotRes, acceptRes] = await Promise.all([
            axios.get(getLotByIdUrl(clientCode, lotId), { headers: sampleAuthHeaders() }),
            axios.get(getLotAcceptanceStatusUrl(clientCode, lotId), { headers: sampleAuthHeaders() }),
          ]);
          const { lot, items } = parseLotDetailResponse(lotRes.data);
          const acceptance =
            acceptRes.data?.data ?? acceptRes.data?.Data ?? acceptRes.data ?? {};
          next[lotId] = {
            lot,
            items,
            acceptance,
            counts: countLotLineStatuses(items),
          };
        } catch {
          next[lotId] = { lot: null, items: [], acceptance: {}, counts: { total: 0, out: 0, returned: 0 } };
        }
      }
      if (!cancelled) setSampleInLotDetails(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingInRows, userInfo]);

  useEffect(() => {
    const clientCode = resolveClientCodeForSampleApi(userInfo);
    const byLot = {};
    pendingInRows.forEach((row) => {
      const lotId = parseInt(row.__lotId, 10);
      const itemId = lotLineItemId(row);
      if (!Number.isFinite(lotId) || lotId <= 0 || itemId == null) return;
      if (!byLot[lotId]) byLot[lotId] = [];
      if (!byLot[lotId].includes(itemId)) byLot[lotId].push(itemId);
    });
    const lotIds = Object.keys(byLot).map((id) => Number(id));
    if (!clientCode || !lotIds.length) {
      setSampleInPartialSummaries({});
      setSampleInPartialSummaryLoading(false);
      return undefined;
    }

    let cancelled = false;
    setSampleInPartialSummaryLoading(true);
    (async () => {
      const next = {};
      for (let i = 0; i < lotIds.length; i += 1) {
        const lotId = lotIds[i];
        try {
          // eslint-disable-next-line no-await-in-loop
          const { data } = await axios.post(
            getLotPartialReturnSummaryUrl(),
            {
              ClientCode: clientCode,
              LotId: lotId,
              ReturningLotItemIds: byLot[lotId],
            },
            { headers: sampleAuthHeaders() }
          );
          if (data?.success === false) continue;
          const parsed = parseLotPartialReturnSummary(data);
          if (parsed) next[lotId] = parsed;
        } catch {
          /* fallback to client-side breakdown */
        }
      }
      if (!cancelled) {
        setSampleInPartialSummaries(next);
        setSampleInPartialSummaryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingInRows, userInfo]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  // Handle click outside to close item code dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (itemCodeSearchRef.current && !itemCodeSearchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isSmallScreen = windowWidth <= 768;
  const cardBaseStyle = {
    background: '#ffffff',
    borderRadius: '10px',
    padding: isSmallScreen ? '10px 12px' : '12px 14px',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
    border: '1px solid #e2e8f0'
  };
  const dropdownPanelStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#ffffff',
    border: '1px solid #dbe4f0',
    borderRadius: '10px',
    boxShadow: '0 16px 32px rgba(15, 23, 42, 0.14)',
    marginTop: '6px',
    maxHeight: 'min(280px, 50vh)',
    overflowY: 'auto',
    zIndex: 12050,
  };

  const partyAccentColor =
    partyType === 'customer' ? '#15803d' : partyType === 'vendor' ? '#a855f7' : '#0ea5e9';
  const partySegments = [
    { id: 'employee', label: 'Employee', Icon: FaUserTie, color: '#0ea5e9' },
    { id: 'customer', label: 'Customer', Icon: FaUserFriends, color: '#15803d' },
    { id: 'vendor', label: 'Vendor', Icon: FaStore, color: '#a855f7' },
  ];

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Calculate totals for export
  const calculateTotals = () => {
    const totals = {
      Qty: 0,
      TotalWt: 0,
      GrossWt: 0,
      NetWt: 0,
      StoneWt: 0,
      DiamondWt: 0
    };

    sampleOutItems.forEach(item => {
      totals.Qty += parseInt(item.Qty || 1);
      totals.TotalWt += parseFloat(item.TotalWt || 0);
      totals.GrossWt += parseFloat(item.grosswt || 0);
      totals.NetWt += parseFloat(item.netwt || 0);
      totals.StoneWt += parseFloat(item.stonewt || 0);
      totals.DiamondWt += parseFloat(item.diamondweight || 0);
    });

    return totals;
  };

  const compactLbl = {
    display: 'block',
    fontSize: 10,
    fontWeight: 700,
    color: '#64748b',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };
  const compactInp = {
    width: '100%',
    height: 28,
    padding: '0 8px',
    fontSize: 11,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fff',
  };

  return (
    <div style={{
      padding: isSmallScreen ? '8px' : '10px',
      fontFamily: 'Inter, Poppins, sans-serif',
      background: '#ffffff',
      minHeight: '100vh',
      height: '100vh',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
      overflowY: 'auto',
    }}>
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @media (max-width: 768px) {
          * {
            box-sizing: border-box;
          }
        }
      `}</style>
      {/* Compact entry — party, item search, dates (minimal height) */}
      <div
        style={{
          flexShrink: 0,
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
          marginBottom: 8,
          overflow: 'visible',
          position: 'relative',
          zIndex: 30,
        }}
      >
        <div
          style={{
            height: 3,
            background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
          }}
        />
        <div style={{ padding: isSmallScreen ? '8px' : '8px 10px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 8,
              paddingBottom: 8,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 4,
            flexShrink: 0,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isSmallScreen ? '8px' : '12px',
            }}
          >
            <span
              style={{
                width: isSmallScreen ? 30 : 34,
                height: isSmallScreen ? 30 : 34,
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
              }}
            >
              <FaFileInvoice style={{ fontSize: isSmallScreen ? 14 : 16 }} />
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: isSmallScreen ? '14px' : '16px',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: '1.2',
                letterSpacing: '-0.02em',
              }}
            >
              Sample Out / In
            </h2>
          </div>
          {process.env.REACT_APP_SHOW_SAMPLE_API_BASE === '1' && (
            <div
              style={{
                fontSize: 10,
                color: '#64748b',
                lineHeight: 1.35,
                maxWidth: 'min(100vw - 24px, 520px)',
                wordBreak: 'break-all',
              }}
              title="Shown when REACT_APP_SHOW_SAMPLE_API_BASE=1 at build time"
            >
              API mode: {getApiMode()} · Sample Out host: {getSoniApiBaseUrl()} · Stock search host:{' '}
              {getSoniApiBaseUrl()}
            </div>
          )}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isSmallScreen ? 'stretch' : 'flex-end',
          flexWrap: 'wrap',
          gap: isSmallScreen ? '10px' : '12px',
          marginLeft: isSmallScreen ? 0 : 'auto',
          width: isSmallScreen ? '100%' : 'auto',
          minWidth: 0
        }}>
          {!nextLotNoLoading && sampleOutNumber && pendingOutRows.length > 0 ? (
            <span
              style={{
                fontSize: isSmallScreen ? '13px' : '14px',
                color: '#334155',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span style={{ fontWeight: 600, color: '#64748b' }}>Sample Out NO:</span>{' '}
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{sampleOutNumber}</span>
            </span>
          ) : null}
          {sampleInBatchLabel && pendingInRows.length > 0 ? (
            <span
              style={{
                fontSize: isSmallScreen ? '13px' : '14px',
                color: '#334155',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span style={{ fontWeight: 600, color: '#64748b' }}>Sample In:</span>{' '}
              <span style={{ fontWeight: 800, color: '#15803d' }}>{sampleInBatchLabel}</span>
            </span>
          ) : null}
        </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px 10px',
              alignItems: 'flex-end',
            }}
          >
        {/* Party — Sample Out only; Sample In uses employee assigned at original Sample Out */}
        <div
          style={{
            flex: isSmallScreen ? '1 1 100%' : '1 1 300px',
            minWidth: isSmallScreen ? '100%' : 280,
            borderLeft: isSmallScreen ? 'none' : `2px solid ${sampleInOnlyMode ? '#15803d' : partyAccentColor}`,
            paddingLeft: isSmallScreen ? 0 : 8,
            position: 'relative',
            zIndex: showSearchResults ? 15 : 40,
            overflow: 'visible',
          }}
        >
          {sampleInOnlyMode ? (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                fontSize: 12,
                lineHeight: 1.45,
                color: '#14532d',
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 2, color: '#15803d', fontSize: 13 }}>
                Sample In — return scan
              </div>
              <div style={{ fontWeight: 600 }}>
                Employee <strong>{sampleInAssignedEmployee || assignToSearch || '—'}</strong>
                {' · '}
                Lot <strong>{sampleInBatchLabel || '—'}</strong>
              </div>
            </div>
          ) : (
          <>
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {partySegments.map(({ id, label, Icon, color }) => {
                const active = partyType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handlePartyTypeChange(id)}
                    style={{
                      flex: isSmallScreen ? '1 1 100%' : '1 1 0',
                      minWidth: isSmallScreen ? '100%' : 96,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: active ? `2px solid ${color}` : '1px solid #e2e8f0',
                      background: active ? `${color}14` : '#f8fafc',
                      color: active ? color : '#64748b',
                      fontWeight: active ? 800 : 600,
                      fontSize: 11,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontFamily: 'inherit',
                    }}
                  >
                    <Icon style={{ fontSize: 14, opacity: active ? 1 : 0.85 }} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div ref={customerDropdownRef} style={{ position: 'relative', zIndex: 50 }}>
            <label style={compactLbl}>
              {assignToFieldLabel}<span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={assignToSearch}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAssignToSearch(v);
                    setSelectedCustomerId('');
                    setSelectedVendorId('');
                    if (partyType === 'employee') setSelectedAssignToUserId('');
                    setShowAssignToDropdown(true);
                    setShowSearchResults(false);
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = partyAccentColor;
                    e.target.style.boxShadow = `0 0 0 3px ${partyAccentColor}33`;
                    setShowAssignToDropdown(true);
                    if (partyType === 'employee' && subUserList.length > 0) {
                      setFilteredSubUsers(subUserList);
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                  }}
                  placeholder={assignToPlaceholder}
                  disabled={assignToLoading}
                  style={{
                    ...compactInp,
                    background: assignToLoading ? '#f9fafb' : '#ffffff',
                  }}
                />
                {assignToDropdownOpen && (
                  <div
                    style={{ ...dropdownPanelStyle, borderTop: `3px solid ${partyAccentColor}` }}
                    role="listbox"
                    aria-label={assignToFieldLabel}
                  >
                    {assignToLoading && (
                      <div style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>Loading…</div>
                    )}
                    {!assignToLoading &&
                      partyType === 'customer' &&
                      filteredCustomers.length === 0 && (
                      <div style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>
                        No matching {noMatchAssignLabel} found.
                      </div>
                    )}
                    {!assignToLoading &&
                      partyType === 'vendor' &&
                      filteredVendors.length === 0 && (
                      <div style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>
                        No matching {noMatchAssignLabel} found.
                      </div>
                    )}
                    {!assignToLoading &&
                      partyType === 'employee' &&
                      filteredSubUsers.length === 0 && (
                      <div style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>
                        {subUserList.length === 0
                          ? 'No sub-users found. Add via User Management → From employees.'
                          : `No matching ${noMatchAssignLabel} found.`}
                      </div>
                    )}
                    {!assignToLoading &&
                      partyType === 'customer' &&
                      filteredCustomers.map((customer, idx) => {
                        const displayName = toProperPersonName(getCustomerDisplayName(customer));
                        const partyId = customer.PartyId ?? customer.Id;
                        const isSelected = String(partyId) === String(selectedCustomerId);
                        return (
                          <div
                            key={partyId}
                            role="option"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleCustomerSelect(customer);
                              setAssignToSearch(displayName);
                              setShowAssignToDropdown(false);
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              fontSize: 11,
                              borderBottom: idx < filteredCustomers.length - 1 ? '1px solid #f1f5f9' : 'none',
                              background: isSelected ? `${partyAccentColor}18` : '#fff',
                            }}
                          >
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{displayName}</div>
                          </div>
                        );
                      })}
                    {!assignToLoading &&
                      partyType === 'vendor' &&
                      filteredVendors.map((v, idx) => {
                        const displayName = getVendorDisplayName(v);
                        const partyId = v.PartyId ?? v.Id;
                        const isSelected = String(partyId) === String(selectedVendorId);
                        return (
                          <div
                            key={partyId}
                            role="option"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleVendorSelect(v);
                              setAssignToSearch(displayName);
                              setShowAssignToDropdown(false);
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              fontSize: 11,
                              borderBottom: idx < filteredVendors.length - 1 ? '1px solid #f1f5f9' : 'none',
                              background: isSelected ? `${partyAccentColor}18` : '#fff',
                            }}
                          >
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{displayName}</div>
                          </div>
                        );
                      })}
                    {!assignToLoading &&
                      partyType === 'employee' &&
                      filteredSubUsers.map((u, idx) => {
                        const uid = u.UserId || u.userId;
                        const label = getSubUserDisplayName(u);
                        const isSelected = String(uid) === String(selectedAssignToUserId);
                        return (
                          <div
                            key={uid}
                            role="option"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedAssignToUserId(uid);
                              setAssignToSearch(label);
                              setFormValidationHint('');
                              setShowAssignToDropdown(false);
                              syncEmployeePartyIdFromSubUser(u);
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              fontSize: 11,
                              borderBottom: idx < filteredSubUsers.length - 1 ? '1px solid #f1f5f9' : 'none',
                              background: isSelected ? `${partyAccentColor}18` : '#fff',
                            }}
                          >
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{label}</div>
                            {(u.Email || u.email) && (
                              <div style={{ fontSize: 10, color: '#64748b' }}>{u.Email || u.email}</div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (partyType === 'customer') setShowCustomerSidebar(true);
                  else if (partyType === 'vendor') setShowVendorSidebar(true);
                  else setShowEmployeeSidebar(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  border: `1px solid ${partyAccentColor}`,
                  background: partyAccentColor,
                  color: '#ffffff',
                  cursor: 'pointer',
                  minWidth: 28,
                  height: 28,
                  flexShrink: 0,
                }}
                title="Add new (Create Masters)"
              >
                <FaUserPlus style={{ fontSize: 12 }} />
              </button>
            </div>
          </div>
          </>
          )}
        </div>

        {/* Item search + dates */}
        <div
          style={{
            flex: isSmallScreen ? '1 1 100%' : '1 1 380px',
            minWidth: isSmallScreen ? '100%' : 300,
            position: 'relative',
            zIndex: showSearchResults ? 80 : 25,
            overflow: 'visible',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div ref={itemCodeSearchRef} style={{ position: 'relative', width: '100%', overflow: 'visible' }}>
              <label htmlFor="sample-out-item-code-search" style={compactLbl}>
                Item / Design <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200, maxWidth: '100%' }}>
                  <FaSearch style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: '13px',
                    zIndex: 1,
                    pointerEvents: 'none',
                  }} />
                  <input
                    id="sample-out-item-code-search"
                    type="text"
                    name="sampleOutItemCodeSearch"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={showSearchResults && !!itemCodeSearch.trim()}
                    placeholder="Scan RFID / item code / design no — 1st scan Sample Out, 2nd scan Sample In…"
                    value={itemCodeSearch}
                    onChange={(e) => {
                      setItemCodeSearch(e.target.value);
                      setShowSearchResults(true);
                      setShowAssignToDropdown(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && itemCodeSearch.trim()) {
                        e.preventDefault();
                        handleDirectScan(itemCodeSearch.trim());
                      }
                    }}
                    style={{
                      ...compactInp,
                      height: 28,
                      padding: '0 10px 0 30px',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      setShowAssignToDropdown(false);
                      if (itemCodeSearch.trim()) {
                        setShowSearchResults(true);
                      }
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                      setTimeout(() => setShowSearchResults(false), 200);
                    }}
                  />
                  {(searching || scanChecking) && (
                    <FaSpinner style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#3b82f6',
                      fontSize: '13px',
                      animation: 'spin 1s linear infinite',
                    }} />
                  )}
                  {showSearchResults && itemCodeSearch.trim() && (
                    <div
                      style={{
                        ...dropdownPanelStyle,
                        zIndex: 12100,
                        borderTop: '3px solid #3b82f6',
                      }}
                      role="listbox"
                      aria-label="Item, RFID, and design suggestions"
                    >
                      {searching && (
                        <div style={{ padding: '10px 12px', fontSize: '11px', color: '#64748b' }}>
                          Searching labeled stock…
                        </div>
                      )}
                      {!searching && !scanChecking && searchResults.length === 0 && (
                        <div style={{ padding: '10px 12px', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
                          No in-stock match for item code, RFID, or design no. Press <strong>Enter</strong> to
                          check live sample status (Sample Out vs Sample In).
                        </div>
                      )}
                      {!searching && !scanChecking && searchResults.length === 1 && (
                        <div style={{
                          padding: '8px 12px',
                          fontSize: '10px',
                          color: '#2563eb',
                          background: '#eff6ff',
                          borderBottom: '1px solid #dbeafe',
                          fontWeight: 600,
                        }}>
                          1 match — click to add or press <strong>Enter</strong>
                        </div>
                      )}
                      {!searching && !scanChecking && searchResults.length > 1 && (
                        <div style={{
                          padding: '8px 12px',
                          fontSize: '10px',
                          color: '#64748b',
                          background: '#f8fafc',
                          borderBottom: '1px solid #e2e8f0',
                          fontWeight: 600,
                        }}>
                          {searchResults.length} matches — click one to add, or type the full design no to add all
                        </div>
                      )}
                      {!searching && searchResults.map((item, idx) => (
                        <div
                          key={`${item.LabelledStockId ?? item.Id ?? 'row'}-${rowItemCode(item) || idx}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                          }}
                          onClick={() => selectItemFromSearch(item)}
                          role="option"
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: idx < searchResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                            fontSize: '11px',
                            transition: 'all 0.15s ease',
                            backgroundColor: '#ffffff',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.transform = 'translateX(2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', marginBottom: 4, letterSpacing: '-0.02em' }}>
                            {rowDesignNameOrDash(item)}
                          </div>
                          <div style={{
                            fontSize: '10px',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '4px 10px',
                            lineHeight: 1.4,
                          }}>
                            <span>
                              RFID: <strong style={{ color: '#334155' }}>{rowRfidOrDash(item)}</strong>
                            </span>
                            <span style={{ color: '#cbd5e1' }}>·</span>
                            <span>
                              Category: <strong style={{ color: '#334155' }}>{rowCategoryOrDash(item)}</strong>
                            </span>
                            <span style={{ color: '#cbd5e1' }}>·</span>
                            <span>
                              Gr.Wt: <strong style={{ color: '#334155' }}>{rowGrossWtOrZero(item)}</strong>
                            </span>
                            <span style={{ color: '#cbd5e1' }}>·</span>
                            <span>
                              Net.Wt: <strong style={{ color: '#334155' }}>{rowNetWtOrZero(item)}</strong>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flex: '0 0 auto' }}>
                {trayEnabled && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRfidTrayModal(true)}
                      title="Scan tag with RFID tray"
                      style={{
                        flex: '0 0 auto',
                        width: 28,
                        height: 28,
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <FaInbox style={{ fontSize: 13 }} />
                    </button>
                    {!inlineTrayScanning ? (
                      <button
                        type="button"
                        onClick={startInlineTrayScan}
                        disabled={inlineTrayBusy}
                        title="Start tray scan — scanned items load into the grid"
                        style={{
                          flex: '0 0 auto',
                          height: 28,
                          padding: '0 10px',
                          borderRadius: '8px',
                          border: '1px solid #059669',
                          background: inlineTrayBusy ? '#a7f3d0' : '#059669',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: inlineTrayBusy ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {inlineTrayBusy ? (
                          <FaSpinner className="fa-spin" style={{ fontSize: 11 }} />
                        ) : (
                          <FaPlay style={{ fontSize: 10 }} />
                        )}
                        Start scan
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopInlineTrayScan}
                        disabled={inlineTrayBusy}
                        title="Stop tray scan and load scanned items into the grid"
                        style={{
                          flex: '0 0 auto',
                          height: 28,
                          padding: '0 10px',
                          borderRadius: '8px',
                          border: '1px solid #dc2626',
                          background: '#dc2626',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: inlineTrayBusy ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {inlineTrayBusy ? (
                          <FaSpinner className="fa-spin" style={{ fontSize: 11 }} />
                        ) : (
                          <FaStop style={{ fontSize: 10 }} />
                        )}
                        Stop ({inlineTrayTagCount})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleReloadPage}
                      disabled={pageResetLoading}
                      title="Load scanned RFID data from the device"
                      style={{
                        flex: '0 0 auto',
                        width: 28,
                        height: 28,
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: pageResetLoading ? 'not-allowed' : 'pointer',
                        opacity: pageResetLoading ? 0.65 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <FaSync className={pageResetLoading ? 'fa-spin' : ''} style={{ fontSize: 12 }} />
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAndReloadPage}
                      disabled={pageResetLoading}
                      title="Clear scanned data and refresh the page"
                      style={{
                        flex: '0 0 auto',
                        height: 28,
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        background: '#fff1f2',
                        color: '#b91c1c',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: pageResetLoading ? 'not-allowed' : 'pointer',
                        opacity: pageResetLoading ? 0.65 : 1,
                        transition: 'all 0.2s ease',
                        padding: '0 10px',
                        fontSize: 10,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Clear Scanned
                    </button>
                  </>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {formValidationHint ? (
                    <div
                      role="alert"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#b91c1c',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: 6,
                        padding: '6px 8px',
                        maxWidth: 320,
                        textAlign: 'right',
                      }}
                    >
                      <div>{formValidationHint}</div>
                      {/employee master|partyid|from employees/i.test(formValidationHint) ? (
                        <button
                          type="button"
                          onClick={() => navigate('/rfid-admin/users/convert-from-employee')}
                          style={{
                            marginTop: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#0f766e',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            borderRadius: 6,
                            padding: '4px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          Open From employees
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={openSampleOutConfirmModal}
                    disabled={!canSubmitSampleOut}
                    title={
                      !isAdminUser
                        ? 'Sample Out is admin-only — scan items for Sample In return instead'
                        : !pendingOutRows.length
                        ? 'Scan items for Sample Out first'
                        : !hasAssignToSelection()
                          ? 'Select employee / party first'
                          : 'Review and confirm Sample Out'
                    }
                    style={{
                      height: 28,
                      padding: '0 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 6,
                      border: '1px solid #0d6f63',
                      background: canSubmitSampleOut
                        ? 'linear-gradient(135deg, #149481 0%, #0f766e 100%)'
                        : '#e2e8f0',
                      color: canSubmitSampleOut ? '#ffffff' : '#94a3b8',
                      cursor: canSubmitSampleOut ? 'pointer' : 'not-allowed',
                      display: isAdminUser && pendingOutRows.length > 0 ? 'inline-flex' : 'none',
                      alignItems: 'center',
                      gap: 6,
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? <FaSpinner className="fa-spin" /> : <FaFileInvoice />}
                    <span>Sample Out</span>
                  </button>
                  <button
                    type="button"
                    onClick={openSampleInConfirmModal}
                    disabled={!canSubmitSampleIn}
                    title={
                      sampleInBlockedReason
                        ? sampleInBlockedReason
                        : !pendingInRows.length
                        ? 'Scan returned items (2nd scan) first'
                        : 'Review and confirm Sample In'
                    }
                    style={{
                      height: 28,
                      padding: '0 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 6,
                      border: '1px solid #15803d',
                      background: canSubmitSampleIn
                        ? 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)'
                        : '#e2e8f0',
                      color: canSubmitSampleIn ? '#ffffff' : '#94a3b8',
                      cursor: canSubmitSampleIn ? 'pointer' : 'not-allowed',
                      display: pendingInRows.length > 0 ? 'inline-flex' : 'none',
                      alignItems: 'center',
                      gap: 6,
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? <FaSpinner className="fa-spin" /> : <FaInbox />}
                    <span>Sample In</span>
                  </button>
                </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isSmallScreen ? '1fr' : '1fr 108px',
                gap: 6,
                alignItems: 'end',
              }}
            >
              <div>
                <label style={compactLbl}>Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional note…"
                  style={compactInp}
                />
              </div>
              <div>
                <label style={compactLbl}>Expected return</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={compactInp}
                />
              </div>
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>

      {/* Items grid — main workspace (Stock Tracking style) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 3,
              background: 'linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%)',
              flexShrink: 0,
            }}
          />
          <div
            style={{
              flexShrink: 0,
              padding: '8px 10px',
              display: 'flex',
              flexWrap: 'nowrap',
              alignItems: 'center',
              gap: 8,
              borderBottom: '1px solid #f1f5f9',
              overflowX: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: isSmallScreen ? 15 : 17, fontWeight: 700, color: '#334155', flexWrap: 'nowrap', minWidth: 'max-content', flex: '1 1 auto' }}>
                <span style={{ padding: '5px 10px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  Scanned Date & Time:{' '}
                  <strong style={{ color: '#047857', fontWeight: 800, fontSize: isSmallScreen ? 16 : 18 }}>
                    {formatScannedDateTime(itemsSummary.latestScanDateTime)}
                  </strong>
                </span>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>|</span>
                <span style={{ padding: '5px 10px', borderRadius: 8, background: '#f8fafc' }}>
                  Scanned Product:{' '}
                  <strong style={{ color: '#059669', fontWeight: 800, fontSize: isSmallScreen ? 18 : 22 }}>
                    {itemsSummary.totalProducts}
                  </strong>
                </span>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>|</span>
                <span style={{ padding: '5px 10px', borderRadius: 8, background: '#f8fafc' }}>
                  Designs:{' '}
                  <strong style={{ color: '#7c3aed', fontWeight: 800, fontSize: isSmallScreen ? 18 : 22 }}>
                    {itemsSummary.totalDesigns}
                  </strong>
                </span>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>|</span>
                <span style={{ padding: '5px 10px', borderRadius: 8, background: '#f8fafc' }}>
                  T Gr.Wt:{' '}
                  <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: isSmallScreen ? 18 : 22 }}>
                    {itemsSummary.totalGrossWt.toFixed(3)}
                  </strong>
                </span>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>|</span>
                <span style={{ padding: '5px 10px', borderRadius: 8, background: '#f8fafc' }}>
                  T Net.Wt:{' '}
                  <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: isSmallScreen ? 18 : 22 }}>
                    {itemsSummary.totalNetWt.toFixed(3)}
                  </strong>
                </span>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>|</span>
                <span style={{ padding: '5px 10px', borderRadius: 8, background: '#f8fafc' }}>
                  Scanned Pieces:{' '}
                  <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: isSmallScreen ? 18 : 22 }}>
                    {itemsSummary.totalPiecesScanned}
                  </strong>
                </span>
            </div>
            {sampleInReturnReports.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowSampleInLotSummary(true)}
                title="View lot return summary"
                aria-label="View lot return summary"
                style={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: '1px solid #bbf7d0',
                  background: '#f0fdf4',
                  color: '#15803d',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FaEye size={16} />
              </button>
            ) : null}
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 10px' }}>
            <div
              style={{
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200, maxWidth: 320 }}>
                <FaSearch
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: 11,
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="sample-out-table-filter"
                  type="search"
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search RFID / Item / Design…"
                  aria-label="Filter sample out items"
                  style={{ ...compactInp, paddingLeft: 26, width: '100%' }}
                />
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || filteredTableItems.length === 0}
                  style={pageBtnStyleItems(currentPage === 1 || filteredTableItems.length === 0)}
                >
                  Previous
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={`sample-out-page-${page}`}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: '6px 11px',
                      minWidth: 34,
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: currentPage === page ? '#059669' : '#fff',
                      color: currentPage === page ? '#fff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || filteredTableItems.length === 0}
                  style={pageBtnStyleItems(currentPage === totalPages || filteredTableItems.length === 0)}
                >
                  Next
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#ffffff', borderRadius: 8, padding: 10 }}>

              {filteredTableItems.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: '#737373', fontSize: 13, lineHeight: 1.55 }}>
                  {tableSearch.trim()
                    ? 'No rows match your filter. Try another item code, RFID, or product keyword.'
                    : 'Scan or search RFID / item code. 1st scan adds Sample Out; scan again when out returns Sample In.'}
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isSmallScreen ? 'repeat(2, minmax(0, 1fr))' : `repeat(${SAMPLE_OUT_GRID_COLUMNS}, minmax(0, 1fr))`,
                    gap: 12,
                  }}
                >
                  {currentItems.map((item, idx) => {
                    const serial = startIndex + idx + 1;
                    const itemCode = rowItemCodeOrDash(item);
                    const rfid = rowRfidOrDash(item);
                    const design = rowDesignOrDash(item);
                    const category = rowCategoryOrDash(item);
                    const pieces = rowPieces(item);
                    const scanMode = rowScanMode(item);
                    const scanModeBadge = scanModeBadgeStyle(scanMode);
                    const isSampleInPending = item.__scanAction === 'SampleInPending';
                    const isSampleInDone = item.__scanAction === 'SampleInDone';
                    const isSampleIn = isSampleInPending || isSampleInDone;
                    const scannedAt = rowScannedDateTime(item);
                    const scannedByUser = rowScannedByUser(item);
                    return (
                      <article
                        key={item.id ?? `${serial}-${rowItemCode(item)}`}
                        style={{
                          border: `1px solid ${isSampleIn ? (isSampleInDone ? '#bbf7d0' : '#fde047') : '#e2e8f0'}`,
                          borderRadius: 12,
                          background: isSampleInDone ? '#f0fdf4' : isSampleInPending ? '#fefce8' : '#fff',
                          overflow: 'hidden',
                          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '8px 10px',
                            borderBottom: '1px solid #f1f5f9',
                            background: '#fafafa',
                            minWidth: 0,
                          }}
                          title={[
                            scannedAt ? `Scanned at ${formatScannedTime(scannedAt)}` : '',
                            scannedByUser ? `By ${scannedByUser}` : '',
                            scanMode,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        >
                          {scannedAt ? (
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#64748b',
                                fontVariantNumeric: 'tabular-nums',
                                flexShrink: 0,
                              }}
                            >
                              <span style={{ color: '#94a3b8' }}>Scanned at:</span>{' '}
                              {formatScannedTime(scannedAt)}
                            </div>
                          ) : (
                            <span />
                          )}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 6,
                              minWidth: 0,
                              flex: '1 1 auto',
                              overflow: 'hidden',
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#64748b',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {scannedByUser ? (
                              <strong
                                style={{
                                  color: '#0f172a',
                                  fontWeight: 800,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {scannedByUser}
                              </strong>
                            ) : null}
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 800,
                                color: scanModeBadge.color,
                                background: scanModeBadge.background,
                                padding: '2px 6px',
                                borderRadius: 4,
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                                flexShrink: 0,
                              }}
                            >
                              {scanMode}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                color: '#94a3b8',
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              #{serial}
                              {isSampleIn && item.__lotNumber ? ` · ${item.__lotNumber}` : ''}
                            </span>
                          </div>
                        </div>
                        <GridItemImage
                          src={rowImageUrl(item)}
                          itemCode={itemCode === '—' ? '' : itemCode}
                          lookupKeys={sampleOutItemImageLookupKeys(item)}
                          alt={itemCode}
                          wrapperStyle={{
                            width: '100%',
                            height: 300,
                            background: '#ffffff',
                            borderBottom: '1px solid #edf2f7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px 14px',
                            boxSizing: 'border-box',
                          }}
                          imgStyle={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            objectPosition: 'center',
                            background: '#fff',
                            borderRadius: 8,
                          }}
                          placeholder={
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#94a3b8',
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              No image
                            </div>
                          }
                        />
                        <div
                          style={{
                            padding: '8px 10px 10px',
                            flex: '0 0 auto',
                            fontSize: 11,
                            lineHeight: 1.35,
                            color: '#0f172a',
                          }}
                        >
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '6px 10px',
                              marginBottom: 8,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                RFID
                              </div>
                              <div
                                style={{ fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                title={rfid}
                              >
                                {rfid}
                              </div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                Item
                              </div>
                              <div
                                style={{ fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                title={itemCode}
                              >
                                {itemCode}
                              </div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                Design
                              </div>
                              <div
                                style={{ fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                title={design}
                              >
                                {design}
                              </div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                Category
                              </div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: '#0f172a',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={category}
                              >
                                {category}
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                              gap: '6px 8px',
                              paddingTop: 8,
                              borderTop: '1px solid #f1f5f9',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                Gr. Wt
                              </div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                                {rowGrossWtOrZero(item)}
                              </div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                Net Wt
                              </div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                                {rowNetWtOrZero(item)}
                              </div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                Pieces
                              </div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                                {pieces}
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CustomerSidebarForm
        open={showCustomerSidebar}
        onClose={() => setShowCustomerSidebar(false)}
        onSave={async (form) => {
          const validationError = validateSidebarCustomerForm(form);
          if (validationError) {
            addNotification({ type: 'error', title: 'Customer', message: validationError });
            throw new Error(validationError);
          }
          if (!userInfo?.ClientCode) {
            addNotification({ type: 'error', title: 'Customer', message: 'Missing client code.' });
            throw new Error('Missing client code.');
          }
          const payload = buildAddCustomerPayloadFromSidebar(form, userInfo.ClientCode);
          try {
            setLoading(true);
            await axios.post(getAddCustomerUrl(), payload, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
            });
            addNotification({
              type: 'success',
              title: 'Customer',
              message: 'Customer saved successfully.',
            });
            await fetchCustomers();
          } catch (err) {
            const msg =
              err?.response?.data?.Message ||
              err?.response?.data?.message ||
              err.message ||
              'Failed to add customer.';
            addNotification({ type: 'error', title: 'Customer', message: msg });
            throw err;
          } finally {
            setLoading(false);
          }
        }}
      />

      <VendorSidebarForm
        open={showVendorSidebar}
        onClose={() => setShowVendorSidebar(false)}
        onSave={async (form) => {
          const validationError = validateVendorSidebarForm(form);
          if (validationError) {
            addNotification({ type: 'error', title: 'Vendor', message: validationError });
            throw new Error(validationError);
          }
          if (!userInfo?.ClientCode) {
            addNotification({ type: 'error', title: 'Vendor', message: 'Missing client code.' });
            throw new Error('Missing client code.');
          }
          const payload = buildAddVendorPayload(form, userInfo.ClientCode);
          try {
            setLoading(true);
            await axios.post(getAddVendorUrl(), payload, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
            });
            addNotification({ type: 'success', title: 'Vendor', message: 'Vendor saved successfully.' });
            await fetchVendors();
          } catch (err) {
            const msg =
              err?.response?.data?.Message ||
              err?.response?.data?.message ||
              err.message ||
              'Failed to add vendor.';
            addNotification({ type: 'error', title: 'Vendor', message: msg });
            throw err;
          } finally {
            setLoading(false);
          }
        }}
      />

      <EmployeeSidebarForm
        open={showEmployeeSidebar}
        onClose={() => setShowEmployeeSidebar(false)}
        clientCode={userInfo?.ClientCode}
        onSave={async (form) => {
          const validationError = validateEmployeeSidebarForm(form);
          if (validationError) {
            addNotification({ type: 'error', title: 'Employee', message: validationError });
            throw new Error(validationError);
          }
          if (!userInfo?.ClientCode) {
            addNotification({ type: 'error', title: 'Employee', message: 'Missing client code.' });
            throw new Error('Missing client code.');
          }
          const payload = buildAddEmployeePayload(form, userInfo.ClientCode);
          try {
            setLoading(true);
            await axios.post(getAddEmployeeUrl(), payload, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
            });
            addNotification({ type: 'success', title: 'Employee', message: 'Employee saved successfully.' });
            await fetchEmployees();
          } catch (err) {
            const msg =
              err?.response?.data?.Message ||
              err?.response?.data?.message ||
              err.message ||
              'Failed to add employee.';
            addNotification({ type: 'error', title: 'Employee', message: msg });
            throw err;
          } finally {
            setLoading(false);
          }
        }}
      />

      {showConfirmSampleOut && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => {
            if (confirmSampleOutPhase === 'summary') setShowConfirmSampleOut(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: isSmallScreen ? '22px' : '28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
              animation: 'fadeIn 0.25s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {confirmSampleOutPhase === 'summary' ? (
              <>
                <h2
                  style={{
                    fontWeight: 600,
                    fontSize: isSmallScreen ? '18px' : '20px',
                    color: '#0f172a',
                    margin: '0 0 8px 0',
                    lineHeight: 1.3
                  }}
                >
                  Confirm Sample Out
                </h2>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', lineHeight: 1.55 }}>
                  Review the transaction details below. Once confirmed, these items will be recorded as
                  sample out.
                </p>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: 8,
                  }}
                >
                  Transaction Summary
                </div>
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    marginBottom: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    color: '#334155',
                    lineHeight: 1.6
                  }}
                >
                  <div>
                    <strong style={{ color: '#475569' }}>{assignToFieldLabel}:</strong>{' '}
                    {getResolvedAssignToName()}
                  </div>
                  {sampleOutNumber ? (
                    <div>
                      <strong style={{ color: '#475569' }}>Sample Out No.:</strong> {sampleOutNumber}
                    </div>
                  ) : null}
                  <div>
                    <strong style={{ color: '#475569' }}>Items:</strong> {pendingOutRows.length} ·{' '}
                    <strong style={{ color: '#475569' }}>Pieces:</strong> {pendingOutSummary.pieces} ·{' '}
                    <strong style={{ color: '#475569' }}>Gross Weight:</strong> {pendingOutSummary.gross.toFixed(3)}
                  </div>
                  <div>
                    <strong style={{ color: '#475569' }}>Last Scanned:</strong>{' '}
                    {pendingOutSummary.latest
                      ? pendingOutSummary.latest.toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </div>
                  <div>
                    <strong style={{ color: '#475569' }}>Out time:</strong> Recorded on submit (IST) ·{' '}
                    <strong style={{ color: '#475569' }}>Expected return:</strong> {returnDate || '—'}
                  </div>
                  {description ? (
                    <div>
                      <strong style={{ color: '#475569' }}>Note:</strong> {description}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: 8,
                  }}
                >
                  Items to Issue ({pendingOutRows.length})
                </div>
                <div
                  style={{
                    maxHeight: 220,
                    overflowY: 'auto',
                    marginBottom: 16,
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    fontSize: 11,
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>#</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item Code</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>RFID</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Gross Wt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOutRows.slice(0, 200).map((row, i) => (
                        <tr key={row.id ?? i} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '5px 8px' }}>{i + 1}</td>
                          <td style={{ padding: '5px 8px', fontWeight: 700 }}>{rowItemCode(row) || '—'}</td>
                          <td style={{ padding: '5px 8px' }}>{rowRfidOrDash(row)}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right' }}>{rowGrossWtOrZero(row)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pendingOutRows.length > 200 ? (
                    <div style={{ padding: 8, color: '#64748b', fontSize: 10 }}>
                      + {pendingOutRows.length - 200} more item(s) not shown in this list
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowConfirmSampleOut(false)}
                    style={{
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSampleOutProceed}
                    disabled={loading}
                    style={{
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: '10px',
                      border: '1px solid #0f766e',
                      background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
                      color: '#ffffff',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.65 : 1,
                      boxShadow: '0 6px 14px rgba(20, 184, 166, 0.28)'
                    }}
                  >
                    Confirm Sample Out
                  </button>
                </div>
              </>
            ) : confirmSampleOutPhase === 'acknowledge' ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '12px 8px 8px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '18px',
                    animation: 'confirmTickCircleIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                  }}
                >
                  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
                    <circle
                      cx="36"
                      cy="36"
                      r="34"
                      stroke="#6ee7b7"
                      strokeWidth="2"
                      fill="#ecfdf5"
                    />
                    <path
                      className="sample-out-confirm-check-path"
                      d="M22 36.5 L31.5 46 L50 24"
                      stroke="#059669"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0f172a'
                  }}
                >
                  Sample Out Confirmed
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#64748b' }}>
                  Saving the transaction, please wait…
                </p>
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '12px 8px 8px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '18px'
                  }}
                >
                  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
                    <circle
                      cx="36"
                      cy="36"
                      r="34"
                      stroke="#6ee7b7"
                      strokeWidth="2"
                      fill="#ecfdf5"
                    />
                    <path
                      d="M22 36.5 L31.5 46 L50 24"
                      stroke="#059669"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0f172a'
                  }}
                >
                  Saving Sample Out…
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#64748b' }}>
                  Please wait — do not close this window until complete
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {scanReviewModal && (() => {
        const modalTone = scanReviewModalTone(scanReviewModal.sections);
        const toneTheme = SCAN_POPUP_THEME[modalTone] || SCAN_POPUP_THEME.info;
        const isErrorModal = modalTone === 'error';
        return (
        <div
          className="scan-review-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: isErrorModal ? 'rgba(127, 29, 29, 0.45)' : 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10080,
            padding: 16,
            animation: 'scanOverlayIn 0.25s ease-out',
          }}
          onClick={() => setScanReviewModal(null)}
        >
          <div
            className={isErrorModal ? 'scan-review-dialog scan-review-dialog--error' : 'scan-review-dialog'}
            style={{
              background: '#fff',
              borderRadius: 14,
              maxWidth: 560,
              width: '100%',
              maxHeight: '88vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isErrorModal
                ? '0 24px 48px rgba(220, 38, 38, 0.22)'
                : '0 24px 48px rgba(0,0,0,0.2)',
              border: isErrorModal ? `2px solid ${toneTheme.border}` : 'none',
              animation: 'scanModalIn 0.32s cubic-bezier(0.34, 1.4, 0.64, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '18px 20px 12px',
                borderBottom: `1px solid ${isErrorModal ? '#fecaca' : '#e2e8f0'}`,
                background: isErrorModal ? '#fef2f2' : '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
                  {isErrorModal ? (
                    <div
                      className="scan-error-icon-pulse"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: '#fee2e2',
                        border: `2px solid ${toneTheme.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        animation: 'scanErrorIconIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    >
                      <FaExclamationCircle size={20} color={toneTheme.icon} />
                    </div>
                  ) : null}
                  <div style={{ minWidth: 0 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 800,
                        color: isErrorModal ? '#991b1b' : '#0f172a',
                      }}
                    >
                      {scanReviewModal.title}
                    </h2>
                    {scanReviewModal.subtitle ? (
                      <p
                        style={{
                          margin: '6px 0 0',
                          fontSize: 12,
                          color: isErrorModal ? '#b91c1c' : '#64748b',
                          lineHeight: 1.55,
                        }}
                      >
                        {scanReviewModal.subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScanReviewModal(null)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: isErrorModal ? '#b91c1c' : '#64748b',
                    flexShrink: 0,
                  }}
                >
                  <FaTimes size={18} />
                </button>
              </div>
            </div>
            <div style={{ padding: '12px 16px 16px', overflowY: 'auto', flex: 1 }}>
              {(scanReviewModal.sections || []).map((section, si) => {
                const theme = SCAN_POPUP_THEME[section.type] || SCAN_POPUP_THEME.info;
                const rows = section.rows || [];
                const cap = 150;
                const isErrorSection = section.type === 'error';
                return (
                  <div
                    key={`scan-sec-${si}`}
                    style={{
                      marginBottom: 12,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: theme.bg,
                      animation: isErrorSection ? 'scanErrorShake 0.55s ease 0.15s' : undefined,
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 800,
                        color: theme.fg,
                        borderBottom: `1px solid ${theme.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {isErrorSection ? <FaExclamationCircle size={13} color={theme.icon} /> : null}
                      {section.heading}
                    </div>
                    <ul style={{ margin: 0, padding: '10px 12px', listStyle: 'none', fontSize: 12 }}>
                      {rows.slice(0, cap).map((row, ri) => (
                        <li
                          key={`${si}-${ri}-${row.itemCode}`}
                          style={{
                            padding: '8px 0',
                            borderBottom: ri < Math.min(rows.length, cap) - 1 ? `1px solid ${theme.border}` : 'none',
                            color: theme.fg,
                            lineHeight: 1.55,
                          }}
                        >
                          <div style={{ fontWeight: 800, marginBottom: 4 }}>
                            {row.itemCode}
                            {row.rfid && row.rfid !== '—' ? (
                              <span style={{ fontWeight: 600, opacity: 0.88 }}> · RFID {row.rfid}</span>
                            ) : null}
                          </div>
                          <div style={{ opacity: 0.95 }}>{row.message}</div>
                        </li>
                      ))}
                      {rows.length > cap ? (
                        <li style={{ padding: '8px 0 0', color: theme.fg, fontWeight: 700 }}>
                          + {rows.length - cap} more — use grid filter to find items
                        </li>
                      ) : null}
                    </ul>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                padding: '12px 16px',
                borderTop: `1px solid ${isErrorModal ? '#fecaca' : '#e2e8f0'}`,
                textAlign: 'right',
                background: isErrorModal ? '#fffbfb' : '#fff',
              }}
            >
              <button
                type="button"
                onClick={() => setScanReviewModal(null)}
                style={{
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 8,
                  border: isErrorModal ? '1px solid #dc2626' : '1px solid #cbd5e1',
                  background: isErrorModal ? '#dc2626' : '#fff',
                  color: isErrorModal ? '#fff' : '#0f172a',
                  cursor: 'pointer',
                  boxShadow: isErrorModal ? '0 4px 12px rgba(220, 38, 38, 0.28)' : 'none',
                }}
              >
                {isErrorModal ? 'Got It' : 'OK'}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {showSampleInLotSummary && sampleInReturnReports.length > 0 ? (
        <SampleInReturnLotsDetailModal
          reports={sampleInReturnReports}
          onClose={() => setShowSampleInLotSummary(false)}
        />
      ) : null}

      {showConfirmSampleIn && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => {
            if (confirmSampleInPhase === 'summary') setShowConfirmSampleIn(false);
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: isSmallScreen ? 20 : 24,
              maxWidth: 720,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              overflowX: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {confirmSampleInPhase === 'summary' ? (
              <>
                <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                  Confirm Sample In (return)?
                </h2>
                <p
                  style={{
                    margin: '0 0 14px',
                    fontSize: 13,
                    color: '#64748b',
                    lineHeight: 1.55,
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                >
                  These items were scanned a 2nd time (RFID/TID). Employee was already assigned at Sample Out — no
                  re-selection needed.
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px 18px',
                    padding: '10px 0 14px',
                    marginBottom: 4,
                    borderBottom: '1px solid #eef2f7',
                  }}
                >
                  {[
                    ['Lot', sampleInBatchLabel || '—'],
                    ['Employee', sampleInAssignedEmployee || 'From original Sample Out'],
                    ['Returning', `${pendingInRows.length} item(s)`],
                    ['Pieces', String(pendingInSummary.pieces)],
                    ['Gross wt', pendingInSummary.gross.toFixed(3)],
                    ['Net wt', pendingInSummary.net.toFixed(3)],
                    [
                      'Scanned',
                      pendingInSummary.latest
                        ? pendingInSummary.latest.toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—',
                    ],
                  ].map(([label, value]) => (
                    <div key={label} style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 2 }}>{label}</div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: '#0f172a',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                          lineHeight: 1.4,
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                {sampleInReturnReports.length > 0 ? (
                  <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sampleInReturnReports.map((report) =>
                      report.apiSummary ? (
                        <div
                          key={report.lotId || report.lotNo}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            background: '#fafcff',
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f4c81', marginBottom: 8 }}>
                            Lot {report.lotNo}
                          </div>
                          <PartialReturnSummaryPanel summary={report.apiSummary} compact />
                        </div>
                      ) : null
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSampleInLotSummary(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #bbf7d0',
                        background: '#f0fdf4',
                        color: '#15803d',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <FaEye size={14} />
                      View lot return summary
                    </button>
                    <SampleInReturnInlineWarnings reports={sampleInReturnReports} />
                  </div>
                ) : null}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowConfirmSampleIn(false)}
                    style={{
                      padding: '10px 18px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSampleInProceed}
                    disabled={loading || Boolean(sampleInBlockedReason)}
                    title={sampleInBlockedReason || undefined}
                    style={{
                      padding: '10px 18px',
                      fontSize: 13,
                      fontWeight: 700,
                      borderRadius: 10,
                      border: '1px solid #15803d',
                      background:
                        loading || sampleInBlockedReason
                          ? '#e2e8f0'
                          : 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                      color: loading || sampleInBlockedReason ? '#94a3b8' : '#fff',
                      cursor: loading || sampleInBlockedReason ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Confirm Sample In
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 8px' }}>
                <FaSpinner style={{ animation: 'spin 1s linear infinite', fontSize: 28, color: '#15803d' }} />
                <p style={{ margin: '12px 0 0', fontWeight: 600 }}>Returning items to stock…</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && successData && (() => {
        const partyName = successData.partyName || successData.customerName || '—';
        const assignName = String(successData.assignedToUserName || '').trim();
        const samePartyAndAssign =
          assignName &&
          partyName &&
          assignName.toLowerCase() === String(partyName).trim().toLowerCase();
        const rawStatus =
          successData.lotStatus ||
          successData.header?.Status ||
          successData.header?.status ||
          '';
        const statusLabel = formatSampleLotStatusLabel(rawStatus) || '—';
        const statusBadge = getSampleOutStatusBadgeStyle(rawStatus);
        const subtitle = formatSampleOutSuccessSubtitle(
          successData.apiMessage,
          successData.sampleOutNo
        );
        const totalItems =
          successData.totalItems ??
          successData.header?.TotalItems ??
          successData.lineItems?.length ??
          null;
        const totalPieces =
          successData.totalPieces ??
          resolveSuccessTotalPieces(successData.header, successData.lineItems, null);
        const pendingItems =
          successData.header?.PendingItems ??
          (successData.lineItems?.length > 0 ? successData.lineItems.length : null);
        const returnBy = successData.header?.ExpectedReturnDate
          ? formatSampleApiDateTime(successData.header.ExpectedReturnDate)
          : null;
        const summaryRows = [
          samePartyAndAssign
            ? { label: 'Assigned to', value: assignName || partyName }
            : [
                { label: 'Party', value: partyName },
                ...(assignName ? [{ label: 'Assigned to', value: assignName }] : []),
              ],
          totalItems != null && totalItems !== ''
            ? { label: 'Items', value: String(totalItems) }
            : null,
          totalPieces != null
            ? { label: 'Pieces', value: formatSummaryPieces(totalPieces) }
            : null,
          pendingItems != null && pendingItems !== '' && String(pendingItems) !== String(totalItems)
            ? { label: 'Pending', value: String(pendingItems) }
            : null,
          returnBy ? { label: 'Return by', value: returnBy } : null,
        ]
          .flat()
          .filter(Boolean);

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '16px',
            }}
            onClick={() => setShowSuccessModal(false)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-labelledby="sample-out-success-title"
              aria-modal="true"
              className="sample-out-success-modal"
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: isSmallScreen ? '18px' : '24px',
                maxWidth: isSmallScreen ? 'min(94vw, 100%)' : 'min(94vw, 580px)',
                width: '100%',
                maxHeight: 'min(90vh, 680px)',
                overflowY: 'auto',
                boxShadow: '0 28px 56px -16px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.04)',
                position: 'relative',
                animation: 'fadeIn 0.25s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setShowSuccessModal(false)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: '#f8fafc',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                }}
              >
                <FaTimes style={{ color: '#64748b', fontSize: '14px' }} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', paddingRight: '28px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <FaCheckCircle style={{ fontSize: '22px', color: '#fff' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2
                    id="sample-out-success-title"
                    style={{
                      margin: 0,
                      fontWeight: 800,
                      fontSize: isSmallScreen ? '17px' : '18px',
                      color: '#0f172a',
                      lineHeight: 1.2,
                    }}
                  >
                    Sample out saved
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>
                    {subtitle}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap',
                  marginBottom: '14px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Sample Out NO
                  </div>
                  <div
                    style={{
                      fontSize: isSmallScreen ? '20px' : '22px',
                      fontWeight: 800,
                      color: '#0f172a',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.2,
                      marginTop: '2px',
                    }}
                  >
                    {successData.sampleOutNo}
                  </div>
                </div>
                {rawStatus ? (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '5px 10px',
                      borderRadius: '999px',
                      background: statusBadge.bg,
                      border: `1px solid ${statusBadge.border}`,
                      color: statusBadge.color,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {statusLabel}
                  </span>
                ) : null}
              </div>

              {summaryRows.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: summaryRows.length > 2 && !isSmallScreen ? '1fr 1fr' : '1fr',
                    gap: '8px 12px',
                    marginBottom: '14px',
                    fontSize: '13px',
                  }}
                >
                  {summaryRows.map((row) => (
                    <div key={row.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {row.label}
                      </span>
                      <span style={{ fontWeight: 600, color: '#1e293b', lineHeight: 1.3 }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {successData.header?.Remarks ? (
                <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b', lineHeight: 1.45 }}>
                  <span style={{ fontWeight: 700, color: '#94a3b8' }}>Note: </span>
                  {successData.header.Remarks}
                </p>
              ) : null}

              {successData.lineItems?.length > 0 ? (
                <div style={{ marginBottom: '18px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Items ({successData.lineItems.length})
                    </span>
                  </div>
                  <div
                    className="sample-out-success-items-scroll"
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      background: '#fafbfc',
                    }}
                  >
                    <table className="sample-out-success-items-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Design</th>
                          <th>Item code</th>
                          <th style={{ textAlign: 'right' }}>Gr Wt</th>
                          <th style={{ textAlign: 'right' }}>Nwt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {successData.lineItems.map((row, idx) => {
                          const design =
                            String(row.DesignName ?? row.Design ?? row.designName ?? '').trim() || '—';
                          const itemCode = String(row.ItemCode ?? row.Itemcode ?? '').trim() || '—';
                          const grossWt = (() => {
                            const n = parseFloat(row.GrossWt ?? row.GrossWeight ?? row.grosswt ?? row.TWt);
                            return Number.isFinite(n) ? n.toFixed(3) : '—';
                          })();
                          const netWt = (() => {
                            const n = parseFloat(row.NetWt ?? row.NetWeight ?? row.netwt ?? row.NtWt);
                            return Number.isFinite(n) ? n.toFixed(3) : '—';
                          })();
                          return (
                            <tr key={row.Id ?? `${itemCode}-${idx}`}>
                              <td style={{ color: '#475569', maxWidth: 120 }} title={design}>
                                {design}
                              </td>
                              <td style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                                {itemCode}
                              </td>
                              <td style={{ textAlign: 'right', color: '#334155', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                {grossWt}
                              </td>
                              <td style={{ textAlign: 'right', color: '#334155', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                {netWt}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                style={{
                  width: '100%',
                  padding: '11px 20px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.28)',
                }}
              >
                Done
              </button>
            </div>
          </div>
        );
      })()}

      <TrayScanModal
        open={showRfidTrayModal}
        onClose={() => setShowRfidTrayModal(false)}
        onScanStart={handleTrayScanStart}
        onFetchData={handleTrayFetchData}
        title={trayModalCopy.title}
        subtitle={trayModalCopy.subtitle}
        loadButtonLabel={trayModalCopy.loadButtonLabel}
        compactLayout
      />

      <style>{`
        .sample-out-success-items-table thead tr {
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          color: #64748b;
          text-align: left;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .sample-out-success-items-table th {
          padding: 9px 12px;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #e2e8f0;
        }
        .sample-out-success-items-table td {
          padding: 9px 12px;
          border-top: 1px solid #f1f5f9;
          background: #fff;
        }
        .sample-out-success-items-table tbody tr:hover td {
          background: #f8fafc;
        }
        .sample-out-success-items-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .sample-out-success-items-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes scanOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scanModalIn {
          from {
            opacity: 0;
            transform: scale(0.88) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes scanErrorShake {
          0%, 100% { transform: translateX(0); }
          18% { transform: translateX(-7px); }
          36% { transform: translateX(6px); }
          54% { transform: translateX(-4px); }
          72% { transform: translateX(3px); }
          90% { transform: translateX(-1px); }
        }
        @keyframes scanErrorIconIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes confirmTickCircleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .sample-out-confirm-check-path {
          stroke-dasharray: 56;
          stroke-dashoffset: 56;
          animation: confirmTickDraw 0.5s ease-out 0.14s forwards;
        }
        @keyframes confirmTickDraw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes popIn {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default SampleOut;

