import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import '../../styles/rfidAdmin.css';

const RfidAdminPage = ({ title, subtitle, backTo, backLabel = 'Back', children, actions }) => (
  <div className="rfid-admin-page">
    <div className="rfid-admin-hero">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          {backTo && (
            <Link
              to={backTo}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#fde68a',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
                marginBottom: 10,
              }}
            >
              <FaArrowLeft size={12} /> {backLabel}
            </Link>
          )}
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
      </div>
    </div>
    {children}
  </div>
);

export default RfidAdminPage;
