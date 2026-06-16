import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaBox,
  FaCheckCircle,
  FaExclamationTriangle,
  FaQrcode,
  FaTag,
  FaTimesCircle,
} from 'react-icons/fa';
import GridItemImage from '../common/GridItemImage';
import { getItemImageLookupKeys } from '../../services/localItemImageService';
import { formatWeight3 } from '../../utils/weightFormat';

const SESSION_KEY = 'boxRfidTrayScanResult';

const pick = (row, ...keys) => {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
};

const tagTypeLabel = (type) => {
  const t = String(type || '').trim();
  if (t === 'ReusableBox') return 'Box';
  if (t === 'SingleUseProduct') return 'Product';
  if (t === 'Unknown') return 'Unknown';
  return t || '—';
};

const tagTypeStyle = (type) => {
  const t = String(type || '');
  if (t === 'ReusableBox') return { bg: '#ecfdf5', border: '#6ee7b7', color: '#047857' };
  if (t === 'SingleUseProduct') return { bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8' };
  if (t === 'Unknown') return { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' };
  return { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' };
};

const SummaryTile = ({ label, value, accent }) => (
  <div
    style={{
      padding: '12px 14px',
      background: accent ? 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)' : '#f8fafc',
      borderRadius: 10,
      border: accent ? 'none' : '1px solid #e2e8f0',
      color: accent ? '#fff' : undefined,
    }}
  >
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        color: accent ? 'rgba(255,255,255,0.85)' : '#94a3b8',
        textTransform: 'uppercase',
        marginBottom: 4,
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: accent ? 18 : 15, fontWeight: 800, color: accent ? '#fff' : '#0f172a' }}>
      {value}
    </div>
  </div>
);

const BoxTrayScanResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  const scanResult = useMemo(() => {
    if (location.state?.scanResult) return location.state.scanResult;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [location.state]);

  useEffect(() => {
    if (location.state?.scanResult) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(location.state.scanResult));
      } catch {
        /* ignore quota */
      }
    }
  }, [location.state]);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isSmallScreen = windowWidth <= 768;

  const box = scanResult?.box || scanResult?.Box || {};
  const summary = scanResult?.summary || scanResult?.Summary || {};
  const validation = scanResult?.validation || scanResult?.Validation || {};
  const productsInBox = Array.isArray(scanResult?.productsInBox)
    ? scanResult.productsInBox
    : Array.isArray(scanResult?.ProductsInBox)
      ? scanResult.ProductsInBox
      : [];
  const trayScannedProducts = Array.isArray(scanResult?.trayScannedProducts)
    ? scanResult.trayScannedProducts
    : Array.isArray(scanResult?.TrayScannedProducts)
      ? scanResult.TrayScannedProducts
      : [];
  const resolvedTags = Array.isArray(scanResult?.resolvedTags)
    ? scanResult.resolvedTags
    : Array.isArray(scanResult?.ResolvedTags)
      ? scanResult.ResolvedTags
      : [];
  const scannedEpcs = Array.isArray(scanResult?.scannedEpcs)
    ? scanResult.scannedEpcs
    : Array.isArray(scanResult?.ScannedEpcs)
      ? scanResult.ScannedEpcs
      : [];

  const boxName = pick(box, 'boxName', 'BoxName') || 'Box';
  const scanStatus = pick(scanResult, 'scanStatus', 'ScanStatus') || '—';
  const isMatch = String(scanStatus).toLowerCase() === 'match' || scanResult?.success !== false;
  const missingItems = validation.missingItems || validation.MissingItems || [];
  const matchedCount = validation.matchedCount ?? validation.MatchedCount;
  const expectedCount = validation.expectedCount ?? validation.ExpectedCount;
  const missingCount = validation.missingCount ?? validation.MissingCount;

  if (!scanResult) {
    return (
      <div style={{ padding: 48, textAlign: 'center', fontFamily: 'var(--font-family)' }}>
        <FaExclamationTriangle style={{ fontSize: 32, color: '#f59e0b', marginBottom: 12 }} />
        <h2 style={{ margin: '0 0 8px', fontSize: 16, color: '#0f172a' }}>No scan data</h2>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
          Scan a tray from Box RFID Pack to view results here.
        </p>
        <button
          type="button"
          onClick={() => navigate('/box-rfid')}
          style={{
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 8,
            border: '1px solid #991b1b',
            background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Go to Box RFID Pack
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 12,
        fontSize: 11,
        background: '#f8fafc',
        fontFamily: 'var(--font-family)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          marginBottom: 12,
          boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 3, background: 'linear-gradient(90deg, #b91c1c 0%, #dc2626 50%, #991b1b 100%)' }} />
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => navigate('/box-rfid')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                <FaArrowLeft style={{ fontSize: 12 }} /> Box RFID Pack
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <FaQrcode style={{ fontSize: 16 }} />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                    Tray Scan Result
                  </h1>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>
                    {scannedEpcs.length} EPC(s) scanned · {formatDateTime(scanResult.scannedOn || scanResult.ScannedOn)}
                  </p>
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: 999,
                background: isMatch ? '#ecfdf5' : '#fffbeb',
                border: `1px solid ${isMatch ? '#6ee7b7' : '#fcd34d'}`,
                color: isMatch ? '#047857' : '#b45309',
              }}
            >
              {scanStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Status banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '12px 14px',
          marginBottom: 12,
          borderRadius: 12,
          background: isMatch ? '#ecfdf5' : '#fffbeb',
          border: `1px solid ${isMatch ? '#6ee7b7' : '#fcd34d'}`,
        }}
      >
        {isMatch ? (
          <FaCheckCircle style={{ color: '#047857', marginTop: 2, flexShrink: 0, fontSize: 16 }} />
        ) : (
          <FaExclamationTriangle style={{ color: '#b45309', marginTop: 2, flexShrink: 0, fontSize: 16 }} />
        )}
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: isMatch ? '#047857' : '#b45309' }}>
            {scanResult.message || scanResult.Message || (isMatch ? 'Box scan complete.' : 'Scan completed with issues.')}
          </div>
          {expectedCount != null ? (
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
              Matched <strong>{matchedCount ?? '—'}</strong> of <strong>{expectedCount}</strong> expected product tag(s)
              {missingCount > 0 ? ` · ${missingCount} missing` : ''}
            </div>
          ) : null}
        </div>
      </div>

      {/* Box card */}
      {pick(box, 'boxId', 'BoxId') || boxName !== 'Box' ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            boxShadow: '0 2px 12px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <FaBox style={{ fontSize: 22 }} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{boxName}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 10, color: '#64748b' }}>
                {pick(box, 'rfidCode', 'RfidCode', 'RFIDCode') ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <FaTag style={{ color: '#0f766e' }} />
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#0f172a' }}>
                      {pick(box, 'rfidCode', 'RfidCode', 'RFIDCode')}
                    </span>
                  </span>
                ) : null}
                {pick(box, 'hexCode', 'HexCode') ? (
                  <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                    EPC: {pick(box, 'hexCode', 'HexCode')}
                  </span>
                ) : null}
                {pick(box, 'emptyWeight', 'EmptyWeight') ? (
                  <span>Empty wt: {formatWeight3(pick(box, 'emptyWeight', 'EmptyWeight'))}g</span>
                ) : null}
                {pick(box, 'lastPackedOn', 'LastPackedOn') ? (
                  <span>Last packed: {formatDateTime(pick(box, 'lastPackedOn', 'LastPackedOn'))}</span>
                ) : null}
              </div>
            </div>
            {box.isRfidTagged ?? box.IsRfidTagged ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#047857',
                  background: '#ecfdf5',
                  border: '1px solid #6ee7b7',
                  borderRadius: 999,
                  padding: '3px 10px',
                }}
              >
                <FaCheckCircle /> RFID tagged
              </span>
            ) : null}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isSmallScreen ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
              gap: 8,
            }}
          >
            <SummaryTile label="Products in box" value={summary.totalProducts ?? productsInBox.length} accent />
            <SummaryTile
              label="Gross wt"
              value={summary.totalGrossWt != null ? `${formatWeight3(summary.totalGrossWt)}g` : '—'}
            />
            <SummaryTile
              label="Net wt"
              value={summary.totalNetWt != null ? `${formatWeight3(summary.totalNetWt)}g` : '—'}
            />
            <SummaryTile
              label="Grand total"
              value={summary.grandTotalWeight != null ? `${formatWeight3(summary.grandTotalWeight)}g` : '—'}
            />
            <SummaryTile label="Tray tags read" value={scannedEpcs.length} />
          </div>
        </div>
      ) : null}

      {/* Missing items warning */}
      {missingItems.length > 0 ? (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#b91c1c', marginBottom: 8 }}>
            MISSING ON TRAY ({missingItems.length})
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#7f1d1d' }}>
            {missingItems.map((item, i) => (
              <li key={i}>
                <strong>{pick(item, 'itemCode', 'ItemCode')}</strong>
                {pick(item, 'reason', 'Reason') ? ` — ${pick(item, 'reason', 'Reason')}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Products in box — table + cards on mobile */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#64748b',
            marginBottom: 8,
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>PRODUCTS IN BOX</span>
          <span style={{ fontWeight: 600, fontSize: 10 }}>
            {productsInBox.filter((p) => p.scanMatched || p.ScanMatched).length} / {productsInBox.length} scanned
          </span>
        </div>

        {productsInBox.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: '#64748b',
              border: '1px dashed #e2e8f0',
              borderRadius: 12,
              background: '#fff',
            }}
          >
            No products found in box.
          </div>
        ) : isSmallScreen ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {productsInBox.map((product, idx) => {
              const itemCode = pick(product, 'itemCode', 'ItemCode');
              const matched = Boolean(product.scanMatched ?? product.ScanMatched);
              const lookupKeys = getItemImageLookupKeys(product);
              return (
                <div
                  key={`${itemCode}-${idx}`}
                  style={{
                    border: `1px solid ${matched ? '#6ee7b7' : '#fecaca'}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: matched ? '#f0fdf4' : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, padding: 10 }}>
                    <GridItemImage
                      lookupKeys={lookupKeys}
                      alt={itemCode}
                      wrapperStyle={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: '#f8fafc',
                      }}
                      imgStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontFamily: 'ui-monospace, monospace' }}>{itemCode}</span>
                        {matched ? (
                          <FaCheckCircle style={{ color: '#047857', fontSize: 12 }} />
                        ) : (
                          <FaTimesCircle style={{ color: '#dc2626', fontSize: 12 }} />
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: '#475569' }}>
                        {pick(product, 'productTitle', 'ProductTitle', 'productName') || '—'}
                      </div>
                      <div style={{ fontSize: 10, marginTop: 4, color: '#64748b' }}>
                        Gr {formatWeight3(pick(product, 'grossWt', 'GrossWt'))}g · Net{' '}
                        {formatWeight3(pick(product, 'netWt', 'NetWt'))}g
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f4f4f5' }}>
                  {['', 'Item code', 'Product', 'RFID', 'EPC', 'Gross', 'Net', 'Scan', 'Added'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 10px',
                        textAlign: h === 'Gross' || h === 'Net' ? 'right' : 'left',
                        fontWeight: 700,
                        borderBottom: '2px solid #d4d4d8',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productsInBox.map((product, idx) => {
                  const itemCode = pick(product, 'itemCode', 'ItemCode');
                  const matched = Boolean(product.scanMatched ?? product.ScanMatched);
                  const lookupKeys = getItemImageLookupKeys(product);
                  return (
                    <tr
                      key={`${itemCode}-${idx}`}
                      style={{ background: matched ? '#f0fdf4' : idx % 2 === 0 ? '#fff' : '#fafafa' }}
                    >
                      <td style={{ padding: '6px 10px', width: 48 }}>
                        <GridItemImage
                          lookupKeys={lookupKeys}
                          alt={itemCode}
                          wrapperStyle={{
                            width: 36,
                            height: 36,
                            borderRadius: 6,
                            overflow: 'hidden',
                            background: '#f8fafc',
                          }}
                          imgStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: 800, fontFamily: 'ui-monospace, monospace' }}>
                        {itemCode || '—'}
                      </td>
                      <td style={{ padding: '6px 10px', maxWidth: 160 }}>
                        {pick(product, 'productTitle', 'ProductTitle', 'productName') || '—'}
                      </td>
                      <td style={{ padding: '6px 10px', fontFamily: 'ui-monospace, monospace' }}>
                        {pick(product, 'rfidCode', 'RfidCode', 'RFIDCode') || '—'}
                      </td>
                      <td style={{ padding: '6px 10px', fontFamily: 'ui-monospace, monospace', fontSize: 10 }}>
                        {pick(product, 'hexCode', 'HexCode') || '—'}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {formatWeight3(pick(product, 'grossWt', 'GrossWt'))}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {formatWeight3(pick(product, 'netWt', 'NetWt'))}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        {matched ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#047857',
                              background: '#ecfdf5',
                              border: '1px solid #6ee7b7',
                              borderRadius: 999,
                              padding: '2px 8px',
                            }}
                          >
                            <FaCheckCircle /> Matched
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#b91c1c',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: 999,
                              padding: '2px 8px',
                            }}
                          >
                            <FaTimesCircle /> Missing
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#64748b', fontSize: 10 }}>
                        {formatDateTime(pick(product, 'addedToBoxOn', 'AddedToBoxOn'))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolved tags */}
      {resolvedTags.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 8, letterSpacing: '0.04em' }}>
            RESOLVED TAGS ({resolvedTags.length})
          </div>
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              overflow: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#f4f4f5' }}>
                  {['Scanned EPC', 'RFID code', 'Type', 'Match'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        fontWeight: 700,
                        borderBottom: '2px solid #d4d4d8',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resolvedTags.map((tag, idx) => {
                  const type = pick(tag, 'tagType', 'TagType');
                  const style = tagTypeStyle(type);
                  return (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '6px 10px', fontFamily: 'ui-monospace, monospace', fontSize: 10 }}>
                        {pick(tag, 'scannedEpc', 'ScannedEpc', 'tidValue', 'TidValue')}
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>
                        {pick(tag, 'rfidBarcode', 'RfidBarcode', 'rfidCode', 'RfidCode') || '—'}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: style.bg,
                            border: `1px solid ${style.border}`,
                            color: style.color,
                          }}
                        >
                          {tagTypeLabel(type)}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', fontSize: 10, color: '#64748b' }}>
                        {pick(tag, 'matchedBoxName', 'MatchedBoxName')
                          ? `Box: ${pick(tag, 'matchedBoxName', 'MatchedBoxName')}`
                          : pick(tag, 'matchedItemCode', 'MatchedItemCode')
                            ? `Item: ${pick(tag, 'matchedItemCode', 'MatchedItemCode')}`
                            : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Tray scanned products summary */}
      {trayScannedProducts.length > 0 ? (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 8, letterSpacing: '0.04em' }}>
            TRAY SCANNED PRODUCTS ({trayScannedProducts.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {trayScannedProducts.map((p, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 11,
                }}
              >
                <span style={{ fontWeight: 800, fontFamily: 'ui-monospace, monospace' }}>
                  {pick(p, 'itemCode', 'ItemCode')}
                </span>
                {pick(p, 'productTitle', 'ProductTitle') ? (
                  <span style={{ color: '#64748b', marginLeft: 6 }}>{pick(p, 'productTitle', 'ProductTitle')}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BoxTrayScanResultPage;
export { SESSION_KEY as BOX_TRAY_SCAN_SESSION_KEY };
