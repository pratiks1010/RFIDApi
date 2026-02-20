import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

const BackToProfileMenu = ({ style }) => {
  return (
    <Link
      to="/profile-menu"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: '#64748b',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: 500,
        marginBottom: '20px',
        padding: '8px 12px',
        borderRadius: '8px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        transition: 'all 0.2s ease',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f1f5f9';
        e.currentTarget.style.color = '#0f172a';
        e.currentTarget.style.borderColor = '#cbd5e1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#f8fafc';
        e.currentTarget.style.color = '#64748b';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      <FaArrowLeft size={14} />
      <span>Back to Profile Menu</span>
    </Link>
  );
};

export default BackToProfileMenu;
