import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { 
  FaSearch, 
  FaSpinner, 
  FaExclamationTriangle,
  FaPrint,
  FaList,
  FaArrowLeft,
  FaRedo,
  FaFileExcel,
  FaFilePdf,
  FaEye,
  FaTimes,
  FaDownload,
  FaCalendarAlt,
  FaBuilding,
  FaChevronRight,
  FaChevronDown,
  FaThLarge,
  FaTable,
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { partyTypeToApiEnum } from '../../services/sampleInOutApi';
import {
  getAllSampleOutListUrl,
  getLotByIdUrl,
  sampleAuthHeaders,
} from '../../services/rfidSampleApi';
import { getSoniApiBaseUrl } from '../../services/apiBaseConfig';
import { getItemImageLookupKeys, resolveLocalItemImageBlobUrls } from '../../services/localItemImageService';
import GridItemImage from '../common/GridItemImage';

const LOT_LIST_PAGE_SIZE = 15;
const LOT_GRID_PAGE_SIZE = 12;
const LINE_GRID_IMAGE_RESOLVE_LIMIT = 48;

const lotListStatusSx = (status) => {
  const s = String(status ?? '—').toLowerCase();
  if (s.includes('closed')) return { bg: '#f1f5f9', fg: '#334155', bd: '#94a3b8' };
  if (s.includes('partial')) return { bg: '#fff7ed', fg: '#9a3412', bd: '#fdba74' };
  if (s.includes('pending')) return { bg: '#fef3c7', fg: '#b45309', bd: '#fcd34d' };
  if (s.includes('open')) return { bg: '#eef2ff', fg: '#4338ca', bd: '#a5b4fc' };
  return { bg: '#fafafa', fg: '#525252', bd: '#d4d4d4' };
};

const LotStatusPill = ({ status }) => {
  const sx = lotListStatusSx(status);
  const t = String(status || '—').trim() || '—';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 7px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.03em',
        border: `1px solid ${sx.bd}`,
        background: sx.bg,
        color: sx.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {t}
    </span>
  );
};

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    return data.data || data.items || data.results || data.list || [];
  }
  return [];
};

const mapRfidSampleLine = (line) => {
  if (!line || typeof line !== 'object') return line;
  return {
    ...line,
    Id: line.id ?? line.Id,
    ItemCode: line.itemCode ?? line.ItemCode,
    Itemcode: line.itemCode ?? line.Itemcode ?? line.ItemCode,
    RFIDCode: line.rfidCode ?? line.RFIDCode,
    ItemStatus: line.itemStatus ?? line.ItemStatus,
    ProductName: line.productName ?? line.ProductName,
    CategoryName: line.categoryName ?? line.CategoryName,
    GrossWt: line.grossWt ?? line.GrossWt,
    NetWt: line.netWt ?? line.NetWt,
    Mrp: line.mrp ?? line.Mrp ?? line.MRP,
  };
};

const isRfidLotRow = (entry) =>
  entry &&
  typeof entry === 'object' &&
  (entry.LotId != null ||
    entry.lotId != null ||
    entry.LotNumber != null ||
    entry.lotNumber != null);

const countPendingLines = (lines) =>
  lines.filter((l) => {
    const s = String(l?.ItemStatus || '').toLowerCase();
    return s.includes('pending') || s.includes('out') || s === '';
  }).length;

const sumLineWeights = (lines) => {
  let gross = 0;
  let net = 0;
  (lines || []).forEach((l) => {
    gross += parseFloat(l?.GrossWt) || 0;
    net += parseFloat(l?.NetWt) || 0;
  });
  return { gross, net };
};

/** RFID Sample API row → UI row (camelCase + PascalCase). */
const mapRfidSampleLotRow = (entry) => {
  const items = Array.isArray(entry.Items)
    ? entry.Items
    : Array.isArray(entry.items)
      ? entry.items
      : [];
  const lineItems = items.map(mapRfidSampleLine);
  const lotNumber = entry.LotNumber ?? entry.lotNumber ?? entry.SampleLotNo ?? entry.SampleOutNo;
  const lotStatus = entry.LotStatus ?? entry.lotStatus ?? entry.Status;
  const sampleOutDate = entry.SampleOutDate ?? entry.sampleOutDate ?? entry.IssueDate;
  const partyType = entry.PartyType ?? entry.partyType;
  const assignee = entry.AssignedToUserName ?? entry.assignedToUserName ?? '';
  const apiTotal = Number(entry.TotalItems ?? entry.totalItems) || 0;
  const apiPending = Number(entry.PendingItems ?? entry.pendingItems) || 0;
  const totalItems = apiTotal > 0 ? apiTotal : lineItems.length;
  const pendingItems = apiPending > 0 ? apiPending : countPendingLines(lineItems);
  const partyNameRaw = entry.PartyName ?? entry.partyName;
  const partyName =
    partyNameRaw != null && String(partyNameRaw).trim() !== ''
      ? String(partyNameRaw).trim()
      : partyType === 'Employee' && assignee
        ? assignee
        : partyNameRaw;

  return {
    ...entry,
    Id: entry.LotId ?? entry.lotId ?? entry.Id,
    SampleLotNo: lotNumber,
    SampleOutNo: lotNumber,
    Status: lotStatus,
    PartyType: partyType,
    PartyId: entry.PartyId ?? entry.partyId,
    PartyName: partyName,
    AssignedToUserId: entry.AssignedToUserId ?? entry.assignedToUserId,
    AssignedToUserName: assignee,
    IssueDate: sampleOutDate,
    SampleOutDate: sampleOutDate,
    ExpectedReturnDate: entry.ExpectedReturnDate ?? entry.expectedReturnDate,
    TotalItems: totalItems,
    ReturnedItems: Number(entry.ReturnedItems ?? entry.returnedItems) || 0,
    PendingItems: pendingItems,
    IsOverdue: entry.IsOverdue ?? entry.isOverdue,
    Remarks: entry.AdminRemark ?? entry.adminRemark ?? entry.Remarks ?? '',
    LineItems: lineItems,
    LotBranchName: entry.BranchName ?? entry.branchName ?? entry.LotBranchName ?? null,
  };
};

const lotDisplayParty = (item) => {
  const name = String(item?.PartyName || '').trim();
  if (name && name !== '—') return name;
  return String(item?.AssignedToUserName || '').trim() || '—';
};

/** Extract list + total from GetAllSampleOutList response. */
const extractSampleOutListFromResponse = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { rows: [], totalRecords: 0 };
  }
  if (payload.success === false) {
    throw new Error(payload.message || payload.Message || 'Could not load sample out list');
  }
  let rows = [];
  if (Array.isArray(payload.data)) rows = payload.data;
  else if (Array.isArray(payload.Data)) rows = payload.Data;
  else if (Array.isArray(payload.data?.data)) rows = payload.data.data;
  else rows = normalizeArray(payload);
  const totalRecords =
    payload.totalRecords ??
    payload.TotalRecords ??
    payload.data?.totalRecords ??
    rows.length;
  return { rows, totalRecords };
};

/**
 * Maps RFID `GetAllSampleOutList` rows and legacy `SampleLotWithItemsDetailResponse`.
 */
const normalizeSampleOutListRows = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    if (isRfidLotRow(entry)) {
      return mapRfidSampleLotRow(entry);
    }
    if (entry && typeof entry === 'object' && entry.Header != null) {
      const H = entry.Header;
      const { Items: _hdrItems, ...headerRest } = H;
      return {
        ...headerRest,
        LotBranchName: entry.BranchName ?? null,
        LineItems: (Array.isArray(entry.Items) ? entry.Items : []).map(mapRfidSampleLine),
      };
    }
    return {
      ...entry,
      LotBranchName: entry.BranchName ?? entry.LotBranchName ?? null,
      LineItems: (Array.isArray(entry.LineItems) ? entry.LineItems : []).map(mapRfidSampleLine),
    };
  });
};

const resolveClientCode = (userInfo) => {
  const u = userInfo?.ClientCode ?? userInfo?.clientCode ?? userInfo?.clientcode;
  if (u) return String(u).trim();
  try {
    const stored = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const c = stored.ClientCode || stored.clientCode || stored.clientcode;
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
    return String(payload.ClientCode || payload.clientcode || '').trim();
  } catch {
    return '';
  }
};

const branchFromUser = (userInfo) =>
  parseInt(userInfo?.BranchId ?? userInfo?.branchId ?? 1, 10) || 1;

const SAMPLE_LIST_TIMEOUT_MS = 120000;

const SampleOutList = ({
  pageTitle = 'Sample out lots',
  exportTitle = 'Export sample out list',
  emptyStateText = 'No sample out lots found for current filters.',
}) => {
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const [sampleOutData, setSampleOutData] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [userInfo, setUserInfo] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [partyTypeFilter, setPartyTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchScope, setBranchScope] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [detailModal, setDetailModal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedLotIds, setExpandedLotIds] = useState(() => new Set());
  const [itemDetailModal, setItemDetailModal] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportErrors, setExportErrors] = useState({ excel: '', pdf: '' });
  const [lotsViewMode, setLotsViewMode] = useState('grid');
  const [lineItemsViewMode, setLineItemsViewMode] = useState('grid');
  const [lineItemLocalImageUrls, setLineItemLocalImageUrls] = useState({});
  const detailCacheRef = useRef(new Map());
  const lineItemLocalImageUrlsRef = useRef({});

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        setUserInfo(JSON.parse(storedUserInfo));
      } catch (err) {
        console.error('Error parsing user info:', err);
      }
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchSampleOutList = useCallback(async () => {
    const clientCode = resolveClientCode(userInfo);
    if (!clientCode) {
      setSampleOutData([]);
      setTotalRecords(0);
      return;
    }

    setListLoading(true);
    setListError(null);
    const headers = sampleAuthHeaders();

    const body = {
      ClientCode: clientCode,
      PageNumber: 1,
      PageSize: 500,
    };
    if (partyTypeFilter !== 'all') body.PartyType = partyTypeToApiEnum(partyTypeFilter);
    if (statusFilter !== 'All') body.LotStatus = statusFilter;
    if (fromDate) body.FromDate = `${fromDate}T00:00:00.000Z`;
    if (toDate) body.ToDate = `${toDate}T23:59:59.999Z`;

    try {
      const { data } = await axios.post(getAllSampleOutListUrl(), body, {
        headers,
        timeout: SAMPLE_LIST_TIMEOUT_MS,
      });
      const { rows: rawRows, totalRecords: total } = extractSampleOutListFromResponse(data);
      const rows = normalizeSampleOutListRows(rawRows);
      setSampleOutData(rows);
      setTotalRecords(total);
    } catch (error) {
      console.error('GetAllSampleOutList:', error);
      const isTimeout =
        error.code === 'ECONNABORTED' || /timeout/i.test(String(error.message || ''));
      const msg = isTimeout
        ? `Sample API did not respond (timeout). Check the service at ${getSoniApiBaseUrl()} is running.`
        : error.response?.data?.Message ||
          error.response?.data?.message ||
          error.message ||
          'Failed to load sample out list';
      setListError(msg);
      setSampleOutData([]);
      setTotalRecords(0);
      addNotification({ type: 'error', title: 'Sample out list', message: msg });
    } finally {
      setListLoading(false);
    }
  }, [userInfo, partyTypeFilter, statusFilter, fromDate, toDate, addNotification]);

  useEffect(() => {
    if (!resolveClientCode(userInfo)) return;
      fetchSampleOutList();
  }, [userInfo, fetchSampleOutList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [partyTypeFilter, branchScope, statusFilter, fromDate, toDate, searchQuery]);

  useEffect(() => {
    detailCacheRef.current.clear();
  }, [sampleOutData]);

  useEffect(() => {
    lineItemLocalImageUrlsRef.current = lineItemLocalImageUrls;
  }, [lineItemLocalImageUrls]);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return sampleOutData;
    const q = searchQuery.toLowerCase().trim();
    const itemMatches = (line) => {
      if (!line || typeof line !== 'object') return false;
      const blob = [
        line.ItemCode,
        line.Itemcode,
        line.ProductName,
        line.CategoryName,
        line.DesignName,
        line.PurityName,
        line.ItemStatus,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    };
    return sampleOutData.filter((item) => {
      const lot = String(item.SampleLotNo || item.SampleOutNo || '').toLowerCase();
      const party = String(item.PartyName || '').toLowerCase();
      const pt = String(item.PartyType || '').toLowerCase();
      const st = String(item.Status || '').toLowerCase();
      const rem = String(item.Remarks || '').toLowerCase();
      const assignee = String(item.AssignedToUserName || '').toLowerCase();
      const bid = String(item.BranchId ?? '');
      const bname = String(item.LotBranchName || '').toLowerCase();
      const lines = Array.isArray(item.LineItems) ? item.LineItems : [];
      const anyLine = lines.some(itemMatches);
      return (
        lot.includes(q) ||
        party.includes(q) ||
        pt.includes(q) ||
        st.includes(q) ||
        rem.includes(q) ||
        assignee.includes(q) ||
        bid.includes(q) ||
        bname.includes(q) ||
        anyLine
      );
    });
  }, [sampleOutData, searchQuery]);

  const toggleLotExpanded = (lotKey) => {
    setExpandedLotIds((prev) => {
      const next = new Set(prev);
      if (next.has(lotKey)) next.delete(lotKey);
      else next.add(lotKey);
      return next;
    });
  };

  const lotRowKey = (item, index) =>
    String(item.Id ?? item.SampleLotNo ?? item.SampleOutNo ?? index);

  const activeLotPageSize = lotsViewMode === 'grid' ? LOT_GRID_PAGE_SIZE : LOT_LIST_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filteredData.length / activeLotPageSize));
  const startIndex = (currentPage - 1) * activeLotPageSize;
  const endIndex = startIndex + activeLotPageSize;
  const currentItems = filteredData.slice(startIndex, endIndex);

  const paddedLotSlots = useMemo(() => {
    if (lotsViewMode !== 'table') return [];
    const slots = [];
    currentItems.forEach((item) => slots.push({ kind: 'row', item }));
    const pad = Math.max(0, activeLotPageSize - slots.length);
    for (let i = 0; i < pad; i += 1) {
      slots.push({ kind: 'pad', key: `sol-pad-${currentPage}-${i}` });
    }
    return slots;
  }, [activeLotPageSize, currentItems, currentPage, lotsViewMode]);

  const lineItemCode = (line) => String(line?.ItemCode || line?.Itemcode || '').trim() || '—';
  const lineCategory = (line) => String(line?.CategoryName || line?.Category || '').trim() || '—';
  const lineProduct = (line) => String(line?.ProductName || line?.Product || '').trim() || '—';
  const lineDesign = (line) => String(line?.DesignName || line?.Design || '').trim() || '—';
  const lineGrossWt = (line) => String(line?.GrossWt ?? line?.grosswt ?? '0.000');
  const lineNetWt = (line) => String(line?.NetWt ?? line?.netwt ?? '0.000');
  const lineItemKey = (line) => String(line?.ItemCode || line?.Itemcode || '').trim().toUpperCase();
  const lineImageUrl = (line) => {
    const raw = String(
      line?.ImageUrl || line?.ImageURL || line?.ImagePath || line?.PhotoUrl || line?.Photo || line?.ProductImage || ''
    ).trim();
    return /^https?:\/\//i.test(raw) ? raw : '';
  };

  const visibleLineImageKeys = useMemo(() => {
    const gridLotLines =
      lotsViewMode === 'grid'
        ? currentItems.flatMap((lot) =>
            (Array.isArray(lot?.LineItems) ? lot.LineItems : []).slice(0, 4)
          )
        : [];
    const expandedLines = currentItems.flatMap((lot, idx) => {
      const lotKey = lotRowKey(lot, idx);
      if (!expandedLotIds.has(lotKey)) return [];
      return Array.isArray(lot?.LineItems) ? lot.LineItems : [];
    });
    const modalItems = Array.isArray(detailModal?.items) ? detailModal.items : [];
    const allVisibleLines = [...gridLotLines, ...expandedLines, ...modalItems];
    return Array.from(new Set(allVisibleLines.map((line) => lineItemKey(line)).filter(Boolean))).slice(0, LINE_GRID_IMAGE_RESOLVE_LIMIT);
  }, [currentItems, detailModal?.items, expandedLotIds, lineItemsViewMode, lotsViewMode]);

  useEffect(() => {
    if (!visibleLineImageKeys.length) return;
    let disposed = false;

    const resolveMissing = async () => {
      const currentCache = lineItemLocalImageUrlsRef.current;
      const missing = visibleLineImageKeys.filter((key) => !currentCache[key]);
      if (!missing.length) return;
      const resolved = await resolveLocalItemImageBlobUrls(missing, { concurrency: 4 });
      if (disposed || !Object.keys(resolved).length) return;
      setLineItemLocalImageUrls((prev) => ({ ...prev, ...resolved }));
    };

    resolveMissing();
    return () => {
      disposed = true;
    };
  }, [lineItemsViewMode, visibleLineImageKeys]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return String(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(dateString);
    }
  };

  const openDetail = async (row) => {
    const lotNo = row.SampleLotNo || row.SampleOutNo;
    const lotId = row.Id ?? row.lotId ?? row.LotId;
    const clientCode = resolveClientCode(userInfo);
    const cacheKey = String(lotId || lotNo || '');
    if (!cacheKey || !clientCode) return;

    const cached = detailCacheRef.current.get(cacheKey);
    if (cached) {
      setDetailLoading(false);
      setDetailModal(cached);
      return;
    }

    const embedded = Array.isArray(row.LineItems) ? row.LineItems : [];
    if (embedded.length > 0) {
      const payload = { header: row, items: embedded };
      detailCacheRef.current.set(cacheKey, payload);
      setDetailLoading(false);
      setDetailModal(payload);
      return;
    }

    setDetailLoading(true);
    setDetailModal({ header: row, items: [] });
    try {
      if (lotId) {
        const { data } = await axios.get(getLotByIdUrl(clientCode, lotId), {
          headers: sampleAuthHeaders(),
        });
        if (data?.success === false) {
          throw new Error(data?.message || data?.Message || 'Could not load lot');
        }
        const lotBody =
          data?.data ?? data?.Data ?? data?.lot ?? data?.Lot ?? data?.header ?? data?.Header ?? data;
        const header = isRfidLotRow(lotBody)
          ? mapRfidSampleLotRow(lotBody)
          : mapRfidSampleLotRow({ ...row, LotId: lotId, LotNumber: lotNo });
        const items =
          header.LineItems?.length > 0
            ? header.LineItems
            : normalizeArray(data?.items ?? data?.Items ?? lotBody?.items ?? lotBody?.Items ?? []).map(
                mapRfidSampleLine
              );
        const payload = { header, items };
        detailCacheRef.current.set(cacheKey, payload);
        setDetailModal(payload);
        return;
      }
      const payload = { header: row, items: embedded };
      detailCacheRef.current.set(cacheKey, payload);
      setDetailModal(payload);
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Details',
        message: e.response?.data?.message || e.message || 'Could not load lot details',
      });
      setDetailModal(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const exportExcel = () => {
    if (!filteredData.length) {
      addNotification({ type: 'warning', title: 'Export', message: 'No rows to export.' });
      setExportErrors((e) => ({ ...e, excel: 'No rows match the current filters.' }));
      return;
    }
    setExportErrors({ excel: '', pdf: '' });
    const rows = filteredData.map((r) => ({
      SampleLotNo: r.SampleLotNo || r.SampleOutNo || '',
      PartyType: r.PartyType || '',
      PartyId: r.PartyId ?? '',
      PartyName: r.PartyName || '',
      AssignedTo: r.AssignedToUserName || '',
      Status: r.Status || '',
      IssueDate: r.IssueDate || '',
      ExpectedReturn: r.ExpectedReturnDate || '',
      ClosedDate: r.ClosedDate || '',
      BranchId: r.BranchId ?? '',
      BranchName: r.LotBranchName || '',
      CounterId: r.CounterId ?? '',
      TotalItems: r.TotalItems ?? '',
      Returned: r.ReturnedItems ?? '',
      Pending: r.PendingItems ?? '',
      Remarks: r.Remarks || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample lots');
    XLSX.writeFile(
      wb,
      `SampleOutLots_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    addNotification({ type: 'success', title: 'Export', message: 'Excel file downloaded.' });
    setShowExportModal(false);
  };

  const exportPdf = () => {
    if (!filteredData.length) {
      addNotification({ type: 'warning', title: 'Export', message: 'No rows to export.' });
      setExportErrors((e) => ({ ...e, pdf: 'No rows match the current filters.' }));
      return;
    }
    setExportErrors({ excel: '', pdf: '' });
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Sample out lots', 14, 16);
    doc.setFontSize(9);
    doc.text(`Generated ${new Date().toLocaleString()}`, 14, 22);
    const body = filteredData.map((r) => [
      r.SampleLotNo || r.SampleOutNo || '—',
      r.PartyType || '—',
      r.PartyName || '—',
      r.Status || '—',
      formatDate(r.IssueDate),
      formatDate(r.ExpectedReturnDate),
      formatDate(r.ClosedDate),
      r.LotBranchName || String(r.BranchId ?? '—'),
      String(r.TotalItems ?? '—'),
      String(r.ReturnedItems ?? '—'),
      String(r.PendingItems ?? '—'),
    ]);
    doc.autoTable({
      startY: 28,
      head: [
        [
          'Lot',
          'Type',
          'Party',
          'Status',
          'Issue',
          'Due',
          'Closed',
          'Branch',
          'Tot',
          'Ret',
          'Pend',
        ],
      ],
      body,
      styles: { fontSize: 6 },
      headStyles: { fillColor: [15, 23, 42] },
    });
    doc.save(`SampleOutLots_${new Date().toISOString().split('T')[0]}.pdf`);
    addNotification({ type: 'success', title: 'Export', message: 'PDF downloaded.' });
    setShowExportModal(false);
  };

  const buildItemDetailPairs = (item) => {
    if (!item || typeof item !== 'object') return [];
    const preferred = [
      ['ItemCode', 'Item code'],
      ['ItemStatus', 'Line status'],
      ['CategoryId', 'Category id'],
      ['CategoryName', 'Category'],
      ['ProductId', 'Product id'],
      ['ProductName', 'Product'],
      ['DesignId', 'Design id'],
      ['DesignName', 'Design'],
      ['GrossWt', 'Gross wt'],
      ['NetWt', 'Net wt'],
      ['StoneWt', 'Stone wt'],
      ['DiamondWt', 'Diamond wt'],
      ['PurityName', 'Purity'],
      ['BranchName', 'Branch'],
      ['BranchId', 'Branch id'],
      ['LabelledStockId', 'Labelled stock id'],
      ['SampleTransactionId', 'Sample transaction id'],
      ['Id', 'Line id'],
      ['Remarks', 'Remarks'],
    ];
    const seen = new Set();
    const rows = [];
    preferred.forEach(([key, label]) => {
      const v = item[key];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        rows.push({ label, value: String(v) });
        seen.add(key);
      }
    });
    Object.keys(item).forEach((key) => {
      if (seen.has(key)) return;
      const v = item[key];
      if (v === undefined || v === null || String(v).trim() === '') return;
      if (typeof v === 'object') return;
      rows.push({
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim(),
        value: String(v),
      });
    });
    return rows;
  };

  const printRow = (row) => {
    const w = window.open('', '_blank');
    if (!w) {
      addNotification({
        type: 'warning',
        title: 'Print',
        message: 'Allow pop-ups to print this row.',
      });
      return;
    }
    const lot = row.SampleLotNo || row.SampleOutNo || '—';
    w.document.write(
      `<!DOCTYPE html><html><head><title>${lot}</title><style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}
        h1{font-size:18px;margin:0 0 16px}
        table{border-collapse:collapse;width:100%;font-size:13px}
        td{padding:6px 10px;border:1px solid #e2e8f0}
        td:first-child{color:#64748b;width:40%}
      </style></head><body>
      <h1>Sample lot ${lot}</h1>
      <table>
        <tr><td>Party</td><td>${row.PartyName || '—'} (${row.PartyType || '—'})</td></tr>
        <tr><td>Status</td><td>${row.Status || '—'}</td></tr>
        <tr><td>Issue</td><td>${formatDate(row.IssueDate)}</td></tr>
        <tr><td>Expected return</td><td>${formatDate(row.ExpectedReturnDate)}</td></tr>
        <tr><td>Returned</td><td>${row.ReturnedItems ?? '—'}</td></tr>
        <tr><td>Items</td><td>${row.TotalItems ?? '—'} total · ${row.PendingItems ?? '—'} pending</td></tr>
        <tr><td>Closed</td><td>${formatDate(row.ClosedDate)}</td></tr>
        <tr><td>Remarks</td><td>${(row.Remarks || '—').replace(/</g, '&lt;')}</td></tr>
      </table>
      <script>window.onload=function(){window.print();window.close()}</script>
      </body></html>`
    );
    w.document.close();
  };

  if (!userInfo) {
    return (
      <div
        style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
          color: '#64748b',
        }}
      >
        <FaExclamationTriangle style={{ fontSize: '48px', marginBottom: '16px', color: '#f59e0b' }} />
        <p>Please login to view sample out list</p>
      </div>
    );
  }

  const isSmallScreen = windowWidth <= 768;
  const clientOk = !!resolveClientCode(userInfo);

  const tableColCount = 14;
  const labelStyle = {
    fontSize: 11,
    color: '#737373',
    fontWeight: 700,
    display: 'block',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };
  const inputBase = {
    width: '100%',
    padding: '0 8px',
    fontSize: 11,
    border: '1px solid #e5e5e5',
    borderRadius: 8,
    height: 30,
    boxSizing: 'border-box',
    color: '#404040',
    background: '#fff',
  };
  const thL = {
    padding: isSmallScreen ? '6px 6px' : '7px 8px',
    textAlign: 'left',
    fontWeight: 700,
    fontSize: isSmallScreen ? 10 : 11,
    color: '#18181b',
    borderRight: '1px solid #e4e4e7',
    borderBottom: '2px solid #d4d4d8',
    whiteSpace: 'nowrap',
  };
  const tdL = {
    padding: isSmallScreen ? '5px 6px' : '6px 8px',
    color: '#404040',
    fontSize: isSmallScreen ? 10 : 11,
    lineHeight: 1.35,
    borderRight: '1px solid #ececec',
    borderBottom: '1px solid #e5e5e5',
  };

    return (
    <div
      style={{
        fontFamily: 'var(--font-family)',
        padding: '12px',
        fontSize: '11px',
        minHeight: '100%',
        background: '#ffffff',
      }}
      className="sample-out-list-page"
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '12px',
          boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            height: '3px',
            background: 'linear-gradient(90deg, #b91c1c 0%, #dc2626 50%, #991b1b 100%)',
          }}
        />
        <div style={{ padding: '12px 14px 12px' }}>
        <div
          style={{
        display: 'flex',
        alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            paddingBottom: '12px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: '1 1 auto',
              minWidth: 0,
            }}
          >
        <button
              type="button"
              onClick={() => navigate(-1)}
          style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#475569',
            cursor: 'pointer',
                height: '34px',
                boxSizing: 'border-box',
                flexShrink: 0,
          }}
        >
              <FaArrowLeft style={{ fontSize: '12px' }} /> Back
        </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: isSmallScreen ? 34 : 38,
                  height: isSmallScreen ? 34 : 38,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
                  boxShadow: '0 2px 8px rgba(185, 28, 28, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <FaList style={{ fontSize: isSmallScreen ? 14 : 16 }} />
      </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: isSmallScreen ? '1.05rem' : '1.2rem',
                  fontWeight: 800,
                  color: '#0f172a',
              fontFamily: 'var(--font-family)',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {pageTitle}
              </h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #dbe4f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
              <button
                type="button"
                onClick={() => {
                  setLotsViewMode('grid');
                  setCurrentPage(1);
                }}
                style={{
                  border: 'none',
                  borderRight: '1px solid #dbe4f0',
                  background: lotsViewMode === 'grid' ? '#eef2ff' : '#fff',
                  color: lotsViewMode === 'grid' ? '#3730a3' : '#475569',
                  height: 30,
                  padding: '0 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                }}
              >
                <FaThLarge style={{ fontSize: 11 }} />
                Grid
              </button>
              <button
                type="button"
                onClick={() => {
                  setLotsViewMode('table');
                  setCurrentPage(1);
                }}
                style={{
                  border: 'none',
                  background: lotsViewMode === 'table' ? '#eef2ff' : '#fff',
                  color: lotsViewMode === 'table' ? '#3730a3' : '#475569',
                  height: 30,
                  padding: '0 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                }}
              >
                <FaTable style={{ fontSize: 11 }} />
                Table
              </button>
            </div>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {filteredData.length} lot{filteredData.length !== 1 ? 's' : ''}
              {totalRecords > filteredData.length ? ` · ${totalRecords} from API` : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                setExportErrors({ excel: '', pdf: '' });
                setShowExportModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                color: '#0f172a',
                cursor: 'pointer',
                boxSizing: 'border-box',
                height: '34px',
              }}
            >
              <FaDownload style={{ color: '#475569', fontSize: '12px' }} />
              Export
            </button>
          </div>
        </div>

        {!clientOk ? (
          <p style={{ color: '#b91c1c', fontSize: '11px', marginTop: '10px' }}>
            Client code missing — log in again.
          </p>
        ) : (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: '#ffffff',
              border: '1px solid #e5e5e5',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
          display: 'flex',
          flexWrap: 'wrap',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
          gap: '10px',
                rowGap: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                  gap: '8px',
                  flex: '1 1 auto',
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: '108px', maxWidth: '140px' }}>
                  <label style={labelStyle}>Party type</label>
                  <select
                    value={partyTypeFilter}
                    onChange={(e) => setPartyTypeFilter(e.target.value)}
                    style={{ ...inputBase, width: '100%' }}
                  >
                    <option value="all">All types</option>
                    <option value="customer">Customer</option>
                    <option value="vendor">Vendor</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
                <div style={{ minWidth: '108px', maxWidth: '130px' }}>
                  <label style={labelStyle}>Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ ...inputBase, width: '100%' }}
                  >
                    <option value="All">All statuses</option>
                    <option value="PendingAcceptance">Pending acceptance</option>
                    <option value="Open">Open</option>
                    <option value="PartialReturned">Partial returned</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div style={{ minWidth: '108px', maxWidth: '140px' }}>
                  <label style={labelStyle}>
                    <FaBuilding style={{ marginRight: '4px', opacity: 0.7 }} />
                    Branch
                  </label>
                  <select
                    value={branchScope}
                    onChange={(e) => setBranchScope(e.target.value)}
                    style={{ ...inputBase, width: '100%' }}
                  >
                    <option value="all">All branches</option>
                    <option value="branch">This branch only</option>
                  </select>
                </div>
                <div style={{ minWidth: '118px', maxWidth: '145px' }}>
                  <label style={labelStyle}>
                    <FaCalendarAlt style={{ marginRight: '4px', opacity: 0.7 }} />
                    Issue from
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    style={{ ...inputBase, width: '100%' }}
                  />
                </div>
                <div style={{ minWidth: '118px', maxWidth: '145px' }}>
                  <label style={labelStyle}>
                    <FaCalendarAlt style={{ marginRight: '4px', opacity: 0.7 }} />
                    Issue to
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    style={{ ...inputBase, width: '100%' }}
                  />
                </div>
                <div style={{ flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => fetchSampleOutList()}
                    disabled={!clientOk || listLoading}
                    style={{
                      display: 'inline-flex',
          alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      height: 30,
                      padding: '0 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: '1px solid #d4d4d8',
                      background: '#fafafa',
                      color: '#262626',
                      cursor: !clientOk || listLoading ? 'not-allowed' : 'pointer',
                      opacity: !clientOk || listLoading ? 0.55 : 1,
                      boxSizing: 'border-box',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <FaRedo style={{ fontSize: 11 }} /> Refresh
                  </button>
                </div>
              </div>
              <div
                style={{
                  flex: isSmallScreen ? '1 1 100%' : '0 1 280px',
                  minWidth: isSmallScreen ? '100%' : '200px',
                  maxWidth: '380px',
                  marginLeft: isSmallScreen ? 0 : 'auto',
                }}
              >
                <label style={{ ...labelStyle, textAlign: isSmallScreen ? 'left' : 'right' }}>
                  Search (this page)
                </label>
                <div style={{ position: 'relative' }}>
                  <FaSearch
                    style={{
              position: 'absolute',
                      left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
                      fontSize: '11px',
                      pointerEvents: 'none',
                    }}
                  />
            <input
              type="text"
                    placeholder="Filter loaded rows…"
              value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                      ...inputBase,
                width: '100%',
                      paddingLeft: '30px',
                    }}
            />
          </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {listError && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: '10px',
            borderRadius: '8px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '11px',
          }}
        >
          {listError}
        </div>
      )}

      <div
        className="table-print-area"
        style={{
        background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #d4d4d8',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {lotsViewMode === 'grid' ? (
          <div style={{ padding: 12, background: '#fafafa', minHeight: 420 }}>
            {currentItems.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: '#737373', fontSize: 13 }}>
                {listLoading ? `Loading ${pageTitle.toLowerCase()}...` : emptyStateText}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isSmallScreen ? 'repeat(1, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                {currentItems.map((item, idx) => {
                  const lotNo = item.SampleLotNo || item.SampleOutNo || '—';
                  const lines = Array.isArray(item.LineItems) ? item.LineItems : [];
                  const weights = sumLineWeights(lines);
                  const previewLines = lines.slice(0, 3);
                  const partyLabel = lotDisplayParty(item);
                  return (
                    <div
                      key={`lot-grid-${lotNo}-${idx}`}
                      style={{
                        border: item.IsOverdue ? '1px solid #fecaca' : '1px solid #e2e8f0',
                        borderRadius: 10,
                        background: '#fff',
                        padding: 10,
                        boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 200,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                            {lotNo}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                            {item.PartyType || '—'}
                            {item.AssignedToUserName ? ` · ${item.AssignedToUserName}` : ''}
                          </div>
                        </div>
                        <LotStatusPill status={item.Status} />
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#334155',
                          marginBottom: 6,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={partyLabel}
                      >
                        {partyLabel}
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 4,
                          fontSize: 9,
                          color: '#64748b',
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ background: '#f8fafc', borderRadius: 6, padding: '4px 6px' }}>
                          <div style={{ fontWeight: 700, color: '#475569' }}>Items</div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 11 }}>
                            {item.TotalItems ?? lines.length}
                          </div>
                        </div>
                        <div style={{ background: '#f8fafc', borderRadius: 6, padding: '4px 6px' }}>
                          <div style={{ fontWeight: 700, color: '#475569' }}>Gross</div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 11 }}>
                            {weights.gross > 0 ? weights.gross.toFixed(3) : '—'}
                          </div>
                        </div>
                        <div style={{ background: '#f8fafc', borderRadius: 6, padding: '4px 6px' }}>
                          <div style={{ fontWeight: 700, color: '#475569' }}>Net</div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 11 }}>
                            {weights.net > 0 ? weights.net.toFixed(3) : '—'}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: 9, color: '#64748b', marginBottom: 6 }}>
                        Out: {formatDate(item.IssueDate)} · Due: {formatDate(item.ExpectedReturnDate)}
                      </div>

                      {previewLines.length > 0 ? (
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            marginBottom: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          {previewLines.map((line, li) => {
                            const code = lineItemCode(line);
                            const imgKey = lineItemKey(line);
                            return (
                              <div
                                key={`${lotNo}-prev-${li}-${code}`}
                                style={{
                                  flex: '1 1 72px',
                                  maxWidth: 88,
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  background: '#fafafa',
                                }}
                              >
                                <GridItemImage
                                  lookupKeys={getItemImageLookupKeys({
                                    ItemCode: line.ItemCode,
                                    Itemcode: line.Itemcode,
                                    RFIDCode: line.RFIDCode,
                                    ProductName: line.ProductName,
                                  })}
                                  remoteUrl={lineImageUrl(line)}
                                  localBlobUrl={lineItemLocalImageUrls[imgKey]}
                                  alt={code}
                                  wrapperStyle={{
                                    height: 56,
                                    background: '#f1f5f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  imgStyle={{ objectFit: 'cover' }}
                                />
                                <div
                                  style={{
                                    padding: '4px 5px',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color: '#334155',
                                    textAlign: 'center',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={code}
                                >
                                  {code}
                                </div>
                              </div>
                            );
                          })}
                          {lines.length > 3 && (
                            <div
                              style={{
                                flex: '0 0 auto',
                                alignSelf: 'center',
                                fontSize: 9,
                                fontWeight: 700,
                                color: '#64748b',
                                padding: '0 4px',
                              }}
                            >
                              +{lines.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8 }}>No line items</div>
                      )}

                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => openDetail(item)}
                          style={{
                            border: 'none',
                            background: '#0f4c81',
                            color: '#fff',
                            borderRadius: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '6px 12px',
                            cursor: 'pointer',
                          }}
                        >
                          View details
                        </button>
                        <span style={{ fontSize: 9, color: '#64748b' }}>
                          Pending {item.PendingItems ?? 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
        <div style={{ overflowX: 'auto', width: '100%', background: '#fafafa' }}>
          <table
            style={{
            width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              fontSize: isSmallScreen ? 10 : 11,
              minWidth: 980,
              tableLayout: 'fixed',
            }}
          >
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ background: '#f4f4f5', boxShadow: '0 1px 0 #e4e4e7' }}>
                {[
                  ['#', 'left'],
                  ['Lot', 'left'],
                  ['Party', 'left'],
                  ['Type', 'left'],
                  ['Status', 'left'],
                  ['Issue', 'left'],
                  ['Due', 'left'],
                  ['Closed', 'left'],
                  ['Tot', 'right'],
                  ['Ret', 'right'],
                  ['Pend', 'right'],
                  ['Branch', 'left'],
                  ['Remarks', 'left'],
                  ['Actions', 'center'],
                ].map(([h, align]) => (
                  <th
                    key={h}
                    style={{
                      ...thL,
                      textAlign: align,
                      borderRight: h === 'Actions' ? 'none' : thL.borderRight,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listLoading && sampleOutData.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableColCount}
                    style={{ padding: 24, textAlign: 'center', color: '#737373', fontSize: 13 }}
                  >
                    <FaSpinner style={{ fontSize: 20, animation: 'spin 1s linear infinite' }} />
                    <div style={{ marginTop: 8 }}>Loading sample out lots…</div>
                  </td>
                </tr>
              ) : (
                paddedLotSlots.map((slot, slotIdx) => {
                  if (slot.kind === 'pad') {
                    return (
                      <tr key={slot.key} style={{ height: 32, background: '#fafafa' }}>
                        <td colSpan={tableColCount} style={{ padding: 0, borderBottom: '1px solid #ececec' }} aria-hidden />
                      </tr>
                    );
                  }
                  const item = slot.item;
                  const indexInPage = paddedLotSlots.slice(0, slotIdx).filter((s) => s.kind === 'row').length;
                  const rowIndex = startIndex + indexInPage + 1;
                  const lotNo = item.SampleLotNo || item.SampleOutNo || '—';
                  const lKey = lotRowKey(item, indexInPage);
                  const lines = Array.isArray(item.LineItems) ? item.LineItems : [];
                  const expanded = expandedLotIds.has(lKey);
                  const branchLabel =
                    item.LotBranchName != null && String(item.LotBranchName).trim() !== ''
                      ? item.LotBranchName
                      : item.BranchId ?? '—';
                  const stripe = rowIndex % 2 === 0;
                  
                  return (
                    <React.Fragment key={`frag-${lKey}`}>
                      <tr style={{ background: stripe ? '#fafafa' : '#ffffff' }}>
                        <td style={{ ...tdL, color: '#737373', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {lines.length > 0 ? (
                              <button
                                type="button"
                                title={expanded ? 'Hide lines' : 'Show line items'}
                                onClick={() => toggleLotExpanded(lKey)}
                      style={{
                                  border: 'none',
                                  background: 'transparent',
                                  padding: 2,
                                  cursor: 'pointer',
                                  color: '#737373',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                {expanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                              </button>
                            ) : (
                              <span style={{ width: 18, display: 'inline-block' }} />
                            )}
                            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{rowIndex}</span>
                          </div>
                        </td>
                        <td style={{ ...tdL, fontWeight: 700, color: '#171717' }}>{lotNo}</td>
                        <td style={{ ...tdL, color: '#262626' }} title={lotDisplayParty(item)}>
                          {lotDisplayParty(item)}
                          {item.AssignedToUserName && item.PartyType === 'Customer' ? (
                            <div style={{ fontSize: 9, color: '#64748b' }}>{item.AssignedToUserName}</div>
                          ) : null}
                        </td>
                        <td style={tdL}>{item.PartyType || '—'}</td>
                        <td style={tdL}>
                          <LotStatusPill status={item.Status} />
                        </td>
                        <td style={tdL}>{formatDate(item.IssueDate)}</td>
                        <td style={tdL}>{formatDate(item.ExpectedReturnDate)}</td>
                        <td style={{ ...tdL, color: '#737373' }}>{formatDate(item.ClosedDate)}</td>
                        <td style={{ ...tdL, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {item.TotalItems ?? '—'}
                        </td>
                        <td style={{ ...tdL, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {item.ReturnedItems ?? '—'}
                        </td>
                        <td style={{ ...tdL, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {item.PendingItems ?? '—'}
                        </td>
                        <td
                          style={{ ...tdL, maxWidth: 120 }}
                          title={String(branchLabel)}
                        >
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {branchLabel}
                          </div>
                        </td>
                        <td
                          style={{
                            ...tdL,
                            maxWidth: 160,
                        overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                          }}
                          title={item.Remarks || ''}
                        >
                          {item.Remarks || '—'}
                        </td>
                        <td style={{ ...tdL, textAlign: 'center', borderRight: 'none' }} className="no-print">
                          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                              type="button"
                              title="Lot summary & lines"
                              onClick={() => openDetail(item)}
                              style={actionBtnStyle}
                            >
                              <FaEye />
                            </button>
                            <button
                              type="button"
                              title="Print row"
                              onClick={() => printRow(item)}
                              style={actionBtnStyle}
                            >
                              <FaPrint />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded && lines.length > 0 ? (
                        <tr style={{ background: '#fafafa' }}>
                          <td colSpan={tableColCount} style={{ padding: '8px 12px 12px 36px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: '8px' }}>
                              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>
                                Line items ({lines.length})
                              </div>
                              <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #dbe4f0', borderRadius: 7, overflow: 'hidden', background: '#fff' }}>
                                <button
                                  type="button"
                                  onClick={() => setLineItemsViewMode('grid')}
                                  style={{
                                    border: 'none',
                                    borderRight: '1px solid #dbe4f0',
                                    background: lineItemsViewMode === 'grid' ? '#eef2ff' : '#fff',
                                    color: lineItemsViewMode === 'grid' ? '#3730a3' : '#475569',
                                    height: 26,
                                    padding: '0 8px',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Grid
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLineItemsViewMode('table')}
                                  style={{
                                    border: 'none',
                                    background: lineItemsViewMode === 'table' ? '#eef2ff' : '#fff',
                                    color: lineItemsViewMode === 'table' ? '#3730a3' : '#475569',
                                    height: 26,
                                    padding: '0 8px',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Table
                                </button>
                              </div>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                              {lineItemsViewMode === 'grid' ? (
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: isSmallScreen ? 'repeat(1, minmax(0, 1fr))' : 'repeat(6, minmax(0, 1fr))',
                                    gap: 8,
                                    background: '#fff',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    padding: 8,
                                  }}
                                >
                                  {lines.map((line, li) => {
                                    const img = lineItemLocalImageUrls[lineItemKey(line)] || lineImageUrl(line);
                                    return (
                                      <div key={line.Id ?? `${lineItemCode(line)}-${li}`} style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                                        <GridItemImage
                                          src={img}
                                          alt={lineItemCode(line)}
                                          wrapperStyle={{ height: 110, background: '#f8fafc', borderBottom: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                          imgStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        <div style={{ padding: 8 }}>
                                          <div style={{ fontSize: 10, fontWeight: 800, color: '#0f172a', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lineItemCode(line)}</div>
                                          <div style={{ fontSize: 9, color: '#475569', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lineCategory(line)}</div>
                                          <div style={{ fontSize: 9, color: '#475569', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lineProduct(line)}</div>
                                          <div style={{ fontSize: 9, color: '#475569', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lineDesign(line)}</div>
                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', padding: '4px 5px' }}>
                                              <div style={{ fontSize: 8, color: '#64748b', fontWeight: 700 }}>GR WT</div>
                                              <div style={{ fontSize: 9, color: '#0f172a', fontWeight: 700 }}>{lineGrossWt(line)}</div>
                                            </div>
                                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', padding: '4px 5px' }}>
                                              <div style={{ fontSize: 8, color: '#64748b', fontWeight: 700 }}>NT WT</div>
                                              <div style={{ fontSize: 9, color: '#0f172a', fontWeight: 700 }}>{lineNetWt(line)}</div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                              <table
                                style={{
                                  width: '100%',
                                  borderCollapse: 'collapse',
                                  fontSize: '9px',
                                  background: '#fff',
                                  borderRadius: '8px',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                <thead>
                                  <tr style={{ background: '#f1f5f9' }}>
                                    {['Item code', 'Product', 'Design', 'Category', 'Gross', 'Net', 'Stone', 'Diamond', 'Purity', 'Branch', 'Status', 'Stock #'].map(
                                      (h) => (
                                        <th
                                          key={h}
                          style={{
                                            padding: '6px 8px',
                                            textAlign: 'left',
                                            fontWeight: 700,
                            color: '#475569',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {h}
                                        </th>
                                      )
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {lines.map((line, li) => (
                                    <tr key={line.Id ?? `${line.ItemCode}-${li}`} style={{ borderTop: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '6px 8px' }}>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setItemDetailModal({
                                              item: line,
                                              lotNo,
                                            })
                                          }
                                          style={{
                                            border: 'none',
                                            background: 'none',
                                            padding: 0,
                                            color: '#b91c1c',
                                            fontWeight: 700,
                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                          }}
                                        >
                                          {line.ItemCode || line.Itemcode || '—'}
                        </button>
                      </td>
                                      <td style={{ padding: '6px 8px' }}>{line.ProductName || '—'}</td>
                                      <td style={{ padding: '6px 8px' }}>{line.DesignName || '—'}</td>
                                      <td style={{ padding: '6px 8px' }}>{line.CategoryName || '—'}</td>
                                      <td style={{ padding: '6px 8px' }}>{line.GrossWt ?? '—'}</td>
                                      <td style={{ padding: '6px 8px' }}>{line.NetWt ?? '—'}</td>
                                      <td style={{ padding: '6px 8px' }}>{line.StoneWt ?? '—'}</td>
                                      <td style={{ padding: '6px 8px' }}>{line.DiamondWt ?? '—'}</td>
                                      <td style={{ padding: '6px 8px' }}>{line.PurityName || '—'}</td>
                                      <td style={{ padding: '6px 8px', maxWidth: '100px' }} title={line.BranchName || ''}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                          {line.BranchName || line.BranchId || '—'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '6px 8px' }}>{line.ItemStatus || '—'}</td>
                                      <td style={{ padding: '6px 8px' }}>{line.LabelledStockId ?? '—'}</td>
                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })
              )
            }
            </tbody>
          </table>
        </div>
        )}

        <div
          style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
            padding: '12px 16px',
            borderTop: '1px solid #f5f5f5',
          flexWrap: 'wrap',
            gap: 10,
            background: '#fafafa',
          }}
          className="no-print"
        >
          <div style={{ fontSize: 11, color: '#525252', fontWeight: 600 }}>
            {filteredData.length} record{filteredData.length === 1 ? '' : 's'} · {activeLotPageSize} {lotsViewMode === 'grid' ? 'cards' : 'rows'}/page
            {filteredData.length > 0
              ? ` · ${startIndex + 1}–${Math.min(endIndex, filteredData.length)} shown`
              : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={pageBtnStyle(currentPage === 1)}
            >
              Prev
            </button>
            <span style={{ fontSize: 11, color: '#404040', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={pageBtnStyle(currentPage === totalPages)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showExportModal && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10040,
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            role="dialog"
            aria-labelledby="sample-out-export-title"
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '18px',
              width: '420px',
              maxWidth: '94vw',
              boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <h2 id="sample-out-export-title" style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                {exportTitle}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowExportModal(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '22px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '0 4px',
                }}
              >
                &times;
              </button>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: '11px', color: '#64748b' }}>
              Choose format — uses current table filters ({filteredData.length} row{filteredData.length !== 1 ? 's' : ''})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="export-option-btn"
                onClick={() => exportExcel()}
                disabled={!filteredData.length}
                style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1fae5',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                  color: '#065f46',
                  cursor: filteredData.length ? 'pointer' : 'not-allowed',
                  opacity: filteredData.length ? 1 : 0.45,
                  textAlign: 'left',
                }}
              >
                <FaFileExcel style={{ fontSize: '22px', flexShrink: 0 }} />
            <span>
                  <span style={{ display: 'block', fontSize: '13px', fontWeight: 700 }}>Export as Excel</span>
                  <span style={{ fontSize: '10px', fontWeight: 500, opacity: 0.9 }}>
                    Download as .xlsx spreadsheet
            </span>
                </span>
              </button>
              {exportErrors.excel ? (
                <div style={{ fontSize: '10px', color: '#b91c1c', marginTop: '-4px' }}>{exportErrors.excel}</div>
              ) : null}
              <button
                type="button"
                onClick={() => exportPdf()}
                disabled={!filteredData.length}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)',
                  color: '#b91c1c',
                  cursor: filteredData.length ? 'pointer' : 'not-allowed',
                  opacity: filteredData.length ? 1 : 0.45,
                  textAlign: 'left',
                }}
              >
                <FaFilePdf style={{ fontSize: '22px', flexShrink: 0 }} />
                <span>
                  <span style={{ display: 'block', fontSize: '13px', fontWeight: 700 }}>Export as PDF</span>
                  <span style={{ fontSize: '10px', fontWeight: 500, opacity: 0.9 }}>
                    Download as formatted PDF
                  </span>
                </span>
              </button>
              {exportErrors.pdf ? (
                <div style={{ fontSize: '10px', color: '#b91c1c', marginTop: '-4px' }}>{exportErrors.pdf}</div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {detailModal && (
        <div
                style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            zIndex: 10050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => !detailLoading && setDetailModal(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'auto',
              padding: '20px',
              position: 'relative',
              boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDetailModal(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                border: 'none',
                background: 'transparent',
                  cursor: 'pointer',
                padding: '8px',
              }}
            >
              <FaTimes size={18} color="#64748b" />
            </button>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: '#0f172a' }}>
              Lot {detailModal.header?.SampleLotNo || detailModal.header?.SampleOutNo || '—'}
            </h3>
            {detailLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Loading…
              </div>
            ) : (
              <>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '16px' }}>
                  <div>
                    <strong>Party:</strong> {detailModal.header?.PartyName || '—'} ({detailModal.header?.PartyType || '—'})
                  </div>
                  <div>
                    <strong>Status:</strong> {detailModal.header?.Status || '—'}
                  </div>
                  <div>
                    <strong>Items:</strong> {detailModal.header?.TotalItems ?? '—'} · Pending{' '}
                    {detailModal.header?.PendingItems ?? '—'}
                  </div>
                  {detailModal.header?.Remarks ? (
                    <div style={{ marginTop: '8px' }}>
                      <strong>Remarks:</strong> {detailModal.header.Remarks}
                    </div>
                  ) : null}
                </div>
                {detailModal.items?.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #dbe4f0', borderRadius: 7, overflow: 'hidden', background: '#fff' }}>
                        <button
                          type="button"
                          onClick={() => setLineItemsViewMode('grid')}
                          style={{
                            border: 'none',
                            borderRight: '1px solid #dbe4f0',
                            background: lineItemsViewMode === 'grid' ? '#eef2ff' : '#fff',
                            color: lineItemsViewMode === 'grid' ? '#3730a3' : '#475569',
                            height: 28,
                            padding: '0 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Grid
                        </button>
                        <button
                          type="button"
                          onClick={() => setLineItemsViewMode('table')}
                          style={{
                            border: 'none',
                            background: lineItemsViewMode === 'table' ? '#eef2ff' : '#fff',
                            color: lineItemsViewMode === 'table' ? '#3730a3' : '#475569',
                            height: 28,
                            padding: '0 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Table
                        </button>
                      </div>
                    </div>
                    {lineItemsViewMode === 'grid' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: isSmallScreen ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                        {detailModal.items.map((line, idx) => {
                          const img = lineItemLocalImageUrls[lineItemKey(line)] || lineImageUrl(line);
                          return (
                            <div key={line.Id ?? `${lineItemCode(line)}-${idx}`} style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                              <GridItemImage
                                src={img}
                                alt={lineItemCode(line)}
                                wrapperStyle={{ height: 118, background: '#f8fafc', borderBottom: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                imgStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div style={{ padding: 8 }}>
                                <div style={{ fontSize: 10, color: '#0f172a', fontWeight: 800, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lineItemCode(line)}</div>
                                <div style={{ fontSize: 9, color: '#475569', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lineCategory(line)}</div>
                                <div style={{ fontSize: 9, color: '#475569', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lineProduct(line)}</div>
                                <div style={{ fontSize: 9, color: '#475569', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lineDesign(line)}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', padding: '4px 5px' }}>
                                    <div style={{ fontSize: 8, color: '#64748b', fontWeight: 700 }}>GR WT</div>
                                    <div style={{ fontSize: 9, color: '#0f172a', fontWeight: 700 }}>{lineGrossWt(line)}</div>
                                  </div>
                                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', padding: '4px 5px' }}>
                                    <div style={{ fontSize: 8, color: '#64748b', fontWeight: 700 }}>NT WT</div>
                                    <div style={{ fontSize: 9, color: '#0f172a', fontWeight: 700 }}>{lineNetWt(line)}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Item code</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Stock id</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Line status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.items.map((line, idx) => (
                        <tr key={line.Id ?? `${line.ItemCode}-${idx}`} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px' }}>
                            <button
                              type="button"
                              onClick={() =>
                                setItemDetailModal({
                                  item: line,
                                  lotNo:
                                    detailModal.header?.SampleLotNo ||
                                    detailModal.header?.SampleOutNo ||
                                    '—',
                                })
                              }
                              style={{
                                border: 'none',
                                background: 'none',
                                padding: 0,
                                color: '#b91c1c',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                            >
                              {line.ItemCode || line.Itemcode || '—'}
                            </button>
                          </td>
                          <td style={{ padding: '8px' }}>{line.LabelledStockId ?? '—'}</td>
                          <td style={{ padding: '8px' }}>{line.ItemStatus || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: '13px', color: '#94a3b8' }}>No line items in response.</p>
                )}
                <button
                  type="button"
                  onClick={() => printRow(detailModal.header)}
                  style={{
                    marginTop: '16px',
                    padding: '10px 16px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  <FaPrint style={{ marginRight: '8px' }} />
                  Print summary
                </button>
              </>
            )}
            </div>
          </div>
      )}

      {itemDetailModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.5)',
            zIndex: 10060,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setItemDetailModal(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '88vh',
              overflow: 'auto',
              padding: '20px',
              position: 'relative',
              boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setItemDetailModal(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '8px',
              }}
            >
              <FaTimes size={18} color="#64748b" />
            </button>
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', color: '#0f172a', paddingRight: '32px' }}>
              Item {itemDetailModal.item?.ItemCode || itemDetailModal.item?.Itemcode || '—'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '11px', color: '#64748b' }}>
              Lot <strong>{itemDetailModal.lotNo}</strong>
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(120px, 38%) 1fr',
                gap: '8px 14px',
                fontSize: '12px',
              }}
            >
              {buildItemDetailPairs(itemDetailModal.item).map((row, ri) => (
                <React.Fragment key={`f-${ri}-${row.label}`}>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>{row.label}</div>
                  <div style={{ color: '#0f172a', wordBreak: 'break-word' }}>{row.value}</div>
                </React.Fragment>
              ))}
          </div>
        </div>
      </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media print {
          .no-print { display: none !important; }
          .sample-out-list-page { padding: 8px !important; }
        }
      `}</style>
    </div>
  );
};

const actionBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 7px',
  border: '1px solid #e2e8f0',
  borderRadius: '5px',
  background: '#ffffff',
  color: '#475569',
  cursor: 'pointer',
  fontSize: '11px',
};

const pageBtnStyle = (disabled) => ({
  padding: '5px 11px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 8,
  border: '1px solid #e5e5e5',
  background: '#ffffff',
  color: disabled ? '#a3a3a3' : '#525252',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});

export default SampleOutList;
