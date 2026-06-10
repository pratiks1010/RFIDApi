import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FaCheckCircle, FaInbox, FaSpinner, FaTimes, FaArrowLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useLoading } from '../../App';
import { useNotifications } from '../../context/NotificationContext';
import GridItemImage from '../common/GridItemImage';
import {
  getAcceptLotUrl,
  getLotByIdUrl,
  getMyAssignedLotsUrl,
  sampleAuthHeaders,
} from '../../services/rfidSampleApi';
import { getRrgoldApiBaseUrl } from '../../services/apiBaseConfig';
import { getItemImageLookupKeys, warmupLocalItemImageIndex } from '../../services/localItemImageService';
import { getClientCode } from '../../utils/authState';
import { normalizeList } from '../../services/rfidUserManagementApi';

const GRID_COLUMNS = 3;
const LOTS_PER_PAGE = 6;
const ITEMS_PER_PAGE = 6;

const pick = (row, ...keys) => {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const formatWeight3 = (value) => {
  const n = parseFloat(value);
  return Number.isNaN(n) ? '0.000' : n.toFixed(3);
};

const lineKey = (line) =>
  String(
    pick(line, 'Id', 'id', 'LabelledStockId', 'labelledStockId') ||
      `${pick(line, 'ItemCode', 'itemCode')}|${pick(line, 'RFIDCode', 'rfidCode')}`
  );

const lineItemCode = (line) => pick(line, 'ItemCode', 'itemCode') || '—';
const lineRfid = (line) => pick(line, 'RFIDCode', 'RFIDNumber', 'rfidCode') || '—';
const lineDesign = (line) => pick(line, 'DesignName', 'DesignNo', 'designName', 'Design', 'DesignId') || '—';
const lineCategory = (line) => pick(line, 'CategoryName', 'categoryName', 'Category', 'category_id') || '—';
const lineProduct = (line) => pick(line, 'ProductName', 'productName', 'Product', 'product_id') || '—';
const lineGrossWt = (line) => formatWeight3(line?.GrossWt ?? line?.grosswt ?? line?.TWt ?? 0);
const lineNetWt = (line) => formatWeight3(line?.NetWt ?? line?.netwt ?? 0);
// Pieces field displays MRP value from API response (MRP key)
const linePieces = (line) => {
  const v = line?.MRP ?? line?.mrp ?? line?.MRPAmount ?? line?.Mrp ?? line?.FixedAmt ?? 0;
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};

const formatPiecesValue = (value) => {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const lineImageUrl = (line) => {
  const raw = String(
    line?.ImageUrl ??
      line?.ImageURL ??
      line?.ImagePath ??
      line?.PhotoUrl ??
      line?.Photo ??
      line?.ProductImage ??
      ''
  ).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${getRrgoldApiBaseUrl().replace(/\/$/, '')}/${raw.replace(/^\/+/, '')}`;
};

const parseLotDetailResponse = (data) => {
  if (!data || typeof data !== 'object') {
    return { lot: null, items: [], activityLog: [] };
  }
  const lot =
    data.data ?? data.Data ?? data.lot ?? data.Lot ?? data.header ?? data.Header ?? data;
  const items = normalizeList(lot?.Items ?? lot?.items ?? data?.Items ?? data?.items ?? []);
  const activityLog = normalizeList(
    lot?.ActivityLog ?? lot?.activityLog ?? data?.ActivityLog ?? data?.activityLog ?? []
  );
  return { lot: lot && typeof lot === 'object' ? lot : null, items, activityLog };
};

const summarizeItems = (items) => {
  let gross = 0;
  let net = 0;
  let pieces = 0;
  (items || []).forEach((line) => {
    gross += parseFloat(line?.GrossWt ?? line?.grosswt ?? 0) || 0;
    net += parseFloat(line?.NetWt ?? line?.netwt ?? 0) || 0;
    pieces += linePieces(line);
  });
  return { count: (items || []).length, gross, net, pieces };
};

const lotStatusStyle = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('pending')) return { bg: '#fef3c7', fg: '#b45309', bd: '#fde68a' };
  if (s.includes('partial')) return { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' };
  if (s.includes('open')) return { bg: '#ecfdf5', fg: '#047857', bd: '#bbf7d0' };
  return { bg: '#f1f5f9', fg: '#475569', bd: '#e2e8f0' };
};

const lotNo = (lot) =>
  pick(lot, 'SampleLotNo', 'sampleLotNo', 'LotNumber', 'lotNumber', 'SampleOutNo') || '—';

const lotPreviewItemCode = (lot) =>
  pick(lot, 'PreviewItemCode', 'previewItemCode', 'FirstItemCode', 'firstItemCode') ||
  (Array.isArray(lot?.Items) && lot.Items[0]
    ? pick(lot.Items[0], 'ItemCode', 'itemCode')
    : '');

const lotListGrossWt = (lot) => {
  const direct = pick(lot, 'TotalGrossWt', 'totalGrossWt', 'GrossWt', 'grossWt');
  if (direct) return formatWeight3(direct);
  if (Array.isArray(lot?.Items) && lot.Items.length) {
    return formatWeight3(summarizeItems(lot.Items).gross);
  }
  return '—';
};

const lotListPieces = (lot) => {
  const direct = pick(lot, 'TotalPieces', 'totalPieces', 'TotalMRP', 'totalMrp');
  if (direct) return formatPiecesValue(direct);
  if (Array.isArray(lot?.Items) && lot.Items.length) {
    return formatPiecesValue(summarizeItems(lot.Items).pieces);
  }
  return '—';
};

const lotCountField = (lot, ...keys) => {
  for (const k of keys) {
    const v = lot?.[k];
    if (v !== undefined && v !== null && v !== '') return Number(v) || 0;
  }
  return null;
};

const lotPendingItems = (lot) =>
  lotCountField(lot, 'PendingItems', 'pendingItems', 'RemainingOutItems', 'remainingOutItems');

const lotReturnedItems = (lot) => lotCountField(lot, 'ReturnedItems', 'returnedItems');

const lotTotalItems = (lot) =>
  lotCountField(lot, 'TotalItems', 'totalItems', 'ItemCount', 'itemCount');

const isPartialOutLot = (lot) => {
  const status = String(pick(lot, 'LotStatus', 'lotStatus', 'Status', 'status')).toLowerCase();
  if (status.includes('partial')) return true;
  const pending = lotPendingItems(lot);
  const returned = lotReturnedItems(lot);
  const total = lotTotalItems(lot);
  if (pending != null && returned != null && pending > 0 && returned > 0) return true;
  if (total != null && pending != null && returned != null && pending > 0 && pending < total) return true;
  return false;
};

const formatLotStatusLabel = (status) => {
  const s = String(status || '').trim();
  if (!s) return '—';
  const known = {
    PendingAcceptance: 'Pending acceptance',
    Open: 'Open',
    PartialReturned: 'Partial returned',
    PartiallyReturned: 'Partially returned',
    Closed: 'Closed',
  };
  return known[s] || s.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
};

const SampleLoadingPanel = ({ title, message }) => (
  <div
    style={{
      padding: '56px 24px',
      textAlign: 'center',
      background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
      borderRadius: 16,
      border: '1px solid #e2e8f0',
      boxShadow: '0 8px 24px rgba(15, 76, 129, 0.06)',
    }}
  >
    <div
      style={{
        width: 64,
        height: 64,
        margin: '0 auto 20px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 14px rgba(15, 76, 129, 0.12)',
      }}
    >
      <FaSpinner
        size={28}
        style={{ color: '#0f4c81', animation: 'spin 0.9s linear infinite' }}
      />
    </div>
    <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{title}</h3>
    <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5, maxWidth: 360, marginInline: 'auto' }}>
      {message}
    </p>
  </div>
);

const StatusBadge = ({ status }) => {
  const st = lotStatusStyle(status);
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        padding: '3px 8px',
        borderRadius: 6,
        background: st.bg,
        color: st.fg,
        border: `1px solid ${st.bd}`,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}
    >
      {formatLotStatusLabel(status)}
    </span>
  );
};

const ItemSampleCard = ({ line, selected, onToggle, selectable }) => {
  const itemCode = lineItemCode(line);
  const rfid = lineRfid(line);
  const design = lineDesign(line);
  const category = lineCategory(line);
  const product = lineProduct(line);
  const pieces = formatPiecesValue(linePieces(line));
  const status = pick(line, 'ItemStatus', 'itemStatus') || '—';

  const lookupKeys = getItemImageLookupKeys({
    ...line,
    ItemCode: itemCode === '—' ? '' : itemCode,
    RFIDCode: rfid === '—' ? '' : rfid,
    DesignName: design === '—' ? '' : design,
  });
  const dot = <span style={{ color: '#cbd5e1', margin: '0 4px' }}>·</span>;

  // Status Badge style helper
  const getLineStatusStyle = (s) => {
    const statusLower = String(s || '').toLowerCase();
    if (statusLower === 'pending' || statusLower.includes('pending')) {
      return { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
    }
    if (statusLower === 'out' || statusLower === 'sampleout') {
      return { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
    }
    if (statusLower === 'returned' || statusLower === 'in' || statusLower.includes('return')) {
      return { background: '#ecfdf5', color: '#047857', border: '1px solid #bbf7d0' };
    }
    return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
  };

  const statusStyle = getLineStatusStyle(status);

  return (
    <article
      style={{
        border: `2px solid ${selected ? '#0f4c81' : '#e2e8f0'}`,
        borderRadius: 12,
        background: selected ? '#f8fafc' : '#fff',
        overflow: 'hidden',
        boxShadow: selected ? '0 4px 14px rgba(15,76,129,0.12)' : '0 2px 12px rgba(15,23,42,0.06)',
        display: 'flex',
        flexDirection: 'column',
        cursor: selectable ? 'pointer' : 'default',
      }}
      onClick={() => selectable && onToggle?.()}
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
        <span style={{ fontSize: 11, fontWeight: 800, color: '#0f4c81' }}>{itemCode}</span>
        {selectable ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle?.()}
            onClick={(e) => e.stopPropagation()}
            style={{ width: 16, height: 16, accentColor: '#0f4c81' }}
          />
        ) : null}
      </div>
      <div
        style={{
          width: '100%',
          height: 300,
          background: '#ffffff',
          borderBottom: '1px solid #edf2f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 14px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <GridItemImage
          src={lineImageUrl(line)}
          itemCode={itemCode === '—' ? '' : itemCode}
          lookupKeys={lookupKeys}
          alt={itemCode}
          wrapperStyle={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>No image</div>
          }
        />
      </div>
      <div style={{ padding: '10px 12px 12px', fontSize: 11, lineHeight: 1.5, color: '#0f172a' }}>
        <div
          style={{
            fontWeight: 800,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 4,
          }}
          title={`Category: ${category} | Product: ${product} | RFID: ${rfid} | Design: ${design}`}
        >
          <span style={{ color: '#475569' }}>Category:</span> {category}
          {dot}
          <span style={{ color: '#475569' }}>Product:</span> {product}
          {dot}
          <span style={{ color: '#475569' }}>RFID:</span> {rfid}
          {dot}
          <span style={{ color: '#475569' }}>Design:</span> {design}
        </div>
        <div
          style={{
            fontWeight: 800,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <span>
            <strong>Gross Wt:</strong> {lineGrossWt(line)}
          </span>
          <span style={{ color: '#cbd5e1' }}>·</span>
          <span>
            <strong>Net Wt:</strong> {lineNetWt(line)}
          </span>
          <span style={{ color: '#cbd5e1' }}>·</span>
          <span>
            <strong>Pieces:</strong> {pieces}
          </span>
          <span style={{ color: '#cbd5e1' }}>·</span>
          <span style={{ color: '#64748b', fontWeight: 700 }}>Status:</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              background: statusStyle.background,
              color: statusStyle.color,
              border: statusStyle.border,
            }}
          >
            {status}
          </span>
        </div>
      </div>
    </article>
  );
};

const MyAssignedSamples = () => {
  const { setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const clientCode = getClientCode();
  const [lots, setLots] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PendingAcceptance');
  const [detailLot, setDetailLot] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedLineKeys, setSelectedLineKeys] = useState(() => new Set());
  const [acceptRemark, setAcceptRemark] = useState('OK');
  const [accepting, setAccepting] = useState(false);
  const [lotPreviewCodes, setLotPreviewCodes] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPage, setItemPage] = useState(1);
  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    warmupLocalItemImageIndex().catch(() => {});
  }, []);

  useEffect(() => {
    const onResize = () => setIsSmallScreen(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadLots = useCallback(async () => {
    if (!clientCode) {
      setLots([]);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    try {
      const { data } = await axios.get(getMyAssignedLotsUrl(clientCode, statusFilter), {
        headers: sampleAuthHeaders(),
      });
      if (data?.success === false) {
        throw new Error(data?.message || data?.Message || 'Failed to load assigned lots');
      }
      const rows = normalizeList(data?.lots ?? data?.Lots ?? data?.data ?? data);
      setLots(rows);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        err?.message ||
        'Could not load assigned samples';
      toast.error(msg, { position: 'top-right', autoClose: 6000, theme: 'colored' });
      setLots([]);
    } finally {
      setListLoading(false);
    }
  }, [clientCode, statusFilter]);

  useEffect(() => {
    loadLots();
  }, [loadLots]);

  // Reset pagination when status filter or lots change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, lots.length]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(lots.length / LOTS_PER_PAGE));
  }, [lots.length]);

  const paginatedLots = useMemo(() => {
    const start = (currentPage - 1) * LOTS_PER_PAGE;
    return lots.slice(start, start + LOTS_PER_PAGE);
  }, [lots, currentPage]);

  useEffect(() => {
    if (!clientCode || !paginatedLots.length) return undefined;

    let cancelled = false;
    (async () => {
      const next = { ...lotPreviewCodes };
      let changed = false;
      for (let i = 0; i < paginatedLots.length; i += 1) {
        const lot = paginatedLots[i];
        const lotId = pick(lot, 'LotId', 'lotId', 'Id', 'id');
        const key = lotId || `idx-${i}`;
        if (next[key]) continue;

        const inlineCode = lotPreviewItemCode(lot);
        if (inlineCode) {
          next[key] = inlineCode;
          changed = true;
          continue;
        }
        if (!lotId) continue;
        try {
          // eslint-disable-next-line no-await-in-loop
          const { data } = await axios.get(getLotByIdUrl(clientCode, lotId), {
            headers: sampleAuthHeaders(),
          });
          const { items } = parseLotDetailResponse(data);
          const code = items[0] ? lineItemCode(items[0]) : '';
          if (code && code !== '—') {
            next[key] = code;
            changed = true;
          }
        } catch {
          /* preview optional */
        }
      }
      if (!cancelled && changed) setLotPreviewCodes(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [paginatedLots, clientCode]);

  const closeDetail = () => {
    if (accepting) return;
    setDetailLot(null);
    setDetailItems([]);
    setSelectedLineKeys(new Set());
    setItemPage(1);
  };

  const openDetail = async (lot) => {
    const lotId = pick(lot, 'LotId', 'lotId', 'Id', 'id');
    if (!lotId || !clientCode) return;
    setDetailLot(lot);
    setDetailItems([]);
    setSelectedLineKeys(new Set());
    setItemPage(1);
    setDetailLoading(true);
    try {
      const { data } = await axios.get(getLotByIdUrl(clientCode, lotId), {
        headers: sampleAuthHeaders(),
      });
      if (data?.success === false) {
        throw new Error(data?.message || data?.Message || 'Could not load lot detail');
      }
      const { lot: body, items } = parseLotDetailResponse(data);
      setDetailLot(body || lot);
      setDetailItems(items);
      setSelectedLineKeys(new Set(items.map((line) => lineKey(line))));
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Could not load lot detail');
      closeDetail();
    } finally {
      setDetailLoading(false);
    }
  };

  const detailSummary = useMemo(() => summarizeItems(detailItems), [detailItems]);
  const selectedCount = selectedLineKeys.size;
  const allSelected = detailItems.length > 0 && selectedCount === detailItems.length;
  const canAcceptLot =
    pick(detailLot, 'LotStatus', 'lotStatus', 'Status') === 'PendingAcceptance' ||
    pick(detailLot, 'LotStatus', 'lotStatus', 'Status') === 'pendingAcceptance';

  // Item pagination inside detail view
  const totalItemPages = useMemo(() => {
    return Math.max(1, Math.ceil(detailItems.length / ITEMS_PER_PAGE));
  }, [detailItems.length]);

  const paginatedItems = useMemo(() => {
    const start = (itemPage - 1) * ITEMS_PER_PAGE;
    return detailItems.slice(start, start + ITEMS_PER_PAGE);
  }, [detailItems, itemPage]);

  const toggleLine = (line) => {
    const key = lineKey(line);
    setSelectedLineKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllLines = () => {
    setSelectedLineKeys(new Set(detailItems.map((line) => lineKey(line))));
  };

  const clearLineSelection = () => {
    setSelectedLineKeys(new Set());
  };

  const acceptLot = async (mode = 'all') => {
    const lotId = pick(detailLot, 'LotId', 'lotId', 'Id', 'id');
    if (!lotId || !clientCode) return;

    const selectedLines =
      mode === 'all'
        ? detailItems
        : detailItems.filter((line) => selectedLineKeys.has(lineKey(line)));

    if (!selectedLines.length) {
      toast.warn('Select at least one item to accept.', { position: 'top-right' });
      return;
    }

    const isPartial = mode === 'selected' && selectedLines.length < detailItems.length;

    setAccepting(true);
    setLoading(true);
    try {
      const payload = {
        ClientCode: clientCode,
        LotId: Number(lotId),
        AcceptedRemark: String(acceptRemark || '').trim() || 'OK',
      };

      if (isPartial) {
        payload.Items = selectedLines.map((line) => ({
          LabelledStockId:
            parseInt(pick(line, 'LabelledStockId', 'labelledStockId'), 10) || undefined,
          ItemCode: pick(line, 'ItemCode', 'itemCode') || undefined,
          Id: parseInt(pick(line, 'Id', 'id'), 10) || undefined,
        }));
        payload.AcceptPartial = true;
      }

      const { data } = await axios.post(getAcceptLotUrl(), payload, {
        headers: sampleAuthHeaders(),
      });
      if (data?.success === false) {
        throw new Error(data?.message || data?.Message || 'Accept failed');
      }
      addNotification({
        type: 'success',
        title: isPartial ? 'Items accepted' : 'Lot accepted',
        message:
          data?.message ||
          data?.Message ||
          (isPartial
            ? `${selectedLines.length} item(s) accepted.`
            : 'You now have custody of this sample lot.'),
      });
      closeDetail();
      setAcceptRemark('OK');
      await loadLots();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Could not accept lot';
      addNotification({ type: 'error', title: 'Accept failed', message: msg });
      if (isPartial && /partial|item|not support/i.test(msg)) {
        toast.info('Partial accept may not be supported — try Accept complete lot.', {
          position: 'top-right',
          autoClose: 7000,
        });
      }
    } finally {
      setAccepting(false);
      setLoading(false);
    }
  };

  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      for (let p = 1; p <= totalPages; p += 1) pages.push(p);
      return pages;
    }
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let p = start; p <= end; p += 1) pages.push(p);
    return pages;
  }, [currentPage, totalPages]);

  const itemPageNumbers = useMemo(() => {
    const pages = [];
    const maxButtons = 5;
    if (totalItemPages <= maxButtons) {
      for (let p = 1; p <= totalItemPages; p += 1) pages.push(p);
      return pages;
    }
    let start = Math.max(1, itemPage - 2);
    let end = Math.min(totalItemPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let p = start; p <= end; p += 1) pages.push(p);
    return pages;
  }, [itemPage, totalItemPages]);

  return (
    <div style={{ padding: '12px 16px 24px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Main View vs Detail View */}
      {!detailLot ? (
        <>
          {/* Single Line Header & Filters */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12,
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaInbox size={20} style={{ color: '#0f4c81' }} />
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                My assigned samples
              </h1>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#334155',
                }}
              >
                <option value="PendingAcceptance">Pending acceptance</option>
                <option value="Open">Open (out)</option>
                <option value="PartialReturned">Partial returned</option>
                <option value="Closed">Closed</option>
                <option value="">All statuses</option>
              </select>
              <button
                type="button"
                onClick={loadLots}
                disabled={listLoading}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontWeight: 700,
                  fontSize: 12,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                Refresh
              </button>
              {!listLoading && lots.length > 0 ? (
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>
                  {lots.length} lot{lots.length === 1 ? '' : 's'} · Page {currentPage} of {totalPages}
                </span>
              ) : null}
            </div>
          </div>

          {/* Lots List Grid */}
          {listLoading ? (
            <SampleLoadingPanel
              title="Loading your assigned samples"
              message="Fetching sample lots assigned to you. This may take a few seconds."
            />
          ) : lots.length === 0 ? (
            <div
              style={{
                padding: 48,
                textAlign: 'center',
                color: '#64748b',
                maxWidth: 420,
                margin: '0 auto',
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
              }}
            >
              <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#334155' }}>No lots found</p>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
                {statusFilter === 'PendingAcceptance'
                  ? 'Nothing pending acceptance for your login. Try “All statuses”, or ask admin to assign Sample Out to this employee login.'
                  : statusFilter === 'PartialReturned'
                    ? 'No partially returned lots for your login. Items still out will appear here after some tags are returned via Sample In.'
                    : 'No sample lots match this filter for your account.'}
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isSmallScreen
                    ? 'repeat(2, minmax(0, 1fr))'
                    : `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
                  gap: 14,
                }}
              >
                {paginatedLots.map((lot, idx) => {
                  const id = pick(lot, 'LotId', 'lotId', 'Id', 'id') || idx;
                  const status = pick(lot, 'LotStatus', 'lotStatus', 'Status', 'status');
                  const canAccept =
                    status === 'PendingAcceptance' || status === 'pendingAcceptance';
                  const no = lotNo(lot);
                  const previewCode = lotPreviewCodes[id] || lotPreviewItemCode(lot);
                  const lookupKeys = previewCode
                    ? getItemImageLookupKeys({ ItemCode: previewCode, Itemcode: previewCode })
                    : [];
                  const itemCount =
                    lotTotalItems(lot) ??
                    (pick(lot, 'ItemCount', 'itemCount', 'TotalItems', 'totalItems') || '—');
                  const pendingCount = lotPendingItems(lot);
                  const returnedCount = lotReturnedItems(lot);
                  const partialOut = isPartialOutLot(lot);
                  const assignee =
                    pick(lot, 'AssignedToUserName', 'assignedToUserName') ||
                    pick(lot, 'PartyName', 'partyName') ||
                    '—';

                  return (
                    <article
                      key={id}
                      style={{
                        border: partialOut ? '1px solid #fdba74' : '1px solid #e2e8f0',
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
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderBottom: '1px solid #f1f5f9',
                          background: '#fafafa',
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#0f4c81' }}>{no}</span>
                        <StatusBadge status={status} />
                      </div>

                      <GridItemImage
                        src=""
                        itemCode={previewCode}
                        lookupKeys={lookupKeys}
                        alt={no}
                        wrapperStyle={{
                          width: '100%',
                          height: 300, // Big image section
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
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 8,
                              color: '#94a3b8',
                            }}
                          >
                            <FaInbox size={28} style={{ opacity: 0.5 }} />
                            <span style={{ fontSize: 11, fontWeight: 700 }}>No image</span>
                          </div>
                        }
                      />

                      <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* 2-line small bold text details section */}
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', lineHeight: 1.55, marginBottom: 10 }}>
                          <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginBottom: 2 }}>
                            <span style={{ color: '#64748b' }}>Lot:</span> {no} · <span style={{ color: '#64748b' }}>Emp:</span> {assignee} · <span style={{ color: '#64748b' }}>Party:</span> {pick(lot, 'PartyName', 'partyName') || '—'}
                          </div>
                          <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#64748b' }}>Out:</span> {formatDate(pick(lot, 'SampleOutDate', 'sampleOutDate', 'OutDate'))} · <span style={{ color: '#64748b' }}>Items:</span> {itemCount} · <span style={{ color: '#64748b' }}>Gr:</span> {lotListGrossWt(lot)} · <span style={{ color: '#64748b' }}>Pcs:</span> {lotListPieces(lot)}
                          </div>
                          {(partialOut || pendingCount != null || returnedCount != null) && (
                            <div
                              style={{
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                marginTop: 2,
                                color: partialOut ? '#9a3412' : '#64748b',
                              }}
                            >
                              <span style={{ color: '#64748b' }}>Pending out:</span>{' '}
                              {pendingCount != null ? pendingCount : '—'}
                              {' · '}
                              <span style={{ color: '#64748b' }}>Returned:</span>{' '}
                              {returnedCount != null ? returnedCount : '—'}
                              {partialOut ? ' · Partial out' : ''}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => openDetail(lot)}
                          style={{
                            marginTop: 'auto',
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: 'none',
                            background: canAccept
                              ? 'linear-gradient(135deg, #0f4c81 0%, #1e40af 100%)'
                              : '#475569',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          {canAccept ? 'Review & accept' : 'View details'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div
                  style={{
                    marginTop: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '6px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      color: currentPage === 1 ? '#cbd5e1' : '#475569',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Previous
                  </button>
                  {pageNumbers.map((page) => (
                    <button
                      key={`main-page-${page}`}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: '6px 11px',
                        minWidth: 34,
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        background: currentPage === page ? '#0f4c81' : '#fff',
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
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '6px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      color: currentPage === totalPages ? '#cbd5e1' : '#475569',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* NEW PAGE DETAIL VIEW (No Popup/Modal) */
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: '16px 20px 20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Detail Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 12,
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={closeDetail}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#94a3b8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
              >
                <FaArrowLeft /> Back
              </button>
              <div>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  Sample Lot Review — {lotNo(detailLot)}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <StatusBadge status={pick(detailLot, 'LotStatus', 'lotStatus', 'Status')} />
                  {(!detailLoading && (pick(detailLot, 'IsOverdue', 'isOverdue') === true || pick(detailLot, 'IsOverdue', 'isOverdue') === 'true')) && (
                    <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>
                      · Overdue — expected return was {formatDate(pick(detailLot, 'ExpectedReturnDate', 'expectedReturnDate'))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {detailLoading ? (
            <SampleLoadingPanel
              title="Loading lot details"
              message="Fetching item images, weights, and acceptance details for this sample lot."
            />
          ) : (
            <>
              {/* Top Summary Stats Bar - Plain Text Style */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: '1px solid #f1f5f9',
                  lineHeight: 1.6,
                }}
              >
                Products: <strong style={{ color: '#0f4c81' }}>{detailSummary.count || pick(detailLot, 'TotalItems', 'totalItems') || 0}</strong>
                <span style={{ color: '#cbd5e1', margin: '0 8px' }}>·</span>
                Total Gross Wt: <strong style={{ color: '#0f172a' }}>{formatWeight3(detailSummary.gross)}</strong>
                <span style={{ color: '#cbd5e1', margin: '0 8px' }}>·</span>
                Total Net Wt: <strong style={{ color: '#0f172a' }}>{formatWeight3(detailSummary.net)}</strong>
                <span style={{ color: '#cbd5e1', margin: '0 8px' }}>·</span>
                Total Pieces: <strong style={{ color: '#0f172a' }}>{formatPiecesValue(detailSummary.pieces)}</strong>
                <span style={{ color: '#cbd5e1', margin: '0 8px' }}>·</span>
                Out Date: <strong style={{ color: '#0f172a' }}>{formatDate(pick(detailLot, 'SampleOutDate', 'sampleOutDate'))}</strong>
                <span style={{ color: '#cbd5e1', margin: '0 8px' }}>·</span>
                Employee: <strong style={{ color: '#0f172a' }}>{pick(detailLot, 'AssignedToUserName', 'assignedToUserName') || pick(detailLot, 'PartyName', 'partyName') || '—'}</strong>
                {(lotPendingItems(detailLot) != null || lotReturnedItems(detailLot) != null) && (
                  <>
                    <span style={{ color: '#cbd5e1', margin: '0 8px' }}>·</span>
                    Pending out:{' '}
                    <strong style={{ color: isPartialOutLot(detailLot) ? '#b45309' : '#0f172a' }}>
                      {lotPendingItems(detailLot) ?? '—'}
                    </strong>
                    <span style={{ color: '#cbd5e1', margin: '0 8px' }}>·</span>
                    Returned: <strong style={{ color: '#0f172a' }}>{lotReturnedItems(detailLot) ?? '—'}</strong>
                  </>
                )}
              </div>

              {/* Items Section */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#334155' }}>
                    Lot Items ({detailItems.length})
                  </h3>
                  {canAcceptLot && detailItems.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={selectAllLines}
                        disabled={allSelected}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#475569',
                          cursor: allSelected ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Select all ({detailItems.length})
                      </button>
                      <button
                        type="button"
                        onClick={clearLineSelection}
                        disabled={selectedCount === 0}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#475569',
                          cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Clear selection
                      </button>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#0f4c81' }}>
                        {selectedCount} of {detailItems.length} selected
                      </span>
                    </div>
                  )}
                </div>

                {detailItems.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 24 }}>No line items in this lot.</p>
                ) : (
                  <>
                    {/* Item Cards Grid (3 per row, 6 per page) */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isSmallScreen
                          ? 'repeat(2, minmax(0, 1fr))'
                          : 'repeat(3, minmax(0, 1fr))',
                        gap: 14,
                      }}
                    >
                      {paginatedItems.map((line, i) => (
                        <ItemSampleCard
                          key={lineKey(line) || i}
                          line={line}
                          selected={selectedLineKeys.has(lineKey(line))}
                          onToggle={() => toggleLine(line)}
                          selectable={canAcceptLot}
                        />
                      ))}
                    </div>

                    {/* Item Pagination Controls */}
                    {totalItemPages > 1 && (
                      <div
                        style={{
                          marginTop: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setItemPage((p) => Math.max(1, p - 1))}
                          disabled={itemPage === 1}
                          style={{
                            padding: '6px 12px',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            background: '#fff',
                            color: itemPage === 1 ? '#cbd5e1' : '#475569',
                            cursor: itemPage === 1 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Previous
                        </button>
                        {itemPageNumbers.map((page) => (
                          <button
                            key={`item-page-${page}`}
                            type="button"
                            onClick={() => setItemPage(page)}
                            style={{
                              padding: '6px 11px',
                              minWidth: 34,
                              fontSize: 11,
                              fontWeight: 700,
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                              background: itemPage === page ? '#0f4c81' : '#fff',
                              color: itemPage === page ? '#fff' : '#475569',
                              cursor: 'pointer',
                            }}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setItemPage((p) => Math.min(totalItemPages, p + 1))}
                          disabled={itemPage === totalItemPages}
                          style={{
                            padding: '6px 12px',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            background: '#fff',
                            color: itemPage === totalItemPages ? '#cbd5e1' : '#475569',
                            cursor: itemPage === totalItemPages ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Next
                        </button>
                      </div>
                    )}

                    {/* Acceptance Actions Panel (Moved below item cards for space) */}
                    {canAcceptLot && detailItems.length > 0 && (
                      <div
                        style={{
                          marginTop: 24,
                          paddingTop: 16,
                          borderTop: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ marginRight: 'auto', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                          Selected items to accept: <span style={{ color: '#0f4c81', fontSize: 14 }}>{selectedCount}</span> of {detailItems.length}
                        </div>
                        <input
                          value={acceptRemark}
                          onChange={(e) => setAcceptRemark(e.target.value)}
                          placeholder="Acceptance remark..."
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid #cbd5e1',
                            fontSize: 12,
                            fontWeight: 600,
                            width: 200,
                            height: 36,
                            boxSizing: 'border-box',
                          }}
                        />
                        <button
                          type="button"
                          disabled={accepting || selectedCount === 0}
                          onClick={() => acceptLot('selected')}
                          style={{
                            height: 36,
                            padding: '0 16px',
                            borderRadius: 8,
                            border: '1px solid #0f4c81',
                            background: '#fff',
                            color: '#0f4c81',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: accepting || selectedCount === 0 ? 'not-allowed' : 'pointer',
                            opacity: accepting || selectedCount === 0 ? 0.6 : 1,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          Accept Selected ({selectedCount})
                        </button>
                        <button
                          type="button"
                          disabled={accepting}
                          onClick={() => acceptLot('all')}
                          style={{
                            height: 36,
                            padding: '0 16px',
                            borderRadius: 8,
                            border: 'none',
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: accepting ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 2px 4px rgba(5,150,105,0.2)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <FaCheckCircle />
                          Accept Complete Lot
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default MyAssignedSamples;
