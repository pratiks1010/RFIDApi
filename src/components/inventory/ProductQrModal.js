import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  FaTimes,
  FaCopy,
  FaCheck,
  FaExternalLinkAlt,
  FaDownload,
  FaPrint,
  FaGem,
  FaBolt,
  FaDatabase,
  FaShieldAlt,
} from 'react-icons/fa';
import { encodeProductForUrl, getPublicScannerBaseUrl } from '../../services/productScanApi';

// Proper Sparkle Jewellers Diamond Logo SVG (sharp vector with luxury gold gradient)
const SPARKLE_DIAMOND_LOGO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="2" y="2" width="96" height="96" rx="20" fill="#ffffff" stroke="#c99c42" stroke-width="4"/>
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#faecc5"/>
      <stop offset="50%" stop-color="#c99c42"/>
      <stop offset="100%" stop-color="#8c6418"/>
    </linearGradient>
    <linearGradient id="goldLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#dfba73"/>
    </linearGradient>
  </defs>
  <!-- Diamond Facets -->
  <polygon points="50,18 76,38 50,82 24,38" fill="url(#goldGrad)"/>
  <polygon points="36,18 50,18 50,38 31,38" fill="url(#goldLight)"/>
  <polygon points="64,18 50,18 50,38 69,38" fill="#c99c42"/>
  <polygon points="24,38 36,18 31,38" fill="#d4af37"/>
  <polygon points="76,38 64,18 69,38" fill="#8c6418"/>
  <polygon points="31,38 50,38 50,82" fill="#dfba73"/>
  <polygon points="69,38 50,38 50,82" fill="#9c711f"/>
</svg>
`)}`;

const ProductQrModal = ({ isOpen, onClose, item, clientCode }) => {
  const [copied, setCopied] = useState(false);
  const [qrMode, setQrMode] = useState('fast'); // 'fast' = clean short URL (instant scan), 'full' = offline payload
  const canvasRef = useRef(null);
  const printableRef = useRef(null);

  if (!isOpen || !item) return null;

  const itemCode = item.ItemCode || item.itemCode || item.RFIDCode || 'ITEM';
  const cCode = clientCode || (localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo') || '{}').ClientCode : '');

  // Cache item locally for instant lookup on this machine / browser
  try {
    localStorage.setItem(`qr_product_${itemCode}`, JSON.stringify(item));
    sessionStorage.setItem(`qr_product_${itemCode}`, JSON.stringify(item));
    localStorage.setItem('qr_product_latest', JSON.stringify(item));
  } catch (_) {}

  // Base URL pointing to public scanner route
  const baseUrl = getPublicScannerBaseUrl();

  // 1. Fast Scan URL (Minimal characters = maximum camera speed on any phone)
  const fastScanUrl = `${baseUrl}/#/product-view?code=${encodeURIComponent(itemCode)}${cCode ? `&clientCode=${encodeURIComponent(cCode)}` : ''}`;

  // 2. Full Data URL (Includes encoded payload for zero-network environments)
  const encodedPayload = encodeProductForUrl(item);
  const fullDataUrl = `${baseUrl}/#/product-view?code=${encodeURIComponent(itemCode)}${encodedPayload ? `&d=${encodedPayload}` : ''}${cCode ? `&clientCode=${encodeURIComponent(cCode)}` : ''}`;

  const activeUrl = qrMode === 'fast' ? fastScanUrl : fullDataUrl;

  // Copy link handler
  const handleCopy = () => {
    navigator.clipboard?.writeText(activeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  // Download QR Code as PNG
  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sparkle-QR-${itemCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Print jewelry tag slip
  const handlePrint = () => {
    window.print();
  };

  const grossWt = item.GrossWt ? parseFloat(item.GrossWt).toFixed(3) : '-';
  const netWt = item.NetWt ? parseFloat(item.NetWt).toFixed(3) : '-';
  const purity = item.Purity || item.PurityName || '22KT (916)';
  const productName = item.ProductName || item.CategoryName || 'Fine Jewelry';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 14, 23, 0.8)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
      }}
      onClick={onClose}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .printable-jewelry-tag,
          .printable-jewelry-tag * {
            visibility: visible !important;
          }
          .printable-jewelry-tag {
            position: absolute !important;
            left: 50% !important;
            top: 20px !important;
            transform: translateX(-50%) !important;
            border: 1px solid #c99c42 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '380px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(201, 156, 66, 0.22)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #181d28 0%, #0d1017 100%)',
            borderBottom: '1px solid rgba(201, 156, 66, 0.25)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img
                src={`${process.env.PUBLIC_URL || ''}/Logo/sparkle-logo.png`}
                alt="Sparkle"
                style={{ maxHeight: '28px', maxWidth: '28px', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                Product QR Tag
              </h3>
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8' }}>
                Scan with any phone camera
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#f1f5f9',
              cursor: 'pointer',
              fontSize: '13px',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '12px 16px 14px', textAlign: 'center', overflowY: 'auto' }}>
          {/* Mode Pill Toggle (Compact) */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              borderRadius: '50px',
              padding: '2px',
              marginBottom: '10px',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => setQrMode('fast')}
              style={{
                background: qrMode === 'fast' ? '#0f172a' : 'transparent',
                color: qrMode === 'fast' ? '#fce79a' : '#64748b',
                border: 'none',
                borderRadius: '50px',
                padding: '4px 11px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
              title="Fast scan - clean short URL"
            >
              <FaBolt style={{ color: '#eab308', fontSize: '10px' }} /> Fast Phone Scan
            </button>
            <button
              type="button"
              onClick={() => setQrMode('full')}
              style={{
                background: qrMode === 'full' ? '#0f172a' : 'transparent',
                color: qrMode === 'full' ? '#fce79a' : '#64748b',
                border: 'none',
                borderRadius: '50px',
                padding: '4px 11px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
              title="Offline embed - full item details"
            >
              <FaDatabase style={{ fontSize: '10px' }} /> Full Offline
            </button>
          </div>

          {/* Compact Printable Jewelry Tag Card */}
          <div
            ref={printableRef}
            className="printable-jewelry-tag"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #faf8f5 100%)',
              border: '1.5px solid #e7d8bf',
              borderRadius: '14px',
              padding: '10px 12px 10px',
              marginBottom: '10px',
              display: 'inline-block',
              width: '100%',
              maxWidth: '280px',
              boxShadow: '0 4px 14px rgba(201, 156, 66, 0.1)',
              position: 'relative',
            }}
          >
            {/* Tag Punch-Hole Mockup */}
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                margin: '0 auto 4px',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
              }}
            />

            {/* Brand Header with Real Sparkle Logo */}
            <div
              style={{
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={`${process.env.PUBLIC_URL || ''}/Logo/sparkle-logo.png`}
                alt="Sparkle"
                style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
            </div>

            {/* Compact High-Contrast QR Code Canvas (150px) with Center Sparkle Diamond Logo */}
            <div
              ref={canvasRef}
              style={{
                display: 'inline-flex',
                padding: '6px',
                background: '#ffffff',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                border: '1px solid #e8ecf2',
              }}
            >
              <QRCodeCanvas
                value={activeUrl}
                size={150}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: SPARKLE_DIAMOND_LOGO_SVG,
                  x: undefined,
                  y: undefined,
                  height: 34,
                  width: 34,
                  excavate: true,
                }}
              />
            </div>

            {/* Item Details on Tag */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                RFID / ITEM CODE
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', letterSpacing: '0.02em', lineHeight: 1.2, marginTop: '2px' }}>
                {itemCode}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '4px', fontWeight: 600, padding: '0 4px', wordBreak: 'break-word', lineHeight: 1.3 }}>
                {productName}
              </div>

              {/* Certified Weights Single Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.68rem',
                  color: '#475569',
                  marginTop: '5px',
                  fontWeight: 600,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ background: '#f1f5f9', padding: '2px 5px', borderRadius: '4px' }}>
                  Gross: {grossWt}g
                </span>
                <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 5px', borderRadius: '4px', fontWeight: 700 }}>
                  Net: {netWt}g
                </span>
                <span style={{ background: '#f1f5f9', padding: '2px 5px', borderRadius: '4px' }}>
                  {purity}
                </span>
              </div>

              {/* Tag Footer Hallmark */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  marginTop: '5px',
                  fontSize: '0.6rem',
                  color: '#059669',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <FaShieldAlt style={{ fontSize: '8px' }} />
                <span>BIS Hallmarked • Authentic</span>
              </div>
            </div>
          </div>

          {/* Compact Direct Public URL */}
          <div style={{ marginBottom: '10px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155' }}>
                Direct Public URL:
              </label>
              <span style={{ fontSize: '0.64rem', color: qrMode === 'fast' ? '#15803d' : '#64748b', fontWeight: 600 }}>
                {qrMode === 'fast' ? '⚡ Instant Phone Scan' : '📦 Full Data Payload'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input
                type="text"
                readOnly
                value={activeUrl}
                style={{
                  flex: 1,
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  fontSize: '0.72rem',
                  color: '#334155',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  background: copied ? '#10b981' : '#0f172a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                {copied ? <FaCheck /> : <FaCopy />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Action Buttons (Compact) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '8px 6px',
                background: '#f8fafc',
                color: '#1e293b',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid #cbd5e1',
                transition: 'all 0.15s ease',
              }}
            >
              <FaExternalLinkAlt size={10} /> Open
            </a>

            <button
              type="button"
              onClick={handleDownload}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '8px 6px',
                background: '#f8fafc',
                color: '#1e293b',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 700,
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <FaDownload size={10} /> Save PNG
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '8px 6px',
                background: 'linear-gradient(135deg, #dfba73 0%, #c99c42 100%)',
                color: '#0f172a',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(201, 156, 66, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <FaPrint size={10} /> Print Tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductQrModal;
