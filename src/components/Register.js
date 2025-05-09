import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

const Register = () => {
  const [formData, setFormData] = useState({
    Username: '',
    Password: '',
    ClientCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordGuide, setShowPasswordGuide] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validatePassword = (password) => {
    const errors = [];
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must have at least one uppercase letter ('A'-'Z')");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must have at least one digit ('0'-'9')");
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push("Password must have at least one non-alphanumeric character");
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const passwordErrors = validatePassword(formData.Password);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join('\n'));
      setLoading(false);
      return;
    }
    try {
      await axios.post('https://soni.loyalstring.co.in/apiProductMaster/AuthRegister', formData);
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 60%, #ececec 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Poppins, Montserrat, Arial, sans-serif'
    }}>
      <ToastContainer />
      <div style={{
        minWidth: 400,
        maxWidth: 480,
        width: '100%',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 24,
        boxShadow: '0 10px 40px 0 rgba(31, 38, 135, 0.15)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        padding: '3rem 2.8rem',
        margin: '2rem 0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <div className="text-center mb-4">
          <div style={{ 
            width: 75,
            height: 75,
            background: 'linear-gradient(135deg, #0078d4 0%, #5470FF 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.2rem',
            boxShadow: '0 8px 24px rgba(84, 112, 255, 0.3)'
          }}>
            <i className="fas fa-user-plus fa-2x" style={{ color: 'white' }}></i>
          </div>
          <h3 className="mb-3 fw-bold" style={{ 
            fontSize: '1.8rem', 
            color: '#333',
            textAlign: 'center', 
            letterSpacing: 0.5
          }}>
            <img 
              src="/Logo/Sparkle RFID svg.svg" 
              alt="Sparkle RFID" 
              style={{ 
                height: '35px',
                marginRight: '8px',
                verticalAlign: 'middle' 
              }} 
            />
            
          </h3>
          <h3 style={{ color: '#000000', fontSize: '2rem' }}>  RFID Secure API </h3>
          <p style={{ color: '#666', fontSize: '1rem' }}>Register to access the dashboard</p>
        </div>

        {error && (
          <div className="alert alert-danger py-2" style={{ 
            fontSize: '0.98rem',
            borderRadius: '14px',
            border: 'none',
            background: 'rgba(220, 53, 69, 0.1)',
            color: '#dc3545'
          }}>{error}</div>
        )}
        
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="mb-4">
            <label htmlFor="Username" className="form-label" style={{ 
              fontWeight: 600, 
              color: '#444',
              fontSize: '0.95rem',
              marginBottom: '0.5rem'
            }}>
              Username
            </label>
            <div className="input-group">
              <span className="input-group-text" style={{ 
                background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
                border: 'none', 
                borderTopLeftRadius: '14px', 
                borderBottomLeftRadius: '14px' 
              }}>
                <i className="fas fa-user text-white"></i>
              </span>
              <input
                type="text"
                className="form-control"
                id="Username"
                name="Username"
                value={formData.Username}
                onChange={handleChange}
                required
                placeholder="Enter your email or username"
                style={{ 
                  fontSize: '1.05rem', 
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid #e0e0e0', 
                  borderTopRightRadius: '14px',
                  borderBottomRightRadius: '14px',
                  borderLeft: 'none',
                  padding: '0.7rem 1rem',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="ClientCode" className="form-label" style={{ 
              fontWeight: 600, 
              color: '#444',
              fontSize: '0.95rem',
              marginBottom: '0.5rem'
            }}>
              Client Code
            </label>
            <div className="input-group">
              <span className="input-group-text" style={{ 
                background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
                border: 'none', 
                borderTopLeftRadius: '14px', 
                borderBottomLeftRadius: '14px' 
              }}>
                <i className="fas fa-building text-white"></i>
              </span>
              <input
                type="text"
                className="form-control"
                id="ClientCode"
                name="ClientCode"
                value={formData.ClientCode}
                onChange={handleChange}
                required
                placeholder="Enter your client code"
                style={{ 
                  fontSize: '1.05rem', 
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid #e0e0e0', 
                  borderTopRightRadius: '14px',
                  borderBottomRightRadius: '14px',
                  borderLeft: 'none',
                  padding: '0.7rem 1rem',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="Password" className="form-label" style={{ 
              fontWeight: 600, 
              color: '#444',
              fontSize: '0.95rem',
              marginBottom: '0.5rem'
            }}>
              Password
            </label>
            <div className="input-group">
              <span className="input-group-text" style={{ 
                background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
                border: 'none', 
                borderTopLeftRadius: '14px', 
                borderBottomLeftRadius: '14px' 
              }}>
                <i className="fas fa-lock text-white"></i>
              </span>
              <input
                type="password"
                className="form-control"
                id="Password"
                name="Password"
                value={formData.Password}
                onChange={handleChange}
                required
                placeholder="Create a strong password"
                style={{ 
                  fontSize: '1.05rem', 
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid #e0e0e0', 
                  borderTopRightRadius: '14px',
                  borderBottomRightRadius: '14px',
                  borderLeft: 'none',
                  padding: '0.7rem 1rem',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}
                onFocus={() => setShowPasswordGuide(true)}
                onBlur={() => setShowPasswordGuide(false)}
              />
            </div>
            {/* Inline password requirements guide */}
            <div style={{
              marginTop: 8,
              fontSize: '0.97rem',
              fontWeight: 500,
              minHeight: 24,
              transition: 'color 0.3s',
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              userSelect: 'none',
              letterSpacing: 0.1
            }}>
              <span style={{
                color: /[A-Z]/.test(formData.Password) ? '#22bb33' : '#bbb',
                transition: 'color 0.3s',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <i className={`fas fa-check-circle`} style={{ opacity: /[A-Z]/.test(formData.Password) ? 1 : 0.3, transition: 'opacity 0.3s', color: /[A-Z]/.test(formData.Password) ? '#22bb33' : '#bbb' }}></i>
                Uppercase
              </span>
              <span style={{
                color: /[0-9]/.test(formData.Password) ? '#22bb33' : '#bbb',
                transition: 'color 0.3s',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <i className={`fas fa-check-circle`} style={{ opacity: /[0-9]/.test(formData.Password) ? 1 : 0.3, transition: 'opacity 0.3s', color: /[0-9]/.test(formData.Password) ? '#22bb33' : '#bbb' }}></i>
                Number
              </span>
              <span style={{
                color: /[^A-Za-z0-9]/.test(formData.Password) ? '#22bb33' : '#bbb',
                transition: 'color 0.3s',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <i className={`fas fa-check-circle`} style={{ opacity: /[^A-Za-z0-9]/.test(formData.Password) ? 1 : 0.3, transition: 'opacity 0.3s', color: /[^A-Za-z0-9]/.test(formData.Password) ? '#22bb33' : '#bbb' }}></i>
                Special
              </span>
            </div>
          </div>
          
          <button
            type="submit"
            className="btn w-100 fw-bold"
            style={{
              fontSize: '1.1rem',
              background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '0.8rem',
              marginTop: 12,
              marginBottom: 16,
              boxShadow: '0 4px 14px rgba(84, 112, 255, 0.3)',
              transition: 'all 0.3s'
            }}
            disabled={loading}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(90deg, #5470FF 0%, #0078d4 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(84, 112, 255, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(84, 112, 255, 0.3)';
            }}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <>
                <i className="fas fa-user-plus me-2"></i>
                Register
              </>
            )}
          </button>
        </form>
        
        <div className="text-center mt-4" style={{ fontSize: '1rem', color: '#555' }}>
          Already have an account?{' '}
          <span
            className="fw-bold"
            style={{ 
              color: '#5470FF', 
              cursor: 'pointer',
              textDecoration: 'underline',
              transition: 'all 0.3s'
            }}
            onClick={() => navigate('/login')}
          >
            Login now
          </span>
        </div>
      </div>
      {/* Google Fonts for Poppins */}
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Montserrat:wght@500&display=swap" rel="stylesheet" />
    </div>
  );
};

export default Register;