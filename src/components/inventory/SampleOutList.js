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
  FaChevronLeft,
  FaChevronDown,
  FaThLarge,
  FaTable,
  FaInbox,
  FaLayerGroup,
  FaUser,
  FaWeight,
  FaGem,
  FaHourglassHalf,
  FaBoxOpen,
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
import { getRrgoldApiBaseUrl, getSoniApiBaseUrl } from '../../services/apiBaseConfig';
import {
  getItemImageLookupKeys,
  normalizeBaseName,
  resolveLocalItemImageBlobUrl,
  resolveLocalItemImageForItem,
  warmupLocalItemImageIndex,
} from '../../services/localItemImageService';
import GridItemImage from '../common/GridItemImage';

const LOT_LIST_PAGE_SIZE = 15;
const LOT_GRID_PAGE_SIZE = 6;
const LOT_GRID_COLUMNS = 3;
const MODAL_GRID_COLUMNS = 3;
const MODAL_ITEMS_PER_PAGE = 6;
const MODAL_CARD_IMAGE_HEIGHT = 320;
const MODAL_CARD_IMAGE_HEIGHT_SM = 240;
const LINE_GRID_IMAGE_RESOLVE_LIMIT = 120;

const LOT_DETAIL_BLUE = '#0f4c81';
const LOT_DETAIL_GOLD = '#c9a227';
const LOT_DETAIL_FONT = "'Inter', 'Poppins', system-ui, -apple-system, sans-serif";

const lotDetailMetricSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  whiteSpace: 'nowrap',
  fontSize: 12,
  lineHeight: 1.3,
};

const LotDetailSummaryMetric = ({ icon: Icon, label, value, valueColor = '#0f172a' }) => (
  <div style={lotDetailMetricSx} title={`${label}: ${value}`}>
    <Icon size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
    <span style={{ color: '#64748b', fontWeight: 600 }}>{label}:</span>
    <strong style={{ color: valueColor, fontWeight: 800 }}>{value}</strong>
  </div>
);

const LotDetailSummaryBar = ({ itemsCount, pending, grossWt, netWt, pieces, outDate, dueDate, employee }) => (
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '10px 18px',
      padding: '10px 14px',
      marginBottom: 14,
      borderRadius: 12,
      border: '1px solid #e8ecf4',
      background: 'linear-gradient(180deg, #fafcff 0%, #ffffff 100%)',
      fontFamily: LOT_DETAIL_FONT,
    }}
  >
    <LotDetailSummaryMetric icon={FaBoxOpen} label="Items" value={itemsCount} valueColor={LOT_DETAIL_BLUE} />
    <LotDetailSummaryMetric icon={FaHourglassHalf} label="Pending" value={pending} />
    <LotDetailSummaryMetric icon={FaWeight} label="Gross Wt" value={grossWt} />
    <LotDetailSummaryMetric icon={FaWeight} label="Net Wt" value={netWt} />
    <LotDetailSummaryMetric icon={FaGem} label="Pieces" value={pieces} />
    <LotDetailSummaryMetric icon={FaCalendarAlt} label="Out" value={outDate} />
    <LotDetailSummaryMetric icon={FaCalendarAlt} label="Due" value={dueDate} />
    <LotDetailSummaryMetric icon={FaUser} label="Employee" value={employee} />
  </div>
);

const LotDetailViewToggle = ({ mode, onGrid, onTable }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      border: '1px solid #dbe4f0',
      borderRadius: 8,
      overflow: 'hidden',
      background: '#fff',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    }}
  >
    <button
      type="button"
      onClick={onGrid}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        border: 'none',
        borderRight: '1px solid #dbe4f0',
        background: mode === 'grid' ? LOT_DETAIL_BLUE : '#fff',
        color: mode === 'grid' ? '#fff' : '#475569',
        height: 30,
        padding: '0 12px',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: LOT_DETAIL_FONT,
        transition: 'background 0.15s ease, color 0.15s ease',
      }}
    >
      <FaThLarge size={10} />
      Grid
    </button>
    <button
      type="button"
      onClick={onTable}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        border: 'none',
        background: mode === 'table' ? LOT_DETAIL_BLUE : '#fff',
        color: mode === 'table' ? '#fff' : '#475569',
        height: 30,
        padding: '0 12px',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: LOT_DETAIL_FONT,
        transition: 'background 0.15s ease, color 0.15s ease',
      }}
    >
      <FaTable size={10} />
      Table
    </button>
  </div>
);

const ModalGridPagination = ({ currentPage, totalPages, onPrev, onNext, compact = false }) => {
  if (totalPages <= 1) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 8 : 10,
        marginTop: compact ? 0 : 14,
        marginBottom: compact ? 0 : 4,
        fontFamily: LOT_DETAIL_FONT,
      }}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={currentPage === 1}
        aria-label="Previous page"
        style={{
          ...pageBtnStyle(currentPage === 1),
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          padding: 0,
          borderRadius: 8,
        }}
      >
        <FaChevronLeft size={11} />
      </button>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', minWidth: 48, textAlign: 'center' }}>
        {currentPage} / {totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        style={{
          ...pageBtnStyle(currentPage === totalPages),
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          padding: 0,
          borderRadius: 8,
        }}
      >
        <FaChevronRight size={11} />
      </button>
    </div>
  );
};

const getLineImageLookupKeys = (line) => {
  const keys = getItemImageLookupKeys(line);
  const extras = [
    line?.ItemCode,
    line?.Itemcode,
    line?.RFIDCode,
    line?.RFIDNumber,
    line?.rfidCode,
    line?.DesignName,
    line?.Design,
    line?.DesignId,
    line?.DesignCode,
  ];
  const seen = new Set(keys.map((k) => normalizeBaseName(k)));
  extras.forEach((value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return;
    const norm = normalizeBaseName(trimmed);
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    keys.push(trimmed);
  });
  return keys;
};

const resolveLineImageSrc = async (line) => {
  if (!line) return '';
  const keys = getLineImageLookupKeys(line);
  for (let i = 0; i < keys.length; i += 1) {
    const url = await resolveLocalItemImageBlobUrl(keys[i]);
    if (url) return url;
  }
  return resolveLocalItemImageForItem(line);
};

const lineRfidValue = (line) =>
  String(line?.RFIDCode || line?.RFIDNumber || line?.rfidCode || '').trim() || '—';

const getLineItemStatusStyle = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('pending')) return { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
  if (s === 'out' || s.includes('sampleout') || s.includes('out')) {
    return { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
  }
  if (s.includes('return') || s === 'in') {
    return { background: '#ecfdf5', color: '#047857', border: '1px solid #bbf7d0' };
  }
  return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
};

const getLineItemStatusHeaderStyle = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('pending')) {
    return { background: '#fef08a', color: '#92400e', border: '1px solid #facc15', shadow: '0 2px 8px rgba(180, 83, 9, 0.2)' };
  }
  if (s === 'out' || s.includes('sampleout') || s.includes('out')) {
    return { background: '#bae6fd', color: '#0c4a6e', border: '1px solid #38bdf8', shadow: '0 2px 8px rgba(3, 105, 161, 0.18)' };
  }
  if (s.includes('return') || s === 'in') {
    return { background: '#bbf7d0', color: '#065f46', border: '1px solid #34d399', shadow: '0 2px 8px rgba(4, 120, 87, 0.18)' };
  }
  return { background: '#e2e8f0', color: '#1e293b', border: '1px solid #cbd5e1', shadow: '0 2px 6px rgba(15, 23, 42, 0.1)' };
};

const linePiecesFromMrp = (line) => {
  const v = line?.MRP ?? line?.mrp ?? line?.Mrp ?? line?.MRPAmount ?? line?.FixedAmt ?? 0;
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};

const formatPiecesDisplay = (value) => {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const sumLinePieces = (lines) =>
  (lines || []).reduce((sum, line) => sum + linePiecesFromMrp(line), 0);

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

const lotListStatusSx = (status) => {
  const s = String(status ?? '—').toLowerCase();
  if (s.includes('closed')) return { bg: '#f1f5f9', fg: '#334155', bd: '#94a3b8' };
  if (s.includes('partial')) return { bg: '#fff7ed', fg: '#9a3412', bd: '#fdba74' };
  if (s.includes('pending')) return { bg: '#fef9e7', fg: '#92650a', bd: '#e8d48b' };
  if (s.includes('open')) return { bg: '#eff6ff', fg: '#1e40af', bd: '#93c5fd' };
  return { bg: '#fafafa', fg: '#525252', bd: '#d4d4d4' };
};

const LOT_CARD_LABEL = { color: '#64748b', fontWeight: 600, fontSize: 11 };
const LOT_CARD_VALUE = { color: '#0f172a', fontWeight: 800, fontSize: 11 };
const LOT_CARD_GROSS = { color: '#15803d', fontWeight: 800, fontSize: 11 };
const LOT_CARD_NET = { color: '#dc2626', fontWeight: 800, fontSize: 11 };
const LOT_CARD_DOT = (
  <span style={{ color: '#c9a227', margin: '0 5px', opacity: 0.75, fontWeight: 700 }}>•</span>
);

const lotPartyLabel = (item) => {
  const pt = String(item?.PartyType || '').toLowerCase();
  if (pt.includes('employee')) return 'Employee';
  if (pt.includes('customer')) return 'Customer';
  if (pt.includes('vendor')) return 'Vendor';
  return 'Given to';
};

const lotSampleOutDateTimeRaw = (item) =>
  item?.IssueDate ||
  item?.SampleOutDate ||
  item?.sampleOutDate ||
  item?.CreatedOn ||
  item?.createdOn ||
  item?.SubmittedAt ||
  item?.submittedAt ||
  '';

const formatLotDateTime = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return String(dateString);
    const raw = String(dateString);
    const hasTime =
      raw.includes('T') ||
      /\d{1,2}:\d{2}/.test(raw) ||
      date.getHours() > 0 ||
      date.getMinutes() > 0 ||
      date.getSeconds() > 0;
    if (hasTime) {
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateString);
  }
};

const lotDisplayParty = (item) => {
  const name = String(item?.PartyName || '').trim();
  if (name && name !== '—') return name;
  return String(item?.AssignedToUserName || '').trim() || '—';
};

const LotCardStatRow = ({ children, title, withDivider = true }) => (
  <div
    title={title}
    style={{
      padding: '5px 10px',
      fontSize: 11,
      lineHeight: 1.35,
      color: '#1e293b',
      borderBottom: withDivider ? '1px solid #f1f5f9' : 'none',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      background: '#fff',
    }}
  >
    {children}
  </div>
);

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

const LotGridPaginationBar = ({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalCount,
  pageSize,
  onPrev,
  onNext,
  onPage,
}) => {
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let p = start; p <= end; p += 1) pages.push(p);
    return pages;
  }, [currentPage, totalPages]);

  if (totalCount === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        padding: '10px 12px',
        marginBottom: 12,
        borderRadius: 10,
        background: '#fff',
        border: '1px solid #e2e8f0',
      }}
    >
      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>
        {totalCount} lot{totalCount === 1 ? '' : 's'} · {startIndex + 1}–{Math.min(endIndex, totalCount)} of {totalCount} · {pageSize} cards/page
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" onClick={onPrev} disabled={currentPage === 1} style={pageBtnStyle(currentPage === 1)}>
          Previous
        </button>
        {pageNumbers.map((page) => (
          <button
            key={`lot-grid-page-${page}`}
            type="button"
            onClick={() => onPage(page)}
            style={{
              padding: '5px 11px',
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
          onClick={onNext}
          disabled={currentPage === totalPages}
          style={pageBtnStyle(currentPage === totalPages)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

const LotGridCard = ({
  item,
  idx,
  isSmallScreen,
  formatDate,
  openDetail,
  lineItemCode,
  lineImageUrl,
  lineItemKey,
  lineItemLocalImageUrls,
  imageFolderReady,
}) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [activeImageSrc, setActiveImageSrc] = useState('');
  const lotNo = item.SampleLotNo || item.SampleOutNo || '—';
  const lines = Array.isArray(item.LineItems) ? item.LineItems : [];
  const weights = sumLineWeights(lines);
  const totalPieces = formatPiecesDisplay(sumLinePieces(lines));
  const activeLine = lines[imageIndex] || null;
  const activeCode = activeLine ? lineItemCode(activeLine) : '—';
  const hasMultiple = lines.length > 1;

  useEffect(() => {
    setImageIndex(0);
  }, [lotNo]);

  useEffect(() => {
    let cancelled = false;
    if (!activeLine) {
      setActiveImageSrc('');
      return undefined;
    }
    const cached = lineItemLocalImageUrls[lineItemKey(activeLine)];
    const apiUrl = lineImageUrl(activeLine);
    if (cached || apiUrl) {
      setActiveImageSrc(cached || apiUrl);
      return undefined;
    }
    if (!imageFolderReady) return undefined;
    resolveLineImageSrc(activeLine).then((url) => {
      if (!cancelled) setActiveImageSrc(url || '');
    });
    return () => {
      cancelled = true;
    };
  }, [activeLine, imageIndex, imageFolderReady, lineItemKey, lineItemLocalImageUrls, lineImageUrl]);

  const goPrev = (e) => {
    e.stopPropagation();
    setImageIndex((i) => (i <= 0 ? lines.length - 1 : i - 1));
  };

  const goNext = (e) => {
    e.stopPropagation();
    setImageIndex((i) => (i >= lines.length - 1 ? 0 : i + 1));
  };

  const grossDisplay = weights.gross > 0 ? weights.gross.toFixed(3) : '—';
  const netDisplay = weights.net > 0 ? weights.net.toFixed(3) : '—';
  const partyName = lotDisplayParty(item);
  const partyLabel = lotPartyLabel(item);
  const sampleOutDateTime = formatLotDateTime(lotSampleOutDateTimeRaw(item));
  const summaryTitle = `Gross: ${grossDisplay} · Net: ${netDisplay} · Pcs: ${totalPieces}`;
  const detailTitle = `Sample Out: ${sampleOutDateTime} · Due: ${formatDate(item.ExpectedReturnDate)} · Item: ${activeCode}${
    item.Remarks ? ` · Remark: ${item.Remarks}` : ''
  }`;

  return (
    <article
      style={{
        border: item.IsOverdue ? '1px solid #fecaca' : '1px solid #e8ecf4',
        borderRadius: 14,
        background: '#fff',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(15, 76, 129, 0.07), 0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          height: 3,
          background: 'linear-gradient(90deg, #0f4c81 0%, #c9a227 55%, #1e40af 100%)',
          flexShrink: 0,
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
          padding: '7px 10px 6px',
          borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(180deg, #fafcff 0%, #ffffff 100%)',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: '1 1 auto' }}>
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={`Sample Out No: ${lotNo}`}
          >
            <span style={LOT_CARD_LABEL}>Sample Out No:</span>{' '}
            <span style={{ ...LOT_CARD_VALUE, fontSize: 14, color: '#0f4c81' }}>{lotNo}</span>
          </div>
          <div
            style={{
              fontSize: 11,
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={`${partyLabel}: ${partyName}`}
          >
            <span style={LOT_CARD_LABEL}>{partyLabel}:</span>{' '}
            <span style={{ ...LOT_CARD_VALUE, color: '#0f172a' }}>{partyName}</span>
          </div>
        </div>
        <div style={{ flexShrink: 0, paddingTop: 1 }}>
          <LotStatusPill status={item.Status} />
        </div>
      </div>

      <LotCardStatRow title={summaryTitle}>
        <span style={LOT_CARD_LABEL}>Gross:</span>{' '}
        <span style={LOT_CARD_GROSS}>{grossDisplay}</span>
        {LOT_CARD_DOT}
        <span style={LOT_CARD_LABEL}>Net:</span>{' '}
        <span style={LOT_CARD_NET}>{netDisplay}</span>
        {LOT_CARD_DOT}
        <span style={LOT_CARD_LABEL}>Pcs:</span>{' '}
        <span style={LOT_CARD_VALUE}>{totalPieces}</span>
      </LotCardStatRow>

      <div
        style={{
          width: '100%',
          height: isSmallScreen ? 210 : 268,
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 8px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {activeLine ? (
          <>
            <GridItemImage
              src={
                activeImageSrc ||
                lineImageUrl(activeLine) ||
                lineItemLocalImageUrls[lineItemKey(activeLine)] ||
                ''
              }
              itemCode={lineItemCode(activeLine) === '—' ? '' : lineItemCode(activeLine)}
              lookupKeys={getLineImageLookupKeys(activeLine)}
              alt={activeCode}
              eagerLoad
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
                  <FaInbox size={28} style={{ opacity: 0.5 }} />
                  <span style={{ fontSize: 11, fontWeight: 700 }}>No image</span>
                </div>
              }
            />
            {hasMultiple ? (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous image"
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '1px solid #cbd5e1',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(15,23,42,0.12)',
                  }}
                >
                  <FaChevronLeft size={11} />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next image"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '1px solid #cbd5e1',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(15,23,42,0.12)',
                  }}
                >
                  <FaChevronRight size={11} />
                </button>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 4,
                    alignItems: 'center',
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: 'rgba(15,23,42,0.55)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {imageIndex + 1} / {lines.length}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
            <FaInbox size={28} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: 11, fontWeight: 700 }}>No line items</span>
          </div>
        )}
      </div>

      <LotCardStatRow title={detailTitle} withDivider={false}>
        <span style={LOT_CARD_LABEL}>Sample Out:</span>{' '}
        <span style={{ ...LOT_CARD_VALUE, fontVariantNumeric: 'tabular-nums' }}>{sampleOutDateTime}</span>
        {LOT_CARD_DOT}
        <span style={LOT_CARD_LABEL}>Due:</span>{' '}
        <span style={LOT_CARD_VALUE}>{formatDate(item.ExpectedReturnDate)}</span>
        {LOT_CARD_DOT}
        <span style={LOT_CARD_LABEL}>Item:</span>{' '}
        <span style={LOT_CARD_VALUE}>{activeCode}</span>
        {item.Remarks ? (
          <>
            {LOT_CARD_DOT}
            <span style={LOT_CARD_LABEL}>Remark:</span>{' '}
            <span style={{ ...LOT_CARD_VALUE, fontWeight: 700 }}>{item.Remarks}</span>
          </>
        ) : null}
      </LotCardStatRow>

      <div style={{ padding: '6px 8px 8px', background: '#fafcff' }}>
        <button
          type="button"
          onClick={() => openDetail(item)}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 9,
            border: '1px solid rgba(201, 162, 39, 0.35)',
            background: 'linear-gradient(135deg, #0f4c81 0%, #1e40af 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(15, 76, 129, 0.22)',
            letterSpacing: '0.01em',
          }}
        >
          View details
        </button>
      </div>
    </article>
  );
};

const LotDetailItemCard = ({
  line,
  lotHeader,
  isSmallScreen,
  lineItemCode,
  lineCategory,
  lineProduct,
  lineGrossWt,
  lineNetWt,
  lineImageUrl,
  lineItemKey,
  lineItemLocalImageUrls,
  onOpenItem,
}) => {
  const itemCode = lineItemCode(line);
  const rfid = lineRfidValue(line);
  const category = lineCategory(line);
  const product = lineProduct(line);
  const pieces = formatPiecesDisplay(linePiecesFromMrp(line));
  const status = String(line?.ItemStatus || '—').trim() || '—';
  const statusHeaderStyle = getLineItemStatusHeaderStyle(status);
  const sampleOutDate = formatListDate(lineSampleOutDateRaw(line, lotHeader));
  const sampleInDate = formatListDate(lineSampleInDateRaw(line));
  const employeeName = lineEmployeeNameRaw(line, lotHeader) || '—';
  const dot = <span style={{ color: LOT_DETAIL_GOLD, margin: '0 5px', opacity: 0.7, fontWeight: 700 }}>•</span>;
  const img = lineItemLocalImageUrls[lineItemKey(line)] || lineImageUrl(line);
  const imageHeight = isSmallScreen ? MODAL_CARD_IMAGE_HEIGHT_SM : MODAL_CARD_IMAGE_HEIGHT;

  return (
    <article className="lot-detail-item-card" style={{ height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(180deg, #fafcff 0%, #ffffff 100%)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => onOpenItem?.(line)}
          className="lot-detail-item-code"
          style={{
            border: 'none',
            background: 'none',
            padding: 0,
            fontSize: 13,
            fontWeight: 800,
            color: LOT_DETAIL_BLUE,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: LOT_DETAIL_FONT,
            minWidth: 0,
            flex: '1 1 auto',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginRight: 10,
          }}
        >
          {itemCode}
        </button>
        <span
          style={{
            fontSize: 12,
            fontWeight: 900,
            padding: '5px 12px',
            borderRadius: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            lineHeight: 1.2,
            background: statusHeaderStyle.background,
            color: statusHeaderStyle.color,
            border: statusHeaderStyle.border,
            boxShadow: statusHeaderStyle.shadow,
            fontFamily: LOT_DETAIL_FONT,
            flexShrink: 0,
            alignSelf: 'center',
          }}
        >
          {status}
        </span>
      </div>
      <GridItemImage
        src={img}
        itemCode={itemCode === '—' ? '' : itemCode}
        lookupKeys={getLineImageLookupKeys(line)}
        alt={itemCode}
        eagerLoad
        wrapperStyle={{
          width: '100%',
          height: imageHeight,
          minHeight: imageHeight,
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          borderBottom: '1px solid #edf2f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 8px',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
        imgStyle={{
          width: '100%',
          height: '100%',
          maxHeight: imageHeight - 12,
          objectFit: 'contain',
          objectPosition: 'center',
          background: 'transparent',
        }}
        placeholder={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
            <FaInbox size={22} style={{ opacity: 0.45 }} />
            <span style={{ fontSize: 10, fontWeight: 700 }}>No image</span>
          </div>
        }
      />
      <div
        style={{
          padding: '10px 12px 12px',
          fontSize: 11,
          lineHeight: 1.45,
          color: '#0f172a',
          fontFamily: LOT_DETAIL_FONT,
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={`Category: ${category} · Product: ${product} · RFID: ${rfid}`}
        >
          <span style={{ color: '#64748b' }}>Category:</span> {category}
          {dot}
          <span style={{ color: '#64748b' }}>Product:</span> {product}
          {dot}
          <span style={{ color: '#64748b' }}>RFID:</span> {rfid}
        </div>
        <div
          style={{
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={`Gross: ${lineGrossWt(line)} · Net: ${lineNetWt(line)} · Pieces: ${pieces}`}
        >
          <span>
            <span style={{ color: '#64748b' }}>Gross:</span> {lineGrossWt(line)}
          </span>
          {dot}
          <span>
            <span style={{ color: '#64748b' }}>Net:</span> {lineNetWt(line)}
          </span>
          {dot}
          <span>
            <span style={{ color: '#64748b' }}>Pieces:</span> {pieces}
          </span>
        </div>
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 8,
            borderTop: '1px solid #f1f5f9',
            fontSize: 10,
            fontWeight: 700,
            lineHeight: 1.5,
            color: '#334155',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={`Sample out: ${sampleOutDate} · Sample in: ${sampleInDate} · Employee: ${employeeName}`}
        >
          <span style={{ color: '#64748b' }}>Sample out:</span> {sampleOutDate}
          {dot}
          <span style={{ color: '#64748b' }}>Sample in:</span> {sampleInDate}
          {dot}
          <span style={{ color: '#64748b' }}>Employee:</span> {employeeName}
        </div>
      </div>
    </article>
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
    RFIDCode: line.rfidCode ?? line.RFIDCode ?? line.RFIDNumber,
    RFIDNumber: line.rfidCode ?? line.RFIDCode ?? line.RFIDNumber,
    ItemStatus: line.itemStatus ?? line.ItemStatus,
    ProductName: line.productName ?? line.ProductName,
    CategoryName: line.categoryName ?? line.CategoryName,
    DesignName: line.designName ?? line.DesignName ?? line.Design,
    DesignId: line.designId ?? line.DesignId ?? line.design_id,
    DesignCode: line.designCode ?? line.DesignCode,
    GrossWt: line.grossWt ?? line.GrossWt,
    NetWt: line.netWt ?? line.NetWt,
    StoneWt: line.stoneWt ?? line.StoneWt,
    DiamondWt: line.diamondWt ?? line.DiamondWt,
    PurityName: line.purityName ?? line.PurityName,
    Mrp: line.mrp ?? line.Mrp ?? line.MRP,
    ImageUrl: line.imageUrl ?? line.ImageUrl ?? line.ImageURL ?? line.ImagePath ?? line.imagePath,
    ImagePath: line.imagePath ?? line.ImagePath ?? line.ImageUrl,
    LabelledStockId: line.labelledStockId ?? line.LabelledStockId,
    OutDate: line.outDate ?? line.OutDate ?? line.SampleOutDate ?? line.sampleOutDate ?? line.IssueDate,
    SampleOutDate: line.sampleOutDate ?? line.SampleOutDate ?? line.outDate ?? line.OutDate ?? line.IssueDate,
    InDate: line.inDate ?? line.InDate ?? line.SampleInDate ?? line.sampleInDate ?? line.ReturnDate ?? line.returnedDate,
    SampleInDate: line.sampleInDate ?? line.SampleInDate ?? line.inDate ?? line.InDate ?? line.ReturnDate,
    AssignedToUserName:
      line.assignedToUserName ??
      line.AssignedToUserName ??
      line.employeeName ??
      line.EmployeeName ??
      line.AssignToName ??
      line.assignToName,
  };
};

const formatListDate = (dateString) => {
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

const pickLineField = (line, ...keys) => {
  for (const k of keys) {
    const v = line?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
};

const lineSampleOutDateRaw = (line, lotHeader) =>
  pickLineField(line, 'OutDate', 'outDate', 'SampleOutDate', 'sampleOutDate', 'IssueDate', 'issueDate') ||
  pickLineField(lotHeader, 'SampleOutDate', 'sampleOutDate', 'IssueDate', 'issueDate', 'OutDate');

const lineSampleInDateRaw = (line) =>
  pickLineField(
    line,
    'InDate',
    'inDate',
    'SampleInDate',
    'sampleInDate',
    'ReturnDate',
    'returnDate',
    'ReturnedDate',
    'returnedDate'
  );

const lineEmployeeNameRaw = (line, lotHeader) =>
  pickLineField(
    line,
    'AssignedToUserName',
    'assignedToUserName',
    'EmployeeName',
    'employeeName',
    'AssignToName',
    'assignToName'
  ) ||
  pickLineField(lotHeader, 'AssignedToUserName', 'assignedToUserName', 'PartyName', 'partyName');

const enrichDetailLineItem = (line, lotHeader) => {
  const mapped = mapRfidSampleLine(line);
  return {
    ...mapped,
    OutDate: lineSampleOutDateRaw(mapped, lotHeader),
    SampleOutDate: lineSampleOutDateRaw(mapped, lotHeader),
    InDate: lineSampleInDateRaw(mapped),
    SampleInDate: lineSampleInDateRaw(mapped),
    AssignedToUserName: lineEmployeeNameRaw(mapped, lotHeader),
  };
};

const enrichDetailLineItems = (items, lotHeader) =>
  (items || []).map((line) => enrichDetailLineItem(line, lotHeader));

const lineImageCacheKey = (line) => {
  const keys = getLineImageLookupKeys(line);
  if (keys.length) return normalizeBaseName(keys[0]);
  const code = String(line?.ItemCode || line?.Itemcode || '').trim();
  return code ? normalizeBaseName(code) : '';
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
  const [detailModalPage, setDetailModalPage] = useState(1);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedLotIds, setExpandedLotIds] = useState(() => new Set());
  const [itemDetailModal, setItemDetailModal] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportErrors, setExportErrors] = useState({ excel: '', pdf: '' });
  const [lotsViewMode, setLotsViewMode] = useState('grid');
  const [lineItemsViewMode, setLineItemsViewMode] = useState('grid');
  const [lineItemLocalImageUrls, setLineItemLocalImageUrls] = useState({});
  const [imageFolderReady, setImageFolderReady] = useState(false);
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
    warmupLocalItemImageIndex()
      .then(() => setImageFolderReady(true))
      .catch(() => setImageFolderReady(true));
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
    setDetailModalPage(1);
  }, [detailModal?.header?.Id, detailModal?.header?.SampleLotNo, detailModal?.header?.SampleOutNo]);

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
  const lineItemKey = lineImageCacheKey;
  const lineImageUrl = (line) => {
    const raw = String(
      line?.ImageUrl || line?.ImageURL || line?.ImagePath || line?.PhotoUrl || line?.Photo || line?.ProductImage || ''
    ).trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `${getRrgoldApiBaseUrl().replace(/\/$/, '')}/${raw.replace(/^\/+/, '')}`;
  };

  const detailModalItems = detailModal?.items ?? [];
  const detailModalTotalPages = Math.max(1, Math.ceil(detailModalItems.length / MODAL_ITEMS_PER_PAGE));
  const detailModalStartIndex = (detailModalPage - 1) * MODAL_ITEMS_PER_PAGE;
  const detailModalEndIndex = detailModalStartIndex + MODAL_ITEMS_PER_PAGE;
  const paginatedDetailModalItems = detailModalItems.slice(detailModalStartIndex, detailModalEndIndex);
  const detailModalWeights = sumLineWeights(detailModalItems);
  const detailModalPieces = formatPiecesDisplay(sumLinePieces(detailModalItems));

  const openDetailItemFromModal = (line) => {
    setItemDetailModal({
      item: line,
      lotNo: detailModal?.header?.SampleLotNo || detailModal?.header?.SampleOutNo || '—',
    });
  };

  const visibleLinesForImages = useMemo(() => {
    const gridLotLines =
      lotsViewMode === 'grid'
        ? currentItems.flatMap((lot) => (Array.isArray(lot?.LineItems) ? lot.LineItems : []))
        : [];
    const expandedLines = currentItems.flatMap((lot, idx) => {
      const lotKey = lotRowKey(lot, idx);
      if (!expandedLotIds.has(lotKey)) return [];
      return Array.isArray(lot?.LineItems) ? lot.LineItems : [];
    });
    const modalItems = Array.isArray(detailModal?.items) ? detailModal.items : [];
    const allVisibleLines = [...gridLotLines, ...expandedLines, ...modalItems];
    const seen = new Set();
    const deduped = [];
    allVisibleLines.forEach((line) => {
      const key = lineImageCacheKey(line);
      if (!key || seen.has(key)) return;
      seen.add(key);
      deduped.push(line);
    });
    return deduped.slice(0, LINE_GRID_IMAGE_RESOLVE_LIMIT);
  }, [currentItems, detailModal?.items, expandedLotIds, lotsViewMode]);

  useEffect(() => {
    if (!imageFolderReady || !visibleLinesForImages.length) return;
    let disposed = false;

    const resolveMissing = async () => {
      const currentCache = lineItemLocalImageUrlsRef.current;
      for (let i = 0; i < visibleLinesForImages.length; i += 1) {
        if (disposed) return;
        const line = visibleLinesForImages[i];
        const key = lineImageCacheKey(line);
        if (!key || currentCache[key]) continue;
        const url = await resolveLineImageSrc(line);
        if (!url || disposed) continue;
        setLineItemLocalImageUrls((prev) => {
          if (prev[key]) return prev;
          return { ...prev, [key]: url };
        });
      }
    };

    resolveMissing();
    return () => {
      disposed = true;
    };
  }, [visibleLinesForImages, detailModalPage, lineItemsViewMode, imageFolderReady]);

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
      const header = mapRfidSampleLotRow(row);
      const items = enrichDetailLineItems(embedded.map(mapRfidSampleLine), header);
      const payload = { header, items };
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
        const rawItems =
          header.LineItems?.length > 0
            ? header.LineItems
            : normalizeArray(data?.items ?? data?.Items ?? lotBody?.items ?? lotBody?.Items ?? []).map(
                mapRfidSampleLine
              );
        const items = enrichDetailLineItems(rawItems, header);
        const payload = { header, items };
        detailCacheRef.current.set(cacheKey, payload);
        setDetailModal(payload);
        return;
      }
      const header = mapRfidSampleLotRow(row);
      const payload = { header, items: enrichDetailLineItems(embedded, header) };
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
      ['AssignedToUserName', 'Employee'],
      ['OutDate', 'Sample out date'],
      ['InDate', 'Sample in date'],
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
        const display =
          /date/i.test(key) && !Number.isNaN(new Date(v).getTime()) ? formatListDate(v) : String(v);
        rows.push({ label, value: display });
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
            {listLoading ? (
              <div
                style={{
                  padding: '56px 24px',
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                }}
              >
                <FaSpinner
                  size={28}
                  style={{ color: '#0f4c81', animation: 'spin 0.9s linear infinite', marginBottom: 16 }}
                />
                <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Loading sample out lots
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  Fetching lot cards with images and details. Please wait…
                </p>
              </div>
            ) : currentItems.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: '#737373', fontSize: 13 }}>
                {emptyStateText}
              </div>
            ) : (
              <>
                <LotGridPaginationBar
                  currentPage={currentPage}
                  totalPages={totalPages}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalCount={filteredData.length}
                  pageSize={activeLotPageSize}
                  onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  onPage={(page) => setCurrentPage(page)}
                />
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isSmallScreen
                      ? 'repeat(1, minmax(0, 1fr))'
                      : `repeat(${LOT_GRID_COLUMNS}, minmax(0, 1fr))`,
                    gap: 14,
                  }}
                >
                  {currentItems.map((item, idx) => (
                    <LotGridCard
                      key={`lot-grid-${item.SampleLotNo || item.SampleOutNo || idx}-${idx}`}
                      item={item}
                      idx={idx}
                      isSmallScreen={isSmallScreen}
                      formatDate={formatDate}
                      openDetail={openDetail}
                      lineItemCode={lineItemCode}
                      lineImageUrl={lineImageUrl}
                      lineItemKey={lineItemKey}
                      lineItemLocalImageUrls={lineItemLocalImageUrls}
                      imageFolderReady={imageFolderReady}
                    />
                  ))}
                </div>
              </>
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
                                          itemCode={lineItemCode(line) === '—' ? '' : lineItemCode(line)}
                                          lookupKeys={getLineImageLookupKeys(line)}
                                          alt={lineItemCode(line)}
                                          eagerLoad
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

        {lotsViewMode === 'table' ? (
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
              {filteredData.length} record{filteredData.length === 1 ? '' : 's'} · {activeLotPageSize} rows/page
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
        ) : null}
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
          className="lot-detail-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.5)',
            zIndex: 10050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => !detailLoading && setDetailModal(null)}
        >
          <div
            className="lot-detail-modal"
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: 'min(1280px, 98vw)',
              width: '100%',
              maxHeight: '92vh',
              overflow: 'auto',
              padding: '16px 18px 18px',
              position: 'relative',
              boxShadow: '0 24px 64px rgba(15, 23, 42, 0.18), 0 8px 24px rgba(15, 76, 129, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: LOT_DETAIL_FONT,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                height: 3,
                background: `linear-gradient(90deg, ${LOT_DETAIL_BLUE} 0%, ${LOT_DETAIL_GOLD} 55%, #1e40af 100%)`,
                borderRadius: '16px 16px 0 0',
                margin: '-16px -18px 14px',
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
                    border: '1px solid #dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: LOT_DETAIL_BLUE,
                    flexShrink: 0,
                  }}
                >
                  <FaLayerGroup size={15} />
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  Lot {detailModal.header?.SampleLotNo || detailModal.header?.SampleOutNo || '—'}
                </h3>
                <LotStatusPill status={detailModal.header?.Status} />
              </div>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                aria-label="Close lot details"
                style={{
                  border: 'none',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: 8,
                  color: '#64748b',
                  flexShrink: 0,
                }}
              >
                <FaTimes size={16} />
              </button>
            </div>

            {detailLoading ? (
              <div
                style={{
                  padding: '56px 24px',
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                }}
              >
                <FaSpinner
                  size={28}
                  style={{ color: LOT_DETAIL_BLUE, animation: 'spin 0.9s linear infinite', marginBottom: 16 }}
                />
                <h4 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                  Loading lot items
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  Fetching item images and details…
                </p>
              </div>
            ) : (
              <>
                <LotDetailSummaryBar
                  itemsCount={detailModal.header?.TotalItems ?? detailModalItems.length}
                  pending={detailModal.header?.PendingItems ?? '—'}
                  grossWt={detailModalWeights.gross > 0 ? detailModalWeights.gross.toFixed(3) : '—'}
                  netWt={detailModalWeights.net > 0 ? detailModalWeights.net.toFixed(3) : '—'}
                  pieces={detailModalPieces}
                  outDate={formatDate(detailModal.header?.IssueDate || detailModal.header?.SampleOutDate)}
                  dueDate={formatDate(detailModal.header?.ExpectedReturnDate)}
                  employee={lotDisplayParty(detailModal.header)}
                />

                {detailModalItems.length > 0 ? (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.01em' }}>
                        Lot Items ({detailModalItems.length})
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {lineItemsViewMode === 'grid' && detailModalTotalPages > 1 ? (
                          <ModalGridPagination
                            compact
                            currentPage={detailModalPage}
                            totalPages={detailModalTotalPages}
                            onPrev={() => setDetailModalPage((p) => Math.max(1, p - 1))}
                            onNext={() => setDetailModalPage((p) => Math.min(detailModalTotalPages, p + 1))}
                          />
                        ) : null}
                        <LotDetailViewToggle
                          mode={lineItemsViewMode}
                          onGrid={() => setLineItemsViewMode('grid')}
                          onTable={() => setLineItemsViewMode('table')}
                        />
                      </div>
                    </div>

                    {lineItemsViewMode === 'grid' ? (
                      <>
                        <div
                          className="lot-detail-grid"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: isSmallScreen
                              ? 'repeat(1, minmax(0, 1fr))'
                              : `repeat(${MODAL_GRID_COLUMNS}, minmax(0, 1fr))`,
                            gap: 12,
                            alignItems: 'stretch',
                          }}
                        >
                          {paginatedDetailModalItems.map((line, idx) => (
                            <LotDetailItemCard
                              key={line.Id ?? `${lineItemCode(line)}-${detailModalStartIndex + idx}`}
                              line={line}
                              lotHeader={detailModal.header}
                              isSmallScreen={isSmallScreen}
                              lineItemCode={lineItemCode}
                              lineCategory={lineCategory}
                              lineProduct={lineProduct}
                              lineGrossWt={lineGrossWt}
                              lineNetWt={lineNetWt}
                              lineImageUrl={lineImageUrl}
                              lineItemKey={lineItemKey}
                              lineItemLocalImageUrls={lineItemLocalImageUrls}
                              onOpenItem={openDetailItemFromModal}
                            />
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ borderRadius: 12, border: '1px solid #e8ecf4', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Item code</th>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Category</th>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Gross Wt</th>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Net Wt</th>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Employee</th>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Sample out</th>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Sample in</th>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailModalItems.map((line, idx) => {
                              const status = String(line?.ItemStatus || '—').trim() || '—';
                              const statusStyle = getLineItemStatusStyle(status);
                              return (
                                <tr key={line.Id ?? `${line.ItemCode}-${idx}`} className="lot-detail-table-row">
                                  <td style={{ padding: '10px 12px' }}>
                                    <button
                                      type="button"
                                      onClick={() => openDetailItemFromModal(line)}
                                      style={{
                                        border: 'none',
                                        background: 'none',
                                        padding: 0,
                                        color: LOT_DETAIL_BLUE,
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {line.ItemCode || line.Itemcode || '—'}
                                    </button>
                                  </td>
                                  <td style={{ padding: '10px 12px', color: '#334155' }}>{lineCategory(line)}</td>
                                  <td style={{ padding: '10px 12px', color: '#334155' }}>{lineGrossWt(line)}</td>
                                  <td style={{ padding: '10px 12px', color: '#334155' }}>{lineNetWt(line)}</td>
                                  <td style={{ padding: '10px 12px', color: '#334155' }}>{lineEmployeeNameRaw(line, detailModal.header) || '—'}</td>
                                  <td style={{ padding: '10px 12px', color: '#334155' }}>{formatListDate(lineSampleOutDateRaw(line, detailModal.header))}</td>
                                  <td style={{ padding: '10px 12px', color: '#334155' }}>{formatListDate(lineSampleInDateRaw(line))}</td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        padding: '2px 8px',
                                        borderRadius: 5,
                                        textTransform: 'uppercase',
                                        background: statusStyle.background,
                                        color: statusStyle.color,
                                        border: statusStyle.border,
                                      }}
                                    >
                                      {status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: 24 }}>
                    No line items in response.
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => printRow(detailModal.header)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      fontWeight: 700,
                      borderRadius: '10px',
                      border: '1px solid #dbe4f0',
                      background: '#fff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#334155',
                      fontFamily: LOT_DETAIL_FONT,
                    }}
                  >
                    <FaPrint size={13} />
                    Print summary
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailModal(null)}
                    style={{
                      padding: '10px 22px',
                      fontWeight: 700,
                      borderRadius: '10px',
                      border: 'none',
                      background: `linear-gradient(135deg, ${LOT_DETAIL_BLUE} 0%, #1e40af 100%)`,
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      boxShadow: '0 4px 14px rgba(15, 76, 129, 0.28)',
                      fontFamily: LOT_DETAIL_FONT,
                    }}
                  >
                    Close
                  </button>
                </div>
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
        .lot-detail-item-card {
          border: 1px solid #e8ecf4;
          border-radius: 16px;
          background: #fff;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
          display: flex;
          flex-direction: column;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .lot-detail-item-card:hover {
          transform: translateY(-2px);
          border-color: rgba(15, 76, 129, 0.22);
          box-shadow: 0 8px 24px rgba(15, 76, 129, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06);
        }
        .lot-detail-item-code:hover {
          color: #1e40af !important;
          text-decoration: underline;
        }
        .lot-detail-table-row {
          border-top: 1px solid #f1f5f9;
          transition: background 0.12s ease;
        }
        .lot-detail-table-row:hover {
          background: #fafcff;
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

export default SampleOutList;
