import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import '../../styles/rfidAdmin.css';

const RfidAdminPage = ({ title, subtitle, backTo, backLabel = 'Back', children, actions }) => (
  <div className="rfid-admin-page">
    <div className="rfid-admin-hero">
      <div className="rfid-admin-hero-inner">
        <div>
          {backTo && (
            <Link to={backTo} className="rfid-back-link">
              <FaArrowLeft size={12} /> {backLabel}
            </Link>
          )}
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="rfid-hero-actions">{actions}</div>}
      </div>
    </div>
    {children}
  </div>
);

export default RfidAdminPage;
