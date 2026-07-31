import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FaPlug, FaLock, FaInfoCircle, FaSync, FaSpinner, FaCheckCircle, FaExclamationCircle, FaCloudUploadAlt, FaEdit } from 'react-icons/fa';
import { HiChip, HiDocumentText, HiLightningBolt } from 'react-icons/hi';
import { getFeroniaTestService, getFeroniaStockData, getFeroniaBaseUrl, hasFeroniaAuthToken } from './feroniaService';

const LOYALSTRING_SAVE_URL = 'https://soni.loyalstring.co.in/api/ProductMaster/SaveRFIDTransactionDetails';
const LOYALSTRING_DELETE_ALL_URL = 'https://soni.loyalstring.co.in/api/ProductMaster/DeleteAllStockForClient';
const UPDATE_EXISTING_API = 'https://soni.loyalstring.co.in/api/ProductMaster/UpdateExistingProducts';
const PUSH_CHUNK_SIZE = 50;
const FERONIA_ALLOWED_CLIENT = 'LS000512';

const getFirstValue = (row, keys, fallback = '') => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  return fallback;
};

const normalizeRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.d)) return payload.d;

  if (payload.d && typeof payload.d === 'string') {
    try {
      const parsed = JSON.parse(payload.d);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.data)) return parsed.data;
    } catch {
      return [];
    }
  }

  return [];
};

const mapFeroniaToLoyalstringPayload = (row, clientCode) => ({
  client_code: String(clientCode || ''),
  branch_id: '',
  counter_id: '',
  RFIDNumber: String(getFirstValue(row, ['RFIDCode', 'RFIDNumber', 'RFIDNo', 'RFID', 'rfidcode']) || ''),
  Itemcode: String(getFirstValue(row, ['ItemCode', 'itemcode', 'Itemcode', 'Barcode', 'BarcodeNumber']) || ''),
  itemcode: String(getFirstValue(row, ['ItemCode', 'itemcode', 'Itemcode', 'Barcode', 'BarcodeNumber']) || ''),
  product_code: String(getFirstValue(row, ['ProductCode', 'product_code', 'productCode']) || ''),
  description: String(getFirstValue(row, ['Description', 'CategoryName', 'Category'], '')),
  category_id: String(getFirstValue(row, ['MetalName', 'CategoryName', 'Category', 'category']) || ''),
  product_id: String(getFirstValue(row, ['ProductName', 'Product', 'product']) || ''),
  design_id: String(getFirstValue(row, ['ProductCode', 'DesignName', 'Design', 'design']) || ''),
  purity_id: String(getFirstValue(row, ['PurityName', 'Purity', 'purity']) || ''),
  vendor_id: '',
  box_details: '',
  box: '',
  packet: '',
  grosswt: String(getFirstValue(row, ['GrossWt', 'GrossWeight', 'GrossWeightInGms'], '0')),
  stonewt: String(getFirstValue(row, ['TotalStoneWeight', 'StoneWt', 'StoneWeight'], '0')),
  diamondheight: String(getFirstValue(row, ['TotalDiamondWeight', 'DiamondWeight'], '0')),
  diamondweight: String(getFirstValue(row, ['TotalDiamondWeight', 'DiamondWeight'], '0')),
  diamondWeight: String(getFirstValue(row, ['TotalDiamondWeight', 'DiamondWeight'], '0')),
  netwt: String(getFirstValue(row, ['NetWt', 'NetWeight', 'NetWeightInGms'], '0')),
  size: 0,
  stoneamount: String(getFirstValue(row, ['TotalStonePieces', 'StonePieces', 'StoneQty'], '0')),
  diamondAmount: String(getFirstValue(row, ['TotalDiamondPieces', 'DiamondPieces', 'DiamondQty'], '0')),
  HallmarkAmount: String(getFirstValue(row, ['HSNCode', 'HallmarkAmount'], '0')),
  MakingPerGram: '0',
  MakingPercentage: '0',
  MakingFixedAmt: '0',
  MRP: String(getFirstValue(row, ['MRP', 'SellingRate', 'Rate'], '0')),
  imageurl: String(getFirstValue(row, ['ImageUrl', 'Description'], '')),
  status: 'ApiActive',
  Stones: [],
  Diamonds: [],
});

const mapFeroniaToUpdateExistingPayload = (row, clientCode) => ({
  client_code: String(clientCode || ''),
  RFIDNumber: String(getFirstValue(row, ['RFIDCode', 'RFIDNumber', 'RFIDNo', 'RFID', 'rfidcode']) || ''),
  itemcode: String(getFirstValue(row, ['ItemCode', 'itemcode', 'Itemcode', 'Barcode', 'BarcodeNumber']) || ''),
  branch_id: '',
  counter_id: '',
  category_id: String(getFirstValue(row, ['MetalName', 'CategoryName', 'Category', 'category']) || ''),
  product_id: String(getFirstValue(row, ['ProductName', 'Product', 'product']) || ''),
  design_id: String(getFirstValue(row, ['ProductCode', 'DesignName', 'Design', 'design']) || ''),
  purity_id: String(getFirstValue(row, ['PurityName', 'Purity', 'purity']) || ''),
  description: String(getFirstValue(row, ['Description', 'CategoryName', 'Category'], '')),
  vendor_id: '',
  box: '',
  packet: '',
  grosswt: String(getFirstValue(row, ['GrossWt', 'GrossWeight', 'GrossWeightInGms'], '0')),
  netwt: String(getFirstValue(row, ['NetWt', 'NetWeight', 'NetWeightInGms'], '0')),
  stonewt: String(getFirstValue(row, ['TotalStoneWeight', 'StoneWt', 'StoneWeight'], '0')),
  stoneamount: String(getFirstValue(row, ['TotalStonePieces', 'StonePieces', 'StoneQty'], '0')),
  diamondAmount: String(getFirstValue(row, ['TotalDiamondPieces', 'DiamondPieces', 'DiamondQty'], '0')),
  diamondWeight: String(getFirstValue(row, ['TotalDiamondWeight', 'DiamondWeight'], '0')),
  box_details: String(getFirstValue(row, ['Description', 'BoxName', 'BoxDetails'], '')),
  MRP: String(getFirstValue(row, ['MRP', 'SellingRate', 'Rate'], '0')),
  HallmarkAmount: String(getFirstValue(row, ['HSNCode', 'HallmarkAmount'], '0')),
  MakingPerGram: '0',
  MakingPercentage: '0',
  MakingFixedAmt: '0',
  status: 'ApiActive',
});

const STOCK_COLUMNS = [
  { key: 'RFIDCode', label: 'RFID Code', width: 90 },
  { key: 'ItemCode', label: 'Item Code', width: 100 },
  { key: 'ProductName', label: 'Product', width: 120 },
  { key: 'CategoryName', label: 'Category', width: 90 },
  { key: 'SKU', label: 'SKU', width: 90 },
  { key: 'ProductCode', label: 'Product Code', width: 90 },
  { key: 'MetalName', label: 'Metal', width: 70 },
  { key: 'PurityName', label: 'Purity', width: 60 },
  { key: 'Colour', label: 'Colour', width: 80 },
  { key: 'GrossWt', label: 'Gross Wt', width: 85 },
  { key: 'NetWt', label: 'Net Wt', width: 85 },
  { key: 'TotalDiamondWeight', label: 'Dia Wt', width: 75 },
  { key: 'TotalDiamondPieces', label: 'Dia Pcs', width: 75 },
  { key: 'MRP', label: 'MRP', width: 95 },
  { key: 'Status', label: 'Status', width: 80 },
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

const FeroniaIntegration = () => {
  const [clientCode, setClientCode] = useState('');
  const [allowed, setAllowed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [connectionError, setConnectionError] = useState('');
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [stockData, setStockData] = useState([]);
  const [stockError, setStockError] = useState('');
  const [searchStock, setSearchStock] = useState('');
  const [stockLoading, setStockLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushProgress, setPushProgress] = useState(0);
  const [pushResult, setPushResult] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateResult, setUpdateResult] = useState(null);

  useEffect(() => {
    const code = getClientCodeFromAuth();
    setClientCode(code);
    setAllowed(code === FERONIA_ALLOWED_CLIENT);
  }, []);

  const checkConnection = useCallback(async () => {
    setConnectionLoading(true);
    setConnectionStatus(null);
    setConnectionError('');
    try {
      const data = await getFeroniaTestService();
      setConnectionStatus(data?.status ? 'connected' : 'error');
    } catch (err) {
      setConnectionStatus('error');
      const baseMsg =
        err?.message ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'TestService request failed.';
      const debug = err?.debug ? ` [debug: ${JSON.stringify(err.debug)}]` : '';
      setConnectionError(`${baseMsg}${debug}`);
    } finally {
      setConnectionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) checkConnection();
  }, [allowed, checkConnection]);

  const loadStockOnHand = async () => {
    setStockLoading(true);
    setStockError('');
    setStockData([]);
    setPushResult(null);
    setUpdateResult(null);
    try {
      const data = await getFeroniaStockData();
      const rows = normalizeRows(data);
      if (Array.isArray(rows) && rows.length > 0) {
        setStockData(rows.map((row) => ({ ...row, Status: 'ApiActive' })));
      } else {
        setStockError('Invalid response or no rows received from Feronia API.');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to load stock';
      const debug = err?.debug ? ` [debug: ${JSON.stringify(err.debug)}]` : '';
      setStockError(typeof msg === 'string' ? `${msg}${debug}` : JSON.stringify(msg));
    } finally {
      setStockLoading(false);
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const deleteBody = deleteRes?.data;
      deleteOk = deleteBody?.success !== false;
      setPushProgress(20);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'DeleteAllStockForClient failed';
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

    const payloads = stockData.map((row) => mapFeroniaToLoyalstringPayload(row, clientCode));
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
        const hasError = data.errors?.length || (typeof data.message === 'string' && /error|failed|invalid|duplicate|not found/i.test(data.message));
        if (hasError) {
          errorCount += chunk.length;
          const msg = data.message || (data.errors && data.errors.map((e) => e.error || e.message).join('; ')) || 'Validation error';
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
      const progress = 20 + Math.round(pushedRatio * 80);
      setPushProgress(progress);
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
      .map((row) => mapFeroniaToUpdateExistingPayload(row, clientCode))
      .filter((row) => String(row.itemcode || '').trim() !== '');
    const skippedCount = stockData.length - payloads.length;
    const total = payloads.length;

    if (total === 0) {
      setUpdateLoading(false);
      setUpdateResult({
        success: false,
        message: skippedCount > 0
          ? `All ${stockData.length} rows are missing Item Code; nothing to send.`
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
        const hasError = data.errors?.length || (typeof data.message === 'string' && /error|failed|invalid|duplicate|not found/i.test(data.message));
        if (hasError) {
          errorCount += chunk.length;
          const msg = data.message || (data.errors && data.errors.map((e) => e.error || e.message).join('; ')) || 'Validation error';
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

  const filteredStock = searchStock.trim()
    ? stockData.filter((row) =>
        STOCK_COLUMNS.some((col) => {
          const value = row[col.key];
          return value != null && String(value).toLowerCase().includes(searchStock.trim().toLowerCase());
        })
      )
    : stockData;

  if (!allowed) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, Poppins, sans-serif' }}>
        <div style={{ maxWidth: 420, background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', padding: 32, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#d97706' }}>
            <FaLock size={28} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Access restricted</h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>
            Feronia Integration is available only for authorized clients.
          </p>
          {clientCode && (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              Your client code: <strong>{clientCode}</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ padding: '0 4px', fontFamily: 'Inter, Poppins, sans-serif', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}>
            <FaPlug size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
              Third Party Software Integration
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0 0' }}>
              Feronia API - getTAGIT_StockData - Stock on hand
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 28 }}>
          <Card icon={<HiChip size={28} />} title="API & Webhooks" description="Configure webhooks and API endpoints for real-time sync with your software." color="#7c3aed" />
          <Card icon={<HiDocumentText size={28} />} title="Documentation" description="Integration guides, sample requests and authentication for third-party apps." color="#6366f1" />
          <Card icon={<HiLightningBolt size={28} />} title="Quick connect" description="Pre-built connectors for common ERP and inventory systems." color="#9333ea" />
        </div>

        <section style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Feronia API - Stock Sync
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {connectionLoading ? (
                  <FaSpinner size={18} style={{ color: '#64748b', animation: 'spin 1s linear infinite' }} />
                ) : connectionStatus === 'connected' ? (
                  <FaCheckCircle size={18} style={{ color: '#16a34a' }} />
                ) : connectionStatus === 'error' ? (
                  <FaExclamationCircle size={18} style={{ color: '#dc2626' }} />
                ) : null}
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {connectionLoading ? 'Checking...' : connectionStatus === 'connected' ? 'Service connected' : connectionStatus === 'error' ? 'Connection failed' : '-'}
                </span>
              </div>
              <button
                type="button"
                onClick={checkConnection}
                disabled={connectionLoading}
                style={{ padding: '6px 12px', fontSize: 13, fontWeight: 500, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, cursor: connectionLoading ? 'not-allowed' : 'pointer' }}
              >
                Test connection
              </button>
              <button
                type="button"
                onClick={loadStockOnHand}
                disabled={stockLoading}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: stockLoading ? '#94a3b8' : '#7c3aed', border: 'none', borderRadius: 8, cursor: stockLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {stockLoading ? <FaSpinner size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FaSync size={14} />}
                Load stock on hand
              </button>
              <button
                type="button"
                onClick={pushToLoyalstring}
                disabled={stockLoading || pushLoading || stockData.length === 0}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: stockData.length === 0 || pushLoading ? '#94a3b8' : '#6366f1', border: 'none', borderRadius: 8, cursor: stockData.length === 0 || pushLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {pushLoading ? <FaSpinner size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FaCloudUploadAlt size={14} />}
                Push to Loyalstring Server
              </button>
              <button
                type="button"
                onClick={updateStocksDetails}
                disabled={stockLoading || updateLoading || stockData.length === 0}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: stockData.length === 0 || updateLoading ? '#94a3b8' : '#5b21b6', border: 'none', borderRadius: 8, cursor: stockData.length === 0 || updateLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {updateLoading ? <FaSpinner size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FaEdit size={14} />}
                Update stocks details
              </button>
            </div>
          </div>

          {connectionStatus === 'error' && (
            <div style={{ padding: 12, margin: 12, background: '#fffbeb', borderRadius: 8, border: '1px solid #fcd34d', fontSize: 13, color: '#92400e' }}>
              <strong>Connection failed?</strong> Current source: <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: 4 }}>{`${getFeroniaBaseUrl()}/TestService`}</code>. In HTTPS production, configure same-origin proxy path to your Feronia path.
              {connectionError && (
                <span style={{ display: 'block', marginTop: 6, color: '#b45309' }}>
                  {connectionError}
                </span>
              )}
              {!hasFeroniaAuthToken() && (
                <span style={{ display: 'block', marginTop: 6 }}>
                  Missing <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: 4 }}>REACT_APP_FERONIA_AUTH_TOKEN</code> in env.
                </span>
              )}
            </div>
          )}

          {pushLoading && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Pushing to Loyalstring...</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>{pushProgress}%</span>
              </div>
              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pushProgress}%`, background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: 4, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          {pushResult && !pushLoading && (
            <div style={{ padding: 16, margin: 12, background: pushResult.success ? '#f0fdf4' : '#fef2f2', borderRadius: 10, border: `1px solid ${pushResult.success ? '#86efac' : '#fecaca'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {pushResult.success ? <FaCheckCircle size={20} style={{ color: '#16a34a' }} /> : <FaExclamationCircle size={20} style={{ color: '#dc2626' }} />}
                <span style={{ fontWeight: 600, fontSize: 14, color: pushResult.success ? '#166534' : '#991b1b' }}>
                  {pushResult.success ? 'Push completed' : 'Push completed with errors'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: pushResult.success ? '#15803d' : '#b91c1c', margin: '0 0 8px 0' }}>
                {pushResult.total != null && <>Processed {pushResult.successCount} of {pushResult.total} items successfully.{pushResult.errorCount > 0 && ` ${pushResult.errorCount} failed.`}</>}
                {pushResult.message && !pushResult.total && pushResult.message}
              </p>
            </div>
          )}

          {updateLoading && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Updating stock details...</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>{updateProgress}%</span>
              </div>
              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${updateProgress}%`, background: 'linear-gradient(90deg, #7c3aed 0%, #5b21b6 100%)', borderRadius: 4, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          {updateResult && !updateLoading && (
            <div style={{ padding: 16, margin: 12, background: updateResult.success ? '#f0fdf4' : '#fef2f2', borderRadius: 10, border: `1px solid ${updateResult.success ? '#86efac' : '#fecaca'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {updateResult.success ? <FaCheckCircle size={20} style={{ color: '#16a34a' }} /> : <FaExclamationCircle size={20} style={{ color: '#dc2626' }} />}
                <span style={{ fontWeight: 600, fontSize: 14, color: updateResult.success ? '#166534' : '#991b1b' }}>
                  {updateResult.success ? 'Update completed' : 'Update completed with errors'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: updateResult.success ? '#15803d' : '#b91c1c', margin: '0 0 8px 0' }}>
                {updateResult.total != null && <>Processed {updateResult.successCount} of {updateResult.total} items successfully.{updateResult.errorCount > 0 && ` ${updateResult.errorCount} failed.`}{updateResult.skippedCount > 0 && ` ${updateResult.skippedCount} skipped (missing Item Code).`}</>}
                {updateResult.message && !updateResult.total && updateResult.message}
              </p>
            </div>
          )}

          {stockError && (
            <div style={{ padding: 12, margin: 12, background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
              {stockError}
            </div>
          )}

          {stockData.length > 0 && (
            <>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="text"
                  placeholder="Search in table..."
                  value={searchStock}
                  onChange={(e) => setSearchStock(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, width: 220, outline: 'none' }}
                />
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {filteredStock.length} of {stockData.length} items
                </span>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1200 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>#</th>
                      {STOCK_COLUMNS.map((col) => (
                        <th key={col.key} style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap', width: col.width }}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map((row, idx) => (
                      <tr key={`${row.RFIDCode || ''}${row.ItemCode || ''}${idx}`} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px', color: '#64748b' }}>{idx + 1}</td>
                        {STOCK_COLUMNS.map((col) => (
                          <td key={col.key} style={{ padding: '8px', color: '#1e293b', maxWidth: col.width, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row[col.key] != null ? String(row[col.key]) : ''}>
                            {row[col.key] != null && row[col.key] !== '' ? String(row[col.key]) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <div style={{ padding: 20, background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', borderRadius: 12, border: '1px solid #ddd6fe', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <FaInfoCircle size={20} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, color: '#5b21b6', marginBottom: 4 }}>Authorized client</div>
            <p style={{ fontSize: 13, color: '#5b21b6', margin: 0, lineHeight: 1.5 }}>
              You are viewing this page as client <strong>{clientCode}</strong>. Feronia API: <strong>TestService</strong> (connection), <strong>GetStockOnHand</strong> (stock sync).
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

const Card = ({ icon, title, description, color }) => (
  <div
    style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, transition: 'all 0.2s ease', cursor: 'default' }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`;
      e.currentTarget.style.borderColor = `${color}40`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.borderColor = '#e2e8f0';
    }}
  >
    <div style={{ width: 52, height: 52, borderRadius: 10, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
      {icon}
    </div>
    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: '0 0 8px 0' }}>{title}</h3>
    <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: 0 }}>{description}</p>
  </div>
);

export default FeroniaIntegration;
