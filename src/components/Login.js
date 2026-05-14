import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { getAuthForgotPasswordUrl, getAuthLoginUrl } from '../services/authApiConfig';
import { getApiMode } from '../services/apiBaseConfig';
import OfflineApiBaseSettingsForm from './OfflineApiBaseSettingsForm';
import {
  createFingerprintChallenge,
  verifyLogin,
  completeFingerprintLogin,
  captureRdFingerprint,
  getRdDeviceInfo,
} from '../services/fingerprintAuthService';
import {
  fetchPasskeyLoginOptions,
  verifyPasskeyLogin,
  toPublicKeyRequestOptions,
  extractJwtFromLoginPayload,
} from '../services/passkeyAuthService';
import {
  extractStableDescriptorFromVideo,
  captureVideoFrame,
  getLocalFaceGuard,
  loginWithFace,
  matchFaceWithReference,
  faceDistance,
  assertFaceFrameQuality,
  ensureFaceModelsLoaded,
  getFaceStatus,
  startFaceTracking,
} from '../services/faceAuthService';

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.38)',
  zIndex: 9998,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  backdropFilter: 'blur(5px)',
};

const modalCardStyle = {
  width: '100%',
  maxWidth: 428,
  background: '#fff',
  borderRadius: 18,
  border: '1px solid #e8eef7',
  boxShadow: '0 24px 52px rgba(15, 23, 42, 0.14)',
  padding: 22,
};

const modalInputStyle = {
  width: '100%',
  border: '1px solid #d5deeb',
  borderRadius: 11,
  padding: '11px 13px',
  marginBottom: 12,
  fontSize: '0.88rem',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const modalBtnPrimary = {
  border: 'none',
  background: 'linear-gradient(135deg, #0d9488 0%, #6366f1 100%)',
  color: '#fff',
  borderRadius: 11,
  padding: '10px 16px',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.85rem',
};

const modalBtnGhost = {
  border: '1px solid #d5deeb',
  background: '#fff',
  color: '#334155',
  borderRadius: 11,
  padding: '10px 16px',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.85rem',
};

const sliderData = [
  {
    img: 'https://undraw.co/api/illustrations/undraw_authentication_re_svpt.svg',
    heading: 'MFA for all accounts',
    desc: 'Secure online accounts with OneAuth 2FA. Back up OTP secrets and never lose access to your accounts.',
    btn: 'Learn more',
    link: 'https://www.zoho.com/oneauth/'
  },
  {
    img: 'https://undraw.co/api/illustrations/undraw_secure_login_pdn4.svg',
    heading: 'Passwordless sign-in',
    desc: 'Move away from risky passwords and experience one-tap access to your RFID API Dashboard. Download and install our mobile authenticator for extra security.',
    btn: 'Learn more',
    link: 'https://play.google.com/store/apps/details?id=com.zoho.oneauth'
  }
];

const ZohoToast = ({ closeToast, toastProps, message }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.85)',
    borderRadius: '18px',
    boxShadow: '0 8px 32px 0 rgba(44,62,80,0.18)',
    padding: '20px 32px 20px 18px',
    minWidth: 320,
    color: '#232a36',
    fontFamily: 'Inter, Poppins, sans-serif',
    fontWeight: 700,
    fontSize: '1.13rem',
    position: 'relative',
    animation: 'zoho-toast-in 0.5s cubic-bezier(.4,0,.2,1)',
    maxWidth: 480,
    margin: '0 auto 32px auto',
    pointerEvents: 'auto',
    border: '1.5px solid #e0e7ef',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    overflow: 'hidden',
  }}>
    <div style={{
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 7,
      background: 'linear-gradient(180deg, #22c55e 0%, #2563eb 100%)',
      borderTopLeftRadius: 18,
      borderBottomLeftRadius: 18,
    }} />
    <span style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 44,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #e0ffe7 0%, #e0f2ff 100%)',
      marginRight: 20,
      flexShrink: 0,
      boxShadow: '0 2px 8px #22c55e22',
    }}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="14" fill="#22c55e"/><path d="M8.5 14.5l4 4 7-8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </span>
    <span style={{ flex: 1, letterSpacing: '-0.01em', fontWeight: 700 }}>{message}</span>
    <button onClick={closeToast} style={{
      background: 'rgba(36, 41, 46, 0.08)',
      border: 'none',
      borderRadius: '50%',
      width: 32,
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 16,
      cursor: 'pointer',
      color: '#232a36',
      fontSize: 22,
      boxShadow: 'none',
      transition: 'background 0.2s',
      outline: 'none',
    }}
      onMouseOver={e => e.currentTarget.style.background = '#e0e7ef'}
      onMouseOut={e => e.currentTarget.style.background = 'rgba(36, 41, 46, 0.08)'}
    >
      <span style={{fontSize: 22, lineHeight: 1}}>&times;</span>
    </button>
    <style>{`
      @keyframes zoho-toast-in {
        0% { opacity: 0; transform: translateY(-30px) scale(0.98); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
    `}</style>
  </div>
);

const infoSlides = [
  {
    img: `${process.env.PUBLIC_URL || ''}/images/Mobile%20App.png`,
    title: 'Mobile Device Interface',
    desc: 'A handheld mobile device with a user-friendly interface for managing tasks like product listing, inventory tracking, billing, stock reports, and issue tracking. Easily syncs with your RFID system for real-time updates and seamless workflow. Supports barcode and RFID scanning, photo capture, and instant notifications. Designed for reliability and ease of use in demanding environments.',
    link: '#',
  },
  {
    img: `${process.env.PUBLIC_URL || ''}/images/Gate.png`,
    title: 'RFID Gate',
    desc: 'A sleek, professional RFID gate designed for seamless inventory management and tracking, branded with "Loyal String." Automates entry/exit logging and enhances security for your assets. Integrates with your ERP and alert systems for real-time monitoring. Built for high-traffic, industrial environments.',
    link: '#',
  },
  {
    img: `${process.env.PUBLIC_URL || ''}/images/RFID%20GUN.png`,
    title: 'RFID Handheld Scanner',
    desc: 'A rugged RFID scanner with a handle, providing efficient and portable scanning capabilities for inventory management. Scan, verify, and audit inventory anywhere in your facility. Long battery life, drop-resistant, and easy to operate. Ideal for stocktaking, audits, and on-the-go asset tracking.',
    link: '#',
  },
];

const Login = () => {
  const getFingerprintHint = () => {
    try {
      const raw = localStorage.getItem('fingerprintLoginHint');
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        loginName: String(parsed?.loginName || '').trim(),
        clientCode: String(parsed?.clientCode || '').trim(),
      };
    } catch {
      return { loginName: '', clientCode: '' };
    }
  };

  const fingerprintHint = getFingerprintHint();
  const [formData, setFormData] = useState({
    LoginName: '',
    Password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordPrompt, setShowForgotPasswordPrompt] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    LoginName: '',
    ClientCode: '',
    CurrentPassword: '',
    NewPassword: '',
    ConfirmPassword: '',
  });
  const [showFingerprintPrompt, setShowFingerprintPrompt] = useState(false);
  const [fingerprintLoginName, setFingerprintLoginName] = useState(fingerprintHint.loginName);
  const [fingerprintClientCode, setFingerprintClientCode] = useState(fingerprintHint.clientCode);
  const [showSecondFactorPrompt, setShowSecondFactorPrompt] = useState(false);
  const [fingerprintTransactionId, setFingerprintTransactionId] = useState('');
  const [secondFactorOtp, setSecondFactorOtp] = useState('');
  const [secondFactorPin, setSecondFactorPin] = useState('');
  const [secondFactorLoading, setSecondFactorLoading] = useState(false);
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
  const [pkLoginName, setPkLoginName] = useState(fingerprintHint.loginName);
  const [pkClientCode, setPkClientCode] = useState(fingerprintHint.clientCode);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [showFacePrompt, setShowFacePrompt] = useState(false);
  const [faceLoginName, setFaceLoginName] = useState('');
  const [faceClientCode, setFaceClientCode] = useState('');
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceCameraReady, setFaceCameraReady] = useState(false);
  const [facePreviewError, setFacePreviewError] = useState('');
  const [facePopupError, setFacePopupError] = useState('');
  const [faceTracking, setFaceTracking] = useState({ faceCount: 0, quality: 'no_face', message: 'Align your face in the frame' });
  const [slide, setSlide] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [showOfflineApiModal, setShowOfflineApiModal] = useState(false);
  const prevSlide = useRef(slide);
  const faceVideoRef = useRef(null);
  const faceStreamRef = useRef(null);
  const stopFaceTrackingRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_expired')) {
      toast.error('Your session has expired. Please login again.', {
        position: "top-right",
        autoClose: 5000,
        theme: "colored"
      });
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  useEffect(() => {
    if (!showOfflineApiModal) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowOfflineApiModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showOfflineApiModal]);

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => {
      setSlide((slide + 1) % infoSlides.length);
    }, 5000);
    const animTimer = setTimeout(() => setAnimating(false), 400);
    return () => {
      clearTimeout(timer);
      clearTimeout(animTimer);
    };
  }, [slide]);

  const stopFaceStream = () => {
    if (stopFaceTrackingRef.current) {
      stopFaceTrackingRef.current();
      stopFaceTrackingRef.current = null;
    }
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach((track) => track.stop());
      faceStreamRef.current = null;
    }
    if (faceVideoRef.current) {
      faceVideoRef.current.srcObject = null;
    }
    setFaceCameraReady(false);
  };

  const startFaceStream = async () => {
    setFacePreviewError('');
    try {
      await ensureFaceModelsLoaded();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      faceStreamRef.current = stream;
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
        await faceVideoRef.current.play();
      }
      setFaceCameraReady(true);
      if (stopFaceTrackingRef.current) {
        stopFaceTrackingRef.current();
      }
      stopFaceTrackingRef.current = startFaceTracking(faceVideoRef.current, (result) => {
        setFaceTracking(result);
      });
    } catch (err) {
      setFacePreviewError(err?.message || 'Unable to start camera preview.');
      stopFaceStream();
    }
  };

  useEffect(() => {
    if (showFacePrompt) {
      startFaceStream();
    } else {
      stopFaceStream();
      setFacePreviewError('');
    }
    return () => stopFaceStream();
  }, [showFacePrompt]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getFaceLoginPopupMessage = (rawMessage) => {
    const text = String(rawMessage || '').trim();
    const normalized = text.toLowerCase();

    if (!text) return 'Face verification failed. Please try again.';
    if (normalized.includes('face mismatch')) {
      return 'Face does not match the registered profile. Please use the same person enrolled for this account.';
    }
    if (normalized.includes('multiple faces')) {
      return 'Multiple faces detected. Keep only one face in frame and try again.';
    }
    if (normalized.includes('no face detected')) {
      return 'Face not detected. Keep your face centered and improve lighting.';
    }
    if (normalized.includes('camera frame is blurry') || normalized.includes('blurry')) {
      return 'Image is blurry. Hold steady and look directly at the camera.';
    }
    if (normalized.includes('lighting is too low')) {
      return 'Lighting is too low. Improve front light and try again.';
    }
    if (normalized.includes('unstable')) {
      return 'Face capture is unstable. Stay still and keep your face centered.';
    }
    return text;
  };

  const handleForgotPasswordChange = (e) => {
    const { name, value } = e.target;
    setForgotPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const finalizeLogin = (token, resolvedUsername) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const tokenPayload = JSON.parse(window.atob(base64));

    const userInfo = {
      Username: resolvedUsername || formData.LoginName,
      ClientCode: tokenPayload.ClientCode || tokenPayload.clientcode || tokenPayload.sub
    };

    if (!userInfo.ClientCode) {
      throw new Error('Client code not found in token');
    }

    localStorage.setItem('token', token);
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    const loginTime = new Date().toLocaleString();
    localStorage.setItem('lastLoginTime', loginTime);
    localStorage.setItem('showWelcomeToast', 'true');
    window.dispatchEvent(new Event('rfid-welcome'));

    toast.success(`Welcome ${userInfo.Username}!`, {
      position: "top-right",
      autoClose: 2500,
      closeButton: false,
      icon: false,
      style: { background: 'transparent', boxShadow: 'none', padding: 0 },
      bodyStyle: { padding: 0 },
      render: ({ closeToast, toastProps }) => (
        <ZohoToast closeToast={closeToast} toastProps={toastProps} message={`Welcome ${userInfo.Username}!`} />
      )
    });

    navigate('/analytics');
  };

  const doPasswordLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(getAuthLoginUrl(), formData);

      if (!response.data?.Token) {
        throw new Error('No token received from server');
      }

      try {
        finalizeLogin(response.data.Token);
      } catch (tokenError) {
        console.error('Token parsing error:', tokenError);
        throw new Error('Invalid token format received from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage;
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('lastLoginTime');
        localStorage.removeItem('showWelcomeToast');
        errorMessage = 'Please enter valid username and password';
        navigate('/login', { replace: true });
      } else {
        errorMessage = err.response?.data?.Message || err.message || 'Login failed. Please try again.';
      }
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: err.response?.status === 401 ? 6000 : 3000,
        theme: "colored"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await doPasswordLogin();
  };

  const resetForgotPasswordPrompt = () => {
    setShowForgotPasswordPrompt(false);
    setForgotPasswordLoading(false);
    setForgotPasswordSuccess(false);
    setForgotPasswordData({
      LoginName: '',
      ClientCode: '',
      CurrentPassword: '',
      NewPassword: '',
      ConfirmPassword: '',
    });
  };

  const submitForgotPassword = async () => {
    if (forgotPasswordLoading) return;
    const payload = {
      LoginName: forgotPasswordData.LoginName.trim(),
      ClientCode: forgotPasswordData.ClientCode.trim().toUpperCase(),
      CurrentPassword: forgotPasswordData.CurrentPassword,
      NewPassword: forgotPasswordData.NewPassword,
      ConfirmPassword: forgotPasswordData.ConfirmPassword,
    };

    if (!payload.LoginName || !payload.ClientCode || !payload.CurrentPassword || !payload.NewPassword || !payload.ConfirmPassword) {
      toast.error('LoginName, ClientCode, CurrentPassword, NewPassword and ConfirmPassword are required.', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'colored',
      });
      return;
    }

    if (payload.NewPassword !== payload.ConfirmPassword) {
      toast.error('NewPassword and ConfirmPassword must match.', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'colored',
      });
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const response = await axios.post(getAuthForgotPasswordUrl(), payload);
      const successMessage = response?.data?.Message || 'Password changed successfully.';
      toast.success(successMessage, {
        position: 'top-right',
        autoClose: 2800,
        theme: 'colored',
      });
      setFormData((prev) => ({
        ...prev,
        LoginName: payload.LoginName,
        Password: '',
      }));
      setForgotPasswordSuccess(true);
      setTimeout(() => {
        resetForgotPasswordPrompt();
      }, 1200);
    } catch (err) {
      const errorPayload = err?.response?.data;
      let errorMessage = err?.message || 'Unable to change password.';

      if (Array.isArray(errorPayload) && errorPayload.length) {
        errorMessage = errorPayload.map((item) => item?.description || item?.code).filter(Boolean).join(' ');
      } else if (typeof errorPayload === 'string') {
        errorMessage = errorPayload;
      } else if (errorPayload?.Message || errorPayload?.message) {
        errorMessage = errorPayload?.Message || errorPayload?.message;
      }

      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 4200,
        theme: 'colored',
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const runPasskeyLogin = async (loginName, clientCode) => {
    if (!window.PublicKeyCredential) {
      toast.error('Passkeys require a browser with WebAuthn support.', { position: 'top-right', theme: 'colored' });
      return;
    }
    setPasskeyLoading(true);
    setError('');
    try {
      const optRes = await fetchPasskeyLoginOptions({ loginName, clientCode });
      const sessionId = optRes.sessionId || optRes.SessionId;
      const rawOptions = optRes.options ?? optRes.Options;
      if (!sessionId || !rawOptions) {
        throw new Error(optRes?.message || optRes?.Message || 'Passkey login options failed.');
      }
      const publicKey = toPublicKeyRequestOptions(rawOptions);
      const credential = await navigator.credentials.get({ publicKey });
      if (!credential) {
        throw new Error('Passkey sign-in was cancelled.');
      }
      const verifyRes = await verifyPasskeyLogin({ sessionId, credential });
      const token = extractJwtFromLoginPayload(verifyRes);
      if (!token) {
        throw new Error('Passkey verified but no token was returned.');
      }
      localStorage.setItem(
        'fingerprintLoginHint',
        JSON.stringify({
          loginName,
          clientCode,
          updatedAt: new Date().toISOString(),
        })
      );
      setShowPasskeyPrompt(false);
      finalizeLogin(token, loginName);
    } catch (err) {
      const backendMessage = err?.response?.data?.message || err?.response?.data?.Message;
      const message = backendMessage || err?.message || 'Passkey login failed.';
      if (err?.name === 'NotAllowedError' || String(message).toLowerCase().includes('cancel')) {
        toast.info('Passkey sign-in was cancelled.', { position: 'top-right', autoClose: 2200 });
      } else {
        setError(message);
        toast.error(message, { position: 'top-right', autoClose: 4000, theme: 'colored' });
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (passkeyLoading || loading || fingerprintLoading) return;
    const effectiveLogin = (formData.LoginName || pkLoginName || fingerprintHint.loginName || '').trim();
    const effectiveClient = (pkClientCode || fingerprintHint.clientCode || '').trim();
    if (!effectiveLogin || !effectiveClient) {
      setPkLoginName(effectiveLogin || pkLoginName);
      setPkClientCode(effectiveClient || pkClientCode);
      setShowPasskeyPrompt(true);
      return;
    }
    await runPasskeyLogin(effectiveLogin, effectiveClient);
  };

  const startPasskeyFromPrompt = async () => {
    if (!pkLoginName.trim()) {
      toast.error('Please enter username.', { position: 'top-right', theme: 'colored' });
      return;
    }
    if (!pkClientCode.trim()) {
      toast.error('Please enter client code.', { position: 'top-right', theme: 'colored' });
      return;
    }
    setFormData((prev) => ({ ...prev, LoginName: pkLoginName.trim() }));
    setShowPasskeyPrompt(false);
    await runPasskeyLogin(pkLoginName.trim(), pkClientCode.trim());
  };

  const runFaceLogin = async (loginName, clientCode) => {
    setFaceLoading(true);
    setError('');
    setFacePopupError('');
    try {
      if (!faceVideoRef.current || !faceCameraReady) {
        throw new Error('Camera is not ready. Please allow camera and try again.');
      }
      const localGuard = getLocalFaceGuard({ loginName, clientCode });
      if (!localGuard?.descriptor || localGuard.descriptor.length !== 128) {
        throw new Error('Face profile is not enrolled on this device for this user. Please open Face Login Settings and register once on this device.');
      }

      try {
        assertFaceFrameQuality(faceVideoRef.current);
      } catch (qualityError) {
        if (faceTracking.quality !== 'good') {
          throw qualityError;
        }
      }
      const descriptor = await extractStableDescriptorFromVideo(faceVideoRef.current);
      const firstMatch = matchFaceWithReference(descriptor, localGuard.descriptor);
      if (!firstMatch.matched) {
        throw new Error('Face mismatch with registered profile.');
      }

      // Require a second stable sample to reduce false accepts.
      const secondDescriptor = await extractStableDescriptorFromVideo(faceVideoRef.current, {
        sampleCount: 3,
        sampleGapMs: 200,
        maxSpread: 0.45,
      });
      const secondMatch = matchFaceWithReference(secondDescriptor, localGuard.descriptor);
      if (!secondMatch.matched) {
        throw new Error('Face mismatch on verification pass.');
      }
      if (faceDistance(descriptor, secondDescriptor) > 0.27) {
        throw new Error('Face verification is unstable. Keep same face centered and retry.');
      }
      const imageBase64 = await captureVideoFrame(faceVideoRef.current);
      const response = await loginWithFace({
        loginName,
        clientCode,
        descriptor,
        imageBase64,
        livenessPassed: faceTracking.quality === 'good',
      });
      const token = extractJwtFromLoginPayload(response);
      if (!token) throw new Error('Face login succeeded but no token was returned.');
      localStorage.setItem(
        'fingerprintLoginHint',
        JSON.stringify({
          loginName,
          clientCode,
          updatedAt: new Date().toISOString(),
        })
      );
      setShowFacePrompt(false);
      stopFaceStream();
      finalizeLogin(token, loginName);
    } catch (err) {
      const backendMessage = err?.response?.data?.message || err?.response?.data?.Message;
      const message = getFaceLoginPopupMessage(backendMessage || err?.message || 'Face login failed.');
      setFacePopupError(message);
    } finally {
      setFaceLoading(false);
    }
  };

  const handleFaceLogin = async () => {
    if (faceLoading || loading || fingerprintLoading || passkeyLoading) return;
    setFaceLoginName('');
    setFaceClientCode('');
    setFacePreviewError('');
    setFacePopupError('');
    setFaceTracking({ faceCount: 0, quality: 'no_face', message: 'Align your face in the frame' });
    setShowFacePrompt(true);
    toast.info('Enter username and client code for Face ID login.', {
      position: 'top-right',
      autoClose: 2200,
    });
  };

  const startFaceLoginFromPrompt = async () => {
    const loginName = faceLoginName.trim();
    const clientCode = faceClientCode.trim().toUpperCase();
    if (!loginName) {
      toast.error('Please enter username for Face ID login.', { position: 'top-right', theme: 'colored' });
      return;
    }
    if (!clientCode) {
      toast.error('Please enter client code for Face ID login.', { position: 'top-right', theme: 'colored' });
      return;
    }
    if (faceTracking.quality !== 'good') {
      toast.error('Face tracking is not locked. Keep one face centered and retry.', {
        position: 'top-right',
        theme: 'colored',
      });
      return;
    }
    try {
      const statusRes = await getFaceStatus({ loginName, clientCode });
      const payload = statusRes?.data ?? statusRes;
      const isRegistered = !!(payload?.isRegistered ?? payload?.IsRegistered ?? payload?.registered);
      if (!isRegistered) {
        toast.info('Face not registered for this Username + Client Code. Please register first.', {
          position: 'top-right',
          autoClose: 3200,
        });
        navigate(`/face-register?loginName=${encodeURIComponent(loginName)}&clientCode=${encodeURIComponent(clientCode)}`);
        return;
      }
    } catch (err) {
      const backendMessage = err?.response?.data?.message || err?.response?.data?.Message;
      toast.error(backendMessage || err?.message || 'Unable to verify face registration status.', {
        position: 'top-right',
        autoClose: 3200,
        theme: 'colored',
      });
      return;
    }
    setFormData((prev) => ({ ...prev, LoginName: loginName }));
    await runFaceLogin(loginName, clientCode);
  };

  const handleFingerprintLogin = async () => {
    if (fingerprintLoading || loading || passkeyLoading) return;

    const effectiveClientCode = (
      fingerprintClientCode ||
      fingerprintHint.clientCode
    ).trim();

    if (!effectiveClientCode) {
      setShowFingerprintPrompt(true);
      return;
    }

    setFingerprintLoading(true);
    setError('');
    try {
      const parsedUserInfo = (() => {
        try {
          const raw = localStorage.getItem('userInfo');
          return raw ? JSON.parse(raw) : {};
        } catch {
          return {};
        }
      })();
      const clientCode = (
        parsedUserInfo?.ClientCode ||
        parsedUserInfo?.clientCode ||
        parsedUserInfo?.clientcode ||
        fingerprintClientCode ||
        fingerprintHint.clientCode
      || '').trim();

      if (!clientCode) {
        throw new Error('Client code is required for fingerprint login.');
      }

      const challengeRes = await createFingerprintChallenge({
        loginName: (formData.LoginName || fingerprintLoginName || '').trim(),
        clientCode,
      });
      const challengeId = challengeRes?.challengeId || challengeRes?.ChallengeId;
      if (!challengeId) throw new Error('Unable to create fingerprint challenge.');

      let deviceInfoXml = '';
      try {
        const devInfoRes = await getRdDeviceInfo();
        deviceInfoXml = String(devInfoRes?.data || '');
      } catch (_) {
        deviceInfoXml = '';
      }

      const captureRes = await captureRdFingerprint({
        env: 'P',
        fCount: 1,
        fType: 0,
        format: 0,
        pidVer: '2.0',
        timeout: 10000,
      });
      const pidXml = captureRes?.rawResponse || '';
      if (!pidXml) throw new Error('Fingerprint capture response is empty.');

      const verifyRes = await verifyLogin({
        loginName: (formData.LoginName || fingerprintLoginName || '').trim(),
        challengeId,
        pidXml,
        deviceInfoXml,
        clientCode,
      });

      const requiresSecondFactor = !!(
        verifyRes?.requiresSecondFactor
      );
      const transactionId =
        verifyRes?.transactionId ||
        '';

      if (!requiresSecondFactor || !transactionId) {
        throw new Error('Fingerprint capture accepted but second-factor transaction was not returned.');
      }
      const resolvedLoginName = (formData.LoginName || fingerprintLoginName || '').trim();
      setFingerprintTransactionId(transactionId);
      setSecondFactorOtp('');
      setSecondFactorPin('');
      setShowSecondFactorPrompt(true);
      setFingerprintClientCode(clientCode);
      localStorage.setItem('fingerprintLoginHint', JSON.stringify({
        loginName: resolvedLoginName,
        clientCode,
        updatedAt: new Date().toISOString(),
      }));
      setShowFingerprintPrompt(false);
    } catch (err) {
      const backendMessage = err?.response?.data?.Message || err?.response?.data?.message;
      const message = backendMessage || err.message || 'Fingerprint login failed.';
      setError(message);
      toast.error(message, { position: 'top-right', autoClose: 3500, theme: 'colored' });

      if (formData.Password?.trim()) {
        toast.info('Fingerprint failed. Trying password login fallback.', {
          position: 'top-right',
          autoClose: 2200,
          theme: 'colored',
        });
        await doPasswordLogin();
      }
    } finally {
      setFingerprintLoading(false);
    }
  };

  const completeSecondFactorLogin = async () => {
    const loginName = (formData.LoginName || fingerprintLoginName || '').trim();
    if (!loginName || !fingerprintTransactionId) {
      toast.error('Missing fingerprint transaction context. Please retry fingerprint login.', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'colored',
      });
      return;
    }
    if (!secondFactorOtp.trim() && !secondFactorPin.trim()) {
      toast.error('Enter OTP or PIN to complete login.', {
        position: 'top-right',
        autoClose: 2500,
        theme: 'colored',
      });
      return;
    }

    setSecondFactorLoading(true);
    try {
      const completeRes = await completeFingerprintLogin({
        loginName,
        transactionId: fingerprintTransactionId,
        otp: secondFactorOtp.trim() || undefined,
        pin: secondFactorPin.trim() || undefined,
      });
      const token = completeRes?.Token || completeRes?.token || completeRes?.jwtToken;
      if (!token) throw new Error('Second-factor verification succeeded but token was not returned.');
      setShowSecondFactorPrompt(false);
      finalizeLogin(token, loginName);
    } catch (err) {
      const backendMessage = err?.response?.data?.Message || err?.response?.data?.message;
      toast.error(backendMessage || err?.message || 'Second-factor verification failed.', {
        position: 'top-right',
        autoClose: 3500,
        theme: 'colored',
      });
    } finally {
      setSecondFactorLoading(false);
    }
  };

  const startFingerprintLoginFromPrompt = async () => {
    if (!fingerprintLoginName.trim()) {
      toast.error('Please enter username for fingerprint login.', {
        position: 'top-right',
        autoClose: 2500,
        theme: 'colored',
      });
      return;
    }
    if (!fingerprintClientCode.trim()) {
      toast.error('Please enter client code for fingerprint login.', {
        position: 'top-right',
        autoClose: 2500,
        theme: 'colored',
      });
      return;
    }
    if (fingerprintLoginName.trim()) {
      setFormData((prev) => ({ ...prev, LoginName: fingerprintLoginName.trim() }));
    }
    await handleFingerprintLogin();
  };

  const glassCard = {
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
  };

  const inputGlass = {
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
  };

  const compactAuthBtnBase = {
    borderRadius: 12,
    border: '1px solid rgba(99, 102, 241, 0.2)',
    padding: '9px 10px',
    fontSize: '0.68rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    minHeight: 40,
    whiteSpace: 'nowrap',
  };

  return (
    <>
      <style>{`
        body, html { overflow: hidden !important; height: 100% !important; margin: 0; }
        .login-page-wrapper { animation: fadeIn 0.35s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fpTickPop { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes fpTickDraw { to { stroke-dashoffset: 0; } }
        .fas, .far, .fal, .fab { font-family: "Font Awesome 5 Free" !important; font-weight: 900 !important; display: inline-block !important; font-style: normal !important; line-height: 1 !important; }
        .login-form-input:focus { outline: none; border-color: rgba(99, 102, 241, 0.6) !important; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important; }
        @media (max-width: 900px) {
          .login-info-panel { display: none !important; }
          .login-form-wrap { max-width: 420px !important; margin: 0 auto !important; }
        }
        @media (max-width: 480px) {
          .login-form-card-inner { padding: 20px 18px !important; }
          .login-title { font-size: 1.35rem !important; }
          .login-sub { font-size: 0.7rem !important; }
        }
      `}</style>
      <div
        className="login-page-wrapper"
        style={{
          minHeight: '100vh',
          height: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', 'Poppins', sans-serif",
          position: 'fixed',
          top: 0,
          left: 0,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #e0e7ff 0%, #f5f3ff 25%, #faf5ff 50%, #fef3f2 75%, #eff6ff 100%)',
        }}
      >
        {showFingerprintPrompt && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.35)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}>
            <div style={{
              width: '100%',
              maxWidth: 430,
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 45px rgba(2, 6, 23, 0.2)',
              padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <i className="fas fa-fingerprint" style={{ color: '#4f46e5', fontSize: 20 }} />
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.08rem' }}>Fingerprint Login</h3>
              </div>
              <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: '0.85rem' }}>
                Enter username and client code to continue fingerprint verification.
              </p>
              <input
                type="text"
                value={fingerprintLoginName}
                onChange={(e) => setFingerprintLoginName(e.target.value)}
                placeholder="Username"
                style={{
                  width: '100%',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '10px 12px',
                  marginBottom: 14,
                  fontSize: '0.9rem',
                }}
              />
              <input
                type="text"
                value={fingerprintClientCode}
                onChange={(e) => setFingerprintClientCode(e.target.value)}
                placeholder="Client Code (e.g. LS000410)"
                style={{
                  width: '100%',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '10px 12px',
                  marginBottom: 14,
                  fontSize: '0.9rem',
                }}
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowFingerprintPrompt(false)}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#334155',
                    borderRadius: 10,
                    padding: '9px 14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={startFingerprintLoginFromPrompt}
                  style={{
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '9px 14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {showSecondFactorPrompt && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.35)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}>
            <div style={{
              width: '100%',
              maxWidth: 430,
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 45px rgba(2, 6, 23, 0.2)',
              padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <i className="fas fa-shield-alt" style={{ color: '#4f46e5', fontSize: 20 }} />
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.08rem' }}>Complete Secure Login</h3>
              </div>
              <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: '0.85rem' }}>
                Fingerprint accepted. Enter OTP or PIN to complete login.
              </p>
              <input
                type="text"
                value={secondFactorOtp}
                onChange={(e) => setSecondFactorOtp(e.target.value)}
                placeholder="OTP"
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', marginBottom: 10, fontSize: '0.9rem' }}
              />
              <input
                type="password"
                value={secondFactorPin}
                onChange={(e) => setSecondFactorPin(e.target.value)}
                placeholder="PIN"
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: '0.9rem' }}
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowSecondFactorPrompt(false)}
                  style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 10, padding: '9px 14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={completeSecondFactorLogin}
                  disabled={secondFactorLoading}
                  style={{ border: 'none', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#fff', borderRadius: 10, padding: '9px 14px', fontWeight: 700, cursor: 'pointer', opacity: secondFactorLoading ? 0.8 : 1 }}
                >
                  {secondFactorLoading ? 'Verifying...' : 'Verify & Login'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showPasskeyPrompt && (
          <div style={modalOverlayStyle}>
            <div style={modalCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <i className="fas fa-key" style={{ color: '#0d9488', fontSize: 20 }} />
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem' }}>Sign in with passkey</h3>
              </div>
              <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '0.84rem', lineHeight: 1.45 }}>
                Enter the same username and client code as your Sparkle account. Your browser will ask you to use your saved passkey or security key.
              </p>
              <input
                type="text"
                value={pkLoginName}
                onChange={(e) => setPkLoginName(e.target.value)}
                placeholder="Username"
                style={modalInputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = '#5eead4';
                  e.target.style.boxShadow = '0 0 0 3px rgba(45, 212, 191, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d5deeb';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <input
                type="text"
                value={pkClientCode}
                onChange={(e) => setPkClientCode(e.target.value)}
                placeholder="Client code (e.g. LS000410)"
                style={modalInputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = '#a5b4fc';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.18)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d5deeb';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowPasskeyPrompt(false)} style={modalBtnGhost}>
                  Cancel
                </button>
                <button type="button" onClick={startPasskeyFromPrompt} style={modalBtnPrimary}>
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {showForgotPasswordPrompt && (
          <div style={modalOverlayStyle}>
            <div
              style={{
                ...modalCardStyle,
                maxWidth: 430,
                borderRadius: 14,
                padding: 18,
                border: '1px solid #dbe4f0',
                boxShadow: '0 16px 34px rgba(15, 23, 42, 0.14)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: '#4f46e5',
                  }}
                >
                  <i className="fas fa-unlock-alt" style={{ fontSize: 12 }} />
                </span>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '0.92rem', fontWeight: 700 }}>Change password</h3>
              </div>
              <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '0.73rem', lineHeight: 1.4 }}>
                Enter your username, client code, current password, and new password.
              </p>
              {forgotPasswordSuccess ? (
                <div style={{ padding: '8px 0 4px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      margin: '0 auto 10px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: 'fpTickPop 300ms ease-out forwards',
                    }}
                  >
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M5 12.5l4.2 4.2L19 7.8"
                        stroke="#fff"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: 'fpTickDraw 360ms 120ms ease forwards' }}
                      />
                    </svg>
                  </div>
                  <div style={{ color: '#166534', fontSize: '0.82rem', fontWeight: 700 }}>Password changed successfully</div>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    name="LoginName"
                    value={forgotPasswordData.LoginName}
                    onChange={handleForgotPasswordChange}
                    placeholder="Username"
                    style={{ ...modalInputStyle, fontSize: '0.78rem', padding: '9px 11px', borderRadius: 9, marginBottom: 9, background: '#fbfdff' }}
                  />
                  <input
                    type="text"
                    name="ClientCode"
                    value={forgotPasswordData.ClientCode}
                    onChange={handleForgotPasswordChange}
                    placeholder="Client code (e.g. LS000410)"
                    style={{ ...modalInputStyle, fontSize: '0.78rem', padding: '9px 11px', borderRadius: 9, marginBottom: 9, background: '#fbfdff' }}
                  />
                  <input
                    type="password"
                    name="CurrentPassword"
                    value={forgotPasswordData.CurrentPassword}
                    onChange={handleForgotPasswordChange}
                    placeholder="Current password"
                    style={{ ...modalInputStyle, fontSize: '0.78rem', padding: '9px 11px', borderRadius: 9, marginBottom: 9, background: '#fbfdff' }}
                  />
                  <input
                    type="password"
                    name="NewPassword"
                    value={forgotPasswordData.NewPassword}
                    onChange={handleForgotPasswordChange}
                    placeholder="New password"
                    style={{ ...modalInputStyle, fontSize: '0.78rem', padding: '9px 11px', borderRadius: 9, marginBottom: 9, background: '#fbfdff' }}
                  />
                  <input
                    type="password"
                    name="ConfirmPassword"
                    value={forgotPasswordData.ConfirmPassword}
                    onChange={handleForgotPasswordChange}
                    placeholder="Confirm new password"
                    style={{ ...modalInputStyle, fontSize: '0.78rem', padding: '9px 11px', borderRadius: 9, marginBottom: 8, background: '#fbfdff' }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
                    <button type="button" onClick={resetForgotPasswordPrompt} style={{ ...modalBtnGhost, fontSize: '0.76rem', padding: '8px 12px', borderRadius: 9 }}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitForgotPassword}
                      disabled={forgotPasswordLoading}
                      style={{ ...modalBtnPrimary, fontSize: '0.76rem', padding: '8px 12px', borderRadius: 9, opacity: forgotPasswordLoading ? 0.75 : 1 }}
                    >
                      {forgotPasswordLoading ? 'Updating...' : 'Update password'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {showFacePrompt && (
          <div style={modalOverlayStyle}>
            <div style={{ ...modalCardStyle, maxWidth: 460 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <i className="fas fa-camera" style={{ color: '#7c3aed', fontSize: 20 }} />
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem' }}>Sign in with Face ID</h3>
              </div>
              <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '0.84rem', lineHeight: 1.45 }}>
                Keep your face centered and ensure good lighting before capture.
              </p>
              <input type="text" value={faceLoginName} onChange={(e) => setFaceLoginName(e.target.value)} placeholder="Username" style={modalInputStyle} />
              <input type="text" value={faceClientCode} onChange={(e) => setFaceClientCode(e.target.value)} placeholder="Client code (e.g. LS000410)" style={{ ...modalInputStyle, marginBottom: 10 }} />
              <div style={{ border: '1px solid #d5deeb', borderRadius: 12, background: '#0f172a', padding: 6, marginBottom: 8, position: 'relative' }}>
                <video ref={faceVideoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 8, minHeight: 190, objectFit: 'cover', background: '#111827' }} />
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
                      faceTracking.quality === 'good'
                        ? 'rgba(22,163,74,0.9)'
                        : faceTracking.quality === 'multiple_faces'
                          ? 'rgba(220,38,38,0.9)'
                          : 'rgba(30,64,175,0.9)',
                  }}
                >
                  {faceTracking.message}
                </div>
              </div>
              {!!facePopupError && (
                <div style={{ marginBottom: 10, color: '#b91c1c', fontSize: '0.8rem' }}>{facePopupError}</div>
              )}
              {!!facePreviewError && (
                <div style={{ marginBottom: 10, color: '#b91c1c', fontSize: '0.8rem' }}>{facePreviewError}</div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowFacePrompt(false)} style={modalBtnGhost}>
                  Cancel
                </button>
                <button type="button" onClick={startFaceLoginFromPrompt} disabled={faceLoading || !faceCameraReady || faceTracking.quality !== 'good'} style={{ ...modalBtnPrimary, opacity: faceLoading || !faceCameraReady || faceTracking.quality !== 'good' ? 0.7 : 1 }}>
                  {faceLoading ? 'Verifying...' : 'Capture & Login'}
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer
          position="bottom-center"
          hideProgressBar
          closeOnClick
          draggable={false}
          pauseOnHover
          style={{ background: 'transparent', boxShadow: 'none', zIndex: 9999, pointerEvents: 'none' }}
          toastStyle={{ background: 'transparent', boxShadow: 'none', padding: 0, maxWidth: 420, margin: '0 auto', pointerEvents: 'auto' }}
          bodyStyle={{ padding: 0 }}
          newestOnTop
        />

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(12px, 2.5vw, 24px)',
            minHeight: 0,
            overflow: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'center',
              gap: 'clamp(16px, 3vw, 24px)',
              width: '100%',
              maxWidth: 820,
              minHeight: 0,
              flexWrap: 'wrap',
            }}
          >
            {/* Form card - compact glass */}
            <div
              className="login-form-wrap"
              style={{
                flex: '1 1 380px',
                minWidth: 280,
                maxWidth: 420,
                borderRadius: 20,
                overflow: 'hidden',
                ...glassCard,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'min(520px, 85vh)',
              }}
            >
              <div
                className="login-form-card-inner"
                style={{
                  padding: 'clamp(20px, 3vw, 28px)',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: 'clamp(14px, 2vw, 20px)' }}>
                  <img
                    src={`${process.env.PUBLIC_URL || ''}/Logo/Sparkle%20RFID%20svg.svg`}
                    alt="Sparkle RFID"
                    style={{ height: 32, width: 'auto', marginBottom: 10 }}
                    onError={(e) => { e.target.onerror = null; e.target.src = `${process.env.PUBLIC_URL || ''}/Logo/LSlogo.png`; }}
                  />
                  <h1 className="login-title" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                    Login to RFID Dashboard
                  </h1>
                  <p className="login-sub" style={{ color: '#6366f1', fontSize: '0.75rem', fontWeight: 500, margin: 0 }}>
                    Smart Tracking • Secure Access
                  </p>
                </div>

                {error && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#b91c1c',
                    padding: '8px 12px',
                    borderRadius: 10,
                    marginBottom: 14,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                  }}>
                    <i className="fas fa-exclamation-circle" style={{ fontSize: 12 }}></i>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-user" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6366f1', fontSize: 14, zIndex: 1 }}></i>
                    <input
                      type="text"
                      name="LoginName"
                      value={formData.LoginName}
                      onChange={handleChange}
                      required
                      placeholder="Username"
                      className="login-form-input"
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 40px',
                        fontSize: '0.8rem',
                        color: '#1e1b4b',
                        borderRadius: 12,
                        fontWeight: 400,
                        transition: 'all 0.2s',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        ...inputGlass,
                      }}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-lock" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6366f1', fontSize: 14, zIndex: 1 }}></i>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="Password"
                      value={formData.Password}
                      onChange={handleChange}
                      required
                      placeholder="Password"
                      className="login-form-input"
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 40px',
                        fontSize: '0.8rem',
                        color: '#1e1b4b',
                        borderRadius: 12,
                        fontWeight: 400,
                        transition: 'all 0.2s',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        ...inputGlass,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: 4,
                        zIndex: 1,
                        fontSize: 14,
                      }}
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || fingerprintLoading || passkeyLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: (loading || fingerprintLoading || passkeyLoading) ? 'not-allowed' : 'pointer',
                      opacity: (loading || fingerprintLoading || passkeyLoading) ? 0.8 : 1,
                      transition: 'all 0.2s',
                      fontFamily: 'inherit',
                      marginTop: 4,
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt" style={{ fontSize: 12 }}></i>
                        <span>Login</span>
                      </>
                    )}
                  </button>

                  <div style={{ marginTop: 2 }}>
                    <p style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Quick sign-in
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                      <button
                        type="button"
                        onClick={handleFingerprintLogin}
                        disabled={loading || fingerprintLoading || passkeyLoading || faceLoading}
                        style={{
                          ...compactAuthBtnBase,
                          background: 'rgba(255,255,255,0.75)',
                          color: '#3730a3',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          cursor: (loading || fingerprintLoading || passkeyLoading || faceLoading) ? 'not-allowed' : 'pointer',
                          opacity: (loading || fingerprintLoading || passkeyLoading || faceLoading) ? 0.72 : 1,
                        }}
                        title="Login with Fingerprint"
                      >
                        {fingerprintLoading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <i className="fas fa-fingerprint" style={{ fontSize: 12 }}></i>}
                        <span>{fingerprintLoading ? 'Checking' : 'Fingerprint'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePasskeyLogin}
                        disabled={loading || fingerprintLoading || passkeyLoading || faceLoading}
                        style={{
                          ...compactAuthBtnBase,
                          background: 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(99,102,241,0.08) 100%)',
                          color: '#0f766e',
                          border: '1px solid rgba(13, 148, 136, 0.3)',
                          cursor: (loading || fingerprintLoading || passkeyLoading || faceLoading) ? 'not-allowed' : 'pointer',
                          opacity: (loading || fingerprintLoading || passkeyLoading || faceLoading) ? 0.72 : 1,
                        }}
                        title="Sign in with passkey"
                      >
                        {passkeyLoading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <i className="fas fa-key" style={{ fontSize: 12 }}></i>}
                        <span>{passkeyLoading ? 'Waiting' : 'Passkey'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleFaceLogin}
                        disabled={loading || fingerprintLoading || passkeyLoading || faceLoading}
                        style={{
                          ...compactAuthBtnBase,
                          background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.08) 100%)',
                          color: '#6d28d9',
                          border: '1px solid rgba(124, 58, 237, 0.3)',
                          cursor: (loading || fingerprintLoading || passkeyLoading || faceLoading) ? 'not-allowed' : 'pointer',
                          opacity: (loading || fingerprintLoading || passkeyLoading || faceLoading) ? 0.72 : 1,
                        }}
                        title="Sign in with Face ID"
                      >
                        {faceLoading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <i className="fas fa-camera" style={{ fontSize: 12 }}></i>}
                        <span>{faceLoading ? 'Verifying' : 'Face ID'}</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.7rem', marginTop: 2 }}>
                    <span style={{ color: '#64748b' }}>Forgot password?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotPasswordData({
                          LoginName: formData.LoginName || '',
                          ClientCode: '',
                          CurrentPassword: '',
                          NewPassword: '',
                          ConfirmPassword: '',
                        });
                        setShowForgotPasswordPrompt(true);
                      }}
                      style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Reset
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.7rem', paddingTop: 12, marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.5)' }}>
                    <span style={{ color: '#64748b' }}>Don't have an account?</span>
                    <button type="button" onClick={() => navigate('/register')} style={{ background: 'none', border: 'none', color: '#8b5cf6', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                      <i className="fas fa-user-plus" style={{ fontSize: 11 }}></i>
                      <span>Register</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: Glass info panel - hidden on small screens */}
            <div
              className="login-info-panel"
              style={{
                flex: '1 1 340px',
                minWidth: 280,
                maxWidth: 380,
                borderRadius: 20,
                overflow: 'hidden',
                ...glassCard,
                padding: 'clamp(20px, 2.5vw, 28px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                maxHeight: 'min(520px, 85vh)',
              }}
            >
              <div style={{ width: '100%', textAlign: 'center', transition: 'all 0.4s', opacity: animating ? 0 : 1, transform: animating ? 'translateY(12px)' : 'translateY(0)' }}>
                <img
                  src={infoSlides[slide].img}
                  alt={infoSlides[slide].title}
                  style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 14, marginBottom: 14 }}
                />
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 8px 0' }}>{infoSlides[slide].title}</h2>
                <p style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 14px 0' }}>{infoSlides[slide].desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
                  {['Real-time Sync', 'Analytics', 'Secure', 'Fast'].map((label, i) => (
                    <span key={i} style={{ padding: '4px 10px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: 8, fontSize: '0.65rem', color: '#6366f1', fontWeight: 500 }}>
                      {label}
                    </span>
                  ))}
                </div>
                <a href={infoSlides[slide].link} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', borderRadius: 10, padding: '8px 20px', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'none', fontFamily: 'inherit',
                }}>
                  <i className="fas fa-arrow-right" style={{ fontSize: 10 }}></i> Learn more
                </a>
              </div>
            </div>
          </div>
        </div>

        {getApiMode() === 'offline' && (
          <>
            <button
              type="button"
              onClick={() => setShowOfflineApiModal(true)}
              style={{
                position: 'fixed',
                right: 20,
                bottom: 52,
                zIndex: 120,
                maxWidth: 'min(calc(100vw - 40px), 320px)',
                padding: '12px 16px',
                borderRadius: 14,
                border: '1px solid rgba(99, 102, 241, 0.35)',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(99, 102, 241, 0.15)',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.12) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4f46e5',
                    flexShrink: 0,
                  }}
                >
                  <i className="fas fa-server" style={{ fontSize: 15 }} aria-hidden />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                    Configure API servers
                  </span>
                  <span style={{ display: 'block', marginTop: 4, fontSize: '0.68rem', color: '#64748b', lineHeight: 1.4 }}>
                    Set Soni (ProductMaster) &amp; RRGOLD base URLs for this PC. Saved addresses apply to the whole app.
                  </span>
                </span>
              </span>
            </button>

            {showOfflineApiModal && (
              <div
                role="presentation"
                style={{
                  ...modalOverlayStyle,
                  zIndex: 10020,
                }}
                onClick={() => setShowOfflineApiModal(false)}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="offline-api-modal-title"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    ...modalCardStyle,
                    maxWidth: 480,
                    width: '100%',
                    maxHeight: 'min(90vh, 640px)',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <div>
                      <h2 id="offline-api-modal-title" style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem', fontWeight: 800 }}>
                        Offline API server URLs
                      </h2>
                      <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.8rem', lineHeight: 1.45 }}>
                        Defaults: <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 6 }}>http://localhost:8080</code> (Soni) and{' '}
                        <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 6 }}>http://localhost:8081</code> (RRGOLD). Use Save to apply across the entire application.
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setShowOfflineApiModal(false)}
                      style={{
                        border: 'none',
                        background: 'rgba(15,23,42,0.06)',
                        color: '#64748b',
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        cursor: 'pointer',
                        flexShrink: 0,
                        fontSize: 18,
                        lineHeight: 1,
                      }}
                    >
                      &times;
                    </button>
                  </div>
                  <OfflineApiBaseSettingsForm variant="page" onApplied={() => setShowOfflineApiModal(false)} />
                </div>
              </div>
            )}
          </>
        )}

        <footer style={{
          padding: '8px 12px',
          textAlign: 'center',
          fontSize: '0.65rem',
          color: '#94a3b8',
          fontFamily: 'inherit',
          background: 'rgba(255,255,255,0.3)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(255,255,255,0.4)',
        }}>
          © 2025, LoyalString International Pvt Ltd. All Rights Reserved.
        </footer>
      </div>
    </>
  );
};

export default Login;
