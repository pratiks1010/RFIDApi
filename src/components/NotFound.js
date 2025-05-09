import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e3f0ff 0%, #f7faff 60%, #b3d8ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
        border: '1.5px solid #e3eafc',
        padding: '56px 48px 40px 48px',
        maxWidth: 600,
        width: '100%',
        textAlign: 'center',
        margin: 24,
        position: 'relative',
      }}>
        {/* Illustration */}
        <div style={{ marginBottom: 18 }}>
          <svg width="110" height="110" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="55" cy="55" r="50" fill="#f5f6fa" />
            <circle cx="55" cy="55" r="38" fill="#eceef2" />
            <circle cx="75" cy="48" r="8" fill="#fff" stroke="#e0e3e8" strokeWidth="2" />
            <circle cx="40" cy="80" r="5" fill="#fff" stroke="#e0e3e8" strokeWidth="2" />
            <circle cx="70" cy="80" r="3.5" fill="#fff" stroke="#e0e3e8" strokeWidth="1.5" />
            <circle cx="35" cy="48" r="3.5" fill="#fff" stroke="#e0e3e8" strokeWidth="1.5" />
            {/* Astronaut */}
            <circle cx="55" cy="28" r="7" fill="#fff" stroke="#e0e3e8" strokeWidth="2" />
            <rect x="52" y="14" width="6" height="12" rx="3" fill="#eceef2" />
            <rect x="58" y="22" width="2" height="7" rx="1" fill="#e0e3e8" />
            <rect x="50" y="22" width="2" height="7" rx="1" fill="#e0e3e8" />
            <rect x="54" y="36" width="2" height="9" rx="1" fill="#e0e3e8" />
          </svg>
        </div>
        <div style={{ fontWeight: 700, fontSize: 32, color: '#444', marginBottom: 8 }}>404 not found</div>
        <div style={{ color: '#888', fontSize: 16, marginBottom: 24 }}>
          Ooops. It seems that you've landed on the wrong planet.
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'linear-gradient(90deg, #1db6c1 0%, #3a8dde 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '12px 36px',
            fontWeight: 600,
            fontSize: 18,
            cursor: 'pointer',
            boxShadow: '0 2px 8px #1db6c122',
            transition: 'background 0.2s',
            marginBottom: 18
          }}
        >
          Go to dashboard
        </button>
        <div style={{ color: '#aaa', fontSize: 15, marginTop: 18 }}>
          If the problem persists, please <a href="mailto:support@example.com" style={{ color: '#1db6c1', textDecoration: 'underline' }}>contact support</a> team to assist you.
        </div>
      </div>
    </div>
  );
};

export default NotFound; 