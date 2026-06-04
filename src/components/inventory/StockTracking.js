import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { FaSearch, FaSync, FaTimes, FaBoxes, FaBox, FaExclamationTriangle, FaPlus } from 'react-icons/fa';
import { useLoading } from '../../App';
import { toRrgoldApiUrl, getRrgoldApiBaseUrl } from '../../services/apiBaseConfig';
import GridItemImage from '../common/GridItemImage';
import TrayScanModal from '../common/TrayScanModal';
import { getItemImageLookupKeys, warmupLocalItemImageIndex } from '../../services/localItemImageService';
import { isInventoryTrayEnabled } from '../../services/trayModeService';
import { useNotifications } from '../../context/NotificationContext';
import { formatWeight3 } from '../../utils/weightFormat';

const ITEMS_PER_PAGE = 6;
const GRID_COLUMNS = 3;
/** Device id stored with tray scans — must match DeleteRFID / GetAllRFIDDetails filter. */
const STOCK_TRACKING_TRAY_DEVICE_ID = 'Adb';

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

const isTrayDeviceEntry = (entry) =>
  String(entry?.DeviceId || '').trim().toLowerCase() === STOCK_TRACKING_TRAY_DEVICE_ID.toLowerCase();

const getProductDetailsFromRow = (entry) => {
  const pd = entry?.ProductDetails ?? entry?.productDetails;
  if (!pd || typeof pd !== 'object') return null;
  return pd;
};

const mapDeviceRowToProduct = (entry, idx) => {
  const pd = getProductDetailsFromRow(entry);
  if (!pd) return null;

  const scanSource = isTrayDeviceEntry(entry) ? 'tray' : 'desktop';
  const tid = String(entry?.TIDValue || entry?.tidValue || pd.TIDNumber || pd.TIDValue || '').trim();
  const rfid = String(
    pd.RFIDCode || pd.RFIDNumber || pd.RfidCode || entry?.RFIDCode || entry?.RFIDNumber || ''
  ).trim();

  return {
    ...pd,
    __deviceKey: `device-row-${entry?.Id ?? idx}`,
    __deviceId: entry?.Id,
    scanSource,
    RFIDCode: rfid,
    RFIDNumber: String(pd.RFIDNumber || pd.RFIDCode || entry?.RFIDNumber || rfid).trim(),
    TIDValue: tid,
    TIDNumber: String(pd.TIDNumber || tid).trim(),
    ItemCode: String(pd.ItemCode || pd.Itemcode || '').trim(),
    Itemcode: String(pd.ItemCode || pd.Itemcode || '').trim(),
    DesignName: String(pd.DesignName || pd.Design || '').trim(),
    DesignNo: String(pd.DesignNo || pd.DesignName || pd.Design || '').trim(),
    PurityName: String(pd.PurityName || pd.Purity || '').trim(),
    GrossWt: pd.GrossWt ?? pd.grosswt ?? '0',
    NetWt: pd.NetWt ?? pd.netwt ?? '0',
    Qty: pd.Qty ?? pd.Quantity ?? 1,
    MRP: pd.MRP ?? pd.mrp ?? 0,
    ImageUrl: pd.ImageUrl || pd.imageurl || pd.ImagePath || pd.PhotoUrl || '',
    LabelledStockId: pd.LabelledStockId ?? pd.Id,
  };
};

const normalizeApiRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.Results)) return data.Results;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  return [];
};

const productKeyOf = (item) =>
  String(
    item?.LabelledStockId
    || item?.LabelledStockID
    || item?.Id
    || item?.RFIDCode
    || item?.RFIDNumber
    || `${item?.ItemCode || ''}|${item?.DesignNo || item?.DesignName || ''}`
  ).trim().toUpperCase();

const mapLabelledStockRowToProduct = (entry, idx) => {
  if (!entry || typeof entry !== 'object') return null;
  const rfid = String(entry?.RFIDCode || entry?.RFIDNumber || '').trim();
  return {
    ...entry,
    __deviceKey: `manual-${entry?.LabelledStockId ?? entry?.Id ?? idx}`,
    scanSource: 'manual',
    RFIDCode: rfid,
    RFIDNumber: String(entry?.RFIDNumber || rfid).trim(),
    ItemCode: String(entry?.ItemCode || entry?.Itemcode || '').trim(),
    Itemcode: String(entry?.ItemCode || entry?.Itemcode || '').trim(),
    DesignName: String(entry?.DesignName || entry?.Design || '').trim(),
    DesignNo: String(entry?.DesignNo || entry?.DesignName || entry?.Design || '').trim(),
    PurityName: String(entry?.PurityName || entry?.Purity || '').trim(),
    GrossWt: entry?.GrossWt ?? entry?.grosswt ?? '0',
    NetWt: entry?.NetWt ?? entry?.netwt ?? '0',
    Qty: entry?.Qty ?? entry?.Quantity ?? 1,
    MRP: entry?.MRP ?? entry?.mrp ?? 0,
    ImageUrl: entry?.ImageUrl || entry?.imageurl || entry?.ImagePath || entry?.PhotoUrl || '',
    LabelledStockId: entry?.LabelledStockId ?? entry?.LabelledStockID ?? entry?.Id ?? idx,
  };
};

const rfidKeyOf = (item) =>
  String(item?.RFIDCode || item?.RFIDNumber || item?.RfidCode || '').trim().toUpperCase();

/** Card label "RFID" — labelled stock RFIDCode, not TID/EPC. */
const displayRfidCode = (item) => field(item, 'RFIDCode', 'RFIDNumber', 'RfidCode') || '—';

const getItemKey = (item, index) =>
  String(item?.__deviceKey || item?.Id || item?.RFIDCode || item?.RFIDNumber || `row-${index}`);

const field = (item, ...keys) => {
  for (const key of keys) {
    const v = item?.[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

const grossWt = (item) =>
  formatWeight3(item?.GrossWt ?? item?.grosswt ?? item?.TWt ?? item?.GrossWeight ?? 0);

const netWt = (item) =>
  formatWeight3(item?.NetWt ?? item?.netwt ?? item?.NetWeight ?? 0);

const piecesOf = (item) => {
  const pieces = parseFloat(item?.MRP ?? item?.mrp ?? item?.Qty ?? item?.qty ?? 1);
  return Number.isNaN(pieces) ? 1 : pieces;
};

const formatScanDateTime = (value) => {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const scanDateTimeOf = (entry) => {
  const pd = getProductDetailsFromRow(entry);
  const candidates = [
    entry?.ScanDateTime,
    entry?.scanDateTime,
    entry?.CreatedDate,
    entry?.createdDate,
    entry?.CreatedOn,
    entry?.createdOn,
    entry?.DateTime,
    entry?.dateTime,
    pd?.ScanDateTime,
    pd?.CreatedDate,
    pd?.CreatedOn,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const dt = new Date(c);
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  return null;
};

const buildImageSrc = (item) => {
  const apiImg = String(
    item?.ImageUrl || item?.imageurl || item?.ImagePath || item?.PhotoUrl || item?.ProductImage || ''
  ).trim();
  if (!apiImg) return '';
  if (/^https?:\/\//i.test(apiImg) || /^data:/i.test(apiImg)) return apiImg;
  return `${getRrgoldApiBaseUrl().replace(/\/$/, '')}/${apiImg.replace(/^\/+/, '')}`;
};

const designNoOf = (item) =>
  field(item, 'DesignNo', 'DesignNO', 'design_no', 'DesignCode') ||
  field(item, 'DesignId', 'design_id', 'DesignName', 'Design') ||
  '';

/** e.g. 245D245-1 → family 245D245, variant 1 (siblings sort together). */
const parseDesignSortKey = (designNo) => {
  const full = String(designNo || '').trim();
  if (!full) return { family: '', variant: 0, full: '' };
  const variantMatch = full.match(/^(.+)-(\d+)$/);
  if (variantMatch) {
    return {
      family: variantMatch[1],
      variant: parseInt(variantMatch[2], 10) || 0,
      full,
    };
  }
  return { family: full, variant: 0, full };
};

const localeDesign = (a, b) =>
  String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });

const compareByDesign = (a, b) => {
  const ka = parseDesignSortKey(designNoOf(a));
  const kb = parseDesignSortKey(designNoOf(b));
  const byFamily = localeDesign(ka.family, kb.family);
  if (byFamily !== 0) return byFamily;
  if (ka.variant !== kb.variant) return ka.variant - kb.variant;
  return localeDesign(ka.full, kb.full);
};

/** Group by design family, sort families and variants; keeps 245D245-1 next to 245D245-2. */
const sortProductsByDesign = (items) => {
  if (!items?.length) return [];
  const groups = new Map();
  items.forEach((item) => {
    const { family } = parseDesignSortKey(designNoOf(item));
    const key = family || '\uffff';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  const sortedFamilies = [...groups.keys()].sort(localeDesign);
  const out = [];
  sortedFamilies.forEach((key) => {
    const batch = groups.get(key).slice().sort(compareByDesign);
    out.push(...batch);
  });
  return out;
};

/** Paginate without splitting a design family when it fits on one page. */
const buildDesignAwarePages = (items, pageSize) => {
  if (!items?.length) return [];
  const pages = [];
  let current = [];
  const flush = () => {
    if (current.length) {
      pages.push(current);
      current = [];
    }
  };
  let idx = 0;
  while (idx < items.length) {
    const startFamily = parseDesignSortKey(designNoOf(items[idx])).family;
    let end = idx + 1;
    while (end < items.length) {
      const fam = parseDesignSortKey(designNoOf(items[end])).family;
      if (fam !== startFamily) break;
      end += 1;
    }
    const group = items.slice(idx, end);
    if (current.length > 0 && current.length + group.length > pageSize) flush();
    if (group.length > pageSize) {
      flush();
      for (let g = 0; g < group.length; g += pageSize) {
        pages.push(group.slice(g, g + pageSize));
      }
    } else {
      current.push(...group);
      if (current.length >= pageSize) flush();
    }
    idx = end;
  }
  flush();
  return pages;
};

const StockTracking = () => {
  const { setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const [clientCode, setClientCode] = useState('');
  const [error, setError] = useState('');
  const [deviceData, setDeviceData] = useState([]);
  const [trayEnabled, setTrayEnabled] = useState(isInventoryTrayEnabled());
  const [showRfidTrayModal, setShowRfidTrayModal] = useState(false);
  const [search, setSearch] = useState('');
  const [manualProducts, setManualProducts] = useState([]);
  const [labelSearchResults, setLabelSearchResults] = useState([]);
  const [labelSearchLoading, setLabelSearchLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showClearScansConfirm, setShowClearScansConfirm] = useState(false);
  const [clearScansLoading, setClearScansLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        if (parsed.ClientCode) {
          setClientCode(parsed.ClientCode);
          return;
        }
      } catch {
        // fall through
      }
    }
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(window.atob(base64));
        if (decoded.ClientCode) setClientCode(decoded.ClientCode);
        else setError('Client code not found. Please login again.');
      } catch {
        setError('Error loading client information');
      }
    } else {
      setError('No authentication found. Please login again.');
    }
  }, []);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    warmupLocalItemImageIndex().catch(() => {});
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

  const fetchDeviceDetails = useCallback(async () => {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      toRrgoldApiUrl('/api/RFIDDevice/GetAllRFIDDetails'),
      { ClientCode: clientCode },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const rows = response.data?.data ?? response.data?.Data ?? response.data;
    if (Array.isArray(rows)) return rows;
    if (response.data?.success === false) {
      throw new Error(response.data?.message || response.data?.Message || 'Failed to load RFID details');
    }
    throw new Error('Invalid device data received');
  }, [clientCode]);

  const loadData = useCallback(async () => {
    if (!clientCode) return;
    try {
      setLoading(true);
      setError('');
      const devices = await fetchDeviceDetails();
      setDeviceData(devices);
    } catch (err) {
      setError(err?.response?.data?.Message || err?.message || 'Failed to load stock tracking data');
      setDeviceData([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [clientCode, fetchDeviceDetails, setLoading]);

  useEffect(() => {
    if (clientCode) loadData();
  }, [clientCode, loadData]);

  const scanRowCount = useMemo(
    () => (Array.isArray(deviceData) ? deviceData.length : 0),
    [deviceData]
  );

  /** Unique device ids from loaded scans (tray device included when tray mode is on). */
  const scanDeviceIds = useMemo(() => {
    const ids = new Set();
    if (Array.isArray(deviceData)) {
      deviceData.forEach((entry) => {
        const id = String(entry?.DeviceId || entry?.deviceId || '').trim();
        if (id) ids.add(id);
      });
    }
    if (trayEnabled) ids.add(STOCK_TRACKING_TRAY_DEVICE_ID);
    return [...ids];
  }, [deviceData, trayEnabled]);

  /** Cards only for RFID rows where API returned ProductDetails (active labelled stock match). */
  const matchingProducts = useMemo(() => {
    if (!Array.isArray(deviceData) || deviceData.length === 0) return [];
    return deviceData
      .map((entry, idx) => mapDeviceRowToProduct(entry, idx))
      .filter(Boolean);
  }, [deviceData]);

  useEffect(() => {
    const query = String(search || '').trim();
    if (!clientCode || query.length < 2) {
      setLabelSearchResults([]);
      setLabelSearchLoading(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        setLabelSearchLoading(true);
        const q = query.trim();
        const apiPath = '/api/ProductMaster/GetAllLabeledStock';
        const request = (payload) =>
          axios.post(toRrgoldApiUrl(apiPath), payload, { headers: getAuthHeaders() });

        // 1) Same lightweight style as SampleOut item-code search.
        const primaryRes = await request({
          ClientCode: clientCode,
          ItemCode: q,
          SearchQuery: q,
          RFIDCode: q,
          PageNumber: 1,
          PageSize: 30,
        });
        let rows = normalizeApiRows(primaryRes.data);

        // 2) Fallback: full LabelStockList payload (works on stricter API variants).
        if (!rows.length) {
          const fallbackRes = await request({
            ClientCode: clientCode,
            CategoryId: 0,
            ProductId: 0,
            DesignId: 0,
            PurityId: 0,
            BranchId: 0,
            CounterId: 0,
            RFIDCode: q,
            ItemCode: q,
            SearchQuery: q,
            FromDate: null,
            ToDate: null,
            Status: 'ApiActive',
            ListType: 'ascending',
            SortColumn: null,
            PageNumber: 1,
            PageSize: 30,
          });
          rows = normalizeApiRows(fallbackRes.data);
        }

        const mapped = rows
          .map((item, idx) => mapLabelledStockRowToProduct(item, idx))
          .filter(Boolean);
        setLabelSearchResults(mapped);
      } catch {
        setLabelSearchResults([]);
      } finally {
        setLabelSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [search, clientCode]);

  const allProductKeys = useMemo(() => {
    const keys = new Set();
    matchingProducts.forEach((item) => keys.add(productKeyOf(item)));
    manualProducts.forEach((item) => keys.add(productKeyOf(item)));
    return keys;
  }, [matchingProducts, manualProducts]);

  const addManualProduct = (item) => {
    const key = productKeyOf(item);
    if (!key || allProductKeys.has(key)) return;
    setManualProducts((prev) => [...prev, item]);
    setCurrentPage(1);
  };

  const allProducts = useMemo(() => {
    const seen = new Set();
    const merged = [];
    [...matchingProducts, ...manualProducts].forEach((item) => {
      const key = productKeyOf(item);
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });
    return sortProductsByDesign(merged);
  }, [matchingProducts, manualProducts]);

  const filteredProducts = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    const list = !q
      ? allProducts
      : allProducts.filter((item) => {
          const blob = [
            item?.RFIDCode,
            item?.RFIDNumber,
            item?.ItemCode,
            item?.Itemcode,
            item?.itemcode,
            item?.DesignNo,
            item?.DesignId,
            item?.design_id,
            item?.DesignCode,
            item?.DesignName,
            item?.Design,
            item?.PurityName,
            item?.Purity,
            item?.purity_id,
            item?.CategoryName,
            item?.ProductName,
            item?.TIDNumber,
            item?.TIDValue,
          ]
            .filter((v) => v != null)
            .map((v) => String(v).toLowerCase())
            .join(' ');
          return blob.includes(q);
        });
    return sortProductsByDesign(list);
  }, [allProducts, search]);

  const summary = useMemo(() => {
    const totalProducts = filteredProducts.length;
    const totalGrossWt = filteredProducts.reduce(
      (sum, item) => sum + (parseFloat(grossWt(item)) || 0),
      0
    );
    const totalPiecesScanned = filteredProducts.reduce((sum, item) => sum + piecesOf(item), 0);
    return { totalProducts, totalGrossWt, totalPiecesScanned };
  }, [filteredProducts]);

  const productPages = useMemo(
    () => buildDesignAwarePages(filteredProducts, ITEMS_PER_PAGE),
    [filteredProducts]
  );

  const totalPages = Math.max(1, productPages.length);

  const paginatedProducts = useMemo(
    () => productPages[currentPage - 1] || [],
    [productPages, currentPage]
  );

  const latestScanDateTime = useMemo(() => {
    if (!Array.isArray(deviceData) || deviceData.length === 0) return null;
    let latest = null;
    deviceData.forEach((entry) => {
      const dt = scanDateTimeOf(entry);
      if (!dt) return;
      if (!latest || dt.getTime() > latest.getTime()) latest = dt;
    });
    return latest;
  }, [deviceData]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const deleteRfidByClientAndDevice = useCallback(
    async (deviceId) => {
      if (!clientCode) {
        throw new Error('Client code not found. Please login again.');
      }
      const id = String(deviceId || '').trim();
      if (!id) {
        throw new Error('Device id is required.');
      }
      const response = await axios.post(
        toRrgoldApiUrl('/api/RFIDDevice/DeleteRFIDByClientAndDevice'),
        { ClientCode: clientCode, DeviceId: id },
        { headers: getAuthHeaders() }
      );
      const data = response.data;
      const failed =
        data?.success === false
        || data?.Success === false
        || data?.status === false
        || data?.Status === false;
      if (failed) {
        throw new Error(
          data?.message || data?.Message || `Failed to clear scans for device "${id}".`
        );
      }
      return data?.message || data?.Message || `Cleared scans for device "${id}".`;
    },
    [clientCode]
  );

  const clearTrayScanSession = useCallback(async () => {
    if (!clientCode) return;
    try {
      await deleteRfidByClientAndDevice(STOCK_TRACKING_TRAY_DEVICE_ID);
    } catch {
      /* tray rescan: clear local list even if server delete fails */
    }
    setDeviceData([]);
    setCurrentPage(1);
  }, [clientCode, deleteRfidByClientAndDevice]);

  const handleTrayScanStart = useCallback(async () => {
    await clearTrayScanSession();
    addNotification({
      type: 'info',
      title: 'Scan started',
      message: 'Previous tray scan list cleared. Place tags on the reader.',
    });
  }, [clearTrayScanSession, addNotification]);

  const handleTrayFetchData = async (scanned) => {
    const rows = normalizeScanRows(scanned);
    if (!clientCode) {
      return { success: false, message: 'Client code not found. Please login again.' };
    }
    if (!rows.length) {
      return { success: false, message: 'No RFID tags to save.' };
    }

    try {
      setLoading(true);
      const payload = rows.map((row) => ({
        ClientCode: clientCode,
        DeviceId: STOCK_TRACKING_TRAY_DEVICE_ID,
        TIDValue: row.epc,
        RFIDCode: row.rfidCode || row.epc,
        StatusType: true,
      }));

      const response = await axios.post(
        toRrgoldApiUrl('/api/RFIDDevice/AddRFID'),
        payload,
        { headers: getAuthHeaders() }
      );

      const saved = normalizeApiRows(response.data);
      if (!saved.length) {
        throw new Error('No RFID data provided or save returned empty.');
      }

      await loadData();
      setCurrentPage(1);

      const message = `Saved ${saved.length} scan(s) to server. Products updated below.`;
      addNotification({
        type: 'success',
        title: 'Tray scan saved',
        message,
      });
      return { success: true, message };
    } catch (err) {
      const message =
        err?.response?.data?.message
        || err?.response?.data?.Message
        || err?.message
        || 'Failed to save tray scans.';
      addNotification({
        type: 'error',
        title: 'Save failed',
        message,
      });
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllScanDataClick = () => {
    if (!clientCode) {
      addNotification({
        type: 'error',
        title: 'Cannot clear',
        message: 'Client code not found. Please login again.',
      });
      return;
    }
    if (scanRowCount === 0 && scanDeviceIds.length === 0) {
      addNotification({
        type: 'info',
        title: 'No scan data',
        message: 'There are no RFID scans to clear.',
      });
      return;
    }
    setShowClearScansConfirm(true);
  };

  const confirmClearAllScanData = async () => {
    const devicesToClear =
      scanDeviceIds.length > 0 ? scanDeviceIds : [STOCK_TRACKING_TRAY_DEVICE_ID];

    try {
      setClearScansLoading(true);
      setLoading(true);

      const results = await Promise.allSettled(
        devicesToClear.map((deviceId) => deleteRfidByClientAndDevice(deviceId))
      );

      const failed = results
        .map((result, index) => ({ result, deviceId: devicesToClear[index] }))
        .filter(({ result }) => result.status === 'rejected');

      if (failed.length === results.length) {
        const firstErr = failed[0]?.result;
        throw new Error(
          firstErr?.reason?.response?.data?.message
            || firstErr?.reason?.response?.data?.Message
            || firstErr?.reason?.message
            || 'Could not clear scan data.'
        );
      }

      setDeviceData([]);
      setCurrentPage(1);
      setSearch('');
      setShowClearScansConfirm(false);
      await loadData();

      const clearedCount = results.length - failed.length;
      const failNames = failed.map(({ deviceId }) => deviceId).join(', ');
      addNotification({
        type: failed.length ? 'warning' : 'success',
        title: failed.length ? 'Partially cleared' : 'Scan data cleared',
        message: failed.length
          ? `Cleared ${clearedCount} device(s) for client ${clientCode}. Failed: ${failNames}.`
          : `All RFID scans cleared for client ${clientCode} (${clearedCount} device${clearedCount === 1 ? '' : 's'}).`,
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Clear failed',
        message:
          err?.response?.data?.message
          || err?.response?.data?.Message
          || err?.message
          || 'Could not clear scan data. Please try again.',
      });
    } finally {
      setClearScansLoading(false);
      setLoading(false);
    }
  };

  const gridColumns =
    windowWidth <= 640 ? 1 : windowWidth <= 1024 ? 2 : GRID_COLUMNS;

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

  return (
    <div style={{ fontFamily: 'Inter, Poppins, sans-serif', padding: '12px 14px', boxSizing: 'border-box' }}>
      <style>
        {`
          @keyframes stockTrackLoadBar {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(320%); }
          }
        `}
      </style>

      {/* Header */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 8,
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            height: 3,
            background: 'linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%)',
          }}
        />
        <div style={{ padding: '10px 12px' }}>
          {/* Title + totals + actions — one row */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              paddingBottom: 8,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: windowWidth <= 768 ? '1rem' : '1.15rem',
                fontWeight: 800,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flex: '0 0 auto',
              }}
            >
              <FaBoxes style={{ color: '#059669', fontSize: 16 }} />
              Stock Tracking
            </h1>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '6px 10px',
                flex: '1 1 280px',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'nowrap',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: windowWidth <= 1024 ? 14 : 16,
                  fontWeight: 700,
                  color: '#334155',
                  lineHeight: 1.5,
                  textAlign: 'right',
                  flex: '1 1 auto',
                  minWidth: 0,
                  overflowX: 'auto',
                }}
              >
                <span style={{ padding: '4px 8px', borderRadius: 8, background: '#f8fafc' }}>
                  Matched Products:{' '}
                  <strong style={{ color: '#059669', fontWeight: 800, fontSize: windowWidth <= 1024 ? 16 : 18 }}>
                    {summary.totalProducts}
                  </strong>
                </span>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>|</span>
                <span style={{ padding: '4px 8px', borderRadius: 8, background: '#f8fafc' }}>
                  Total Gross Wt:{' '}
                  <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: windowWidth <= 1024 ? 16 : 18 }}>
                    {summary.totalGrossWt.toFixed(3)}
                  </strong>
                </span>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>|</span>
                <span style={{ padding: '4px 8px', borderRadius: 8, background: '#f8fafc' }}>
                  Total Pieces Scanned:{' '}
                  <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: windowWidth <= 1024 ? 16 : 18 }}>
                    {summary.totalPiecesScanned}
                  </strong>
                </span>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>|</span>
                <span style={{ padding: '4px 8px', borderRadius: 8, background: '#f8fafc' }}>
                  Scanned Date & Time:{' '}
                  <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: windowWidth <= 1024 ? 14 : 15 }}>
                    {formatScanDateTime(latestScanDateTime)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Search + tray scan */}
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
              <FaSearch
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: 12,
                }}
              />
              <input
                type="text"
                placeholder="Search RFID / Item Code / Design / Purity..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  height: 30,
                  padding: '0 10px 0 30px',
                  fontSize: 11,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {trayEnabled ? (
              <button
                type="button"
                onClick={() => setShowRfidTrayModal(true)}
                title="Scan tags with RFID tray"
                style={{
                  height: 30,
                  padding: '0 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 6,
                  border: '1px solid #0284c7',
                  background: '#fff',
                  color: '#0284c7',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FaBox />
                Tray Scan
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleRefresh}
              style={{
                height: 30,
                padding: '0 10px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                background: '#fafafa',
                color: '#262626',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <FaSync className={isRefreshing ? 'fa-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleClearAllScanDataClick}
              disabled={clearScansLoading || !clientCode}
              title="Clear all RFID scan data for this client"
              style={{
                height: 30,
                padding: '0 10px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 6,
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#b91c1c',
                cursor: clearScansLoading || !clientCode ? 'not-allowed' : 'pointer',
                opacity: clearScansLoading || !clientCode ? 0.65 : 1,
              }}
            >
              Clear all scan data
            </button>
          </div>

          {String(search || '').trim().length >= 2 ? (
            <div
              style={{
                marginTop: 8,
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                background: '#f8fafc',
                padding: '8px 10px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Add products from labelled stock
              </div>
              {labelSearchLoading ? (
                <div style={{ fontSize: 11, color: '#64748b' }}>Searching...</div>
              ) : labelSearchResults.length === 0 ? (
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  No labelled products found. Try item code / RFID / design text.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {labelSearchResults.slice(0, 6).map((item, idx) => {
                    const key = productKeyOf(item) || `result-${idx}`;
                    const alreadyAdded = allProductKeys.has(productKeyOf(item));
                    const itemCode = field(item, 'ItemCode', 'Itemcode') || '—';
                    const rfid = displayRfidCode(item);
                    const designNo = designNoOf(item) || '—';
                    return (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          background: '#fff',
                          padding: '6px 8px',
                        }}
                      >
                        <div style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>
                          RFID: {rfid} · Item: {itemCode} · Design: {designNo}
                        </div>
                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => addManualProduct(item)}
                          style={{
                            height: 24,
                            minWidth: 24,
                            borderRadius: 6,
                            border: '1px solid #86efac',
                            background: alreadyAdded ? '#f1f5f9' : '#ecfdf5',
                            color: alreadyAdded ? '#94a3b8' : '#059669',
                            cursor: alreadyAdded ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                          }}
                          title={alreadyAdded ? 'Already added' : 'Add product'}
                        >
                          <FaPlus />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          style={{
            padding: 14,
            marginBottom: 12,
            borderRadius: 10,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      ) : null}

      {/* Grid panel */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          padding: '10px 12px',
        }}
      >
        {/* Top pagination */}
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
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: currentPage === 1 ? '#f1f5f9' : '#fff',
                color: currentPage === 1 ? '#94a3b8' : '#475569',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            {pageNumbers.map((page) => (
              <button
                key={`page-${page}`}
                type="button"
                onClick={() => handlePageChange(page)}
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
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: currentPage === totalPages ? '#f1f5f9' : '#fff',
                color: currentPage === totalPages ? '#94a3b8' : '#475569',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        </div>

        {isRefreshing && filteredProducts.length === 0 ? (
          <div style={{ padding: 24 }}>
            <div style={{ color: '#334155', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              <FaSync className="fa-spin" style={{ marginRight: 8, color: '#059669' }} />
              Loading scanned products...
            </div>
            <div
              style={{
                width: '100%',
                height: 8,
                borderRadius: 999,
                background: '#e2e8f0',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '35%',
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #059669, #34d399, #6ee7b7)',
                  animation: 'stockTrackLoadBar 1.2s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13, fontWeight: 600, lineHeight: 1.55 }}>
            {scanRowCount > 0 ? (
              <>
                {scanRowCount} RFID scan(s) loaded, but none matched active labelled stock (
                <strong>ProductDetails</strong>).
                <br />
                Matching uses TID ↔ TIDNumber, then RFIDCode (active stock only).
              </>
            ) : (
              <>
                No scans yet. Use desktop sync or{' '}
                {trayEnabled ? <strong>Tray Scan</strong> : 'enable tray in RFID Utility'}, then refresh.
              </>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
              gap: 14,
            }}
          >
            {paginatedProducts.map((item, index) => {
              const cardKey = getItemKey(item, index);
              const itemCode = field(item, 'ItemCode', 'Itemcode', 'itemcode') || '—';
              const rfidCode = displayRfidCode(item);
              const designNo = designNoOf(item) || '—';
              const purity =
                field(item, 'PurityName', 'Purity', 'purity_id', 'PurityId') || '—';
              const imageSrc = buildImageSrc(item);
              const lookupKeys = getItemImageLookupKeys({
                ...item,
                ItemCode: itemCode === '—' ? '' : itemCode,
                RFIDCode: rfidCode === '—' ? '' : rfidCode,
                DesignId: designNo === '—' ? '' : designNo,
                DesignName: designNo,
                DesignNo: designNo,
              });

              return (
                <article
                  key={cardKey}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    background: '#fff',
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
                      justifyContent: 'flex-end',
                      padding: '8px 10px',
                      borderBottom: '1px solid #f1f5f9',
                      background: '#fafafa',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.scanSource === 'tray' ? (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: '#0284c7',
                            background: '#e0f2fe',
                            padding: '2px 6px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                          }}
                        >
                          Tray
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: '#059669',
                            background: '#ecfdf5',
                            padding: '2px 6px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                          }}
                        >
                          Desktop
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
                        #{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={
                      imageSrc
                        ? () =>
                            setPreviewImage({
                              src: imageSrc,
                              title: `${itemCode} | ${rfidCode}`,
                              itemCode,
                              rfidCode,
                              designNo,
                              purity,
                              grossWt: grossWt(item),
                              netWt: netWt(item),
                              pieces: piecesOf(item),
                            })
                        : undefined
                    }
                    style={{
                      cursor: imageSrc ? 'zoom-in' : 'default',
                      flex: '0 0 auto',
                    }}
                  >
                    <GridItemImage
                      src={imageSrc}
                      itemCode={itemCode === '—' ? '' : itemCode}
                      lookupKeys={lookupKeys}
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
                  </div>

                  <div
                    style={{
                      padding: '8px 10px 10px',
                      flex: '0 0 auto',
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: '#0f172a',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: 4,
                      }}
                      title={`${rfidCode} | ${itemCode} | ${designNo}`}
                    >
                      <span style={{ color: '#475569' }}>RFID Code:</span> {rfidCode}
                      <span style={{ color: '#cbd5e1', margin: '0 5px' }}>·</span>
                      <span style={{ color: '#475569' }}>Item Code:</span> {itemCode}
                      <span style={{ color: '#cbd5e1', margin: '0 5px' }}>·</span>
                      <span style={{ color: '#475569' }}>Design No:</span> {designNo}
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      title={`${purity} · Gr ${grossWt(item)} · Nt ${netWt(item)} · Pieces ${piecesOf(item)}`}
                    >
                      <span style={{ color: '#475569' }}><strong>Purity:</strong> {purity}</span>
                      <span style={{ color: '#cbd5e1' }}>·</span>
                      <span style={{ color: '#475569' }}><strong>Gr Wt:</strong> {grossWt(item)}</span>
                      <span style={{ color: '#cbd5e1' }}>·</span>
                      <span style={{ color: '#475569' }}><strong>Nt Wt:</strong> {netWt(item)}</span>
                      <span style={{ color: '#cbd5e1' }}>·</span>
                      <span style={{ color: '#475569' }}><strong>Pieces:</strong> {piecesOf(item)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Image preview */}
      {previewImage ? (
        <div
          role="presentation"
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 12,
              maxWidth: 720,
              width: '100%',
              maxHeight: '92vh',
              overflow: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{previewImage.title}</div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
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
                <FaTimes />
              </button>
            </div>
            <div style={{ padding: 14, textAlign: 'center' }}>
              <img
                src={previewImage.src}
                alt={previewImage.title || 'Preview'}
                style={{ width: '100%', maxHeight: 'calc(100vh - 280px)', objectFit: 'contain' }}
              />
            </div>
            <div
              style={{
                padding: '10px 14px 14px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                fontSize: 11,
                fontWeight: 700,
                color: '#334155',
              }}
            >
              <div><span style={{ color: '#64748b' }}>RFID:</span> {previewImage.rfidCode}</div>
              <div><span style={{ color: '#64748b' }}>Item:</span> {previewImage.itemCode}</div>
              <div><span style={{ color: '#64748b' }}>Design No:</span> {previewImage.designNo}</div>
              <div><span style={{ color: '#64748b' }}>Purity:</span> {previewImage.purity}</div>
              <div><span style={{ color: '#64748b' }}>Gross:</span> {previewImage.grossWt}</div>
              <div><span style={{ color: '#64748b' }}>Net:</span> {previewImage.netWt}</div>
              <div><span style={{ color: '#64748b' }}>Pieces:</span> {previewImage.pieces}</div>
            </div>
          </div>
        </div>
      ) : null}

      {showClearScansConfirm ? (
        <div
          role="presentation"
          onClick={() => !clearScansLoading && setShowClearScansConfirm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-labelledby="clear-scans-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 14,
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
              width: 440,
              maxWidth: '100%',
              padding: '0 0 18px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '28px 24px 0',
                textAlign: 'center',
              }}
            >
              <FaExclamationTriangle style={{ color: '#f59e0b', fontSize: 42, marginBottom: 10 }} />
              <div
                id="clear-scans-title"
                style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 8 }}
              >
                Clear all scan data?
              </div>
              <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>
                Do you want to clear all RFID scans? This will remove scan data from the server for
                client <strong>{clientCode}</strong>
                {scanRowCount > 0 ? (
                  <>
                    {' '}
                    ({scanRowCount} scan{scanRowCount === 1 ? '' : 's'}
                    {scanDeviceIds.length ? ` · ${scanDeviceIds.length} device${scanDeviceIds.length === 1 ? '' : 's'}` : ''}
                    )
                  </>
                ) : null}
                . This action cannot be undone.
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                marginTop: 16,
                padding: '0 24px',
              }}
            >
              <button
                type="button"
                onClick={() => setShowClearScansConfirm(false)}
                disabled={clearScansLoading}
                style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 22px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: clearScansLoading ? 'not-allowed' : 'pointer',
                  opacity: clearScansLoading ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearAllScanData}
                disabled={clearScansLoading}
                style={{
                  background: clearScansLoading ? '#fca5a5' : '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 22px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: clearScansLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                }}
              >
                {clearScansLoading ? 'Clearing...' : 'Yes, clear all'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <TrayScanModal
        open={showRfidTrayModal}
        onClose={() => setShowRfidTrayModal(false)}
        onScanStart={handleTrayScanStart}
        onFetchData={handleTrayFetchData}
        title="Stock Tracking — Tray scan"
        subtitle="Connect & start scan to clear the previous list. When finished, save tags to the server — products appear in the grid below."
        loadButtonLabel="Save scans & load products"
      />
    </div>
  );
};

export default StockTracking;
