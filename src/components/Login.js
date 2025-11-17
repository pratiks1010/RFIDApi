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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e9eef6 60%, #e3eaf7 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, Poppins, sans-serif',
      padding: '2vw',
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
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        background: 'white',
        borderRadius: '20px',
        border: '1.5px solid #e0e7ef',
        width: '100%',
        maxWidth: 900,
        minHeight: 480,
        boxSizing: 'border-box',
        boxShadow: 'none',
        overflow: 'hidden',
      }}>
        {/* Left: Login Form Card */}
        <div style={{
          flex: 1.1,
          padding: '2.5rem 2.5rem 2.5rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          borderRight: '1.5px solid #f1f5fa',
          minWidth: 340,
      }}>
        {/* Logo and Title Section */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
              background: '#2563eb',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.2rem'
          }}>
            <i className="fas fa-rss" style={{ color: 'white', fontSize: '24px' }}></i>
          </div>
          <img 
            src="/Logo/Sparkle RFID svg.svg" 
            alt="Sparkle RFID" 
            style={{ 
              height: '36px',
              marginBottom: '1rem'
            }}
          />
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#181818',
              marginBottom: '0.5rem',
              fontFamily: 'Inter, Poppins, sans-serif',
          }}>
            RFID Secure API
          </h1>
          <p style={{
              color: '#7b8591',
              fontSize: '0.98rem',
              fontWeight: 500,
              marginTop: 2,
              marginBottom: 0
          }}>
            Login to your account
          </p>
        </div>
        {error && (
          <div style={{
            background: '#fff2f2',
            color: '#d32f2f',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {/* Username Field */}
            <div style={{ marginBottom: '1.2rem' }}>
            <label style={{
              display: 'block',
                marginBottom: '0.35rem',
                color: '#6b7280',
                fontSize: '0.97rem',
                fontWeight: 500,
                letterSpacing: 0.01,
            }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                  left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                  color: '#8b98a9',
                display: 'flex',
                  alignItems: 'center',
                  fontSize: '1.08rem',
              }}>
                <i className="fas fa-user"></i>
              </span>
              <input
                type="text"
                name="LoginName"
                value={formData.LoginName}
                onChange={handleChange}
                required
                placeholder="Enter your username"
                style={{
                  width: '100%',
                    padding: '12px 16px 12px 42px',
                    fontSize: '1.01rem',
                  color: '#181818',
                    background: '#f6f8fa',
                    border: '1px solid #e3e7ed',
                  borderRadius: '8px',
                  fontWeight: 500,
                    transition: 'all 0.2s',
                    fontFamily: 'Inter, Poppins, sans-serif',
                    boxShadow: 'none',
                }}
              />
            </div>
          </div>
          {/* Password Field */}
            <div style={{ marginBottom: '1.7rem' }}>
            <label style={{
              display: 'block',
                marginBottom: '0.35rem',
                color: '#6b7280',
                fontSize: '0.97rem',
                fontWeight: 500,
                letterSpacing: 0.01,
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                  left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                  color: '#8b98a9',
                display: 'flex',
                  alignItems: 'center',
                  fontSize: '1.08rem',
              }}>
                <i className="fas fa-lock"></i>
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
                    padding: '12px 16px 12px 42px',
                    fontSize: '1.01rem',
                  color: '#181818',
                    background: '#f6f8fa',
                    border: '1px solid #e3e7ed',
                  borderRadius: '8px',
                  fontWeight: 500,
                    transition: 'all 0.2s',
                    fontFamily: 'Inter, Poppins, sans-serif',
                    boxShadow: 'none',
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
                    color: '#8b98a9',
                  cursor: 'pointer',
                    padding: '4px',
                    fontSize: '1.08rem',
                }}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>
          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
                padding: '13px',
                background: 'linear-gradient(90deg, #2563eb 60%, #3b82f6 100%)',
                color: '#fff',
              border: 'none',
              borderRadius: '8px',
                fontSize: '1.08rem',
                fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s',
                fontFamily: 'Inter, Poppins, sans-serif',
                boxShadow: 'none',
                marginTop: 8,
                letterSpacing: 0.01,
            }}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                Login
              </>
            )}
          </button>
          {/* Register Link */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 18,
            fontSize: '0.97rem',
            fontFamily: 'Inter, Poppins, sans-serif',
            gap: 6,
          }}>
            <span style={{ color: '#64748b', fontWeight: 500, marginRight: 4 }}>
              Don’t have an account?
            </span>
            <button
              type="button"
              onClick={() => navigate('/register')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontWeight: 700,
                fontSize: '1.01rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 0,
                position: 'relative',
                outline: 'none',
                transition: 'color 0.2s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.color = '#1d4ed8';
              }}
              onMouseOut={e => {
                e.currentTarget.style.color = '#2563eb';
              }}
            >
              <i className="fas fa-user-plus" style={{ fontSize: '1.08em', marginRight: 3 }}></i>
              <span style={{
                borderBottom: '2px solid #2563eb',
                paddingBottom: 1,
                transition: 'border-color 0.2s',
                fontWeight: 700,
              }}>Register</span>
            </button>
          </div>
        </form>
        </div>
        {/* Right: Info Cards Section */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f3f4f6 100%)',
          padding: '32px 18px',
        }}>
          <div
            style={{
              width: '100%',
              maxWidth: 370,
              height: 520,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.4s',
              paddingTop: 18,
              paddingBottom: 18,
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
              }}
            >
              <img
                src={infoSlides[slide].img}
                alt={infoSlides[slide].title}
                style={{ width: 150, height: 150, objectFit: 'contain', borderRadius: 22, marginBottom: 32 }}
              />
              <h2 style={{
                fontFamily: 'Inter, Poppins, sans-serif',
                fontWeight: 700,
                fontSize: 22,
                color: '#232a36',
                letterSpacing: '-0.01em',
                marginBottom: 16,
                textAlign: 'left',
                width: '100%',
                maxWidth: 320,
              }}>{infoSlides[slide].title}</h2>
              <p style={{
                fontFamily: 'Inter, Poppins, sans-serif',
                fontWeight: 400,
                fontSize: 15,
                color: '#64748b',
                marginBottom: 0,
                lineHeight: 1.7,
                letterSpacing: '-0.01em',
                textAlign: 'left',
                width: '100%',
                maxWidth: 320,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}>{infoSlides[slide].desc}</p>
            </div>
            <a
              href={infoSlides[slide].link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(90deg, #2563eb 60%, #38bdf8 100%)',
                color: '#fff',
                borderRadius: '24px',
                padding: '11px 44px',
                fontWeight: 600,
                fontSize: 17,
                textDecoration: 'none',
                boxShadow: 'none',
                fontFamily: 'Inter, Poppins, sans-serif',
                marginTop: 32,
                letterSpacing: '-0.01em',
                transition: 'background 0.2s',
                alignSelf: 'center',
              }}
            >
              Learn more
            </a>
          </div>
        </div>
      </div>
      {/* Copyright bar below the card, centered, with background */}
      <div style={{
        width: '100vw',
        background: '#f5f6fa',
        padding: '18px 0 14px 0',
        textAlign: 'center',
        fontSize: '0.97rem',
        color: '#a0aec0',
        fontFamily: 'Inter, Poppins, sans-serif',
        position: 'fixed',
        left: 0,
        bottom: 0,
        zIndex: 100,
        letterSpacing: 0.1,
      }}>
        © 2025, LoyalString Internation Pvt Ltd. All Rights Reserved.
      </div>
    </div>
  );
};

export default Login;
