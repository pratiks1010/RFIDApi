import React, { useEffect } from 'react';
import { FaShieldAlt } from 'react-icons/fa';

const WelcomeModal = ({ onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(44,62,80,0.10)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(90deg, #fff 70%, #f3f4f6 100%)',
        borderRadius: 22,
        boxShadow: '0 8px 32px rgba(44,62,80,0.13)',
        padding: '38px 48px 32px 48px',
        minWidth: 340,
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Inter, Poppins, sans-serif',
        textAlign: 'center',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #2563eb 60%, #60a5fa 100%)',
          borderRadius: 16,
          width: 64,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
          boxShadow: '0 2px 8px #2563eb22',
        }}>
          <FaShieldAlt style={{ color: '#fff', fontSize: 34 }} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 26, color: '#232a36', letterSpacing: '-1px', marginBottom: 8 }}>
          Welcome to RFID Secure Dashboard
        </div>
        <div style={{ fontWeight: 500, fontSize: 15, color: '#64748b', marginBottom: 0 }}>
          Your one-stop platform for secure, real-time RFID inventory management.<br />
          Track, verify, and manage your assets with confidence and ease.
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal; 