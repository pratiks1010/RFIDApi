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
import PageHeader from '../common/PageHeader';

const SV = {
  accent: '#0f766e',
  accentDark: '#115e59',
  accentMuted: '#ccfbf1',
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

const thStyle = {
  padding: '5px 7px',
  fontSize: 9,
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #e4e4e7',
  borderRight: '1px solid #e4e4e7',
  whiteSpace: 'nowrap',
  background: 'var(--ui-surface, #f8fafc)',
  position: 'sticky',
  top: 0,
  zIndex: 1,
};

const tdStyle = {
  padding: '5px 7px',
  borderBottom: '1px solid #e5e7eb',
  borderRight: '1px solid #ececec',
  color: '#1e293b',
  fontSize: 10,
  lineHeight: 1.3,
  fontWeight: 500,
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
      className="stock-verification-page"
      style={{
        minHeight: '100%',
        padding: isSmallScreen ? 8 : 12,
        background: '#f8fafc',
        fontFamily: 'var(--font-family)',
      }}
    >
      <div className="sv-top">
        <div className="sv-top-inner">
        <PageHeader
          title="Stock Verification with RFID Tray"
          subtitle="All inventory on the left · tray match on the right"
          barStyle={{ padding: 0, margin: 0, gap: 10, borderBottom: 'none' }}
          actions={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="sv-chip"
                onClick={() => navigate('/stock-verification')}
                title="Back to Stock Verification"
              >
                <FaArrowLeft /> Back
              </button>
              <button
                type="button"
                className="sv-chip"
                onClick={() =>
                  saveVerificationSession({
                    matchedRows: matchedItems,
                    unmatched: unmatchedCodes,
                    tagMap: scanTagByRfid,
                  })
                }
                disabled={savingSession || (!matchedItems.length && !unmatchedCodes.length)}
                title="POST AddStockVerificationBySession"
              >
                {savingSession ? <FaSpinner className="fa-spin" /> : <FaCheck />}
                Save
              </button>
              <button
                type="button"
                className="sv-chip sv-chip--accent"
                onClick={() => setShowTrayModal(true)}
                title="Open RFID tray scan"
              >
                <FaBox /> Scan tray
              </button>
            </div>
          )}
        />

        {/* Below title — stats */}
        <div className="sv-toolbar" style={{ marginTop: 10 }}>
          <span className="sv-count-pill">Scanned {lastScanCount}</span>
          <span className="sv-badge">{matchedItems.length} matched</span>
          {unmatchedCodes.length > 0 ? (
            <span className="sv-badge sv-badge--warn">{unmatchedCodes.length} unmatched</span>
          ) : null}
          {scanBatchId ? (
            <span className="sv-count-pill" title={scanBatchId}>
              Batch {String(scanBatchId).slice(0, 13)}…
            </span>
          ) : null}
        </div>
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
          className="sv-panel"
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: isSmallScreen ? 420 : 620,
          }}
        >
          <div className="sv-panel-head">
            <div>
              <h2>All Inventory</h2>
              <p>
                Labelled stock · {displayInventoryTotal.toLocaleString()} remaining · {INVENTORY_PAGE_SIZE}/page
              </p>
            </div>
            <div className="sv-panel-tools">
              <div className="sv-search-wrap" style={{ flex: '1 1 160px' }}>
                <FaSearch />
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
                />
              </div>
              <button
                type="button"
                className="sv-chip sv-chip--accent"
                onClick={() => {
                  setInventorySearch(inventorySearchDraft);
                  fetchInventory(1, inventorySearchDraft);
                }}
              >
                Search
              </button>
              <button
                type="button"
                className="sv-chip"
                onClick={() => fetchInventory(inventoryPage, inventorySearch)}
                disabled={inventoryLoading}
                title="Refresh inventory"
              >
                {inventoryLoading ? <FaSpinner className="fa-spin" /> : <FaSync />}
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
              <table className="app-data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 720 }}>
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
                        style={{ background: index % 2 === 0 ? '#ffffff' : '#fafafa' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : '#fafafa';
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

          <div className="sv-pagination">
            <span className="sv-pagination-meta">
              Showing {inventoryFrom}–{inventoryTo} of {displayInventoryTotal.toLocaleString()}
              {matchedItems.length ? ` · ${matchedItems.length} moved` : ''}
            </span>
            <div className="sv-pagination-nav">
              <button
                type="button"
                className="sv-page-btn"
                disabled={inventoryPage <= 1 || inventoryLoading}
                onClick={() => fetchInventory(inventoryPage - 1, inventorySearch)}
              >
                <FaChevronLeft />
              </button>
              <span className="sv-page-indicator">{inventoryPage} / {inventoryTotalPages}</span>
              <button
                type="button"
                className="sv-page-btn"
                disabled={inventoryPage >= inventoryTotalPages || inventoryLoading}
                onClick={() => fetchInventory(inventoryPage + 1, inventorySearch)}
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT — Tray verification */}
        <section
          className="sv-panel"
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: isSmallScreen ? 420 : 620,
          }}
        >
          <div className="sv-panel-head">
            <div>
              <h2>Tray Verification</h2>
              <p>Scan tray tags and match against stock</p>
            </div>
            <div className="sv-panel-tools">
              <div className="sv-search-wrap" style={{ flex: '1 1 140px' }}>
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search matched…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="sv-chip sv-chip--accent"
                onClick={() => setShowTrayModal(true)}
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
            <table className="app-data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 720 }}>
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
                          className="sv-chip sv-chip--accent"
                          onClick={() => setShowTrayModal(true)}
                          style={{ marginTop: 4 }}
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
                      style={{ background: index % 2 === 0 ? '#fff' : '#fafafa' }}
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
                          color: '#0f766e',
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
                            background: '#fff',
                            border: '1px solid #99f6e4',
                            color: '#0f766e',
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
      <style>{`
        .stock-verification-page { box-sizing: border-box; }
        .stock-verification-page * { box-sizing: border-box; }
        .sv-top {
          background: #fff;
          border: var(--page-header-border, 1px solid #e2e8f0);
          border-radius: var(--page-header-radius, 12px);
          box-shadow: var(--page-header-shadow, 0 2px 8px rgba(15, 23, 42, 0.06));
          margin-bottom: 12px;
        }
        .sv-top-inner { padding: 12px 14px 10px; }
        .sv-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
        }
        .sv-search-wrap {
          position: relative;
          flex: 1 1 160px;
          min-width: 0;
        }
        .sv-search-wrap svg {
          position: absolute;
          left: 9px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 10px;
          pointer-events: none;
        }
        .sv-search-wrap input {
          width: 100%;
          height: 28px;
          padding: 0 10px 0 28px;
          font-size: 11px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          outline: none;
          background: #fff;
          color: #0f172a;
        }
        .sv-search-wrap input:focus { border-color: #0f766e; box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12); }
        .sv-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 28px;
          padding: 0 11px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #fff;
          color: #334155;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .sv-chip:hover { background: #f8fafc; }
        .sv-chip.is-active, .sv-chip--accent { border-color: #99f6e4; color: #0f766e; }
        .sv-chip:disabled { opacity: 0.5; cursor: not-allowed; }
        .sv-badge {
          min-width: 16px;
          height: 20px;
          padding: 0 8px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid #99f6e4;
          color: #0f766e;
          font-size: 10px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .sv-badge--warn { border-color: #fecaca; color: #b91c1c; }
        .sv-count-pill { font-size: 11px; font-weight: 600; color: #64748b; }
        .sv-panel {
          background: #fff;
          border: 1px solid #d4d4d8;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .sv-panel-head {
          padding: 10px 12px;
          border-bottom: 1px solid #e5e7eb;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .sv-panel-head h2 {
          margin: 0;
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
        }
        .sv-panel-head p {
          margin: 2px 0 0;
          font-size: 10px;
          color: #64748b;
          font-weight: 600;
        }
        .sv-panel-tools {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .sv-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          padding: 10px 12px;
          border-top: 1px solid #e5e7eb;
          background: #fafafa;
        }
        .sv-pagination-meta {
          font-size: 11px;
          font-weight: 600;
          color: #525252;
        }
        .sv-pagination-nav { display: flex; align-items: center; gap: 6px; }
        .sv-page-btn {
          height: 32px;
          min-width: 36px;
          padding: 0 10px;
          font-size: 11px;
          font-weight: 600;
          border-radius: 8px;
          border: 1px solid #e5e5e5;
          background: #fff;
          color: #525252;
          cursor: pointer;
        }
        .sv-page-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .sv-page-indicator {
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
          font-variant-numeric: tabular-nums;
          min-width: 52px;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default StockVerificationWithRFIDTray;
