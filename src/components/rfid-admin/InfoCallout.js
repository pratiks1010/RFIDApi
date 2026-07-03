import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';

const InfoCallout = ({ children, variant = 'info' }) => (
  <div className={`rfid-callout rfid-callout-${variant}`}>
    <FaInfoCircle className="rfid-callout-icon" aria-hidden />
    <div className="rfid-callout-body">{children}</div>
  </div>
);

export default InfoCallout;
