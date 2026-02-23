import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useAppDispatch } from '../store/hooks';
import { setCredentials } from '../store/slices/authSlice';
import { userManagementService } from '../services/userManagementService';

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
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({
    LoginName: '',
    Password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [slide, setSlide] = useState(0);
  const [animating, setAnimating] = useState(false);
  const prevSlide = useRef(slide);
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('https://localhost:7095/api/ProductMaster/AuthLogin', formData);
      
      if (!response.data?.Token) {
        throw new Error('No token received from server');
      }

      // Extract all data from API response
      const { Token, IsSubUser, RoleType, Permissions, AllowedBranchIds, HasAllBranchAccess } = response.data;
      const token = Token;
      
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const tokenPayload = JSON.parse(window.atob(base64));
        
        const userInfo = {
          Username: formData.LoginName,
          ClientCode: tokenPayload.ClientCode || tokenPayload.clientcode || tokenPayload.sub
        };

        if (!userInfo.ClientCode) {
          throw new Error('Client code not found in token');
        }

        // Store all authentication data in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        localStorage.setItem('isSubUser', JSON.stringify(IsSubUser || false));
        localStorage.setItem('roleType', JSON.stringify(RoleType || null));
        localStorage.setItem('permissions', JSON.stringify(Permissions || {}));
        localStorage.setItem('allowedBranchIds', JSON.stringify(AllowedBranchIds || null));
        localStorage.setItem('hasAllBranchAccess', JSON.stringify(HasAllBranchAccess || false));
        
        const loginTime = new Date().toLocaleString();
        localStorage.setItem('lastLoginTime', loginTime);
        localStorage.setItem('showWelcomeToast', 'true');

        // Determine user permissions and role from API response
        let permissions = Permissions || {
          CanViewStock: false,
          CanAddStock: false,
          CanEditStock: false,
          CanDeleteStock: false,
          CanManageUsers: false,
          CanViewReports: false,
          CanExportData: false,
          CanViewAllBranches: false,
          CanManageBranches: false,
        };
        
        // Ensure all permission fields are present
        permissions = {
          CanViewStock: permissions.CanViewStock || false,
          CanAddStock: permissions.CanAddStock || false,
          CanEditStock: permissions.CanEditStock || false,
          CanDeleteStock: permissions.CanDeleteStock || false,
          CanManageUsers: permissions.CanManageUsers || false,
          CanViewReports: permissions.CanViewReports || false,
          CanExportData: permissions.CanExportData || false,
          CanViewAllBranches: permissions.CanViewAllBranches || false,
          CanManageBranches: permissions.CanManageBranches || false,
        };
        
        const roleType = RoleType || null;
        const isSubUser = IsSubUser || false;
        // Super Admin is determined by IsSubUser being false
        const isSuperAdmin = !isSubUser;

        // Store credentials in Redux with all data
        dispatch(setCredentials({
          user: userInfo,
          token: token,
          permissions: permissions,
          roleType: roleType,
          isSuperAdmin: isSuperAdmin,
          isSubUser: isSubUser,
          allowedBranchIds: AllowedBranchIds,
          hasAllBranchAccess: HasAllBranchAccess || false,
        }));

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
      } catch (tokenError) {
        console.error('Token parsing error:', tokenError);
        throw new Error('Invalid token format received from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage;
      if (err.response?.status === 401) {
        errorMessage = 'Please enter valid username and password';
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

  return (
    <>
      <style>{`
        body, html { overflow: hidden !important; height: 100% !important; margin: 0; }
        .login-page-wrapper { animation: fadeIn 0.35s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
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
                    disabled={loading}
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
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.8 : 1,
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

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.7rem', marginTop: 2 }}>
                    <span style={{ color: '#64748b' }}>Forgot password?</span>
                    <button type="button" onClick={() => navigate('/forgot-password')} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
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
