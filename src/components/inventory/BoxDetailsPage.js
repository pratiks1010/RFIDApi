import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaBox,
  FaCalendarAlt,
  FaCheckCircle,
  FaCube,
  FaGem,
  FaShoppingBag,
  FaSpinner,
  FaSync,
  FaTag,
  FaWeightHanging,
} from 'react-icons/fa';
import { GiWeight } from 'react-icons/gi';
import GridItemImage from '../common/GridItemImage';
import { useNotifications } from '../../context/NotificationContext';
import { getBoxDetails } from '../../services/boxRfidApi';
import { getItemImageLookupKeys } from '../../services/localItemImageService';
import { formatWeight3 } from '../../utils/weightFormat';

const getClientCode = () => {
  try {
    const u = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return u.ClientCode || u.clientCode || u.clientcode || '';
  } catch {
    return '';
  }
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
};

const fmtWt = (value) => {
  if (value === undefined || value === null || value === '') return '—';
  return `${formatWeight3(value)}g`;
};

const MetricCard = ({ icon: Icon, iconBg, iconColor, label, value }) => (
  <div
    style={{
      background: '#ffffff',
      border: '1px solid #e8ecf1',
      borderRadius: 10,
      padding: '12px 14px',
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
      minWidth: 0,
    }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: iconBg,
        color: iconColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        marginBottom: 10,
      }}
    >
      <Icon />
    </div>
    <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
  </div>
);

const MetaCell = ({ label, value }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{value}</div>
  </div>
);

const SpecCell = ({ label, value }) => (
  <div style={{ fontSize: 11, color: '#64748b' }}>
    <span style={{ color: '#94a3b8' }}>{label}: </span>
    <strong style={{ color: '#1e293b', fontWeight: 700 }}>{value}</strong>
  </div>
);

const BoxDetailsPage = () => {
  const { boxId } = useParams();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const clientCode = getClientCode();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  const isSmallScreen = windowWidth <= 768;
  const isMedium = windowWidth <= 1100;

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchDetails = useCallback(async () => {
    if (!clientCode || !boxId) return;
    setLoading(true);
    try {
      const res = await getBoxDetails({ ClientCode: clientCode, BoxId: Number(boxId) });
      if (res?.success === false) {
        addNotification({
          type: 'error',
          title: 'Box details',
          message: res?.message || 'Box not found.',
        });
        setData(null);
        return;
      }
      setData(res);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Box details',
        message: err?.response?.data?.message || err?.response?.data?.Message || err?.message || 'Could not load box details.',
      });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [clientCode, boxId, addNotification]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const box = data?.box || {};
  const summary = data?.summary || {};
  const products = Array.isArray(data?.products) ? data.products : [];
  const productCount = summary.totalProducts ?? products.length;
  const boxName = box.boxName || 'Box';
  const gridCols = isSmallScreen
    ? '1fr'
    : isMedium
      ? 'repeat(2, minmax(0, 1fr))'
      : 'repeat(3, minmax(0, 1fr))';

  const metricCols = isSmallScreen ? 'repeat(2, 1fr)' : isMedium ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)';
  const metaCols = isSmallScreen ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: isSmallScreen ? 10 : 16,
        fontSize: 11,
        background: '#f4f6f9',
        fontFamily: 'var(--font-family)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e8ecf1',
          padding: '12px 16px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button
            type="button"
            onClick={() => navigate('/box-rfid/box-list')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#475569',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <FaArrowLeft style={{ fontSize: 11 }} /> Back to Box List
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <FaBox style={{ fontSize: 17 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: isSmallScreen ? '1rem' : '1.15rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '0.02em',
                }}
              >
                {boxName}
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: '#64748b' }}>
                Box #{box.boxId ?? boxId} · {productCount} product{productCount !== 1 ? 's' : ''}
                {box.emptyWeight !== '' && box.emptyWeight != null ? ` · Empty ${fmtWt(box.emptyWeight)}` : ''}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchDetails}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#fff',
            color: '#475569',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <FaSync style={{ fontSize: 11 }} /> Refresh
        </button>
      </div>

      {loading && !data ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
          <FaSpinner style={{ animation: 'boxDetailSpin 0.9s linear infinite', fontSize: 24 }} />
          <div style={{ marginTop: 12 }}>Loading box details…</div>
        </div>
      ) : (
        <>
          {/* Summary card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e8ecf1',
              borderRadius: 12,
              padding: isSmallScreen ? 12 : 16,
              marginBottom: 14,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
              {box.isRfidTagged ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#047857',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 999,
                    padding: '4px 12px',
                  }}
                >
                  <FaCheckCircle style={{ fontSize: 11 }} /> RFID Tagged
                </span>
              ) : null}
              {box.rfidCode ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#475569',
                  }}
                >
                  <FaTag style={{ color: '#3b82f6', fontSize: 11 }} />
                  <span style={{ fontFamily: 'ui-monospace, monospace' }}>{box.rfidCode}</span>
                </span>
              ) : null}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: metricCols,
                gap: 10,
                marginBottom: 16,
              }}
            >
              <MetricCard
                icon={FaBox}
                iconBg="#dbeafe"
                iconColor="#2563eb"
                label="Products"
                value={productCount}
              />
              <MetricCard
                icon={FaCube}
                iconBg="#ede9fe"
                iconColor="#7c3aed"
                label="Pieces"
                value={summary.totalPieces ?? '—'}
              />
              <MetricCard
                icon={FaWeightHanging}
                iconBg="#dbeafe"
                iconColor="#2563eb"
                label="Gross Weight"
                value={fmtWt(summary.totalGrossWt)}
              />
              <MetricCard
                icon={GiWeight}
                iconBg="#dcfce7"
                iconColor="#16a34a"
                label="Net Weight"
                value={fmtWt(summary.totalNetWt)}
              />
              <MetricCard
                icon={FaShoppingBag}
                iconBg="#ffedd5"
                iconColor="#ea580c"
                label="Grand Total"
                value={fmtWt(summary.grandTotalWeight)}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: metaCols,
                gap: 12,
                paddingTop: 14,
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <MetaCell label="Empty Weight" value={fmtWt(summary.boxEmptyWeight ?? box.emptyWeight)} />
              <MetaCell label="Tagged" value={formatDateTime(box.taggedOn)} />
              <MetaCell label="Last Packed" value={formatDateTime(box.lastPackedOn)} />
              <MetaCell label="Last Scanned" value={formatDateTime(box.lastScannedOn)} />
            </div>
          </div>

          {/* Products section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <FaBox style={{ color: '#3b82f6', fontSize: 13 }} />
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
              Products in Box ({products.length})
            </h2>
          </div>

          {products.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: '#64748b',
                border: '1px dashed #e2e8f0',
                borderRadius: 12,
                background: '#ffffff',
              }}
            >
              No products in this box.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 12 }}>
              {products.map((product, idx) => {
                const lookupKeys = getItemImageLookupKeys(product);
                const subtitle =
                  product.productTitle ||
                  [product.categoryName, product.productName].filter(Boolean).join(' ') ||
                  'Gold Ornament';
                return (
                  <div
                    key={product.labelledStockId || `${product.itemCode}-${idx}`}
                    style={{
                      border: '1px solid #e8ecf1',
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: '#fff',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <GridItemImage
                      lookupKeys={lookupKeys}
                      alt={product.itemCode || 'Product'}
                      wrapperStyle={{
                        height: 100,
                        background: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      imgStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      placeholder={(
                        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                          <FaGem style={{ fontSize: 22, opacity: 0.35, marginBottom: 4 }} />
                          <div style={{ fontSize: 10 }}>No image</div>
                        </div>
                      )}
                    />
                    <div style={{ padding: '12px 14px', flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginBottom: 10,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: '#0f172a',
                              fontFamily: 'ui-monospace, monospace',
                              lineHeight: 1.2,
                            }}
                          >
                            {product.itemCode || '—'}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: '#64748b',
                              marginTop: 2,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {subtitle}
                          </div>
                        </div>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            background: '#ecfdf5',
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FaCube style={{ fontSize: 12 }} />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px 12px',
                        }}
                      >
                        <SpecCell label="Gross" value={fmtWt(product.grossWt)} />
                        <SpecCell label="Net" value={fmtWt(product.netWt)} />
                        <SpecCell label="Pcs" value={product.pieces || '1'} />
                        <SpecCell label="Purity" value={product.purityName || '—'} />
                        <SpecCell label="MRP" value={product.mrp || '0'} />
                        {product.sku ? <SpecCell label="SKU" value={product.sku} /> : <SpecCell label=" " value=" " />}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '8px 14px',
                        background: '#f8fafc',
                        borderTop: '1px solid #f1f5f9',
                        fontSize: 10,
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <FaCalendarAlt style={{ fontSize: 10, color: '#94a3b8' }} />
                      <span>
                        Added: {formatDateTime(product.addedToBoxOn)}
                        {product.addedBy ? ` · ${product.addedBy}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes boxDetailSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BoxDetailsPage;
