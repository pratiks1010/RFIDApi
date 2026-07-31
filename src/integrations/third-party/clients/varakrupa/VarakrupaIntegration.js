import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  FaPlug,
  FaLock,
  FaInfoCircle,
  FaSync,
  FaSpinner,
  FaCheckCircle,
  FaExclamationCircle,
  FaCloudUploadAlt,
  FaEdit,
} from 'react-icons/fa';
import { HiChip, HiDocumentText, HiLightningBolt } from 'react-icons/hi';
import {
  getVarakrupaTestService,
  getVarakrupaStockData,
  getVarakrupaBaseUrl,
  hasVarakrupaCredentials,
  normalizeVarakrupaRows,
  syncVarakrupaUsersToLoyalstring,
} from './varakrupaService';

const VRAKRUPA_ALLOWED_CLIENT = 'LS000563';

const TEAL = '#0d9488';
const TEAL_DARK = '#0f766e';

const LOYALSTRING_SAVE_URL =
  'https://soni.loyalstring.co.in/api/ProductMaster/SaveRFIDTransactionDetails';
const LOYALSTRING_DELETE_ALL_URL =
  'https://soni.loyalstring.co.in/api/ProductMaster/DeleteAllStockForClient';
const UPDATE_EXISTING_API =
  'https://soni.loyalstring.co.in/api/ProductMaster/UpdateExistingProducts';

const PUSH_CHUNK_SIZE = 50;

const STOCK_COLUMNS = [
  { key: 'id', label: 'ID', width: 70 },
  { key: 'manufacturing_code', label: 'Item Code', width: 130 },
  { key: 'rfid', label: 'RFID Code', width: 120 },
  { key: 'product_type', label: 'Product Type', width: 120 },
  { key: 'category_name', label: 'Category', width: 160 },
  { key: 'collection_id', label: 'Collection ID', width: 110 },
  { key: 'gross_wt', label: 'Gross Wt', width: 100 },
  { key: 'net_wt', label: 'Net Wt', width: 100 },
  { key: 'image_name', label: 'Image', width: 180 },
  { key: 'Status', label: 'Status', width: 100 },
];

const getClientCodeFromAuth = () => {
  try {
    const stored = localStorage.getItem('userInfo');
    if (!stored) return '';
    const parsed = JSON.parse(stored);
    return (parsed.ClientCode || parsed.clientCode || parsed.clientcode || '')
      .trim()
      .toUpperCase();
  } catch {
    return '';
  }
};

const fmtWtApi = (value) => {
  if (value === '' || value == null) return '0.000';
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(3) : String(value);
};

const varakrupaRfidForApi = (row) => {
  const rfid = String(row?.rfid ?? '').trim();
  if (rfid) return rfid;

  return String(row?.manufacturing_code ?? row?.id ?? '').trim();
};

const mapVarakrupaToLoyalstringPayload = (row, clientCode) => {
  const rfidNumber = varakrupaRfidForApi(row);

  return {
    client_code: String(clientCode || ''),
    branch_id: '',
    counter_id: '',
    RFIDNumber: rfidNumber,

    Itemcode: String(row?.manufacturing_code ?? ''),
    itemcode: String(row?.manufacturing_code ?? ''),
    product_code: String(row?.product_code ?? row?.productCode ?? row?.manufacturing_code ?? ''),

    category_id: String(row?.product_type ?? ''),
    product_id: String(row?.category_name ?? ''),
    design_id: String(row?.manufacturing_code ?? ''),
    purity_id: '',

    description: String(row?.category_name ?? ''),
    vendor_id: '',
    box_details: String(row?.collection_id ?? ''),
    box: '',
    packet: '',

    grosswt: fmtWtApi(row?.gross_wt),
    stonewt: '0',
    diamondheight: '0',
    diamondweight: '0',
    diamondWeight: '0',
    netwt: fmtWtApi(row?.net_wt),

    size: 0,
    stoneamount: '0',
    diamondAmount: '0',
    HallmarkAmount: '0',
    MakingPerGram: '0',
    MakingPercentage: '0',
    MakingFixedAmt: '0',
    MRP: '0',

    imageurl: String(row?.image_name ?? ''),
    status: 'ApiActive',
    Stones: [],
    Diamonds: [],
  };
};

const mapVarakrupaToUpdateExistingPayload = (row, clientCode) => {
  const rfidNumber = varakrupaRfidForApi(row);

  return {
    client_code: String(clientCode || ''),
    RFIDNumber: rfidNumber,
    itemcode: String(row?.manufacturing_code ?? ''),

    branch_id: '',
    counter_id: '',

    category_id: String(row?.product_type ?? ''),
    product_id: String(row?.category_name ?? ''),
    design_id: String(row?.manufacturing_code ?? ''),
    purity_id: '',

    description: String(row?.category_name ?? ''),
    vendor_id: '',
    box: '',
    packet: '',

    grosswt: fmtWtApi(row?.gross_wt),
    netwt: fmtWtApi(row?.net_wt),
    stonewt: '0',
    stoneamount: '0',
    diamondAmount: '0',
    diamondWeight: '0',

    box_details: String(row?.collection_id ?? ''),
    MRP: '0',
    HallmarkAmount: '0',
    MakingPerGram: '0',
    MakingPercentage: '0',
    MakingFixedAmt: '0',

    imageurl: String(row?.image_name ?? ''),
    status: 'ApiActive',
  };
};

const Card = ({ icon, title, description, color }) => (
  <div
    style={{
      width: 278,
      height: 153,
      boxSizing: 'border-box',
      background: '#fff',
      borderRadius: 8,
      border: '1px solid #dfe7f1',
      padding: 20,
      transition: 'all 0.2s ease',
      cursor: 'default',
      overflow: 'hidden',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = `0 8px 24px ${color}18`;
      e.currentTarget.style.borderColor = `${color}40`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.borderColor = '#dfe7f1';
    }}
  >
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: 6,
        background: `${color}12`,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
      }}
    >
      {icon}
    </div>

    <h3
      style={{
        fontSize: 16,
        fontWeight: 700,
        color: '#0f172a',
        margin: '0 0 8px 0',
      }}
    >
      {title}
    </h3>

    <p
      style={{
        fontSize: 13,
        color: '#475569',
        lineHeight: 1.45,
        margin: 0,
      }}
    >
      {description}
    </p>
  </div>
);

const VarakrupaIntegration = () => {
  const [clientCode, setClientCode] = useState('');
  const [allowed, setAllowed] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState(null);
  const [connectionError, setConnectionError] = useState('');
  const [connectionLoading, setConnectionLoading] = useState(false);

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
    setAllowed(code === VRAKRUPA_ALLOWED_CLIENT);
  }, []);

  const checkConnection = useCallback(async () => {
    setConnectionLoading(true);
    setConnectionStatus(null);
    setConnectionError('');

    try {
      const result = await getVarakrupaTestService();

      if (result?.status) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
        setConnectionError(
          result?.message ||
            'Varakrupa API did not return a valid success response.'
        );
      }
    } catch (err) {
      setConnectionStatus('error');

      const msg =
        err?.response?.data?.msg ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Varakrupa connection failed.';

      const debug = err?.debug ? ` [debug: ${JSON.stringify(err.debug)}]` : '';

      setConnectionError(
        typeof msg === 'string' ? `${msg}${debug}` : JSON.stringify(msg)
      );
    } finally {
      setConnectionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) {
      checkConnection();
    }
  }, [allowed, checkConnection]);

  const loadStockOnHand = async () => {
    setStockLoading(true);
    setStockError('');
    setStockData([]);
    setPushResult(null);
    setUpdateResult(null);

    try {
      const data = await getVarakrupaStockData();
      const rows = normalizeVarakrupaRows(data);

      if (rows.length > 0) {
        const mappedRows = rows.map((row, index) => ({
          ...row,
          _rowKey: `${row?.id || ''}-${row?.manufacturing_code || ''}-${index}`,
          Status: 'ApiActive',
        }));

        setStockData(mappedRows);
      } else {
        setStockError(data?.msg || 'No stock rows received from Varakrupa API.');
      }
    } catch (err) {
      const msg =
        err?.response?.data?.msg ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to load Varakrupa stock data.';

      const debug = err?.debug ? ` [debug: ${JSON.stringify(err.debug)}]` : '';

      setStockError(
        typeof msg === 'string' ? `${msg}${debug}` : JSON.stringify(msg)
      );
    } finally {
      setStockLoading(false);
    }
  };

  const pushToLoyalstring = async () => {
    if (!stockData.length || !clientCode) {
      setPushResult({
        success: false,
        message: 'No data to push or client code missing.',
      });
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
        'DeleteAllStockForClient failed.';

      setPushLoading(false);
      setPushProgress(0);
      setPushResult({ success: false, message: msg });
      return;
    }

    if (!deleteOk) {
      setPushLoading(false);
      setPushProgress(0);
      setPushResult({
        success: false,
        message: 'DeleteAllStockForClient returned failure.',
      });
      return;
    }

    const payloads = stockData.map((row) =>
      mapVarakrupaToLoyalstringPayload(row, clientCode)
    );
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
          (typeof data.message === 'string' &&
            /error|failed|invalid|duplicate|not found/i.test(data.message));

        if (hasError) {
          errorCount += chunk.length;
          const msg =
            data.message ||
            (data.errors &&
              data.errors.map((e) => e.error || e.message).join('; ')) ||
            'Validation error';
          errors.push(`Batch ${chunkNum}: ${msg}`);
        } else {
          successCount += chunk.length;
        }
      } catch (err) {
        errorCount += chunk.length;
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Request failed.';
        errors.push(`Batch ${chunkNum}: ${msg}`);
      }

      const pushedRatio = (i + chunk.length) / total;
      setPushProgress(20 + Math.round(pushedRatio * 80));
    }

    // Background: after stock push, refresh LoyalString customers from Varakrupa UserData
    // DeleteAllCustomers → GetAllCustomer → AddBulkCustomer (fallback AddCustomer). Not shown in UI.
    try {
      await syncVarakrupaUsersToLoyalstring(clientCode, token);
    } catch (syncErr) {
      console.warn(
        '[Varakrupa] Background customer sync failed:',
        syncErr?.response?.data || syncErr?.message || syncErr
      );
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
      setUpdateResult({
        success: false,
        message: 'No data to update or client code missing.',
      });
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
      .map((row) => mapVarakrupaToUpdateExistingPayload(row, clientCode))
      .filter((row) => String(row.itemcode || row.RFIDNumber || '').trim() !== '');

    const skippedCount = stockData.length - payloads.length;
    const total = payloads.length;

    if (total === 0) {
      setUpdateLoading(false);
      setUpdateResult({
        success: false,
        message:
          skippedCount > 0
            ? `All ${stockData.length} rows are missing Item Code/RFID; nothing to send.`
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
          (typeof data.message === 'string' &&
            /error|failed|invalid|duplicate|not found/i.test(data.message));

        if (hasError) {
          errorCount += chunk.length;
          const msg =
            data.message ||
            (data.errors &&
              data.errors.map((e) => e.error || e.message).join('; ')) ||
            'Validation error';
          errors.push(`Batch ${chunkNum}: ${msg}`);
        } else {
          successCount += chunk.length;
        }
      } catch (err) {
        errorCount += chunk.length;
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Request failed.';
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
      STOCK_COLUMNS.some((col) => {
        const value = row[col.key];
        return value != null && String(value).toLowerCase().includes(q);
      })
    );
  }, [stockData, searchStock]);

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

          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: 8,
            }}
          >
            Access restricted
          </h2>

          <p
            style={{
              fontSize: 14,
              color: '#64748b',
              lineHeight: 1.5,
              marginBottom: 16,
            }}
          >
            Varakrupa Integration is available only for authorized clients.
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
      <style>{`
        @keyframes varakrupaSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        style={{
          padding: '0 0 10px',
          fontFamily: 'Inter, Poppins, sans-serif',
          maxWidth: '100%',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.28)',
            }}
          >
            <FaPlug size={18} />
          </div>

          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#1e293b',
                margin: 0,
              }}
            >
              Third Party Software Integration
            </h1>

            <p
              style={{
                fontSize: 14,
                color: '#64748b',
                margin: '4px 0 0 0',
              }}
            >
              Varakrupa API - Inventory Stock - Stock on hand
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 24,
          }}
        >
          <Card
            icon={<HiChip size={23} />}
            title="API & Webhooks"
            description="Configure webhooks and API endpoints for real-time sync."
            color={TEAL}
          />

          <Card
            icon={<HiDocumentText size={23} />}
            title="Documentation"
            description="Integration guides, sample requests and authentication."
            color="#6366f1"
          />

          <Card
            icon={<HiLightningBolt size={23} />}
            title="Quick connect"
            description="Pre-built connectors for ERP and inventory systems."
            color="#8b5cf6"
          />
        </div>

        <section
          style={{
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #dfe7f1',
            overflow: 'hidden',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #dfe7f1',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
              }}
            >
              Varakrupa API - Stock Sync
            </h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: '#475569',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginRight: 8,
                }}
              >
                {connectionLoading ? (
                  <FaSpinner
                    size={16}
                    style={{
                      color: '#64748b',
                      animation: 'varakrupaSpin 1s linear infinite',
                    }}
                  />
                ) : connectionStatus === 'connected' ? (
                  <FaCheckCircle size={16} style={{ color: '#16a34a' }} />
                ) : connectionStatus === 'error' ? (
                  <FaExclamationCircle size={16} style={{ color: '#dc2626' }} />
                ) : null}

                {connectionLoading
                  ? 'Checking...'
                  : connectionStatus === 'connected'
                    ? 'Service connected'
                    : connectionStatus === 'error'
                      ? 'Connection failed'
                      : '-'}
              </span>

              <button
                type="button"
                onClick={checkConnection}
                disabled={connectionLoading}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: TEAL_DARK,
                  background: '#ecfdf5',
                  border: '1px solid #99f6e4',
                  borderRadius: 6,
                  cursor: connectionLoading ? 'not-allowed' : 'pointer',
                  opacity: 1,
                }}
              >
                Test connection
              </button>

              <button
                type="button"
                onClick={loadStockOnHand}
                disabled={stockLoading}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background: stockLoading ? '#94a3b8' : TEAL,
                  border: 'none',
                  borderRadius: 6,
                  cursor: stockLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: 1,
                }}
              >
                {stockLoading ? (
                  <FaSpinner
                    size={14}
                    style={{ animation: 'varakrupaSpin 1s linear infinite' }}
                  />
                ) : (
                  <FaSync size={14} />
                )}
                Load stock on hand
              </button>

              <button
                type="button"
                onClick={pushToLoyalstring}
                disabled={stockLoading || pushLoading || stockData.length === 0}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background:
                    stockData.length === 0 || pushLoading ? '#94a3b8' : '#6366f1',
                  border: 'none',
                  borderRadius: 6,
                  cursor:
                    stockData.length === 0 || pushLoading
                      ? 'not-allowed'
                      : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: 1,
                }}
              >
                {pushLoading ? (
                  <FaSpinner
                    size={14}
                    style={{ animation: 'varakrupaSpin 1s linear infinite' }}
                  />
                ) : (
                  <FaCloudUploadAlt size={14} />
                )}
                Push to Loyalstring Server
              </button>

              <button
                type="button"
                onClick={updateStocksDetails}
                disabled={stockLoading || updateLoading || stockData.length === 0}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background:
                    stockData.length === 0 || updateLoading
                      ? '#94a3b8'
                      : TEAL_DARK,
                  border: 'none',
                  borderRadius: 6,
                  cursor:
                    stockData.length === 0 || updateLoading
                      ? 'not-allowed'
                      : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: 1,
                }}
              >
                {updateLoading ? (
                  <FaSpinner
                    size={14}
                    style={{ animation: 'varakrupaSpin 1s linear infinite' }}
                  />
                ) : (
                  <FaEdit size={14} />
                )}
                Update stocks details
              </button>
            </div>
          </div>

          {connectionStatus === 'error' && (
            <div
              style={{
                padding: 12,
                margin: 12,
                background: '#fffbeb',
                borderRadius: 8,
                border: '1px solid #fcd34d',
                fontSize: 13,
                color: '#92400e',
              }}
            >
              <strong>Connection failed?</strong> Current source:{' '}
              <code
                style={{
                  background: '#fef3c7',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                {getVarakrupaBaseUrl()}
              </code>

              {connectionError && (
                <span
                  style={{
                    display: 'block',
                    marginTop: 6,
                    color: '#b45309',
                  }}
                >
                  {connectionError}
                </span>
              )}

              {!hasVarakrupaCredentials() && (
                <span style={{ display: 'block', marginTop: 6 }}>
                  Missing Varakrupa username/password configuration.
                </span>
              )}
            </div>
          )}

          {pushLoading && (
            <ProgressBlock
              label="Pushing to Loyalstring..."
              progress={pushProgress}
              gradient="linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)"
            />
          )}

          {pushResult && !pushLoading && (
            <ResultBlock
              result={pushResult}
              successTitle="Push completed"
              errorTitle="Push completed with errors"
            />
          )}

          {updateLoading && (
            <ProgressBlock
              label="Updating stock details..."
              progress={updateProgress}
              gradient={`linear-gradient(90deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`}
            />
          )}

          {updateResult && !updateLoading && (
            <ResultBlock
              result={updateResult}
              successTitle="Update completed"
              errorTitle="Update completed with errors"
            />
          )}

          {stockError && (
            <div
              style={{
                padding: 12,
                margin: 12,
                background: '#fef2f2',
                borderRadius: 8,
                fontSize: 13,
                color: '#dc2626',
              }}
            >
              {stockError}
            </div>
          )}

          {stockData.length > 0 && (
            <>
              <div
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid #dfe7f1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#fff',
                  flexWrap: 'wrap',
                }}
              >
                <input
                  type="text"
                  placeholder="Search in table..."
                  value={searchStock}
                  onChange={(e) => setSearchStock(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    border: '1px solid #dfe7f1',
                    borderRadius: 5,
                    width: 184,
                    height: 32,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                <span style={{ fontSize: 13, color: '#475569' }}>
                  {filteredStock.length} of {stockData.length} items
                </span>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 12,
                    minWidth: 1120,
                  }}
                >
                  <thead
                    style={{
                      position: 'sticky',
                      top: 0,
                      background: '#f1f5f9',
                      zIndex: 1,
                    }}
                  >
                    <tr>
                      <th
                        style={{
                          padding: '9px 8px',
                          textAlign: 'left',
                          fontWeight: 700,
                          color: '#475569',
                          borderBottom: '1px solid #dfe7f1',
                          width: 42,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        #
                      </th>

                      {STOCK_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          style={{
                            padding: '9px 8px',
                            textAlign: 'left',
                            fontWeight: 700,
                            color: '#475569',
                            borderBottom: '1px solid #dfe7f1',
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
                    {filteredStock.length === 0 ? (
                      <tr>
                        <td
                          colSpan={1 + STOCK_COLUMNS.length}
                          style={{
                            padding: 24,
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: 14,
                          }}
                        >
                          No rows match your search.
                        </td>
                      </tr>
                    ) : (
                      filteredStock.map((row, idx) => (
                        <tr
                          key={row._rowKey || `${row.id || ''}-${idx}`}
                          style={{
                            background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            borderBottom: '1px solid #dfe7f1',
                          }}
                        >
                          <td
                            style={{
                              padding: '7px 8px',
                              color: '#64748b',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {idx + 1}
                          </td>

                          {STOCK_COLUMNS.map((col) => {
                            const value = row[col.key];

                            if (col.key === 'image_name') {
                              return (
                                <td
                                  key={col.key}
                                  style={{
                                    padding: '7px 8px',
                                    color: '#0f172a',
                                    maxWidth: col.width,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={value ? String(value) : ''}
                                >
                                  {value ? (
                                    <a
                                      href={String(value)}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        color: TEAL_DARK,
                                        fontWeight: 600,
                                      }}
                                    >
                                      View Image
                                    </a>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                              );
                            }

                            return (
                              <td
                                key={col.key}
                                style={{
                                  padding: '7px 8px',
                                  color: '#0f172a',
                                  maxWidth: col.width,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={value != null ? String(value) : ''}
                              >
                                {value != null && value !== '' ? String(value) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <div
          style={{
            padding: 18,
            background: 'linear-gradient(135deg, #dffcf7 0%, #ccfbf1 100%)',
            borderRadius: 8,
            border: '1px solid #8fe9da',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <FaInfoCircle
            size={20}
            style={{ color: TEAL, flexShrink: 0, marginTop: 2 }}
          />

          <div>
            <div
              style={{
                fontWeight: 700,
                color: '#115e59',
                marginBottom: 5,
                fontSize: 14,
              }}
            >
              Authorized client
            </div>

            <p
              style={{
                fontSize: 13,
                color: '#064e3b',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              You are viewing this page as client <strong>{clientCode}</strong>.
              Varakrupa API: <strong>Inventory_stock</strong>. Username/password
              are handled through <strong>varakrupaService.js</strong>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

const ProgressBlock = ({ label, progress, gradient }) => (
  <div
    style={{
      padding: '16px 20px',
      borderBottom: '1px solid #e2e8f0',
      background: '#f8fafc',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: '#64748b' }}>{progress}%</span>
    </div>

    <div
      style={{
        height: 8,
        background: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: gradient,
          borderRadius: 4,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  </div>
);

const ResultBlock = ({ result, successTitle, errorTitle }) => (
  <div
    style={{
      padding: 16,
      margin: 12,
      background: result.success ? '#f0fdf4' : '#fef2f2',
      borderRadius: 10,
      border: `1px solid ${result.success ? '#86efac' : '#fecaca'}`,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
      }}
    >
      {result.success ? (
        <FaCheckCircle size={20} style={{ color: '#16a34a' }} />
      ) : (
        <FaExclamationCircle size={20} style={{ color: '#dc2626' }} />
      )}

      <span
        style={{
          fontWeight: 600,
          fontSize: 14,
          color: result.success ? '#166534' : '#991b1b',
        }}
      >
        {result.success ? successTitle : errorTitle}
      </span>
    </div>

    <p
      style={{
        fontSize: 13,
        color: result.success ? '#15803d' : '#b91c1c',
        margin: '0 0 8px 0',
      }}
    >
      {result.total != null && (
        <>
          Processed {result.successCount} of {result.total} items successfully.
          {result.errorCount > 0 && ` ${result.errorCount} failed.`}
          {result.skippedCount > 0 && ` ${result.skippedCount} skipped.`}
        </>
      )}
      {result.message && !result.total && result.message}
    </p>

    {result.errors && (
      <details style={{ marginTop: 8 }}>
        <summary style={{ fontSize: 12, cursor: 'pointer', color: '#64748b' }}>
          View errors
        </summary>
        <ul
          style={{
            margin: '8px 0 0 0',
            paddingLeft: 20,
            fontSize: 12,
            color: '#991b1b',
            maxHeight: 120,
            overflowY: 'auto',
          }}
        >
          {result.errors.slice(0, 10).map((e, i) => (
            <li key={i}>{e}</li>
          ))}
          {result.errors.length > 10 && (
            <li>... and {result.errors.length - 10} more</li>
          )}
        </ul>
      </details>
    )}
  </div>
);

export default VarakrupaIntegration;