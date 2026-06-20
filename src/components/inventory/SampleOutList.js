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
  FaUndo,
  FaCheckCircle,
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { partyTypeToApiEnum } from '../../services/sampleInOutApi';
import {
  getAdminBulkSampleReturnUrl,
  getAllSampleOutListUrl,
  getLotByIdUrl,
  sampleAuthHeaders,
  parseRfidSampleLotReturnMeta,
  isRfidSampleLotFinalized,
  getRfidSampleLotFinishUi,
  getItemReturnedByTypeMeta,
  getLineForceReturnRemark,
  isOutItemStatus,
  isForceReturnItem,
  countOutItemsFromLines,
  reconcileRfidSampleLotStatus,
} from '../../services/rfidSampleApi';
import { isSuperAdmin } from '../../utils/authState';
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
const MODAL_ITEMS_PER_PAGE = 3;
const MODAL_CARD_IMAGE_HEIGHT = 280;
const MODAL_CARD_IMAGE_HEIGHT_SM = 220;
const LINE_GRID_IMAGE_RESOLVE_LIMIT = 120;

const LOT_DETAIL_BLUE = '#0f4c81';
const LOT_DETAIL_GOLD = '#c9a227';
const LOT_DETAIL_FONT = "'Inter', 'Poppins', system-ui, -apple-system, sans-serif";

const humanizeLotStatus = (status) => {
  const raw = String(status || '').trim();
  if (!raw || raw === '—') return '—';
  return raw
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
};

const LotDetailInlineStat = ({ label, value, valueColor = '#0f172a' }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 5,
      whiteSpace: 'nowrap',
      fontFamily: LOT_DETAIL_FONT,
    }}
  >
    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.01em' }}>{label}:</span>
    <strong
      style={{
        fontSize: 14,
        fontWeight: 800,
        color: valueColor,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.01em',
      }}
    >
      {value}
    </strong>
  </span>
);

const LotDetailStatChip = ({ label, value, tone = 'neutral', compact = false }) => {
  const tones = {
    primary: { bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', fg: '#1e40af', bd: '#93c5fd', shadow: '0 2px 8px rgba(37, 99, 235, 0.1)' },
    warning: { bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', fg: '#b45309', bd: '#fcd34d', shadow: '0 2px 8px rgba(180, 83, 9, 0.08)' },
    info: { bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', fg: '#0369a1', bd: '#7dd3fc', shadow: '0 2px 8px rgba(3, 105, 161, 0.1)' },
    success: { bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', fg: '#047857', bd: '#6ee7b7', shadow: '0 2px 8px rgba(4, 120, 87, 0.08)' },
    accent: { bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', fg: '#15803d', bd: '#86efac', shadow: '0 2px 8px rgba(21, 128, 61, 0.08)' },
    danger: { bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', fg: '#c2410c', bd: '#fdba74', shadow: '0 2px 8px rgba(194, 65, 12, 0.1)' },
    neutral: { bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', fg: '#334155', bd: '#e2e8f0', shadow: '0 1px 4px rgba(15, 23, 42, 0.05)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <div
      title={`${label}: ${value}`}
      style={{
        flex: compact ? '1 1 72px' : '1 1 88px',
        minWidth: compact ? 72 : 88,
        padding: compact ? '8px 10px' : '10px 12px',
        borderRadius: compact ? 10 : 12,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        boxShadow: t.shadow,
        fontFamily: LOT_DETAIL_FONT,
      }}
    >
      <div
        style={{
          fontSize: compact ? 9 : 10,
          fontWeight: 800,
          color: t.fg,
          opacity: 0.9,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: compact ? 17 : 20,
          fontWeight: 900,
          color: t.fg,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
};

const LotDetailReturnBreakdown = ({ employeeReturnedItems, adminReturnedItems, forceReturnedItems }) => (
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '8px 14px',
      padding: '8px 12px',
      borderRadius: 10,
      background: '#fff',
      border: '1px solid #e8ecf4',
      marginBottom: 10,
    }}
  >
    <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      Returns
    </span>
    {[
      { label: 'Emp', value: employeeReturnedItems, color: '#047857', bg: '#ecfdf5' },
      { label: 'Admin', value: adminReturnedItems, color: '#15803d', bg: '#f0fdf4' },
      { label: 'Force', value: forceReturnedItems ?? 0, color: '#c2410c', bg: '#fff7ed' },
    ].map((item) => (
      <span
        key={item.label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 8,
          background: item.bg,
          fontSize: 12,
          fontWeight: 700,
          color: item.color,
        }}
      >
        <span style={{ fontWeight: 800, opacity: 0.85 }}>{item.label}</span>
        <strong style={{ fontSize: 14, fontWeight: 900 }}>{item.value ?? 0}</strong>
      </span>
    ))}
  </div>
);

const LotDetailFilterPill = ({ active, label, onClick, count }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      border: active ? `1.5px solid ${LOT_DETAIL_BLUE}` : '1px solid #e2e8f0',
      background: active ? '#eff6ff' : '#fff',
      color: active ? LOT_DETAIL_BLUE : '#475569',
      borderRadius: 999,
      padding: '5px 12px',
      fontSize: 11,
      fontWeight: active ? 800 : 600,
      cursor: 'pointer',
      fontFamily: LOT_DETAIL_FONT,
      whiteSpace: 'nowrap',
    }}
  >
    {label}
    {count != null ? ` (${count})` : ''}
  </button>
);

const LotDetailSummaryBar = ({
  itemsCount,
  pending,
  outItems,
  employeeReturnedItems,
  adminReturnedItems,
  forceReturnedItems,
  returnedItems,
  grossWt,
  netWt,
  pieces,
  outDate,
  dueDate,
  employee,
  lotStatus,
}) => {
  const statusKey = String(lotStatus || '').toLowerCase();
  const statusTone = statusKey.includes('completed')
    ? { bg: '#f5f3ff', fg: '#6d28d9', bd: '#ddd6fe' }
    : statusKey.includes('closed')
    ? { bg: '#f0fdf4', fg: '#166534', bd: '#bbf7d0' }
    : statusKey.includes('open')
      ? { bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' }
      : statusKey.includes('partial')
        ? { bg: '#fff7ed', fg: '#c2410c', bd: '#fed7aa' }
        : statusKey.includes('pending')
          ? { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' }
          : { bg: '#f8fafc', fg: '#475569', bd: '#e2e8f0' };

  return (
    <div
      style={{
        marginBottom: 16,
        borderRadius: 14,
        border: '1px solid #e8ecf4',
        background: 'linear-gradient(180deg, #fafcff 0%, #ffffff 100%)',
        overflow: 'hidden',
        fontFamily: LOT_DETAIL_FONT,
        boxShadow: '0 4px 20px rgba(15, 76, 129, 0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          padding: '12px 16px',
          borderBottom: '1px solid #eef2f7',
          background: `linear-gradient(90deg, ${statusTone.bg} 0%, #ffffff 100%)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Lot status
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '5px 14px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: statusTone.fg,
              background: '#fff',
              border: `1px solid ${statusTone.bd}`,
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
            }}
          >
            {humanizeLotStatus(lotStatus)}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', alignItems: 'center' }}>
          <LotDetailInlineStat label="Out date" value={outDate} valueColor={LOT_DETAIL_BLUE} />
          <span style={{ color: '#e2e8f0', fontWeight: 300 }}>|</span>
          <LotDetailInlineStat label="Due" value={dueDate} valueColor="#b45309" />
          <span style={{ color: '#e2e8f0', fontWeight: 300 }}>|</span>
          <LotDetailInlineStat label="Employee" value={employee} valueColor="#0f766e" />
        </div>
      </div>

      <div style={{ padding: '10px 14px 12px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <LotDetailStatChip label="Items" value={itemsCount} tone="primary" compact />
          <LotDetailStatChip label="Pending" value={pending} tone="warning" compact />
          <LotDetailStatChip label="Out" value={outItems} tone="info" compact />
          <LotDetailStatChip label="Returned" value={returnedItems ?? '—'} tone="success" compact />
        </div>

        <LotDetailReturnBreakdown
          employeeReturnedItems={employeeReturnedItems}
          adminReturnedItems={adminReturnedItems}
          forceReturnedItems={forceReturnedItems}
        />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px 16px',
            alignItems: 'center',
            padding: '8px 12px',
            borderRadius: 10,
            background: '#f8fafc',
            border: '1px solid #eef2f7',
          }}
        >
          <LotDetailInlineStat label="Gross Wt" value={grossWt} />
          <span style={{ color: '#cbd5e1' }}>•</span>
          <LotDetailInlineStat label="Net Wt" value={netWt} />
          <span style={{ color: '#cbd5e1' }}>•</span>
          <LotDetailInlineStat label="Pieces" value={pieces} />
        </div>
      </div>
    </div>
  );
};

const lotDetailToolbarBtn = (disabled = false) => ({
  border: 'none',
  background: 'transparent',
  padding: '6px 2px',
  fontSize: 13,
  fontWeight: 600,
  color: disabled ? '#cbd5e1' : LOT_DETAIL_BLUE,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: LOT_DETAIL_FONT,
  whiteSpace: 'nowrap',
});

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

const isAdminReturnableLotStatus = (status) => {
  const s = String(status || '').toLowerCase();
  return s.includes('open') || s.includes('partial');
};

const lineLotItemId = (line) => {
  const raw = line?.Id ?? line?.id;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isNaN(n) ? raw : n;
};

const lineCanAdminReturn = (line, lotHeader) => {
  if (line?.canAdminReturn === true || line?.CanAdminReturn === true) return true;
  if (line?.canAdminReturn === false || line?.CanAdminReturn === false) return false;
  const lotStatus =
    lotHeader?.Status ?? lotHeader?.LotStatus ?? lotHeader?.lotStatus ?? lotHeader?.status;
  return isAdminReturnableLotStatus(lotStatus) && isOutItemStatus(line?.ItemStatus ?? line?.itemStatus);
};

const pickLineScanMeta = (line) => ({
  sampleOutMode: line?.sampleOutMode ?? line?.SampleOutMode ?? '',
  sampleInMode: line?.sampleInMode ?? line?.SampleInMode ?? '',
  lastActionType: line?.lastActionType ?? line?.LastActionType ?? '',
  lastActionMode: line?.lastActionMode ?? line?.LastActionMode ?? '',
  sampleOutOn: line?.sampleOutOn ?? line?.SampleOutOn ?? line?.OutDate ?? line?.outDate ?? '',
  sampleInOn: line?.sampleInOn ?? line?.SampleInOn ?? line?.InDate ?? line?.inDate ?? '',
});

const formatActivityLogWhen = (entry) => {
  const raw =
    entry?.actionOn ??
    entry?.ActionOn ??
    entry?.createdOn ??
    entry?.CreatedOn ??
    entry?.timestamp ??
    entry?.Timestamp ??
    '';
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(raw);
  }
};

const formatActivityLogLine = (entry) => {
  const action = String(entry?.actionType ?? entry?.ActionType ?? entry?.action ?? entry?.Action ?? '—').trim();
  const mode = String(entry?.actionMode ?? entry?.ActionMode ?? entry?.scanMode ?? entry?.ScanMode ?? '').trim();
  const remark = String(entry?.remark ?? entry?.Remark ?? entry?.message ?? entry?.Message ?? '').trim();
  const parts = [action];
  if (mode) parts.push(`[${mode}]`);
  if (remark) parts.push(remark);
  return parts.join(' ');
};

const getReturnedByTypeMeta = getItemReturnedByTypeMeta;

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
  if (s.includes('completed')) return { bg: '#f5f3ff', fg: '#6d28d9', bd: '#ddd6fe' };
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
    const raw = String(dateString).trim();
    const naive = raw.replace(/Z$/i, '').replace(/([+-]\d{2}:\d{2})$/, '');
    const date = new Date(naive);
    if (Number.isNaN(date.getTime())) return raw;
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
  const t = humanizeLotStatus(status);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
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

const LotDetailFieldCell = ({ label, value, valueColor = '#0f172a', span = 1, wrap = false }) => (
  <div style={{ minWidth: 0, fontFamily: LOT_DETAIL_FONT, lineHeight: 1.35, gridColumn: span > 1 ? '1 / -1' : undefined }}>
    <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', marginBottom: 1 }}>{label}</div>
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        color: valueColor,
        overflow: wrap ? 'visible' : 'hidden',
        textOverflow: wrap ? 'clip' : 'ellipsis',
        whiteSpace: wrap ? 'normal' : 'nowrap',
        wordBreak: wrap ? 'break-word' : 'normal',
        overflowWrap: wrap ? 'anywhere' : 'normal',
        lineHeight: wrap ? 1.4 : 1.35,
      }}
      title={String(value ?? '')}
    >
      {value}
    </div>
  </div>
);

const isReturnedLineStatus = (status) => {
  const s = String(status || '').trim().toLowerCase();
  return s.includes('return') || s === 'in' || s === 'returned';
};

const formatLineDateTimeField = (line, ...keys) => {
  const raw = pickLineField(line, ...keys);
  if (!raw) return '—';
  return formatLotDateTime(raw);
};

const lineMatchesDetailUserFilter = (line, filter) => {
  if (!filter || filter === 'all') return true;
  if (filter === 'employee') {
    return String(line?.returnedByType ?? line?.ReturnedByType ?? '').trim().toLowerCase() === 'employee';
  }
  if (filter === 'admin') {
    return (
      !isForceReturnItem(line) &&
      String(line?.returnedByType ?? line?.ReturnedByType ?? '').trim().toLowerCase() === 'admin'
    );
  }
  if (filter === 'force') return isForceReturnItem(line);
  return true;
};

const AdminReturnFieldCell = ({ label, value, valueColor = '#0f172a', span = 1 }) => (
  <div style={{ minWidth: 0, gridColumn: span > 1 ? '1 / -1' : undefined }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
    <div
      style={{
        fontSize: 12,
        fontWeight: 800,
        color: valueColor,
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        lineHeight: 1.4,
      }}
      title={String(value ?? '')}
    >
      {value}
    </div>
  </div>
);

const AdminReturnProductCard = ({
  line,
  img,
  lineItemCode,
  lineCategory,
  lineProduct,
  lineRfidValue,
  lineGrossWt,
  lineNetWt,
  compact = false,
}) => {
  const code = lineItemCode(line);
  const useRowLayout = !compact;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: useRowLayout ? 'row' : 'column',
        alignItems: 'stretch',
        borderRadius: 12,
        border: '1px solid #eef2f7',
        background: '#fff',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: useRowLayout ? 190 : '100%',
          minHeight: useRowLayout ? 190 : 150,
          background: 'linear-gradient(180deg, #f1f5f9 0%, #ffffff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: useRowLayout ? '1px solid #f1f5f9' : 'none',
          borderBottom: useRowLayout ? 'none' : '1px solid #f1f5f9',
          padding: 10,
          boxSizing: 'border-box',
        }}
      >
        {img ? (
          <img
            src={img}
            alt={code}
            style={{
              width: '100%',
              height: '100%',
              maxHeight: useRowLayout ? 170 : 140,
              objectFit: 'contain',
              objectPosition: 'center',
            }}
          />
        ) : (
          <FaInbox size={32} style={{ color: '#cbd5e1' }} />
        )}
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: useRowLayout ? '14px 16px' : '10px 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize: useRowLayout ? 16 : 14,
            fontWeight: 800,
            color: LOT_DETAIL_BLUE,
            marginBottom: 10,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            lineHeight: 1.3,
          }}
        >
          {code}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: useRowLayout ? 'repeat(2, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
            gap: '10px 16px',
          }}
        >
          <AdminReturnFieldCell label="Category" value={lineCategory(line)} />
          <AdminReturnFieldCell label="Product" value={lineProduct(line)} valueColor={LOT_DETAIL_BLUE} />
          <AdminReturnFieldCell label="RFID" value={lineRfidValue(line)} />
          <AdminReturnFieldCell label="Gross Wt" value={lineGrossWt(line)} />
          <AdminReturnFieldCell label="Net Wt" value={lineNetWt(line)} span={useRowLayout ? 1 : 2} />
        </div>
      </div>
    </div>
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
  adminSelectable = false,
  adminSelected = false,
  onAdminToggle,
}) => {
  const itemCode = lineItemCode(line);
  const rfid = lineRfidValue(line);
  const category = lineCategory(line);
  const product = lineProduct(line);
  const pieces = formatPiecesDisplay(linePiecesFromMrp(line));
  const status = String(line?.ItemStatus || '—').trim() || '—';
  const statusHeaderStyle = getLineItemStatusHeaderStyle(status);
  const returnedByMeta = getReturnedByTypeMeta(line);
  const forceReturnRemark = getLineForceReturnRemark(line, lotHeader);
  const pendingWithEmployee = line?.isPendingWithEmployee === true || line?.IsPendingWithEmployee === true;
  const sampleOutDate = formatListDate(lineSampleOutDateRaw(line, lotHeader));
  const sampleInDate = formatLineSampleInDate(line);
  const sampleOutDateTime = formatLineDateTimeField(
    line,
    'SampleOutOn',
    'sampleOutOn',
    'OutDate',
    'outDate',
    'SampleOutDate',
    'sampleOutDate'
  );
  const sampleInDateTime = formatLineDateTimeField(
    line,
    'SampleInOn',
    'sampleInOn',
    'InDate',
    'inDate',
    'SampleInDate',
    'sampleInDate',
    'ReturnDate',
    'returnDate'
  );
  const employeeName = lineEmployeeNameRaw(line, lotHeader) || '—';
  const scanMeta = pickLineScanMeta(line);
  const img = lineItemLocalImageUrls[lineItemKey(line)] || lineImageUrl(line);
  const imageHeight = isSmallScreen ? MODAL_CARD_IMAGE_HEIGHT_SM : MODAL_CARD_IMAGE_HEIGHT;

  const cardClick = () => {
    if (adminSelectable) onAdminToggle?.(line);
    else onOpenItem?.(line);
  };

  return (
    <article
      className="lot-detail-item-card"
      style={{
        height: '100%',
        border: adminSelected ? `2px solid ${LOT_DETAIL_BLUE}` : undefined,
        boxShadow: adminSelected ? '0 12px 32px rgba(15, 76, 129, 0.18)' : undefined,
        cursor: adminSelectable ? 'pointer' : undefined,
      }}
      onClick={adminSelectable ? cardClick : undefined}
    >
      <div style={{ position: 'relative', flexShrink: 0, background: '#f1f5f9', overflow: 'hidden' }}>
        {adminSelectable ? (
          <label
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 3,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(15,23,42,0.1)',
              cursor: 'pointer',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={adminSelected}
              onChange={() => onAdminToggle?.(line)}
              style={{ width: 16, height: 16, accentColor: LOT_DETAIL_BLUE, cursor: 'pointer', margin: 0 }}
              aria-label={`Select ${itemCode} for admin return`}
            />
          </label>
        ) : null}
        <span
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 3,
            fontSize: 10,
            fontWeight: 900,
            padding: '5px 10px',
            borderRadius: 999,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            background: statusHeaderStyle.background,
            color: statusHeaderStyle.color,
            border: statusHeaderStyle.border,
            boxShadow: statusHeaderStyle.shadow,
            fontFamily: LOT_DETAIL_FONT,
          }}
        >
          {status}
        </span>
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
            maxHeight: imageHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            overflow: 'hidden',
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #f1f5f9 0%, #ffffff 100%)',
          }}
          imgStyle={{
            width: '100%',
            height: '100%',
            maxHeight: imageHeight - 8,
            objectFit: 'contain',
            objectPosition: 'center',
            display: 'block',
          }}
          placeholder={
            <div
              style={{
                width: '100%',
                height: imageHeight,
                minHeight: imageHeight,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: '#94a3b8',
                background: '#f1f5f9',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: '#fff',
                  border: '1px dashed #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FaInbox size={22} style={{ opacity: 0.4 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700 }}>No image</span>
            </div>
          }
        />
      </div>

      <div
        style={{
          padding: '8px 10px 10px',
          flexShrink: 0,
          background: '#fff',
          borderTop: '1px solid #f1f5f9',
        }}
      >
        <button
          type="button"
          onClick={() => onOpenItem?.(line)}
          className="lot-detail-item-code"
          style={{
            border: 'none',
            background: 'none',
            padding: '0 0 6px',
            margin: 0,
            fontSize: 15,
            fontWeight: 800,
            color: LOT_DETAIL_BLUE,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: LOT_DETAIL_FONT,
            letterSpacing: '-0.01em',
            display: 'block',
            width: '100%',
          }}
        >
          {itemCode}
        </button>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px 10px',
          }}
        >
          <LotDetailFieldCell label="Category" value={category} />
          <LotDetailFieldCell label="Product" value={product} valueColor={LOT_DETAIL_BLUE} />
          <LotDetailFieldCell label="RFID" value={rfid} />
          <LotDetailFieldCell label="Pieces" value={pieces} />
          <LotDetailFieldCell label="Gross Wt" value={lineGrossWt(line)} />
          <LotDetailFieldCell label="Net Wt" value={lineNetWt(line)} />
          <LotDetailFieldCell label="Sample out" value={sampleOutDateTime !== '—' ? sampleOutDateTime : sampleOutDate} valueColor="#0369a1" wrap />
          <LotDetailFieldCell label="Sample in" value={sampleInDateTime !== '—' ? sampleInDateTime : sampleInDate} valueColor="#047857" wrap />
          <LotDetailFieldCell label="Employee" value={employeeName} valueColor="#0f766e" span={2} />
          {scanMeta.sampleOutMode ? (
            <LotDetailFieldCell label="Out mode" value={scanMeta.sampleOutMode} valueColor="#1d4ed8" />
          ) : null}
          {scanMeta.sampleInMode ? (
            <LotDetailFieldCell label="In mode" value={scanMeta.sampleInMode} valueColor="#047857" />
          ) : null}
        </div>
        {(pendingWithEmployee || returnedByMeta) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {pendingWithEmployee ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 999,
                  color: '#92400e',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                With Employee
              </span>
            ) : null}
            {returnedByMeta ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 999,
                  color: returnedByMeta.color,
                  background: returnedByMeta.bg,
                  border: `1px solid ${returnedByMeta.bd}`,
                  letterSpacing: '0.02em',
                }}
              >
                {returnedByMeta.label}
              </span>
            ) : null}
          </div>
        )}
        {forceReturnRemark ? (
          <div
            style={{
              marginTop: 6,
              padding: '6px 8px',
              borderRadius: 8,
              background: '#fff7ed',
              border: '1px solid #fed7aa',
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: '#c2410c', marginBottom: 2 }}>Remark</div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#78350f',
                lineHeight: 1.45,
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
              }}
            >
              {forceReturnRemark}
            </div>
          </div>
        ) : null}
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
    CanAdminReturn: line.canAdminReturn ?? line.CanAdminReturn,
    canAdminReturn: line.canAdminReturn ?? line.CanAdminReturn,
    ReturnedByUserId: line.returnedByUserId ?? line.ReturnedByUserId,
    returnedByUserId: line.returnedByUserId ?? line.ReturnedByUserId,
    ReturnedByType: line.returnedByType ?? line.ReturnedByType,
    returnedByType: line.returnedByType ?? line.ReturnedByType,
    IsForceReturn: line.isForceReturn ?? line.IsForceReturn ?? false,
    isForceReturn: line.isForceReturn ?? line.IsForceReturn ?? false,
    IsPendingWithEmployee: line.isPendingWithEmployee ?? line.IsPendingWithEmployee,
    isPendingWithEmployee: line.isPendingWithEmployee ?? line.IsPendingWithEmployee,
    SampleOutMode: line.sampleOutMode ?? line.SampleOutMode,
    sampleOutMode: line.sampleOutMode ?? line.SampleOutMode,
    SampleInMode: line.sampleInMode ?? line.SampleInMode,
    sampleInMode: line.sampleInMode ?? line.SampleInMode,
    LastActionType: line.lastActionType ?? line.LastActionType,
    lastActionType: line.lastActionType ?? line.LastActionType,
    LastActionMode: line.lastActionMode ?? line.LastActionMode,
    lastActionMode: line.lastActionMode ?? line.LastActionMode,
    SampleOutOn: line.sampleOutOn ?? line.SampleOutOn,
    sampleOutOn: line.sampleOutOn ?? line.SampleOutOn,
    SampleInOn: line.sampleInOn ?? line.SampleInOn,
    sampleInOn: line.sampleInOn ?? line.SampleInOn,
    AdminReturnRemark: line.adminReturnRemark ?? line.AdminReturnRemark,
    adminReturnRemark: line.adminReturnRemark ?? line.AdminReturnRemark,
    ReturnRemark: line.returnRemark ?? line.ReturnRemark,
    returnRemark: line.returnRemark ?? line.ReturnRemark,
    AdminRemark: line.adminRemark ?? line.AdminRemark,
    adminRemark: line.adminRemark ?? line.AdminRemark,
    Remark: line.remark ?? line.Remark,
    remark: line.remark ?? line.Remark,
    Remarks: line.remarks ?? line.Remarks,
    remarks: line.remarks ?? line.Remarks,
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
    'SampleInOn',
    'sampleInOn',
    'InDate',
    'inDate',
    'SampleInDate',
    'sampleInDate',
    'ReturnDate',
    'returnDate',
    'ReturnedDate',
    'returnedDate'
  );

const formatLineSampleInDate = (line) => {
  const raw = lineSampleInDateRaw(line);
  if (!raw) return '—';
  const rawStr = String(raw);
  if (rawStr.includes('T') || /\d{1,2}:\d{2}/.test(rawStr)) {
    return formatLotDateTime(raw);
  }
  return formatListDate(raw);
};

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
  const enriched = {
    ...mapped,
    OutDate: lineSampleOutDateRaw(mapped, lotHeader),
    SampleOutDate: lineSampleOutDateRaw(mapped, lotHeader),
    InDate: lineSampleInDateRaw(mapped),
    SampleInDate: lineSampleInDateRaw(mapped),
    AssignedToUserName: lineEmployeeNameRaw(mapped, lotHeader),
  };
  return {
    ...enriched,
    canAdminReturn: lineCanAdminReturn(enriched, lotHeader),
    CanAdminReturn: lineCanAdminReturn(enriched, lotHeader),
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
  const apiOutItems = Number(entry.OutItems ?? entry.outItems) || 0;
  const totalItems = apiTotal > 0 ? apiTotal : lineItems.length;
  const pendingItems = apiPending > 0 ? apiPending : countPendingLines(lineItems);
  const returnedItems = Number(entry.ReturnedItems ?? entry.returnedItems) || 0;
  const outFromLines = countOutItemsFromLines(lineItems);
  const outItems =
    outFromLines > 0
      ? outFromLines
      : apiOutItems > 0
        ? apiOutItems
        : Math.max(totalItems - returnedItems, 0);
  const reconciledStatus = reconcileRfidSampleLotStatus({
    lotStatus,
    lineItems,
    totalItems,
    returnedItems,
    outItems,
  });
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
    Status: reconciledStatus,
    LotStatus: reconciledStatus,
    PartyType: partyType,
    PartyId: entry.PartyId ?? entry.partyId,
    PartyName: partyName,
    AssignedToUserId: entry.AssignedToUserId ?? entry.assignedToUserId,
    AssignedToUserName: assignee,
    IssueDate: sampleOutDate,
    SampleOutDate: sampleOutDate,
    ExpectedReturnDate: entry.ExpectedReturnDate ?? entry.expectedReturnDate,
    TotalItems: totalItems,
    ReturnedItems: returnedItems,
    OutItems: outItems,
    EmployeeReturnedItems: Number(entry.EmployeeReturnedItems ?? entry.employeeReturnedItems) || 0,
    AdminReturnedItems: Number(entry.AdminReturnedItems ?? entry.adminReturnedItems) || 0,
    ForceReturnedItems: Number(entry.ForceReturnedItems ?? entry.forceReturnedItems) || 0,
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
  const [detailItemStatusFilter, setDetailItemStatusFilter] = useState('all');
  const [detailItemUserFilter, setDetailItemUserFilter] = useState('all');
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedLotIds, setExpandedLotIds] = useState(() => new Set());
  const [itemDetailModal, setItemDetailModal] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportErrors, setExportErrors] = useState({ excel: '', pdf: '' });
  const [lotsViewMode, setLotsViewMode] = useState('grid');
  const [lineItemsViewMode, setLineItemsViewMode] = useState('grid');
  const [lineItemLocalImageUrls, setLineItemLocalImageUrls] = useState({});
  const [imageFolderReady, setImageFolderReady] = useState(false);
  const [adminReturnSelectedIds, setAdminReturnSelectedIds] = useState(() => new Set());
  const [adminReturnRemark, setAdminReturnRemark] = useState('');
  const [adminReturning, setAdminReturning] = useState(false);
  const [adminReturnAllMode, setAdminReturnAllMode] = useState(false);
  const [showAdminReturnModal, setShowAdminReturnModal] = useState(false);
  const [adminReturnSuccess, setAdminReturnSuccess] = useState(null);
  const detailCacheRef = useRef(new Map());
  const lineItemLocalImageUrlsRef = useRef({});
  const isAdminUser = isSuperAdmin();

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
    setDetailItemStatusFilter('all');
    setDetailItemUserFilter('all');
    setAdminReturnSelectedIds(new Set());
    setAdminReturnRemark('');
    setAdminReturnAllMode(false);
    setShowAdminReturnModal(false);
    setAdminReturnSuccess(null);
  }, [detailModal?.header?.Id, detailModal?.header?.SampleLotNo, detailModal?.header?.SampleOutNo]);

  useEffect(() => {
    if (!detailModal) {
      setShowAdminReturnModal(false);
      setAdminReturnSuccess(null);
      setAdminReturnAllMode(false);
    }
  }, [detailModal]);

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

  const detailModalFilterCounts = useMemo(() => {
    const items = detailModalItems;
    return {
      all: items.length,
      out: items.filter((l) => isOutItemStatus(l?.ItemStatus ?? l?.itemStatus)).length,
      returned: items.filter((l) => isReturnedLineStatus(l?.ItemStatus ?? l?.itemStatus)).length,
      employee: items.filter((l) => lineMatchesDetailUserFilter(l, 'employee')).length,
      admin: items.filter((l) => lineMatchesDetailUserFilter(l, 'admin')).length,
      force: items.filter((l) => lineMatchesDetailUserFilter(l, 'force')).length,
    };
  }, [detailModalItems]);

  const filteredDetailModalItems = useMemo(() => {
    return detailModalItems.filter((line) => {
      const status = line?.ItemStatus ?? line?.itemStatus;
      if (detailItemStatusFilter === 'out' && !isOutItemStatus(status)) return false;
      if (detailItemStatusFilter === 'returned' && !isReturnedLineStatus(status)) return false;
      if (!lineMatchesDetailUserFilter(line, detailItemUserFilter)) return false;
      return true;
    });
  }, [detailModalItems, detailItemStatusFilter, detailItemUserFilter]);

  useEffect(() => {
    setDetailModalPage(1);
  }, [detailItemStatusFilter, detailItemUserFilter]);

  const adminReturnableItems = useMemo(() => {
    if (!detailModal?.header) return [];
    return detailModalItems.filter((line) => lineCanAdminReturn(line, detailModal.header));
  }, [detailModal?.header, detailModalItems]);
  const adminReturnSelectedCount = adminReturnSelectedIds.size;
  const adminReturnSelectedLines = useMemo(() => {
    if (!adminReturnSelectedIds.size) return [];
    return detailModalItems.filter((line) => {
      const id = lineLotItemId(line);
      return id != null && adminReturnSelectedIds.has(id);
    });
  }, [detailModalItems, adminReturnSelectedIds]);
  const adminReturnPreviewDateTime = useMemo(
    () =>
      new Date().toLocaleString(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [showAdminReturnModal]
  );
  const allAdminReturnableSelected =
    adminReturnableItems.length > 0 &&
    adminReturnableItems.every((line) => {
      const id = lineLotItemId(line);
      return id != null && adminReturnSelectedIds.has(id);
    });
  const detailModalTotalPages = Math.max(1, Math.ceil(filteredDetailModalItems.length / MODAL_ITEMS_PER_PAGE));
  const detailModalStartIndex = (detailModalPage - 1) * MODAL_ITEMS_PER_PAGE;
  const detailModalEndIndex = detailModalStartIndex + MODAL_ITEMS_PER_PAGE;
  const paginatedDetailModalItems = filteredDetailModalItems.slice(detailModalStartIndex, detailModalEndIndex);
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

  const toggleAdminReturnLine = (line) => {
    const id = lineLotItemId(line);
    if (id == null) return;
    setAdminReturnSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllAdminReturnable = () => {
    setAdminReturnSelectedIds(
      new Set(adminReturnableItems.map((line) => lineLotItemId(line)).filter((id) => id != null))
    );
  };

  const clearAdminReturnSelection = () => {
    setAdminReturnSelectedIds(new Set());
  };

  const applyAdminReturnResponse = (data) => {
    const lotMeta = parseRfidSampleLotReturnMeta(data);
    const bulkRemark = String(data?.adminReturnRemark ?? data?.AdminReturnRemark ?? '').trim();
    const returnedMap = new Map(
      (data?.returnedProducts || data?.ReturnedProducts || []).map((p) => [
        Number(p.lotItemId ?? p.LotItemId),
        p,
      ])
    );
    setDetailModal((prev) => {
      if (!prev) return prev;
      const nextItems = (prev.items || []).map((line) => {
        const id = lineLotItemId(line);
        const hit = id != null ? returnedMap.get(Number(id)) : null;
        if (!hit && !isRfidSampleLotFinalized(lotMeta)) return line;
        if (!hit) {
          if (!isOutItemStatus(line?.ItemStatus ?? line?.itemStatus)) return line;
          return {
            ...line,
            ItemStatus: 'Returned',
            canAdminReturn: false,
            CanAdminReturn: false,
          };
        }
        const returnedByType = hit.returnedByType ?? hit.ReturnedByType ?? 'ForceReturn';
        const isForceReturn =
          hit.isForceReturn ?? hit.IsForceReturn ?? String(returnedByType).trim() === 'ForceReturn';
        const itemRemark =
          hit.adminReturnRemark ??
          hit.AdminReturnRemark ??
          hit.returnRemark ??
          hit.ReturnRemark ??
          hit.adminRemark ??
          hit.AdminRemark ??
          bulkRemark ??
          line.adminReturnRemark ??
          line.AdminReturnRemark;
        return {
          ...line,
          ItemStatus: hit.itemStatus ?? hit.ItemStatus ?? 'Returned',
          ReturnedByType: returnedByType,
          returnedByType,
          IsForceReturn: isForceReturn,
          isForceReturn,
          AdminReturnRemark: itemRemark,
          adminReturnRemark: itemRemark,
          SampleInMode: hit.sampleInMode ?? hit.SampleInMode ?? line.SampleInMode,
          sampleInMode: hit.sampleInMode ?? hit.SampleInMode ?? line.sampleInMode,
          LastActionType: hit.lastActionType ?? hit.LastActionType ?? line.LastActionType,
          lastActionType: hit.lastActionType ?? hit.LastActionType ?? line.lastActionType,
          canAdminReturn: false,
          CanAdminReturn: false,
        };
      });
      const reconciledStatus = reconcileRfidSampleLotStatus({
        lotStatus: lotMeta.lotStatus || prev.header?.Status,
        lineItems: nextItems,
        totalItems: lotMeta.totalItems ?? prev.header?.TotalItems,
        returnedItems: lotMeta.returnedItems ?? prev.header?.ReturnedItems,
        outItems: data?.outItems ?? data?.OutItems ?? prev.header?.OutItems,
      });
      const nextHeader = {
        ...prev.header,
        Status: reconciledStatus,
        LotStatus: reconciledStatus,
        TotalItems: lotMeta.totalItems ?? prev.header?.TotalItems,
        PendingItems: lotMeta.pendingItems ?? prev.header?.PendingItems,
        ReturnedItems: lotMeta.returnedItems ?? prev.header?.ReturnedItems,
        OutItems: data?.outItems ?? data?.OutItems ?? prev.header?.OutItems,
        EmployeeReturnedItems:
          data?.employeeReturnedItems ??
          data?.EmployeeReturnedItems ??
          prev.header?.EmployeeReturnedItems,
        AdminReturnedItems:
          data?.adminReturnedItems ??
          data?.AdminReturnedItems ??
          prev.header?.AdminReturnedItems,
        ForceReturnedItems:
          data?.forceReturnedItems ??
          data?.ForceReturnedItems ??
          prev.header?.ForceReturnedItems,
        Remarks: bulkRemark || prev.header?.Remarks,
        AdminRemark: bulkRemark || prev.header?.AdminRemark,
        AdminReturnRemark: bulkRemark || prev.header?.AdminReturnRemark,
        lotCompleted: lotMeta.lotCompleted && reconciledStatus !== 'PartialReturn',
        LotCompleted: lotMeta.lotCompleted && reconciledStatus !== 'PartialReturn',
      };
      const payload = { header: nextHeader, items: nextItems, activityLog: prev.activityLog ?? [] };
      const cacheKey = String(nextHeader.Id ?? nextHeader.LotId ?? '');
      if (cacheKey) detailCacheRef.current.set(cacheKey, payload);
      return payload;
    });
    setAdminReturnSelectedIds(new Set());
    setAdminReturnAllMode(false);
  };

  const handleAdminBulkReturn = async () => {
    const lotId = detailModal?.header?.Id ?? detailModal?.header?.LotId ?? detailModal?.header?.lotId;
    const clientCode = resolveClientCode(userInfo);
    const ids = Array.from(adminReturnSelectedIds);
    const returnAllOutItems = adminReturnAllMode;
    if (!isAdminUser) {
      addNotification({
        type: 'error',
        title: 'Admin return',
        message: 'Only admin accounts can perform bulk sample return.',
      });
      return;
    }
    if (!lotId || !clientCode) return;
    if (!returnAllOutItems && !ids.length) {
      addNotification({
        type: 'warning',
        title: 'Admin return',
        message: 'Select at least one Out item to return.',
      });
      return;
    }

    setAdminReturning(true);
    try {
      const payload = {
        ClientCode: clientCode,
        LotId: Number(lotId),
        AdminReturnRemark: String(adminReturnRemark || '').trim() || 'Returned by admin',
      };
      if (returnAllOutItems) {
        payload.ReturnAllOutItems = true;
      } else {
        payload.LotItemIds = ids.map((id) => Number(id));
      }
      const { data } = await axios.post(getAdminBulkSampleReturnUrl(), payload, {
        headers: sampleAuthHeaders(),
      });
      if (data?.success === false) {
        throw new Error(data?.message || data?.Message || 'Admin bulk return failed');
      }
      applyAdminReturnResponse(data);
      await fetchSampleOutList();
      const lotMeta = parseRfidSampleLotReturnMeta(data);
      const fallbackMsg =
        data?.message ||
        data?.Message ||
        (returnAllOutItems
          ? `${adminReturnableItems.length} product(s) returned successfully.`
          : `${ids.length} product(s) returned successfully.`);
      const finishUi = getRfidSampleLotFinishUi(lotMeta, { fallbackMessage: fallbackMsg });
      setAdminReturnSuccess({
        message: finishUi.message,
        lotCompleted: lotMeta.lotCompleted,
        lotStatus: lotMeta.lotStatus,
        totalItems: lotMeta.totalItems,
        returnedItems: lotMeta.returnedItems,
        pendingItems: lotMeta.pendingItems,
        outItems: data?.outItems ?? data?.OutItems,
        remainingOutItems: data?.remainingOutItems ?? data?.RemainingOutItems ?? [],
        finishTitle: finishUi.title,
        finishAccent: finishUi.accent,
        finishBg: finishUi.bg,
        finishBorder: finishUi.border,
      });
      addNotification({
        type: 'success',
        title: finishUi.title,
        message: finishUi.message,
      });
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.Message ||
        error.message ||
        'Could not complete admin bulk return';
      addNotification({ type: 'error', title: 'Admin return failed', message: msg });
    } finally {
      setAdminReturning(false);
    }
  };

  const openAdminReturnModal = ({ returnAll = false } = {}) => {
    setAdminReturnSuccess(null);
    setAdminReturnAllMode(returnAll);
    if (returnAll) {
      setAdminReturnSelectedIds(new Set());
    }
    setShowAdminReturnModal(true);
  };

  const openDetail = async (row) => {
    const lotNo = row.SampleLotNo || row.SampleOutNo;
    const lotId = row.Id ?? row.lotId ?? row.LotId;
    const clientCode = resolveClientCode(userInfo);
    const cacheKey = String(lotId || lotNo || '');
    if (!cacheKey || !clientCode) return;

    const cached = detailCacheRef.current.get(cacheKey);
    if (cached) {
      setDetailModal(cached);
    }

    const embedded = Array.isArray(row.LineItems) ? row.LineItems : [];
    if (!lotId && embedded.length > 0) {
      const header = mapRfidSampleLotRow(row);
      const items = enrichDetailLineItems(embedded.map(mapRfidSampleLine), header);
      const payload = { header, items, activityLog: [] };
      detailCacheRef.current.set(cacheKey, payload);
      setDetailLoading(false);
      setDetailModal(payload);
      return;
    }

    if (!lotId) {
      const header = mapRfidSampleLotRow(row);
      const payload = { header, items: enrichDetailLineItems(embedded, header), activityLog: [] };
      detailCacheRef.current.set(cacheKey, payload);
      setDetailLoading(false);
      setDetailModal(payload);
      return;
    }

    setDetailLoading(true);
    if (!cached) {
      setDetailModal({ header: row, items: [], activityLog: [] });
    }
    try {
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
      const activityLog = normalizeArray(
        lotBody?.ActivityLog ??
          lotBody?.activityLog ??
          data?.ActivityLog ??
          data?.activityLog ??
          []
      );
      const payload = { header, items, activityLog };
      detailCacheRef.current.set(cacheKey, payload);
      setDetailModal(payload);
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Details',
        message: e.response?.data?.message || e.message || 'Could not load lot details',
      });
      if (!cached) setDetailModal(null);
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
                    <option value="PartialReturn">Partial return</option>
                    <option value="PartialReturned">Partial returned (legacy)</option>
                    <option value="Closed">Closed</option>
                    <option value="Completed">Completed</option>
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
              borderRadius: '20px',
              maxWidth: 'min(1280px, 98vw)',
              width: '100%',
              maxHeight: '92vh',
              overflow: 'hidden',
              padding: 0,
              position: 'relative',
              boxShadow: '0 32px 80px rgba(15, 23, 42, 0.22), 0 12px 32px rgba(15, 76, 129, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: LOT_DETAIL_FONT,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                flexShrink: 0,
                padding: '18px 22px 16px',
                background: 'linear-gradient(135deg, #0f4c81 0%, #1e3a8a 55%, #1e40af 100%)',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -40,
                  right: -20,
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  background: 'rgba(201, 162, 39, 0.15)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 24,
                        fontWeight: 800,
                        color: '#fff',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                      }}
                    >
                      Lot {detailModal.header?.SampleLotNo || detailModal.header?.SampleOutNo || '—'}
                    </h3>
                    <LotStatusPill status={detailModal.header?.Status} />
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.78)', fontWeight: 500, lineHeight: 1.45 }}>
                    Sample lot details · item return
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailModal(null)}
                  aria-label="Close lot details"
                  style={{
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: 'rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    padding: 8,
                    color: '#fff',
                    flexShrink: 0,
                    lineHeight: 0,
                  }}
                >
                  <FaTimes size={16} />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div
                style={{
                  padding: '56px 24px',
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                  margin: 16,
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
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '16px 20px 8px',
                  }}
                >
                <LotDetailSummaryBar
                  itemsCount={detailModal.header?.TotalItems ?? detailModalItems.length}
                  pending={detailModal.header?.PendingItems ?? '—'}
                  outItems={detailModal.header?.OutItems ?? detailModal.header?.RemainingOutItems ?? '—'}
                  returnedItems={detailModal.header?.ReturnedItems ?? '—'}
                  employeeReturnedItems={detailModal.header?.EmployeeReturnedItems ?? '—'}
                  adminReturnedItems={detailModal.header?.AdminReturnedItems ?? '—'}
                  forceReturnedItems={detailModal.header?.ForceReturnedItems ?? 0}
                  grossWt={detailModalWeights.gross > 0 ? detailModalWeights.gross.toFixed(3) : '—'}
                  netWt={detailModalWeights.net > 0 ? detailModalWeights.net.toFixed(3) : '—'}
                  pieces={detailModalPieces}
                  outDate={formatDate(detailModal.header?.IssueDate || detailModal.header?.SampleOutDate)}
                  dueDate={formatDate(detailModal.header?.ExpectedReturnDate)}
                  employee={lotDisplayParty(detailModal.header)}
                  lotStatus={detailModal.header?.Status}
                />

                {detailModalItems.length > 0 ? (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '8px 10px',
                        marginBottom: 12,
                        padding: '10px 12px',
                        borderRadius: 12,
                        background: '#fafcff',
                        border: '1px solid #e8ecf4',
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>
                        Status
                      </span>
                      <LotDetailFilterPill
                        active={detailItemStatusFilter === 'all'}
                        label="All"
                        count={detailModalFilterCounts.all}
                        onClick={() => setDetailItemStatusFilter('all')}
                      />
                      <LotDetailFilterPill
                        active={detailItemStatusFilter === 'out'}
                        label="Out"
                        count={detailModalFilterCounts.out}
                        onClick={() => setDetailItemStatusFilter('out')}
                      />
                      <LotDetailFilterPill
                        active={detailItemStatusFilter === 'returned'}
                        label="Returned"
                        count={detailModalFilterCounts.returned}
                        onClick={() => setDetailItemStatusFilter('returned')}
                      />
                      <span style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>
                        User
                      </span>
                      <LotDetailFilterPill
                        active={detailItemUserFilter === 'all'}
                        label="All"
                        onClick={() => setDetailItemUserFilter('all')}
                      />
                      <LotDetailFilterPill
                        active={detailItemUserFilter === 'employee'}
                        label="Employee"
                        count={detailModalFilterCounts.employee}
                        onClick={() => setDetailItemUserFilter('employee')}
                      />
                      <LotDetailFilterPill
                        active={detailItemUserFilter === 'admin'}
                        label="Admin"
                        count={detailModalFilterCounts.admin}
                        onClick={() => setDetailItemUserFilter('admin')}
                      />
                      <LotDetailFilterPill
                        active={detailItemUserFilter === 'force'}
                        label="Force"
                        count={detailModalFilterCounts.force}
                        onClick={() => setDetailItemUserFilter('force')}
                      />
                    </div>

                    {isAdminUser && adminReturnableItems.length > 0 ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 12,
                          flexWrap: 'wrap',
                          marginBottom: 12,
                          fontSize: 13,
                        }}
                      >
                        <button
                          type="button"
                          onClick={selectAllAdminReturnable}
                          disabled={allAdminReturnableSelected}
                          style={lotDetailToolbarBtn(allAdminReturnableSelected)}
                        >
                          Select returnable ({adminReturnableItems.length})
                        </button>
                        <span style={{ color: '#e2e8f0', userSelect: 'none' }}>|</span>
                        <button
                          type="button"
                          onClick={clearAdminReturnSelection}
                          disabled={adminReturnSelectedCount === 0}
                          style={lotDetailToolbarBtn(adminReturnSelectedCount === 0)}
                        >
                          Clear
                        </button>
                        <span style={{ color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          <strong style={{ color: LOT_DETAIL_BLUE, fontWeight: 700 }}>
                            {adminReturnSelectedCount}
                          </strong>{' '}
                          selected
                        </span>
                      </div>
                    ) : null}

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
                      {paginatedDetailModalItems.length ? (
                        paginatedDetailModalItems.map((line, idx) => {
                          const lotItemId = lineLotItemId(line);
                          const canReturn =
                            isAdminUser && lineCanAdminReturn(line, detailModal.header);
                          return (
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
                              adminSelectable={canReturn}
                              adminSelected={
                                lotItemId != null && adminReturnSelectedIds.has(lotItemId)
                              }
                              onAdminToggle={toggleAdminReturnLine}
                            />
                          );
                        })
                      ) : (
                        <p
                          style={{
                            gridColumn: '1 / -1',
                            margin: 0,
                            padding: 24,
                            textAlign: 'center',
                            fontSize: 13,
                            color: '#94a3b8',
                          }}
                        >
                          No items match the selected filters.
                        </p>
                      )}
                    </div>
                    {detailModalTotalPages > 1 ? (
                      <ModalGridPagination
                        currentPage={detailModalPage}
                        totalPages={detailModalTotalPages}
                        onPrev={() => setDetailModalPage((p) => Math.max(1, p - 1))}
                        onNext={() => setDetailModalPage((p) => Math.min(detailModalTotalPages, p + 1))}
                      />
                    ) : null}
                  </>
                ) : (
                  <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: 24 }}>
                    No line items in response.
                  </p>
                )}

                </div>

                <div
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    marginTop: 0,
                    padding: '14px 20px 18px',
                    borderTop: '1px solid #eef2f7',
                    flexWrap: 'wrap',
                    background: 'linear-gradient(180deg, #fafcff 0%, #ffffff 100%)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => printRow(detailModal.header)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 4px',
                      fontWeight: 600,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#475569',
                      fontFamily: LOT_DETAIL_FONT,
                    }}
                  >
                    <FaPrint size={14} style={{ color: '#64748b' }} />
                    Print summary
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {isAdminUser && adminReturnableItems.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => openAdminReturnModal({ returnAll: true })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          height: 40,
                          padding: '0 18px',
                          borderRadius: 10,
                          border: '1px solid #fdba74',
                          background: '#fff7ed',
                          color: '#c2410c',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                          fontFamily: LOT_DETAIL_FONT,
                        }}
                      >
                        <FaUndo size={13} />
                        Return all out ({adminReturnableItems.length})
                      </button>
                    ) : null}
                    {isAdminUser && adminReturnableItems.length > 0 ? (
                      <button
                        type="button"
                        disabled={adminReturnSelectedCount === 0}
                        onClick={() => openAdminReturnModal({ returnAll: false })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          height: 40,
                          padding: '0 18px',
                          borderRadius: 10,
                          border: 'none',
                          background: adminReturnSelectedCount === 0 ? '#f1f5f9' : '#ea580c',
                          color: adminReturnSelectedCount === 0 ? '#94a3b8' : '#fff',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: adminReturnSelectedCount === 0 ? 'not-allowed' : 'pointer',
                          fontFamily: LOT_DETAIL_FONT,
                        }}
                      >
                        <FaUndo size={13} />
                        Return selected ({adminReturnSelectedCount})
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setDetailModal(null)}
                      style={{
                        height: 40,
                        padding: '0 20px',
                        fontWeight: 600,
                        borderRadius: 10,
                        border: 'none',
                        background: LOT_DETAIL_BLUE,
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontFamily: LOT_DETAIL_FONT,
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showAdminReturnModal && detailModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.58)',
            zIndex: 10055,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => !adminReturning && setShowAdminReturnModal(false)}
        >
          <div
            role="dialog"
            aria-labelledby="admin-return-modal-title"
            style={{
              background: '#fff',
              borderRadius: 18,
              maxWidth: 680,
              width: '100%',
              maxHeight: '92vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 28px 64px rgba(15, 23, 42, 0.24)',
              fontFamily: LOT_DETAIL_FONT,
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {adminReturnSuccess ? (
              <div style={{ textAlign: 'center', padding: '28px 24px 24px' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: adminReturnSuccess.finishBg || '#ecfdf5',
                    border: `1px solid ${adminReturnSuccess.finishBorder || '#bbf7d0'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                    color: adminReturnSuccess.finishAccent || '#059669',
                  }}
                >
                  <FaCheckCircle size={28} />
                </div>
                <h3
                  id="admin-return-modal-title"
                  style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}
                >
                  {adminReturnSuccess.finishTitle || 'Return successful'}
                </h3>
                <p style={{ margin: '0 0 10px', fontSize: 14, color: '#475569', lineHeight: 1.55 }}>
                  {adminReturnSuccess?.message || ''}
                </p>
                {adminReturnSuccess?.returnedItems != null && adminReturnSuccess?.pendingItems != null ? (
                  <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                    {adminReturnSuccess.returnedItems} returned · {adminReturnSuccess.pendingItems} pending
                    {adminReturnSuccess.totalItems != null ? ` · ${adminReturnSuccess.totalItems} total` : ''}
                  </p>
                ) : null}
                {Array.isArray(adminReturnSuccess?.remainingOutItems) &&
                adminReturnSuccess.remainingOutItems.length > 0 ? (
                  <div
                    style={{
                      textAlign: 'left',
                      marginBottom: 16,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                      Remaining out items ({adminReturnSuccess.remainingOutItems.length})
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                      {adminReturnSuccess.remainingOutItems
                        .map((x) => x?.itemCode ?? x?.ItemCode ?? x?.rfidCode ?? x?.RfidCode ?? '—')
                        .join(', ')}
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowAdminReturnModal(false)}
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: `linear-gradient(135deg, ${LOT_DETAIL_BLUE} 0%, #1e40af 100%)`,
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                    fontFamily: LOT_DETAIL_FONT,
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 55%, #d97706 100%)',
                    color: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 11,
                          background: 'rgba(255,255,255,0.18)',
                          border: '1px solid rgba(255,255,255,0.28)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <FaUndo size={16} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3 id="admin-return-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>
                          {adminReturnAllMode ? 'Return all out items' : 'Admin bulk sample return'}
                        </h3>
                        <p
                          style={{
                            margin: '6px 0 0',
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.88)',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          Lot {detailModal.header?.SampleLotNo || detailModal.header?.SampleOutNo || '—'} ·{' '}
                          {adminReturnAllMode ? (
                            <>
                              <strong style={{ fontWeight: 800 }}>{adminReturnableItems.length}</strong> remaining Out
                              item{adminReturnableItems.length === 1 ? '' : 's'} — returns via scan path →{' '}
                              <strong style={{ fontWeight: 800 }}>Closed</strong>
                            </>
                          ) : allAdminReturnableSelected ? (
                            <>
                              <strong style={{ fontWeight: 800 }}>{adminReturnSelectedCount}</strong> item
                              {adminReturnSelectedCount === 1 ? '' : 's'} selected — admin manual finish →{' '}
                              <strong style={{ fontWeight: 800 }}>Completed</strong>
                            </>
                          ) : (
                            <>
                              <strong style={{ fontWeight: 800 }}>{adminReturnSelectedCount}</strong> item
                              {adminReturnSelectedCount === 1 ? '' : 's'} selected
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdminReturnModal(false)}
                      disabled={adminReturning}
                      aria-label="Close admin return dialog"
                      style={{
                        border: '1px solid rgba(255,255,255,0.28)',
                        background: 'rgba(255,255,255,0.14)',
                        cursor: adminReturning ? 'not-allowed' : 'pointer',
                        padding: 8,
                        borderRadius: 9,
                        color: '#fff',
                        flexShrink: 0,
                        lineHeight: 0,
                      }}
                    >
                      <FaTimes size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ padding: '18px 20px 20px', overflowX: 'hidden', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                  {/* Selected products — full width */}
                  <section
                    style={{
                      borderRadius: 14,
                      border: '1px solid #e8ecf4',
                      background: 'linear-gradient(180deg, #fafcff 0%, #ffffff 100%)',
                      overflow: 'hidden',
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid #eef2f7',
                        background: '#f8fafc',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                        {adminReturnAllMode ? 'All remaining Out products' : 'Selected products'}
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: windowWidth <= 520 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                          gap: '10px 16px',
                        }}
                      >
                        <AdminReturnFieldCell
                          label="Items"
                          value={adminReturnAllMode ? adminReturnableItems.length : adminReturnSelectedCount}
                          valueColor="#c2410c"
                        />
                        <AdminReturnFieldCell
                          label="Return date & time"
                          value={adminReturnPreviewDateTime}
                          valueColor={LOT_DETAIL_BLUE}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        maxHeight: 320,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      {adminReturnAllMode ? (
                        adminReturnableItems.length ? (
                          adminReturnableItems.map((line, idx) => {
                            const code = lineItemCode(line);
                            const img =
                              lineItemLocalImageUrls[lineItemKey(line)] || lineImageUrl(line);
                            return (
                              <AdminReturnProductCard
                                key={lineLotItemId(line) ?? `${code}-${idx}`}
                                line={line}
                                img={img}
                                lineItemCode={lineItemCode}
                                lineCategory={lineCategory}
                                lineProduct={lineProduct}
                                lineRfidValue={lineRfidValue}
                                lineGrossWt={lineGrossWt}
                                lineNetWt={lineNetWt}
                                compact
                              />
                            );
                          })
                        ) : (
                          <div style={{ padding: 16, fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                            No Out items left to return.
                          </div>
                        )
                      ) : adminReturnSelectedLines.length ? (
                        adminReturnSelectedLines.map((line, idx) => {
                          const code = lineItemCode(line);
                          const img =
                            lineItemLocalImageUrls[lineItemKey(line)] || lineImageUrl(line);
                          return (
                            <AdminReturnProductCard
                              key={lineLotItemId(line) ?? `${code}-${idx}`}
                              line={line}
                              img={img}
                              lineItemCode={lineItemCode}
                              lineCategory={lineCategory}
                              lineProduct={lineProduct}
                              lineRfidValue={lineRfidValue}
                              lineGrossWt={lineGrossWt}
                              lineNetWt={lineNetWt}
                            />
                          );
                        })
                      ) : (
                        <p style={{ margin: 0, padding: 16, textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                          No items selected.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* Remark + complete lot */}
                  <section
                    style={{
                      borderRadius: 14,
                      border: '1px solid #fde68a',
                      background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)',
                      padding: '14px 16px',
                    }}
                  >
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#92400e', marginBottom: 4 }}>
                        Return remark
                      </div>
                      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#a16207', lineHeight: 1.45 }}>
                        Optional note recorded with this admin return.
                      </p>
                      <textarea
                        id="admin-return-remark-modal"
                        value={adminReturnRemark}
                        onChange={(e) => setAdminReturnRemark(e.target.value)}
                        placeholder="Type remark here…"
                        rows={4}
                        disabled={adminReturning}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: '1px solid #fcd34d',
                          fontSize: 13,
                          lineHeight: 1.55,
                          color: '#0f172a',
                          resize: 'vertical',
                          minHeight: 96,
                          maxHeight: 140,
                          boxSizing: 'border-box',
                          fontFamily: 'inherit',
                          background: '#fff',
                        }}
                      />
                      <div
                        style={{
                          marginTop: 12,
                          padding: '10px 12px',
                          borderRadius: 9,
                          background: '#fff',
                          border: '1px solid #fde68a',
                          fontSize: 11,
                          color: '#78350f',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        <strong style={{ fontWeight: 800 }}>Note:</strong>{' '}
                        {adminReturnAllMode
                          ? 'Return all Out uses the scan-complete path (Closed) — only when every Out item is returned.'
                          : 'Partial admin return keeps the lot Open or Partial return until every Out item is returned. Completed is set only when all items are back.'}
                      </div>
                    </section>

                  <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setShowAdminReturnModal(false)}
                      disabled={adminReturning}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        background: '#fff',
                        color: '#475569',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: adminReturning ? 'not-allowed' : 'pointer',
                        fontFamily: LOT_DETAIL_FONT,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAdminBulkReturn}
                      disabled={
                        adminReturning ||
                        (adminReturnAllMode ? adminReturnableItems.length === 0 : adminReturnSelectedCount === 0)
                      }
                      style={{
                        flex: 1.2,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: 'none',
                        background:
                          adminReturning ||
                          (adminReturnAllMode
                            ? adminReturnableItems.length === 0
                            : adminReturnSelectedCount === 0)
                            ? '#e2e8f0'
                            : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                        color:
                          adminReturning ||
                          (adminReturnAllMode
                            ? adminReturnableItems.length === 0
                            : adminReturnSelectedCount === 0)
                            ? '#94a3b8'
                            : '#fff',
                        fontWeight: 800,
                        fontSize: 13,
                        cursor:
                          adminReturning ||
                          (adminReturnAllMode
                            ? adminReturnableItems.length === 0
                            : adminReturnSelectedCount === 0)
                            ? 'not-allowed'
                            : 'pointer',
                        fontFamily: LOT_DETAIL_FONT,
                        boxShadow:
                          adminReturning ||
                          (adminReturnAllMode
                            ? adminReturnableItems.length === 0
                            : adminReturnSelectedCount === 0)
                            ? 'none'
                            : '0 6px 20px rgba(234, 88, 12, 0.35)',
                      }}
                    >
                      {adminReturning ? (
                        <FaSpinner style={{ animation: 'spin 0.9s linear infinite' }} />
                      ) : (
                        <FaUndo size={13} />
                      )}
                      {adminReturnAllMode
                        ? 'Return all & close lot'
                        : allAdminReturnableSelected
                          ? 'Return all selected (Completed)'
                          : 'Confirm return'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

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
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .lot-detail-item-card:hover {
          transform: translateY(-3px);
          border-color: rgba(15, 76, 129, 0.28);
          box-shadow: 0 14px 36px rgba(15, 76, 129, 0.14), 0 4px 12px rgba(15, 23, 42, 0.08);
        }
        .lot-detail-item-code:hover {
          opacity: 0.92;
          text-decoration: underline;
        }
        .lot-detail-grid {
          gap: 16px !important;
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
