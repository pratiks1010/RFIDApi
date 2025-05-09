import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// Route: /upload-rfid -> UploadRFID component (Excel file upload for RFID data)

const RFIDIntegration = () => {
  const [userInfo, setUserInfo] = useState({});

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
    setUserInfo(userInfo);
  }, []);

  // Common style objects
  const buttonHoverStyles = {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(84, 112, 255, 0.4)'
  };

  const buttonResetStyles = {
    transform: 'translateY(0)',
    boxShadow: '0 4px 14px rgba(84, 112, 255, 0.3)'
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 60%, #ececec 100%)'
    }}>
      <Header userInfo={userInfo} />
      
      <div
        className="hide-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 60%, #ececec 100%)',
          minHeight: '100vh',
          paddingBottom: '2rem',
          transition: 'background 0.4s',
          position: 'relative',
        }}
      >
        {/* Animated background pattern */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 80% 20%, #b3d8ff33 0%, transparent 60%), radial-gradient(circle at 20% 80%, #ffeaea33 0%, transparent 60%)',
          animation: 'bgMove 12s linear infinite alternate',
        }}></div>
        <div className="container py-5" style={{ position: 'relative', zIndex: 1 }}>
          <div className="text-center mb-5">
            <div style={{ 
              width: 100,
              height: 100,
              background: 'linear-gradient(135deg, #0078d4 0%, #5470FF 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 12px 32px #5470ff33, 0 4px 16px #5470ff22',
              border: '4px solid #fff',
              position: 'relative',
              animation: 'iconPulse 2.5s infinite alternate',
            }}>
              <i className="fas fa-plug fa-3x" style={{ color: 'white', filter: 'drop-shadow(0 0 8px #ffb34788)' }}></i>
              {/* Pin effect */}
              <div style={{
                position: 'absolute',
                top: -18,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 28,
                height: 28,
                background: 'linear-gradient(135deg, #fffbe3 0%, #ffe3ec 60%, #b3d8ff 100%)',
                borderRadius: '50%',
                boxShadow: '0 2px 8px #ffe3ec55',
                border: '2.5px solid #fff',
                zIndex: 2
              }}></div>
            </div>
            <h1 className="mb-3 fw-bold" style={{ 
              fontSize: '2.7rem',
              color: '#0078d4',
              letterSpacing: 0.5,
              background: 'linear-gradient(90deg, #0078d4 0%, #ffb347 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'Poppins, Inter, sans-serif',
              fontWeight: 900,
              textShadow: '0 2px 8px #ffb34722'
            }}>
              RFID Integration
            </h1>
            <p className="lead mb-5" style={{ 
              fontSize: '1.2rem', 
              color: '#555', 
              maxWidth: '800px', 
              margin: '0 auto',
              fontFamily: 'Inter, sans-serif'
            }}>
              Follow these steps to seamlessly integrate RFID technology with your existing systems.
            </p>
          </div>
          
          {/* Side-by-side card layout */}
          <div className="row g-4 justify-content-center align-items-stretch mb-4">
            {/* Reusable Tag Section */}
            <div className="col-12 col-md-6 d-flex">
              <div className="card border-0 shadow-sm rfid-card rfid-card-reusable w-100" style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', transition: 'box-shadow 0.2s, transform 0.2s', minHeight: 320, background: 'linear-gradient(135deg, #e3f0ff 0%, #fafdff 100%)', border: '2.5px solid #b3d8ff', boxShadow: '0 8px 32px #b3d8ff33' }}>
                {/* Accent Bar */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 10,
                  background: 'linear-gradient(180deg, #5470FF 0%, #6C8FFF 100%)',
                  borderTopLeftRadius: 20,
                  borderBottomLeftRadius: 20,
                  boxShadow: '0 0 16px #5470ff55',
                  zIndex: 1
                }}></div>
                <div className="card-body p-4" style={{ position: 'relative', zIndex: 2 }}>
                  <div className="d-flex align-items-center mb-3">
                    <div style={{
                      width: 54,
                      height: 54,
                      background: 'radial-gradient(circle at 60% 40%, #0078d4 60%, #5470FF 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '20px',
                      boxShadow: '0 0 18px #5470ff88, 0 2px 8px #b3d8ff44',
                      border: '3px solid #fff',
                      position: 'relative',
                    }}>
                      <i className="fas fa-redo" style={{ color: '#fff', fontSize: 30, textShadow: '0 0 10px #5470ff88' }}></i>
                      {/* Pin effect */}
                      <div style={{
                        position: 'absolute',
                        top: -14,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 18,
                        height: 18,
                        background: 'linear-gradient(135deg, #fffbe3 0%, #e3f0ff 100%)',
                        borderRadius: '50%',
                        boxShadow: '0 2px 8px #e3f0ff55',
                        border: '2px solid #fff',
                        zIndex: 2
                      }}></div>
                    </div>
                    <h4 className="mb-0 fw-bold" style={{ color: '#2a4d9c', fontFamily: 'Poppins, Inter, sans-serif', fontWeight: 900, fontSize: '1.35rem', letterSpacing: 0.2, textShadow: '0 2px 8px #b3d8ff22' }}>Reusable Tag</h4>
                  </div>
                  <ul style={{ fontSize: '1.09rem', color: '#333', marginLeft: 10, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                    <li>To use the reusable tags in your software system, we need one text box like RFID code or RFID no.</li>
                    <li>While you do the stock entry, at that time our RFID no has to be scanned (QR code) or the RFID number typed.</li>
                    <li>So our RFID number will pair with your item code.</li>
                    <li>In existing stocks, customers can edit or put the RFID number in the inventory list.</li>
                    <li>For existing stocks, customers can prepare an Excel sheet of matching RFID code and item code.</li>
                  </ul>
                </div>
              </div>
            </div>
            {/* Single Time Use Tag Section */}
            <div className="col-12 col-md-6 d-flex">
              <div className="card border-0 shadow-sm rfid-card rfid-card-single w-100" style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', transition: 'box-shadow 0.2s, transform 0.2s', minHeight: 320, background: 'linear-gradient(135deg, #fffbe3 0%, #fff3b3 100%)', border: '2.5px solid #ffe5b3', boxShadow: '0 8px 32px #ffe5b333' }}>
                {/* Accent Bar */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 10,
                  background: 'linear-gradient(180deg, #FF9966 0%, #FF5E62 100%)',
                  borderTopLeftRadius: 20,
                  borderBottomLeftRadius: 20,
                  boxShadow: '0 0 16px #ff996655',
                  zIndex: 1
                }}></div>
                <div className="card-body p-4" style={{ position: 'relative', zIndex: 2 }}>
                  <div className="d-flex align-items-center mb-3">
                    <div style={{
                      width: 54,
                      height: 54,
                      background: 'radial-gradient(circle at 60% 40%, #0078d4 60%, #5470FF 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '20px',
                      boxShadow: '0 0 18px #5470ff88, 0 2px 8px #b3d8ff44',
                      border: '3px solid #fff',
                      position: 'relative',
                    }}>
                      <i className="fas fa-tag" style={{ color: '#fff', fontSize: 30, textShadow: '0 0 10px #ff996688' }}></i>
                      {/* Pin effect */}
                      <div style={{
                        position: 'absolute',
                        top: -14,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 18,
                        height: 18,
                        background: 'linear-gradient(135deg, #ffe3ec 0%, #fffbe3 100%)',
                        borderRadius: '50%',
                        boxShadow: '0 2px 8px #ffe3ec55',
                        border: '2px solid #fff',
                        zIndex: 2
                      }}></div>
                    </div>
                    <h4 className="mb-0 fw-bold" style={{ color: '#bfa100', fontFamily: 'Poppins, Inter, sans-serif', fontWeight: 900, fontSize: '1.35rem', letterSpacing: 0.2, textShadow: '0 2px 8px #ffe5b322' }}>Single Time Use Tag</h4>
                  </div>
                  <ul style={{ fontSize: '1.09rem', color: '#333', marginLeft: 10, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                    <li>Single time use tags can be printed or encoded using an RFID printer.</li>
                    <li>The RFID printer converts an item code or barcode value to a hexadecimal number.</li>
                    <li>The hexadecimal number should be a multiple of four.</li>
                    <li>If the hexadecimal code is not a multiple of four, the printer adds "00" at the start or end of the hex code.</li>
                    <li>If the exact hexadecimal code matches, the RFID inventory will be scanned.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Add hover effect for cards */}
          <style>{`
            .rfid-card:hover {
              box-shadow: 0 16px 40px #b3d8ff55, 0 2px 8px #b3d8ff22;
              transform: translateY(-4px) scale(1.018);
            }
            .rfid-card-single:hover {
              box-shadow: 0 16px 40px #ffe5b355, 0 2px 8px #ffe5b322;
            }
            @media (max-width: 767px) {
              .rfid-card, .rfid-card-single {
                min-height: unset !important;
              }
            }
          `}</style>

          <div className="text-center mt-5">
            <div style={{ margin: '2rem auto', maxWidth: '600px' }}>
              <p className="mb-4" style={{ fontSize: '1.1rem', color: '#555' }}>
                For detailed API documentation and testing tools, please refer to the Dashboard page.
              </p>
              <Link 
                to="/dashboard" 
                className="btn px-5 py-3 fw-bold"
                style={{
                  fontSize: '1.1rem',
                  background: 'linear-gradient(45deg, #5470FF, #6C8FFF)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  boxShadow: '0 4px 14px rgba(84, 112, 255, 0.3)',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(45deg, #4560EB, #5A7DF0)';
                  Object.assign(e.currentTarget.style, buttonHoverStyles);
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(45deg, #5470FF, #6C8FFF)';
                  Object.assign(e.currentTarget.style, buttonResetStyles);
                }}
              >
                <i className="fas fa-arrow-left me-2"></i>
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RFIDIntegration; 