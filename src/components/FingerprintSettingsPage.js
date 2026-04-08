import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaCheckCircle, FaFingerprint, FaIdBadge, FaShieldAlt, FaUser } from 'react-icons/fa';
import {
  registerCredential,
  setFingerprintStatus,
  getFingerprintStatus,
  getRdServiceStatus,
  getRdDeviceInfo,
  captureRdFingerprint,
  parseRdXmlSummary,
} from '../services/fingerprintAuthService';

const FingerprintSettingsPage = () => {
  const navigate = useNavigate();
  const userInfo = useMemo(() => {
    try {
      const raw = localStorage.getItem('userInfo');
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  }, []);

  const loginName = String(
    userInfo?.Username || userInfo?.UserName || userInfo?.LoginName || ''
  ).trim();
  const clientCode = String(
    userInfo?.ClientCode || userInfo?.clientCode || userInfo?.clientcode || ''
  ).trim();

  const [deviceName, setDeviceName] = useState('My Fingerprint Device');
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [rdStatus, setRdStatus] = useState('');
  const [deviceInfoRaw, setDeviceInfoRaw] = useState('');
  const [captureRaw, setCaptureRaw] = useState('');
  const [captureParsed, setCaptureParsed] = useState(null);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [pin, setPin] = useState('');

  const canRegister = !!captureParsed?.data;

  useEffect(() => {
    if (!captureLoading) {
      setCaptureProgress(0);
      return undefined;
    }

    const timer = setInterval(() => {
      setCaptureProgress((prev) => {
        if (prev >= 92) return 92;
        return prev + 8;
      });
    }, 320);

    return () => clearInterval(timer);
  }, [captureLoading]);

  useEffect(() => {
    const loadStatus = async () => {
      if (!loginName) return;
      try {
        const status = await getFingerprintStatus({ loginName, clientCode });
        setEnabled(!!(status?.isEnabled ?? status?.IsEnabled));
        setRegisteredCount(
          Number(
            status?.registeredCredentialCount ??
            status?.RegisteredCredentialCount ??
            (status?.isRegistered || status?.IsRegistered ? 1 : 0)
          ) || 0
        );
      } catch (err) {
        setEnabled(false);
        setRegisteredCount(0);
      }
    };
    loadStatus();
  }, [loginName, clientCode]);

  const checkRdService = async () => {
    setCaptureLoading(true);
    try {
      const res = await getRdServiceStatus();
      const summary = parseRdXmlSummary(res.data);
      setRdStatus(`RD service connected via ${res.path}${summary.errInfo ? ` (${summary.errInfo})` : ''}`);
      toast.success('RD service is reachable.');
    } catch (err) {
      setRdStatus('RD service not reachable. Check IDEMIA service and HTTPS localhost.');
      toast.error('Unable to connect RD service.');
    } finally {
      setCaptureLoading(false);
    }
  };

  const fetchDeviceInfo = async () => {
    setCaptureLoading(true);
    try {
      const res = await getRdDeviceInfo();
      setDeviceInfoRaw(String(res.data || ''));
      toast.success('Device info fetched.');
    } catch (err) {
      toast.error('Unable to fetch device info from RD service.');
    } finally {
      setCaptureLoading(false);
    }
  };

  const handleCapture = async () => {
    setCaptureLoading(true);
    try {
      const result = await captureRdFingerprint({
        env: 'P',
        fCount: 1,
        fType: 0,
        format: 0,
        pidVer: '2.0',
        timeout: 10000,
      });
      setCaptureRaw(result.rawResponse || '');
      setCaptureParsed(result.parsed || null);
      setCaptureProgress(100);
      toast.success('Thumb captured successfully.');
    } catch (err) {
      const message = err?.message || 'Thumb capture failed.';
      toast.error(message);
    } finally {
      setCaptureLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!loginName) {
      toast.error('Unable to detect login name. Please login again.');
      return;
    }
    if (!captureParsed?.data) {
      toast.error('Capture thumb first, then register fingerprint.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        loginName,
        deviceName: deviceName || 'My Sparkle Fingerprint',
        friendlyDeviceName: 'IDEMIA USB Device',
        pidXml: captureRaw || '',
        deviceInfoXml: deviceInfoRaw || '',
        clientCode,
        pin: pin.trim() || undefined,
      };
      await registerCredential(payload);
      await setFingerprintStatus({ loginName, enabled: true, clientCode });
      setEnabled(true);
      setRegisteredCount((prev) => (prev > 0 ? prev : 1));
      localStorage.setItem('fingerprintLoginHint', JSON.stringify({
        loginName,
        clientCode,
        updatedAt: new Date().toISOString(),
      }));
      toast.success('Fingerprint registered and enabled successfully.');
    } catch (err) {
      const message = err?.response?.data?.Message || err?.message || 'Fingerprint registration failed.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (nextEnabled) => {
    if (!loginName) {
      toast.error('Unable to detect login name. Please login again.');
      return;
    }

    setStatusLoading(true);
    try {
      await setFingerprintStatus({ loginName, enabled: nextEnabled, clientCode });
      setEnabled(nextEnabled);
      toast.success(nextEnabled ? 'Fingerprint login enabled.' : 'Fingerprint login disabled.');
    } catch (err) {
      const message = err?.response?.data?.Message || err?.message || 'Unable to update fingerprint status.';
      toast.error(message);
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '12px 4px 22px' }}>
      <style>{`
        .fp-shell {
          border-radius: 22px;
          background: #ffffff;
          border: 1px solid #eef2f7;
          overflow: hidden;
          box-shadow: 0 8px 26px rgba(15, 23, 42, 0.06);
        }
        .fp-hero {
          background: linear-gradient(130deg, #f8fbff 0%, #f5f8ff 50%, #f8fafc 100%);
          color: #0f172a;
          padding: 18px;
          border-bottom: 1px solid #edf2f7;
        }
        .fp-main {
          padding: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .fp-card {
          background: #fff;
          border: 1px solid #edf2f7;
          border-radius: 12px;
          padding: 12px;
        }
        .fp-input {
          width: 100%;
          border: 1px solid #dbe3ef;
          border-radius: 9px;
          padding: 8px 11px;
          outline: none;
          transition: border-color 0.2s;
          font-size: 13px;
        }
        .fp-input:focus {
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.18);
        }
        .fp-btn {
          border: none;
          border-radius: 9px;
          padding: 8px 12px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
        }
        .fp-btn:hover { transform: translateY(-1px); }
        .fp-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .fp-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; box-shadow: 0 6px 14px rgba(99, 102, 241, 0.22); }
        .fp-capture { background: linear-gradient(135deg, #38bdf8, #3b82f6); color: #fff; box-shadow: 0 6px 14px rgba(59, 130, 246, 0.2); }
        .fp-soft { background: #ffffff; border: 1px solid #d9e2ef; color: #475569; }
        .fp-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
        .fp-danger { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
        .fp-code {
          font-family: Consolas, 'Courier New', monospace;
          font-size: 10px;
          background: #f8fafc;
          color: #334155;
          border-radius: 9px;
          border: 1px solid #e2e8f0;
          padding: 9px;
          min-height: 80px;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 200px;
          overflow: auto;
        }
        .fp-overlay {
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 23, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(3px);
        }
        .fp-modal {
          background: #fff;
          width: min(460px, 92vw);
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
          padding: 18px;
          text-align: center;
        }
        .fp-finger-ring {
          width: 84px;
          height: 84px;
          margin: 0 auto 10px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at 30% 30%, #dbeafe, #bfdbfe);
          animation: fpPulse 1.2s ease-in-out infinite;
        }
        .fp-progress {
          height: 10px;
          width: 100%;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 10px;
        }
        .fp-progress > span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #06b6d4 0%, #3b82f6 55%, #6366f1 100%);
          transition: width 0.25s ease;
        }
        @keyframes fpPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59,130,246,0.45); }
          70% { transform: scale(1.04); box-shadow: 0 0 0 14px rgba(59,130,246,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
        @media (max-width: 920px) {
          .fp-main { grid-template-columns: 1fr; }
        }
      `}</style>

      {captureLoading && (
        <div className="fp-overlay">
          <div className="fp-modal">
            <div className="fp-finger-ring">
              <FaFingerprint size={42} color="#1d4ed8" />
            </div>
            <h3 style={{ margin: '0 0 4px', color: '#0f172a' }}>Scanning Fingerprint</h3>
            <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>
              Keep your finger steady. Sparkle is verifying your biometric capture.
            </p>
            <div className="fp-progress">
              <span style={{ width: `${captureProgress}%` }} />
            </div>
            <div style={{ marginTop: 8, fontWeight: 700, color: '#334155' }}>{Math.max(6, captureProgress)}%</div>
          </div>
        </div>
      )}

      <div className="fp-shell">
        <div className="fp-hero">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <FaFingerprint size={20} />
                <h2 style={{ margin: 0, fontSize: 28, color: '#1e293b' }}>Sparkle Fingerprint Registration</h2>
              </div>
              <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: 13, color: '#64748b' }}>
                Secure your account with fast biometric sign-in.
              </p>
            </div>
            <button className="fp-btn fp-soft" type="button" onClick={() => navigate('/profile-menu')}>
              <FaArrowLeft style={{ marginRight: 6 }} />
              Back
            </button>
          </div>
        </div>

        <div className="fp-main">
          <div className="fp-card">
            <h4 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: 19 }}>Profile Details</h4>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#334155', fontWeight: 600, fontSize: 13 }}>
                <FaUser color="#6366f1" /> Login Name: {loginName || 'N/A'}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#334155', fontWeight: 600, fontSize: 13 }}>
                <FaIdBadge color="#0ea5e9" /> Registered Credentials: {registeredCount}
              </div>
              <label htmlFor="deviceName" style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 4 }}>
                Friendly Name
              </label>
              <input
                id="deviceName"
                type="text"
                className="fp-input"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="My Sparkle Fingerprint"
              />
              <label htmlFor="fingerPin" style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                Security PIN (used in complete-login)
              </label>
              <input
                id="fingerPin"
                type="password"
                className="fp-input"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN"
              />
            </div>
          </div>

          <div className="fp-card">
            <h4 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: 19 }}>Capture Steps</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="fp-btn fp-soft" onClick={checkRdService} disabled={captureLoading || loading || statusLoading}>
                Check Service
              </button>
              <button type="button" className="fp-btn fp-soft" onClick={fetchDeviceInfo} disabled={captureLoading || loading || statusLoading}>
                Get Device Info
              </button>
              <button type="button" className="fp-btn fp-capture" onClick={handleCapture} disabled={captureLoading || loading || statusLoading}>
                <FaFingerprint style={{ marginRight: 6 }} />
                {captureLoading ? 'Capturing...' : 'Capture Fingerprint'}
              </button>
            </div>

            {rdStatus && (
              <p style={{ margin: '10px 0 0', color: '#475569', fontWeight: 500, fontSize: 12 }}>{rdStatus}</p>
            )}
            {!!captureParsed && (
              <p style={{ margin: '6px 0 0', color: '#334155', fontWeight: 600, fontSize: 12 }}>
                Capture Status: {captureParsed.errCode || '0'} {captureParsed.errInfo ? `- ${captureParsed.errInfo}` : ''}
              </p>
            )}
            {canRegister && (
              <p style={{ margin: '8px 0 0', color: '#15803d', fontWeight: 600, fontSize: 12 }}>
                <FaCheckCircle style={{ marginRight: 5 }} />
                Fingerprint captured and ready for registration.
              </p>
            )}
          </div>

          <div className="fp-card" style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: 19 }}>Response Preview</h4>
            {!!deviceInfoRaw && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Device Info XML</div>
                <div className="fp-code">{deviceInfoRaw}</div>
              </div>
            )}
            {!!captureRaw && (
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Captured PID XML</div>
                <div className="fp-code">{captureRaw}</div>
              </div>
            )}
            {!deviceInfoRaw && !captureRaw && (
              <div className="fp-code" style={{ color: '#94a3b8' }}>
                Capture output will appear here...
              </div>
            )}
          </div>

          <div className="fp-card" style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ margin: '0 0 12px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, fontSize: 19 }}>
              <FaShieldAlt color="#4f46e5" />
              Security Controls
            </h4>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={handleRegister} disabled={loading || statusLoading || !canRegister} className="fp-btn fp-primary">
                {loading ? 'Registering...' : 'Register / Update Fingerprint'}
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(!enabled)}
                disabled={statusLoading || loading}
                className={`fp-btn ${enabled ? 'fp-success' : 'fp-danger'}`}
              >
                {statusLoading ? 'Updating...' : enabled ? 'Disable Fingerprint Login' : 'Enable Fingerprint Login'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FingerprintSettingsPage;
