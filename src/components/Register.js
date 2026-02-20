import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

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

const Register = () => {
  const [formData, setFormData] = useState({
    Username: '',
    Password: '',
    ClientCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [slide, setSlide] = useState(0);
  const [animating, setAnimating] = useState(false);
  const navigate = useNavigate();

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
      await axios.post('https://soni.loyalstring.co.in/api/ProductMaster/AuthRegister', formData);
      toast.success('Registration successful! Please login.', {
        position: "top-right",
        autoClose: 3000,
        theme: "colored"
      });
      navigate('/login');
    } catch (err) {
      const errorMessage = err.response?.data || 'Registration failed. Please try again.';
      setError(Array.isArray(errorMessage) ? errorMessage.map(e => e.Description).join('\n') : errorMessage);
      toast.error('Registration failed. Please check the requirements.', {
        position: "top-right",
        autoClose: 3000,
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
        .register-page-wrapper { animation: fadeIn 0.35s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .fas, .far, .fal, .fab { font-family: "Font Awesome 5 Free" !important; font-weight: 900 !important; display: inline-block !important; font-style: normal !important; line-height: 1 !important; }
        .reg-form-input:focus { outline: none; border-color: rgba(236, 72, 153, 0.6) !important; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15) !important; }
        @media (max-width: 900px) {
          .register-info-panel { display: none !important; }
          .register-form-wrap { max-width: 420px !important; margin: 0 auto !important; }
        }
        @media (max-width: 480px) {
          .register-form-card-inner { padding: 16px 14px !important; }
          .register-title { font-size: 1.25rem !important; }
          .register-sub { font-size: 0.65rem !important; }
        }
      `}</style>
      <div
        className="register-page-wrapper"
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
          background: 'linear-gradient(135deg, #fdf2f8 0%, #faf5ff 25%, #f5f3ff 50%, #eff6ff 75%, #f0fdfa 100%)',
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
            padding: 'clamp(10px, 2vw, 20px)',
            minHeight: 0,
            overflow: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'center',
              gap: 'clamp(14px, 2.5vw, 22px)',
              width: '100%',
              maxWidth: 820,
              minHeight: 0,
              flexWrap: 'wrap',
            }}
          >
            {/* Left: Glass info panel - hidden on small screens */}
            <div
              className="register-info-panel"
              style={{
                flex: '1 1 320px',
                minWidth: 260,
                maxWidth: 360,
                borderRadius: 20,
                overflow: 'hidden',
                ...glassCard,
                padding: 'clamp(18px, 2vw, 24px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                maxHeight: 'min(500px, 85vh)',
              }}
            >
              <div style={{ width: '100%', textAlign: 'center', transition: 'all 0.4s', opacity: animating ? 0 : 1, transform: animating ? 'translateY(12px)' : 'translateY(0)' }}>
                <img
                  src={infoSlides[slide].img}
                  alt={infoSlides[slide].title}
                  style={{ width: 90, height: 90, objectFit: 'contain', borderRadius: 12, marginBottom: 12 }}
                />
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 6px 0' }}>{infoSlides[slide].title}</h2>
                <p style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.45, margin: '0 0 12px 0' }}>{infoSlides[slide].desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 5 }}>
                  {['Real-time Sync', 'Analytics', 'Secure', 'Fast'].map((label, i) => (
                    <span key={i} style={{ padding: '3px 8px', background: 'rgba(236, 72, 153, 0.15)', borderRadius: 6, fontSize: '0.62rem', color: '#db2777', fontWeight: 500 }}>
                      {label}
                    </span>
                  ))}
                </div>
                <a href={infoSlides[slide].link} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12,
                  background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', color: '#fff', borderRadius: 8, padding: '6px 16px', fontWeight: 600, fontSize: '0.7rem', textDecoration: 'none', fontFamily: 'inherit',
                }}>
                  <i className="fas fa-arrow-right" style={{ fontSize: 9 }}></i> Learn more
                </a>
              </div>
            </div>

            {/* Form card - compact glass */}
            <div
              className="register-form-wrap"
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
                className="register-form-card-inner"
                style={{
                  padding: 'clamp(18px, 2.5vw, 26px)',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: 'clamp(12px, 1.5vw, 18px)' }}>
                  <img
                    src={`${process.env.PUBLIC_URL || ''}/Logo/Sparkle%20RFID%20svg.svg`}
                    alt="Sparkle RFID"
                    style={{ height: 30, width: 'auto', marginBottom: 8 }}
                    onError={(e) => { e.target.onerror = null; e.target.src = `${process.env.PUBLIC_URL || ''}/Logo/LSlogo.png`; }}
                  />
                  <h1 className="register-title" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 2px 0', letterSpacing: '-0.02em' }}>
                    Register to RFID Dashboard
                  </h1>
                  <p className="register-sub" style={{ color: '#db2777', fontSize: '0.7rem', fontWeight: 500, margin: 0 }}>
                    Smart Tracking • Secure Access
                  </p>
                </div>

                {error && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#b91c1c',
                    padding: '6px 10px',
                    borderRadius: 8,
                    marginBottom: 12,
                    fontSize: '0.68rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                  }}>
                    <i className="fas fa-exclamation-circle" style={{ fontSize: 11 }}></i>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-user" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#ec4899', fontSize: 13, zIndex: 1 }}></i>
                    <input
                      type="text"
                      name="Username"
                      value={formData.Username}
                      onChange={handleChange}
                      required
                      placeholder="Username"
                      className="reg-form-input"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 36px',
                        fontSize: '0.78rem',
                        color: '#1e1b4b',
                        borderRadius: 10,
                        fontWeight: 400,
                        transition: 'all 0.2s',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        ...inputGlass,
                      }}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-building" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#ec4899', fontSize: 13, zIndex: 1 }}></i>
                    <input
                      type="text"
                      name="ClientCode"
                      value={formData.ClientCode}
                      onChange={handleChange}
                      required
                      placeholder="Client code"
                      className="reg-form-input"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 36px',
                        fontSize: '0.78rem',
                        color: '#1e1b4b',
                        borderRadius: 10,
                        fontWeight: 400,
                        transition: 'all 0.2s',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        ...inputGlass,
                      }}
                    />
                    <p style={{ fontSize: '0.6rem', color: '#be185d', margin: '4px 0 0 0', fontWeight: 500 }}>Client code is generated from Sparkle Masterpiece</p>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-lock" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#ec4899', fontSize: 13, zIndex: 1 }}></i>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="Password"
                      value={formData.Password}
                      onChange={handleChange}
                      required
                      placeholder="Password"
                      className="reg-form-input"
                      style={{
                        width: '100%',
                        padding: '9px 36px 9px 36px',
                        fontSize: '0.78rem',
                        color: '#1e1b4b',
                        borderRadius: 10,
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
                        fontSize: 13,
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
                      padding: '11px',
                      background: 'linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.8 : 1,
                      transition: 'all 0.2s',
                      fontFamily: 'inherit',
                      marginTop: 2,
                      boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)',
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-user-plus" style={{ fontSize: 11 }}></i>
                        <span>Register</span>
                      </>
                    )}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.68rem', paddingTop: 10, marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.5)' }}>
                    <span style={{ color: '#64748b' }}>Already have an account?</span>
                    <button type="button" onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#db2777', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                      <i className="fas fa-sign-in-alt" style={{ fontSize: 10 }}></i>
                      <span>Login now</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <footer style={{
          padding: '6px 10px',
          textAlign: 'center',
          fontSize: '0.62rem',
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

export default Register;
