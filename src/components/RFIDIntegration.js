import React from 'react';
import { FaSync, FaTag, FaPrint, FaBarcode, FaCheck, FaListAlt } from 'react-icons/fa';
import BackToProfileMenu from './common/BackToProfileMenu';

const RFIDIntegration = () => {
  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .rfid-integration-container {
            padding: 16px 20px !important;
          }
          .rfid-header {
            margin-bottom: 24px !important;
          }
          .rfid-header-icon {
            width: 50px !important;
            height: 50px !important;
            margin-bottom: 12px !important;
          }
          .rfid-header-icon svg {
            font-size: 20px !important;
          }
          .rfid-title {
            font-size: 22px !important;
            margin-bottom: 8px !important;
          }
          .rfid-subtitle {
            font-size: 13px !important;
          }
          .rfid-cards-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            margin-bottom: 24px !important;
          }
          .rfid-card {
            padding: 20px !important;
          }
          .rfid-card-header {
            margin-bottom: 16px !important;
            gap: 10px !important;
          }
          .rfid-card-icon {
            width: 36px !important;
            height: 36px !important;
          }
          .rfid-card-icon svg {
            font-size: 18px !important;
          }
          .rfid-card-title {
            font-size: 16px !important;
          }
          .rfid-card-list {
            font-size: 13px !important;
          }
          .rfid-card-list li {
            margin-bottom: 8px !important;
            gap: 8px !important;
          }
          .rfid-info-section {
            padding: 20px !important;
            margin-top: 24px !important;
          }
          .rfid-info-title {
            font-size: 16px !important;
            margin-bottom: 12px !important;
          }
          .rfid-info-text {
            font-size: 13px !important;
          }
        }
        @media (max-width: 480px) {
          .rfid-integration-container {
            padding: 12px 16px !important;
          }
          .rfid-header-icon {
            width: 40px !important;
            height: 40px !important;
          }
          .rfid-title {
            font-size: 20px !important;
          }
          .rfid-card {
            padding: 16px !important;
          }
        }
      `}</style>
      <div className="rfid-integration-container" style={{
        padding: '20px 24px',
        maxWidth: '1200px',
        margin: '0 auto',
        color: '#2d3748',
        minHeight: 'calc(100vh - 64px)',
      }}>
        <BackToProfileMenu style={{ marginBottom: 24 }} />

        {/* Header Section */}
        <div className="rfid-header" style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <div className="rfid-header-icon" style={{
            width: '60px',
            height: '60px',
            background: '#2563eb',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
          }}>
            <FaSync style={{ 
              fontSize: '24px', 
              color: '#ffffff' 
            }} />
          </div>
          <h1 className="rfid-title" style={{
            fontSize: '26px',
            fontWeight: '600',
            color: '#1a202c',
            marginBottom: '10px',
            letterSpacing: '-0.01em'
          }}>
            Secure RFID Integration
          </h1>
          <p className="rfid-subtitle" style={{
            fontSize: '14px',
            color: '#64748b',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.5'
          }}>
            Select an endpoint from the left to start making secure API requests for your RFID operations.
          </p>
        </div>
          
        {/* Integration Cards */}
        <div className="rfid-cards-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          {/* Reusable Tag Card */}
          <div className="rfid-card" style={{
            background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid rgba(99, 102, 241, 0.1)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
          }}>
            <div className="rfid-card-header" style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '18px',
              gap: '12px'
            }}>
              <div className="rfid-card-icon" style={{
                width: '40px',
                height: '40px',
                background: '#4F46E5',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FaTag style={{ fontSize: '20px', color: '#ffffff' }} />
              </div>
              <h2 className="rfid-card-title" style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1E293B',
                margin: 0
              }}>
                Reusable Tag
              </h2>
            </div>
            <ul className="rfid-card-list" style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              color: '#475569',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <li style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: '10px',
                gap: '10px'
              }}>
                <FaCheck style={{ 
                  color: '#4F46E5', 
                  marginTop: '3px',
                  flexShrink: 0,
                  fontSize: '12px'
                }} />
                <span>To use the reusable tags in your software system, we need one text box like RFID code or RFID no.</span>
              </li>
              <li style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: '10px',
                gap: '10px'
              }}>
                <FaCheck style={{ 
                  color: '#4F46E5', 
                  marginTop: '3px',
                  flexShrink: 0,
                  fontSize: '12px'
                }} />
                <span>While you do the stock entry, our RFID number has to be entered manually or Scan the QR, Using QR code Scanner</span>
              </li>
              <li style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: '10px',
                gap: '10px'
              }}>
                <FaCheck style={{ 
                  color: '#4F46E5', 
                  marginTop: '3px',
                  flexShrink: 0,
                  fontSize: '12px'
                }} />
                <span>So our RFID number will pair with your itemCode.</span>
              </li>
              <li style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: '10px',
                gap: '10px'
              }}>
                <FaCheck style={{ 
                  color: '#4F46E5', 
                  marginTop: '3px',
                  flexShrink: 0,
                  fontSize: '12px'
                }} />
                <span>In existing stocks, customers can edit or insert the RFID number in the inventory list.</span>
              </li>
              <li style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <FaCheck style={{ 
                  color: '#4F46E5', 
                  marginTop: '3px',
                  flexShrink: 0,
                  fontSize: '12px'
                }} />
                <span>For previous stocks, customers can prepare an Excel sheet of inventory with RFID numbers.</span>
              </li>
            </ul>
          </div>

          {/* Single Time Use Tag Card */}
          <div className="rfid-card" style={{
            background: 'linear-gradient(135deg, #FEF9C3 0%, #FEF3C7 100%)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid rgba(234, 179, 8, 0.1)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
          }}>
            <div className="rfid-card-header" style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '18px',
              gap: '12px'
            }}>
              <div className="rfid-card-icon" style={{
                width: '40px',
                height: '40px',
                background: '#CA8A04',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FaPrint style={{ fontSize: '20px', color: '#ffffff' }} />
              </div>
              <h2 className="rfid-card-title" style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1E293B',
                margin: 0
              }}>
                Single Time Use Tag
              </h2>
            </div>
            <ul className="rfid-card-list" style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              color: '#475569',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <li style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: '10px',
                gap: '10px'
              }}>
                <FaCheck style={{ 
                  color: '#CA8A04', 
                  marginTop: '3px',
                  flexShrink: 0,
                  fontSize: '12px'
                }} />
                <span>Single time use tags can be printed and encoded using an RFID printer.</span>
              </li>
              <li style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: '10px',
                gap: '10px'
              }}>
                <FaCheck style={{ 
                  color: '#CA8A04', 
                  marginTop: '3px',
                  flexShrink: 0,
                  fontSize: '12px'
                }} />
                <span>The RFID printer converts an item code or barcode value to a hexadecimal number.</span>
              </li>
              <li style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: '10px',
                gap: '10px'
              }}>
                <FaCheck style={{ 
                  color: '#CA8A04', 
                  marginTop: '3px',
                  flexShrink: 0,
                  fontSize: '12px'
                }} />
                <span>The hexadecimal number should be a multiple of four.</span>
              </li>
              <li style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: '10px',
                gap: '10px'
              }}>
                <FaCheck style={{ 
                  color: '#CA8A04', 
                  marginTop: '3px',
                  flexShrink: 0,
                  fontSize: '12px'
                }} />
                <span>If the hexadecimal code is not in the multiple of four, the printer adds "00" at the start or end of the hexCode.</span>
              </li>
              <li style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <FaCheck style={{ 
                  color: '#CA8A04', 
                  marginTop: '3px',
                  flexShrink: 0,
                  fontSize: '12px'
                }} />
                <span>If the exact hexadecimal code matches, the RFID inventory will be updated automatically.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="rfid-info-section" style={{
          background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          marginTop: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px',
            gap: '10px'
          }}>
            <FaListAlt style={{ 
              fontSize: '20px', 
              color: '#64748B' 
            }} />
            <h3 className="rfid-info-title" style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1E293B',
              margin: 0
            }}>
              Additional Information
            </h3>
          </div>
          <p className="rfid-info-text" style={{
            color: '#475569',
            fontSize: '14px',
            lineHeight: '1.6',
            margin: 0
          }}>
            For more detailed information about RFID integration or technical support, please contact our support team.
          </p>
        </div>
      </div>
    </>
  );
};

export default RFIDIntegration;
