import React, { useState, useEffect, useMemo } from 'react';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaExpand,
  FaTimes,
  FaGem,
  FaPhoneAlt,
  FaWhatsapp,
  FaShareAlt,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaCopy,
  FaCheck,
  FaQrcode,
  FaCamera,
} from 'react-icons/fa';
import { formatCurrencyINR } from '../../services/productScanApi';

const LuxuryProductDetails = ({ product, onBackToScanner, onSelectProduct }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('price'); // 'price' | 'specs' | 'stones'
  const [copiedLink, setCopiedLink] = useState(false);

  // Reset error and index when switching products
  useEffect(() => {
    setImageError(false);
    setActiveImageIndex(0);
  }, [product?.itemCode]);

  // Reset error when switching image index
  useEffect(() => {
    setImageError(false);
  }, [activeImageIndex]);

  if (!product) return null;

  // Compute available real images (exclude fallback stock photos for real products)
  const isDemo = String(product.itemCode || '').toUpperCase() === 'RT1001';
  const rawList = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
    ? product.imageUrls
    : (product.primaryImageUrl ? [product.primaryImageUrl] : []);

  const images = rawList.filter((img) => {
    if (!img || typeof img !== 'string') return false;
    if (!isDemo && img.includes('images.unsplash.com')) return false;
    return true;
  });

  const currentImage = images[activeImageIndex] || images[0] || null;
  const hasValidImage = Boolean(currentImage && !imageError);

  // Copy current public link
  const handleCopyLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard?.writeText(currentUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }).catch(() => {});
  };

  // WhatsApp share
  const handleWhatsAppShare = () => {
    const title = product.productTitle || 'Exquisite Jewelry Item';
    const code = product.itemCode || '';
    const price = product.estimatedTotalPrice ? formatCurrencyINR(product.estimatedTotalPrice) : '';
    const link = window.location.href;
    const text = encodeURIComponent(
      `✨ *${title}* (Code: ${code})\n💎 Estimated Price: ${price}\n🏷️ Purity: ${product.purityName || '22KT'}\n\nExplore full details, live rate breakdown & certificates here:\n${link}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const hasDiamonds = Array.isArray(product.diamonds) && product.diamonds.length > 0;
  const hasStones = Array.isArray(product.stones) && product.stones.length > 0;

  return (
    <div className="lux-product-container">
      {/* Top Navigation & Status */}
      <div className="lux-detail-topbar">
        <button type="button" className="lux-back-btn" onClick={onBackToScanner}>
          <FaArrowLeft /> Scan Another
        </button>
        <div className="lux-stock-badge">
          <span className="lux-stock-dot"></span>
          {product.status || 'In Stock'}
        </div>
      </div>

      {/* Big Hero Image Showcase */}
      <div className="lux-gallery-card">
        {hasValidImage ? (
          <div
            className="lux-hero-image-box"
            onClick={() => setLightboxOpen(true)}
            title="Click to view full screen"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLightboxOpen(true); }}
          >
            <img
              src={currentImage}
              alt={product.productTitle || 'Jewelry Product'}
              className="lux-hero-image"
              onError={() => setImageError(true)}
            />
            <div className="lux-zoom-hint">
              <FaExpand /> Tap to Zoom
            </div>
          </div>
        ) : (
          <div className="lux-no-image-box">
            <div className="lux-no-image-badge">
              <FaCamera className="lux-no-image-icon" />
            </div>
            <h3 className="lux-no-image-title">Product Image Not Uploaded</h3>
            <p className="lux-no-image-desc">
              Please upload the product photo in ERP inventory to display it here.
            </p>
            <div className="lux-no-image-tag-pill">
              <span>Tag: <strong>{product.itemCode}</strong></span>
              {product.purityName && (
                <>
                  <span className="lux-dot-sep">•</span>
                  <span>{product.purityName}</span>
                </>
              )}
              {product.grossWt && (
                <>
                  <span className="lux-dot-sep">•</span>
                  <span>Gross: {product.grossWt}g</span>
                </>
              )}
            </div>
          </div>
        )}

        {images.length > 1 && hasValidImage && (
          <div className="lux-thumb-row">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                className={`lux-thumb-btn ${activeImageIndex === idx ? 'active' : ''}`}
                onClick={() => setActiveImageIndex(idx)}
              >
                <img
                  src={img}
                  alt={`thumbnail-${idx}`}
                  className="lux-thumb-img"
                  onError={() => setImageError(true)}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Highlights */}
      <div className="lux-product-header">
        <div className="lux-pill-tags">
          <span className="lux-tag lux-tag-gold">Tag: {product.itemCode}</span>
          {product.purityName && <span className="lux-tag">{product.purityName}</span>}
          {product.colour && <span className="lux-tag">{product.colour}</span>}
          {product.isHallmarked && (
            <span className="lux-tag lux-tag-hallmark">
              <FaShieldAlt /> BIS Hallmark {product.huidCode ? `(HUID: ${product.huidCode})` : ''}
            </span>
          )}
        </div>

        <h1 className="lux-product-title">{product.productTitle}</h1>
        {product.description && <p className="lux-product-desc">{product.description}</p>}
      </div>

      {/* Weights Card */}
      <div className="lux-weights-card">
        <div className="lux-card-heading">
          <span>Certified Weights</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
            Qty: {product.pieces || '1'} Pc
          </span>
        </div>
        <div className="lux-weights-grid">
          <div className="lux-weight-item">
            <div className="lux-weight-label">Gross Wt</div>
            <div className="lux-weight-val">
              {product.grossWt || '0.000'}<span className="lux-weight-unit">g</span>
            </div>
          </div>
          <div className="lux-weight-item">
            <div className="lux-weight-label">Net Wt</div>
            <div className="lux-weight-val" style={{ color: '#b45309' }}>
              {product.netWt || '0.000'}<span className="lux-weight-unit">g</span>
            </div>
          </div>
          <div className="lux-weight-item">
            <div className="lux-weight-label">Stone Wt</div>
            <div className="lux-weight-val">
              {product.totalStoneWeight || '0.000'}<span className="lux-weight-unit">g</span>
            </div>
          </div>
          <div className="lux-weight-item">
            <div className="lux-weight-label">Diamond Wt</div>
            <div className="lux-weight-val">
              {product.totalDiamondWeight || '0.000'}<span className="lux-weight-unit">cts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Price Breakdown Card */}
      <div className="lux-price-card">
        <div className="lux-card-heading">
          <span>Live Price Breakdown</span>
          <span style={{ fontSize: '0.72rem', color: '#b48324', fontWeight: 700, letterSpacing: '0.05em' }}>TRANSPARENT PRICING</span>
        </div>

        {product.todaysMetalRate && (
          <div className="lux-live-rate-bar">
            <span className="lux-live-rate-label">
              <FaGem /> Today's Live Metal Rate ({product.purityName || '22KT'})
            </span>
            <span className="lux-live-rate-val">
              {formatCurrencyINR(product.todaysMetalRate)} / g
            </span>
          </div>
        )}

        <table className="lux-breakdown-table">
          <tbody>
            {product.estimatedMetalAmount !== undefined && (
              <tr>
                <td>Gold Value ({product.netWt || '0'}g × {formatCurrencyINR(product.todaysMetalRate || 7250)})</td>
                <td>{formatCurrencyINR(product.estimatedMetalAmount)}</td>
              </tr>
            )}
            {product.makingCharges !== undefined && (
              <tr>
                <td>Making Charges {product.makingType ? `(${product.makingType})` : ''}</td>
                <td>{formatCurrencyINR(product.makingCharges)}</td>
              </tr>
            )}
            {product.totalDiamondAmount !== undefined && Number(product.totalDiamondAmount) > 0 && (
              <tr>
                <td>Certified Diamonds Amount</td>
                <td>{formatCurrencyINR(product.totalDiamondAmount)}</td>
              </tr>
            )}
            {product.totalStoneAmount !== undefined && Number(product.totalStoneAmount) > 0 && (
              <tr>
                <td>Gemstones Amount</td>
                <td>{formatCurrencyINR(product.totalStoneAmount)}</td>
              </tr>
            )}
            {product.hallmarkAmount !== undefined && Number(product.hallmarkAmount) > 0 && (
              <tr>
                <td>Hallmarking & Certification</td>
                <td>{formatCurrencyINR(product.hallmarkAmount)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="lux-total-price-box">
          <div>
            <div className="lux-total-label">Estimated Total Price</div>
            <div className="lux-total-sub">Includes live rate & all craft charges</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {product.mrp && Number(product.mrp) > Number(product.estimatedTotalPrice) && (
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                MRP {formatCurrencyINR(product.mrp)}
              </div>
            )}
            <div className="lux-total-amount">
              {formatCurrencyINR(product.estimatedTotalPrice || product.offerPrice || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & Gemstones Details */}
      <div className="lux-specs-card">
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '12px' }}>
          <button
            type="button"
            className="lux-btn-ghost"
            style={{
              background: activeTab === 'price' ? '#fef9ee' : 'transparent',
              borderColor: activeTab === 'price' ? 'var(--lux-gold)' : '#e2e8f0',
              color: activeTab === 'price' ? '#0f172a' : 'var(--lux-text-secondary)',
            }}
            onClick={() => setActiveTab('price')}
          >
            Product Specs
          </button>
          {hasDiamonds && (
            <button
              type="button"
              className="lux-btn-ghost"
              style={{
                background: activeTab === 'diamonds' ? '#fef9ee' : 'transparent',
                borderColor: activeTab === 'diamonds' ? 'var(--lux-gold)' : '#e2e8f0',
                color: activeTab === 'diamonds' ? '#0f172a' : 'var(--lux-text-secondary)',
              }}
              onClick={() => setActiveTab('diamonds')}
            >
              Diamonds ({product.diamonds.length})
            </button>
          )}
          {hasStones && (
            <button
              type="button"
              className="lux-btn-ghost"
              style={{
                background: activeTab === 'stones' ? '#fef9ee' : 'transparent',
                borderColor: activeTab === 'stones' ? 'var(--lux-gold)' : '#e2e8f0',
                color: activeTab === 'stones' ? '#0f172a' : 'var(--lux-text-secondary)',
              }}
              onClick={() => setActiveTab('stones')}
            >
              Stones ({product.stones.length})
            </button>
          )}
        </div>

        {activeTab === 'price' && (
          <div>
            <div className="lux-spec-row">
              <span className="lux-spec-label">Category</span>
              <span className="lux-spec-val">{product.categoryName || '–'}</span>
            </div>
            {product.designName && (
              <div className="lux-spec-row">
                <span className="lux-spec-label">Design Style</span>
                <span className="lux-spec-val">{product.designName}</span>
              </div>
            )}
            {product.collectionName && (
              <div className="lux-spec-row">
                <span className="lux-spec-label">Collection</span>
                <span className="lux-spec-val">{product.collectionName}</span>
              </div>
            )}
            {product.size && (
              <div className="lux-spec-row">
                <span className="lux-spec-label">Dimensions / Size</span>
                <span className="lux-spec-val">{product.size}</span>
              </div>
            )}
            {product.gender && (
              <div className="lux-spec-row">
                <span className="lux-spec-label">Gender</span>
                <span className="lux-spec-val">{product.gender}</span>
              </div>
            )}
            {product.hsnCode && (
              <div className="lux-spec-row">
                <span className="lux-spec-label">HSN Code</span>
                <span className="lux-spec-val">{product.hsnCode}</span>
              </div>
            )}
            {product.huidCode && (
              <div className="lux-spec-row">
                <span className="lux-spec-label">BIS HUID Code</span>
                <span className="lux-spec-val" style={{ color: '#b45309', fontWeight: 700 }}>
                  {product.huidCode}
                </span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'diamonds' && hasDiamonds && (
          <div style={{ overflowX: 'auto' }}>
            <table className="lux-table-clean">
              <thead>
                <tr>
                  <th>Diamond</th>
                  <th>Weight</th>
                  <th>Pcs</th>
                  <th>Cut / Clarity</th>
                  <th>Cert</th>
                </tr>
              </thead>
              <tbody>
                {product.diamonds.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{d.diamondName || 'Diamond'}</td>
                    <td>{d.weight} cts</td>
                    <td>{d.pieces || '–'}</td>
                    <td>{d.cut || ''} {d.clarity ? `(${d.clarity})` : ''}</td>
                    <td><span className="lux-tag">{d.certificate || 'Certified'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'stones' && hasStones && (
          <div style={{ overflowX: 'auto' }}>
            <table className="lux-table-clean">
              <thead>
                <tr>
                  <th>Stone</th>
                  <th>Weight</th>
                  <th>Pieces</th>
                  <th>Certification</th>
                </tr>
              </thead>
              <tbody>
                {product.stones.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{s.stoneName || 'Color Stone'}</td>
                    <td>{s.weight} g</td>
                    <td>{s.pieces || '–'}</td>
                    <td><span className="lux-tag">{s.certificate || 'Lab Certified'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Showroom & Action Buttons */}
      <div className="lux-showroom-card">
        <h3 className="lux-showroom-title">{product.jewelerName || 'Showroom Flagship'}</h3>
        <div className="lux-showroom-address">
          <FaMapMarkerAlt style={{ color: '#c99c42', flexShrink: 0, marginTop: '2px' }} />
          <span>
            {product.branchName ? `${product.branchName}, ` : ''}
            {product.branchAddress || 'Showroom Display Gallery'}
            {product.counterName ? ` • Counter: ${product.counterName}` : ''}
          </span>
        </div>

        <div className="lux-actions-grid">
          {product.jewelerPhone && (
            <a href={`tel:${product.jewelerPhone}`} className="lux-action-btn lux-action-btn-call">
              <FaPhoneAlt /> Call Showroom
            </a>
          )}
          <button type="button" className="lux-action-btn lux-action-btn-whatsapp" onClick={handleWhatsAppShare}>
            <FaWhatsapp style={{ fontSize: '1.1rem' }} /> WhatsApp
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button
            type="button"
            className="lux-btn-ghost"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleCopyLink}
          >
            {copiedLink ? <FaCheck style={{ color: '#4ade80' }} /> : <FaCopy />}
            {copiedLink ? 'Link Copied!' : 'Copy Shareable Link'}
          </button>
        </div>
      </div>

      {/* Lightbox / Zoom Overlay */}
      {lightboxOpen && hasValidImage && (
        <div className="lux-lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <button
            type="button"
            className="lux-lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
          >
            <FaTimes />
          </button>
          <img
            src={currentImage}
            alt={product.productTitle || 'Jewelry Product'}
            className="lux-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="lux-mobile-bottom-bar">
        <button
          type="button"
          className="lux-mobile-btn lux-mobile-btn--whatsapp"
          onClick={handleWhatsAppShare}
        >
          <FaWhatsapp style={{ fontSize: '1.15rem' }} /> Inquire on WhatsApp
        </button>
        {product.jewelerPhone && (
          <a
            href={`tel:${product.jewelerPhone}`}
            className="lux-mobile-btn lux-mobile-btn--call"
          >
            <FaPhoneAlt /> Call
          </a>
        )}
      </div>
    </div>
  );
};

export default LuxuryProductDetails;
