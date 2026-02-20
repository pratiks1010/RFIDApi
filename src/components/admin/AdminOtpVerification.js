import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

const AdminOtpVerification = ({ username, onVerificationSuccess, onBackToLogin }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [backLoading, setBackLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  // Format time display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const result = await adminService.verifyOtp(username, otp);
      
      if (result.success && result.token) {
        // Store both token and username for header display
        localStorage.setItem('adminToken', result.token);
        localStorage.setItem('adminUsername', username);
        localStorage.setItem('currentUsername', username);
        setSuccess(true);
        setTimeout(() => {
          onVerificationSuccess();
        }, 1000);
      } else {
        setError(result.error || 'Invalid or expired OTP');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      const result = await adminService.sendOtp(username);
      
      if (result.success) {
        setTimeLeft(300); // Reset timer to 5 minutes
        setCanResend(false);
        setError('');
        // Show success message briefly
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to resend OTP');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setBackLoading(true);
    setError('');
    setSuccess(false);
    
    // Add a small delay for better UX feedback
    setTimeout(() => {
      onBackToLogin();
      setBackLoading(false);
    }, 500);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(120deg, #e0e7ff 0%, #f4f7fd 60%, #e0e7ff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, Poppins, sans-serif',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Modern Animated SVG Waves and Gradient Blobs */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}>
        {/* SVG Waves */}
        <svg width="100%" height="220" viewBox="0 0 1440 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', bottom: 0, left: 0, zIndex: 1 }}>
          <path fill="#2563eb" fillOpacity="0.08">
            <animate attributeName="d" dur="12s" repeatCount="indefinite"
              values="M0,160 C480,220 960,100 1440,160 L1440,320 L0,320 Z;
                      M0,180 C480,120 960,220 1440,180 L1440,320 L0,320 Z;
                      M0,160 C480,220 960,100 1440,160 L1440,320 L0,320 Z" />
          </path>
        </svg>
        <svg width="100%" height="180" viewBox="0 0 1440 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', bottom: 0, left: 0, zIndex: 2 }}>
          <path fill="#60a5fa" fillOpacity="0.07">
            <animate attributeName="d" dur="16s" repeatCount="indefinite"
              values="M0,120 C600,200 900,60 1440,120 L1440,320 L0,320 Z;
                      M0,140 C600,80 900,180 1440,140 L1440,320 L0,320 Z;
                      M0,120 C600,200 900,60 1440,120 L1440,320 L0,320 Z" />
          </path>
        </svg>
        <svg width="100%" height="120" viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', bottom: 0, left: 0, zIndex: 3 }}>
          <path fill="#a5b4fc" fillOpacity="0.06">
            <animate attributeName="d" dur="20s" repeatCount="indefinite"
              values="M0,80 C700,160 800,20 1440,80 L1440,320 L0,320 Z;
                      M0,100 C700,40 800,120 1440,100 L1440,320 L0,320 Z;
                      M0,80 C700,160 800,20 1440,80 L1440,320 L0,320 Z" />
          </path>
        </svg>
        {/* Animated Gradient Blobs */}
        <div style={{
          position: 'absolute', left: '12%', top: '10%', width: 180, height: 180, borderRadius: '50%',
          background: 'radial-gradient(circle at 60% 40%, #60a5fa 0%, #2563eb 80%, transparent 100%)',
          opacity: 0.18, filter: 'blur(12px)', animation: 'blob1 14s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute', left: '70%', top: '18%', width: 140, height: 140, borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 60%, #a5b4fc 0%, #6366f1 80%, transparent 100%)',
          opacity: 0.15, filter: 'blur(10px)', animation: 'blob2 18s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute', left: '50%', top: '70%', width: 120, height: 120, borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 50%, #22c55e 0%, #60a5fa 80%, transparent 100%)',
          opacity: 0.13, filter: 'blur(14px)', animation: 'blob3 20s ease-in-out infinite'
        }} />
      </div>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: '#fff',
        borderRadius: 22,
        boxShadow: '0 8px 32px rgba(37,99,235,0.13)',
        border: '1.5px solid #e0e7ef',
        padding: '2.2rem 2rem 1.5rem 2rem',
        position: 'relative',
        marginBottom: 18,
        zIndex: 1
      }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '1.7rem' }}>
          <div style={{
            width: 54,
            height: 54,
            background: 'linear-gradient(135deg, #2563eb 60%, #60a5fa 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.1rem',
            boxShadow: '0 2px 8px #2563eb11',
            position: 'relative'
          }}>
            <i className="fas fa-shield-alt" style={{ color: '#fff', fontSize: 22 }}></i>
          </div>
          {/* Logo and Title */}
          <div style={{ marginBottom: '0.5rem' }}>
            <img
              src={`${process.env.PUBLIC_URL || ''}/Logo/Sparkle%20RFID%20svg.svg`}
              alt="Sparkle RFID"
              style={{ height: 32, marginRight: 6, verticalAlign: 'middle' }}
              onError={(e) => { e.target.onerror = null; e.target.src = `${process.env.PUBLIC_URL || ''}/Logo/LSlogo.png`; }}
            />
          </div>
          <h1 style={{
            fontSize: '19px',
            fontWeight: 700,
            color: '#2563eb',
            marginBottom: '0.18rem',
            fontFamily: 'Inter, Poppins, sans-serif',
            letterSpacing: 0.1
          }}>
            Verify OTP
          </h1>
          <div style={{ color: '#64748b', fontSize: 13, fontWeight: 400, margin: '0 0 0.5rem 0', fontFamily: 'Inter, Poppins, sans-serif' }}>
            Enter the OTP sent to your email
          </div>
          <div style={{ color: '#2563eb', fontSize: 13, fontWeight: 500, margin: '0 0 0.7rem 0', fontFamily: 'Inter, Poppins, sans-serif', letterSpacing: 0.01, background: 'rgba(37,99,235,0.07)', borderRadius: 8, display: 'inline-block', padding: '2px 12px' }}>
            {username}
          </div>
          {/* Divider/accent */}
          <div style={{ width: 60, height: 4, background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)', borderRadius: 4, margin: '0.7rem auto 0.5rem auto' }} />
        </div>

        {/* Timer Display */}
        <div style={{
          textAlign: 'center',
          marginBottom: '0.75rem',
          padding: '8px 12px',
          background: timeLeft > 60 ? 'rgba(0, 119, 212, 0.1)' : '#fde8e8',
          borderRadius: 8,
          border: `1px solid ${timeLeft > 60 ? '#0077d4' : '#fca5a5'}`
        }}>
          <div style={{
            color: timeLeft > 60 ? '#0077d4' : '#dc2626',
            fontWeight: 400,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            fontFamily: 'Poppins, sans-serif'
          }}>
            <i className="fas fa-clock" style={{ fontSize: '12px' }}></i>
            {timeLeft > 0 ? `OTP expires in ${formatTime(timeLeft)}` : 'OTP Expired'}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fde8e8',
            color: '#dc2626',
            borderRadius: 6,
            padding: '6px 10px',
            marginBottom: '0.75rem',
            fontWeight: 400,
            textAlign: 'center',
            border: '1px solid #fca5a5',
            fontSize: '12px',
            fontFamily: 'Poppins, sans-serif'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '12px', marginRight: 4 }}></i>
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div style={{
            background: '#e6f9ed',
            color: '#219653',
            borderRadius: 6,
            padding: '6px 10px',
            marginBottom: '0.75rem',
            fontWeight: 400,
            textAlign: 'center',
            border: '1px solid #b7e4c7',
            fontSize: '12px',
            fontFamily: 'Poppins, sans-serif'
          }}>
            <i className="fas fa-check-circle" style={{ fontSize: '12px', marginRight: 4 }}></i>
            {loading ? 'OTP verified! Redirecting...' : 'OTP resent successfully!'}
          </div>
        )}

        {/* OTP Form */}
        <form onSubmit={handleSubmit}>
          {/* OTP Input */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label htmlFor="otp" style={{
              fontWeight: 400,
              color: '#0077d4',
              fontSize: '12px',
              marginBottom: '0.25rem',
              display: 'block',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Enter OTP
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 24,
                height: 24,
                background: '#0077d4',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2
              }}>
                <i className="fas fa-key" style={{ color: '#ffffff', fontSize: 10 }}></i>
              </div>
              <input
                type="text"
                id="otp"
                name="otp"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="Enter 6-digit OTP"
                maxLength="6"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  borderRadius: 8,
                  border: '1px solid #f1f1f1',
                  fontSize: '16px',
                  background: '#ffffff',
                  fontWeight: 500,
                  color: '#38414a',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  letterSpacing: '0.15em',
                  fontFamily: 'Poppins, sans-serif'
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#0077d4';
                  e.target.style.boxShadow = '0 0 0 2px rgba(0, 119, 212, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#f1f1f1';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            style={{
              width: '100%',
              background: loading || otp.length !== 6 ? '#f1f1f1' : '#0077d4',
              color: loading || otp.length !== 6 ? '#38414a' : '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 16px',
              fontWeight: 500,
              fontSize: '14px',
              cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginBottom: '0.5rem',
              fontFamily: 'Poppins, sans-serif'
            }}
            onMouseEnter={e => {
              if (!loading && otp.length === 6) {
                e.target.style.background = '#38414a';
              }
            }}
            onMouseLeave={e => {
              if (!loading && otp.length === 6) {
                e.target.style.background = '#0077d4';
              }
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 16,
                  height: 16,
                  border: '2px solid #f1f1f1',
                  borderTop: '2px solid #38414a',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Verifying...
              </>
            ) : (
              <>
                <i className="fas fa-check-circle"></i>
                Verify OTP
              </>
            )}
          </button>

          {/* Resend OTP Button */}
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendLoading || !canResend}
            style={{
              width: '100%',
              background: 'transparent',
              color: canResend ? '#0077d4' : '#38414a',
              border: `1px solid ${canResend ? '#0077d4' : '#f1f1f1'}`,
              borderRadius: 8,
              padding: '8px 14px',
              fontWeight: 400,
              fontSize: '13px',
              cursor: canResend && !resendLoading ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginBottom: '0.5rem',
              fontFamily: 'Poppins, sans-serif'
            }}
            onMouseEnter={e => {
              if (canResend && !resendLoading) {
                e.target.style.background = 'rgba(0, 119, 212, 0.1)';
              }
            }}
            onMouseLeave={e => {
              if (canResend && !resendLoading) {
                e.target.style.background = 'transparent';
              }
            }}
          >
            {resendLoading ? (
              <>
                <div style={{
                  width: 14,
                  height: 14,
                  border: '2px solid #f1f1f1',
                  borderTop: '2px solid #0077d4',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Sending...
              </>
            ) : (
              <>
                <i className="fas fa-redo" style={{ fontSize: '12px' }}></i>
                {canResend ? 'Resend OTP' : `Resend in ${formatTime(timeLeft)}`}
              </>
            )}
          </button>

          {/* Back to Login Button */}
          <button
            type="button"
            onClick={handleBackToLogin}
            disabled={backLoading}
            style={{
              width: '100%',
              background: 'transparent',
              color: backLoading ? '#f1f1f1' : '#38414a',
              border: `1px solid ${backLoading ? '#f1f1f1' : '#f1f1f1'}`,
              borderRadius: 8,
              padding: '8px 14px',
              fontWeight: 400,
              fontSize: '13px',
              cursor: backLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontFamily: 'Poppins, sans-serif'
            }}
            onMouseEnter={e => {
              if (!backLoading) {
                e.target.style.borderColor = '#0077d4';
                e.target.style.color = '#0077d4';
                e.target.style.background = 'rgba(0, 119, 212, 0.1)';
              }
            }}
            onMouseLeave={e => {
              if (!backLoading) {
                e.target.style.borderColor = '#f1f1f1';
                e.target.style.color = '#38414a';
                e.target.style.background = 'transparent';
              }
            }}
          >
            {backLoading ? (
              <>
                <div style={{
                  width: 14,
                  height: 14,
                  border: '2px solid #f1f1f1',
                  borderTop: '2px solid #38414a',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Going back...
              </>
            ) : (
              <>
                <i className="fas fa-arrow-left" style={{ fontSize: '12px' }}></i>
                Back to Login
              </>
            )}
          </button>
        </form>
      </div>
      {/* Copyright fixed at bottom center */}
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 18,
        textAlign: 'center',
        color: '#b0b7c3',
        fontSize: '12px',
        fontFamily: 'Inter, Poppins, sans-serif',
        zIndex: 2
      }}>
        &copy; {new Date().getFullYear()} Sparkle RFID. All rights reserved.
      </div>
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blob1 {
          0%, 100% { transform: translateY(0) scale(1); }
          33% { transform: translateY(-30px) scale(1.08); }
          66% { transform: translateY(20px) scale(0.95); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translateY(0) scale(1); }
          33% { transform: translateY(25px) scale(1.12); }
          66% { transform: translateY(-18px) scale(1.03); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translateY(0) scale(1); }
          33% { transform: translateY(-22px) scale(1.05); }
          66% { transform: translateY(18px) scale(0.98); }
        }
      `}</style>
    </div>
  );
};

export default AdminOtpVerification; 