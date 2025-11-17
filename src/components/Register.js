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
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Poppins, Inter, sans-serif'
    }}>
      <ToastContainer />
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        padding: '2rem',
        margin: '1rem'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '64px',
            height: '64px',
            background: '#0078d4',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <i className="fas fa-user-plus fa-lg" style={{ color: 'white' }}></i>
          </div>
          <img 
            src="/Logo/Sparkle RFID svg.svg" 
            alt="Sparkle RFID" 
            style={{ height: '35px', marginBottom: '1rem' }}
          />
          <h3 style={{ 
            color: '#181818',
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '0.5rem'
          }}>
            RFID Secure API
          </h3>
          <p style={{ 
            color: '#666',
            fontSize: '0.95rem',
            fontWeight: 500
          }}>
            Register to access the dashboard
          </p>
        </div>

        {error && (
          <div style={{ 
            background: '#fee2e2',
            color: '#dc2626',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label 
              htmlFor="Username" 
              style={{ 
                display: 'block',
                marginBottom: '0.5rem',
                color: '#181818',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#0078d4'
              }}>
                <i className="fas fa-user"></i>
              </span>
              <input
                type="text"
                id="Username"
                name="Username"
                value={formData.Username}
                onChange={handleChange}
                required
                placeholder="Enter your username"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: '#181818',
                  backgroundColor: '#fff',
                  transition: 'all 0.2s'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label 
              htmlFor="ClientCode" 
              style={{ 
                display: 'block',
                marginBottom: '0.5rem',
                color: '#181818',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              Client Code
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#0078d4'
              }}>
                <i className="fas fa-building"></i>
              </span>
              <input
                type="text"
                id="ClientCode"
                name="ClientCode"
                value={formData.ClientCode}
                onChange={handleChange}
                required
                placeholder="Enter your client code"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: '#181818',
                  backgroundColor: '#fff',
                  transition: 'all 0.2s'
                }}
              />
            </div>
            <p style={{
              fontSize: '0.75rem',
              color: '#dc2626',
              marginTop: '0.4rem',
              marginBottom: '0',
              fontWeight: 500
            }}>
              Client code is generated from Sparkle Masterpiece
            </p>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label 
              htmlFor="Password" 
              style={{ 
                display: 'block',
                marginBottom: '0.5rem',
                color: '#181818',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#0078d4'
              }}>
                <i className="fas fa-lock"></i>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="Password"
                name="Password"
                value={formData.Password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: '#181818',
                  backgroundColor: '#fff',
                  transition: 'all 0.2s'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#0078d4',
                  cursor: 'pointer'
                }}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#0078d4',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
              marginBottom: '1rem'
            }}
            disabled={loading}
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

          <div style={{ 
            textAlign: 'center',
            color: '#666',
            fontSize: '0.9rem'
          }}>
            Already have an account?{' '}
            <span
              onClick={() => navigate('/login')}
              style={{ 
                color: '#0078d4',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none'
              }}
            >
              Login now
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
