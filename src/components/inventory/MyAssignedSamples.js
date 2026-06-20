import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  FaArrowLeft,
  FaBox,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaInbox,
  FaSpinner,
  FaUser,
  FaWeight,
} from 'react-icons/fa';
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
import {
  getItemImageLookupKeys,
  resolveLocalItemImageBlobUrl,
  warmupLocalItemImageIndex,
} from '../../services/localItemImageService';
import { getClientCode } from '../../utils/authState';
import { normalizeList } from '../../services/rfidUserManagementApi';

const GRID_COLUMNS = 3;
const LOTS_PER_PAGE = 6;
const ITEMS_PER_PAGE = 6;
const LOT_CARD_IMAGE_HEIGHT = 380;

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

const lotPreviewLinesFromLot = (lot) => {
  if (Array.isArray(lot?.Items) && lot.Items.length) {
    return lot.Items.filter((line) => {
      const code = lineItemCode(line);
      return code && code !== '—';
    });
  }
  const single = lotPreviewItemCode(lot);
  return single && single !== '—' ? [{ ItemCode: single, itemCode: single }] : [];
};

const lineHasImageHints = (line) =>
  Boolean(
    lineImageUrl(line) ||
      pick(
        line,
        'DesignId',
        'design_id',
        'DesignID',
        'DesignCode',
        'designCode',
        'DesignName',
        'designName',
        'Design',
        'design',
        'ImageUrl',
        'ImageURL',
        'ImagePath'
      )
  );

const getPreviewLineLookupKeys = (line) => {
  const itemCode = lineItemCode(line);
  const rfid = lineRfid(line);
  const design = lineDesign(line);
  return getItemImageLookupKeys({
    ...line,
    ItemCode: itemCode === '—' ? '' : itemCode,
    Itemcode: itemCode === '—' ? '' : itemCode,
    RFIDCode: rfid === '—' ? '' : rfid,
    DesignName: design === '—' ? '' : design,
    Design: design === '—' ? '' : design,
  });
};

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
    PartialReturned: 'Partial return',
    PartiallyReturned: 'Partial return',
    PartialReturn: 'Partial return',
    Closed: 'Closed',
  };
  return known[s] || s.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
};

const formatItemStatusLabel = (status) => {
  const s = String(status || '').trim();
  if (!s || s === '—') return '—';
  const known = {
    Out: 'Out',
    SampleOut: 'Out',
    Returned: 'Returned',
    In: 'Returned',
    SampleIn: 'Returned',
    Pending: 'Pending',
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

const StatusBadge = ({ status, size = 'md' }) => {
  const st = lotStatusStyle(status);
  const isXl = size === 'xl';
  const isLarge = size === 'lg' || isXl;
  return (
    <span
      style={{
        fontSize: isXl ? 13 : isLarge ? 12 : 11,
        fontWeight: 700,
        padding: isXl ? '6px 14px' : isLarge ? '5px 12px' : '4px 10px',
        borderRadius: 999,
        background: st.bg,
        color: st.fg,
        letterSpacing: '0.04em',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {formatLotStatusLabel(status)}
    </span>
  );
};

const DetailStatChip = ({ label, value, accent = '#0f172a' }) => (
  <div style={{ minWidth: 0 }}>
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 4,
        lineHeight: 1.2,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 17,
        fontWeight: 700,
        color: accent,
        fontVariantNumeric: 'tabular-nums',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
      title={String(value)}
    >
      {value}
    </div>
  </div>
);

const PaginationBar = ({ currentPage, totalPages, pageNumbers, onPrev, onNext, onPage }) => {
  if (totalPages <= 1) return null;
  return (
    <div
      style={{
        marginTop: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={currentPage === 1}
        style={{
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 700,
          borderRadius: 10,
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
          key={`page-${page}`}
          type="button"
          onClick={() => onPage(page)}
          style={{
            padding: '8px 12px',
            minWidth: 38,
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 10,
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
        onClick={onNext}
        disabled={currentPage === totalPages}
        style={{
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 700,
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          background: '#fff',
          color: currentPage === totalPages ? '#cbd5e1' : '#475569',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
        }}
      >
        Next
      </button>
    </div>
  );
};

const LOT_SLIDER_AUTO_MS = 4500;

const LotImageSlider = ({ lines, alt, height = LOT_CARD_IMAGE_HEIGHT }) => {
  const previewLines = Array.isArray(lines) ? lines.filter(Boolean) : [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const hasMultiple = previewLines.length > 1;
  const safeIndex = previewLines.length ? index % previewLines.length : 0;
  const currentLine = previewLines[safeIndex] || null;
  const currentCode = currentLine ? lineItemCode(currentLine) : '';
  const lookupKeys = currentLine ? getPreviewLineLookupKeys(currentLine) : [];
  const imageSrc = currentLine ? lineImageUrl(currentLine) : '';
  const linesKey = previewLines.map((line) => lineKey(line)).join('|');

  useEffect(() => {
    setIndex(0);
  }, [linesKey]);

  useEffect(() => {
    if (!hasMultiple || paused) return undefined;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % previewLines.length);
    }, LOT_SLIDER_AUTO_MS);
    return () => window.clearInterval(timer);
  }, [hasMultiple, paused, previewLines.length, linesKey]);

  useEffect(() => {
    if (!previewLines.length) return undefined;
    let cancelled = false;
    const preload = async () => {
      const offsets = hasMultiple ? [0, 1, -1] : [0];
      for (let o = 0; o < offsets.length; o += 1) {
        if (cancelled) return;
        const line = previewLines[(safeIndex + offsets[o] + previewLines.length) % previewLines.length];
        if (!line) continue;
        const apiSrc = lineImageUrl(line);
        if (apiSrc) {
          const img = new window.Image();
          img.src = apiSrc;
        }
        const keys = getPreviewLineLookupKeys(line);
        for (let k = 0; k < keys.length; k += 1) {
          if (cancelled) return;
          // eslint-disable-next-line no-await-in-loop
          await resolveLocalItemImageBlobUrl(keys[k]);
        }
      }
    };
    preload().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [safeIndex, previewLines, hasMultiple, linesKey]);

  const goPrev = (e) => {
    e?.stopPropagation?.();
    setIndex((i) => (i - 1 + previewLines.length) % previewLines.length);
  };

  const goNext = (e) => {
    e?.stopPropagation?.();
    setIndex((i) => (i + 1) % previewLines.length);
  };

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{
        position: 'relative',
        width: '100%',
        height,
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 55%, #f1f5f9 100%)',
        borderBottom: '1px solid #edf2f7',
        overflow: 'hidden',
      }}
    >
      <GridItemImage
        key={`${linesKey}-${safeIndex}`}
        src={imageSrc}
        itemCode={currentCode === '—' ? '' : currentCode}
        lookupKeys={lookupKeys}
        alt={currentCode || alt}
        eagerLoad
        wrapperStyle={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: hasMultiple ? '16px 52px' : '16px 20px',
          boxSizing: 'border-box',
        }}
        imgStyle={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'center',
          background: 'transparent',
          borderRadius: 12,
        }}
        placeholder={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              color: '#94a3b8',
            }}
          >
            <FaInbox size={36} style={{ opacity: 0.45 }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>No image</span>
          </div>
        }
      />

      {hasMultiple ? (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous product"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 38,
              height: 38,
              borderRadius: '50%',
              border: '1px solid #e2e8f0',
              background: 'rgba(255,255,255,0.95)',
              color: '#0f4c81',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(15,23,42,0.12)',
            }}
          >
            <FaChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next product"
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 38,
              height: 38,
              borderRadius: '50%',
              border: '1px solid #e2e8f0',
              background: 'rgba(255,255,255,0.95)',
              color: '#0f4c81',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(15,23,42,0.12)',
            }}
          >
            <FaChevronRight size={14} />
          </button>
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 999,
              background: 'rgba(15,23,42,0.72)',
              backdropFilter: 'blur(6px)',
            }}
          >
            {previewLines.map((line, dotIdx) => (
              <button
                key={lineKey(line) || `preview-${dotIdx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(dotIdx);
                }}
                aria-label={`Show product ${dotIdx + 1}`}
                style={{
                  width: dotIdx === safeIndex ? 10 : 8,
                  height: dotIdx === safeIndex ? 10 : 8,
                  borderRadius: '50%',
                  border: 'none',
                  padding: 0,
                  background: dotIdx === safeIndex ? '#fff' : 'rgba(255,255,255,0.45)',
                  cursor: 'pointer',
                }}
              />
            ))}
            <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', marginLeft: 4 }}>
              {safeIndex + 1} / {previewLines.length}
            </span>
          </div>
          {currentCode ? (
            <span
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                fontSize: 12,
                fontWeight: 800,
                color: '#0f4c81',
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '4px 10px',
              }}
            >
              {currentCode}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
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

  const lookupKeys = getPreviewLineLookupKeys(line);
  const dot = <span style={{ color: '#cbd5e1', margin: '0 4px' }}>·</span>;

  const getLineStatusStyle = (s) => {
    const statusLower = String(s || '').toLowerCase();
    if (statusLower === 'pending' || statusLower.includes('pending')) {
      return { bar: '#f59e0b', bg: '#fffbeb', fg: '#b45309' };
    }
    if (statusLower === 'out' || statusLower === 'sampleout') {
      return { bar: '#0284c7', bg: '#f0f9ff', fg: '#0369a1' };
    }
    if (statusLower === 'returned' || statusLower === 'in' || statusLower.includes('return')) {
      return { bar: '#059669', bg: '#ecfdf5', fg: '#047857' };
    }
    return { bar: '#94a3b8', bg: '#f8fafc', fg: '#475569' };
  };

  const statusStyle = getLineStatusStyle(status);
  const statusLabel = formatItemStatusLabel(status);

  return (
    <article
      style={{
        border: selected ? '2px solid #0f4c81' : '1px solid #eef2f7',
        borderRadius: 12,
        background: selected ? '#f8fbff' : '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: selectable ? 'pointer' : 'default',
        transition: 'border-color 0.15s ease, background 0.15s ease',
      }}
      onClick={() => selectable && onToggle?.()}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          minHeight: 4,
          background: statusStyle.bar,
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '11px 14px 10px',
          background: statusStyle.bg,
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: statusStyle.fg,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 3,
            }}
          >
            {statusLabel}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {itemCode}
          </div>
        </div>
        {selectable ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle?.()}
            onClick={(e) => e.stopPropagation()}
            style={{ width: 18, height: 18, accentColor: '#0f4c81', cursor: 'pointer', flexShrink: 0 }}
            aria-label={`Select ${itemCode}`}
          />
        ) : null}
      </div>
      <div
        style={{
          width: '100%',
          height: 320,
          background: '#fafbfc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 14px',
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
            background: 'transparent',
          }}
          placeholder={
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>No image</div>
          }
        />
      </div>
      <div
        style={{
          padding: '12px 14px 14px',
          fontSize: 12,
          lineHeight: 1.55,
          color: '#334155',
          borderTop: '1px solid #f1f5f9',
        }}
      >
        <div
          style={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 6,
          }}
          title={`Category: ${category} | Product: ${product} | RFID: ${rfid} | Design: ${design}`}
        >
          <span style={{ color: '#64748b' }}>Category:</span> {category}
          {dot}
          <span style={{ color: '#64748b' }}>Product:</span> {product}
        </div>
        <div
          style={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 6,
          }}
        >
          <span style={{ color: '#64748b' }}>RFID:</span> {rfid}
          {dot}
          <span style={{ color: '#64748b' }}>Design:</span> {design}
        </div>
        <div style={{ fontWeight: 600, color: '#0f172a' }}>
          <span style={{ color: '#64748b' }}>Gross:</span> {lineGrossWt(line)}
          {dot}
          <span style={{ color: '#64748b' }}>Net:</span> {lineNetWt(line)}
          {dot}
          <span style={{ color: '#64748b' }}>Pieces:</span> {pieces}
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
  const [statusFilter, setStatusFilter] = useState('');
  const [detailLot, setDetailLot] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedLineKeys, setSelectedLineKeys] = useState(() => new Set());
  const [acceptRemark, setAcceptRemark] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [lotPreviewLines, setLotPreviewLines] = useState({});
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
      const next = { ...lotPreviewLines };
      let changed = false;
      for (let i = 0; i < paginatedLots.length; i += 1) {
        const lot = paginatedLots[i];
        const lotId = pick(lot, 'LotId', 'lotId', 'Id', 'id');
        const key = lotId || `idx-${i}`;
        if (Array.isArray(next[key]) && next[key].length) continue;

        const inlineLines = lotPreviewLinesFromLot(lot);
        if (inlineLines.length && inlineLines.every(lineHasImageHints)) {
          next[key] = inlineLines;
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
          const lines = items.filter((line) => {
            const code = lineItemCode(line);
            return code && code !== '—';
          });
          if (lines.length) {
            next[key] = lines;
            changed = true;
          }
        } catch {
          /* preview optional */
        }
      }
      if (!cancelled && changed) setLotPreviewLines(next);
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
      setSelectedLineKeys(new Set());
      setAcceptRemark('');
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
        AcceptedRemark: String(acceptRemark || '').trim() || 'Accepted',
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
    <div style={{ padding: '16px 20px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Main View vs Detail View */}
      {!detailLot ? (
        <>
          {/* Single Line Header & Filters */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 14,
              padding: '16px 18px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(15, 76, 129, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #0f4c81 0%, #1e40af 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(15, 76, 129, 0.25)',
                }}
              >
                <FaInbox size={20} style={{ color: '#fff' }} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  My assigned samples
                </h1>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                  Review and accept sample lots assigned to you
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <label style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#334155',
                  background: '#fff',
                  minWidth: 180,
                  cursor: 'pointer',
                }}
              >
                <option value="">All statuses</option>
                <option value="PendingAcceptance">Pending acceptance</option>
                <option value="Open">Open (out)</option>
                <option value="PartialReturned">Partial returned</option>
                <option value="Closed">Closed</option>
              </select>
              <button
                type="button"
                onClick={loadLots}
                disabled={listLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#334155',
                  cursor: listLoading ? 'wait' : 'pointer',
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
                {!statusFilter
                  ? 'No sample lots are assigned to your login yet. Ask admin to assign Sample Out to this employee.'
                  : statusFilter === 'PendingAcceptance'
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
                  gap: 20,
                }}
              >
                {paginatedLots.map((lot, idx) => {
                  const id = pick(lot, 'LotId', 'lotId', 'Id', 'id') || idx;
                  const status = pick(lot, 'LotStatus', 'lotStatus', 'Status', 'status');
                  const canAccept =
                    status === 'PendingAcceptance' || status === 'pendingAcceptance';
                  const no = lotNo(lot);
                  const previewLines =
                    (Array.isArray(lotPreviewLines[id]) && lotPreviewLines[id].length
                      ? lotPreviewLines[id]
                      : lotPreviewLinesFromLot(lot)) || [];
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
                        border: partialOut ? '2px solid #fdba74' : '1px solid #e2e8f0',
                        borderRadius: 16,
                        background: '#fff',
                        overflow: 'hidden',
                        boxShadow: '0 8px 28px rgba(15, 23, 42, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 16px',
                          borderBottom: '1px solid #f1f5f9',
                          background: 'linear-gradient(180deg, #fafbfc 0%, #ffffff 100%)',
                        }}
                      >
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#0f4c81', letterSpacing: '-0.01em' }}>
                          {no}
                        </span>
                        <StatusBadge status={status} size="lg" />
                      </div>

                      <LotImageSlider lines={previewLines} alt={no} height={LOT_CARD_IMAGE_HEIGHT} />

                      <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', lineHeight: 1.6, marginBottom: 12 }}>
                          <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginBottom: 2 }}>
                            <span style={{ color: '#64748b' }}>Lot:</span> {no} · <span style={{ color: '#64748b' }}>Emp:</span> {assignee}
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
                            padding: '12px 16px',
                            borderRadius: 12,
                            border: 'none',
                            background: canAccept
                              ? 'linear-gradient(135deg, #0f4c81 0%, #1e40af 100%)'
                              : '#475569',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            boxShadow: canAccept
                              ? '0 4px 14px rgba(15, 76, 129, 0.28)'
                              : '0 2px 8px rgba(71, 85, 105, 0.2)',
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
        <div
          style={{
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(15, 23, 42, 0.08)',
            background: '#f8fafc',
          }}
        >
          {/* Hero header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0f4c81 0%, #1e3a8a 55%, #1e40af 100%)',
              padding: '20px 24px 24px',
              color: '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, minWidth: 0, flex: '1 1 300px' }}>
                <button
                  type="button"
                  onClick={closeDetail}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '4px 2px',
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <FaArrowLeft /> Back
                </button>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.75)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    Sample Lot Review
                  </p>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 28,
                      fontWeight: 800,
                      color: '#fff',
                      letterSpacing: '-0.03em',
                      lineHeight: 1.15,
                    }}
                  >
                    {lotNo(detailLot)}
                  </h1>
                  <div style={{ marginTop: 12 }}>
                    <StatusBadge status={pick(detailLot, 'LotStatus', 'lotStatus', 'Status')} size="xl" />
                  </div>
                </div>
              </div>
              {canAcceptLot && !detailLoading && detailItems.length > 0 ? (
                <button
                  type="button"
                  disabled={accepting}
                  onClick={() => acceptLot('all')}
                  style={{
                    height: 48,
                    padding: '0 22px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: accepting ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                    flexShrink: 0,
                  }}
                >
                  <FaCheckCircle size={16} />
                  Accept Complete Lot
                </button>
              ) : null}
            </div>
          </div>

          {!detailLoading &&
          (pick(detailLot, 'IsOverdue', 'isOverdue') === true ||
            pick(detailLot, 'IsOverdue', 'isOverdue') === 'true') ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 24px',
                background: 'linear-gradient(90deg, #fef2f2 0%, #fff1f2 100%)',
                borderBottom: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              <FaExclamationTriangle size={16} style={{ flexShrink: 0 }} />
              Overdue — expected return was{' '}
              {formatDate(pick(detailLot, 'ExpectedReturnDate', 'expectedReturnDate'))}
            </div>
          ) : null}

          <div style={{ padding: '20px 24px 28px' }}>
            {detailLoading ? (
              <SampleLoadingPanel
                title="Loading lot details"
                message="Fetching item images, weights, and acceptance details for this sample lot."
              />
            ) : (
              <>
                {/* Stats row — flat, no boxed chips */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isSmallScreen
                      ? 'repeat(2, minmax(0, 1fr))'
                      : 'repeat(auto-fill, minmax(108px, 1fr))',
                    gap: '16px 24px',
                    padding: '4px 0 20px',
                    marginBottom: 8,
                    borderBottom: '1px solid #eef2f7',
                  }}
                >
                  <DetailStatChip
                    label="Products"
                    value={detailSummary.count || pick(detailLot, 'TotalItems', 'totalItems') || 0}
                    accent="#0f4c81"
                  />
                  <DetailStatChip label="Gross Wt" value={formatWeight3(detailSummary.gross)} />
                  <DetailStatChip label="Net Wt" value={formatWeight3(detailSummary.net)} />
                  <DetailStatChip label="Pieces" value={formatPiecesValue(detailSummary.pieces)} />
                  <DetailStatChip
                    label="Out Date"
                    value={formatDate(pick(detailLot, 'SampleOutDate', 'sampleOutDate'))}
                  />
                  <DetailStatChip
                    label="Employee"
                    value={
                      pick(detailLot, 'AssignedToUserName', 'assignedToUserName') ||
                      pick(detailLot, 'PartyName', 'partyName') ||
                      '—'
                    }
                  />
                  {(lotPendingItems(detailLot) != null || lotReturnedItems(detailLot) != null) && (
                    <>
                      <DetailStatChip
                        label="Pending Out"
                        value={lotPendingItems(detailLot) ?? '—'}
                        accent={isPartialOutLot(detailLot) ? '#b45309' : '#0f172a'}
                      />
                      <DetailStatChip
                        label="Returned"
                        value={lotReturnedItems(detailLot) ?? '—'}
                        accent="#047857"
                      />
                    </>
                  )}
                </div>

                {/* Remark card */}
                {canAcceptLot && detailItems.length > 0 ? (
                  <div style={{ marginBottom: 22 }}>
                    <label
                      htmlFor="lot-accept-remark"
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#475569',
                        marginBottom: 8,
                      }}
                    >
                      Description / remark
                    </label>
                    <textarea
                      id="lot-accept-remark"
                      value={acceptRemark}
                      onChange={(e) => setAcceptRemark(e.target.value)}
                      placeholder="Enter acceptance description or remark for this lot (e.g. received in good condition, verified weights, etc.)"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        fontSize: 14,
                        fontWeight: 500,
                        lineHeight: 1.55,
                        color: '#0f172a',
                        resize: 'vertical',
                        minHeight: 88,
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        background: '#fff',
                        outline: 'none',
                      }}
                    />
                  </div>
                ) : null}

                {/* Items section — open layout, no outer box */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16,
                      flexWrap: 'wrap',
                      gap: '12px 20px',
                      paddingBottom: 12,
                      borderBottom: '1px solid #eef2f7',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                        Lot items
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                        {detailItems.length} product{detailItems.length === 1 ? '' : 's'} in this lot
                      </p>
                    </div>
                    {canAcceptLot && detailItems.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          gap: 12,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          fontSize: 13,
                        }}
                      >
                        <button
                          type="button"
                          onClick={selectAllLines}
                          disabled={allSelected}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: '4px 2px',
                            fontWeight: 600,
                            color: allSelected ? '#cbd5e1' : '#0f4c81',
                            cursor: allSelected ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Select all ({detailItems.length})
                        </button>
                        <span style={{ color: '#e2e8f0' }}>|</span>
                        <button
                          type="button"
                          onClick={clearLineSelection}
                          disabled={selectedCount === 0}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: '4px 2px',
                            fontWeight: 600,
                            color: selectedCount === 0 ? '#cbd5e1' : '#0f4c81',
                            cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Clear
                        </button>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>
                          <strong style={{ color: '#0f4c81', fontWeight: 700 }}>{selectedCount}</strong>
                          {' / '}
                          {detailItems.length} selected
                        </span>
                      </div>
                    )}
                  </div>

                  {detailItems.length === 0 ? (
                    <p style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', padding: 32 }}>
                      No line items in this lot.
                    </p>
                  ) : (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isSmallScreen
                            ? 'repeat(2, minmax(0, 1fr))'
                            : 'repeat(3, minmax(0, 1fr))',
                          gap: 16,
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

                      <PaginationBar
                        currentPage={itemPage}
                        totalPages={totalItemPages}
                        pageNumbers={itemPageNumbers}
                        onPrev={() => setItemPage((p) => Math.max(1, p - 1))}
                        onNext={() => setItemPage((p) => Math.min(totalItemPages, p + 1))}
                        onPage={setItemPage}
                      />

                      {canAcceptLot && detailItems.length > 0 && (
                        <div
                          style={{
                            marginTop: 22,
                            paddingTop: 18,
                            borderTop: '1px solid #eef2f7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 14,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                              Ready to accept
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                              {selectedCount} of {detailItems.length} selected
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={accepting || selectedCount === 0}
                            onClick={() => acceptLot('selected')}
                            style={{
                              height: 42,
                              padding: '0 20px',
                              borderRadius: 10,
                              border: 'none',
                              background: '#0f4c81',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: 14,
                              cursor: accepting || selectedCount === 0 ? 'not-allowed' : 'pointer',
                              opacity: accepting || selectedCount === 0 ? 0.5 : 1,
                            }}
                          >
                            Accept selected ({selectedCount})
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default MyAssignedSamples;
