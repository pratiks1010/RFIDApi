import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  FaPlug,
  FaLock,
  FaSync,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
  FaCloudUploadAlt,
  FaEdit,
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
} from 'react-icons/fa';
import { HiChip, HiDocumentText, HiLightningBolt } from 'react-icons/hi';
import { fetchKumar916StockMaster } from './kumar916StockService';

const KUMAR916_ALLOWED_CLIENT = 'LS000456';
const PAGE_SIZE = 15;
const TEAL = '#0d9488';
const TEAL_DARK = '#0f766e';

const LOYALSTRING_SAVE_URL = 'https://soni.loyalstring.co.in/api/ProductMaster/SaveRFIDTransactionDetails';
const LOYALSTRING_DELETE_ALL_URL = 'https://soni.loyalstring.co.in/api/ProductMaster/DeleteAllStockForClient';
const UPDATE_EXISTING_API = 'https://soni.loyalstring.co.in/api/ProductMaster/UpdateExistingProducts';
const PUSH_CHUNK_SIZE = 50;

const fmtWtApi = (v) => {
  if (v === '' || v == null) return '0.000';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : String(v);
};

/** SaveRFID / update APIs: ST_RFID (RFIDCode column) when present, else tag (ST_TAGNo / Item Code). */
const kumar916RfidNumberForApi = (row) => {
  const fromRfid = String(row.rfidCode ?? '').trim();
  if (fromRfid) return fromRfid;
  return String(row.itemCode ?? '').trim();
};

const mapKumar916ToLoyalstringPayload = (row, clientCode) => {
  const qtyNum = Number(row.qty);
  const sizeVal = Number.isFinite(qtyNum) ? qtyNum : 0;
  const rfidNumber = kumar916RfidNumberForApi(row);
  return {
    client_code: String(clientCode || ''),
    branch_id: '',
    counter_id: String(row.counterName ?? ''),
    RFIDNumber: rfidNumber,
    Itemcode: '',
    product_code: String(row.productCode ?? '').trim(),
    category_id: String(row.category ?? ''),
    product_id: String(row.productName ?? ''),
    design_id: String(row.design ?? ''),
    purity_id: String(row.purity ?? ''),
    grosswt: fmtWtApi(row.stGross),
    stonewt: '0',
    diamondheight: '0',
    diamondweight: '0',
    netwt: fmtWtApi(row.stNetwt),
    description: String(row.productCode ?? '').trim(),
    size: sizeVal,
    stoneamount: '0',
    diamondAmount: '0',
    HallmarkAmount: '0',
    MakingPerGram: '0',
    MakingPercentage: '0',
    MakingFixedAmt: '0',
    MRP: '0',
    imageurl: '',
    status: 'ApiActive',
  };
};

const mapKumar916ToUpdateExistingPayload = (row, clientCode) => {
  const rfidNumber = kumar916RfidNumberForApi(row);
  return {
    client_code: String(clientCode || ''),
    RFIDNumber: rfidNumber,
    itemcode: '',
    branch_id: '',
    counter_id: String(row.counterName ?? ''),
    category_id: String(row.category ?? ''),
    product_id: String(row.productName ?? ''),
    design_id: String(row.design ?? ''),
    purity_id: String(row.purity ?? ''),
    grosswt: fmtWtApi(row.stGross),
    netwt: fmtWtApi(row.stNetwt),
    stonewt: '0',
    stoneamount: '0',
    diamondAmount: '0',
    diamondWeight: '0',
    box_details: String(row.productCode ?? '').trim(),
    MRP: '0',
    HallmarkAmount: '0',
    MakingPerGram: '0',
    MakingPercentage: '0',
    MakingFixedAmt: '0',
    status: 'ApiActive',
  };
};

const TABLE_COLUMNS = [
  { key: 'counterName', label: 'Counter name', width: 130 },
  { key: 'itemCode', label: 'Item Code', width: 100 },
  { key: 'rfidCode', label: 'RFIDCode', width: 120 },
  { key: 'category', label: 'Category', width: 100 },
  { key: 'productName', label: 'Product name', width: 130 },
  { key: 'design', label: 'Design', width: 130 },
  { key: 'productCode', label: 'Product Code', width: 100 },
  { key: 'purity', label: 'Purity', width: 80 },
  { key: 'grWt', label: 'Gr.wt', width: 85 },
  { key: 'ntWt', label: 'Nt.wt', width: 85 },
  { key: 'qty', label: 'Qty', width: 70 },
];

const getClientCodeFromAuth = () => {
  try {
    const stored = localStorage.getItem('userInfo');
    if (!stored) return '';
    const parsed = JSON.parse(stored);
    return (parsed.ClientCode || parsed.clientCode || parsed.clientcode || '').trim().toUpperCase();
  } catch {
    return '';
  }
};

const LoadingModal = ({ open, message }) => {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 'min(400px, 100%)',
          background: '#fff',
          borderRadius: 16,
          padding: '28px 24px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
        }}
      >
        <FaSpinner size={32} style={{ color: TEAL, marginBottom: 16, animation: 'k916spin 0.9s linear infinite' }} />
        <p style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: '#1e293b', lineHeight: 1.45 }}>{message}</p>
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: '40%',
              borderRadius: 999,
              background: `linear-gradient(90deg, ${TEAL}, #5eead4, ${TEAL})`,
              backgroundSize: '200% 100%',
              animation: 'k916indet 1.2s ease-in-out infinite',
            }}
          />
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 12, color: '#64748b' }}>Please wait — large responses can take up to two minutes.</p>
      </div>
      <style>{`
        @keyframes k916spin { to { transform: rotate(360deg); } }
        @keyframes k916indet {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
};

const Card = ({ icon, title, description, color }) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      padding: 24,
      transition: 'all 0.2s ease',
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`;
      e.currentTarget.style.borderColor = `${color}40`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.borderColor = '#e2e8f0';
    }}
  >
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 10,
        background: `${color}15`,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
      }}
    >
      {icon}
    </div>
    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: '0 0 8px 0' }}>{title}</h3>
    <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: 0 }}>{description}</p>
  </div>
);

const Kumar916StockMasterIntegration = () => {
  const [clientCode, setClientCode] = useState('');
  const [allowed, setAllowed] = useState(false);
  const [stockData, setStockData] = useState([]);
  const [stockError, setStockError] = useState('');
  const [searchStock, setSearchStock] = useState('');
  const [loadOpen, setLoadOpen] = useState(false);
  const [loadMessage, setLoadMessage] = useState('Loading stock data…');
  const [page, setPage] = useState(1);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushProgress, setPushProgress] = useState(0);
  const [pushResult, setPushResult] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateResult, setUpdateResult] = useState(null);

  useEffect(() => {
    const code = getClientCodeFromAuth();
    setClientCode(code);
    setAllowed(code === KUMAR916_ALLOWED_CLIENT);
  }, []);

  const loadStock = async () => {
    setStockError('');
    setStockData([]);
    setPage(1);
    setPushResult(null);
    setUpdateResult(null);
    setLoadMessage('Loading stock data…');
    setLoadOpen(true);
    try {
      const rows = await fetchKumar916StockMaster();
      setStockData(rows);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        'Failed to load stock';
      setStockError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoadOpen(false);
    }
  };

  const pushToLoyalstring = async () => {
    if (!stockData.length || !clientCode) {
      setPushResult({ success: false, message: 'No data to push or client code missing.' });
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setPushResult({ success: false, message: 'Please log in again.' });
      return;
    }
    setPushLoading(true);
    setPushResult(null);
    setPushProgress(0);
    let deleteOk = false;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      setPushProgress(1);
      const deleteRes = await axios.delete(LOYALSTRING_DELETE_ALL_URL, {
        params: { ClientCode: clientCode },
        headers: { Authorization: `Bearer ${token}` },
      });
      const deleteBody = deleteRes?.data;
      deleteOk = deleteBody?.success !== false;
      setPushProgress(20);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.response?.data?.error || err?.message || 'DeleteAllStockForClient failed';
      setPushLoading(false);
      setPushProgress(0);
      setPushResult({ success: false, message: msg });
      return;
    }

    if (!deleteOk) {
      setPushLoading(false);
      setPushProgress(0);
      setPushResult({ success: false, message: 'DeleteAllStockForClient returned failure.' });
      return;
    }

    const payloads = stockData.map((row) => mapKumar916ToLoyalstringPayload(row, clientCode));
    const total = payloads.length;

    for (let i = 0; i < payloads.length; i += PUSH_CHUNK_SIZE) {
      const chunk = payloads.slice(i, i + PUSH_CHUNK_SIZE);
      const chunkNum = Math.floor(i / PUSH_CHUNK_SIZE) + 1;
      try {
        const res = await axios.post(LOYALSTRING_SAVE_URL, chunk, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const data = res.data || {};
        const hasError =
          data.errors?.length ||
          (typeof data.message === 'string' && /error|failed|invalid|duplicate|not found/i.test(data.message));
        if (hasError) {
          errorCount += chunk.length;
          const msg =
            data.message || (data.errors && data.errors.map((e) => e.error || e.message).join('; ')) || 'Validation error';
          errors.push(`Batch ${chunkNum}: ${msg}`);
        } else {
          successCount += chunk.length;
        }
      } catch (err) {
        errorCount += chunk.length;
        const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Request failed';
        errors.push(`Batch ${chunkNum}: ${msg}`);
      }
      const pushedRatio = (i + chunk.length) / total;
      setPushProgress(20 + Math.round(pushedRatio * 80));
    }

    setPushLoading(false);
    setPushProgress(100);
    setPushResult({
      success: errorCount === 0,
      successCount,
      errorCount,
      total,
      errors: errors.length ? errors : null,
    });
  };

  const updateStocksDetails = async () => {
    if (!stockData.length || !clientCode) {
      setUpdateResult({ success: false, message: 'No data to update or client code missing.' });
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setUpdateResult({ success: false, message: 'Please log in again.' });
      return;
    }
    setUpdateLoading(true);
    setUpdateResult(null);
    setUpdateProgress(0);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const payloads = stockData
      .filter((row) => kumar916RfidNumberForApi(row) !== '')
      .map((row) => mapKumar916ToUpdateExistingPayload(row, clientCode));
    const skippedCount = stockData.length - payloads.length;
    const total = payloads.length;
    if (total === 0) {
      setUpdateLoading(false);
      setUpdateResult({
        success: false,
        message:
          skippedCount > 0
            ? `All ${stockData.length} rows are missing RFIDCode and Item Code; nothing to send.`
            : 'No valid rows to update.',
      });
      return;
    }
    for (let i = 0; i < payloads.length; i += PUSH_CHUNK_SIZE) {
      const chunk = payloads.slice(i, i + PUSH_CHUNK_SIZE);
      const chunkNum = Math.floor(i / PUSH_CHUNK_SIZE) + 1;
      try {
        const res = await axios.post(UPDATE_EXISTING_API, chunk, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const data = res.data || {};
        const hasError =
          data.errors?.length ||
          (typeof data.message === 'string' && /error|failed|invalid|duplicate|not found/i.test(data.message));
        if (hasError) {
          errorCount += chunk.length;
          const msg =
            data.message || (data.errors && data.errors.map((e) => e.error || e.message).join('; ')) || 'Validation error';
          errors.push(`Batch ${chunkNum}: ${msg}`);
        } else {
          successCount += chunk.length;
        }
      } catch (err) {
        errorCount += chunk.length;
        const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Request failed';
        errors.push(`Batch ${chunkNum}: ${msg}`);
      }
      setUpdateProgress(Math.round(((i + chunk.length) / total) * 100));
    }
    setUpdateLoading(false);
    setUpdateProgress(100);
    setUpdateResult({
      success: errorCount === 0,
      successCount,
      errorCount,
      total,
      skippedCount: skippedCount > 0 ? skippedCount : null,
      totalRows: stockData.length,
      errors: errors.length ? errors : null,
    });
  };

  const filteredStock = useMemo(() => {
    const q = searchStock.trim().toLowerCase();
    if (!q) return stockData;
    return stockData.filter((row) =>
      TABLE_COLUMNS.some((col) => {
        const v = row[col.key];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [stockData, searchStock]);

  const totalPages = Math.max(1, Math.ceil(filteredStock.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * PAGE_SIZE;
    return filteredStock.slice(start, start + PAGE_SIZE);
  }, [filteredStock, page, totalPages]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (!allowed) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'Inter, Poppins, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: '#d97706',
            }}
          >
            <FaLock size={28} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Access restricted</h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>
            Third Party Integration (916 stock) is available only for authorized clients.
          </p>
          {clientCode ? (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              Your client code: <strong>{clientCode}</strong>
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <LoadingModal open={loadOpen} message={loadMessage} />
      <style>{`@keyframes spin916 { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          padding: '0 4px',
          fontFamily: 'Inter, Poppins, sans-serif',
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: `0 4px 12px rgba(13, 148, 136, 0.35)`,
            }}
          >
            <FaPlug size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
              Third Party Software Integration
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0 0' }}>
              916 Advanced stock — client <strong>{KUMAR916_ALLOWED_CLIENT}</strong>
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
            marginBottom: 28,
          }}
        >
          <Card
            icon={<HiChip size={28} />}
            title="API sync"
            description="Load stock from your external system, then push or update details on the Loyalstring server."
            color={TEAL}
          />
          <Card
            icon={<HiDocumentText size={28} />}
            title="Field mapping"
            description="Item Code shows tag (ST_TAGNo); RFIDCode from ST_RFID; Product Code from ITEM_CODE; Purity from ITEM_PURITY; weights to three decimals."
            color="#6366f1"
          />
          <Card
            icon={<HiLightningBolt size={28} />}
            title="Pagination"
            description="Table shows 15 rows per page with search across all columns."
            color="#8b5cf6"
          />
        </div>

        <section
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              background: 'linear-gradient(180deg, #f0fdfa 0%, #fff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>Stock data</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={loadStock}
                disabled={loadOpen}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background: loadOpen ? '#94a3b8' : TEAL,
                  border: 'none',
                  borderRadius: 8,
                  cursor: loadOpen ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {loadOpen ? (
                  <FaSpinner size={14} style={{ animation: 'spin916 1s linear infinite' }} />
                ) : (
                  <FaSync size={14} />
                )}
                Load stock data
              </button>
              <button
                type="button"
                onClick={pushToLoyalstring}
                disabled={loadOpen || pushLoading || stockData.length === 0}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background: stockData.length === 0 || pushLoading ? '#94a3b8' : '#6366f1',
                  border: 'none',
                  borderRadius: 8,
                  cursor: stockData.length === 0 || pushLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {pushLoading ? <FaSpinner size={14} style={{ animation: 'spin916 1s linear infinite' }} /> : <FaCloudUploadAlt size={14} />}
                Push to Loyalstring Server
              </button>
              <button
                type="button"
                onClick={updateStocksDetails}
                disabled={loadOpen || updateLoading || stockData.length === 0}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background: stockData.length === 0 || updateLoading ? '#94a3b8' : TEAL_DARK,
                  border: 'none',
                  borderRadius: 8,
                  cursor: stockData.length === 0 || updateLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {updateLoading ? <FaSpinner size={14} style={{ animation: 'spin916 1s linear infinite' }} /> : <FaEdit size={14} />}
                Update stocks details
              </button>
            </div>
          </div>

          {pushLoading && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Pushing to Loyalstring…</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>{pushProgress}%</span>
              </div>
              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pushProgress}%`,
                    background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )}

          {pushResult && !pushLoading && (
            <div
              style={{
                padding: 16,
                margin: 12,
                background: pushResult.success ? '#f0fdf4' : '#fef2f2',
                borderRadius: 10,
                border: `1px solid ${pushResult.success ? '#86efac' : '#fecaca'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {pushResult.success ? (
                  <FaCheckCircle size={20} style={{ color: '#16a34a' }} />
                ) : (
                  <FaExclamationCircle size={20} style={{ color: '#dc2626' }} />
                )}
                <span style={{ fontWeight: 600, fontSize: 14, color: pushResult.success ? '#166534' : '#991b1b' }}>
                  {pushResult.success ? 'Push completed' : 'Push completed with errors'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: pushResult.success ? '#15803d' : '#b91c1c', margin: '0 0 8px 0' }}>
                {pushResult.total != null && (
                  <>
                    Processed {pushResult.successCount} of {pushResult.total} items successfully.
                    {pushResult.errorCount > 0 && ` ${pushResult.errorCount} failed.`}
                  </>
                )}
                {pushResult.message && !pushResult.total && pushResult.message}
              </p>
              {pushResult.errors && pushResult.errors.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: 12, cursor: 'pointer', color: '#64748b' }}>View errors</summary>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 12, color: '#991b1b', maxHeight: 120, overflowY: 'auto' }}>
                    {pushResult.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {pushResult.errors.length > 10 && <li>… and {pushResult.errors.length - 10} more</li>}
                  </ul>
                </details>
              )}
            </div>
          )}

          {updateLoading && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Updating stock details…</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>{updateProgress}%</span>
              </div>
              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${updateProgress}%`,
                    background: `linear-gradient(90deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`,
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )}

          {updateResult && !updateLoading && (
            <div
              style={{
                padding: 16,
                margin: 12,
                background: updateResult.success ? '#f0fdf4' : '#fef2f2',
                borderRadius: 10,
                border: `1px solid ${updateResult.success ? '#86efac' : '#fecaca'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {updateResult.success ? (
                  <FaCheckCircle size={20} style={{ color: '#16a34a' }} />
                ) : (
                  <FaExclamationCircle size={20} style={{ color: '#dc2626' }} />
                )}
                <span style={{ fontWeight: 600, fontSize: 14, color: updateResult.success ? '#166534' : '#991b1b' }}>
                  {updateResult.success ? 'Update completed' : 'Update completed with errors'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: updateResult.success ? '#15803d' : '#b91c1c', margin: '0 0 8px 0' }}>
                {updateResult.total != null && (
                  <>
                    Processed {updateResult.successCount} of {updateResult.total} items successfully.
                    {updateResult.errorCount > 0 && ` ${updateResult.errorCount} failed.`}
                    {updateResult.skippedCount > 0 &&
                      ` ${updateResult.skippedCount} skipped (missing RFIDCode and Item Code).`}
                  </>
                )}
                {updateResult.message && !updateResult.total && updateResult.message}
              </p>
              {updateResult.errors && updateResult.errors.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: 12, cursor: 'pointer', color: '#64748b' }}>View errors</summary>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 12, color: '#991b1b', maxHeight: 120, overflowY: 'auto' }}>
                    {updateResult.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {stockError ? (
            <div style={{ padding: 12, margin: 12, background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
              {stockError}
            </div>
          ) : null}

          {stockData.length > 0 ? (
            <>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search in table…"
                  value={searchStock}
                  onChange={(e) => {
                    setSearchStock(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    width: 220,
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {filteredStock.length} of {stockData.length} items — page {safePage} of {totalPages} ({PAGE_SIZE} per page)
                </span>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1120 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f0fdfa', zIndex: 1 }}>
                    <tr>
                      <th
                        style={{
                          padding: '10px 8px',
                          textAlign: 'left',
                          fontWeight: 600,
                          color: TEAL_DARK,
                          borderBottom: '2px solid #99f6e4',
                          width: 44,
                        }}
                      >
                        #
                      </th>
                      {TABLE_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          style={{
                            padding: '10px 8px',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: TEAL_DARK,
                            borderBottom: '2px solid #99f6e4',
                            whiteSpace: 'nowrap',
                            width: col.width,
                          }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageSlice.length === 0 ? (
                      <tr>
                        <td
                          colSpan={1 + TABLE_COLUMNS.length}
                          style={{ padding: 28, textAlign: 'center', color: '#64748b', fontSize: 14 }}
                        >
                          {stockData.length > 0 ? 'No rows match your search.' : 'No data on this page.'}
                        </td>
                      </tr>
                    ) : (
                      pageSlice.map((row, idx) => (
                        <tr
                          key={row._rowId}
                          style={{
                            background: idx % 2 === 0 ? '#fff' : '#f0fdfa',
                            borderBottom: '1px solid #e2e8f0',
                          }}
                        >
                          <td style={{ padding: '8px', color: '#64748b' }}>{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                          {TABLE_COLUMNS.map((col) => (
                            <td
                              key={col.key}
                              style={{
                                padding: '8px',
                                color: '#1e293b',
                                maxWidth: col.width,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={row[col.key] != null ? String(row[col.key]) : ''}
                            >
                              {row[col.key] != null && row[col.key] !== '' ? String(row[col.key]) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 ? (
                <div
                  style={{
                    padding: '12px 20px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    background: '#fafaf9',
                  }}
                >
                  <span style={{ fontSize: 13, color: '#64748b' }}>
                    Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredStock.length)} of {filteredStock.length}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      style={{
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        background: safePage <= 1 ? '#f1f5f9' : '#fff',
                        cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <FaChevronLeft size={12} /> Previous
                    </button>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      style={{
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        background: safePage >= totalPages ? '#f1f5f9' : '#fff',
                        cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      Next <FaChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </section>

        <div
          style={{
            padding: 20,
            background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
            borderRadius: 12,
            border: '1px solid #99f6e4',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <FaInfoCircle size={20} style={{ color: TEAL, flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, color: TEAL_DARK, marginBottom: 4 }}>Authorized client</div>
            <p style={{ fontSize: 13, color: '#115e59', margin: 0, lineHeight: 1.5 }}>
              You are viewing Third Party Integration as client <strong>{clientCode}</strong>. SaveRFIDTransactionDetails / update: RFIDNumber from RFIDCode (ST_RFID) when set, otherwise Item Code (tag); Itemcode left empty; purity column → purity_id; counter name → counter_id; category / product / design → category_id, product_id, design_id; grosswt & netwt (3 dp); qty → size; product code in description / box_details.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Kumar916StockMasterIntegration;
