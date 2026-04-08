import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { rfidService } from '../services/rfidService';

const DEFAULT_PLAN_OPTIONS = [
  { PlanName: 'Basic', MaxSubUsers: 2, ValidityInDays: 365 },
  { PlanName: 'Pro', MaxSubUsers: 100, ValidityInDays: 365 },
];

const PLAN_FETCH_RETRY_MS = 10 * 60 * 1000;
const PLAN_FETCH_FAIL_CACHE_KEY = 'rfidPlanCatalogFetchFailedAt';
const FALLBACK_SLIDE_IMG = `${process.env.PUBLIC_URL || ''}/Logo/Sparkle RFID svg.svg`;

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
    ClientCode: '',
    SelectedPlan: ''
  });
  const [availablePlans, setAvailablePlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
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

  useEffect(() => {
    const fetchPlans = async () => {
      setPlansLoading(true);
      setPlansError('');
      const lastFailedAt = Number(sessionStorage.getItem(PLAN_FETCH_FAIL_CACHE_KEY) || 0);
      const withinCooldown = lastFailedAt && (Date.now() - lastFailedAt) < PLAN_FETCH_RETRY_MS;
      if (withinCooldown) {
        setAvailablePlans(DEFAULT_PLAN_OPTIONS);
        setPlansError('Using default plans (server plan API unavailable right now).');
        setPlansLoading(false);
        return;
      }
      try {
        const plans = await rfidService.getAvailableAuthPlans();
        const normalizedPlans = (plans || [])
          .map((plan) => ({
            PlanName: String(plan?.PlanName || '').trim(),
            MaxSubUsers: Number(plan?.MaxSubUsers || 0),
            ValidityInDays: Number(plan?.ValidityInDays || 365),
          }))
          .filter((plan) => plan.PlanName);

        const finalPlans = normalizedPlans.length > 0
          ? normalizedPlans
          : DEFAULT_PLAN_OPTIONS;

        setAvailablePlans(finalPlans);
        sessionStorage.removeItem(PLAN_FETCH_FAIL_CACHE_KEY);
      } catch (err) {
        sessionStorage.setItem(PLAN_FETCH_FAIL_CACHE_KEY, String(Date.now()));
        setAvailablePlans(DEFAULT_PLAN_OPTIONS);
        setPlansError('Could not load plans from server. Default plans are shown.');
      } finally {
        setPlansLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const getApiErrorMessage = (err) => {
    const data = err?.response?.data;
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) {
      return data.map((entry) => entry?.Description || entry?.description || String(entry)).join('\n');
    }
    if (data?.message) return data.message;
    if (data?.Message) return data.Message;
    return 'Registration failed. Please try again.';
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleNext = () => {
    if (!formData.Username.trim()) {
      setError('Please enter username.');
      return;
    }
    if (!formData.ClientCode.trim()) {
      setError('Please enter client code.');
      return;
    }
    if (!formData.Password.trim()) {
      setError('Please enter password.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!formData.SelectedPlan) {
      setError('Please select a plan (Basic or Pro) to continue.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await rfidService.registerAuthUser({
        ...formData,
        SelectedPlan: formData.SelectedPlan,
      });
      toast.success('Registration successful! Please login.', {
        position: "top-right",
        autoClose: 3000,
        theme: "colored"
      });
      navigate('/login');
    } catch (err) {
      const errorMessage = getApiErrorMessage(err);
      setError(errorMessage);
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

  const alignedInputStyle = {
    width: '100%',
    height: 40,
    lineHeight: '40px',
    padding: '0 12px 0 38px',
    fontSize: '0.78rem',
    color: '#1e1b4b',
    borderRadius: 10,
    fontWeight: 400,
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    ...inputGlass,
  };

  return (
    <>
      <style>{`
        body, html { overflow: hidden !important; height: 100% !important; margin: 0; }
        .register-page-wrapper { animation: fadeIn 0.35s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .fas, .far, .fal, .fab { font-family: "Font Awesome 5 Free" !important; font-weight: 900 !important; display: inline-block !important; font-style: normal !important; line-height: 1 !important; }
        .reg-form-input:focus { outline: none; border-color: rgba(236, 72, 153, 0.6) !important; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15) !important; }
        .plan-card:hover { transform: translateY(-1px); }
        .plan-card.selected { border-color: rgba(219, 39, 119, 0.6) !important; box-shadow: 0 0 0 2px rgba(219, 39, 119, 0.15), 0 8px 20px rgba(219, 39, 119, 0.15) !important; }
        @media (max-width: 900px) {
          .register-info-panel { display: none !important; }
          .register-form-wrap { max-width: 430px !important; margin: 0 auto !important; }
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
                maxHeight: step === 2 ? 'min(680px, 94vh)' : 'min(560px, 88vh)',
              }}
            >
              <div style={{ width: '100%', textAlign: 'center', transition: 'all 0.4s', opacity: animating ? 0 : 1, transform: animating ? 'translateY(12px)' : 'translateY(0)' }}>
                <img
                  src={infoSlides[slide].img}
                  alt={infoSlides[slide].title}
                  style={{ width: 90, height: 90, objectFit: 'contain', borderRadius: 12, marginBottom: 12 }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_SLIDE_IMG;
                  }}
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
                maxWidth: 440,
                borderRadius: 20,
                overflow: 'hidden',
                ...glassCard,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: step === 2 ? 'min(680px, 94vh)' : 'min(560px, 88vh)',
              }}
            >
              <div
                className="register-form-card-inner"
                style={{
                  padding: step === 2 ? 'clamp(14px, 2vw, 20px)' : 'clamp(18px, 2.5vw, 26px)',
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
                  <p style={{ color: '#64748b', fontSize: '0.64rem', margin: '7px 0 0 0', fontWeight: 600 }}>
                    Step {step} of 2
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

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: step === 2 ? 8 : 10, flex: 1, minHeight: 0 }}>
                  {step === 1 && (
                    <>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-user" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#ec4899', fontSize: 12, zIndex: 1, width: 14, textAlign: 'center' }}></i>
                    <input
                      type="text"
                      name="Username"
                      value={formData.Username}
                      onChange={handleChange}
                      placeholder="Username"
                      className="reg-form-input"
                      style={alignedInputStyle}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-building" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#ec4899', fontSize: 12, zIndex: 1, width: 14, textAlign: 'center' }}></i>
                    <input
                      type="text"
                      name="ClientCode"
                      value={formData.ClientCode}
                      onChange={handleChange}
                      placeholder="Client code"
                      className="reg-form-input"
                      style={alignedInputStyle}
                    />
                    <p style={{ fontSize: '0.6rem', color: '#be185d', margin: '4px 0 0 38px', fontWeight: 500 }}>Client code is generated from Sparkle Masterpiece</p>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-lock" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#ec4899', fontSize: 12, zIndex: 1, width: 14, textAlign: 'center' }}></i>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="Password"
                      value={formData.Password}
                      onChange={handleChange}
                      placeholder="Password"
                      className="reg-form-input"
                      style={{
                        ...alignedInputStyle,
                        paddingRight: 36,
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
                  </>
                  )}

                  {step === 2 && (
                  <div style={{ marginTop: 2 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#1e1b4b', fontWeight: 600, marginBottom: 8 }}>
                      <i className="fas fa-gem" style={{ color: '#ec4899', fontSize: 11 }}></i>
                      Select your RFID plan
                    </label>
                    <p style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '0.64rem', fontWeight: 600 }}>
                      Choose one plan manually. It will be active for 365 days.
                    </p>

                    {plansError && (
                      <p style={{ margin: '0 0 8px 0', color: '#b45309', fontSize: '0.63rem', fontWeight: 600 }}>
                        {plansError}
                      </p>
                    )}

                    {plansLoading ? (
                      <div style={{
                        ...inputGlass,
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: '0.72rem',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: 12, height: 12, borderWidth: 2 }}></span>
                        Loading available plans...
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                        {availablePlans.map((plan) => {
                          const isSelected = formData.SelectedPlan === plan.PlanName;
                          return (
                            <button
                              key={plan.PlanName}
                              type="button"
                              className={`plan-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => setFormData((prev) => ({ ...prev, SelectedPlan: plan.PlanName }))}
                              style={{
                                ...inputGlass,
                                borderRadius: 10,
                                border: isSelected ? '1px solid rgba(219, 39, 119, 0.6)' : '1px solid rgba(255, 255, 255, 0.5)',
                                padding: '10px 11px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                <div>
                                  <div style={{ color: '#1e1b4b', fontSize: '0.8rem', fontWeight: 700 }}>
                                    {plan.PlanName}
                                  </div>
                                  <div style={{ color: '#64748b', fontSize: '0.66rem', marginTop: 2 }}>
                                    Up to {plan.MaxSubUsers} dashboard sub-users
                                  </div>
                                  <div style={{ color: '#64748b', fontSize: '0.64rem', marginTop: 2 }}>
                                    Valid for {plan.ValidityInDays} days from registration
                                  </div>
                                </div>
                                <span style={{
                                  minWidth: 18,
                                  width: 18,
                                  height: 18,
                                  borderRadius: '50%',
                                  border: isSelected ? 'none' : '1px solid #cbd5e1',
                                  background: isSelected ? '#db2777' : 'transparent',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10,
                                  marginTop: 1,
                                }}>
                                  {isSelected ? <i className="fas fa-check"></i> : null}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {!plansLoading && !formData.SelectedPlan && (
                      <p style={{ margin: '8px 0 0 0', color: '#be123c', fontSize: '0.62rem', fontWeight: 700 }}>
                        Please select Basic or Pro plan to enable account creation.
                      </p>
                    )}

                    <div style={{ marginTop: 8, ...inputGlass, borderRadius: 10, padding: '8px 10px' }}>
                      <p style={{ margin: '0 0 7px 0', color: '#1e1b4b', fontSize: '0.68rem', fontWeight: 700 }}>
                        Dashboard features included
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                        {[
                          'Inventory Tracking',
                          'RFID Label Management',
                          'Reports & Analytics',
                          'Secure Sub-user Access',
                          'Real-time Sync',
                          'Stock Monitoring'
                        ].map((feature) => (
                          <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#475569', fontSize: '0.61rem', fontWeight: 600 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', fontSize: 10 }}></i>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                      <p style={{ margin: '8px 0 0 0', color: '#db2777', fontSize: '0.62rem', fontWeight: 700 }}>
                        All plans are valid for 365 days from registration date.
                      </p>
                    </div>
                  </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: step === 2 ? 0 : 2 }}>
                    {step === 2 && (
                      <button
                        type="button"
                        onClick={() => { setError(''); setStep(1); }}
                        style={{
                          flex: 1,
                          padding: '11px',
                          background: 'rgba(255,255,255,0.7)',
                          color: '#334155',
                          border: '1px solid rgba(148,163,184,0.35)',
                          borderRadius: 10,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontFamily: 'inherit',
                        }}
                      >
                        <i className="fas fa-arrow-left" style={{ fontSize: 10, marginRight: 6 }}></i>
                        Back
                      </button>
                    )}

                    {step === 1 ? (
                      <button
                        type="button"
                        onClick={handleNext}
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
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontFamily: 'inherit',
                          boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)',
                        }}
                      >
                        <span>Next</span>
                        <i className="fas fa-arrow-right" style={{ fontSize: 10 }}></i>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading || plansLoading || !formData.SelectedPlan}
                        style={{
                          flex: 2,
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
                          cursor: loading || plansLoading || !formData.SelectedPlan ? 'not-allowed' : 'pointer',
                          opacity: loading || plansLoading || !formData.SelectedPlan ? 0.8 : 1,
                          transition: 'all 0.2s',
                          fontFamily: 'inherit',
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
                            <span>Create Account</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

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
