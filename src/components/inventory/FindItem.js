import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FaSearch,
  FaSpinner,
  FaUserTie,
  FaBoxOpen,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaGem,
} from 'react-icons/fa';
import GridItemImage from '../common/GridItemImage';
import { getCheckScanStatusUrl, sampleAuthHeaders } from '../../services/rfidSampleApi';
import { getClientCode } from '../../utils/authState';
import { getItemImageLookupKeys, warmupLocalItemImageIndex } from '../../services/localItemImageService';

const pick = (obj, ...keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
};

const normalizeScanAction = (raw) => {
  const compact = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  if (compact === 'samplein' || compact === 'return') return 'SampleIn';
  if (compact === 'sampleout' || compact === 'out') return 'SampleOut';
  if (compact === 'blocked') return 'Blocked';
  if (compact === 'notfound') return 'NotFound';
  return String(raw ?? '').trim() || '—';
};

const friendlyStatusTitle = (scanAction, scanPhase) => {
  const phase = String(scanPhase ?? '').trim();
  if (scanAction === 'Blocked' || phase === 'pendingAcceptance') {
    return 'Waiting for employee acceptance';
  }
  if (scanAction === 'SampleIn' || phase === 'secondScan') {
    return 'Ready for sample return';
  }
  if (scanAction === 'SampleOut' || phase === 'firstScan') {
    return 'Ready for sample out';
  }
  if (scanAction === 'NotFound') return 'Item not found';
  return 'Item status';
};

const friendlyLotStatus = (lotStatus, itemStatus) => {
  const lot = String(lotStatus || '').toLowerCase();
  const item = String(itemStatus || '').toLowerCase();
  if (lot.includes('pending') || lot.includes('accept')) return 'Waiting for employee to accept';
  if (item.includes('return')) return 'Returned';
  if (item.includes('out') || lot.includes('open')) return 'Out with employee';
  if (lot.includes('closed')) return 'Closed';
  if (lotStatus) return String(lotStatus);
  if (itemStatus) return String(itemStatus);
  return '—';
};

const actionTheme = (scanAction, scanPhase) => {
  const phase = String(scanPhase ?? '').trim();
  if (scanAction === 'Blocked' || phase === 'pendingAcceptance') {
    return { bg: '#fffbeb', border: '#fcd34d', fg: '#b45309', icon: FaExclamationTriangle };
  }
  if (scanAction === 'SampleIn' || phase === 'secondScan') {
    return { bg: '#ecfdf5', border: '#6ee7b7', fg: '#047857', icon: FaCheckCircle };
  }
  if (scanAction === 'SampleOut' || phase === 'firstScan') {
    return { bg: '#eff6ff', border: '#93c5fd', fg: '#1d4ed8', icon: FaGem };
  }
  if (scanAction === 'NotFound') {
    return { bg: '#fef2f2', border: '#fca5a5', fg: '#b91c1c', icon: FaExclamationTriangle };
  }
  return { bg: '#f8fafc', border: '#e2e8f0', fg: '#475569', icon: FaInfoCircle };
};

const InfoRow = ({ label, value, highlight }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(110px, 36%) 1fr',
      gap: '8px 14px',
      fontSize: 13,
      padding: '6px 0',
      borderBottom: '1px solid #f1f5f9',
    }}
  >
    <div style={{ color: '#64748b', fontWeight: 600 }}>{label}</div>
    <div
      style={{
        color: highlight ? '#0f4c81' : '#0f172a',
        fontWeight: highlight ? 800 : 600,
        wordBreak: 'break-word',
      }}
    >
      {value ?? '—'}
    </div>
  </div>
);

const FindItem = () => {
  const navigate = useNavigate();
  const clientCode = getClientCode();
  const [itemCode, setItemCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [lastQuery, setLastQuery] = useState('');

  useEffect(() => {
    warmupLocalItemImageIndex().catch(() => {});
  }, []);

  const runSearch = useCallback(async () => {
    const code = String(itemCode || '').trim();
    if (!clientCode) {
      setError('Please log in again to search items.');
      setResult(null);
      return;
    }
    if (!code) {
      setError('Enter an item code to search.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setLastQuery(code);

    try {
      const { data } = await axios.post(
        getCheckScanStatusUrl(),
        { ClientCode: clientCode, ItemCode: code },
        { headers: sampleAuthHeaders(), timeout: 45000 }
      );

      const scanAction = normalizeScanAction(data?.scanAction ?? data?.ScanAction);
      if (scanAction === 'NotFound' || data?.success === false) {
        setError(String(data?.message ?? data?.Message ?? 'No item found for this code.'));
        setResult({ raw: data, scanAction });
        return;
      }

      setResult({ raw: data, scanAction });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        err?.message ||
        'Could not look up this item. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [clientCode, itemCode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    runSearch();
  };

  const data = result?.raw;
  const product = data?.product ?? data?.Product ?? {};
  const lot = data?.activeLot ?? data?.ActiveLot ?? null;
  const scanAction = result?.scanAction ?? normalizeScanAction(data?.scanAction ?? data?.ScanAction);
  const scanPhase = pick(data, 'scanPhase', 'ScanPhase');
  const theme = actionTheme(scanAction, scanPhase);
  const ThemeIcon = theme.icon;
  const statusTitle = friendlyStatusTitle(scanAction, scanPhase);
  const statusMessage = pick(data, 'message', 'Message') || '—';

  const productItemCode = pick(product, 'itemCode', 'ItemCode', 'Itemcode') || lastQuery || '—';
  const lookupKeys = getItemImageLookupKeys({
    ItemCode: productItemCode,
    Itemcode: productItemCode,
  });

  const lotNumber = pick(lot, 'lotNumber', 'LotNumber') || '—';
  const lotStatus = pick(lot, 'lotStatus', 'LotStatus', 'status', 'Status');
  const itemStatus = pick(lot, 'itemStatus', 'ItemStatus');
  const partyName = pick(lot, 'partyName', 'PartyName') || '—';
  const employeeName = pick(lot, 'assignedToUserName', 'AssignedToUserName', 'employeeName', 'EmployeeName') || '—';

  const grossWt = pick(product, 'grossWt', 'GrossWt');
  const netWt = pick(product, 'netWt', 'NetWt');
  const mrp = pick(product, 'mrp', 'MRP', 'MRPAmount');

  return (
    <div style={{ padding: '16px 20px 32px', maxWidth: 920, margin: '0 auto' }}>
      <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <FaSearch size={22} style={{ color: '#0f4c81' }} />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Find Item</h1>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.55, maxWidth: 640 }}>
          Search by item code to see jewellery details, whether the piece is in stock or out on sample, and which
          employee has it.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '16px 18px',
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.04)',
          marginBottom: 20,
        }}
      >
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
          Item code
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'stretch' }}>
          <input
            type="text"
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
            placeholder="Type item code, e.g. GPD5"
            autoFocus
            style={{
              flex: '1 1 220px',
              minWidth: 0,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              fontSize: 15,
              fontWeight: 600,
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            disabled={loading || !clientCode}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 22px',
              borderRadius: 10,
              border: 'none',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0f4c81 0%, #1e40af 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: loading || !clientCode ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? <FaSpinner style={{ animation: 'spin 0.8s linear infinite' }} /> : <FaSearch />}
            {loading ? 'Searching…' : 'Find item'}
          </button>
          <button
            type="button"
            onClick={() => {
              setItemCode('');
              setResult(null);
              setError('');
              setLastQuery('');
            }}
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#475569',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </form>

      {error ? (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
          }}
        >
          <FaSpinner size={28} style={{ color: '#0f4c81', animation: 'spin 0.9s linear infinite' }} />
          <p style={{ margin: '16px 0 0', fontSize: 14, color: '#64748b', fontWeight: 600 }}>
            Looking up item…
          </p>
        </div>
      ) : null}

      {!loading && result && scanAction !== 'NotFound' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: theme.bg,
              border: `1px solid ${theme.border}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <ThemeIcon size={22} style={{ color: theme.fg, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: theme.fg, marginBottom: 4 }}>{statusTitle}</div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.55 }}>{statusMessage}</div>
            </div>
          </div>

          <div
            className="find-item-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 260px) 1fr',
              gap: 16,
              alignItems: 'start',
            }}
          >
            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
              }}
            >
              <GridItemImage
                src=""
                itemCode={productItemCode === '—' ? '' : productItemCode}
                lookupKeys={lookupKeys}
                alt={productItemCode}
                eagerLoad
                wrapperStyle={{
                  width: '100%',
                  height: 260,
                  background: '#fafafa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 12,
                  boxSizing: 'border-box',
                }}
                imgStyle={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <div style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f4c81' }}>{productItemCode}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  {pick(product, 'productName', 'ProductName') || '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <section
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '14px 16px',
                  boxShadow: '0 2px 12px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <FaBoxOpen style={{ color: '#0f4c81' }} />
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Item details</h2>
                </div>
                <InfoRow label="Item code" value={productItemCode} highlight />
                <InfoRow label="Product" value={pick(product, 'productName', 'ProductName')} />
                <InfoRow label="Category" value={pick(product, 'categoryName', 'CategoryName')} />
                <InfoRow label="Design" value={pick(product, 'designName', 'DesignName')} />
                <InfoRow label="Purity" value={pick(product, 'purityName', 'PurityName')} />
                {grossWt ? <InfoRow label="Gross wt" value={grossWt} /> : null}
                {netWt ? <InfoRow label="Net wt" value={netWt} /> : null}
                {mrp ? <InfoRow label="MRP" value={mrp} /> : null}
              </section>

              {lot ? (
                <section
                  style={{
                    background: '#fff',
                    border: '1px solid #bbf7d0',
                    borderRadius: 14,
                    padding: '14px 16px',
                    boxShadow: '0 2px 12px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <FaUserTie style={{ color: '#15803d' }} />
                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Sample status</h2>
                  </div>
                  {employeeName !== '—' ? (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        marginBottom: 12,
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#14532d',
                        lineHeight: 1.5,
                      }}
                    >
                      With employee: <strong>{employeeName}</strong>
                    </div>
                  ) : null}
                  <InfoRow label="Sample lot" value={lotNumber} highlight />
                  <InfoRow label="Status" value={friendlyLotStatus(lotStatus, itemStatus)} />
                  {partyName !== '—' ? <InfoRow label="Party" value={partyName} /> : null}
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => navigate('/sample-out-list')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#0f4c81',
                        cursor: 'pointer',
                      }}
                    >
                      View sample out list
                    </button>
                  </div>
                </section>
              ) : (
                <section
                  style={{
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 14,
                    padding: '16px 18px',
                    fontSize: 13,
                    color: '#64748b',
                    lineHeight: 1.55,
                  }}
                >
                  <FaInfoCircle style={{ marginRight: 8, color: '#94a3b8' }} />
                  This item is in stock — not out on sample yet.
                </section>
              )}

              {(scanAction === 'SampleOut' || scanAction === 'SampleIn') && (
                <button
                  type="button"
                  onClick={() => navigate('/sample-out')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background:
                      scanAction === 'SampleIn'
                        ? 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)'
                        : 'linear-gradient(135deg, #0f4c81 0%, #1e40af 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  Open Sample Out / In
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !result && !error ? (
        <div
          style={{
            padding: '40px 24px',
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: 14,
            border: '1px dashed #cbd5e1',
            color: '#64748b',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          Enter an item code and click <strong>Find item</strong> to see jewellery details and sample status.
        </div>
      ) : null}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 720px) {
          .find-item-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default FindItem;
