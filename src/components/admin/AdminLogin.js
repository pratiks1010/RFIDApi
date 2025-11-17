import React, { useState } from 'react';
import { adminService } from '../../services/adminService';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      // Direct login without OTP verification
      const loginResult = await adminService.login({ username, password });
      
      if (loginResult.success && loginResult.token) {
        // Store token and username for header display
        localStorage.setItem('adminToken', loginResult.token);
        localStorage.setItem('adminUsername', username);
        localStorage.setItem('currentUsername', username);
        
        setSuccess(true);
        setTimeout(() => {
          // Redirect to admin dashboard after successful login
          window.location.href = '/admin-dashboard';
        }, 1000);
      } else {
        setError(loginResult.error || 'Invalid username or password');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
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
            <i className="fas fa-user-shield" style={{ color: '#fff', fontSize: 22 }}></i>
            {/* Admin badge */}
            <span style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              background: '#22c55e',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 8,
              padding: '1px 6px',
              boxShadow: '0 1px 4px #22c55e22',
              letterSpacing: 0.5
            }}>ADMIN</span>
          </div>
          {/* Logo and Title */}
          <div style={{ marginBottom: '0.5rem' }}>
            <img
              src="/Logo/Sparkle RFID svg.svg"
              alt="Sparkle RFID"
              style={{ height: 32, marginRight: 6, verticalAlign: 'middle' }}
            />
          </div>
          <div style={{ color: '#64748b', fontSize: 13, fontWeight: 400, margin: '0 0 0.5rem 0', fontFamily: 'Inter, Poppins, sans-serif' }}>
            Sign in as administrator
          </div>
          {/* Welcome message */}
          <div style={{ color: '#38414a', fontSize: 15, fontWeight: 500, margin: '0 0 0.7rem 0', fontFamily: 'Inter, Poppins, sans-serif', letterSpacing: 0.01 }}>
            Welcome to the Sparkle RFID Admin Portal.<br />Please enter your credentials to continue.
          </div>
          {/* Divider/accent */}
          <div style={{ width: 60, height: 4, background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)', borderRadius: 4, margin: '0.7rem auto 0.5rem auto' }} />
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fde8e8',
            color: '#dc2626',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: '1rem',
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
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: '1rem',
            fontWeight: 400,
            textAlign: 'center',
            border: '1px solid #b7e4c7',
            fontSize: '12px',
            fontFamily: 'Poppins, sans-serif'
          }}>
            <i className="fas fa-check-circle" style={{ fontSize: '12px', marginRight: 4 }}></i>
            Login successful! Redirecting...
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Username Field */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="username" style={{
              fontWeight: 400,
              color: '#0077d4',
              fontSize: '12px',
              marginBottom: '0.5rem',
              display: 'block',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Username
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
                <i className="fas fa-user" style={{ color: '#ffffff', fontSize: 10 }}></i>
              </div>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                placeholder="Enter admin username"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  borderRadius: 8,
                  border: '1px solid #f1f1f1',
                  fontSize: '14px',
                  background: '#ffffff',
                  fontWeight: 400,
                  color: '#38414a',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
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

          {/* Password Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password" style={{
              fontWeight: 400,
              color: '#0077d4',
              fontSize: '12px',
              marginBottom: '0.5rem',
              display: 'block',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Password
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
                <i className="fas fa-lock" style={{ color: '#ffffff', fontSize: 10 }}></i>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 40px',
                  borderRadius: 8,
                  border: '1px solid #f1f1f1',
                  fontSize: '14px',
                  background: '#ffffff',
                  fontWeight: 400,
                  color: '#38414a',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#0077d4',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: 6,
                  borderRadius: 4,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.target.style.color = '#38414a';
                  e.target.style.background = 'rgba(56, 65, 74, 0.1)';
                }}
                onMouseLeave={e => {
                  e.target.style.color = '#0077d4';
                  e.target.style.background = 'none';
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
              background: loading ? '#f1f1f1' : '#0077d4',
              color: loading ? '#38414a' : '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 16px',
              fontWeight: 500,
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontFamily: 'Poppins, sans-serif'
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.target.style.background = '#38414a';
              }
            }}
            onMouseLeave={e => {
              if (!loading) {
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
                Signing in...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.2rem',
          padding: '0.75rem 0 0.2rem 0',
          borderTop: '1px solid #e0e7ef',
          color: '#64748b',
          fontSize: '13px',
          fontWeight: 400,
          fontFamily: 'Inter, Poppins, sans-serif'
        }}>
          <i className="fas fa-shield-alt" style={{ marginRight: 4, color: '#2563eb' }}></i>
          Secure Admin Authentication
        </div>
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

export default AdminLogin; 