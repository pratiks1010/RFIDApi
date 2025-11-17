import React from 'react';
import { FaSync, FaTag, FaPrint, FaBarcode, FaCheck, FaListAlt } from 'react-icons/fa';

const RFIDIntegration = () => {
  return (
    <div style={{
      padding: '32px 40px',
      maxWidth: '1200px',
      margin: '0 auto',
      color: '#2d3748',
    }}>
      {/* Header Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: '48px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: '#2563eb',
          borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 16px rgba(37, 99, 235, 0.1)',
            }}>
          <FaSync style={{ 
            fontSize: '32px', 
            color: '#ffffff' 
          }} />
            </div>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '600',
          color: '#1a202c',
          marginBottom: '16px'
            }}>
              RFID Integration
            </h1>
        <p style={{
          fontSize: '16px',
          color: '#64748b',
          maxWidth: '600px',
              margin: '0 auto',
          lineHeight: '1.6'
            }}>
              Follow these steps to seamlessly integrate RFID Technology with your existing systems.
            </p>
          </div>
          
      {/* Integration Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '32px',
        marginBottom: '48px'
      }}>
        {/* Reusable Tag Card */}
        <div style={{
          background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid rgba(99, 102, 241, 0.1)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}>
                <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '24px',
            gap: '16px'
          }}>
                    <div style={{
              width: '48px',
              height: '48px',
              background: '#4F46E5',
              borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
            }}>
              <FaTag style={{ fontSize: '24px', color: '#ffffff' }} />
                    </div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1E293B',
              margin: 0
            }}>
              Reusable Tag
            </h2>
                  </div>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            color: '#475569',
            fontSize: '15px',
            lineHeight: '1.7'
          }}>
            <li style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '12px',
              gap: '12px'
            }}>
              <FaCheck style={{ 
                color: '#4F46E5', 
                marginTop: '4px',
                flexShrink: 0
              }} />
              <span>To use the reusable tags in your software system, we need one text box like RFID code or RFID no.</span>
            </li>
            <li style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '12px',
              gap: '12px'
            }}>
              <FaCheck style={{ 
                color: '#4F46E5', 
                marginTop: '4px',
                flexShrink: 0
              }} />
             <span>While you do the stock entry, our RFID number has to be entered manually or Scan the QR, Using QR code Scanner</span>
            </li>
            <li style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '12px',
              gap: '12px'
            }}>
              <FaCheck style={{ 
                color: '#4F46E5', 
                marginTop: '4px',
                flexShrink: 0
              }} />
              <span>So our RFID number will pair with your itemCode.</span>
            </li>
            <li style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '12px',
              gap: '12px'
            }}>
              <FaCheck style={{ 
                color: '#4F46E5', 
                marginTop: '4px',
                flexShrink: 0
              }} />
              <span>In existing stocks, customers can edit or insert the RFID number in the inventory list.</span>
            </li>
            <li style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FaCheck style={{ 
                color: '#4F46E5', 
                marginTop: '4px',
                flexShrink: 0
              }} />
              <span>For previous stocks, customers can prepare an Excel sheet of inventory with RFID numbers.</span>
            </li>
                  </ul>
                </div>

        {/* Single Time Use Tag Card */}
        <div style={{
          background: 'linear-gradient(135deg, #FEF9C3 0%, #FEF3C7 100%)',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid rgba(234, 179, 8, 0.1)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}>
                <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '24px',
            gap: '16px'
          }}>
                    <div style={{
              width: '48px',
              height: '48px',
              background: '#CA8A04',
              borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
            }}>
              <FaPrint style={{ fontSize: '24px', color: '#ffffff' }} />
            </div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1E293B',
              margin: 0
            }}>
              Single Time Use Tag
            </h2>
          </div>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            color: '#475569',
            fontSize: '15px',
            lineHeight: '1.7'
          }}>
            <li style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '12px',
              gap: '12px'
            }}>
              <FaCheck style={{ 
                color: '#CA8A04', 
                marginTop: '4px',
                flexShrink: 0
              }} />
              <span>Single time use tags can be printed and encoded using an RFID printer.</span>
            </li>
            <li style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '12px',
              gap: '12px'
            }}>
              <FaCheck style={{ 
                color: '#CA8A04', 
                marginTop: '4px',
                flexShrink: 0
              }} />
              <span>The RFID printer converts an item code or barcode value to a hexadecimal number.</span>
            </li>
            <li style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '12px',
              gap: '12px'
            }}>
              <FaCheck style={{ 
                color: '#CA8A04', 
                marginTop: '4px',
                flexShrink: 0
              }} />
              <span>The hexadecimal number should be a multiple of four.</span>
            </li>
            <li style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '12px',
              gap: '12px'
            }}>
              <FaCheck style={{ 
                color: '#CA8A04', 
                marginTop: '4px',
                flexShrink: 0
              }} />
              <span>If the hexadecimal code is not in the multiple of four, the printer adds "00" at the start or end of the hexCode.</span>
            </li>
            <li style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FaCheck style={{ 
                color: '#CA8A04', 
                marginTop: '4px',
                flexShrink: 0
              }} />
              <span>If the exact hexadecimal code matches, the RFID inventory will be updated automatically.</span>
            </li>
          </ul>
            </div>
          </div>

      {/* Additional Information Section */}
      <div style={{
        background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid #E2E8F0',
        marginTop: '32px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '12px'
        }}>
          <FaListAlt style={{ 
            fontSize: '24px', 
            color: '#64748B' 
          }} />
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1E293B',
            margin: 0
          }}>
            Additional Information
          </h3>
        </div>
        <p style={{
          color: '#475569',
          fontSize: '15px',
          lineHeight: '1.7',
          margin: 0
        }}>
          For more detailed information about RFID integration or technical support, please contact our support team.
        </p>
      </div>
    </div>
  );
};

export default RFIDIntegration; 
