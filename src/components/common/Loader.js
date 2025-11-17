import React from 'react';

const ZohoLoader = ({ text = 'Loading...' }) => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(255,255,255,0.75)',
    zIndex: 20000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    transition: 'opacity 0.2s',
  }}>
    <div style={{
      background: 'white',
      borderRadius: '18px',
      boxShadow: '0 4px 32px 0 rgba(44,62,80,0.10)',
      padding: '36px 48px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minWidth: 180,
    }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 18 }}>
        <circle cx="24" cy="24" r="20" stroke="#e0e7ef" strokeWidth="6" />
        <path d="M44 24a20 20 0 1 1-8.28-16.28" stroke="#2563eb" strokeWidth="6" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="1s" repeatCount="indefinite" />
        </path>
      </svg>
      <span style={{
        fontFamily: 'Inter, Poppins, sans-serif',
        fontWeight: 600,
        fontSize: '1.13rem',
        color: '#232a36',
        letterSpacing: '-0.01em',
      }}>{text}</span>
    </div>
  </div>
);

export default ZohoLoader; 