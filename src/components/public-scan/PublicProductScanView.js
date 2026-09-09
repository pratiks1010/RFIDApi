import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaGem, FaQrcode, FaArrowLeft, FaSpinner } from 'react-icons/fa';
import QrCameraScanner from './QrCameraScanner';
import LuxuryProductDetails from './LuxuryProductDetails';
import { fetchProductScanDetails } from '../../services/productScanApi';
import './PublicProductScan.css';

const PublicProductScanView = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState('scanner'); // 'scanner' | 'details'
  const [currentProduct, setCurrentProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Helper to extract query parameter from either standard search (?code=...) or hash search
  const extractCodeFromUrl = useCallback(() => {
    let search = location.search;
    if (!search && location.pathname) {
      // HashRouter might place queries inside hash or window.location.hash
      const hash = window.location.hash || '';
      const queryIdx = hash.indexOf('?');
      if (queryIdx !== -1) {
        search = hash.substring(queryIdx);
      }
    }
    const params = new URLSearchParams(search);
    return {
      code: params.get('code') || params.get('itemCode') || params.get('scanValue') || '',
      clientCode: params.get('clientCode') || params.get('tenant') || '',
      encodedData: params.get('d') || params.get('p') || '',
    };
  }, [location]);

  // Load product by code
  const loadProduct = useCallback(async (codeToFetch, clientCode = '', encodedData = '') => {
    if (!codeToFetch && !encodedData) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await fetchProductScanDetails(codeToFetch, clientCode, encodedData);
      if (data) {
        setCurrentProduct(data);
        setViewMode('details');
      } else {
        setErrorMessage('Product details not found for this code.');
      }
    } catch (err) {
      console.error('Error fetching product details:', err);
      setErrorMessage(err.message || 'Unable to load product details.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check URL on mount / route change
  useEffect(() => {
    const { code, clientCode, encodedData } = extractCodeFromUrl();
    if (code || encodedData) {
      loadProduct(code, clientCode, encodedData);
    } else {
      setViewMode('scanner');
      setCurrentProduct(null);
    }
  }, [extractCodeFromUrl, loadProduct]);

  // Handle successful QR scan
  const handleScanSuccess = (scannedValue) => {
    const { clientCode } = extractCodeFromUrl();
    loadProduct(scannedValue, clientCode);
  };

  // Handle manual code search
  const handleManualSearch = (code) => {
    const { clientCode } = extractCodeFromUrl();
    loadProduct(code, clientCode);
  };

  // Switch back to scanner
  const handleBackToScanner = () => {
    setViewMode('scanner');
    setCurrentProduct(null);
    setErrorMessage(null);
    navigate('/product-view', { replace: true });
  };

  return (
    <div className="lux-scan-app">
      {/* Luxury White App Header */}
      <header className="lux-header">
        <div className="lux-header-inner">
          <a href="#/product-view" className="lux-brand" onClick={(e) => { e.preventDefault(); handleBackToScanner(); }}>
            <img
              src={`${process.env.PUBLIC_URL || ''}/Logo/Sparkle%20RFID%20svg.svg`}
              alt="Sparkle RFID"
              className="lux-brand-logo-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `${process.env.PUBLIC_URL || ''}/Logo/logo.png`;
              }}
            />
            <div className="lux-brand-divider" />
            <div className="lux-brand-text">
              <h2 className="lux-brand-title">
                {currentProduct?.jewelerName || 'Sparkle Jewellers'}
              </h2>
              <p className="lux-brand-tagline">Fine Jewelry & Hallmarked Gold</p>
            </div>
          </a>

          <div className="lux-header-actions">
            {viewMode === 'details' ? (
              <button
                type="button"
                className="lux-btn-ghost"
                onClick={handleBackToScanner}
                title="Open Camera Scanner"
              >
                <FaQrcode /> <span>Scan QR</span>
              </button>
            ) : (
              <span className="lux-live-tag">Live Showroom</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 17, 21, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99,
            color: '#c99c42',
          }}>
            <FaSpinner className="spin" style={{ fontSize: '2.5rem', marginBottom: '14px' }} />
            <h3 style={{ fontFamily: 'var(--lux-font-serif)', fontSize: '1.4rem', color: '#fff', margin: 0 }}>
              Retrieving Jewelry Details...
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>
              Fetching live metal rates and gemstone certifications
            </p>
          </div>
        )}

        {errorMessage && (
          <div style={{
            maxWidth: '500px',
            margin: '16px auto 0',
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '12px',
            color: '#fca5a5',
            fontSize: '0.85rem',
            textAlign: 'center',
            width: 'calc(100% - 32px)',
          }}>
            {errorMessage}
          </div>
        )}

        {viewMode === 'scanner' && !loading && (
          <QrCameraScanner
            onScanSuccess={handleScanSuccess}
            onManualSearch={handleManualSearch}
            isLoading={loading}
          />
        )}

        {viewMode === 'details' && currentProduct && !loading && (
          <LuxuryProductDetails
            product={currentProduct}
            onBackToScanner={handleBackToScanner}
            onSelectProduct={(code) => loadProduct(code)}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '20px',
        fontSize: '0.72rem',
        color: '#64748b',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(15, 17, 21, 0.95)',
        zIndex: 1,
      }}>
        <div>Sparkle Jewelry Tag Scanner • Verified Hallmarked Jewelry</div>
        <div style={{ marginTop: '4px', color: '#475569' }}>
          Real-time certified weights, BIS hallmark & live gold rate breakdown
        </div>
      </footer>
    </div>
  );
};

export default PublicProductScanView;
