import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaCamera, FaCheckCircle, FaUserCircle } from 'react-icons/fa';
import {
  captureVideoFrame,
  assertFaceFrameQuality,
  ensureFaceModelsLoaded,
  extractStableDescriptorFromVideo,
  getFaceStatus,
  hasLocalFaceGuard,
  registerFace,
  saveLocalFaceGuard,
  startFaceTracking,
} from '../services/faceAuthService';

const cardStyle = {
  background: '#fff',
  border: '1px solid #edf2f7',
  borderRadius: 12,
  padding: 12,
};

const FaceSettingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stopTrackingRef = useRef(null);

  const userInfo = useMemo(() => {
    try {
      const raw = localStorage.getItem('userInfo');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const [loginName, setLoginName] = useState(
    String(userInfo?.Username || userInfo?.UserName || userInfo?.LoginName || '').trim()
  );
  const [clientCode, setClientCode] = useState(
    String(userInfo?.ClientCode || userInfo?.clientCode || userInfo?.clientcode || '').trim()
  );
  const [cameraReady, setCameraReady] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [deviceSynced, setDeviceSynced] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [trackingState, setTrackingState] = useState({ faceCount: 0, quality: 'no_face', message: 'Align your face in the frame' });
  const [processState, setProcessState] = useState({ step: '', progress: 0 });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryLoginName = String(params.get('loginName') || '').trim();
    const queryClientCode = String(params.get('clientCode') || '').trim();
    if (queryLoginName) setLoginName(queryLoginName);
    if (queryClientCode) setClientCode(queryClientCode.toUpperCase());
  }, [location.search]);

  const stopStream = () => {
    if (stopTrackingRef.current) {
      stopTrackingRef.current();
      stopTrackingRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  const startStream = async () => {
    setPreviewError('');
    try {
      await ensureFaceModelsLoaded();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      if (stopTrackingRef.current) {
        stopTrackingRef.current();
      }
      stopTrackingRef.current = startFaceTracking(videoRef.current, (result) => {
        setTrackingState(result);
      });
    } catch (err) {
      setPreviewError(err?.message || 'Unable to start camera preview.');
      stopStream();
    }
  };

  useEffect(() => {
    startStream();
    return () => stopStream();
  }, []);

  const readFaceStatus = async () => {
    if (!loginName.trim() || !clientCode.trim()) {
      toast.error('Enter username and client code to check face status.');
      return;
    }
    setStatusLoading(true);
    try {
      const statusRes = await getFaceStatus({
        loginName: loginName.trim(),
        clientCode: clientCode.trim(),
      });
      const payload = statusRes?.data ?? statusRes;
      const resolvedLogin = loginName.trim();
      const resolvedClient = clientCode.trim().toUpperCase();
      const registered = !!(payload?.isRegistered ?? payload?.IsRegistered ?? payload?.registered);
      const synced = hasLocalFaceGuard({ loginName: resolvedLogin, clientCode: resolvedClient });
      setIsRegistered(registered);
      setDeviceSynced(synced);
      if (registered && synced) {
        setStatusMessage('Face is registered on server and synced on this device.');
        toast.success('Face registration found on this device.');
      } else if (registered) {
        setStatusMessage('Face is registered on server. Tap "Sync This Device" once so Face ID login works on this PC.');
        toast.info('Registered on server. Sync this device with one capture.');
      } else {
        setStatusMessage('Face not registered yet.');
        toast.info('Face is not registered. Capture and register now.');
      }
    } catch (err) {
      const message = err?.response?.data?.Message || err?.response?.data?.message || err?.message || 'Unable to fetch face status.';
      toast.error(message);
      setStatusMessage('');
      setIsRegistered(false);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleRegister = async () => {
    const resolvedLogin = loginName.trim();
    const resolvedClient = clientCode.trim().toUpperCase();
    if (!resolvedLogin || !resolvedClient) {
      toast.error('Username and client code are required for face registration.');
      return;
    }
    if (!cameraReady || !videoRef.current) {
      toast.error('Camera is not ready. Please allow camera and retry.');
      return;
    }

    setLoading(true);
    setProcessState({ step: 'Initializing face models', progress: 12 });
    try {
      await ensureFaceModelsLoaded();
      setProcessState({ step: 'Detecting and processing face', progress: 42 });
      try {
        assertFaceFrameQuality(videoRef.current);
      } catch (qualityError) {
        if (trackingState.quality !== 'good') {
          throw qualityError;
        }
      }
      const descriptor = await extractStableDescriptorFromVideo(videoRef.current);
      setProcessState({ step: 'Capturing secure face frame', progress: 68 });
      const imageBase64 = await captureVideoFrame(videoRef.current);
      setProcessState({ step: 'Saving face profile to API', progress: 88 });
      await registerFace({
        loginName: resolvedLogin,
        clientCode: resolvedClient,
        descriptor,
        imageBase64,
        livenessPassed: trackingState.quality === 'good',
      });
      saveLocalFaceGuard({
        loginName: resolvedLogin,
        clientCode: resolvedClient,
        descriptor,
      });
      localStorage.setItem(
        'fingerprintLoginHint',
        JSON.stringify({
          loginName: resolvedLogin,
          clientCode: resolvedClient,
          updatedAt: new Date().toISOString(),
        })
      );
      setIsRegistered(true);
      setDeviceSynced(true);
      setStatusMessage('Face registered successfully. You can now sign in from login page.');
      setProcessState({ step: 'Face registration completed', progress: 100 });
      toast.success('Face registered successfully.');
      stopStream();
    } catch (err) {
      const message = err?.response?.data?.Message || err?.response?.data?.message || err?.message || 'Face registration failed.';
      toast.error(message);
    } finally {
      setTimeout(() => setProcessState({ step: '', progress: 0 }), 900);
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '12px 4px 22px' }}>
      <style>{`
        .face-shell {
          border-radius: 22px;
          background: #ffffff;
          border: 1px solid #eef2f7;
          overflow: hidden;
          box-shadow: 0 8px 26px rgba(15, 23, 42, 0.06);
        }
        .face-hero {
          background: linear-gradient(130deg, #faf5ff 0%, #f5f3ff 52%, #eef2ff 100%);
          color: #0f172a;
          padding: 18px;
          border-bottom: 1px solid #edf2f7;
        }
        .face-main {
          padding: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .face-input {
          width: 100%;
          border: 1px solid #dbe3ef;
          border-radius: 9px;
          padding: 8px 11px;
          outline: none;
          transition: border-color 0.2s;
          font-size: 13px;
        }
        .face-input:focus {
          border-color: #c4b5fd;
          box-shadow: 0 0 0 3px rgba(196, 181, 253, 0.18);
        }
        .face-btn {
          border: none;
          border-radius: 9px;
          padding: 8px 12px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
        }
        .face-btn:hover { transform: translateY(-1px); }
        .face-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .face-primary { background: linear-gradient(135deg, #7c3aed, #6366f1); color: #fff; box-shadow: 0 6px 14px rgba(99, 102, 241, 0.22); }
        .face-soft { background: #ffffff; border: 1px solid #d9e2ef; color: #475569; }
        .face-state { font-size: 12px; font-weight: 600; margin-top: 8px; }
        .face-progress-shell {
          margin-top: 10px;
          border-radius: 10px;
          border: 1px solid #ddd6fe;
          background: #f5f3ff;
          padding: 8px 10px;
        }
        .face-progress-track {
          height: 8px;
          width: 100%;
          border-radius: 999px;
          overflow: hidden;
          background: #e9d5ff;
          margin-top: 6px;
        }
        .face-progress-bar {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #7c3aed, #6366f1);
          transition: width 0.25s ease;
        }
        .face-api-hint {
          margin-top: 10px;
          border: 1px dashed #c4b5fd;
          background: #faf5ff;
          color: #5b21b6;
          border-radius: 10px;
          padding: 9px 10px;
          font-size: 11px;
          line-height: 1.45;
          font-weight: 600;
        }
        @media (max-width: 920px) {
          .face-main { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="face-shell">
        <div className="face-hero">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <FaCamera size={20} color="#7c3aed" />
                <h2 style={{ margin: 0, fontSize: 28, color: '#1e293b' }}>Face Login Settings</h2>
              </div>
              <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: 13, color: '#64748b' }}>
                Register your face once, then use Login with Face ID from the login page.
              </p>
            </div>
            <button className="face-btn face-soft" type="button" onClick={() => navigate('/profile-menu')}>
              <FaArrowLeft style={{ marginRight: 6 }} />
              Back
            </button>
          </div>
        </div>

        <div className="face-main">
          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: 19 }}>Registration Details</h4>
            <div style={{ display: 'grid', gap: 10 }}>
              <label htmlFor="faceLoginName" style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                Username
              </label>
              <input
                id="faceLoginName"
                type="text"
                className="face-input"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="Username"
              />
              <label htmlFor="faceClientCode" style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                Client Code
              </label>
              <input
                id="faceClientCode"
                type="text"
                className="face-input"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value.toUpperCase())}
                placeholder="Client code (e.g. LS000410)"
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                <button type="button" className="face-btn face-soft" onClick={readFaceStatus} disabled={statusLoading || loading}>
                  {statusLoading ? 'Checking...' : 'Check Status'}
                </button>
                <button type="button" className="face-btn face-primary" onClick={handleRegister} disabled={loading || statusLoading || !cameraReady || trackingState.quality !== 'good'}>
                  {loading
                    ? (isRegistered ? 'Syncing...' : 'Registering...')
                    : (isRegistered && !deviceSynced ? 'Sync This Device' : 'Capture & Register Face')}
                </button>
              </div>
              {!!loading && (
                <div className="face-progress-shell">
                  <div style={{ color: '#4c1d95', fontSize: 11, fontWeight: 700 }}>
                    {processState.step || 'Processing face...'}
                  </div>
                  <div className="face-progress-track">
                    <div className="face-progress-bar" style={{ width: `${processState.progress || 8}%` }} />
                  </div>
                  <div style={{ marginTop: 4, color: '#6d28d9', fontSize: 10, fontWeight: 700 }}>
                    {Math.max(8, processState.progress)}%
                  </div>
                </div>
              )}
              <div className="face-api-hint">
                API hint: Registration sends <code>LoginName</code>, <code>ClientCode</code>, <code>Descriptor(128)</code>, <code>ImageBase64</code>. Keep a single face in frame and wait for “Face tracking locked”.
              </div>
              {!!statusMessage && (
                <div
                  className="face-state"
                  style={{ color: isRegistered ? '#15803d' : '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {isRegistered ? <FaCheckCircle /> : <FaUserCircle />}
                  {statusMessage}
                </div>
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: 19 }}>Camera Preview</h4>
            <div style={{ border: '1px solid #d5deeb', borderRadius: 12, background: '#0f172a', padding: 6, marginBottom: 8, position: 'relative' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 8, minHeight: 260, objectFit: 'cover', background: '#111827' }} />
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: 999,
                  color: '#fff',
                  background:
                    trackingState.quality === 'good'
                      ? 'rgba(22,163,74,0.9)'
                      : trackingState.quality === 'multiple_faces'
                        ? 'rgba(220,38,38,0.9)'
                        : 'rgba(30,64,175,0.9)',
                }}
              >
                {trackingState.message}
              </div>
            </div>
            {!!previewError && (
              <p style={{ margin: 0, color: '#b91c1c', fontSize: 12 }}>{previewError}</p>
            )}
            {!previewError && (
              <p style={{ margin: 0, color: '#475569', fontSize: 12 }}>
                Keep your face centered with good front lighting for best registration accuracy.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceSettingsPage;
