import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

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

// Zoho-style Toast component
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
    {/* Gradient accent bar */}
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

// Add slider data for the three sections
const infoSlides = [
  {
    img: '/images/Mobile App.png',
    title: 'Mobile Device Interface',
    desc: 'A handheld mobile device with a user-friendly interface for managing tasks like product listing, inventory tracking, billing, stock reports, and issue tracking. Easily syncs with your RFID system for real-time updates and seamless workflow. Supports barcode and RFID scanning, photo capture, and instant notifications. Designed for reliability and ease of use in demanding environments.',
    link: '#',
  },
  {
    img: '/images/Gate.png',
    title: 'RFID Gate',
    desc: 'A sleek, professional RFID gate designed for seamless inventory management and tracking, branded with "Loyal String." Automates entry/exit logging and enhances security for your assets. Integrates with your ERP and alert systems for real-time monitoring. Built for high-traffic, industrial environments.',
    link: '#',
  },
  {
    img: '/images/RFID GUN.png',
    title: 'RFID Handheld Scanner',
    desc: 'A rugged RFID scanner with a handle, providing efficient and portable scanning capabilities for inventory management. Scan, verify, and audit inventory anywhere in your facility. Long battery life, drop-resistant, and easy to operate. Ideal for stocktaking, audits, and on-the-go asset tracking.',
    link: '#',
  },
];

const Login = () => {
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

  // Add useEffect to check for session expiration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_expired')) {
      toast.error('Your session has expired. Please login again.', {
        position: "top-right",
        autoClose: 5000,
        theme: "colored"
      });
      // Clean up the URL
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  // Update useEffect for auto-slide and animation
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
    if (loading) return; // Prevent double submission
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('https://soni.loyalstring.co.in/api/ProductMaster/AuthLogin', formData);
      
      if (!response.data?.Token) {
        throw new Error('No token received from server');
      }

      const token = response.data.Token;
      
      // Parse the token payload
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

        // Store auth data
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        
        // Store login time
        const loginTime = new Date().toLocaleString();
        localStorage.setItem('lastLoginTime', loginTime);
        localStorage.setItem('showWelcomeToast', 'true');

        // Dispatch custom event for welcome modal
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
      
      // Handle 401 Unauthorized error specifically
      let errorMessage;
      if (err.response?.status === 401) {
        errorMessage = 'Please enter valid username and password';
      } else {
        errorMessage = err.response?.data?.Message || err.message || 'Login failed. Please try again.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: err.response?.status === 401 ? 6000 : 3000, // Show 401 errors for 6 seconds, others for 3 seconds
        theme: "colored"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        body {
          overflow: hidden !important;
          height: 100vh !important;
        }
        html {
          overflow: hidden !important;
          height: 100vh !important;
        }
        .login-page-wrapper {
          animation: fadeInSlide 0.4s ease-out;
        }
        .fas, .far, .fal, .fab {
          font-family: "Font Awesome 5 Free" !important;
          font-weight: 900 !important;
          display: inline-block !important;
          font-style: normal !important;
          font-variant: normal !important;
          text-rendering: auto !important;
          line-height: 1 !important;
        }
        @media (max-width: 968px) {
          .login-container {
            flex-direction: column !important;
            gap: 20px !important;
            max-width: 100% !important;
            max-height: 100% !important;
          }
          .login-form-card {
            max-width: 100% !important;
            height: 48vh !important;
            padding: 28px 24px !important;
          }
          .login-info-card {
            max-width: 100% !important;
            height: 48vh !important;
            padding: 24px 20px !important;
          }
        }
        @media (max-width: 768px) {
          .login-main-content {
            padding: 16px !important;
          }
          .login-form-card {
            padding: 24px 20px !important;
            height: 52vh !important;
          }
          .login-info-card {
            height: 52vh !important;
          }
        }
        @media (max-width: 480px) {
          .login-form-card {
            padding: 32px 24px !important;
          }
          .login-welcome-title {
            font-size: 24px !important;
          }
          .login-welcome-subtitle {
            font-size: 12px !important;
          }
          .login-info-image {
            width: 120px !important;
            height: 120px !important;
          }
          .login-info-title {
            font-size: 18px !important;
          }
          .login-info-text {
            font-size: 11px !important;
          }
          .login-info-button {
            padding: 10px 24px !important;
            font-size: 11px !important;
          }
        }
      `}</style>
      <div className="login-page-wrapper" style={{
        height: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #f0f4f8 0%, #e8edf3 50%, #e0e8f0 100%)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, Poppins, sans-serif',
        padding: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden',
      }}>
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
      
        {/* Main Content Area */}
        <div className="login-main-content" style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          height: '100%',
          overflow: 'hidden',
        }}>
          <div className="login-container" style={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            maxWidth: '850px',
            gap: '24px',
            alignItems: 'center',
            maxHeight: '600px',
          }}>
            {/* Left: Login Form Card */}
            <div className="login-form-card" style={{
              flex: '1',
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(25px) saturate(180%)',
              WebkitBackdropFilter: 'blur(25px) saturate(180%)',
              borderRadius: '20px',
              padding: '32px 28px',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              minWidth: 0,
              maxWidth: '420px',
              height: '520px',
              overflow: 'hidden',
            }}>
            {/* Welcome Section */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              {/* Logo Icon */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '16px',
              }}>
                <img 
                  src="/Logo/Sparkle RFID svg.svg" 
                  alt="Sparkle RFID" 
                  style={{ 
                    height: '38px',
                    width: 'auto',
                  }}
                />
              </div>
              <h1 className="login-welcome-title" style={{
                fontSize: '26px',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '10px',
                marginTop: '0',
                fontFamily: 'Inter, Poppins, sans-serif',
                letterSpacing: '-0.01em',
              }}>
                Login to RFID Dashboard
              </h1>
              <p className="login-welcome-subtitle" style={{
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 400,
                marginTop: '0',
                marginBottom: '8px',
                lineHeight: '1.5',
              }}>
                Enter your credentials to access your account.
              </p>
              <p style={{
                color: '#94a3b8',
                fontSize: '11px',
                fontWeight: 400,
                marginTop: '0',
                marginBottom: '0',
                lineHeight: '1.4',
              }}>
                Smart Tracking • Secure Access
              </p>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '24px',
                fontSize: '11px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid #fecaca',
              }}>
                <i className="fas fa-exclamation-circle" style={{ fontSize: '14px' }}></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              {/* Username Field */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#2974e9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1,
                      pointerEvents: 'none',
                    }}>
                      <i className="fas fa-user" style={{ fontSize: '16px' }}></i>
                    </span>
                  <input
                    type="text"
                    name="LoginName"
                    value={formData.LoginName}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 44px',
                      fontSize: '12px',
                      color: '#1e293b',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      fontWeight: 400,
                      transition: 'all 0.2s',
                      fontFamily: 'Inter, Poppins, sans-serif',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#2974e9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}>
                    <i className="fas fa-lock" style={{ fontSize: '16px' }}></i>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="Password"
                    value={formData.Password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 44px',
                      fontSize: '12px',
                      color: '#1e293b',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      fontWeight: 400,
                      transition: 'all 0.2s',
                      fontFamily: 'Inter, Poppins, sans-serif',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2974e9';
                        e.target.style.boxShadow = '0 0 0 3px rgba(41, 116, 233, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                        minWidth: '24px',
                        minHeight: '24px',
                      }}
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '16px' }}></i>
                    </button>
                  </div>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'linear-gradient(90deg, #2974e9 0%, #60a5fa 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    transition: 'all 0.2s',
                    fontFamily: 'Inter, Poppins, sans-serif',
                    marginBottom: '22px',
                  }}
                  onMouseOver={(e) => {
                    if (!loading) {
                      e.target.style.background = 'linear-gradient(90deg, #1e5fc7 0%, #2974e9 100%)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!loading) {
                      e.target.style.background = 'linear-gradient(90deg, #2974e9 0%, #60a5fa 100%)';
                    }
                  }}
                >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt" style={{ fontSize: '14px' }}></i>
                    <span>Login</span>
                  </>
                )}
              </button>

              {/* Forgot Password Link */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontFamily: 'Inter, Poppins, sans-serif',
                gap: '4px',
                marginBottom: '20px',
              }}>
                <span style={{ color: '#64748b', fontWeight: 400 }}>
                  Forgot your password?
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2974e9',
                    fontWeight: 600,
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: 0,
                    outline: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = '#1e5fc7';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = '#2974e9';
                  }}
                >
                  Reset Password
                </button>
              </div>

              {/* Register Link */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '20px',
                fontSize: '11px',
                fontFamily: 'Inter, Poppins, sans-serif',
                gap: '4px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(226, 232, 240, 0.6)',
              }}>
                <span style={{ color: '#64748b', fontWeight: 400 }}>
                  Don't have an account?
                </span>
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2974e9',
                      fontWeight: 600,
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                      outline: 'none',
                      transition: 'color 0.2s',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.color = '#1e5fc7';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.color = '#2974e9';
                    }}
                  >
                    <i className="fas fa-user-plus" style={{ fontSize: '14px' }}></i>
                    <span>Register</span>
                  </button>
              </div>
            </form>
          </div>

          {/* Right: Info Cards Section */}
          <div className="login-info-card" style={{
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(248, 250, 252, 0.65)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            borderRadius: '20px',
            padding: '32px 24px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            maxWidth: '400px',
            height: '520px',
            overflow: 'hidden',
          }}>
            <div
              style={{
                width: '100%',
                maxWidth: 400,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.4s',
                minHeight: 'auto',
                height: '100%',
              }}
            >
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'all 0.4s',
                  opacity: animating ? 0 : 1,
                  transform: animating ? 'translateY(30px)' : 'translateY(0)',
                  pointerEvents: animating ? 'none' : 'auto',
                  flex: 1,
                }}
              >
                <img
                  src={infoSlides[slide].img}
                  alt={infoSlides[slide].title}
                  className="login-info-image"
                  style={{ 
                    width: '150px', 
                    height: '150px', 
                    objectFit: 'contain', 
                    borderRadius: '16px', 
                    marginBottom: '28px',
                  }}
                />
                <h2 className="login-info-title" style={{
                  fontFamily: 'Inter, Poppins, sans-serif',
                  fontWeight: 700,
                  fontSize: '22px',
                  color: '#1e293b',
                  letterSpacing: '-0.01em',
                  marginBottom: '16px',
                  textAlign: 'center',
                  width: '100%',
                }}>{infoSlides[slide].title}</h2>
                <p className="login-info-text" style={{
                  fontFamily: 'Inter, Poppins, sans-serif',
                  fontWeight: 400,
                  fontSize: '13px',
                  color: '#64748b',
                  marginBottom: '20px',
                  lineHeight: 1.7,
                  letterSpacing: '-0.01em',
                  textAlign: 'center',
                  width: '100%',
                }}>{infoSlides[slide].desc}</p>
                
                {/* Additional Features List */}
                <div style={{
                  width: '100%',
                  marginTop: '8px',
                  marginBottom: '24px',
                }}>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'nowrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                    width: '100%',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      background: 'rgba(41, 116, 233, 0.1)',
                      borderRadius: '8px',
                      fontSize: '10px',
                      color: '#2974e9',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      <i className="fas fa-sync-alt" style={{ fontSize: '9px' }}></i>
                      <span>Real-time Sync</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      background: 'rgba(41, 116, 233, 0.1)',
                      borderRadius: '8px',
                      fontSize: '10px',
                      color: '#2974e9',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      <i className="fas fa-chart-line" style={{ fontSize: '9px' }}></i>
                      <span>Analytics</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      background: 'rgba(41, 116, 233, 0.1)',
                      borderRadius: '8px',
                      fontSize: '10px',
                      color: '#2974e9',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      <i className="fas fa-shield-alt" style={{ fontSize: '9px' }}></i>
                      <span>Secure</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      background: 'rgba(41, 116, 233, 0.1)',
                      borderRadius: '8px',
                      fontSize: '10px',
                      color: '#2974e9',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      <i className="fas fa-bolt" style={{ fontSize: '9px' }}></i>
                      <span>Fast</span>
                    </div>
                  </div>
                  
                  <p style={{
                    fontFamily: 'Inter, Poppins, sans-serif',
                    fontWeight: 400,
                    fontSize: '11px',
                    color: '#94a3b8',
                    marginTop: '12px',
                    marginBottom: 0,
                    lineHeight: 1.6,
                    textAlign: 'center',
                    width: '100%',
                  }}>
                    Streamline your operations with advanced RFID technology and seamless integration capabilities.
                  </p>
                </div>
              </div>
                <a
                  href={infoSlides[slide].link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="login-info-button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'linear-gradient(90deg, #2974e9 0%, #60a5fa 100%)',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '12px 32px',
                    fontWeight: 600,
                    fontSize: '12px',
                    textDecoration: 'none',
                    fontFamily: 'Inter, Poppins, sans-serif',
                    marginTop: 'auto',
                    letterSpacing: '-0.01em',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.opacity = '0.9';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.opacity = '1';
                  }}
                >
                  <i className="fas fa-arrow-right" style={{ fontSize: '14px' }}></i>
                  Learn more
                </a>
            </div>
          </div>
        </div>
      </div>

        {/* Copyright Footer */}
        <footer style={{
          width: '100%',
          background: '#f8fafc',
          padding: '16px 0',
          textAlign: 'center',
          fontSize: '10px',
          color: '#94a3b8',
          fontFamily: 'Inter, Poppins, sans-serif',
          letterSpacing: '0.02em',
          borderTop: '1px solid #e2e8f0',
        }}>
          © 2025, LoyalString Internation Pvt Ltd. All Rights Reserved.
        </footer>
      </div>
    </>
  );
};

export default Login;
