import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

const Login = () => {
  const [formData, setFormData] = useState({
    LoginName: '',
    Password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

        toast.success(`Welcome ${userInfo.Username}!`, {
          position: "top-right",
          autoClose: 2000,
          theme: "colored"
        });

        navigate('/dashboard');
      } catch (tokenError) {
        console.error('Token parsing error:', tokenError);
        throw new Error('Invalid token format received from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.Message || err.message || 'Login failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage, {
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
      minHeight: '90vh',
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
        background: 'rgba(255, 255, 255, 0.97)',
        borderRadius: 24,
        boxShadow: '0 10px 40px 0 rgba(31, 38, 135, 0.15)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        padding: '3rem 2.8rem',
        margin: '2rem 0'
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
            boxShadow: '0 8px 24px rgba(0, 120, 212, 0.18)',
          }}>
            <i className="fas fa-rss fa-2x" style={{ color: 'white' }}></i>
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
                height: '40px',
                marginRight: '8px',
                verticalAlign: 'middle' 
              }} 
            />
          </h3>
          <h3 style={{ color: '#000000', fontSize: '2.2rem' }}>  RFID Secure API </h3>
          <p style={{ color: '#666', fontSize: '1rem' }}>Login to your account</p>
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
            <label htmlFor="LoginName" className="form-label" style={{ 
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
                id="LoginName"
                name="LoginName"
                value={formData.LoginName}
                onChange={handleChange}
                required
                placeholder="Enter your email"
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
          
          <div className="mb-4 position-relative">
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
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                id="Password"
                name="Password"
                value={formData.Password}
                onChange={handleChange}
                required
                placeholder="Enter password"
                style={{ 
                  fontSize: '1.05rem', 
                  background: 'rgba(255, 255, 255, 0.9)', 
                  border: '1px solid #e0e0e0', 
                  borderTopRightRadius: '14px',
                  borderBottomRightRadius: '14px',
                  borderLeft: 'none',
                  padding: '0.7rem 1rem',
                  paddingRight: '3rem',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}
              />
              <span
                onClick={() => setShowPassword(s => !s)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: 'calc(50% - 10px)',
                  cursor: 'pointer',
                  color: '#0078d4',
                  fontSize: '1.1rem',
                  zIndex: 10
                }}
                tabIndex={0}
                role="button"
                aria-label="Toggle password visibility"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
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
              boxShadow: '0 4px 14px rgba(0,120,212,0.18)',
              transition: 'all 0.3s'
            }}
            disabled={loading}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(90deg, #5470FF 0%, #0078d4 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(214,0,0,0.18)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,120,212,0.18)';
            }}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <>
                <i className="fas fa-sign-in-alt me-2"></i>
                Login
              </>
            )}
          </button>
        </form>
        
        {/* <div className="text-center mt-4" style={{ fontSize: '1rem', color: '#555' }}>
          Don&apos;t have an account?{' '}
          <span
            className="fw-bold"
            style={{ 
              color: '#5470FF', 
              cursor: 'pointer',
              textDecoration: 'underline',
              transition: 'all 0.3s'
            }}
            onClick={() => navigate('/register')}
          >
            Register now
          </span>
        </div> */}
      </div>
      {/* Google Fonts for Poppins */}
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Montserrat:wght@500&display=swap" rel="stylesheet" />
    </div>
  );
};

export default Login;