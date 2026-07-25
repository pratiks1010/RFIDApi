import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaBox,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaSearch,
  FaSpinner,
  FaSync,
  FaTimesCircle,
  FaWarehouse,
} from 'react-icons/fa';
import TrayScanModal from '../common/TrayScanModal';
import { getAllLabeledStock, getDetailsByRfidCodes } from '../../services/boxRfidApi';
import {
  addStockVerificationBySession,
  buildStockVerificationSessionItems,
} from '../../utils/stockVerificationSessionUtils';
import { useNotifications } from '../../context/NotificationContext';
import { useLoading } from '../../App';
import { formatWeight3 } from '../../utils/weightFormat';

const SV = {
  stripe: 'linear-gradient(90deg, #0f7669 0%, #14b8a6 45%, #0d9488 100%)',
  accent: '#0d9488',
  accentDark: '#0f7669',
  accentMuted: '#ccfbf1',
  sky: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 55%, #0369a1 100%)',
};

const INVENTORY_PAGE_SIZE = 20;

const pick = (obj, ...keys) => {
  for (const key of keys) {
    const v = obj?.[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
};

/** Only resolved RFID codes (SJ…) — never raw EPC hex. */
const collectTrayRfidCodes = (scannedTags = []) => {
  const codes = new Set();
  (Array.isArray(scannedTags) ? scannedTags : []).forEach((item) => {
    if (typeof item === 'string') return;
    const rfid = String(item?.rfidCode || item?.RFIDCode || item?.RfidCode || '').trim();
    if (rfid && rfid !== '-') codes.add(rfid);
  });
  return Array.from(codes);
};

const normalizeLabeledStockResponse = (data) => {
  let rows = [];
  let totalCount = 0;
  if (!data) return { rows, totalCount };
  if (Array.isArray(data)) {
    rows = data;
    totalCount = Number(data[0]?.TotalCount ?? data[0]?.TotalRecords ?? data.length) || data.length;
  } else if (Array.isArray(data.data)) {
    rows = data.data;
    totalCount = Number(data.totalRecords ?? data.totalCount ?? data.TotalRecords ?? data.TotalCount ?? rows.length) || rows.length;
  } else if (Array.isArray(data.Data)) {
    rows = data.Data;
    totalCount = Number(data.TotalRecords ?? data.totalRecords ?? data.TotalCount ?? rows.length) || rows.length;
  } else if (Array.isArray(data.Items)) {
    rows = data.Items;
    totalCount = Number(data.TotalRecords ?? data.totalRecords ?? rows.length) || rows.length;
  } else if (Array.isArray(data.items)) {
    rows = data.items;
    totalCount = Number(data.totalRecords ?? data.totalCount ?? rows.length) || rows.length;
  }
  if (!totalCount && rows.length) {
    totalCount = Number(rows[0]?.TotalCount ?? rows[0]?.TotalRecords ?? rows.length) || rows.length;
  }
  return { rows, totalCount };
};

const mapInventoryRow = (item, index) => ({
  Id: pick(item, 'labelledStockId', 'LabelledStockId', 'Id', 'id') || `inv-${index}`,
  ItemCode: pick(item, 'itemCode', 'ItemCode', 'Itemcode'),
  RFIDCode: pick(item, 'rfidCode', 'RFIDCode', 'RfidCode', 'RFIDNumber'),
  CategoryName: pick(item, 'categoryName', 'CategoryName', 'Category'),
  ProductName: pick(item, 'productName', 'ProductName', 'Product'),
  DesignName: pick(item, 'designName', 'DesignName', 'Design'),
  PurityName: pick(item, 'purityName', 'PurityName', 'Purity'),
  GrossWt: pick(item, 'grossWt', 'GrossWt', 'grosswt'),
  NetWt: pick(item, 'netWt', 'NetWt', 'netwt'),
  ImageUrl: pick(item, 'imageUrl', 'ImageUrl', 'ImagePath', 'PhotoUrl'),
});

/** Stable keys so tray-matched rows stay hidden on left after page refresh. */
const rowMoveKeys = (row) => {
  const keys = [];
  const item = String(row?.ItemCode || '').trim().toUpperCase();
  const rfid = String(row?.RFIDCode || '').trim().toUpperCase();
  if (item) keys.push(`item:${item}`);
  if (rfid) keys.push(`rfid:${rfid}`);
  return keys;
};

const rowIsMoved = (row, movedKeys) => {
  if (!movedKeys || movedKeys.size === 0) return false;
  return rowMoveKeys(row).some((k) => movedKeys.has(k));
};

const inventoryRowToMatched = (row) => ({
  ...row,
  matchStatus: 'Matched',
  ImageUrl: row.ImageUrl || '',
});

const normalizeDetailsByRfidCodesResponse = (data) => {
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      message: '',
      products: [],
      notFoundRfidCodes: [],
      totalScanned: 0,
      totalFound: 0,
      totalNotFound: 0,
    };
  }
  const products = Array.isArray(data.products)
    ? data.products
    : Array.isArray(data.Products)
      ? data.Products
      : [];
  const notFoundRfidCodes = Array.isArray(data.notFoundRfidCodes)
    ? data.notFoundRfidCodes
    : Array.isArray(data.NotFoundRfidCodes)
      ? data.NotFoundRfidCodes
      : [];
  return {
    success: data.success ?? data.Success ?? products.length > 0,
    message: String(data.message ?? data.Message ?? '').trim(),
    products,
    notFoundRfidCodes,
    totalScanned: data.totalScanned ?? data.TotalScanned ?? 0,
    totalFound: data.totalFound ?? data.TotalFound ?? products.length,
    totalNotFound: data.totalNotFound ?? data.TotalNotFound ?? notFoundRfidCodes.length,
  };
};

const mapProducts = (products) =>
  products.map((item, index) => {
    const itemCode = pick(item, 'itemCode', 'ItemCode');
    const rowId =
      pick(item, 'labelledStockId', 'LabelledStockId', 'Id', 'id') || itemCode || `tray-${index}`;
    return {
      ...item,
      Id: rowId,
      ItemCode: itemCode,
      RFIDCode: pick(item, 'rfidCode', 'RfidCode', 'RFIDCode'),
      ProductName: pick(item, 'productName', 'ProductName'),
      CategoryName: pick(item, 'categoryName', 'CategoryName'),
      DesignName: pick(item, 'designName', 'DesignName'),
      PurityName: pick(item, 'purityName', 'PurityName'),
      BranchName: pick(item, 'branchName', 'BranchName'),
      CounterName: pick(item, 'counterName', 'CounterName', 'Counter'),
      GrossWt: pick(item, 'grossWt', 'GrossWt'),
      NetWt: pick(item, 'netWt', 'NetWt'),
      Qty: pick(item, 'qty', 'Qty', 'quantity', 'Quantity') || '1',
      ImageUrl: pick(item, 'imageUrl', 'ImageUrl', 'ImagePath', 'PhotoUrl'),
      matchStatus: 'Matched',
    };
  });

/** Stock Verification style: label + colored value pill */
const StatText = ({ label, value, tone = 'teal' }) => {
  const tones = {
    teal: { border: SV.accent, background: SV.accentMuted, color: SV.accentDark },
    ok: { border: '#10b981', background: '#f0fdf4', color: '#059669' },
    warn: { border: '#ef4444', background: '#fef2f2', color: '#dc2626' },
  };
  const t = tones[tone] || tones.teal;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>{label}</span>
      <span
        style={{
          padding: '3px 10px',
          fontSize: 12,
          fontWeight: 800,
          borderRadius: 8,
          border: `1px solid ${t.border}`,
          background: t.background,
          color: t.color,
          fontVariantNumeric: 'tabular-nums',
          display: 'inline-block',
          minWidth: 28,
          textAlign: 'center',
        }}
      >
        {value}
      </span>
    </span>
  );
};

const thStyle = {
  padding: '9px 10px',
  fontSize: 9,
  fontWeight: 800,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '1px solid #e2e8f0',
  whiteSpace: 'nowrap',
  background: '#f8fafc',
  position: 'sticky',
  top: 0,
  zIndex: 1,
};

const tdStyle = {
  padding: '9px 10px',
  borderBottom: '1px solid #f1f5f9',
  color: '#334155',
  verticalAlign: 'middle',
};

const StockVerificationWithRFIDTray = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { setLoading } = useLoading();
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const isSmallScreen = windowWidth <= 900;

  const [showTrayModal, setShowTrayModal] = useState(false);
  const [trayFetchLoading, setTrayFetchLoading] = useState(false);
  const [matchedItems, setMatchedItems] = useState([]);
  const [unmatchedCodes, setUnmatchedCodes] = useState([]);
  const [lastScanCount, setLastScanCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  /** ItemCode / RFID keys moved left → right via tray scan */
  const [movedKeys, setMovedKeys] = useState(() => new Set());
  /** AddStockVerificationBySession — null = new batch, then append */
  const [scanBatchId, setScanBatchId] = useState(null);
  const [savingSession, setSavingSession] = useState(false);
  /** rfidUpper → { epc, tid } from last tray scan (for UnMatch tidNumber) */
  const [scanTagByRfid, setScanTagByRfid] = useState({});

  const [inventoryRows, setInventoryRows] = useState([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventorySearchDraft, setInventorySearchDraft] = useState('');
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState('');

  const sessionContext = useMemo(() => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const clientCode = String(
        localStorage.getItem('ClientCode') || userInfo?.ClientCode || userInfo?.clientCode || ''
      ).trim();
      const branchId = Number(
        userInfo?.BranchId ?? userInfo?.branchId ?? localStorage.getItem('BranchId') ?? 0
      ) || undefined;
      const counterId = Number(
        userInfo?.CounterId ?? userInfo?.counterId ?? localStorage.getItem('CounterId') ?? 0
      ) || undefined;
      return { clientCode, branchId, counterId, userInfo };
    } catch {
      return { clientCode: '', branchId: undefined, counterId: undefined, userInfo: {} };
    }
  }, []);
  const { clientCode, branchId, counterId } = sessionContext;

  const buildScanTagMap = (scannedTags = []) => {
    const map = {};
    (Array.isArray(scannedTags) ? scannedTags : []).forEach((tag) => {
      if (!tag || typeof tag === 'string') return;
      const rfid = String(tag.rfidCode || tag.RFIDCode || '').trim().toUpperCase();
      if (!rfid || rfid === '-') return;
      map[rfid] = {
        epc: String(tag.epc || tag.EPC || '').trim().toUpperCase(),
        tid: String(tag.tid || tag.TID || '').trim().toUpperCase(),
        rfidCode: String(tag.rfidCode || tag.RFIDCode || '').trim(),
      };
    });
    return map;
  };

  const saveVerificationSession = useCallback(
    async ({
      matchedRows = [],
      unmatched = [],
      tagMap = scanTagByRfid,
      silent = false,
    } = {}) => {
      if (!clientCode) {
        if (!silent) {
          addNotification({
            type: 'error',
            title: 'Client code missing',
            message: 'Login session is missing client code. Please login again.',
          });
        }
        return { success: false };
      }
      const items = buildStockVerificationSessionItems({
        matchedItems: matchedRows,
        unmatchedCodes: unmatched,
        scanTagByRfid: tagMap,
        branchId,
        counterId,
      });
      if (!items.length) {
        if (!silent) {
          addNotification({
            type: 'warning',
            title: 'Nothing to save',
            message: 'No Match / UnMatch items to send to AddStockVerificationBySession.',
          });
        }
        return { success: false };
      }

      setSavingSession(true);
      try {
        const result = await addStockVerificationBySession({
          clientCode,
          ClientCode: clientCode,
          scanBatchId: scanBatchId || null,
          ScanBatchId: scanBatchId || null,
          branchId: branchId || undefined,
          BranchId: branchId || undefined,
          counterId: counterId || undefined,
          CounterId: counterId || undefined,
          items,
        });
        if (result.scanBatchId) setScanBatchId(result.scanBatchId);
        const matchCount = Array.isArray(result.match) ? result.match.length : 0;
        const unmatchCount = Array.isArray(result.unmatch) ? result.unmatch.length : 0;
        if (!silent) {
          addNotification({
            type: 'success',
            title: result.message || (scanBatchId ? 'Session appended' : 'Session started'),
            message: `Saved ${items.length} item(s) · Match ${matchCount} · UnMatch ${unmatchCount}${
              result.scanBatchId ? ` · Batch ${String(result.scanBatchId).slice(0, 8)}…` : ''
            }`,
          });
        }
        return { success: true, result };
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'Failed to save stock verification session.';
        if (!silent) {
          addNotification({ type: 'error', title: 'Save verification failed', message });
        }
        return { success: false, message };
      } finally {
        setSavingSession(false);
      }
    },
    [addNotification, branchId, clientCode, counterId, scanBatchId, scanTagByRfid]
  );

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const inventoryTotalPages = Math.max(1, Math.ceil(inventoryTotal / INVENTORY_PAGE_SIZE) || 1);

  const fetchInventory = useCallback(
    async (page = 1, search = '') => {
      if (!clientCode) {
        setInventoryError('Client code missing. Please login again.');
        setInventoryRows([]);
        setInventoryTotal(0);
        return;
      }
      setInventoryLoading(true);
      setInventoryError('');
      try {
        const payload = {
          ClientCode: clientCode,
          CategoryId: 0,
          ProductId: 0,
          DesignId: 0,
          PurityId: 0,
          FromDate: null,
          ToDate: null,
          RFIDCode: '',
          PageNumber: page,
          PageSize: INVENTORY_PAGE_SIZE,
          BranchId: 0,
          Status: 'ApiActive',
          SearchQuery: search && search.trim() !== '' ? search.trim() : '',
          ListType: 'ascending',
          SortColumn: null,
        };
        const data = await getAllLabeledStock(payload);
        const { rows, totalCount } = normalizeLabeledStockResponse(data);
        const mapped = rows.map(mapInventoryRow);
        // Keep already tray-verified items off the left list after refresh/page change.
        setInventoryRows(mapped.filter((row) => !rowIsMoved(row, movedKeys)));
        setInventoryTotal(totalCount);
        setInventoryPage(page);
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'Failed to load labelled stock.';
        setInventoryError(message);
        setInventoryRows([]);
        setInventoryTotal(0);
      } finally {
        setInventoryLoading(false);
      }
    },
    [clientCode, movedKeys]
  );

  useEffect(() => {
    fetchInventory(1, '');
    // Initial load only — page/search call fetchInventory explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientCode]);

  const visibleInventory = useMemo(
    () => inventoryRows.filter((row) => !rowIsMoved(row, movedKeys)),
    [inventoryRows, movedKeys]
  );

  const displayInventoryTotal = Math.max(0, Number(inventoryTotal || 0) - matchedItems.length);

  const filteredMatched = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchedItems;
    return matchedItems.filter((row) => {
      const blob = [
        row.ItemCode,
        row.RFIDCode,
        row.ProductName,
        row.DesignName,
        row.CategoryName,
        row.PurityName,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [matchedItems, searchQuery]);

  const handleTrayFetchData = async (scannedTags = []) => {
    const rfidCodes = collectTrayRfidCodes(scannedTags);
    if (!rfidCodes.length) {
      addNotification({
        type: 'warning',
        title: 'RFID codes not ready',
        message: 'Wait until RFID codes resolve in the scan list (SJ…), then verify stock. Do not use EPC hex.',
      });
      return { success: false, message: 'RFID codes not resolved yet.' };
    }
    if (!clientCode) {
      addNotification({
        type: 'error',
        title: 'Client code missing',
        message: 'Login session is missing client code. Please login again.',
      });
      return { success: false, message: 'Client code missing.' };
    }

    const tagMap = { ...scanTagByRfid, ...buildScanTagMap(scannedTags) };
    setScanTagByRfid(tagMap);

    setTrayFetchLoading(true);
    setLoading(true);
    try {
      const responseData = await getDetailsByRfidCodes({
        ClientCode: clientCode,
        RfidCodes: rfidCodes,
      });
      const result = normalizeDetailsByRfidCodesResponse(responseData);
      const fromApi = mapProducts(result.products);

      // Prefer left-side inventory rows when RFID matches (same shape as All Inventory).
      const scannedUpper = new Set(rfidCodes.map((c) => String(c).trim().toUpperCase()).filter(Boolean));
      const fromLeft = inventoryRows
        .filter((row) => {
          const rfid = String(row.RFIDCode || '').trim().toUpperCase();
          const item = String(row.ItemCode || '').trim().toUpperCase();
          return (rfid && scannedUpper.has(rfid)) || (item && scannedUpper.has(item));
        })
        .map(inventoryRowToMatched);

      // Merge: left inventory row wins over API for same key (richer local columns).
      const mergedByKey = new Map();
      const addRow = (row) => {
        const keys = rowMoveKeys(row);
        const primary =
          keys.find((k) => k.startsWith('item:')) ||
          keys.find((k) => k.startsWith('rfid:')) ||
          `id:${row.Id}`;
        if (!mergedByKey.has(primary)) mergedByKey.set(primary, row);
        else {
          const prev = mergedByKey.get(primary);
          mergedByKey.set(primary, { ...prev, ...row, ItemCode: row.ItemCode || prev.ItemCode });
        }
      };
      fromApi.forEach(addRow);
      fromLeft.forEach(addRow); // left overwrites / fills design, purity, etc.
      const movedNow = Array.from(mergedByKey.values());

      const matchedRfidSet = new Set();
      movedNow.forEach((row) => {
        const r = String(row.RFIDCode || '').trim().toUpperCase();
        const i = String(row.ItemCode || '').trim().toUpperCase();
        if (r) matchedRfidSet.add(r);
        if (i) matchedRfidSet.add(i);
      });
      const stillUnmatched = [
        ...new Set(
          [
            ...(result.notFoundRfidCodes || []),
            ...rfidCodes.filter((c) => !matchedRfidSet.has(String(c).trim().toUpperCase())),
          ]
            .map((c) => String(c || '').trim())
            .filter(Boolean)
        ),
      ];

      if (!movedNow.length && !stillUnmatched.length) {
        setLastScanCount(result.totalScanned || rfidCodes.length);
        addNotification({
          type: 'warning',
          title: 'No matches',
          message: 'Scanned tags did not match any labelled stock items.',
        });
        return { success: false, message: 'No matches.' };
      }

      if (movedNow.length) {
        const nextMovedKeys = new Set(movedKeys);
        movedNow.forEach((row) => rowMoveKeys(row).forEach((k) => nextMovedKeys.add(k)));

        setMatchedItems((prev) => {
          const map = new Map();
          prev.forEach((row) => {
            const keys = rowMoveKeys(row);
            const primary =
              keys.find((k) => k.startsWith('item:')) ||
              keys.find((k) => k.startsWith('rfid:')) ||
              `id:${row.Id}`;
            map.set(primary, row);
          });
          movedNow.forEach((row) => {
            const keys = rowMoveKeys(row);
            const primary =
              keys.find((k) => k.startsWith('item:')) ||
              keys.find((k) => k.startsWith('rfid:')) ||
              `id:${row.Id}`;
            map.set(primary, { ...map.get(primary), ...row, matchStatus: 'Matched' });
          });
          return Array.from(map.values());
        });

        setMovedKeys(nextMovedKeys);
        setInventoryRows((prev) => prev.filter((row) => !rowIsMoved(row, nextMovedKeys)));
      }

      setUnmatchedCodes((prev) => Array.from(new Set([...(prev || []), ...stillUnmatched])));
      setLastScanCount(result.totalScanned || rfidCodes.length);
      setSearchQuery('');
      setShowTrayModal(false);

      // API save only on "Save verification" button click — not automatic.
      addNotification({
        type: 'success',
        title: 'Moved to Tray Verification',
        message: `${movedNow.length} Match · ${stillUnmatched.length} UnMatch. Click Save verification to post the session.`,
      });
      return { success: true };
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to verify scanned tray tags.';
      addNotification({ type: 'error', title: 'Tray verification failed', message });
      return { success: false, message };
    } finally {
      setLoading(false);
      setTrayFetchLoading(false);
    }
  };

  const inventoryFrom =
    displayInventoryTotal === 0 || visibleInventory.length === 0
      ? 0
      : (inventoryPage - 1) * INVENTORY_PAGE_SIZE + 1;
  const inventoryTo =
    displayInventoryTotal === 0
      ? 0
      : Math.min(
          (inventoryPage - 1) * INVENTORY_PAGE_SIZE + visibleInventory.length,
          displayInventoryTotal
        );

  return (
    <div
      style={{
        minHeight: '100%',
        padding: isSmallScreen ? '12px' : '16px 18px 24px',
        background: '#ffffff',
      }}
    >
      {/* Header / title section */}
      <div
        style={{
          marginBottom: 14,
          padding: '12px 14px',
          borderRadius: 14,
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button
              type="button"
              onClick={() => navigate('/stock-verification')}
              title="Back to Stock Verification"
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: '1px solid #d4d4d8',
                background: '#fff',
                color: '#0f172a',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FaArrowLeft style={{ fontSize: 12 }} />
            </button>
            <div
              style={{
                width: isSmallScreen ? 34 : 38,
                height: isSmallScreen ? 34 : 38,
                borderRadius: 10,
                background: SV.stripe,
                boxShadow: '0 2px 8px rgba(13, 148, 136, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <FaBox style={{ fontSize: isSmallScreen ? 15 : 17 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: isSmallScreen ? '1.05rem' : '1.15rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.2,
                }}
              >
                Stock Verification with RFID Tray
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                All inventory on the left · tray match results on the right
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() =>
                saveVerificationSession({
                  matchedRows: matchedItems,
                  unmatched: unmatchedCodes,
                  tagMap: scanTagByRfid,
                })
              }
              disabled={
                savingSession || (!matchedItems.length && !unmatchedCodes.length)
              }
              title="POST AddStockVerificationBySession"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 36,
                padding: '0 14px',
                fontSize: 12,
                fontWeight: 800,
                borderRadius: 10,
                border: '1px solid #6ee7b7',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                cursor:
                  savingSession || (!matchedItems.length && !unmatchedCodes.length)
                    ? 'not-allowed'
                    : 'pointer',
                opacity:
                  savingSession || (!matchedItems.length && !unmatchedCodes.length) ? 0.55 : 1,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)',
              }}
            >
              {savingSession ? <FaSpinner className="fa-spin" /> : <FaCheck />}
              Save verification
            </button>
            <button
              type="button"
              onClick={() => setShowTrayModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 36,
                padding: '0 14px',
                fontSize: 12,
                fontWeight: 800,
                borderRadius: 10,
                border: '1px solid #7dd3fc',
                background: SV.sky,
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.28)',
              }}
              title="Open RFID tray scan"
            >
              <FaBox />
              Scan tray
            </button>
          </div>
        </div>

        {/* Below title — Stock Verification style stats */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <StatText label="Scanned:" value={lastScanCount} tone="teal" />
          <span style={{ color: '#cbd5e1', fontWeight: 500 }}>|</span>
          <StatText label="Matched:" value={matchedItems.length} tone="ok" />
          <span style={{ color: '#cbd5e1', fontWeight: 500 }}>|</span>
          <StatText label="Unmatched:" value={unmatchedCodes.length} tone="warn" />
          {scanBatchId ? (
            <>
              <span style={{ color: '#cbd5e1', fontWeight: 500 }}>|</span>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                Batch:{' '}
                <span
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    color: '#0f7669',
                    fontWeight: 800,
                  }}
                  title={scanBatchId}
                >
                  {String(scanBatchId).slice(0, 13)}…
                </span>
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Two sections */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isSmallScreen ? '1fr' : 'minmax(0, 1.15fr) minmax(0, 0.95fr)',
          gap: 14,
          alignItems: 'stretch',
        }}
      >
        {/* LEFT — All Inventory */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: isSmallScreen ? 420 : 620,
            borderRadius: 16,
            border: '1px solid #d1fae5',
            background: 'linear-gradient(180deg, #ffffff 0%, #f0fdfa 48%, #ffffff 100%)',
            boxShadow: '0 8px 28px rgba(15, 118, 110, 0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #ccfbf1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              background: 'linear-gradient(90deg, rgba(13,148,136,0.08) 0%, transparent 70%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: SV.stripe,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(13,148,136,0.3)',
                  flexShrink: 0,
                }}
              >
                <FaWarehouse style={{ fontSize: 15 }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                  All Inventory
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                  Labelled stock · {displayInventoryTotal.toLocaleString()} remaining ·{' '}
                  {INVENTORY_PAGE_SIZE}/page
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: isSmallScreen ? '100%' : 200 }}>
                <FaSearch
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: 11,
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search inventory…"
                  value={inventorySearchDraft}
                  onChange={(e) => setInventorySearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setInventorySearch(inventorySearchDraft);
                      fetchInventory(1, inventorySearchDraft);
                    }
                  }}
                  style={{
                    width: '100%',
                    height: 32,
                    padding: '0 10px 0 30px',
                    fontSize: 11,
                    border: '1px solid #99f6e4',
                    borderRadius: 8,
                    outline: 'none',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setInventorySearch(inventorySearchDraft);
                  fetchInventory(1, inventorySearchDraft);
                }}
                style={{
                  height: 32,
                  padding: '0 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 8,
                  border: '1px solid #5eead4',
                  background: SV.accentMuted,
                  color: SV.accentDark,
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => fetchInventory(inventoryPage, inventorySearch)}
                disabled={inventoryLoading}
                title="Refresh inventory"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid #d4d4d8',
                  background: '#fff',
                  color: '#0f172a',
                  cursor: inventoryLoading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {inventoryLoading ? <FaSpinner className="fa-spin" /> : <FaSync style={{ fontSize: 11 }} />}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
            {inventoryError ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#b91c1c', fontSize: 12 }}>
                <FaExclamationTriangle style={{ marginBottom: 8 }} />
                <div>{inventoryError}</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: 'center', width: 40 }}>#</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Item Code</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>RFID</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Category</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Product Name</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Design</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Purity</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Gross Wt</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryLoading && visibleInventory.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ ...tdStyle, padding: 36, textAlign: 'center', color: '#64748b' }}>
                        <FaSpinner className="fa-spin" style={{ marginRight: 8 }} />
                        Loading labelled stock…
                      </td>
                    </tr>
                  ) : visibleInventory.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ ...tdStyle, padding: 36, textAlign: 'center', color: '#94a3b8' }}>
                        {matchedItems.length
                          ? 'All items on this page moved to Tray Verification'
                          : 'No inventory records found'}
                      </td>
                    </tr>
                  ) : (
                    visibleInventory.map((row, index) => (
                      <tr
                        key={row.Id || `${row.ItemCode}-${index}`}
                        style={{ background: index % 2 === 0 ? '#ffffff' : '#f8fffc' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#ecfdf5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : '#f8fffc';
                        }}
                      >
                        <td style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                          {(inventoryPage - 1) * INVENTORY_PAGE_SIZE + index + 1}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 800, color: '#0f172a' }}>{row.ItemCode || '—'}</td>
                        <td
                          style={{
                            ...tdStyle,
                            fontFamily: 'ui-monospace, monospace',
                            fontSize: 10,
                            color: '#0f7669',
                            fontWeight: 700,
                          }}
                        >
                          {row.RFIDCode || '—'}
                        </td>
                        <td style={tdStyle}>{row.CategoryName || '—'}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{row.ProductName || '—'}</td>
                        <td style={tdStyle}>{row.DesignName || '—'}</td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              borderRadius: 999,
                              background: '#f0fdfa',
                              border: '1px solid #99f6e4',
                              color: '#0f7669',
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            {row.PurityName || '—'}
                          </span>
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 700,
                          }}
                        >
                          {formatWeight3(row.GrossWt)}
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 700,
                          }}
                        >
                          {formatWeight3(row.NetWt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
              Showing {inventoryFrom}–{inventoryTo} of {displayInventoryTotal.toLocaleString()}
              {matchedItems.length ? ` · ${matchedItems.length} moved` : ''}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                disabled={inventoryPage <= 1 || inventoryLoading}
                onClick={() => fetchInventory(inventoryPage - 1, inventorySearch)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#0f172a',
                  cursor: inventoryPage <= 1 || inventoryLoading ? 'not-allowed' : 'pointer',
                  opacity: inventoryPage <= 1 || inventoryLoading ? 0.45 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FaChevronLeft style={{ fontSize: 11 }} />
              </button>
              <span
                style={{
                  minWidth: 72,
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#0f172a',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {inventoryPage} / {inventoryTotalPages}
              </span>
              <button
                type="button"
                disabled={inventoryPage >= inventoryTotalPages || inventoryLoading}
                onClick={() => fetchInventory(inventoryPage + 1, inventorySearch)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#0f172a',
                  cursor:
                    inventoryPage >= inventoryTotalPages || inventoryLoading ? 'not-allowed' : 'pointer',
                  opacity: inventoryPage >= inventoryTotalPages || inventoryLoading ? 0.45 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FaChevronRight style={{ fontSize: 11 }} />
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT — Tray verification */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: isSmallScreen ? 420 : 620,
            borderRadius: 16,
            border: '1px solid #bae6fd',
            background: 'linear-gradient(180deg, #ffffff 0%, #f0f9ff 48%, #ffffff 100%)',
            boxShadow: '0 8px 28px rgba(2, 132, 199, 0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              background: 'linear-gradient(90deg, rgba(14,165,233,0.08) 0%, transparent 70%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: SV.sky,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(2,132,199,0.3)',
                }}
              >
                <FaBox style={{ fontSize: 15 }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                  Tray Verification
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                  Scan tray tags and match against stock
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: isSmallScreen ? '100%' : 180 }}>
                <FaSearch
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: 11,
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search matched…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: 32,
                    padding: '0 10px 0 30px',
                    fontSize: 11,
                    border: '1px solid #bae6fd',
                    borderRadius: 8,
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#fff',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowTrayModal(true)}
                style={{
                  height: 32,
                  padding: '0 12px',
                  fontSize: 11,
                  fontWeight: 800,
                  borderRadius: 8,
                  border: '1px solid #7dd3fc',
                  background: '#fff',
                  color: '#0284c7',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FaBox /> Scan
              </button>
            </div>
          </div>

          {unmatchedCodes.length > 0 ? (
            <div
              style={{
                margin: '0 14px 10px',
                padding: '8px 10px',
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: 11,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
                <FaExclamationTriangle /> Unmatched RFID
              </div>
              <div style={{ fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
                {unmatchedCodes.join(', ')}
              </div>
            </div>
          ) : null}

          <div style={{ flex: 1, overflow: 'auto', background: '#fff', borderTop: '1px solid #e0f2fe' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, minWidth: 720 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'center', width: 40, background: '#f0f9ff' }}>#</th>
                  <th style={{ ...thStyle, textAlign: 'left', background: '#f0f9ff' }}>Item Code</th>
                  <th style={{ ...thStyle, textAlign: 'left', background: '#f0f9ff' }}>RFID</th>
                  <th style={{ ...thStyle, textAlign: 'left', background: '#f0f9ff' }}>Category</th>
                  <th style={{ ...thStyle, textAlign: 'left', background: '#f0f9ff' }}>Product Name</th>
                  <th style={{ ...thStyle, textAlign: 'left', background: '#f0f9ff' }}>Design</th>
                  <th style={{ ...thStyle, textAlign: 'left', background: '#f0f9ff' }}>Purity</th>
                  <th style={{ ...thStyle, textAlign: 'right', background: '#f0f9ff' }}>Gross Wt</th>
                  <th style={{ ...thStyle, textAlign: 'right', background: '#f0f9ff' }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatched.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...tdStyle, padding: 36, textAlign: 'center', color: '#737373' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <FaBox style={{ fontSize: 28, color: '#94a3b8' }} />
                        <div style={{ fontWeight: 700 }}>No tray results yet</div>
                        <div style={{ fontSize: 12 }}>
                          Scan tray tags — matched items move here from All Inventory.
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowTrayModal(true)}
                          style={{
                            marginTop: 4,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            height: 34,
                            padding: '0 14px',
                            fontSize: 12,
                            fontWeight: 700,
                            borderRadius: 8,
                            border: '1px solid #7dd3fc',
                            background: SV.sky,
                            color: '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          <FaBox /> Open tray scan
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMatched.map((row, index) => (
                    <tr
                      key={row.Id || row.RFIDCode || index}
                      style={{ background: index % 2 === 0 ? '#fff' : '#f8fbff' }}
                    >
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                        {index + 1}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 800, color: '#0f172a' }}>{row.ItemCode || '—'}</td>
                      <td
                        style={{
                          ...tdStyle,
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: 10,
                          color: '#0284c7',
                          fontWeight: 700,
                        }}
                      >
                        {row.RFIDCode || '—'}
                      </td>
                      <td style={tdStyle}>{row.CategoryName || '—'}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{row.ProductName || '—'}</td>
                      <td style={tdStyle}>{row.DesignName || '—'}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 7px',
                            borderRadius: 999,
                            background: '#eff6ff',
                            border: '1px solid #bae6fd',
                            color: '#0369a1',
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {row.PurityName || '—'}
                        </span>
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                        }}
                      >
                        {formatWeight3(row.GrossWt)}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                        }}
                      >
                        {formatWeight3(row.NetWt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {unmatchedCodes.length > 0 ? (
            <div style={{ borderTop: '1px solid #fecaca', background: '#fff' }}>
              <div
                style={{
                  padding: '8px 14px',
                  background: '#fef2f2',
                  fontWeight: 800,
                  fontSize: 11,
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FaTimesCircle /> Unmatched tags ({unmatchedCodes.length})
              </div>
              <div style={{ padding: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {unmatchedCodes.map((code) => (
                  <span
                    key={code}
                    style={{
                      padding: '3px 7px',
                      borderRadius: 6,
                      background: '#fff',
                      border: '1px solid #fecaca',
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: 10,
                      color: '#b91c1c',
                      fontWeight: 600,
                    }}
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <TrayScanModal
        open={showTrayModal}
        onClose={() => setShowTrayModal(false)}
        onFetchData={handleTrayFetchData}
        title="Stock Verification RFID Tray Scan"
        subtitle="Place items on the RFID tray, connect the reader, start scan, then load matched stock."
        loadButtonLabel={trayFetchLoading ? 'Verifying…' : 'Verify stock'}
      />
    </div>
  );
};

export default StockVerificationWithRFIDTray;
