import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { FaCamera, FaBolt, FaSyncAlt, FaSearch, FaBarcode, FaTimes } from 'react-icons/fa';

const QrCameraScanner = ({ onScanSuccess, onManualSearch, isLoading }) => {
  const [manualCode, setManualCode] = useState('');
  const [cameras, setCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const scannerRef = useRef(null);
  const readerId = 'lux-qr-reader';

  // Initialize and start scanner
  useEffect(() => {
    let html5QrCode;
    let isMounted = true;

    async function startScanner() {
      try {
        setCameraError(null);
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available
          const backCamIndex = devices.findIndex(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          const chosenIndex = backCamIndex >= 0 ? backCamIndex : 0;
          setCurrentCameraIndex(chosenIndex);

          html5QrCode = new Html5Qrcode(readerId);
          scannerRef.current = html5QrCode;

          const config = {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          };

          await html5QrCode.start(
            devices[chosenIndex].id,
            config,
            (decodedText) => {
              if (onScanSuccess) {
                // Pause scanner and emit result
                html5QrCode.stop().then(() => {
                  setScannerActive(false);
                  onScanSuccess(decodedText);
                }).catch(() => {
                  onScanSuccess(decodedText);
                });
              }
            },
            () => {
              // Frame scan failure (continuous scanning, ignore normal misses)
            }
          );

          if (isMounted) {
            setScannerActive(true);
            // Check torch capabilities
            try {
              const capabilities = html5QrCode.getRunningTrackCapabilities();
              if (capabilities && capabilities.torch) {
                setTorchSupported(true);
              }
            } catch (_) {}
          }
        } else {
          setCameraError('No camera found on this device. You can enter the item code manually below.');
        }
      } catch (err) {
        console.warn('Camera start error:', err);
        if (isMounted) {
          setCameraError('Camera access was not granted or is unavailable. Please enter the item code below.');
        }
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
              scannerRef.current.clear();
            }).catch(() => {});
          } else {
            scannerRef.current.clear();
          }
        } catch (_) {}
      }
    };
  }, [onScanSuccess]);

  // Switch camera toggle
  const handleSwitchCamera = async () => {
    if (!scannerRef.current || cameras.length <= 1) return;
    try {
      const nextIndex = (currentCameraIndex + 1) % cameras.length;
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      setCurrentCameraIndex(nextIndex);
      const config = { fps: 15, qrbox: { width: 250, height: 250 } };
      await scannerRef.current.start(
        cameras[nextIndex].id,
        config,
        (decodedText) => {
          scannerRef.current.stop().then(() => {
            setScannerActive(false);
            onScanSuccess(decodedText);
          }).catch(() => onScanSuccess(decodedText));
        },
        () => {}
      );
      setScannerActive(true);
    } catch (err) {
      console.warn('Switch camera error:', err);
    }
  };

  // Toggle torch / flashlight
  const handleToggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle error:', err);
      setTorchSupported(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const val = manualCode.trim();
    if (val && onManualSearch) {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      onManualSearch(val);
    }
  };

  return (
    <div className="lux-scanner-container">
      <div className="lux-scanner-intro">
        <div className="lux-scanner-badge">
          <FaBarcode /> Public Showroom Scanner
        </div>
        <h1 className="lux-scanner-title">Scan Jewelry Tag</h1>
        <p className="lux-scanner-subtitle">
          Align the QR code or barcode on the jewelry tag within the gold frame to instantly view full specifications and live pricing.
        </p>
      </div>

      <div className="lux-viewfinder-card">
        <div className="lux-camera-wrapper">
          <div id={readerId}></div>
          {scannerActive && (
            <>
              <div className="lux-laser-line"></div>
              <div className="lux-corner lux-corner-tl"></div>
              <div className="lux-corner lux-corner-tr"></div>
              <div className="lux-corner lux-corner-bl"></div>
              <div className="lux-corner lux-corner-br"></div>
            </>
          )}

          {cameraError && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              textAlign: 'center',
              background: '#15171e',
              color: '#cbd5e1',
              zIndex: 15,
            }}>
              <FaCamera style={{ fontSize: '2rem', color: '#c99c42', marginBottom: '10px' }} />
              <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                {cameraError}
              </p>
            </div>
          )}
        </div>

        {/* Camera Controls */}
        <div className="lux-camera-controls">
          {cameras.length > 1 && (
            <button
              type="button"
              className="lux-ctrl-btn"
              onClick={handleSwitchCamera}
              title="Switch between front and back camera"
            >
              <FaSyncAlt /> Switch Camera
            </button>
          )}

          {torchSupported && (
            <button
              type="button"
              className={`lux-ctrl-btn ${torchOn ? 'active' : ''}`}
              onClick={handleToggleTorch}
              title="Toggle flashlight"
            >
              <FaBolt /> {torchOn ? 'Flashlight On' : 'Flashlight Off'}
            </button>
          )}
        </div>
      </div>

      {/* Fallback Manual Entry */}
      <div className="lux-divider">
        <span>Or Enter Tag / Item Code</span>
      </div>

      <form className="lux-manual-form" onSubmit={handleManualSubmit}>
        <input
          type="text"
          className="lux-input"
          placeholder="e.g. RT1001, NCK-0091..."
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" className="lux-btn-gold" disabled={isLoading || !manualCode.trim()}>
          <FaSearch /> {isLoading ? 'Searching...' : 'Lookup'}
        </button>
      </form>

      {/* Quick Demo links */}
      <div className="lux-demo-pills">
        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Try sample:</span>
        <button
          type="button"
          className="lux-pill-btn"
          onClick={() => {
            setManualCode('RT1001');
            if (onManualSearch) onManualSearch('RT1001');
          }}
        >
          RT1001 (Royal Antique Gold Necklace)
        </button>
        <button
          type="button"
          className="lux-pill-btn"
          onClick={() => {
            setManualCode('RT1006');
            if (onManualSearch) onManualSearch('RT1006');
          }}
        >
          RT1006 (Bridal Choker)
        </button>
      </div>
    </div>
  );
};

export default QrCameraScanner;
