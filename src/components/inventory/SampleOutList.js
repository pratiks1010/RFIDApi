import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  FaUpload,
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { partyTypeToApiEnum } from '../../services/sampleInOutApi';
import {
  getAdminBulkSampleReturnUrl,
  getAdminExcelSampleInPreviewUrl,
  parseAdminExcelSampleInPreview,
  getAllSampleOutListUrl,
  buildGetAllSampleOutListQuery,
  getLotByIdUrl,
  sampleAuthHeaders,
  parseRfidSampleLotReturnMeta,
  isRfidSampleLotFinalized,
  getRfidSampleLotFinishUi,
  getItemReturnedByTypeMeta,
  isOutItemStatus,
  canEmployeeAcceptSampleLine,
  isForceReturnItem,
  getLineReturnedItemRemark,
  countOutItemsFromLines,
  reconcileRfidSampleLotStatus,
  displayRfidSampleDate,
  pickFormattedDateField,
  extractRfidSampleOutListFromResponse,
  mergeSampleOutListRows,
  sortSampleOutLotsForList,
  RFID_SAMPLE_ALL_LIST_EXTRA_STATUSES,
  isRfidSampleLotFinished,
  parseRfidSampleListDashboard,
  isRfidSamplePartiallyAcceptedLot,
  isRfidSampleFullyAcceptedLot,
  pickLotPendingAcceptanceItems,
  pickLotAcceptedOutItems,
  pickAdminLotStatus,
  formatAdminLotBadgeText,
  normalizeRfidSampleLotStatus,
  normalizeRfidSampleLotStatusForUi,
  formatRfidSampleLotStatusLabel,
  getLotPartialReturnSummaryUrl,
  parseLotPartialReturnSummary,
} from '../../services/rfidSampleApi';
import { PartialReturnSummaryPanel } from './partialReturnSummaryUi';
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
import {
  sortProductsByDesignName,
  lineDesignFieldValue,
} from '../../utils/designSort';

// Admin force/manual return is a manual admin action — send this mode so the
// backend logs SampleInMode as "Manual" instead of defaulting to "Tray".
const ADMIN_RETURN_SCAN_MODE = 'Manual';

const LOT_LIST_PAGE_SIZE = 15;
const LOT_GRID_PAGE_SIZE = 6;
const LOT_GRID_COLUMNS = 3;
const MODAL_GRID_COLUMNS = 3;
const MODAL_GRID_ROWS = 1;
const MODAL_ITEMS_PER_PAGE = MODAL_GRID_COLUMNS * MODAL_GRID_ROWS;
const MODAL_CARD_IMAGE_HEIGHT = 280;
const MODAL_CARD_IMAGE_HEIGHT_SM = 220;
const LINE_GRID_IMAGE_RESOLVE_LIMIT = 120;

const LOT_DETAIL_BLUE = '#0f4c81';
const LOT_DETAIL_GOLD = '#c9a227';
const LOT_DETAIL_FONT = "'Inter', 'Poppins', system-ui, -apple-system, sans-serif";

const LOT_STATUS_LABELS = {
  PendingAcceptance: 'Pending acceptance',
  PartialAccepted: 'Partial accepted',
  Open: 'Open',
  PartialReturn: 'Partial return',
  PartialReturned: 'Partial return',
  Closed: 'Completed',
  Completed: 'Completed',
};

const humanizeLotStatus = (status) => formatRfidSampleLotStatusLabel(status);

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

const LotDetailMetaCell = ({ label, value, valueColor = '#0f172a' }) => (
  <div style={{ minWidth: 0, fontFamily: LOT_DETAIL_FONT }}>
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: '#64748b',
        marginBottom: 3,
        lineHeight: 1.35,
        letterSpacing: '0.01em',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 13,
        fontWeight: 800,
        color: valueColor,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.4,
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      }}
    >
      {value}
    </div>
  </div>
);

const LotDetailCountInline = ({ label, value, color = '#0f172a', bg = '#f1f5f9' }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
      fontWeight: 600,
      color: '#64748b',
      fontFamily: LOT_DETAIL_FONT,
      whiteSpace: 'nowrap',
    }}
  >
    {label}
    <strong
      style={{
        fontSize: 13,
        fontWeight: 800,
        color,
        background: bg,
        padding: '2px 8px',
        borderRadius: 6,
        fontVariantNumeric: 'tabular-nums',
        minWidth: 22,
        textAlign: 'center',
      }}
    >
      {value ?? '—'}
    </strong>
  </span>
);

const LotDetailReturnInline = ({ employeeReturnedItems, adminReturnedItems, forceReturnedItems }) => (
  <div
    style={{
      display: 'inline-flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '6px 10px',
      fontFamily: LOT_DETAIL_FONT,
    }}
  >
    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      Returns
    </span>
    {[
      { label: 'Emp', value: employeeReturnedItems, color: '#047857', bg: '#ecfdf5' },
      { label: 'Admin', value: adminReturnedItems, color: '#15803d', bg: '#f0fdf4' },
      { label: 'Manual', value: forceReturnedItems ?? 0, color: '#c2410c', bg: '#fff7ed' },
    ].map((item) => (
      <span
        key={item.label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 6,
          background: item.bg,
          fontSize: 11,
          fontWeight: 700,
          color: item.color,
        }}
      >
        {item.label}
        <strong style={{ fontSize: 12, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
          {item.value ?? 0}
        </strong>
      </span>
    ))}
  </div>
);

const pickLoginDisplayName = (src) => {
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

const resolveLoginDisplayName = (userInfo) => {
  const fromState = pickLoginDisplayName(userInfo);
  if (fromState) return fromState;
  try {
    return pickLoginDisplayName(JSON.parse(localStorage.getItem('userInfo') || '{}'));
  } catch {
    return '';
  }
};

const lotSampleInDateRaw = (header, lines = []) => {
  const fromHeader = pickLineField(
    header,
    'ClosedDate',
    'closedDate',
    'SampleInDate',
    'sampleInDate',
    'InDate',
    'inDate',
    'CompletedDate',
    'completedDate',
    'ClosedOn',
    'closedOn',
    'CompletedOn',
    'completedOn'
  );
  if (fromHeader) return fromHeader;

  let latestRaw = '';
  let latestTime = -1;
  (lines || []).forEach((line) => {
    const raw = lineSampleInDateRaw(line);
    if (!raw) return;
    const t = new Date(String(raw).trim()).getTime();
    if (!Number.isNaN(t) && t > latestTime) {
      latestTime = t;
      latestRaw = raw;
    }
  });
  return latestRaw;
};

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
  pendingAcceptanceItems,
  isPartiallyAccepted,
  isFullyAccepted,
  employeeReturnedItems,
  adminReturnedItems,
  forceReturnedItems,
  returnedItems,
  grossWt,
  netWt,
  pieces,
  totalProducts,
  designCount,
  outDate,
  inDate,
  employee,
  loginUser,
  lotStatus,
  adminSelectAll,
}) => {
  const statusKey = normalizeRfidSampleLotStatus(lotStatus).replace('closed', 'completed');
  const statusTone = statusKey.includes('completed')
    ? { bg: '#f5f3ff', fg: '#6d28d9', bd: '#ddd6fe' }
    : statusKey.includes('open')
        ? { bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' }
        : statusKey.includes('partial')
          ? { bg: '#fff7ed', fg: '#c2410c', bd: '#fed7aa' }
          : statusKey.includes('pending')
            ? { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' }
            : { bg: '#f8fafc', fg: '#475569', bd: '#e2e8f0' };

  const sectionRule = { height: 1, background: '#eef2f7', margin: '2px 0' };

  // Accepted must always reconcile with the total: a freshly issued lot reports
  // OutItems = total while every item is still pending acceptance, so derive the
  // accepted count as (total − pending acceptance) instead of trusting OutItems.
  const totalForAccept = Number(itemsCount);
  const pendingForAccept = Number(pendingAcceptanceItems);
  const acceptedItems =
    Number.isFinite(totalForAccept) && Number.isFinite(pendingForAccept)
      ? Math.max(0, totalForAccept - pendingForAccept)
      : outItems;

  return (
    <div
      style={{
        marginBottom: 14,
        borderRadius: 12,
        border: '1px solid #e8ecf4',
        background: '#fff',
        overflow: 'hidden',
        fontFamily: LOT_DETAIL_FONT,
        boxShadow: '0 2px 12px rgba(15, 76, 129, 0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 14px',
          borderBottom: '1px solid #eef2f7',
          background: statusTone.bg,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Lot summary
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: statusTone.fg,
            background: '#fff',
            border: `1px solid ${statusTone.bd}`,
          }}
        >
          {formatAdminLotBadgeText({
            lotStatus,
            Status: lotStatus,
            LotStatus: lotStatus,
            totalItems: itemsCount,
            TotalItems: itemsCount,
            acceptedItemsCount: outItems,
            outItems,
            OutItems: outItems,
            pendingAcceptanceItems,
            PendingAcceptanceItems: pendingAcceptanceItems,
          })}
        </span>
      </div>

      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '10px 18px',
          }}
        >
          <LotDetailMetaCell label="Sample out date" value={outDate} valueColor={LOT_DETAIL_BLUE} />
          <LotDetailMetaCell label="Sample in date" value={inDate} valueColor="#047857" />
        </div>

        <div style={sectionRule} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px 18px',
          }}
        >
          <LotDetailMetaCell label="Sample Assigned to" value={employee} valueColor="#0f766e" />
          <LotDetailMetaCell label="Sample Assigned BY" value={loginUser} valueColor={LOT_DETAIL_BLUE} />
        </div>

        <div style={sectionRule} />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '10px 14px',
          }}
        >
          <LotDetailCountInline label="Items" value={itemsCount} color="#1e40af" bg="#eff6ff" />
          {isFullyAccepted ? (
            <>
              <LotDetailCountInline label="Out" value={outItems} color="#0369a1" bg="#e0f2fe" />
              <LotDetailCountInline label="Fully accepted" value="Yes" color="#047857" bg="#ecfdf5" />
            </>
          ) : isPartiallyAccepted || Number(pendingAcceptanceItems) > 0 ? (
            <>
              <LotDetailCountInline
                label="Accepted"
                value={acceptedItems}
                color="#0369a1"
                bg="#e0f2fe"
              />
              <LotDetailCountInline
                label="Pending acceptance"
                value={pendingAcceptanceItems ?? '—'}
                color="#b45309"
                bg="#fffbeb"
              />
            </>
          ) : (
            <>
              <LotDetailCountInline label="Pending" value={pending} color="#b45309" bg="#fffbeb" />
              <LotDetailCountInline label="Out" value={outItems} color="#0369a1" bg="#e0f2fe" />
            </>
          )}
          <LotDetailCountInline label="Returned" value={returnedItems ?? '—'} color="#047857" bg="#ecfdf5" />
          <span style={{ width: 1, height: 18, background: '#e2e8f0', flexShrink: 0 }} aria-hidden />
          <LotDetailReturnInline
            employeeReturnedItems={employeeReturnedItems}
            adminReturnedItems={adminReturnedItems}
            forceReturnedItems={forceReturnedItems}
          />
        </div>

        <div style={sectionRule} />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '14px 22px',
            }}
          >
            <LotDetailInlineStat label="Gross Wt" value={grossWt} />
            <LotDetailInlineStat label="Net Wt" value={netWt} />
            <LotDetailInlineStat label="Pieces" value={pieces} />
            <LotDetailInlineStat
              label="No of RFID"
              value={totalProducts ?? itemsCount ?? '—'}
              valueColor={LOT_DETAIL_BLUE}
            />
            <LotDetailInlineStat
              label="No of Design"
              value={designCount ?? '—'}
              valueColor={LOT_DETAIL_BLUE}
            />
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '14px 18px',
              marginLeft: 'auto',
            }}
          >
            {adminSelectAll?.show ? (
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#334155',
                  userSelect: 'none',
                  fontFamily: LOT_DETAIL_FONT,
                  fontSize: 13,
                }}
              >
                <input
                  ref={adminSelectAll.checkboxRef}
                  type="checkbox"
                  checked={adminSelectAll.checked}
                  onChange={adminSelectAll.onChange}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: LOT_DETAIL_BLUE,
                    cursor: 'pointer',
                    margin: 0,
                  }}
                  aria-label={adminSelectAll.ariaLabel || 'Select all returnable items'}
                />
                {adminSelectAll.label}
              </label>
            ) : null}
          </div>
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
  const raw =
    line?.LotItemId ??
    line?.lotItemId ??
    line?.Id ??
    line?.id;
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

const pickLineScanMeta = (line) => {
  const lastActionMode = line?.lastActionMode ?? line?.LastActionMode ?? '';
  const lastActionType = String(line?.lastActionType ?? line?.LastActionType ?? '').toLowerCase();
  const status = String(line?.ItemStatus ?? line?.itemStatus ?? '');
  const isOut = isOutItemStatus(status);
  const isReturned = isReturnedLineStatus(status);

  let sampleOutMode = line?.sampleOutMode ?? line?.SampleOutMode ?? '';
  let sampleInMode = line?.sampleInMode ?? line?.SampleInMode ?? '';

  // Backend often carries only the most recent action's mode (lastActionMode).
  // For an item still OUT, that last action is the sample-out, so use it as the
  // out mode. For a returned item, the last action mode is the sample-in mode.
  if (!sampleOutMode && lastActionMode && (isOut || lastActionType.includes('out'))) {
    sampleOutMode = lastActionMode;
  }
  if (!sampleInMode && lastActionMode && (isReturned || lastActionType.includes('in'))) {
    sampleInMode = lastActionMode;
  }

  return {
    sampleOutMode,
    sampleInMode,
    lastActionType: line?.lastActionType ?? line?.LastActionType ?? '',
    lastActionMode,
    sampleOutOn: line?.sampleOutOn ?? line?.SampleOutOn ?? line?.OutDate ?? line?.outDate ?? '',
    sampleInOn: line?.sampleInOn ?? line?.SampleInOn ?? line?.InDate ?? line?.inDate ?? '',
  };
};

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

const lotTotalProductCount = (item, lines) => {
  const apiTotal = Number(item?.TotalItems ?? item?.totalItems) || 0;
  if (apiTotal > 0) return apiTotal;
  return Array.isArray(lines) ? lines.length : 0;
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

const lotListStatusSx = (status) => {
  const s = String(normalizeRfidSampleLotStatusForUi(status) ?? '—').toLowerCase();
  if (s.includes('completed')) return { bg: '#f5f3ff', fg: '#6d28d9', bd: '#ddd6fe' };
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

const displayLotSampleOutDateTime = (item) =>
  displayRfidSampleDate(
    item,
    ['sampleOutDate', 'issueDate', 'SampleOutDate', 'IssueDate', 'createdOn', 'CreatedOn'],
    formatLotDateTime
  );

const displayLotExpectedReturnDate = (item) =>
  displayRfidSampleDate(item, ['expectedReturnDate', 'ExpectedReturnDate'], formatListDate);

const displayLotSampleInDateTime = (header, lines = []) => {
  const formatted =
    pickFormattedDateField(header, 'actualReturnDate') ||
    pickFormattedDateField(header, 'closedDate') ||
    pickFormattedDateField(header, 'sampleInDate');
  if (formatted) return formatted;
  return formatLotDateTime(lotSampleInDateRaw(header, lines));
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

const LotStatusPill = ({ status, lot }) => {
  const statusForStyle = lot ? pickAdminLotStatus(lot) : status;
  const sx = lotListStatusSx(statusForStyle);
  const t = lot ? formatAdminLotBadgeText(lot) : humanizeLotStatus(status);
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
  const totalProducts = lotTotalProductCount(item, lines);
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
  const sampleOutDateTime = displayLotSampleOutDateTime(item);
  const summaryTitle = `Gross: ${grossDisplay} · Net: ${netDisplay} · Pcs: ${totalPieces} · Products: ${totalProducts}`;
  const detailTitle = `Sample Out: ${sampleOutDateTime} · Due: ${displayLotExpectedReturnDate(item)} · Item: ${activeCode}${
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
          <LotStatusPill status={item.Status} lot={item} />
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
        {LOT_CARD_DOT}
        <span style={LOT_CARD_LABEL}>Products:</span>{' '}
        <span style={{ ...LOT_CARD_VALUE, color: '#0f4c81' }}>{totalProducts}</span>
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
        <span style={LOT_CARD_VALUE}>{displayLotExpectedReturnDate(item)}</span>
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
        {isRfidSamplePartiallyAcceptedLot(item) || isRfidSampleFullyAcceptedLot(item) ? (
          <>
            {LOT_CARD_DOT}
            <span style={LOT_CARD_LABEL}>Out:</span>{' '}
            <span style={{ ...LOT_CARD_VALUE, color: '#0369a1' }}>{pickLotAcceptedOutItems(item)}</span>
            {isRfidSampleFullyAcceptedLot(item) ? (
              <>
                {LOT_CARD_DOT}
                <span style={{ ...LOT_CARD_VALUE, color: '#047857' }}>Fully accepted</span>
              </>
            ) : (
              <>
                {LOT_CARD_DOT}
                <span style={LOT_CARD_LABEL}>Pending accept:</span>{' '}
                <span style={{ ...LOT_CARD_VALUE, color: '#b45309' }}>{pickLotPendingAcceptanceItems(item)}</span>
              </>
            )}
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

/** Out on sample but employee has not accepted yet. */
const isPendingAcceptanceLine = (line) => {
  if (!line || typeof line !== 'object') return false;
  const status = line?.ItemStatus ?? line?.itemStatus;
  if (isReturnedLineStatus(status)) return false;
  if (line.isPendingWithEmployee === true || line.IsPendingWithEmployee === true) return true;
  return canEmployeeAcceptSampleLine(line);
};

const formatLineDateTimeField = (line, ...keys) => {
  const raw = pickLineField(line, ...keys);
  if (!raw) return '—';
  return formatLotDateTime(raw);
};

const displayLineSampleOutOn = (line, lotHeader) => {
  const formatted =
    pickFormattedDateField(line, 'sampleOutOn') ||
    pickFormattedDateField(line, 'sampleOutDate') ||
    pickFormattedDateField(lotHeader, 'sampleOutDate');
  if (formatted) return formatted;
  return formatLineDateTimeField(
    line,
    'SampleOutOn',
    'sampleOutOn',
    'OutDate',
    'outDate',
    'SampleOutDate',
    'sampleOutDate'
  );
};

const displayLineSampleInOn = (line) => {
  const formatted =
    pickFormattedDateField(line, 'sampleInOn') ||
    pickFormattedDateField(line, 'actualReturnDate');
  if (formatted) return formatted;
  return formatLineDateTimeField(
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

const AdminReturnProductDetailLine = ({
  line,
  lineCategory,
  lineProduct,
  lineDesign,
  lineRfidValue,
  lineGrossWt,
  lineNetWt,
}) => {
  const segments = [
    { label: 'Category', value: lineCategory(line) },
    { label: 'Design', value: lineDesign ? lineDesign(line) : '—' },
    { label: 'Product', value: lineProduct(line) },
    { label: 'RFID', value: lineRfidValue(line) },
    { label: 'Gr', value: lineGrossWt(line) },
    { label: 'Net', value: lineNetWt(line) },
  ];
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        color: '#1e293b',
        lineHeight: 1.5,
        wordBreak: 'break-word',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {segments.map((seg, idx) => (
        <span key={seg.label}>
          {idx > 0 ? ' · ' : null}
          <span style={{ color: '#64748b', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {seg.label}{' '}
          </span>
          <span style={{ fontWeight: 800, color: '#0f172a' }}>{seg.value}</span>
        </span>
      ))}
    </div>
  );
};

const AdminReturnProductCard = ({
  line,
  img,
  lineItemCode,
  lineCategory,
  lineProduct,
  lineDesign,
  lineRfidValue,
  lineGrossWt,
  lineNetWt,
  compact = false,
  dense = false,
  reviewRemark = '',
  onReviewRemarkChange,
  bulkRemarkFallback = '',
}) => {
  const code = lineItemCode(line);
  const useRowLayout = dense || !compact;

  if (dense) {
    return (
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          borderRadius: 10,
          border: '1px solid #eef2f7',
          background: '#fff',
          padding: '8px 10px',
          boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            flexShrink: 0,
            borderRadius: 8,
            background: '#f8fafc',
            border: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {img ? (
            <img src={img} alt={code} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <FaInbox size={20} style={{ color: '#cbd5e1' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: LOT_DETAIL_BLUE, marginBottom: 3, lineHeight: 1.2 }}>
            {code}
          </div>
          <div style={{ marginBottom: onReviewRemarkChange ? 6 : 0 }}>
            <AdminReturnProductDetailLine
              line={line}
              lineCategory={lineCategory}
              lineProduct={lineProduct}
              lineDesign={lineDesign}
              lineRfidValue={lineRfidValue}
              lineGrossWt={lineGrossWt}
              lineNetWt={lineNetWt}
            />
          </div>
          {onReviewRemarkChange ? (
            <div style={{ marginTop: 6 }}>
              <input
                type="text"
                value={reviewRemark}
                onChange={(e) => onReviewRemarkChange(e.target.value)}
                placeholder={bulkRemarkFallback || 'Product review remark…'}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 7,
                  border: '1px solid #fcd34d',
                  fontSize: 11,
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  background: '#fffbeb',
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

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
          <AdminReturnFieldCell label="Design" value={lineDesign ? lineDesign(line) : '—'} />
          <AdminReturnFieldCell label="Product" value={lineProduct(line)} valueColor={LOT_DETAIL_BLUE} />
          <AdminReturnFieldCell label="RFID" value={lineRfidValue(line)} />
          <AdminReturnFieldCell label="Gross Wt" value={lineGrossWt(line)} />
          <AdminReturnFieldCell label="Net Wt" value={lineNetWt(line)} span={useRowLayout ? 1 : 2} />
        </div>
        {onReviewRemarkChange ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
              Admin review remark
            </div>
            <textarea
              value={reviewRemark}
              onChange={(e) => onReviewRemarkChange(e.target.value)}
              placeholder={bulkRemarkFallback || 'Per-product review (falls back to lot remark)…'}
              rows={2}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #fcd34d',
                fontSize: 12,
                lineHeight: 1.45,
                color: '#0f172a',
                resize: 'vertical',
                minHeight: 52,
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                background: '#fff',
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

const ADMIN_RETURN_REMARK_PAGE_SIZE = 50;

const AdminReturnProductsAccordion = ({
  lines,
  lineItemCode,
  lineCategory,
  lineProduct,
  lineDesign,
  lineRfidValue,
  lineGrossWt,
  lineNetWt,
  lineLotItemId,
  lineItemKey,
  lineItemLocalImageUrls,
  lineImageUrl,
  productRemarks = {},
  onRemarkChange,
  lotRemarkFallback = '',
  disabled = false,
}) => {
  const itemRows = useMemo(
    () =>
      (lines || []).map((line, idx) => {
        const lotItemId = lineLotItemId(line);
        const code = lineItemCode(line);
        return {
          line,
          idx,
          lotItemId,
          code,
          img: lineItemLocalImageUrls[lineItemKey(line)] || lineImageUrl(line),
          category: lineCategory(line),
          product: lineProduct(line),
          design: lineDesign ? lineDesign(line) : '—',
          rfid: lineRfidValue(line),
          gross: lineGrossWt(line),
          net: lineNetWt(line),
          remark: String(productRemarks[lotItemId] ?? productRemarks[String(lotItemId)] ?? '').trim(),
        };
      }),
    [
      lines,
      lineItemCode,
      lineCategory,
      lineProduct,
      lineDesign,
      lineRfidValue,
      lineGrossWt,
      lineNetWt,
      lineLotItemId,
      lineItemKey,
      lineItemLocalImageUrls,
      lineImageUrl,
      productRemarks,
    ]
  );

  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [remarkSearch, setRemarkSearch] = useState('');
  const [remarkPage, setRemarkPage] = useState(1);

  useEffect(() => {
    setRemarkPage(1);
    setRemarkSearch('');
  }, [lines?.length]);

  const filteredRemarkRows = useMemo(() => {
    const q = remarkSearch.trim().toLowerCase();
    if (!q) return itemRows;
    return itemRows.filter((row) =>
      [row.code, row.design, row.category, row.rfid, row.product, row.remark]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [itemRows, remarkSearch]);

  const remarkTotalPages = Math.max(
    1,
    Math.ceil(filteredRemarkRows.length / ADMIN_RETURN_REMARK_PAGE_SIZE)
  );

  useEffect(() => {
    setRemarkPage((p) => Math.min(p, remarkTotalPages));
  }, [remarkTotalPages]);

  const paginatedRemarkRows = useMemo(() => {
    const start = (remarkPage - 1) * ADMIN_RETURN_REMARK_PAGE_SIZE;
    return filteredRemarkRows.slice(start, start + ADMIN_RETURN_REMARK_PAGE_SIZE);
  }, [filteredRemarkRows, remarkPage]);

  useEffect(() => {
    if (itemRows.length === 1 && itemRows[0].lotItemId != null) {
      setExpandedIds(new Set([itemRows[0].lotItemId]));
      return;
    }
    if (itemRows.length > 1) {
      const firstId = itemRows[0]?.lotItemId;
      setExpandedIds(firstId != null ? new Set([firstId]) : new Set());
    } else {
      setExpandedIds(new Set());
    }
  }, [itemRows.length, itemRows[0]?.lotItemId]);

  const remarkFilledCount = itemRows.filter((row) => row.remark).length;
  const multi = itemRows.length > 1;

  const toggleExpanded = (lotItemId) => {
    if (lotItemId == null) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(lotItemId)) next.delete(lotItemId);
      else next.add(lotItemId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(itemRows.map((row) => row.lotItemId).filter((id) => id != null)));
  };

  const collapseAll = () => setExpandedIds(new Set());

  const applyLotRemarkToEmpty = () => {
    const bulk = String(lotRemarkFallback || '').trim();
    if (!bulk || !onRemarkChange) return;
    itemRows.forEach((row) => {
      if (row.lotItemId != null && !row.remark) onRemarkChange(row.lotItemId, bulk);
    });
  };

  const applyLotRemarkToAll = () => {
    const bulk = String(lotRemarkFallback || '').trim();
    if (!bulk || !onRemarkChange) return;
    itemRows.forEach((row) => {
      if (row.lotItemId != null) onRemarkChange(row.lotItemId, bulk);
    });
  };

  const useBulkRemarkTable = itemRows.length > 1;

  if (!itemRows.length) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
        No items to return.
      </div>
    );
  }

  return (
    <section
      style={{
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        background: '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: useBulkRemarkTable ? 1 : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 12px',
          background: 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)',
          borderBottom: '1px solid #eef2f7',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
            Returning products — remarks ({itemRows.length})
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
            {remarkFilledCount} with remark · {itemRows.length - remarkFilledCount} using lot default
          </div>
        </div>
        {multi ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <input
              type="search"
              value={remarkSearch}
              onChange={(e) => {
                setRemarkSearch(e.target.value);
                setRemarkPage(1);
              }}
              placeholder="Search item / RFID…"
              disabled={disabled}
              style={{
                minWidth: 140,
                flex: '1 1 140px',
                maxWidth: 220,
                padding: '5px 8px',
                borderRadius: 7,
                border: '1px solid #e2e8f0',
                fontSize: 11,
                fontFamily: LOT_DETAIL_FONT,
              }}
            />
            {!useBulkRemarkTable ? (
              <>
                <button type="button" onClick={expandAll} disabled={disabled} style={adminReturnMiniBtn(disabled)}>
                  Expand all
                </button>
                <button type="button" onClick={collapseAll} disabled={disabled} style={adminReturnMiniBtn(disabled)}>
                  Collapse all
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={applyLotRemarkToEmpty}
              disabled={disabled || !String(lotRemarkFallback || '').trim()}
              style={adminReturnMiniBtn(disabled || !String(lotRemarkFallback || '').trim(), true)}
              title="Copy lot remark into empty product fields"
            >
              Fill empty
            </button>
            <button
              type="button"
              onClick={applyLotRemarkToAll}
              disabled={disabled || !String(lotRemarkFallback || '').trim()}
              style={adminReturnMiniBtn(disabled || !String(lotRemarkFallback || '').trim(), true)}
              title="Apply lot remark to every product"
            >
              Apply to all
            </button>
          </div>
        ) : null}
      </div>

      {useBulkRemarkTable ? (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <div
            style={{
              overflow: 'auto',
              maxHeight: 'min(420px, 52vh)',
              borderTop: '1px solid #eef2f7',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 11,
                minWidth: 640,
              }}
            >
              <thead>
                <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                  {['#', 'Item', 'Design', 'RFID', 'Gr', 'Net', 'Product remark'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '7px 8px',
                        textAlign: 'left',
                        fontWeight: 800,
                        color: '#64748b',
                        borderBottom: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRemarkRows.map((row, idx) => {
                  const rowNum = (remarkPage - 1) * ADMIN_RETURN_REMARK_PAGE_SIZE + idx + 1;
                  return (
                    <tr key={row.lotItemId ?? `${row.code}-${row.idx}`} style={{ background: idx % 2 ? '#fafbfc' : '#fff' }}>
                      <td style={{ padding: '6px 8px', color: '#94a3b8', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {rowNum}
                      </td>
                      <td style={{ padding: '6px 8px', fontWeight: 800, color: LOT_DETAIL_BLUE, whiteSpace: 'nowrap' }}>
                        {row.code}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#475569', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.design}>
                        {row.design}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#475569', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {row.rfid}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#15803d', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {row.gross}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#dc2626', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {row.net}
                      </td>
                      <td style={{ padding: '6px 8px', minWidth: 180 }}>
                        <input
                          type="text"
                          value={productRemarks[row.lotItemId] ?? productRemarks[String(row.lotItemId)] ?? ''}
                          onChange={(e) => onRemarkChange?.(row.lotItemId, e.target.value)}
                          placeholder={lotRemarkFallback || 'Product remark…'}
                          disabled={disabled}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: 7,
                            border: row.remark ? '1px solid #86efac' : '1px solid #fcd34d',
                            fontSize: 11,
                            lineHeight: 1.35,
                            color: '#0f172a',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            background: '#fff',
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {remarkTotalPages > 1 || filteredRemarkRows.length !== itemRows.length ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '8px 10px',
                borderTop: '1px solid #eef2f7',
                background: '#fafcff',
                fontSize: 11,
                color: '#64748b',
                flexWrap: 'wrap',
              }}
            >
              <span>
                Showing {(remarkPage - 1) * ADMIN_RETURN_REMARK_PAGE_SIZE + 1}–
                {Math.min(remarkPage * ADMIN_RETURN_REMARK_PAGE_SIZE, filteredRemarkRows.length)} of{' '}
                {filteredRemarkRows.length}
                {filteredRemarkRows.length !== itemRows.length ? ` (${itemRows.length} total)` : ''}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  disabled={disabled || remarkPage <= 1}
                  onClick={() => setRemarkPage((p) => Math.max(1, p - 1))}
                  style={adminReturnMiniBtn(disabled || remarkPage <= 1)}
                >
                  Prev
                </button>
                <span style={{ fontWeight: 700, color: '#334155', alignSelf: 'center' }}>
                  {remarkPage} / {remarkTotalPages}
                </span>
                <button
                  type="button"
                  disabled={disabled || remarkPage >= remarkTotalPages}
                  onClick={() => setRemarkPage((p) => Math.min(remarkTotalPages, p + 1))}
                  style={adminReturnMiniBtn(disabled || remarkPage >= remarkTotalPages)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
      <div
        style={{
          maxHeight: multi ? 'min(360px, 42vh)' : undefined,
          overflowY: multi ? 'auto' : 'visible',
          overflowX: 'hidden',
          padding: multi ? '8px' : 0,
          display: 'flex',
          flexDirection: 'column',
          gap: multi ? 6 : 0,
        }}
      >
        {itemRows.map((row) => {
          const expanded = !multi || expandedIds.has(row.lotItemId);
          const rowKey = row.lotItemId ?? `${row.code}-${row.idx}`;

          if (!multi) {
            return (
              <AdminReturnProductCard
                key={rowKey}
                dense
                line={row.line}
                img={row.img}
                lineItemCode={lineItemCode}
                lineCategory={lineCategory}
                lineProduct={lineProduct}
                lineDesign={lineDesign}
                lineRfidValue={lineRfidValue}
                lineGrossWt={lineGrossWt}
                lineNetWt={lineNetWt}
                reviewRemark={row.remark}
                onReviewRemarkChange={(value) => onRemarkChange?.(row.lotItemId, value)}
                bulkRemarkFallback={lotRemarkFallback}
              />
            );
          }

          return (
            <div
              key={rowKey}
              style={{
                borderRadius: 10,
                border: expanded ? '1px solid #fcd34d' : '1px solid #eef2f7',
                background: expanded ? '#fffbeb' : '#fff',
                overflow: 'hidden',
                boxShadow: expanded ? '0 2px 10px rgba(180, 83, 9, 0.08)' : '0 1px 3px rgba(15,23,42,0.04)',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
            >
              <button
                type="button"
                onClick={() => toggleExpanded(row.lotItemId)}
                disabled={disabled}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  border: 'none',
                  background: 'transparent',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <FaChevronDown
                  size={11}
                  style={{
                    color: '#64748b',
                    flexShrink: 0,
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s ease',
                  }}
                />
                <div
                  style={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {row.img ? (
                    <img src={row.img} alt={row.code} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <FaInbox size={16} style={{ color: '#cbd5e1' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: LOT_DETAIL_BLUE }}>{row.code}</span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 999,
                        background: row.remark ? '#dcfce7' : '#f1f5f9',
                        color: row.remark ? '#15803d' : '#64748b',
                        border: row.remark ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                      }}
                    >
                      {row.remark ? 'Remark set' : 'No remark'}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: '#64748b',
                      marginTop: 2,
                      lineHeight: 1.4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={`${row.category} · ${row.design} · ${row.product} · RFID ${row.rfid}`}
                  >
                    <span style={{ fontWeight: 800, color: '#334155' }}>{row.category}</span>
                    {' · '}
                    <span style={{ fontWeight: 800, color: '#334155' }}>{row.design}</span>
                    {' · '}
                    {row.product} · RFID {row.rfid}
                  </div>
                  {!expanded && row.remark ? (
                    <div
                      style={{
                        fontSize: 10,
                        color: '#92400e',
                        marginTop: 3,
                        fontStyle: 'italic',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={row.remark}
                    >
                      “{row.remark}”
                    </div>
                  ) : null}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, fontSize: 10, color: '#475569', lineHeight: 1.35 }}>
                  <div>
                    Gr <strong>{row.gross}</strong>
                  </div>
                  <div>
                    Net <strong>{row.net}</strong>
                  </div>
                </div>
              </button>

              {expanded ? (
                <div
                  style={{
                    padding: '0 10px 10px 44px',
                    borderTop: '1px solid #fde68a',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', margin: '8px 0 4px' }}>
                    Product review remark
                  </div>
                  <textarea
                    value={row.remark}
                    onChange={(e) => onRemarkChange?.(row.lotItemId, e.target.value)}
                    placeholder={lotRemarkFallback || 'Product review remark…'}
                    rows={2}
                    disabled={disabled}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #fcd34d',
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: '#0f172a',
                      resize: 'vertical',
                      minHeight: 56,
                      maxHeight: 120,
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      background: '#fff',
                    }}
                  />
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>
                    Falls back to lot remark when left empty.
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
};

const adminReturnMiniBtn = (disabled, accent = false) => ({
  padding: '4px 8px',
  borderRadius: 7,
  border: accent ? '1px solid #fcd34d' : '1px solid #e2e8f0',
  background: accent ? '#fffbeb' : '#fff',
  color: disabled ? '#94a3b8' : accent ? '#92400e' : '#475569',
  fontSize: 10,
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: LOT_DETAIL_FONT,
  whiteSpace: 'nowrap',
});

const LotDetailItemCard = ({
  line,
  lotHeader,
  isSmallScreen,
  lineItemCode,
  lineCategory,
  lineProduct,
  lineDesign,
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
  const counterValue = line?.counter ?? line?.Counter;
  const counterLabel = line?.counterName ?? line?.CounterName ?? '';
  const counterDisplay =
    counterValue !== undefined && counterValue !== null && String(counterValue).trim() !== ''
      ? String(counterValue).trim()
      : '';
  const designTitle = lineDesignFieldValue(line);
  const pieces = formatPiecesDisplay(linePiecesFromMrp(line));
  const status = String(line?.ItemStatus || '—').trim() || '—';
  const statusHeaderStyle = getLineItemStatusHeaderStyle(status);
  const returnedByMeta = getReturnedByTypeMeta(line);
  const pendingWithEmployee = line?.isPendingWithEmployee === true || line?.IsPendingWithEmployee === true;
  const sampleOutDate = displayRfidSampleDate(
    line,
    ['sampleOutDate', 'outDate', 'issueDate'],
    formatListDate
  );
  const sampleInDate = displayLineSampleInOn(line);
  const sampleOutDateTime = displayLineSampleOutOn(line, lotHeader);
  const sampleInDateTime = displayLineSampleInOn(line);
  const employeeName = lineEmployeeNameRaw(line, lotHeader) || '—';
  const scanMeta = pickLineScanMeta(line);
  const returnRemarkText = getLineReturnedItemRemark(line, lotHeader);
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
        {counterDisplay ? (
          <span
            title={counterLabel || `Counter ${counterDisplay}`}
            style={{
              position: 'absolute',
              top: 10,
              left: adminSelectable ? 46 : 10,
              zIndex: 3,
              minWidth: 24,
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 900,
              padding: '4px 9px',
              borderRadius: 999,
              background: 'rgba(15, 76, 129, 0.92)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.7)',
              boxShadow: '0 2px 8px rgba(15,23,42,0.18)',
              fontFamily: LOT_DETAIL_FONT,
              letterSpacing: '0.02em',
            }}
          >
            #{counterDisplay}
          </span>
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
            padding: 0,
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
            lineHeight: 1.35,
            wordBreak: 'break-word',
          }}
          title={designTitle}
        >
          {designTitle}
        </button>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px 10px',
            marginTop: 8,
          }}
        >
          <LotDetailFieldCell label="Item" value={itemCode} valueColor={LOT_DETAIL_BLUE} />
          <LotDetailFieldCell label="Counter name" value={counterLabel || counterDisplay || '—'} valueColor={LOT_DETAIL_BLUE} />
          <LotDetailFieldCell label="RFID" value={rfid} />
          <LotDetailFieldCell label="Category" value={category} />
          <LotDetailFieldCell label="Product" value={product} />
          <LotDetailFieldCell label="Pieces" value={pieces} />
          <LotDetailFieldCell label="Gross Wt" value={lineGrossWt(line)} />
          <LotDetailFieldCell label="Net Wt" value={lineNetWt(line)} />
          <LotDetailFieldCell label="Sample out" value={sampleOutDateTime !== '—' ? sampleOutDateTime : sampleOutDate} valueColor="#0369a1" wrap />
          <LotDetailFieldCell label="Sample in" value={sampleInDateTime !== '—' ? sampleInDateTime : sampleInDate} valueColor="#047857" wrap />
          <LotDetailFieldCell label="Employee" value={employeeName} valueColor="#0f766e" />
          <LotDetailFieldCell label="Out mode" value={scanMeta.sampleOutMode || '—'} valueColor="#1d4ed8" />
          <LotDetailFieldCell label="In mode" value={scanMeta.sampleInMode || '—'} valueColor="#047857" />
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
        {returnRemarkText ? (
          <div
            style={{
              marginTop: 8,
              padding: '8px 10px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 4,
              }}
            >
              Return Remark
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#334155',
                lineHeight: 1.45,
              }}
            >
              {returnRemarkText}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
};

const chunkModalDetailPages = (items, pageSize) => {
  const sorted = sortProductsByDesignName(items || []);
  if (!sorted.length) return [];
  const pages = [];
  for (let i = 0; i < sorted.length; i += pageSize) {
    pages.push(sorted.slice(i, i + pageSize));
  }
  return pages;
};

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    return data.data || data.items || data.results || data.list || [];
  }
  return [];
};

const firstNonEmptySampleField = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
};

const mapRfidSampleLine = (line) => {
  if (!line || typeof line !== 'object') return line;
  const itemCodeVal = firstNonEmptySampleField(line.itemCode, line.ItemCode, line.Itemcode);
  const designNoVal = firstNonEmptySampleField(
    line.designNo,
    line.DesignNo,
    line.design_no,
    line.DesignCode,
    line.designCode
  );
  const normalizedDesignNo =
    designNoVal && itemCodeVal && designNoVal.toLowerCase() === itemCodeVal.toLowerCase()
      ? ''
      : designNoVal;
  const rawDesignName = firstNonEmptySampleField(line.designName, line.DesignName, line.Design);
  const designNameVal =
    rawDesignName && itemCodeVal && rawDesignName.toLowerCase() === itemCodeVal.toLowerCase()
      ? firstNonEmptySampleField(line.designName, line.DesignName)
      : rawDesignName;
  return {
    ...line,
    Counter: line.counter ?? line.Counter,
    counter: line.counter ?? line.Counter,
    CounterName: line.counterName ?? line.CounterName,
    counterName: line.counterName ?? line.CounterName,
    LotItemId: line.lotItemId ?? line.LotItemId ?? line.id ?? line.Id,
    lotItemId: line.lotItemId ?? line.LotItemId ?? line.id ?? line.Id,
    Id: line.lotItemId ?? line.LotItemId ?? line.id ?? line.Id,
    ItemCode: line.itemCode ?? line.ItemCode,
    Itemcode: line.itemCode ?? line.Itemcode ?? line.ItemCode,
    RFIDCode: line.rfidCode ?? line.RFIDCode ?? line.RFIDNumber,
    RFIDNumber: line.rfidCode ?? line.RFIDCode ?? line.RFIDNumber,
    ItemStatus: line.itemStatus ?? line.ItemStatus,
    ProductName: line.productName ?? line.ProductName,
    CategoryName: line.categoryName ?? line.CategoryName,
    DesignName: designNameVal || undefined,
    DesignNo: normalizedDesignNo || undefined,
    DesignId: line.designId ?? line.DesignId ?? line.design_id,
    DesignCode: line.designCode ?? line.DesignCode,
    GrossWt: line.grossWt ?? line.GrossWt,
    NetWt: line.netWt ?? line.NetWt,
    StoneWt: line.stoneWt ?? line.StoneWt,
    DiamondWt: line.diamondWt ?? line.DiamondWt,
    PurityName: line.purityName ?? line.PurityName,
    Mrp: line.mrp ?? line.Mrp ?? line.MRP,
    mrp: line.mrp ?? line.Mrp ?? line.MRP,
    Pcs: line.pcs ?? line.Pcs ?? line.mrp ?? line.MRP,
    pcs: line.pcs ?? line.Pcs ?? line.mrp ?? line.MRP,
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
    IsPendingAcceptance: line.isPendingAcceptance ?? line.IsPendingAcceptance,
    isPendingAcceptance: line.isPendingAcceptance ?? line.IsPendingAcceptance,
    CanEmployeeAccept: line.canEmployeeAccept ?? line.CanEmployeeAccept,
    canEmployeeAccept: line.canEmployeeAccept ?? line.CanEmployeeAccept,
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
    AdminReviewRemark: line.adminReviewRemark ?? line.AdminReviewRemark,
    adminReviewRemark: line.adminReviewRemark ?? line.AdminReviewRemark,
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
  sortProductsByDesignName((items || []).map((line) => enrichDetailLineItem(line, lotHeader)));

const lineDesignLabel = (line) => lineDesignFieldValue(line);

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
    entry.lotNumber != null ||
    entry.SampleLotNo != null ||
    entry.sampleLotNo != null ||
    entry.SampleOutNo != null ||
    (entry.Id != null &&
      (Array.isArray(entry.Items) ||
        Array.isArray(entry.items) ||
        Array.isArray(entry.LineItems) ||
        Array.isArray(entry.lineItems))));

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
  const lineItems = sortProductsByDesignName(items.map(mapRfidSampleLine));
  const lotNumber = entry.LotNumber ?? entry.lotNumber ?? entry.SampleLotNo ?? entry.SampleOutNo;
  const lotStatus = entry.LotStatus ?? entry.lotStatus ?? entry.Status;
  const sampleOutDate = entry.SampleOutDate ?? entry.sampleOutDate ?? entry.IssueDate;
  const partyType = entry.PartyType ?? entry.partyType;
  const assignee = entry.AssignedToUserName ?? entry.assignedToUserName ?? '';
  const apiTotal = Number(entry.TotalItems ?? entry.totalItems) || 0;
  const apiPending = Number(entry.PendingItems ?? entry.pendingItems) || 0;
  const apiOutItems = Number(entry.OutItems ?? entry.outItems) || 0;
  const pendingAcceptanceItems = Number(entry.PendingAcceptanceItems ?? entry.pendingAcceptanceItems) || 0;
  const isFullyAccepted =
    entry.IsFullyAccepted === true ||
    entry.isFullyAccepted === true ||
    (normalizeRfidSampleLotStatus(lotStatus) === 'open' &&
      pendingAcceptanceItems === 0 &&
      apiOutItems > 0);
  const isPartiallyAccepted =
    !isFullyAccepted &&
    (entry.IsPartiallyAccepted === true ||
      entry.isPartiallyAccepted === true ||
      normalizeRfidSampleLotStatus(lotStatus) === 'partialaccepted');
  const totalItems = apiTotal > 0 ? apiTotal : lineItems.length;
  const pendingItems =
    isPartiallyAccepted && pendingAcceptanceItems > 0
      ? pendingAcceptanceItems
      : apiPending > 0
        ? apiPending
        : countPendingLines(lineItems);
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
    isFullyAccepted,
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
    PendingAcceptanceItems: pendingAcceptanceItems,
    pendingAcceptanceItems,
    IsFullyAccepted: isFullyAccepted,
    isFullyAccepted,
    IsPartiallyAccepted: isPartiallyAccepted,
    isPartiallyAccepted,
    EmployeeLotStatus: entry.EmployeeLotStatus ?? entry.employeeLotStatus,
    employeeLotStatus: entry.EmployeeLotStatus ?? entry.employeeLotStatus,
    AcceptedItemsCount:
      entry.AcceptedItemsCount ??
      entry.acceptedItemsCount ??
      entry.AcceptedCount ??
      entry.acceptedCount ??
      apiOutItems,
    acceptedItemsCount:
      entry.AcceptedItemsCount ??
      entry.acceptedItemsCount ??
      entry.AcceptedCount ??
      entry.acceptedCount ??
      apiOutItems,
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
        LineItems: sortProductsByDesignName(
          (Array.isArray(entry.Items) ? entry.Items : []).map(mapRfidSampleLine)
        ),
      };
    }
    return {
      ...entry,
      LotBranchName: entry.BranchName ?? entry.LotBranchName ?? null,
      LineItems: sortProductsByDesignName(
        (Array.isArray(entry.LineItems) ? entry.LineItems : []).map(mapRfidSampleLine)
      ),
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

const normalizeExcelHeaderKey = (raw) =>
  String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./]+/g, '');

const findExcelColumnIndex = (headers, aliases) => {
  for (let i = 0; i < headers.length; i += 1) {
    const key = normalizeExcelHeaderKey(headers[i]);
    if (aliases.some((alias) => key === alias || key.endsWith(alias))) return i;
  }
  return -1;
};

/** Parse DesignNo + remark columns from uploaded Excel for AdminExcelSampleInPreview. */
const formatExcelBillDateOut = (raw) => {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const parsed = XLSX.SSF?.parse_date_code?.(raw);
    if (parsed) {
      const pad = (n) => String(n).padStart(2, '0');
      const yy = String(parsed.y).slice(-2);
      return `${pad(parsed.d)}/${pad(parsed.m)}/${yy}`;
    }
  }
  const text = String(raw).trim();
  if (!text) return '';
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(text)) {
    const parts = text.split('/');
    if (parts.length === 3) {
      const dd = parts[0].padStart(2, '0');
      const mm = parts[1].padStart(2, '0');
      const yy = parts[2].length === 4 ? parts[2].slice(-2) : parts[2].padStart(2, '0');
      return `${dd}/${mm}/${yy}`;
    }
  }
  return text;
};

const buildExcelProductRemark = ({ vTypeOut, billDateOut, billNoOut, pNameOut } = {}) => {
  const vType = String(vTypeOut || '').trim();
  const date = formatExcelBillDateOut(billDateOut);
  const billNo = String(billNoOut ?? '').trim();
  const pName = String(pNameOut || '').trim().toLowerCase();
  if (!vType && !date && !billNo && !pName) return '';
  return `${vType || '—'} - ${date || '—'} / ${billNo || '—'} / ${pName || '—'}`;
};

const normalizeExcelRfidKey = (value) =>
  String(value || '')
    .trim()
    .replace(/^rfid\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

const normalizeExcelDesignKey = (value) => String(value || '').trim().toUpperCase();

const normalizeExcelItemCodeKey = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const numeric = text.replace(/^0+/, '');
  return (numeric || text).toUpperCase();
};

const findExcelRowForPreviewProduct = (previewRow, excelRows, usedExcelRowNumbers) => {
  const designKey = normalizeExcelDesignKey(previewRow?.designName || previewRow?.searchedDesign);
  const rfidKey = normalizeExcelRfidKey(previewRow?.rfidCode);
  const itemKey = normalizeExcelItemCodeKey(
    previewRow?.itemCode ?? previewRow?.ItemCode ?? previewRow?.itemcode
  );

  const isUnused = (excelRow) => !usedExcelRowNumbers.has(excelRow.rowNumber);

  if (rfidKey) {
    const byDesignRfid = excelRows.find(
      (excelRow) =>
        isUnused(excelRow) &&
        normalizeExcelDesignKey(excelRow.designNo) === designKey &&
        normalizeExcelRfidKey(excelRow.rfidCode) === rfidKey
    );
    if (byDesignRfid) return byDesignRfid;

    const byRfid = excelRows.find(
      (excelRow) => isUnused(excelRow) && normalizeExcelRfidKey(excelRow.rfidCode) === rfidKey
    );
    if (byRfid) return byRfid;
  }

  if (itemKey) {
    const byDesignItem = excelRows.find(
      (excelRow) =>
        isUnused(excelRow) &&
        normalizeExcelDesignKey(excelRow.designNo) === designKey &&
        normalizeExcelItemCodeKey(excelRow.tagNo) === itemKey
    );
    if (byDesignItem) return byDesignItem;

    const byItem = excelRows.find(
      (excelRow) => isUnused(excelRow) && normalizeExcelItemCodeKey(excelRow.tagNo) === itemKey
    );
    if (byItem) return byItem;
  }

  return (
    excelRows.find(
      (excelRow) => isUnused(excelRow) && normalizeExcelDesignKey(excelRow.designNo) === designKey
    ) || null
  );
};

const attachExcelRemarksToPreviewRows = (previewRows, excelRows = []) => {
  const remarks = {};
  const usedExcelRowNumbers = new Set();

  const rows = (previewRows || []).map((row) => {
    if (!row?.canReturn || row.lotItemId == null) return row;
    const excelRow = findExcelRowForPreviewProduct(row, excelRows, usedExcelRowNumbers);
    if (excelRow) usedExcelRowNumbers.add(excelRow.rowNumber);
    const remark = String(excelRow?.remark || buildExcelProductRemark(excelRow || {})).trim();
    if (remark) remarks[row.lotItemId] = remark;
    return {
      ...row,
      excelRemark: remark,
      excelRowNumber: excelRow?.rowNumber ?? null,
    };
  });

  return { remarks, rows };
};

const buildImportProductRemarks = (previewRows, excelRows = []) =>
  attachExcelRemarksToPreviewRows(previewRows, excelRows).remarks;

const buildAdminExcelImportProductsPayload = (readyRows, productRemarks, scanMode) =>
  (readyRows || [])
    .map((row) => {
      const lotItemId = Number(row.lotItemId);
      if (!Number.isFinite(lotItemId) || lotItemId <= 0) return null;
      const remark = String(
        productRemarks[lotItemId] ?? productRemarks[String(lotItemId)] ?? ''
      ).trim();
      if (!remark) return null;
      return {
        LotItemId: lotItemId,
        AdminReviewRemark: remark,
        AdminReturnRemark: remark,
        ReturnRemark: remark,
        ScanMode: scanMode,
      };
    })
    .filter(Boolean);

const groupImportReadyRowsByLotId = (readyRows = []) => {
  const groups = new Map();
  (readyRows || []).forEach((row) => {
    const lotId = Number(row?.lotId ?? row?.LotId);
    if (!Number.isFinite(lotId) || lotId <= 0) return;
    if (!groups.has(lotId)) groups.set(lotId, []);
    groups.get(lotId).push(row);
  });
  return groups;
};

const normalizeBulkReturnProducts = (payload = {}) => {
  const list =
    payload?.returnedProducts ??
    payload?.ReturnedProducts ??
    payload?.products ??
    payload?.Products ??
    payload?.items ??
    payload?.Items ??
    [];
  return Array.isArray(list) ? list : [];
};

const toDatetimeLocalValue = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const dedupeAdminExcelPreviewRows = (rows = []) => {
  const seen = new Set();
  return rows.filter((row) => {
    const lotItemId = row?.lotItemId;
    if (lotItemId != null) {
      const key = `id:${Number(lotItemId)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }
    const rfid = normalizeExcelRfidKey(row?.rfidCode);
    const design = normalizeExcelDesignKey(row?.designName || row?.searchedDesign);
    const fallback = `row:${design}:${rfid}:${row?.rowNumber ?? ''}`;
    if (seen.has(fallback)) return false;
    seen.add(fallback);
    return true;
  });
};

const uniqueDesignNumbersForPreview = (designNumbers = []) => {
  const seen = new Set();
  const unique = [];
  designNumbers.forEach((design) => {
    const key = normalizeExcelDesignKey(design);
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(String(design).trim());
  });
  return unique;
};

const parseDesignNumbersFromExcelFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) {
          reject(new Error('Excel workbook has no sheets.'));
          return;
        }
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (!rows.length) {
          reject(new Error('Excel sheet is empty.'));
          return;
        }
        const headers = rows[0].map((h) => String(h ?? '').trim());
        const designIdx = findExcelColumnIndex(headers, ['designno', 'designnumber', 'design']);
        if (designIdx < 0) {
          reject(new Error('Design No column not found. Expected header: DesignNo or Design No.'));
          return;
        }
        const tagNoIdx = findExcelColumnIndex(headers, ['tagno', 'tag', 'itemcode', 'itemno']);
        const miscIdx = findExcelColumnIndex(headers, ['misc', 'rfid', 'rfidcode', 'rfidtag', 'epc']);
        const vTypeIdx = findExcelColumnIndex(headers, ['vtypeout', 'vtype', 'transactiontype']);
        const billDateIdx = findExcelColumnIndex(headers, ['billdateout', 'billdate', 'dateout']);
        const billNoIdx = findExcelColumnIndex(headers, ['billnoout', 'billno', 'billnumberout']);
        const pNameIdx = findExcelColumnIndex(headers, ['pnameout', 'partyout', 'partynameout', 'employeeout']);
        const designNumbers = [];
        const rfidCodes = [];
        const excelRows = [];
        for (let r = 1; r < rows.length; r += 1) {
          const row = rows[r];
          if (!Array.isArray(row)) continue;
          const designNo = String(row[designIdx] ?? '').trim();
          if (!designNo) continue;
          const tagNo = tagNoIdx >= 0 ? String(row[tagNoIdx] ?? '').trim() : '';
          const rfidCode = miscIdx >= 0 ? String(row[miscIdx] ?? '').trim() : '';
          const vTypeOut = vTypeIdx >= 0 ? String(row[vTypeIdx] ?? '').trim() : '';
          const billDateOut = billDateIdx >= 0 ? row[billDateIdx] : '';
          const billNoOut = billNoIdx >= 0 ? row[billNoIdx] : '';
          const pNameOut = pNameIdx >= 0 ? String(row[pNameIdx] ?? '').trim() : '';
          const remark = buildExcelProductRemark({ vTypeOut, billDateOut, billNoOut, pNameOut });
          designNumbers.push(designNo);
          if (rfidCode) rfidCodes.push(rfidCode);
          excelRows.push({
            rowNumber: r + 1,
            designNo,
            tagNo,
            rfidCode,
            vTypeOut,
            billDateOut,
            billNoOut,
            pNameOut,
            remark,
          });
        }
        if (!designNumbers.length) {
          reject(new Error('No design numbers found in the DesignNo column.'));
          return;
        }
        resolve({
          designNumbers,
          uniqueDesignNumbers: uniqueDesignNumbersForPreview(designNumbers),
          rfidCodes,
          excelRows,
          rowCount: designNumbers.length,
          uniqueDesignCount: new Set(designNumbers.map((d) => d.toUpperCase())).size,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Could not parse Excel file.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read the Excel file.'));
    reader.readAsArrayBuffer(file);
  });

const adminExcelImportRowTone = (row) => {
  if (row?.canReturn) return { bg: '#ecfdf5', fg: '#047857', bd: '#a7f3d0', label: 'Ready' };
  if (row?.matched) return { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a', label: 'Cannot return' };
  return { bg: '#fef2f2', fg: '#b91c1c', bd: '#fecaca', label: 'Not found' };
};

const datetimeLocalToApiIso = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const mergeAdminExcelReturnedRows = (previewRows, returnedProducts = []) => {
  const byLotItemId = new Map(
    returnedProducts
      .filter((item) => item?.lotItemId != null)
      .map((item) => [Number(item.lotItemId), item])
  );
  return previewRows.map((row) => {
    const fromApi = byLotItemId.get(Number(row.lotItemId));
    return fromApi ? { ...row, ...fromApi } : row;
  });
};

const getAdminExcelImportCellValue = (row, colKey, { remarkText = '' } = {}) => {
  switch (colKey) {
    case 'lotNumber':
      return row.lotNumber;
    case 'employeeName':
      return row.employeeName || row.partyName;
    case 'designName':
      return row.designName || row.searchedDesign;
    case 'sampleOutOnFormatted':
      return row.sampleOutOnFormatted || row.acceptedOnFormatted || row.sampleOutDateFormatted;
    case 'expectedReturnDateFormatted':
      return row.expectedReturnDateFormatted;
    case 'sampleInOnFormatted':
      return row.sampleInOnFormatted;
    case 'remark':
      return remarkText || row.excelRemark || row.adminReturnRemark;
    default:
      return row[colKey];
  }
};

const ADMIN_EXCEL_IMPORT_PREVIEW_COLUMNS = [
  { key: 'lotNumber', label: 'Sample lot', minWidth: 88 },
  { key: 'employeeName', label: 'Employee', minWidth: 88 },
  { key: 'designName', label: 'Design No', minWidth: 100 },
  { key: 'rfidCode', label: 'RFID', minWidth: 72 },
  { key: 'remark', label: 'Remark (Excel)', minWidth: 280, editable: true },
  { key: 'productName', label: 'Product', minWidth: 88 },
  { key: 'categoryName', label: 'Category', minWidth: 80 },
  { key: 'grossWt', label: 'Gr.Wt', minWidth: 56, align: 'right' },
  { key: 'netWt', label: 'Net Wt', minWidth: 56, align: 'right' },
  { key: 'counterName', label: 'Counter', minWidth: 72 },
  { key: 'sampleOutOnFormatted', label: 'Sample out', minWidth: 130, nowrap: true },
  { key: 'status', label: 'Status', minWidth: 88 },
];

const ADMIN_EXCEL_IMPORT_REMARK_CELL_STYLE = (hasRemark) => ({
  width: '100%',
  minWidth: 260,
  padding: '7px 9px',
  fontSize: 11,
  fontWeight: hasRemark ? 600 : 500,
  borderRadius: 6,
  border: hasRemark ? '1px solid #86efac' : '1px solid #fcd34d',
  boxSizing: 'border-box',
  background: hasRemark ? '#f0fdf4' : '#fffbeb',
  color: hasRemark ? '#14532d' : '#92400e',
});

const ADMIN_EXCEL_IMPORT_DONE_COLUMNS = [
  { key: 'lotNumber', label: 'Sample lot', minWidth: 88 },
  { key: 'employeeName', label: 'Employee', minWidth: 88 },
  { key: 'designName', label: 'Design No', minWidth: 100 },
  { key: 'rfidCode', label: 'RFID', minWidth: 72 },
  { key: 'remark', label: 'Remark (Excel)', minWidth: 280 },
  { key: 'productName', label: 'Product', minWidth: 88 },
  { key: 'categoryName', label: 'Category', minWidth: 80 },
  { key: 'grossWt', label: 'Gr.Wt', minWidth: 56, align: 'right' },
  { key: 'netWt', label: 'Net Wt', minWidth: 56, align: 'right' },
  { key: 'counterName', label: 'Counter', minWidth: 72 },
  { key: 'sampleOutOnFormatted', label: 'Sample out', minWidth: 130, nowrap: true },
  { key: 'sampleInOnFormatted', label: 'Sample in', minWidth: 130, nowrap: true },
  { key: 'status', label: 'Status', minWidth: 88 },
];

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
  const [listDashboard, setListDashboard] = useState({
    partialAccepted: 0,
    pendingAcceptance: 0,
    open: 0,
    completedThisMonth: 0,
    closedThisMonth: 0,
  });
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importParseMeta, setImportParseMeta] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importConfirmResult, setImportConfirmResult] = useState(null);
  const [importStep, setImportStep] = useState('pick');
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);
  const [importConfirmLoading, setImportConfirmLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importProductRemarks, setImportProductRemarks] = useState({});
  const [importSampleInDate, setImportSampleInDate] = useState(() => toDatetimeLocalValue());
  const [importReturnedRows, setImportReturnedRows] = useState([]);
  const [importProgressPct, setImportProgressPct] = useState(0);
  const importFileInputRef = useRef(null);
  const [exportErrors, setExportErrors] = useState({ excel: '', pdf: '' });
  const [lotsViewMode, setLotsViewMode] = useState('grid');
  const [lineItemsViewMode, setLineItemsViewMode] = useState('grid');
  const [lineItemLocalImageUrls, setLineItemLocalImageUrls] = useState({});
  const [imageFolderReady, setImageFolderReady] = useState(false);
  const [adminReturnSelectedIds, setAdminReturnSelectedIds] = useState(() => new Set());
  const [adminReturnRemark, setAdminReturnRemark] = useState('');
  const [adminReturnProductRemarks, setAdminReturnProductRemarks] = useState({});
  const [adminReturning, setAdminReturning] = useState(false);
  const [adminReturnAllMode, setAdminReturnAllMode] = useState(false);
  const [showAdminReturnModal, setShowAdminReturnModal] = useState(false);
  const [adminReturnSuccess, setAdminReturnSuccess] = useState(null);
  const [adminPartialSummary, setAdminPartialSummary] = useState(null);
  const [adminPartialSummaryLoading, setAdminPartialSummaryLoading] = useState(false);
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

    const partyTypeApi =
      partyTypeFilter !== 'all' ? partyTypeToApiEnum(partyTypeFilter) : undefined;
    const lotStatusApi = statusFilter !== 'All' ? statusFilter : undefined;
    const hasDateFilter = Boolean(fromDate || toDate);

    const requestSampleOutList = async (statusForApi) => {
      let data;
      if (hasDateFilter) {
        const body = {
          ClientCode: clientCode,
          PageNumber: 1,
          PageSize: 500,
        };
        if (partyTypeApi) body.PartyType = partyTypeApi;
        if (statusForApi) body.LotStatus = statusForApi;
        if (fromDate) body.FromDate = `${fromDate}T00:00:00.000Z`;
        if (toDate) body.ToDate = `${toDate}T23:59:59.999Z`;
        ({ data } = await axios.post(getAllSampleOutListUrl(), body, {
          headers,
          timeout: SAMPLE_LIST_TIMEOUT_MS,
        }));
      } else {
        const listUrl = buildGetAllSampleOutListQuery({
          clientCode,
          pageNumber: 1,
          pageSize: 500,
          lotStatus: statusForApi,
          partyType: partyTypeApi,
        });
        try {
          ({ data } = await axios.get(listUrl, {
            headers,
            timeout: SAMPLE_LIST_TIMEOUT_MS,
          }));
        } catch (getErr) {
          const body = {
            ClientCode: clientCode,
            PageNumber: 1,
            PageSize: 500,
          };
          if (partyTypeApi) body.PartyType = partyTypeApi;
          if (statusForApi) body.LotStatus = statusForApi;
          ({ data } = await axios.post(getAllSampleOutListUrl(), body, {
            headers,
            timeout: SAMPLE_LIST_TIMEOUT_MS,
          }));
        }
      }
      return extractRfidSampleOutListFromResponse(data);
    };

    try {
      let rawRows;
      let total;
      let dashboard = parseRfidSampleListDashboard();

      if (statusFilter === 'All') {
        const statusFetches = [
          requestSampleOutList(undefined),
          ...RFID_SAMPLE_ALL_LIST_EXTRA_STATUSES.map((status) =>
            requestSampleOutList(status).catch((err) => {
              console.warn(`GetAllSampleOutList (${status}):`, err);
              return { rows: [], totalRecords: 0, dashboard: parseRfidSampleListDashboard() };
            })
          ),
        ];
        const results = await Promise.all(statusFetches);
        rawRows = mergeSampleOutListRows(...results.map((result) => result.rows));
        total = rawRows.length;
        dashboard = results.reduce(
          (acc, result) => ({
            partialAccepted: Math.max(acc.partialAccepted, result.dashboard.partialAccepted),
            pendingAcceptance: Math.max(acc.pendingAcceptance, result.dashboard.pendingAcceptance),
            open: Math.max(acc.open, result.dashboard.open),
            completedThisMonth: Math.max(acc.completedThisMonth, result.dashboard.completedThisMonth),
            closedThisMonth: 0,
          }),
          parseRfidSampleListDashboard()
        );
      } else {
        const result = await requestSampleOutList(lotStatusApi);
        rawRows = result.rows;
        total = result.totalRecords;
        dashboard = result.dashboard;
      }

      const rows = sortSampleOutLotsForList(normalizeSampleOutListRows(rawRows));
      setSampleOutData(rows);
      setTotalRecords(total);
      setListDashboard(dashboard);
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
    setAdminReturnProductRemarks({});
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

  const computedListDashboard = useMemo(() => {
    let partialAccepted = 0;
    let pendingAcceptance = 0;
    let open = 0;
    let completed = 0;
    sampleOutData.forEach((lot) => {
      const key = normalizeRfidSampleLotStatus(lot?.Status ?? lot?.LotStatus);
      if (isRfidSampleLotFinished(lot)) completed += 1;
      else if (key === 'partialaccepted') partialAccepted += 1;
      else if (key === 'pendingacceptance') pendingAcceptance += 1;
      else if (key === 'open') open += 1;
    });
    return {
      partialAccepted: listDashboard.partialAccepted || partialAccepted,
      pendingAcceptance: listDashboard.pendingAcceptance || pendingAcceptance,
      open: listDashboard.open || open,
      completed: completed || listDashboard.completedThisMonth || 0,
    };
  }, [sampleOutData, listDashboard]);

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
  const lineDesign = lineDesignLabel;
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
      pending: items.filter((l) => isPendingAcceptanceLine(l)).length,
      out: items.filter((l) => isOutItemStatus(l?.ItemStatus ?? l?.itemStatus)).length,
      returned: items.filter((l) => isReturnedLineStatus(l?.ItemStatus ?? l?.itemStatus)).length,
      employee: items.filter((l) => lineMatchesDetailUserFilter(l, 'employee')).length,
      admin: items.filter((l) => lineMatchesDetailUserFilter(l, 'admin')).length,
      force: items.filter((l) => lineMatchesDetailUserFilter(l, 'force')).length,
    };
  }, [detailModalItems]);

  const filteredDetailModalItems = useMemo(() => {
    const filtered = detailModalItems.filter((line) => {
      const status = line?.ItemStatus ?? line?.itemStatus;
      if (detailItemStatusFilter === 'pending' && !isPendingAcceptanceLine(line)) return false;
      if (detailItemStatusFilter === 'out' && !isOutItemStatus(status)) return false;
      if (detailItemStatusFilter === 'returned' && !isReturnedLineStatus(status)) return false;
      if (!lineMatchesDetailUserFilter(line, detailItemUserFilter)) return false;
      return true;
    });
    return sortProductsByDesignName(filtered);
  }, [detailModalItems, detailItemStatusFilter, detailItemUserFilter]);

  useEffect(() => {
    setDetailModalPage(1);
  }, [detailItemStatusFilter, detailItemUserFilter]);

  const adminReturnableItems = useMemo(() => {
    if (!detailModal?.header) return [];
    return detailModalItems.filter((line) => lineCanAdminReturn(line, detailModal.header));
  }, [detailModal?.header, detailModalItems]);
  const filteredAdminReturnableItems = useMemo(() => {
    if (!detailModal?.header) return [];
    return filteredDetailModalItems.filter((line) => lineCanAdminReturn(line, detailModal.header));
  }, [detailModal?.header, filteredDetailModalItems]);
  const adminReturnSelectedCount = adminReturnSelectedIds.size;
  const adminReturnSelectedLines = useMemo(() => {
    if (!adminReturnSelectedIds.size) return [];
    const seen = new Set();
    const matched = [];
    const pools = [detailModalItems, adminReturnableItems, filteredDetailModalItems];
    pools.forEach((pool) => {
      (pool || []).forEach((line) => {
        const id = lineLotItemId(line);
        if (id == null || !adminReturnSelectedIds.has(id) || seen.has(id)) return;
        seen.add(id);
        matched.push(line);
      });
    });
    return matched;
  }, [
    detailModalItems,
    adminReturnableItems,
    filteredDetailModalItems,
    adminReturnSelectedIds,
  ]);
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
  const allFilteredAdminReturnableSelected =
    filteredAdminReturnableItems.length > 0 &&
    filteredAdminReturnableItems.every((line) => {
      const id = lineLotItemId(line);
      return id != null && adminReturnSelectedIds.has(id);
    });
  const selectAllAdminReturnCheckboxRef = useRef(null);
  useEffect(() => {
    const el = selectAllAdminReturnCheckboxRef.current;
    if (!el) return;
    el.indeterminate = adminReturnSelectedCount > 0 && !allAdminReturnableSelected;
  }, [adminReturnSelectedCount, allAdminReturnableSelected]);
  const adminBulkExpectedStatus =
    adminReturnAllMode || allAdminReturnableSelected
      ? 'Completed'
      : adminReturnSelectedCount > 0
        ? 'PartialReturn'
        : 'Open';
  const setAdminReturnProductRemark = useCallback((lotItemId, value) => {
    if (lotItemId == null) return;
    setAdminReturnProductRemarks((prev) => ({ ...prev, [lotItemId]: value }));
  }, []);
  const detailModalPages = useMemo(
    () => chunkModalDetailPages(filteredDetailModalItems, MODAL_ITEMS_PER_PAGE),
    [filteredDetailModalItems]
  );
  const detailModalTotalPages = Math.max(1, detailModalPages.length);
  const paginatedDetailModalItems = detailModalPages[detailModalPage - 1] ?? [];
  const detailModalStartIndex = (detailModalPage - 1) * MODAL_ITEMS_PER_PAGE;

  useEffect(() => {
    setDetailModalPage((p) => Math.min(p, detailModalTotalPages));
  }, [detailModalTotalPages]);

  const detailModalWeights = sumLineWeights(detailModalItems);
  const detailModalPieces = formatPiecesDisplay(sumLinePieces(detailModalItems));
  const detailModalDesignCount = useMemo(() => {
    const designs = new Set();
    (detailModalItems || []).forEach((line) => {
      const design = String(lineDesignFieldValue(line) || '').trim().toUpperCase();
      if (design) designs.add(design);
    });
    return designs.size;
  }, [detailModalItems]);

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

  const selectFilteredAdminReturnable = () => {
    setAdminReturnSelectedIds((prev) => {
      const next = new Set(prev);
      filteredAdminReturnableItems.forEach((line) => {
        const id = lineLotItemId(line);
        if (id != null) next.add(id);
      });
      return next;
    });
  };

  const toggleSelectAllAdminReturnable = () => {
    const useFiltered =
      detailItemStatusFilter !== 'all' ||
      detailItemUserFilter !== 'all' ||
      filteredAdminReturnableItems.length < adminReturnableItems.length;
    if (useFiltered) {
      if (allFilteredAdminReturnableSelected) {
        setAdminReturnSelectedIds((prev) => {
          const next = new Set(prev);
          filteredAdminReturnableItems.forEach((line) => {
            const id = lineLotItemId(line);
            if (id != null) next.delete(id);
          });
          return next;
        });
      } else {
        selectFilteredAdminReturnable();
      }
      return;
    }
    if (allAdminReturnableSelected) clearAdminReturnSelection();
    else selectAllAdminReturnable();
  };

  const clearAdminReturnSelection = () => {
    setAdminReturnSelectedIds(new Set());
  };

  const applyAdminReturnResponse = (data, { productRemarksByLotItemId = {} } = {}) => {
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
        const itemAdminReviewRemark =
          hit.adminReviewRemark ??
          hit.AdminReviewRemark ??
          productRemarksByLotItemId[id] ??
          productRemarksByLotItemId[String(id)] ??
          line.adminReviewRemark ??
          line.AdminReviewRemark;
        const itemReturnRemark =
          hit.returnRemark ??
          hit.ReturnRemark ??
          hit.adminReturnRemark ??
          hit.AdminReturnRemark ??
          productRemarksByLotItemId[id] ??
          productRemarksByLotItemId[String(id)] ??
          line.returnRemark ??
          line.ReturnRemark ??
          bulkRemark;
        return {
          ...line,
          ItemStatus: hit.itemStatus ?? hit.ItemStatus ?? 'Returned',
          ReturnedByType: returnedByType,
          returnedByType,
          IsForceReturn: isForceReturn,
          isForceReturn,
          AdminReviewRemark: itemAdminReviewRemark,
          adminReviewRemark: itemAdminReviewRemark,
          ReturnRemark: itemReturnRemark,
          returnRemark: itemReturnRemark,
          AdminReturnRemark: itemAdminReviewRemark || itemReturnRemark || line.adminReturnRemark || line.AdminReturnRemark,
          adminReturnRemark: itemAdminReviewRemark || itemReturnRemark || line.adminReturnRemark || line.AdminReturnRemark,
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
        isFullyAccepted:
          data?.isFullyAccepted ??
          data?.IsFullyAccepted ??
          prev.header?.isFullyAccepted ??
          prev.header?.IsFullyAccepted,
      });
      const fullyAccepted = isRfidSampleFullyAcceptedLot({
        ...prev.header,
        Status: reconciledStatus,
        LotStatus: reconciledStatus,
        isFullyAccepted:
          data?.isFullyAccepted ??
          data?.IsFullyAccepted ??
          prev.header?.isFullyAccepted ??
          prev.header?.IsFullyAccepted,
        pendingAcceptanceItems:
          data?.pendingAcceptanceItems ??
          data?.PendingAcceptanceItems ??
          prev.header?.pendingAcceptanceItems,
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
        PendingAcceptanceItems:
          data?.pendingAcceptanceItems ??
          data?.PendingAcceptanceItems ??
          prev.header?.PendingAcceptanceItems,
        pendingAcceptanceItems:
          data?.pendingAcceptanceItems ??
          data?.PendingAcceptanceItems ??
          prev.header?.pendingAcceptanceItems,
        IsFullyAccepted: fullyAccepted,
        isFullyAccepted: fullyAccepted,
        IsPartiallyAccepted: fullyAccepted ? false : prev.header?.IsPartiallyAccepted,
        isPartiallyAccepted: fullyAccepted ? false : prev.header?.isPartiallyAccepted,
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
    setAdminReturnProductRemarks({});
  };

  const buildAdminReturnProductsPayload = (lines, bulkRemark) => {
    const fromLines = (lines || [])
      .map((line) => {
        const lotItemId = lineLotItemId(line);
        if (lotItemId == null) return null;
        const perProductRemark = String(
          adminReturnProductRemarks[lotItemId] ??
            adminReturnProductRemarks[String(lotItemId)] ??
            ''
        ).trim();
        return {
          LotItemId: Number(lotItemId),
          AdminReviewRemark: perProductRemark || bulkRemark,
          ScanMode: ADMIN_RETURN_SCAN_MODE,
        };
      })
      .filter((entry) => Number.isFinite(entry?.LotItemId) && entry.LotItemId > 0);

    if (fromLines.length) return fromLines;

    return [...adminReturnSelectedIds]
      .map((id) => {
        const lotItemId = Number(id);
        if (!Number.isFinite(lotItemId) || lotItemId <= 0) return null;
        const perProductRemark = String(
          adminReturnProductRemarks[id] ?? adminReturnProductRemarks[String(id)] ?? ''
        ).trim();
        return {
          LotItemId: lotItemId,
          AdminReviewRemark: perProductRemark || bulkRemark,
          ScanMode: ADMIN_RETURN_SCAN_MODE,
        };
      })
      .filter(Boolean);
  };

  const handleAdminBulkReturn = async () => {
    const lotId = detailModal?.header?.Id ?? detailModal?.header?.LotId ?? detailModal?.header?.lotId;
    const clientCode = resolveClientCode(userInfo);
    const returnAllOutItems = adminReturnAllMode;
    const bulkRemark = String(adminReturnRemark || '').trim() || 'Returned by admin';
    const linesToReturn = returnAllOutItems ? adminReturnableItems : adminReturnSelectedLines;
    if (!isAdminUser) {
      addNotification({
        type: 'error',
        title: 'Admin return',
        message: 'Only admin accounts can perform bulk sample return.',
      });
      return;
    }
    if (!lotId || !clientCode) return;
    if (!linesToReturn.length) {
      addNotification({
        type: 'warning',
        title: 'Admin return',
        message: 'Select at least one Out item to return.',
      });
      return;
    }

    setAdminReturning(true);
    try {
      const products = buildAdminReturnProductsPayload(linesToReturn, bulkRemark);
      if (!products.length) {
        addNotification({
          type: 'error',
          title: 'Admin return',
          message:
            'Could not resolve LotItemId for selected products. Close and re-open lot details, then try again.',
        });
        return;
      }
      const payload = {
        ClientCode: clientCode,
        LotId: Number(lotId),
        AdminReturnRemark: bulkRemark,
        ScanMode: ADMIN_RETURN_SCAN_MODE,
        Products: products,
      };
      if (returnAllOutItems) {
        payload.ReturnAllOutItems = true;
      }
      const { data } = await axios.post(getAdminBulkSampleReturnUrl(), payload, {
        headers: sampleAuthHeaders(),
      });
      if (data?.success === false) {
        throw new Error(data?.message || data?.Message || 'Admin bulk return failed');
      }
      const productRemarksByLotItemId = Object.fromEntries(
        products.map((product) => [product.LotItemId, product.AdminReviewRemark])
      );
      applyAdminReturnResponse(data, { productRemarksByLotItemId });
      await fetchSampleOutList();
      const lotMeta = parseRfidSampleLotReturnMeta(data);
      const fallbackMsg =
        data?.message ||
        data?.Message ||
        (returnAllOutItems
          ? `${adminReturnableItems.length} product(s) force-returned successfully.`
          : `${linesToReturn.length} product(s) force-returned successfully.`);
      const finishUi = getRfidSampleLotFinishUi(lotMeta, { fallbackMessage: fallbackMsg });
      const partialSummary =
        parseLotPartialReturnSummary(
          data?.partialReturnSummary ?? data?.PartialReturnSummary ?? data?.data ?? data
        ) || adminPartialSummary;
      setAdminReturnSuccess({
        message: finishUi.message,
        lotCompleted: lotMeta.lotCompleted,
        lotStatus: lotMeta.lotStatus,
        totalItems: lotMeta.totalItems,
        returnedItems: lotMeta.returnedItems,
        pendingItems: lotMeta.pendingItems,
        outItems: data?.outItems ?? data?.OutItems,
        remainingOutItems: data?.remainingOutItems ?? data?.RemainingOutItems ?? [],
        partialSummary,
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

  useEffect(() => {
    if (!showAdminReturnModal || adminReturnSuccess) {
      setAdminPartialSummary(null);
      setAdminPartialSummaryLoading(false);
      return undefined;
    }
    const lotId = detailModal?.header?.Id ?? detailModal?.header?.LotId ?? detailModal?.header?.lotId;
    const clientCode = resolveClientCode(userInfo);
    const linesToReturn = adminReturnAllMode ? adminReturnableItems : adminReturnSelectedLines;
    const returningIds = linesToReturn
      .map((line) => lineLotItemId(line))
      .filter((id) => id != null);
    if (!lotId || !clientCode || !returningIds.length) {
      setAdminPartialSummary(null);
      setAdminPartialSummaryLoading(false);
      return undefined;
    }

    let cancelled = false;
    setAdminPartialSummaryLoading(true);
    (async () => {
      try {
        const { data } = await axios.post(
          getLotPartialReturnSummaryUrl(),
          {
            ClientCode: clientCode,
            LotId: Number(lotId),
            ReturningLotItemIds: returningIds,
          },
          { headers: sampleAuthHeaders() }
        );
        if (!cancelled) {
          if (data?.success === false) {
            setAdminPartialSummary(null);
          } else {
            setAdminPartialSummary(parseLotPartialReturnSummary(data));
          }
          setAdminPartialSummaryLoading(false);
        }
      } catch {
        if (!cancelled) {
          setAdminPartialSummary(null);
          setAdminPartialSummaryLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    showAdminReturnModal,
    adminReturnSuccess,
    adminReturnAllMode,
    adminReturnableItems,
    adminReturnSelectedLines,
    detailModal?.header,
    userInfo,
  ]);

  const adminReturnRemarkRef = useRef(null);

  useEffect(() => {
    if (!showAdminReturnModal || adminReturnSuccess) return;
    const t = setTimeout(() => {
      adminReturnRemarkRef.current?.focus?.();
    }, 80);
    return () => clearTimeout(t);
  }, [showAdminReturnModal, adminReturnSuccess, adminReturnAllMode, adminReturnSelectedCount]);

  const openAdminReturnModal = ({ returnAll = false } = {}) => {
    if (!returnAll && adminReturnSelectedIds.size === 0) {
      addNotification({
        type: 'warning',
        title: 'Admin return',
        message: 'Select at least one Out item to return.',
      });
      return;
    }
    setAdminReturnSuccess(null);
    setAdminPartialSummary(null);
    setAdminReturnAllMode(returnAll);
    setAdminReturnRemark('');
    setAdminReturnProductRemarks({});
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
      Status: normalizeRfidSampleLotStatusForUi(r.Status || ''),
      IssueDate: displayLotSampleOutDateTime(r),
      ExpectedReturn: displayLotExpectedReturnDate(r),
      CompletedDate:
        r.CompletedDate ||
        r.completedDate ||
        r.ClosedDate ||
        r.closedDate ||
        '',
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
      humanizeLotStatus(r.Status),
      displayLotSampleOutDateTime(r),
      displayLotExpectedReturnDate(r),
      displayRfidSampleDate(r, ['completedDate', 'CompletedDate', 'closedDate', 'ClosedDate', 'actualReturnDate', 'ActualReturnDate'], formatDate),
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
          'Completed',
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

  const resetImportModal = () => {
    setImportFile(null);
    setImportParseMeta(null);
    setImportPreview(null);
    setImportConfirmResult(null);
    setImportReturnedRows([]);
    setImportProgressPct(0);
    setImportStep('pick');
    setImportPreviewLoading(false);
    setImportConfirmLoading(false);
    setImportError('');
    setImportProductRemarks({});
    setImportSampleInDate(toDatetimeLocalValue());
    if (importFileInputRef.current) importFileInputRef.current.value = '';
  };

  const openImportModal = () => {
    resetImportModal();
    setShowImportModal(true);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    resetImportModal();
  };

  const runImportPreview = async (file) => {
    const clientCode = resolveClientCode(userInfo);
    if (!clientCode) {
      setImportError('Client code not found. Please log in again.');
      return;
    }
    if (!file) {
      setImportError('Choose an Excel file to preview.');
      return;
    }
    setImportPreviewLoading(true);
    setImportError('');
    setImportConfirmResult(null);
    try {
      const parsedExcel = await parseDesignNumbersFromExcelFile(file);
      const { data } = await axios.post(
        getAdminExcelSampleInPreviewUrl(),
        {
          clientCode,
          designNumbers: parsedExcel.uniqueDesignNumbers?.length
            ? parsedExcel.uniqueDesignNumbers
            : parsedExcel.designNumbers,
        },
        { headers: sampleAuthHeaders(), timeout: SAMPLE_LIST_TIMEOUT_MS }
      );
      if (data?.success === false) {
        throw new Error(data?.message || data?.Message || 'Preview failed.');
      }
      const parsed = parseAdminExcelSampleInPreview(data);
      const dedupedRows = dedupeAdminExcelPreviewRows(parsed.rows || []);
      const readyPreviewRows = dedupedRows.filter((row) => row.canReturn);
      const { remarks: productRemarks, rows: rowsWithExcelRemarks } = attachExcelRemarksToPreviewRows(
        readyPreviewRows,
        parsedExcel.excelRows || []
      );
      const dedupedPreview = {
        ...parsed,
        rows: dedupedRows.map((row) => {
          const enriched = rowsWithExcelRemarks.find(
            (entry) => Number(entry.lotItemId) === Number(row.lotItemId)
          );
          return enriched ? { ...row, ...enriched } : row;
        }),
        canReturnCount: dedupedRows.filter((row) => row.canReturn).length,
        matchedCount: dedupedRows.filter((row) => row.matched).length,
        errorCount: dedupedRows.filter((row) => !row.canReturn).length,
      };
      setImportFile(file);
      setImportParseMeta(parsedExcel);
      setImportPreview(dedupedPreview);
      setImportProductRemarks(productRemarks);
      setImportSampleInDate(toDatetimeLocalValue());
      setImportStep('preview');
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        err?.message ||
        'Could not preview the Excel file.';
      setImportError(msg);
      setImportPreview(null);
      setImportParseMeta(null);
      setImportStep('pick');
    } finally {
      setImportPreviewLoading(false);
    }
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    runImportPreview(file);
  };

  const runImportConfirm = async () => {
    const clientCode = resolveClientCode(userInfo);
    if (!clientCode || !importPreview) return;
    const readyRows = dedupeAdminExcelPreviewRows(
      (importPreview.rows || []).filter((row) => row.canReturn)
    );
    const missingRemarkRows = readyRows.filter((row) => {
      const remark = String(
        importProductRemarks[row.lotItemId] ?? importProductRemarks[String(row.lotItemId)] ?? ''
      ).trim();
      return !remark;
    });
    if (missingRemarkRows.length) {
      setImportError('Every ready product needs a remark before sample in.');
      return;
    }
    const lotItemIds = readyRows
      .map((row) => Number(row.lotItemId))
      .filter((id) => Number.isFinite(id) && id > 0);
    if (!lotItemIds.length) {
      setImportError('No returnable products in preview. Fix Excel or check sample-out status.');
      return;
    }
    const products = buildAdminExcelImportProductsPayload(
      readyRows,
      importProductRemarks,
      ADMIN_RETURN_SCAN_MODE
    );
    if (!products.length) {
      setImportError('Every ready product needs a remark before sample in.');
      return;
    }
    const rowsMissingLot = readyRows.filter((row) => {
      const lotId = Number(row?.lotId ?? row?.LotId);
      return !Number.isFinite(lotId) || lotId <= 0;
    });
    if (rowsMissingLot.length) {
      setImportError('Some products are missing lot id. Close and re-open import preview.');
      return;
    }
    const productRemarksByLotItemId = Object.fromEntries(
      products.map((entry) => [entry.LotItemId, entry.AdminReviewRemark])
    );
    setImportConfirmLoading(true);
    setImportError('');
    setImportStep('processing');
    setImportProgressPct(6);
    const progressTimer = setInterval(() => {
      setImportProgressPct((prev) => (prev >= 88 ? prev : prev + 5));
    }, 140);
    try {
      const sampleInDateIso = datetimeLocalToApiIso(importSampleInDate) || datetimeLocalToApiIso(toDatetimeLocalValue());
      const lotGroups = groupImportReadyRowsByLotId(readyRows);
      const lotResults = [];
      const returnedProducts = [];
      const failures = [];
      let totalReturned = 0;

      for (const [lotId, lotRows] of lotGroups.entries()) {
        const lotProducts = buildAdminExcelImportProductsPayload(
          lotRows,
          importProductRemarks,
          ADMIN_RETURN_SCAN_MODE
        );
        if (!lotProducts.length) continue;

        const lotBulkRemark =
          String(lotProducts[0]?.AdminReviewRemark || lotProducts[0]?.AdminReturnRemark || '').trim() ||
          'Excel sample in';

        const bulkPayload = {
          ClientCode: clientCode,
          LotId: Number(lotId),
          AdminReturnRemark: lotBulkRemark,
          ScanMode: ADMIN_RETURN_SCAN_MODE,
          Products: lotProducts.map(({ LotItemId, AdminReviewRemark, ScanMode }) => ({
            LotItemId,
            AdminReviewRemark,
            ScanMode,
          })),
        };
        if (sampleInDateIso) {
          bulkPayload.SampleInDate = sampleInDateIso;
          bulkPayload.sampleInDate = sampleInDateIso;
        }

        try {
          // eslint-disable-next-line no-await-in-loop
          const { data } = await axios.post(getAdminBulkSampleReturnUrl(), bulkPayload, {
            headers: sampleAuthHeaders(),
            timeout: SAMPLE_LIST_TIMEOUT_MS,
          });
          if (data?.success === false) {
            throw new Error(data?.message || data?.Message || `Sample in failed for lot ${lotId}.`);
          }
          const lotMeta = parseRfidSampleLotReturnMeta(data);
          const lotReturned = normalizeBulkReturnProducts(data);
          totalReturned += lotReturned.length || lotProducts.length;
          returnedProducts.push(...lotReturned);
          lotResults.push({
            lotId: Number(lotId),
            lotNumber: lotRows[0]?.lotNumber || lotMeta.lotNumber || '',
            lotStatus: lotMeta.lotStatus || '',
            lotCompleted: lotMeta.lotCompleted ?? false,
            returnedCount: lotReturned.length || lotProducts.length,
          });
        } catch (lotErr) {
          failures.push({
            lotId: Number(lotId),
            lotNumber: lotRows[0]?.lotNumber || String(lotId),
            message:
              lotErr?.response?.data?.message ||
              lotErr?.response?.data?.Message ||
              lotErr?.message ||
              `Could not sample in lot ${lotId}.`,
          });
        }
      }

      if (!totalReturned && failures.length) {
        throw new Error(failures.map((f) => f.message).join(' '));
      }

      const parsed = {
        success: failures.length === 0,
        message:
          failures.length === 0
            ? `${totalReturned} product(s) returned with individual Excel remarks.`
            : `${totalReturned} product(s) returned. ${failures.length} lot(s) failed.`,
        totalReturned,
        lotsProcessed: lotResults.length,
        sampleInDate: sampleInDateIso,
        sampleInDateFormatted: sampleInDateIso,
        lotResults,
        returnedProducts,
        failures,
      };

      setImportProgressPct(100);
      setImportReturnedRows(
        mergeAdminExcelReturnedRows(readyRows, returnedProducts).map((row) => {
          const lotItemId = row.lotItemId;
          const remark =
            productRemarksByLotItemId[lotItemId] ??
            productRemarksByLotItemId[String(lotItemId)] ??
            row.adminReturnRemark ??
            row.adminReviewRemark ??
            '';
          return {
            ...row,
            adminReturnRemark: remark,
            adminReviewRemark: remark,
          };
        })
      );
      setImportConfirmResult(parsed);
      setImportStep('done');
      addNotification({
        type: failures.length ? 'warning' : 'success',
        title: 'Sample In Import',
        message: parsed.message,
      });
      fetchSampleOutList();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        err?.message ||
        'Could not confirm sample-in from Excel.';
      setImportError(msg);
      setImportStep('preview');
    } finally {
      clearInterval(progressTimer);
      setImportConfirmLoading(false);
    }
  };

  const buildItemDetailPairs = (item) => {
    if (!item || typeof item !== 'object') return [];
    const preferred = [
      ['Counter', 'Counter'],
      ['CounterName', 'Counter label'],
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
      ['AdminReviewRemark', 'Admin review remark'],
      ['ReturnRemark', 'Return remark'],
      ['AdminReturnRemark', 'Admin return remark'],
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
        <tr><td>Status</td><td>${humanizeLotStatus(row.Status)}</td></tr>
        <tr><td>Issue</td><td>${displayLotSampleOutDateTime(row)}</td></tr>
        <tr><td>Expected return</td><td>${displayLotExpectedReturnDate(row)}</td></tr>
        <tr><td>Returned</td><td>${row.ReturnedItems ?? '—'}</td></tr>
        <tr><td>Items</td><td>${row.TotalItems ?? '—'} total · ${row.PendingItems ?? '—'} pending</td></tr>
        <tr><td>Completed</td><td>${displayRfidSampleDate(row, ['completedDate', 'CompletedDate', 'closedDate', 'ClosedDate', 'actualReturnDate', 'ActualReturnDate'], formatDate)}</td></tr>
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
            {isAdminUser ? (
              <button
                type="button"
                onClick={openImportModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: '1px solid #059669',
                  background: 'linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)',
                  color: '#047857',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  height: '34px',
                }}
              >
                <FaUpload style={{ fontSize: '12px' }} />
                Import Excel
              </button>
            ) : null}
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
                    <option value="PartialAccepted">Partial accepted</option>
                    <option value="Open">Open</option>
                    <option value="PartialReturn">Partial return</option>
                    <option value="PartialReturned">Partial returned (legacy)</option>
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

      {!listLoading && sampleOutData.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 10,
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Lot status
          </span>
          {[
            {
              key: 'partialAccepted',
              label: 'Partial accepted',
              value: computedListDashboard.partialAccepted,
              bg: '#fff7ed',
              fg: '#c2410c',
              bd: '#fdba74',
              filter: 'PartialAccepted',
            },
            {
              key: 'pendingAcceptance',
              label: 'Pending acceptance',
              value: computedListDashboard.pendingAcceptance,
              bg: '#fffbeb',
              fg: '#b45309',
              bd: '#fde68a',
              filter: 'PendingAcceptance',
            },
            {
              key: 'open',
              label: 'Open',
              value: computedListDashboard.open,
              bg: '#eff6ff',
              fg: '#1d4ed8',
              bd: '#bfdbfe',
              filter: 'Open',
            },
            {
              key: 'completed',
              label: 'Completed',
              value: computedListDashboard.completed,
              bg: '#f5f3ff',
              fg: '#6d28d9',
              bd: '#ddd6fe',
              filter: 'Completed',
            },
          ].map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setStatusFilter(chip.filter)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 999,
                border: `1px solid ${statusFilter === chip.filter ? chip.fg : chip.bd}`,
                background: statusFilter === chip.filter ? chip.bg : '#fff',
                color: chip.fg,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {chip.label}
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{chip.value}</strong>
            </button>
          ))}
        </div>
      ) : null}

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
                  ['Completed', 'left'],
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
                          <LotStatusPill status={item.Status} lot={item} />
                        </td>
                        <td style={tdL}>{displayLotSampleOutDateTime(item)}</td>
                        <td style={tdL}>{displayLotExpectedReturnDate(item)}</td>
                        <td style={{ ...tdL, color: '#737373' }}>
                          {displayRfidSampleDate(
                            item,
                            ['closedDate', 'ClosedDate', 'actualReturnDate', 'ActualReturnDate'],
                            formatDate
                          )}
                        </td>
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

      {showImportModal && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10050,
            padding: 16,
            backdropFilter: 'blur(2px)',
          }}
          onClick={closeImportModal}
        >
          <div
            role="dialog"
            aria-labelledby="sample-in-import-title"
            style={{
              background: '#fff',
              borderRadius: 12,
              width: 'min(1100px, 98vw)',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              @keyframes sampleInImportPop {
                0% { transform: scale(0.6); opacity: 0; }
                70% { transform: scale(1.08); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes sampleInProgressShine {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
            <style>{`
              @keyframes sampleInImportPop {
                0% { transform: scale(0.6); opacity: 0; }
                70% { transform: scale(1.08); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes sampleInProgressShine {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 18px',
                borderBottom: '1px solid #e2e8f0',
                background: 'linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)',
              }}
            >
              <div>
                <h2 id="sample-in-import-title" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Import Sample In — Excel (by Design)
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
                  Upload Excel → review matched products → check remarks → sample in all
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeImportModal}
                style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                style={{ display: 'none' }}
                onChange={handleImportFileChange}
              />

              {importStep === 'pick' ? (
                <div
                  style={{
                    border: '2px dashed #bbf7d0',
                    borderRadius: 12,
                    padding: '28px 20px',
                    textAlign: 'center',
                    background: '#f8fafc',
                  }}
                >
                  <FaFileExcel style={{ fontSize: 36, color: '#059669', marginBottom: 12 }} />
                  <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                    Choose an Excel file to preview sample-in rows
                  </p>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b', lineHeight: 1.55 }}>
                    Upload your Excel as-is. We read the <strong>DesignNo</strong> column and send all design numbers
                    to the preview API. Extra columns (Id, TagNo, Misc, VTypeOut, etc.) are ignored for matching.
                  </p>
                  <div
                    style={{
                      margin: '0 auto 16px',
                      maxWidth: 520,
                      textAlign: 'left',
                      fontSize: 11,
                      color: '#475569',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '10px 12px',
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Excel column used</div>
                    <div><strong>DesignNo</strong> → preview match</div>
                    <div><strong>Misc</strong> → match RFID to product row</div>
                    <div><strong>VTypeOut, BillDateOut, BillNoOut, PNameOut</strong> → auto remark per product</div>
                    <div style={{ marginTop: 6, color: '#64748b' }}>
                      Example remark: Split/Merge - 30/06/26 / 1340 / swami
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => importFileInputRef.current?.click()}
                    disabled={importPreviewLoading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 18px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#059669',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: importPreviewLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {importPreviewLoading ? <FaSpinner className="fa-spin" /> : <FaUpload />}
                    {importPreviewLoading ? 'Previewing…' : 'Select Excel file'}
                  </button>
                </div>
              ) : null}

              {importStep === 'preview' && importPreview ? (
                <>
                  {(() => {
                    const readyRows = dedupeAdminExcelPreviewRows(
                      (importPreview.rows || []).filter((row) => row.canReturn)
                    );
                    const failed = (importPreview.rows || []).filter((row) => !row.canReturn);
                    const matchedRows = (importPreview.rows || []).filter((row) => row.matched);
                    const ready = readyRows.length;
                    const bannerOk = ready > 0;
                    const sumWt = (rows, key) =>
                      rows.reduce((acc, row) => acc + (parseFloat(row?.[key]) || 0), 0);
                    const foundDesignKeys = new Set(
                      matchedRows
                        .map((row) => String(row.designName || row.searchedDesign || '').trim().toLowerCase())
                        .filter(Boolean)
                    );
                    const totalFoundDesigns = foundDesignKeys.size || importPreview.matchedCount || 0;
                    const weightRows = readyRows.length ? readyRows : matchedRows;
                    const totalGrossWt = sumWt(weightRows, 'grossWt');
                    const totalNetWt = sumWt(weightRows, 'netWt');
                    const fmtWt = (n) => (Number.isFinite(n) && n > 0 ? n.toFixed(3) : '0.000');
                    const statItems = [
                      { label: 'Excel', value: importParseMeta?.rowCount ?? 0, tone: '#64748b' },
                      { label: 'Found design', value: totalFoundDesigns, tone: '#0369a1' },
                      { label: 'Ready', value: ready, tone: '#047857' },
                      { label: 'Failed', value: importPreview.errorCount || failed.length, tone: '#b91c1c' },
                      { label: 'Total Gr.Wt', value: fmtWt(totalGrossWt), tone: '#0f172a' },
                      { label: 'Total Net Wt', value: fmtWt(totalNetWt), tone: '#0f172a' },
                    ];
                    return (
                      <>
                        <div
                          style={{
                            width: '100%',
                            marginBottom: 12,
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: bannerOk ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${bannerOk ? '#bbf7d0' : '#fecaca'}`,
                          }}
                        >
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: bannerOk ? '#047857' : '#b91c1c', flex: 1, lineHeight: 1.4 }}>
                              {bannerOk
                                ? importPreview.message || `${ready} product(s) ready for sample in`
                                : `${importPreview.matchedCount || 0} matched, ${importPreview.errorCount || failed.length} failed. Fix errors before sample in.`}
                            </span>
                            {importFile ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: '#475569',
                                  background: '#fff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 6,
                                  padding: '2px 8px',
                                  maxWidth: 180,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={importFile.name}
                              >
                                {importFile.name}
                              </span>
                            ) : null}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 6,
                            }}
                          >
                            {statItems.map((chip) => (
                              <div
                                key={chip.label}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'baseline',
                                  gap: 6,
                                  padding: '4px 10px',
                                  borderRadius: 999,
                                  background: '#fff',
                                  border: '1px solid #e2e8f0',
                                  fontSize: 11,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span style={{ color: '#64748b', fontWeight: 600 }}>{chip.label}</span>
                                <span style={{ fontWeight: 800, color: chip.tone, fontVariantNumeric: 'tabular-nums' }}>
                                  {chip.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {ready > 0 ? (
                          <div
                            style={{
                              marginBottom: 12,
                              padding: '10px 12px',
                              borderRadius: 10,
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                              Sample in date & time
                            </label>
                            <input
                              type="datetime-local"
                              value={importSampleInDate}
                              onChange={(e) => setImportSampleInDate(e.target.value)}
                              style={{
                                width: '100%',
                                maxWidth: 280,
                                padding: '8px 11px',
                                fontSize: 13,
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                boxSizing: 'border-box',
                                background: '#fff',
                              }}
                            />
                            <div style={{ marginTop: 6, fontSize: 10, color: '#64748b' }}>
                              Defaults to current date & time. Remark for each product comes from Excel (VTypeOut, BillDateOut, BillNoOut, PNameOut).
                            </div>
                          </div>
                        ) : null}

                        {readyRows.length > 0 ? (
                          <>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                              Ready products ({readyRows.length})
                            </div>
                            <div
                              style={{
                                marginBottom: 8,
                                padding: '8px 10px',
                                borderRadius: 8,
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                fontSize: 11,
                                color: '#1e40af',
                                lineHeight: 1.45,
                              }}
                            >
                              Each product remark is read from your Excel row (VTypeOut, BillDateOut, BillNoOut, PNameOut)
                              and matched by <strong>RFID (Misc)</strong> or <strong>TagNo</strong>. Edit any remark before sample in.
                            </div>
                            <div
                              style={{
                                overflow: 'auto',
                                maxHeight: 'min(42vh, 380px)',
                                border: '1px solid #e2e8f0',
                                borderRadius: 10,
                                marginBottom: failed.length ? 14 : 0,
                              }}
                            >
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                  <tr style={{ background: '#f1f5f9', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                                    {ADMIN_EXCEL_IMPORT_PREVIEW_COLUMNS.map((col) => (
                                      <th
                                        key={col.key}
                                        style={{
                                          padding: '9px 10px',
                                          fontWeight: 700,
                                          color: '#475569',
                                          whiteSpace: col.nowrap ? 'nowrap' : 'nowrap',
                                          minWidth: col.minWidth,
                                          textAlign: col.align || 'left',
                                          borderBottom: '1px solid #e2e8f0',
                                        }}
                                      >
                                        {col.label}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {readyRows.map((row, idx) => {
                                    const tone = adminExcelImportRowTone(row);
                                    const lotItemId = row.lotItemId;
                                    const remarkText = String(
                                      importProductRemarks[lotItemId] ??
                                        importProductRemarks[String(lotItemId)] ??
                                        row.excelRemark ??
                                        ''
                                    );
                                    const hasExcelRemark = !!String(row.excelRemark || '').trim();
                                    const cell = (value, extra = {}) => (
                                      <td
                                        style={{
                                          padding: '8px 10px',
                                          borderTop: '1px solid #f1f5f9',
                                          color: '#334155',
                                          ...extra,
                                        }}
                                      >
                                        {value || '—'}
                                      </td>
                                    );
                                    return (
                                      <tr key={`ready-${row.rowNumber}-${row.lotItemId ?? idx}`} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        {ADMIN_EXCEL_IMPORT_PREVIEW_COLUMNS.map((col) => {
                                          if (col.key === 'status') {
                                            return (
                                              <td key={`${row.lotItemId}-status`} style={{ padding: '8px 10px', borderTop: '1px solid #f1f5f9' }}>
                                                <span
                                                  style={{
                                                    display: 'inline-block',
                                                    padding: '3px 8px',
                                                    borderRadius: 999,
                                                    fontSize: 10,
                                                    fontWeight: 800,
                                                    whiteSpace: 'nowrap',
                                                    background: tone.bg,
                                                    color: tone.fg,
                                                    border: `1px solid ${tone.bd}`,
                                                  }}
                                                >
                                                  {tone.label}
                                                </span>
                                              </td>
                                            );
                                          }
                                          if (col.key === 'remark') {
                                            const remarkFilled = !!remarkText.trim();
                                            return (
                                              <td
                                                key={`${row.lotItemId}-remark`}
                                                style={{
                                                  padding: '6px 8px',
                                                  borderTop: '1px solid #f1f5f9',
                                                  minWidth: 280,
                                                  verticalAlign: 'top',
                                                }}
                                              >
                                                <input
                                                  type="text"
                                                  value={remarkText}
                                                  onChange={(e) =>
                                                    setImportProductRemarks((prev) => ({
                                                      ...prev,
                                                      [lotItemId]: e.target.value,
                                                    }))
                                                  }
                                                  placeholder="No Excel remark — add manually"
                                                  title={remarkText || 'Remark from Excel VTypeOut / BillDateOut / BillNoOut / PNameOut'}
                                                  style={ADMIN_EXCEL_IMPORT_REMARK_CELL_STYLE(remarkFilled)}
                                                />
                                                {hasExcelRemark ? (
                                                  <div style={{ marginTop: 4, fontSize: 10, color: '#15803d', fontWeight: 700 }}>
                                                    Excel row {row.excelRowNumber || '—'}
                                                  </div>
                                                ) : !remarkFilled ? (
                                                  <div style={{ marginTop: 4, fontSize: 10, color: '#b45309', fontWeight: 600 }}>
                                                    Could not match Excel row — check RFID / TagNo
                                                  </div>
                                                ) : null}
                                              </td>
                                            );
                                          }
                                          const value = getAdminExcelImportCellValue(row, col.key, { remarkText });
                                          const extra =
                                            col.key === 'lotNumber'
                                              ? { fontWeight: 700, color: '#0f4c81' }
                                              : col.key === 'employeeName'
                                                ? { fontWeight: 600, color: '#0f766e' }
                                                : col.align === 'right'
                                                  ? { textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
                                                  : col.nowrap
                                                    ? { whiteSpace: 'nowrap' }
                                                    : {};
                                          return cell(value, extra);
                                        })}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </>
                        ) : null}

                        {failed.length > 0 ? (
                          <div
                            style={{
                              marginTop: readyRows.length ? 0 : 4,
                              padding: '12px 14px',
                              borderRadius: 10,
                              background: '#fff',
                              border: '1px solid #fecaca',
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#b91c1c', marginBottom: 10 }}>
                              Not found on sample out ({failed.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'min(36vh, 320px)', overflowY: 'auto' }}>
                              {failed.map((row, idx) => (
                                <div
                                  key={`fail-${row.rowNumber}-${idx}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    padding: '8px 10px',
                                    borderRadius: 8,
                                    background: '#fef2f2',
                                    border: '1px solid #fee2e2',
                                  }}
                                >
                                  <FaExclamationTriangle style={{ color: '#dc2626', marginTop: 2, flexShrink: 0 }} />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>
                                      {row.searchedDesign || row.designName || `Row ${row.rowNumber}`}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 2, lineHeight: 1.45 }}>
                                      {row.error || 'No sample out product found for this design.'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </>
              ) : null}

              {importStep === 'processing' ? (
                <div style={{ padding: '28px 12px', textAlign: 'center' }}>
                  <FaSpinner style={{ fontSize: 36, color: '#059669', animation: 'spin 0.9s linear infinite', marginBottom: 16 }} />
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Sample in progress…</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 18 }}>
                    Returning products and updating sample lots
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: 10,
                      borderRadius: 999,
                      background: '#e2e8f0',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${importProgressPct}%`,
                        borderRadius: 999,
                        transition: 'width 0.35s ease',
                        background: 'linear-gradient(90deg, #059669, #34d399, #059669)',
                        backgroundSize: '200% 100%',
                        animation: 'sampleInProgressShine 1.2s linear infinite',
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: '#047857' }}>{importProgressPct}%</div>
                </div>
              ) : null}

              {importStep === 'done' && importConfirmResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        margin: '0 auto 12px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                        border: '2px solid #6ee7b7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'sampleInImportPop 0.55s ease-out',
                      }}
                    >
                      <FaCheckCircle style={{ fontSize: 40, color: '#059669' }} />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#047857', marginBottom: 4 }}>Sample In Done!</div>
                    <div style={{ fontSize: 13, color: '#475569' }}>
                      {importConfirmResult.message ||
                        `${importConfirmResult.totalReturned} product(s) returned across ${importConfirmResult.lotsProcessed} lot(s).`}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, width: '100%' }}>
                    {[
                      { label: 'Products returned', value: importConfirmResult.totalReturned, tone: '#047857' },
                      { label: 'Lots processed', value: importConfirmResult.lotsProcessed, tone: '#0369a1' },
                      {
                        label: 'Sample in date',
                        value: importConfirmResult.sampleInDateFormatted || importConfirmResult.sampleInDate || 'Server time',
                        tone: '#0f766e',
                        small: true,
                      },
                      { label: 'Remarks', value: 'Per product from Excel', tone: '#0f172a', small: true },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                        <div
                          style={{
                            fontSize: item.small ? 12 : 22,
                            fontWeight: 800,
                            color: item.tone,
                            lineHeight: 1.3,
                            wordBreak: 'break-word',
                          }}
                        >
                          {item.value}
                        </div>
                      </div>
                    ))}
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
                        height: '100%',
                        width: '100%',
                        borderRadius: 999,
                        background: 'linear-gradient(90deg, #059669, #34d399)',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>

                  {(importConfirmResult.lotResults || []).length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(importConfirmResult.lotResults || []).map((lot) => (
                        <div
                          key={lot.lotId ?? lot.lotNumber}
                          style={{
                            flex: '1 1 140px',
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: lot.lotCompleted ? '#ecfdf5' : '#fff',
                            border: `1px solid ${lot.lotCompleted ? '#bbf7d0' : '#e2e8f0'}`,
                            fontSize: 11,
                          }}
                        >
                          <div style={{ fontWeight: 800, color: '#0f4c81' }}>{lot.lotNumber}</div>
                          <div style={{ color: '#64748b', marginTop: 2 }}>
                            {lot.lotStatus} · {lot.returnedCount} returned
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {importReturnedRows.length ? (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
                        Returned products — check lot & remark
                      </div>
                      <div
                        style={{
                          overflow: 'auto',
                          maxHeight: 'min(40vh, 360px)',
                          border: '1px solid #e2e8f0',
                          borderRadius: 10,
                        }}
                      >
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                              {ADMIN_EXCEL_IMPORT_DONE_COLUMNS.map((col) => (
                                <th
                                  key={`done-${col.key}`}
                                  style={{
                                    padding: '9px 10px',
                                    fontWeight: 700,
                                    color: '#475569',
                                    whiteSpace: 'nowrap',
                                    minWidth: col.minWidth,
                                    textAlign: col.align || 'left',
                                    borderBottom: '1px solid #e2e8f0',
                                  }}
                                >
                                  {col.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {importReturnedRows.map((row, idx) => {
                              const remarkText =
                                row.adminReturnRemark ||
                                importProductRemarks[row.lotItemId] ||
                                importProductRemarks[String(row.lotItemId)] ||
                                '—';
                              const cell = (value, extra = {}) => (
                                <td
                                  style={{
                                    padding: '8px 10px',
                                    borderTop: '1px solid #f1f5f9',
                                    ...extra,
                                  }}
                                >
                                  {value || '—'}
                                </td>
                              );
                              return (
                                <tr key={`done-row-${row.lotItemId ?? idx}`} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                  {ADMIN_EXCEL_IMPORT_DONE_COLUMNS.map((col) => {
                                    if (col.key === 'status') {
                                      return (
                                        <td key={`done-${row.lotItemId}-status`} style={{ padding: '8px 10px', borderTop: '1px solid #f1f5f9' }}>
                                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#047857', fontWeight: 700, fontSize: 11 }}>
                                            <FaCheckCircle size={12} /> Done
                                          </span>
                                        </td>
                                      );
                                    }
                                    const value = getAdminExcelImportCellValue(row, col.key, { remarkText });
                                    const extra =
                                      col.key === 'lotNumber'
                                        ? { fontWeight: 700, color: '#0f4c81' }
                                        : col.key === 'employeeName'
                                          ? { fontWeight: 600, color: '#0f766e' }
                                          : col.align === 'right'
                                            ? { textAlign: 'right' }
                                            : col.nowrap
                                              ? { whiteSpace: 'nowrap' }
                                              : col.key === 'remark'
                                                ? { fontSize: 11, color: '#475569' }
                                                : {};
                                    return cell(value, extra);
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}

              {importError ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    fontSize: 12,
                    color: '#b91c1c',
                  }}
                >
                  {importError}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '12px 18px',
                borderTop: '1px solid #e2e8f0',
                background: '#fafafa',
              }}
            >
              {importStep === 'preview' ? (
                <>
                  <button
                    type="button"
                    onClick={() => importFileInputRef.current?.click()}
                    disabled={importConfirmLoading}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Change file
                  </button>
                  <button
                    type="button"
                    onClick={runImportConfirm}
                    disabled={importConfirmLoading || !importPreview?.canReturnCount}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: importConfirmLoading || !importPreview?.canReturnCount ? '#94a3b8' : '#059669',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: importConfirmLoading || !importPreview?.canReturnCount ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {importConfirmLoading ? <FaSpinner className="fa-spin" /> : <FaCheckCircle />}
                    Sample in all ({importPreview?.canReturnCount || 0})
                  </button>
                </>
              ) : null}
              {importStep === 'done' ? (
                <button
                  type="button"
                  onClick={() => {
                    closeImportModal();
                    fetchSampleOutList();
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#0f4c81',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <FaInbox size={13} />
                  View sample lots
                </button>
              ) : null}
              <button
                type="button"
                onClick={closeImportModal}
                disabled={importStep === 'processing'}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: importStep === 'processing' ? 'not-allowed' : 'pointer',
                  opacity: importStep === 'processing' ? 0.6 : 1,
                }}
              >
                {importStep === 'done' ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <LotStatusPill status={detailModal.header?.Status} lot={detailModal.header} />
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
                  totalProducts={detailModal.header?.TotalItems ?? detailModalItems.length}
                  pending={detailModal.header?.PendingItems ?? '—'}
                  outItems={detailModal.header?.OutItems ?? detailModal.header?.RemainingOutItems ?? '—'}
                  returnedItems={detailModal.header?.ReturnedItems ?? '—'}
                  employeeReturnedItems={detailModal.header?.EmployeeReturnedItems ?? '—'}
                  adminReturnedItems={detailModal.header?.AdminReturnedItems ?? '—'}
                  forceReturnedItems={detailModal.header?.ForceReturnedItems ?? 0}
                  grossWt={detailModalWeights.gross > 0 ? detailModalWeights.gross.toFixed(3) : '—'}
                  netWt={detailModalWeights.net > 0 ? detailModalWeights.net.toFixed(3) : '—'}
                  pieces={detailModalPieces}
                  designCount={detailModalDesignCount}
                  outDate={displayLotSampleOutDateTime(detailModal.header)}
                  inDate={displayLotSampleInDateTime(detailModal.header, detailModalItems)}
                  employee={lotDisplayParty(detailModal.header)}
                  loginUser={resolveLoginDisplayName(userInfo) || '—'}
                  lotStatus={detailModal.header?.Status}
                  pendingAcceptanceItems={pickLotPendingAcceptanceItems(detailModal.header)}
                  isPartiallyAccepted={isRfidSamplePartiallyAcceptedLot(detailModal.header)}
                  isFullyAccepted={isRfidSampleFullyAcceptedLot(detailModal.header)}
                  adminSelectAll={
                    isAdminUser && adminReturnableItems.length > 0
                      ? {
                          show: true,
                          checkboxRef: selectAllAdminReturnCheckboxRef,
                          checked:
                            detailItemStatusFilter !== 'all' ||
                            detailItemUserFilter !== 'all' ||
                            filteredAdminReturnableItems.length < adminReturnableItems.length
                              ? allFilteredAdminReturnableSelected
                              : allAdminReturnableSelected,
                          onChange: toggleSelectAllAdminReturnable,
                          label: `Select all${
                            detailItemStatusFilter !== 'all' ||
                            detailItemUserFilter !== 'all' ||
                            filteredAdminReturnableItems.length < adminReturnableItems.length
                              ? ` (${filteredAdminReturnableItems.length} visible)`
                              : ` (${adminReturnableItems.length})`
                          }`,
                        }
                      : { show: false }
                  }
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
                        active={detailItemStatusFilter === 'pending'}
                        label="Pending"
                        count={detailModalFilterCounts.pending}
                        onClick={() => setDetailItemStatusFilter('pending')}
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
                        label="Manual"
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
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: '#fafcff',
                          border: '1px solid #e8ecf4',
                          fontSize: 13,
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 12,
                            flexWrap: 'wrap',
                          }}
                        >
                          {!allAdminReturnableSelected &&
                          filteredAdminReturnableItems.length < adminReturnableItems.length ? (
                            <button
                              type="button"
                              onClick={selectAllAdminReturnable}
                              style={lotDetailToolbarBtn(false)}
                            >
                              Select all in lot ({adminReturnableItems.length})
                            </button>
                          ) : null}
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
                      </div>
                    ) : null}

                    <div
                      className="lot-detail-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isSmallScreen
                          ? 'repeat(1, minmax(0, 1fr))'
                          : `repeat(${MODAL_GRID_COLUMNS}, minmax(0, 1fr))`,
                        gridAutoRows: 'auto',
                        gap: 12,
                        alignItems: 'start',
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
                              lineDesign={lineDesign}
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

      {showAdminReturnModal && detailModal
        ? createPortal(
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15,23,42,0.58)',
                zIndex: 10200,
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
                  borderRadius: 16,
                  maxWidth: 920,
                  width: '100%',
                  maxHeight: 'min(860px, 94vh)',
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
                {adminReturnSuccess?.partialSummary ? (
                  <div style={{ marginTop: 12, textAlign: 'left' }}>
                    <PartialReturnSummaryPanel summary={adminReturnSuccess.partialSummary} compact />
                  </div>
                ) : Array.isArray(adminReturnSuccess?.remainingOutItems) &&
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
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 55%, #d97706 100%)',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 9,
                          background: 'rgba(255,255,255,0.18)',
                          border: '1px solid rgba(255,255,255,0.28)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <FaUndo size={14} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3
                          id="admin-return-modal-title"
                          style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.25 }}
                        >
                          {adminReturnAllMode ? 'Return all out items' : 'Admin bulk sample return'}
                        </h3>
                        <p
                          style={{
                            margin: '4px 0 0',
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.92)',
                            lineHeight: 1.4,
                          }}
                        >
                          Lot {detailModal.header?.SampleLotNo || detailModal.header?.SampleOutNo || '—'} ·{' '}
                          {adminReturnAllMode
                            ? `${adminReturnableItems.length} Out → Completed`
                            : allAdminReturnableSelected
                              ? `${adminReturnSelectedCount} selected → Completed`
                              : `${adminReturnSelectedCount} selected → PartialReturn`}
                        </p>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, max-content))',
                            gap: '8px 16px',
                            marginTop: 10,
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                color: 'rgba(255,255,255,0.72)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                marginBottom: 2,
                              }}
                            >
                              Returning
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                              {adminReturnAllMode ? adminReturnableItems.length : adminReturnSelectedCount} item(s)
                            </div>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                color: 'rgba(255,255,255,0.72)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                marginBottom: 2,
                              }}
                            >
                              Return date
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#fff',
                                lineHeight: 1.35,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {adminReturnPreviewDateTime}
                            </div>
                          </div>
                        </div>
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
                        padding: 6,
                        borderRadius: 8,
                        color: '#fff',
                        flexShrink: 0,
                        lineHeight: 0,
                      }}
                    >
                      <FaTimes size={13} />
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <section
                    style={{
                      flexShrink: 0,
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#fafcff',
                      padding: '10px 12px',
                    }}
                  >
                    <PartialReturnSummaryPanel
                      summary={adminPartialSummary}
                      loading={adminPartialSummaryLoading}
                      compact
                      hideSummaryTable
                      hideSummaryMessage
                      hideReturningItemsTable
                      remainingLabel="Remaining out"
                      remainingTableMaxHeight={160}
                    />
                  </section>
                  <section
                    style={{
                      flexShrink: 0,
                      borderRadius: 10,
                      border: '1px solid #fde68a',
                      background: '#fffbeb',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e', marginBottom: 6 }}>
                      Lot return remark
                    </div>
                    <textarea
                      id="admin-return-remark-modal"
                      value={adminReturnRemark}
                      onChange={(e) => setAdminReturnRemark(e.target.value)}
                      placeholder="Default remark for all products — use “Apply to all” on each row below…"
                      rows={2}
                      disabled={adminReturning}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #fcd34d',
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: '#0f172a',
                        resize: 'vertical',
                        minHeight: 56,
                        maxHeight: 96,
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        background: '#fff',
                      }}
                    />
                  </section>
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <AdminReturnProductsAccordion
                    lines={adminReturnAllMode ? adminReturnableItems : adminReturnSelectedLines}
                    lineItemCode={lineItemCode}
                    lineCategory={lineCategory}
                    lineProduct={lineProduct}
                    lineDesign={lineDesign}
                    lineRfidValue={lineRfidValue}
                    lineGrossWt={lineGrossWt}
                    lineNetWt={lineNetWt}
                    lineLotItemId={lineLotItemId}
                    lineItemKey={lineItemKey}
                    lineItemLocalImageUrls={lineItemLocalImageUrls}
                    lineImageUrl={lineImageUrl}
                    productRemarks={adminReturnProductRemarks}
                    onRemarkChange={setAdminReturnProductRemark}
                    lotRemarkFallback={adminReturnRemark}
                    disabled={adminReturning}
                  />
                  </div>
                </div>

                <div
                  style={{
                    flexShrink: 0,
                    padding: '10px 14px 12px',
                    borderTop: '1px solid #eef2f7',
                    background: '#fafcff',
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowAdminReturnModal(false)}
                    disabled={adminReturning}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 9,
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: 12,
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
                      (adminReturnAllMode
                        ? adminReturnableItems.length === 0
                        : adminReturnSelectedCount === 0 || adminReturnSelectedLines.length === 0)
                    }
                    style={{
                      flex: 1.3,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '10px 12px',
                      borderRadius: 9,
                      border: 'none',
                      background:
                        adminReturning ||
                        (adminReturnAllMode
                          ? adminReturnableItems.length === 0
                          : adminReturnSelectedCount === 0 || adminReturnSelectedLines.length === 0)
                          ? '#e2e8f0'
                          : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                      color:
                        adminReturning ||
                        (adminReturnAllMode
                          ? adminReturnableItems.length === 0
                          : adminReturnSelectedCount === 0 || adminReturnSelectedLines.length === 0)
                          ? '#94a3b8'
                          : '#fff',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor:
                        adminReturning ||
                        (adminReturnAllMode
                          ? adminReturnableItems.length === 0
                          : adminReturnSelectedCount === 0 || adminReturnSelectedLines.length === 0)
                          ? 'not-allowed'
                          : 'pointer',
                      fontFamily: LOT_DETAIL_FONT,
                      boxShadow:
                        adminReturning ||
                        (adminReturnAllMode
                          ? adminReturnableItems.length === 0
                          : adminReturnSelectedCount === 0 || adminReturnSelectedLines.length === 0)
                          ? 'none'
                          : '0 4px 14px rgba(234, 88, 12, 0.28)',
                    }}
                  >
                    {adminReturning ? (
                      <FaSpinner style={{ animation: 'spin 0.9s linear infinite' }} />
                    ) : (
                      <FaUndo size={12} />
                    )}
                    {adminReturnAllMode
                      ? 'Force return all'
                      : adminBulkExpectedStatus === 'Completed'
                        ? 'Force return all selected'
                        : 'Force return selected'}
                  </button>
                </div>
              </>
            )}
              </div>
            </div>,
            document.body
          )
        : null}

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
