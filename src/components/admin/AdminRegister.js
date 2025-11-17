import React, { useState, useEffect } from 'react';

const AdminRegister = ({ onSuccess }) => {
  const [form, setForm] = useState({ Username: '', Password: '', ClientCode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordGuide, setShowPasswordGuide] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Password validation logic
  const validatePassword = (password) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  };
  const passwordChecks = validatePassword(form.Password);

  const validate = () => {
    if (!form.Username.trim() || !form.Password || !form.ClientCode.trim()) {
      return 'All fields are required.';
    }
    if (!Object.values(passwordChecks).every(Boolean)) {
      return 'Password does not meet requirements.';
    }
    return '';
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('https://rrgold.loyalstring.co.in/api/Admin/Register', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to register admin');
      }
      setSuccess('Admin registered successfully!');
      setForm({ Username: '', Password: '', ClientCode: '' });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      minHeight: 'calc(100vh - 72px)',
      padding: isMobile ? '16px' : '24px',
      background: '#ffffff',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        padding: isMobile ? '20px' : '1.5rem',
        maxWidth: 450,
        width: '100%',
        fontFamily: 'Poppins, sans-serif',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'stretch',
        position: 'relative',
        border: '1px solid #f1f1f1',
        marginTop: isMobile ? '0' : '20px'
      }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{
            width: isMobile ? 40 : 48, 
            height: isMobile ? 40 : 48, 
            background: '#0077d4',
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 10px', 
          }}>
            <i className="fas fa-user-plus" style={{ color: 'white', fontSize: isMobile ? 16 : 18 }}></i>
          </div>
          <div style={{ 
            fontWeight: 500, 
            fontSize: isMobile ? '16px' : '14px', 
            color: '#38414a', 
            marginBottom: 4,
          }}>
            Register User
          </div>
          <div style={{ 
            fontWeight: 400, 
            fontSize: isMobile ? '11px' : '12px', 
            color: '#6b7280', 
          }}>
            RFID Third Party User Registration
          </div>
          <div style={{
            height: 2,
            width: 60,
            background: '#0077d4',
            borderRadius: 1,
            margin: '8px auto 0 auto'
          }} />
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div style={{ 
            background: '#fde8e8', 
            color: '#dc2626', 
            borderRadius: 8, 
            padding: '8px 12px', 
            marginBottom: 12, 
            fontWeight: 400, 
            textAlign: 'center',
            border: '1px solid #fca5a5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: '12px'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '12px' }}></i>
            {error}
          </div>
        )}
        {success && (
          <div style={{ 
            background: '#e6f9ed', 
            color: '#219653', 
            borderRadius: 8, 
            padding: '8px 12px', 
            marginBottom: 12, 
            fontWeight: 400, 
            textAlign: 'center',
            border: '1px solid #b7e4c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: '12px'
          }}>
            <i className="fas fa-check-circle" style={{ fontSize: '12px' }}></i>
            {success}
          </div>
        )}

        {/* Username Field */}
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="add-username" style={{ 
            fontWeight: 500, 
            color: '#0077d4', 
            fontSize: '12px', 
            marginBottom: 4, 
            display: 'block'
          }}>
            Username <span style={{ color: '#dc2626' }}>*</span>
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
              <i className="fas fa-user" style={{ color: '#fff', fontSize: 12 }}></i>
            </div>
            <input
              type="text"
              id="add-username"
              name="Username"
              value={form.Username}
              onChange={handleChange}
              required
              placeholder="Enter username"
              style={{
                width: '100%',
                padding: '8px 12px 8px 40px',
                borderRadius: 8,
                border: '1px solid #f1f1f1',
                fontSize: '14px',
                background: '#f1f1f1',
                fontWeight: 400,
                color: '#38414a',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                fontFamily: 'Poppins, sans-serif'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#0077d4';
                e.target.style.background = '#ffffff';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#f1f1f1';
                e.target.style.background = '#f1f1f1';
              }}
            />
          </div>
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="add-password" style={{ 
            fontWeight: 500, 
            color: '#0077d4', 
            fontSize: '12px', 
            marginBottom: 4, 
            display: 'block'
          }}>
            Password <span style={{ color: '#dc2626' }}>*</span>
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
              <i className="fas fa-lock" style={{ color: '#fff', fontSize: 12 }}></i>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              id="add-password"
              name="Password"
              value={form.Password}
              onChange={handleChange}
              required
              placeholder="Enter password"
              style={{
                width: '100%',
                padding: '8px 40px 8px 40px',
                borderRadius: 8,
                border: '1px solid #f1f1f1',
                fontSize: '14px',
                background: '#f1f1f1',
                fontWeight: 400,
                color: '#38414a',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                fontFamily: 'Poppins, sans-serif'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#0077d4';
                e.target.style.background = '#ffffff';
                setShowPasswordGuide(true);
              }}
              onBlur={e => {
                e.target.style.borderColor = '#f1f1f1';
                e.target.style.background = '#f1f1f1';
                setShowPasswordGuide(false);
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
                padding: 4,
                borderRadius: 4,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.target.style.color = '#38414a';
              }}
              onMouseLeave={e => {
                e.target.style.color = '#0077d4';
              }}
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>

          {/* Password Requirements */}
          {(showPasswordGuide || form.Password) && (
            <div style={{
              marginTop: 6,
              padding: '8px 10px',
              background: '#ffffff',
              borderRadius: 6,
              border: '1px solid #f1f1f1',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: 500, color: '#0077d4', marginBottom: 4 }}>
                Password Requirements:
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                gap: 3 
              }}>
                <div style={{ 
                  color: passwordChecks.length ? '#16a34a' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontWeight: 400
                }}>
                  <i className={`fas ${passwordChecks.length ? 'fa-check-circle' : 'fa-circle'}`} 
                     style={{ fontSize: '10px' }}></i>
                  8+ characters
                </div>
                <div style={{ 
                  color: passwordChecks.uppercase ? '#16a34a' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontWeight: 400
                }}>
                  <i className={`fas ${passwordChecks.uppercase ? 'fa-check-circle' : 'fa-circle'}`} 
                     style={{ fontSize: '10px' }}></i>
                  Uppercase letter
                </div>
                <div style={{ 
                  color: passwordChecks.number ? '#16a34a' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontWeight: 400
                }}>
                  <i className={`fas ${passwordChecks.number ? 'fa-check-circle' : 'fa-circle'}`} 
                     style={{ fontSize: '10px' }}></i>
                  Number
                </div>
                <div style={{ 
                  color: passwordChecks.special ? '#16a34a' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontWeight: 400
                }}>
                  <i className={`fas ${passwordChecks.special ? 'fa-check-circle' : 'fa-circle'}`} 
                     style={{ fontSize: '10px' }}></i>
                  Special character
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Client Code Field */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="add-clientcode" style={{ 
            fontWeight: 500, 
            color: '#0077d4', 
            fontSize: '12px', 
            marginBottom: 4, 
            display: 'block'
          }}>
            Client Code <span style={{ color: '#dc2626' }}>*</span>
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
              <i className="fas fa-id-badge" style={{ color: '#fff', fontSize: 12 }}></i>
            </div>
            <input
              type="text"
              id="add-clientcode"
              name="ClientCode"
              value={form.ClientCode}
              onChange={handleChange}
              required
              placeholder="Enter client code"
              style={{
                width: '100%',
                padding: '8px 12px 8px 40px',
                borderRadius: 8,
                border: '1px solid #f1f1f1',
                fontSize: '14px',
                background: '#f1f1f1',
                fontWeight: 400,
                color: '#38414a',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                fontFamily: 'Poppins, sans-serif'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#0077d4';
                e.target.style.background = '#ffffff';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#f1f1f1';
                e.target.style.background = '#f1f1f1';
              }}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? '#f1f1f1' : '#0077d4',
            color: loading ? '#6b7280' : '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontWeight: 500,
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
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
                width: 14,
                height: 14,
                border: '2px solid #d1d5db',
                borderTop: '2px solid #6b7280',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Registering...
            </>
          ) : (
            <>
              <i className="fas fa-user-plus" style={{ fontSize: '12px' }}></i>
              Register User
            </>
          )}
        </button>
      </form>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminRegister; 