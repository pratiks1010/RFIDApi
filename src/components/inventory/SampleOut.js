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
import { getApiMode, getRrgoldApiBaseUrl, getSampleApiBaseUrl, getSoniApiBaseUrl, toRrgoldApiUrl } from '../../services/apiBaseConfig';
import {
  getSubmitSampleOutUrl,
  getPartyLookupUrl,
  getAllSubUsersUrl,
  getLastNextSampleLotNumberUrl,
  getCheckScanStatusUrl,
  getScanSampleInUrl,
  sampleAuthHeaders,
} from '../../services/rfidSampleApi';
import { getItemImageLookupKeys, warmupLocalItemImageIndex } from '../../services/localItemImageService';
import { getAuthState } from '../../utils/authState';
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
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
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
    Pending: 'Pending',
    Accepted: 'Accepted',
    Returned: 'Returned',
    PartiallyReturned: 'Partially returned',
    Closed: 'Closed',
    Cancelled: 'Cancelled',
  };
  if (known[s]) return known[s];
  return s
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
};

const getSampleOutStatusBadgeStyle = (rawStatus) => {
  const key = String(rawStatus ?? '').trim();
  if (/pending|accept/i.test(key)) {
    return { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' };
  }
  if (/return|partial/i.test(key)) {
    return { bg: '#fffbeb', border: '#fde68a', color: '#b45309' };
  }
  if (/cancel|reject/i.test(key)) {
    return { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' };
  }
  if (/accept|closed|complete/i.test(key)) {
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
  return line;
};

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

const buildProductDataFromRaw = (item, extras = {}) => ({
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
  design_id: item.DesignName || item.Design || item.design_id || item.designName || '',
  purity_id: item.PurityName || item.Purity || item.purity_id || item.purityName || '',
  grosswt: item.GrossWt || item.GrossWeight || item.grosswt || item.grossWt || item.TWt || '0.000',
  stonewt: item.StoneWt || item.StoneWeight || item.stonewt || item.StWt || '0.000',
  diamondweight: item.DiamondWeight || item.diamondweight || item.DiaWt || '0.000',
  netwt: item.NetWt || item.NetWeight || item.netwt || item.netWt || item.NtWt || '0.000',
  FinePercent: item.FinePercent || item.FinePercentage || item['Fine %'] || '0.00',
  WastagePercent: item.WastagePercent || item.WastagePercentage || item['Wastage %'] || '0.00',
  Qty: item.Qty || item.Quantity || 1,
  Pieces: item.Pieces || item.Qty || 1,
  TotalWt: item.GrossWt || item.GrossWeight || item.grosswt || item.grossWt || item.TWt || '0.000',
  fullItemData: item,
  __scanAction: 'SampleOut',
  ...extras,
});

const enrichItemFromCheckStatus = (item, checkData) => {
  const p = checkData?.product ?? checkData?.Product ?? {};
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
    PurityName: pickScanApiField(p, 'purityName', 'PurityName') || item.PurityName,
    GrossWt: pickScanApiField(p, 'grossWt', 'GrossWt') || item.GrossWt,
    NetWt: pickScanApiField(p, 'netWt', 'NetWt') || item.NetWt,
    Status: pickScanApiField(p, 'status', 'Status') || item.Status,
  };
  return buildProductDataFromRaw(merged, {
    __scanAction: 'SampleOut',
    __stockStatus: checkData?.stockStatus ?? checkData?.StockStatus ?? '',
    __scanPhase: checkData?.scanPhase ?? checkData?.ScanPhase ?? 'firstScan',
  });
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
  error: { bg: '#fef2f2', border: '#fca5a5', fg: '#b91c1c', icon: '#dc2626' },
};

const summarizeScanRows = (rows) => {
  let gross = 0;
  let pieces = 0;
  let latest = null;
  (rows || []).forEach((row) => {
    gross += parseFloat(row?.grosswt ?? row?.GrossWt ?? 0) || 0;
    pieces += parseFloat(row?.Qty ?? row?.Pieces ?? 1) || 1;
    const dt = row?.__scannedAt ? new Date(row.__scannedAt) : null;
    if (dt && !Number.isNaN(dt.getTime()) && (!latest || dt > latest)) latest = dt;
  });
  return { gross, pieces, latest };
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
  const [sampleOutDate, setSampleOutDate] = useState(new Date().toISOString().split('T')[0]);
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
  const [confirmSampleInPhase, setConfirmSampleInPhase] = useState('summary');
  const [scanReviewModal, setScanReviewModal] = useState(null);
  const confirmSampleInLockRef = useRef(false);
  const [formValidationHint, setFormValidationHint] = useState('');
  const confirmSampleOutLockRef = useRef(false);
  const [showRfidTrayModal, setShowRfidTrayModal] = useState(false);
  const [trayEnabled, setTrayEnabled] = useState(isInventoryTrayEnabled());
  const [showCustomerSidebar, setShowCustomerSidebar] = useState(false);
  const [showVendorSidebar, setShowVendorSidebar] = useState(false);
  const [showEmployeeSidebar, setShowEmployeeSidebar] = useState(false);
  
  const customerDropdownRef = useRef(null);
  const itemCodeSearchRef = useRef(null);
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
  const rowRfidOrDash = (row) => String(row?.RFIDNumber ?? '').trim() || '—';
  const rowCategoryOrDash = (row) =>
    String(row?.category_id ?? row?.CategoryName ?? row?.Category ?? '').trim() || '—';
  const rowProductOrDash = (row) =>
    String(row?.product_id ?? row?.ProductName ?? row?.Product ?? '').trim() || '—';
  const rowDesignOrDash = (row) =>
    String(row?.design_id ?? row?.DesignName ?? row?.Design ?? '').trim() || '—';
  const rowGrossWtOrZero = (row) => String(row?.grosswt ?? row?.GrossWt ?? row?.GrossWeight ?? row?.TWt ?? '0.000');
  const rowNetWtOrZero = (row) => String(row?.netwt ?? row?.NetWt ?? row?.NetWeight ?? row?.NtWt ?? '0.000');
const rowPieces = (row) => {
  const n = parseFloat(row?.Qty ?? row?.qty ?? row?.Pieces ?? row?.pieces ?? 1);
  return Number.isNaN(n) ? 1 : n;
};
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

  // Search labeled stock via ProductMaster GetAllLabeledStock (item code / RFID / query)
  const handleItemCodeSearch = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    if (!userInfo?.ClientCode) {
      return;
    }

    setSearching(true);
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      };
      const term = searchTerm.trim();
      const clientCode = userInfo.ClientCode;
      const labeledStockUrl = toRrgoldApiUrl('/api/ProductMaster/GetAllLabeledStock');

      const requestLabeledStock = (payload) =>
        axios.post(labeledStockUrl, payload, { headers });

      let results = normalizeArray(
        (
          await requestLabeledStock({
            ClientCode: clientCode,
            ItemCode: term,
            SearchQuery: term,
            RFIDCode: term,
            PageNumber: 1,
            PageSize: 30,
          })
        ).data
      );

      if (!results.length) {
        results = normalizeArray(
          (
            await requestLabeledStock({
              ClientCode: clientCode,
              CategoryId: 0,
              ProductId: 0,
              DesignId: 0,
              PurityId: 0,
              BranchId: 0,
              CounterId: 0,
              ItemCode: term,
              RFIDCode: term,
              SearchQuery: term,
              FromDate: null,
              ToDate: null,
              Status: 'ApiActive',
              ListType: 'ascending',
              SortColumn: null,
              PageNumber: 1,
              PageSize: 30,
            })
          ).data
        );
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
      if (prev.some((sampleItem) => rowDedupKey(sampleItem) === key && sampleItem.__scanAction === 'SampleOut')) {
        duplicate = true;
        return prev;
      }
      return [...prev, productData];
    });

    if (duplicate) {
      return {
        ok: false,
        level: 'warning',
        itemCode: productData.Itemcode || productData.ItemCode || '—',
        message: 'Already in Sample Out list.',
      };
    }
    return {
      ok: true,
      level: 'success',
      itemCode: productData.Itemcode || productData.ItemCode || '—',
      rfid: productData.RFIDNumber || '—',
      message: 'Queued for Sample Out.',
      productData,
    };
  };

  const addSampleInPendingRow = (item, checkData) => {
    const lotNo =
      checkData?.activeLot?.lotNumber ??
      checkData?.ActiveLot?.LotNumber ??
      checkData?.activeLot?.LotNumber ??
      '—';
    const lotId =
      checkData?.activeLot?.lotId ??
      checkData?.ActiveLot?.LotId ??
      checkData?.activeLot?.LotId ??
      null;
    const itemCode = rowItemCodeFromRaw(item) || item.Itemcode || item.ItemCode || '—';
    const key = rowDedupKey(item);
    let duplicate = false;
    const productData = enrichItemFromCheckStatus(item, checkData);
    Object.assign(productData, {
      __scanAction: 'SampleInPending',
      __scanPhase: 'secondScan',
      __lotNumber: lotNo,
      __lotId: lotId,
    });

    setSampleOutItems((prev) => {
      if (prev.some((r) => rowDedupKey(r) === key && r.__scanAction === 'SampleInPending')) {
        duplicate = true;
        return prev;
      }
      return [productData, ...prev];
    });

    if (duplicate) {
      return {
        ok: false,
        level: 'warning',
        itemCode,
        message: `Already queued for Sample In (lot ${lotNo}).`,
      };
    }
    return {
      ok: true,
      level: 'info',
      itemCode,
      rfid: productData.RFIDNumber || '—',
      message: `2nd scan — queued Sample In (lot ${lotNo}). Confirm with Sample In button.`,
      productData,
    };
  };

  const processScannedProduct = async (
    item,
    { clearSearch = true, source = 'search', silent = false, quietSuccess = true } = {}
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

      const scanAction = String(checkData?.scanAction ?? checkData?.ScanAction ?? '').trim();
      const statusMsg = String(checkData?.message ?? checkData?.Message ?? '').trim();

      if (scanAction === 'NotFound' || checkData?.success === false) {
        const r = fail('error', statusMsg || 'Product not found for this scan.');
        if (!silent) openScanReviewModal({ title: 'Not found', sections: [{ type: 'error', heading: 'Not found', rows: [r] }] });
        return r;
      }

      if (scanAction === 'Blocked') {
        const r = fail('warning', statusMsg || 'This product cannot be scanned right now.');
        if (!silent) openScanReviewModal({ title: 'Scan blocked', sections: [{ type: 'warning', heading: 'Blocked', rows: [r] }] });
        return r;
      }

      if (scanAction === 'SampleIn') {
        const r = addSampleInPendingRow(item, checkData);
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
        productData.scanSource = source;
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
        const productData = raw.__scanAction
          ? raw
          : buildProductDataFromRaw(raw, { scanSource: source, __scanAction: 'SampleOut' });
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

  const processScannedBatch = async (items, { source = 'tray', showReview = true } = {}) => {
    if (!items?.length) return;

    if (items.length >= BULK_SCAN_THRESHOLD) {
      bulkIngestRfidRows(items, { source, showReview });
      return;
    }

    setScanChecking(true);
    const outAdded = [];
    const inQueued = [];
    const blocked = [];
    const errors = [];
    try {
      for (let i = 0; i < items.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const result = await processScannedProduct(items[i], {
          clearSearch: false,
          source,
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

      if (!showReview) return;

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

      openScanReviewModal({
        title: 'Batch scan review',
        subtitle: `${total} tag(s) processed — single summary popup.`,
        sections: sections.length
          ? sections
          : [{ type: 'info', heading: 'No changes', rows: [{ itemCode: '—', message: 'Nothing was added.' }] }],
      });
    } finally {
      setScanChecking(false);
    }
  };

  const handleDirectScan = async (term) => {
    const t = String(term || '').trim();
    if (!t) return;
    setScanChecking(true);
    try {
      await processScannedProduct(
        { ItemCode: t, RFIDCode: t, RFIDNumber: t, TIDValue: t },
        { clearSearch: true, source: 'direct' }
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
        TIDValue: tid,
        RFIDNumber: rfid,
        Itemcode: itemCode,
        LabelledStockId: pd.LabelledStockId || pd.Id || entry?.Id || '',
        category_id: pd.CategoryName || pd.Category || pd.category_id || '',
        product_id: pd.ProductName || pd.Product || pd.product_id || '',
        design_id: pd.DesignName || pd.Design || pd.design_id || '',
        purity_id: pd.PurityName || pd.Purity || pd.purity_id || '',
        grosswt: pd.GrossWt || pd.GrossWeight || pd.grosswt || pd.TWt || '0.000',
        stonewt: pd.StoneWt || pd.StoneWeight || pd.stonewt || pd.StWt || '0.000',
        diamondweight: pd.DiamondWeight || pd.diamondweight || pd.DiaWt || '0.000',
        netwt: pd.NetWt || pd.NetWeight || pd.netwt || pd.NtWt || '0.000',
        FinePercent: pd.FinePercent || pd.FinePercentage || pd['Fine %'] || '0.00',
        WastagePercent: pd.WastagePercent || pd.WastagePercentage || pd['Wastage %'] || '0.00',
        Qty: pd.Qty || pd.Quantity || 1,
        Pieces: pd.Pieces || pd.Qty || 1,
        TotalWt: pd.GrossWt || pd.GrossWeight || pd.grosswt || pd.TWt || '0.000',
        fullItemData: pd,
      });
    });
    return out;
  };

  const fetchScannedRfidItemsFromDevice = async (notifyOnEmpty = false) => {
    const clientCode = resolveClientCodeForSampleApi(userInfo);
    if (!clientCode) return [];
    try {
      const { data } = await axios.post(
        toRrgoldApiUrl('/api/RFIDDevice/GetAllRFIDDetails'),
        { ClientCode: clientCode },
        { headers: getTrayAuthHeaders() }
      );
      const rows = normalizeArray(data);
      const mapped = mapDeviceRowsToSampleOutItems(rows);
      if (!mapped.length) {
        if (notifyOnEmpty) {
          addNotification({
            type: 'info',
            title: 'No scanned stock',
            message: 'No scanned stock found in RFID device details.',
          });
        }
        return [];
      }

      if (mapped.length >= BULK_SCAN_THRESHOLD) {
        bulkIngestRfidRows(mapped, { source: 'device', showReview: notifyOnEmpty });
      } else {
        await processScannedBatch(mapped, { source: 'device', showReview: notifyOnEmpty });
      }
      return mapped;
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Load failed',
        message: error?.response?.data?.message || error?.message || 'Failed to load RFID scanned stock details.',
      });
      return [];
    }
  };

  useEffect(() => {
    if (!userInfo?.ClientCode) return;
    fetchScannedRfidItemsFromDevice(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.ClientCode]);

  const clearTrayScanSession = async () => {
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
    setSampleOutItems((prev) => prev.filter((item) => item.scanSource !== 'tray'));
  };

  const handleTrayScanStart = async () => {
    await clearTrayScanSession();
    addNotification({
      type: 'info',
      title: 'Scan started',
      message: 'Previous tray scan list cleared. Place tags on the reader.',
    });
  };

  const handleTrayFetchData = async (scanned) => {
    const scanRows = normalizeScanRows(scanned);
    const epcs = scanRows.map((r) => r.epc);
    const clientCode = resolveClientCodeForSampleApi(userInfo);
    if (!clientCode || !epcs.length) return false;
    try {
      const payload = scanRows.map((row) => ({
        ClientCode: clientCode,
        DeviceId: SAMPLE_OUT_TRAY_DEVICE_ID,
        TIDValue: row.epc,
        RFIDCode: row.rfidCode || row.epc,
        StatusType: true,
      }));
      const addRes = await axios.post(
        toRrgoldApiUrl('/api/RFIDDevice/AddRFID'),
        payload,
        { headers: getTrayAuthHeaders() }
      );
      const savedRows = normalizeArray(addRes?.data);
      if (!savedRows.length) {
        addNotification({ type: 'warning', title: 'No save data', message: 'RFID scan save returned no rows.' });
      }

      const { data } = await axios.post(
        toRrgoldApiUrl('/api/ProductMaster/GetLabelledStockByTIDNumbers'),
        { ClientCode: clientCode, TIDNumbers: epcs },
        { headers: getTrayAuthHeaders() }
      );
      const rows = normalizeArray(data);
      if (!rows.length) {
        addNotification({ type: 'warning', title: 'No Stock Found', message: 'No stock matched scanned EPC tags.' });
        return false;
      }
      await processScannedBatch(rows, { source: 'tray', showReview: true });
      addNotification({
        type: 'success',
        title: 'Tray scan',
        message: `${rows.length} tag(s) loaded — see one summary popup if needed.`,
      });
      return true;
    } catch (error) {
      addNotification({ type: 'error', title: 'Save failed', message: error?.response?.data?.message || error?.response?.data?.Message || error?.message || 'Failed to save/fetch tray scan data.' });
      return false;
    }
  };

  const handleClearScannedTrayItems = () => {
    setSampleOutItems((prev) => prev.filter((item) => item.scanSource !== 'tray'));
    addNotification({
      type: 'success',
      title: 'Tray Data Cleared',
      message: 'Scanned tray items removed. You can scan fresh tags now.'
    });
  };

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
    const failures = [];
    const successes = [];
    for (let i = 0; i < rows.length; i += 1) {
      const item = rows[i];
      const tid = String(item.TIDValue || item.TIDNumber || '').trim();
      const rfid = String(item.RFIDNumber || item.RFIDCode || '').trim();
      const lotId = parseInt(item.__lotId, 10);
      try {
        // eslint-disable-next-line no-await-in-loop
        const { data: inData } = await axios.post(
          getScanSampleInUrl(),
          {
            ClientCode: clientCode,
            LotId: Number.isFinite(lotId) && lotId > 0 ? lotId : undefined,
            TIDValue: tid || undefined,
            RFIDCode: rfid || undefined,
            ReturnRemark: 'Returned via unified sample screen',
          },
          { headers: sampleAuthHeaders() }
        );
        if (inData?.success === false) {
          throw new Error(inData?.message || inData?.Message || 'Sample In failed');
        }
        successes.push({
          itemCode: rowItemCode(item) || '—',
          rfid,
          message: `Returned — lot ${inData?.lotNumber ?? inData?.LotNumber ?? item.__lotNumber ?? '—'}`,
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
            buildProductDataFromRaw(
              { ItemCode: s.itemCode, RFIDNumber: s.rfid },
              {
                __scanAction: 'SampleInDone',
                __lotNumber: s.message,
                __returnedOn: new Date().toISOString(),
                id: Date.now() + idx,
              }
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
    openScanReviewModal({
      title: failures.length ? 'Sample In — partial success' : 'Sample In complete',
      subtitle: `${successes.length} of ${rows.length} item(s) returned to stock.`,
      sections,
    });

    if (failures.length) {
      throw new Error(`${failures.length} item(s) could not be returned. See review popup.`);
    }
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
        SampleOutDate: toIsoFromDateInput(sampleOutDate),
        ExpectedReturnDate: toIsoFromDateInput(returnDate || sampleOutDate),
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

      setSuccessData({
        apiMessage: apiSuccessMsg,
        sampleOutNo: createdLotNo || '—',
        partyName: partyDisplay,
        customerName: partyDisplay,
        assignedToUserName: assignName,
        lotStatus: apiBody.lotStatus ?? apiBody.LotStatus ?? '',
        header,
        lineItems,
      });
      setSampleOutNumber(createdLotNo || sampleOutNumber);
      setShowSuccessModal(true);

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
        setSampleOutDate(todayIso);
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
    if (!q) return sampleOutItems;
    return sampleOutItems.filter((item) =>
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
        item.design_id,
        item.DesignName,
        item.Design,
      ].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [sampleOutItems, tableSearch]);
  const activePageSize = ITEMS_GRID_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filteredTableItems.length / activePageSize));
  const startIndex = (currentPage - 1) * activePageSize;
  const endIndex = startIndex + activePageSize;
  const currentItems = filteredTableItems.slice(startIndex, endIndex);
  const itemsSummary = useMemo(() => {
    const totalProducts = filteredTableItems.length;
    const totalGrossWt = filteredTableItems.reduce(
      (sum, item) => sum + (parseFloat(rowGrossWtOrZero(item)) || 0),
      0
    );
    const totalPiecesScanned = filteredTableItems.reduce((sum, item) => sum + rowPieces(item), 0);
    let latestScanDateTime = null;
    filteredTableItems.forEach((item) => {
      const dt = rowScannedDateTime(item);
      if (!dt) return;
      if (!latestScanDateTime || dt.getTime() > latestScanDateTime.getTime()) latestScanDateTime = dt;
    });
    return { totalProducts, totalGrossWt, totalPiecesScanned, latestScanDateTime };
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
  const canSubmitSampleOut =
    pendingOutRows.length > 0 && hasAssignToSelection() && !scanChecking && !loading;
  const canSubmitSampleIn = pendingInRows.length > 0 && !scanChecking && !loading;
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
              {getRrgoldApiBaseUrl()}
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
        {/* Party */}
        <div
          style={{
            flex: isSmallScreen ? '1 1 100%' : '1 1 300px',
            minWidth: isSmallScreen ? '100%' : 280,
            borderLeft: isSmallScreen ? 'none' : `2px solid ${partyAccentColor}`,
            paddingLeft: isSmallScreen ? 0 : 8,
            position: 'relative',
            zIndex: showSearchResults ? 15 : 40,
            overflow: 'visible',
          }}
        >
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
                Item code <span style={{ color: '#ef4444' }}>*</span>
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
                    placeholder="Scan RFID / item code — 1st scan Sample Out, 2nd scan Sample In…"
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
                      aria-label="Item code suggestions"
                    >
                      {searching && (
                        <div style={{ padding: '10px 12px', fontSize: '11px', color: '#64748b' }}>
                          Searching labeled stock…
                        </div>
                      )}
                      {!searching && !scanChecking && searchResults.length === 0 && (
                        <div style={{ padding: '10px 12px', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
                          No in-stock match in labeled list. Press <strong>Enter</strong> to check live sample
                          status (Sample Out vs Sample In).
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              color: '#64748b',
                              background: '#f1f5f9',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}>
                              Item code
                            </span>
                            <span style={{
                              fontWeight: 700,
                              color: '#0f172a',
                              fontSize: '13px',
                              fontVariantNumeric: 'tabular-nums',
                              letterSpacing: '-0.02em',
                            }}>
                              {rowItemCodeOrDash(item)}
                            </span>
                            {(item.RFIDNumber || item.RFID || item.RFIDCode) ? (
                              <span style={{ fontSize: '10px', color: '#64748b' }} title="RFID on tag">
                                RFID: <strong style={{ color: '#334155' }}>{item.RFIDNumber || item.RFID || item.RFIDCode}</strong>
                              </span>
                            ) : null}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: '#64748b',
                            fontWeight: 400,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap',
                          }}>
                            <span style={{
                              display: 'inline-block',
                              width: '4px',
                              height: '4px',
                              borderRadius: '50%',
                              background: '#94a3b8',
                              flexShrink: 0,
                            }}
                            />
                            <span>
                              <span style={{ fontWeight: 600, color: '#475569' }}>Product:</span>{' '}
                              {item.ProductName || item.Product || '—'}
                            </span>
                            {(item.CategoryName || item.Category) ? (
                              <>
                                <span style={{ color: '#cbd5e1' }}>·</span>
                                <span>
                                  <span style={{ fontWeight: 600, color: '#475569' }}>Category:</span>{' '}
                                  {item.CategoryName || item.Category}
                                </span>
                              </>
                            ) : null}
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
                    <button
                      type="button"
                      onClick={handleClearScannedTrayItems}
                      title="Clear scanned tray items"
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
                        cursor: 'pointer',
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
                      !pendingOutRows.length
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
                      display: pendingOutRows.length > 0 ? 'inline-flex' : 'none',
                      alignItems: 'center',
                      gap: 6,
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? <FaSpinner className="fa-spin" /> : <FaFileInvoice />}
                    <span>Sample Out ({pendingOutRows.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={openSampleInConfirmModal}
                    disabled={!canSubmitSampleIn}
                    title={
                      !pendingInRows.length
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
                    <span>
                      Sample In ({pendingInRows.length})
                      {sampleInBatchLabel ? ` · ${sampleInBatchLabel}` : ''}
                    </span>
                  </button>
                </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isSmallScreen ? '1fr' : '1fr 108px 108px',
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
                <label style={compactLbl}>Out date</label>
                <input
                  type="date"
                  value={sampleOutDate}
                  onChange={(e) => setSampleOutDate(e.target.value)}
                  style={{ ...compactInp, background: '#f8fafc' }}
                />
              </div>
              <div>
                <label style={compactLbl}>Return</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={sampleOutDate || undefined}
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
              justifyContent: 'space-between',
              gap: 12,
              borderBottom: '1px solid #f1f5f9',
              overflowX: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: isSmallScreen ? 13 : 15, fontWeight: 700, color: '#334155', flexWrap: 'nowrap', minWidth: 'max-content' }}>
                <span style={{ padding: '4px 8px', borderRadius: 8, background: '#f8fafc' }}>
                  Scanned Product:{' '}
                  <strong style={{ color: '#059669', fontWeight: 800, fontSize: isSmallScreen ? 16 : 19 }}>
                    {itemsSummary.totalProducts}
                  </strong>
                </span>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>|</span>
                <span style={{ padding: '4px 8px', borderRadius: 8, background: '#f8fafc' }}>
                  Total Gross Wt:{' '}
                  <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: isSmallScreen ? 16 : 19 }}>
                    {itemsSummary.totalGrossWt.toFixed(3)}
                  </strong>
                </span>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>|</span>
                <span style={{ padding: '4px 8px', borderRadius: 8, background: '#f8fafc' }}>
                  Scanned Pieces:{' '}
                  <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: isSmallScreen ? 16 : 19 }}>
                    {itemsSummary.totalPiecesScanned}
                  </strong>
                </span>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>|</span>
                <span style={{ padding: '4px 8px', borderRadius: 8, background: '#f8fafc' }}>
                  Scanned Date & Time:{' '}
                  <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: isSmallScreen ? 13 : 15 }}>
                    {formatScannedDateTime(itemsSummary.latestScanDateTime)}
                  </strong>
                </span>
            </div>
            <div style={{ position: 'relative', flex: '0 0 280px', width: 280, minWidth: 220 }}>
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
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 10px' }}>
            <div
              style={{
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
                    const itemCode = rowItemCode(item);
                    const rfid = rowRfidOrDash(item);
                    const design = rowDesignOrDash(item);
                    const isSampleInPending = item.__scanAction === 'SampleInPending';
                    const isSampleInDone = item.__scanAction === 'SampleInDone';
                    const isSampleIn = isSampleInPending || isSampleInDone;
                    const badgeLabel = isSampleInDone
                      ? 'RETURNED'
                      : isSampleInPending
                        ? 'SAMPLE IN'
                        : 'SAMPLE OUT';
                    const badgeBg = isSampleInDone ? '#dcfce7' : isSampleInPending ? '#fef9c3' : '#e0f2fe';
                    const badgeFg = isSampleInDone ? '#15803d' : isSampleInPending ? '#a16207' : '#0284c7';
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
                            padding: '8px 10px',
                            borderBottom: '1px solid #f1f5f9',
                            background: '#fafafa',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              color: badgeFg,
                              background: badgeBg,
                              padding: '2px 6px',
                              borderRadius: 4,
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                            }}
                          >
                            {badgeLabel}
                          </span>
                          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
                            #{serial}
                            {isSampleIn && item.__lotNumber ? ` · ${item.__lotNumber}` : ''}
                          </span>
                        </div>
                        <GridItemImage
                          src={rowImageUrl(item)}
                          itemCode={itemCode}
                          lookupKeys={sampleOutItemImageLookupKeys(item)}
                          alt={rowItemCodeOrDash(item)}
                          wrapperStyle={{ height: 230, background: '#f8fafc', borderBottom: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          imgStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{ padding: '8px 10px', borderTop: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: 11, color: '#334155', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            RFID Code: {rfid} &nbsp;&nbsp; Item Code: {rowItemCodeOrDash(item)} &nbsp;&nbsp; Design No: {design}
                          </div>
                          <div style={{ fontSize: 11, color: '#334155', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4 }}>
                            Purity: 0 &nbsp;&nbsp; Gr Wt: {rowGrossWtOrZero(item)} &nbsp;&nbsp; Nt Wt: {rowNetWtOrZero(item)} &nbsp;&nbsp; Pieces: 0
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
                    margin: '0 0 16px 0',
                    lineHeight: 1.3
                  }}
                >
                  Create this sample out?
                </h2>
                <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#64748b' }}>
                  Do you want to create this sample out? Please review the details below before confirming.
                </p>
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
                      <strong style={{ color: '#475569' }}>Sample Out NO:</strong> {sampleOutNumber}
                    </div>
                  ) : null}
                  <div>
                    <strong style={{ color: '#475569' }}>Items:</strong> {pendingOutRows.length} ·{' '}
                    <strong style={{ color: '#475569' }}>Pieces:</strong> {pendingOutSummary.pieces} ·{' '}
                    <strong style={{ color: '#475569' }}>Gross wt:</strong> {pendingOutSummary.gross.toFixed(3)}
                  </div>
                  <div>
                    <strong style={{ color: '#475569' }}>Scanned:</strong>{' '}
                    {pendingOutSummary.latest
                      ? pendingOutSummary.latest.toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </div>
                  <div>
                    <strong style={{ color: '#475569' }}>Out date:</strong> {sampleOutDate || '—'} ·{' '}
                    <strong style={{ color: '#475569' }}>Return:</strong> {returnDate || sampleOutDate || '—'}
                  </div>
                  {description ? (
                    <div>
                      <strong style={{ color: '#475569' }}>Note:</strong> {description}
                    </div>
                  ) : null}
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
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>RFID</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Gr wt</th>
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
                      + {pendingOutRows.length - 200} more items not shown
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
                    Cancel
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
                    Confirm
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
                  Confirmed
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#64748b' }}>
                  Preparing your sample out…
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
                  Submitting sample out…
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#64748b' }}>
                  Please wait — do not close this window
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {scanReviewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10080,
            padding: 16,
          }}
          onClick={() => setScanReviewModal(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              maxWidth: 560,
              width: '100%',
              maxHeight: '88vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                    {scanReviewModal.title}
                  </h2>
                  {scanReviewModal.subtitle ? (
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                      {scanReviewModal.subtitle}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setScanReviewModal(null)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
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
                return (
                  <div
                    key={`scan-sec-${si}`}
                    style={{
                      marginBottom: 12,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: theme.bg,
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 800,
                        color: theme.fg,
                        borderBottom: `1px solid ${theme.border}`,
                      }}
                    >
                      {section.heading}
                    </div>
                    <ul style={{ margin: 0, padding: '8px 12px', listStyle: 'none', fontSize: 11 }}>
                      {rows.slice(0, cap).map((row, ri) => (
                        <li
                          key={`${si}-${ri}-${row.itemCode}`}
                          style={{
                            padding: '6px 0',
                            borderBottom: ri < Math.min(rows.length, cap) - 1 ? `1px solid ${theme.border}` : 'none',
                            color: theme.fg,
                          }}
                        >
                          <strong>{row.itemCode}</strong>
                          {row.rfid && row.rfid !== '—' ? (
                            <span style={{ opacity: 0.85 }}> · RFID {row.rfid}</span>
                          ) : null}
                          <div style={{ marginTop: 2, opacity: 0.9 }}>{row.message}</div>
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
            <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setScanReviewModal(null)}
                style={{
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

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
              padding: isSmallScreen ? 22 : 28,
              maxWidth: 520,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {confirmSampleInPhase === 'summary' ? (
              <>
                <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                  Confirm Sample In (return)?
                </h2>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: '#64748b' }}>
                  These items were scanned a 2nd time. Review and confirm return to stock.
                </p>
                <div
                  style={{
                    background: '#f0fdf4',
                    borderRadius: 10,
                    padding: '14px 16px',
                    marginBottom: 12,
                    border: '1px solid #bbf7d0',
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <div>
                    <strong>Sample In:</strong> {sampleInBatchLabel || '—'}
                  </div>
                  <div>
                    <strong>Items:</strong> {pendingInRows.length} · <strong>Pieces:</strong>{' '}
                    {pendingInSummary.pieces} · <strong>Gross wt:</strong>{' '}
                    {pendingInSummary.gross.toFixed(3)}
                  </div>
                  <div>
                    <strong>Scanned:</strong>{' '}
                    {pendingInSummary.latest
                      ? pendingInSummary.latest.toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </div>
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
                      <tr style={{ background: '#fefce8', position: 'sticky', top: 0 }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>#</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Lot</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Gr wt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInRows.slice(0, 200).map((row, i) => (
                        <tr key={row.id ?? i} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '5px 8px' }}>{i + 1}</td>
                          <td style={{ padding: '5px 8px', fontWeight: 700 }}>{rowItemCode(row) || '—'}</td>
                          <td style={{ padding: '5px 8px' }}>{row.__lotNumber || '—'}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right' }}>{rowGrossWtOrZero(row)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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
                    disabled={loading}
                    style={{
                      padding: '10px 18px',
                      fontSize: 13,
                      fontWeight: 700,
                      borderRadius: 10,
                      border: '1px solid #15803d',
                      background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                      color: '#fff',
                      cursor: loading ? 'wait' : 'pointer',
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
          successData.header?.TotalItems ??
          successData.lineItems?.length ??
          null;
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
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: isSmallScreen ? '18px' : '22px',
                maxWidth: 'min(92vw, 440px)',
                width: '100%',
                maxHeight: 'min(90vh, 640px)',
                overflowY: 'auto',
                boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.22)',
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
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Items ({successData.lineItems.length})
                    </span>
                  </div>
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      maxHeight: '168px',
                      overflowY: 'auto',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '7px 10px', fontWeight: 700 }}>Code</th>
                          <th style={{ padding: '7px 10px', fontWeight: 700 }}>Stock</th>
                          <th style={{ padding: '7px 10px', fontWeight: 700 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {successData.lineItems.map((row, idx) => {
                          const itemStatus = formatSampleLotStatusLabel(row.ItemStatus ?? row.itemStatus) || '—';
                          const itemBadge = getSampleOutStatusBadgeStyle(row.ItemStatus ?? row.itemStatus);
                          return (
                            <tr key={row.Id ?? idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0f172a' }}>{row.ItemCode ?? '—'}</td>
                              <td style={{ padding: '7px 10px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                                {row.LabelledStockId ?? '—'}
                              </td>
                              <td style={{ padding: '7px 10px' }}>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    background: itemBadge.bg,
                                    border: `1px solid ${itemBadge.border}`,
                                    color: itemBadge.color,
                                  }}
                                >
                                  {itemStatus}
                                </span>
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
        title="Sample Out — Tray scan"
        subtitle="Place the tray on the reader, connect your COM ports, and start. Tags and item codes appear below; then add them to this Sample Out in one step."
        loadButtonLabel="Add scanned items to Sample Out"
        compactLayout
      />

      <style>{`
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

