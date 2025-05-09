import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Header = ({ userInfo }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  // Helper to check if a path is active
  const isActive = (path) => location.pathname === path;

  // Common nav link style
  const navLinkBase = {
    textDecoration: 'none',
    color: '#0078d4',
    fontSize: '0.95rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    borderRadius: '20px',
    transition: 'all 0.3s',
    background: 'linear-gradient(90deg, #e3f0ff 0%, #fafdff 100%)',
    marginRight: '10px',
    boxShadow: '0 2px 8px #0078d411',
    border: '1px solid #e0e6ed',
  };
  const navLinkActive = {
    background: 'linear-gradient(90deg, #b3d8ff 0%, #e3f0ff 100%)',
    color: '#0078d4',
    boxShadow: '0 2px 8px #b3d8ff44',
    border: '1.5px solid #b3d8ff',
  };

  // Dropdown state for profile menu
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Add a ref to the profile button to match dropdown width
  const profileBtnRef = useRef(null);
  const [profileBtnWidth, setProfileBtnWidth] = useState(0);
  useEffect(() => {
    if (profileBtnRef.current) {
      setProfileBtnWidth(profileBtnRef.current.offsetWidth);
    }
  }, [dropdownOpen, userInfo?.Username]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  // Keyboard accessibility (ESC to close)
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleKey(e) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [dropdownOpen]);

  // Add live current time state
  const [currentTime, setCurrentTime] = useState(() => {
    const d = new Date();
    const pad = n => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()},  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  });
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      const pad = n => n.toString().padStart(2, '0');
      setCurrentTime(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()},  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Last login time state
  const [lastLoginTime, setLastLoginTime] = useState('');
  useEffect(() => {
    setLastLoginTime(localStorage.getItem('lastLoginTime') || '');
  }, [dropdownOpen]);

  // Responsive hamburger menu state
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Lock scroll when mobile nav is open
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen]);

  return (
    <header style={{
      background: 'linear-gradient(90deg, #fff 0%, #fafdff 60%, #e3f0ff 90%, #fbeaec 100%)',
      boxShadow: '0 2px 10px rgba(0, 120, 212, 0.07)',
      borderBottom: '1.5px solid #e0e6ed',
      fontFamily: 'Poppins, Inter, sans-serif',
      fontWeight: 500,
      letterSpacing: 0.1,
      zIndex: 100,
      padding: '1.2rem 2.2rem',
      position: 'relative',
    }}>
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center flex-wrap" style={{ minHeight: 56 }}>
          <div className="d-flex align-items-center">
            <Link to="/dashboard">
              <img 
                src="/Logo/Sparkle RFID svg.svg" 
                alt="Sparkle RFID" 
                style={{ 
                  height: '42px',
                  marginRight: '18px',
                  maxWidth: 140,
                  width: 'auto',
                  transition: 'all 0.2s',
                }} 
              />
            </Link>
            {/* Hamburger for mobile */}
            <button
              className="d-lg-none d-block ms-2"
              aria-label="Open navigation menu"
              style={{
                background: 'none',
                border: 'none',
                fontSize: 28,
                color: '#0078d4',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                marginLeft: 2,
                marginRight: 2,
                zIndex: 120,
              }}
              onClick={() => setMobileNavOpen(v => !v)}
            >
              <i className={`fas fa-${mobileNavOpen ? 'times' : 'bars'}`}></i>
            </button>
            {/* Desktop nav */}
            <nav className="d-none d-lg-flex align-items-center ms-2">
              <Link 
                to="/dashboard"
                style={{
                  ...navLinkBase,
                  ...(isActive('/dashboard') ? navLinkActive : {}),
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #b3d8ff 0%, #e3f0ff 100%)';
                  e.currentTarget.style.color = '#0078d4';
                  const icon = e.currentTarget.querySelector('i');
                  if (icon) icon.style.color = '#0078d4';
                }}
                onMouseOut={e => {
                  if (isActive('/dashboard')) {
                    e.currentTarget.style.background = navLinkActive.background;
                    e.currentTarget.style.color = navLinkActive.color;
                    const icon = e.currentTarget.querySelector('i');
                    if (icon) icon.style.color = '#0078d4';
                  } else {
                    e.currentTarget.style.background = navLinkBase.background;
                    e.currentTarget.style.color = navLinkBase.color;
                    const icon = e.currentTarget.querySelector('i');
                    if (icon) icon.style.color = '#0078d4';
                  }
                }}
              >
                <i className="fas fa-home me-2" style={{ color: isActive('/dashboard') ? '#0078d4' : '#0078d4' }}></i>
                Home
              </Link>
              <Link 
                to="/rfid-integration"
                style={{
                  ...navLinkBase,
                  marginLeft: '10px',
                  ...(isActive('/rfid-integration') ? navLinkActive : {}),
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #b3d8ff 0%, #e3f0ff 100%)';
                  e.currentTarget.style.color = '#0078d4';
                  const icon = e.currentTarget.querySelector('i');
                  if (icon) icon.style.color = '#0078d4';
                }}
                onMouseOut={e => {
                  if (isActive('/rfid-integration')) {
                    e.currentTarget.style.background = navLinkActive.background;
                    e.currentTarget.style.color = navLinkActive.color;
                    const icon = e.currentTarget.querySelector('i');
                    if (icon) icon.style.color = '#0078d4';
                  } else {
                    e.currentTarget.style.background = navLinkBase.background;
                    e.currentTarget.style.color = navLinkBase.color;
                    const icon = e.currentTarget.querySelector('i');
                    if (icon) icon.style.color = '#0078d4';
                  }
                }}
              >
                <i className="fas fa-plug me-2" style={{ color: isActive('/rfid-integration') ? '#0078d4' : '#0078d4' }}></i>
                RFID Integration
              </Link>
              <Link 
                to="/inventory"
                style={{
                  ...navLinkBase,
                  marginLeft: '10px',
                  ...(isActive('/inventory') ? navLinkActive : {}),
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #b3d8ff 0%, #e3f0ff 100%)';
                  e.currentTarget.style.color = '#0078d4';
                  const icon = e.currentTarget.querySelector('i');
                  if (icon) icon.style.color = '#0078d4';
                }}
                onMouseOut={e => {
                  if (isActive('/inventory')) {
                    e.currentTarget.style.background = navLinkActive.background;
                    e.currentTarget.style.color = navLinkActive.color;
                    const icon = e.currentTarget.querySelector('i');
                    if (icon) icon.style.color = '#0078d4';
                  } else {
                    e.currentTarget.style.background = navLinkBase.background;
                    e.currentTarget.style.color = navLinkBase.color;
                    const icon = e.currentTarget.querySelector('i');
                    if (icon) icon.style.color = '#0078d4';
                  }
                }}
              >
                <i className="fas fa-box me-2" style={{ color: isActive('/inventory') ? '#0078d4' : '#0078d4' }}></i>
                Inventory
              </Link>
              <Link 
                to="/upload-rfid"
                style={{
                  ...navLinkBase,
                  marginLeft: '10px',
                  ...(isActive('/upload-rfid') ? navLinkActive : {}),
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #b3d8ff 0%, #e3f0ff 100%)';
                  e.currentTarget.style.color = '#0078d4';
                  const icon = e.currentTarget.querySelector('i');
                  if (icon) icon.style.color = '#0078d4';
                }}
                onMouseOut={e => {
                  if (isActive('/upload-rfid')) {
                    e.currentTarget.style.background = navLinkActive.background;
                    e.currentTarget.style.color = navLinkActive.color;
                    const icon = e.currentTarget.querySelector('i');
                    if (icon) icon.style.color = '#0078d4';
                  } else {
                    e.currentTarget.style.background = navLinkBase.background;
                    e.currentTarget.style.color = navLinkBase.color;
                    const icon = e.currentTarget.querySelector('i');
                    if (icon) icon.style.color = '#0078d4';
                  }
                }}
              >
                <i className="fas fa-upload me-2" style={{ color: isActive('/upload-rfid') ? '#0078d4' : '#0078d4' }}></i>
                Upload EPC Data
              </Link>
            </nav>
          </div>
          {/* Mobile nav dropdown */}
          {mobileNavOpen && (
            <div
              className="mobile-nav-dropdown"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(255,255,255,0.98)',
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '1.5rem 1.2rem 1.2rem 1.2rem',
                boxShadow: '0 8px 32px #0078d422',
                animation: 'fadeIn 0.2s',
                overflowY: 'auto',
              }}
            >
              <Link to="/dashboard" onClick={() => setMobileNavOpen(false)} style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, color: '#0078d4', textDecoration: 'none', width: '100%', padding: '10px 0' }}><i className="fas fa-home me-2"></i> Home</Link>
              <Link to="/rfid-integration" onClick={() => setMobileNavOpen(false)} style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, color: '#0078d4', textDecoration: 'none', width: '100%', padding: '10px 0' }}><i className="fas fa-plug me-2"></i> RFID Integration</Link>
              <Link to="/inventory" onClick={() => setMobileNavOpen(false)} style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, color: '#0078d4', textDecoration: 'none', width: '100%', padding: '10px 0' }}><i className="fas fa-box me-2"></i> Inventory</Link>
              <Link to="/upload-rfid" onClick={() => setMobileNavOpen(false)} style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, color: '#0078d4', textDecoration: 'none', width: '100%', padding: '10px 0' }}><i className="fas fa-upload me-2"></i> Upload EPC Data</Link>
              <div style={{ marginTop: 24, width: '100%' }}>
                {/* Date/time and profile for mobile */}
                <div style={{
                  marginBottom: 18,
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: 'linear-gradient(90deg, #fafdff 0%, #e3f0ff 100%)',
                  color: '#0078d4',
                  fontWeight: 600,
                  fontSize: 13,
                  boxShadow: '0 2px 8px #b3d8ff22',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'Poppins, Inter, sans-serif',
                  letterSpacing: 0.1,
                  minWidth: 120,
                  height: 36
                }}>
                  <i className="fas fa-clock" style={{ color: '#0078d4', fontSize: 13 }}></i>
                  <span>{currentTime}</span>
                </div>
                {/* Profile card for mobile */}
                <div style={{
                  width: '100%',
                  background: 'linear-gradient(90deg, #e3f0ff 0%, #fafdff 100%)',
                  borderRadius: 18,
                  boxShadow: '0 2px 8px #b3d8ff22',
                  padding: '16px 14px 12px 14px',
                  marginBottom: 10,
                  marginTop: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                    <span style={{
                      background: 'linear-gradient(135deg, #e3f0ff 0%, #b3d8ff 100%)',
                      borderRadius: '50%',
                      padding: 7,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px #b3d8ff11',
                    }}>
                      <i className="fas fa-user" style={{ color: '#0078d4', fontSize: 18 }}></i>
                    </span>
                    <span style={{ fontWeight: 700, color: '#222', fontFamily: 'Poppins, Inter, sans-serif', fontSize: '1.08rem', letterSpacing: 0.1 }}>
                      {userInfo.Username}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: '#0078d4', fontSize: 13 }}>
                    Client Code:
                    <span style={{ color: '#d60000', fontWeight: 700, marginLeft: 6 }}>{userInfo.ClientCode}</span>
                  </div>
                  <div style={{ color: '#222', fontWeight: 500, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-clock" style={{ color: '#0078d4', fontSize: 13, marginRight: 4 }}></i>
                    <span>{lastLoginTime}</span>
                  </div>
                  <button
                    onClick={() => { setMobileNavOpen(false); handleLogout(); }}
                    style={{
                      background: 'linear-gradient(90deg, #ffeaea 0%, #ffd6d6 100%)',
                      border: 'none',
                      color: '#d60000',
                      fontWeight: 700,
                      fontFamily: 'Poppins, Inter, sans-serif',
                      fontSize: 15,
                      width: '100%',
                      textAlign: 'center',
                      padding: '11px 0',
                      borderRadius: 12,
                      marginTop: 8,
                      boxShadow: '0 2px 8px #ffd6d633',
                      cursor: 'pointer',
                      transition: 'background 0.18s, color 0.18s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'linear-gradient(90deg, #ffd6d6 0%, #ffeaea 100%)'; e.currentTarget.style.color = '#b30000'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'linear-gradient(90deg, #ffeaea 0%, #ffd6d6 100%)'; e.currentTarget.style.color = '#d60000'; }}
                  >
                    <i className="fas fa-sign-out-alt" style={{ fontSize: 16, marginRight: 7 }}></i>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Desktop date/time and profile */}
          {!mobileNavOpen && userInfo && (
            <div className="d-none d-lg-flex align-items-center" style={{ position: 'relative' }}>
              {/* Live Date/Time - compact, right next to profile */}
              <div style={{
                marginRight: 8,
                padding: '4px 10px',
                borderRadius: 14,
                background: 'linear-gradient(90deg, #fafdff 0%, #e3f0ff 100%)',
                color: '#0078d4',
                fontWeight: 600,
                fontSize: 12,
                boxShadow: '0 2px 8px #b3d8ff22',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: 'Poppins, Inter, sans-serif',
                letterSpacing: 0.1,
                minWidth: 110,
                height: 32
              }}>
                <i className="fas fa-clock" style={{ color: '#0078d4', fontSize: 13 }}></i>
                <span>{currentTime}</span>
              </div>
              {/* Profile button and dropdown */}
              <button
                ref={profileBtnRef}
                className="profile-btn"
                style={{
                  background: dropdownOpen
                    ? 'linear-gradient(90deg, #b3d8ff 0%, #e3f0ff 100%)'
                    : 'linear-gradient(90deg, #e3f0ff 0%, #fafdff 100%)',
                  padding: '10px 22px 10px 16px',
                  borderRadius: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  fontFamily: 'Poppins, Inter, sans-serif',
                  fontWeight: 600,
                  boxShadow: dropdownOpen
                    ? '0 4px 18px #b3d8ff22, 0 1.5px 6px #0001'
                    : '0 2px 8px #b3d8ff11',
                  border: dropdownOpen ? '2px solid #b3d8ff' : '1.5px solid #e0e6ed',
                  color: '#222',
                  fontSize: '1.08rem',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'box-shadow 0.2s, background 0.2s, border 0.2s',
                  position: 'relative',
                  zIndex: 11,
                  minWidth: 170,
                }}
                onClick={() => setDropdownOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
                tabIndex={0}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #b3d8ff 0%, #e3f0ff 100%)';
                  e.currentTarget.style.boxShadow = '0 4px 18px #b3d8ff22, 0 1.5px 6px #0001';
                  e.currentTarget.style.border = '2px solid #b3d8ff';
                }}
                onMouseOut={e => {
                  if (!dropdownOpen) {
                    e.currentTarget.style.background = 'linear-gradient(90deg, #e3f0ff 0%, #fafdff 100%)';
                    e.currentTarget.style.boxShadow = '0 2px 8px #b3d8ff11';
                    e.currentTarget.style.border = '1.5px solid #e0e6ed';
                  }
                }}
              >
                <span style={{
                  background: 'linear-gradient(135deg, #e3f0ff 0%, #b3d8ff 100%)',
                  borderRadius: '50%',
                  padding: 7,
                  marginRight: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px #b3d8ff11',
                }}>
                  <i className="fas fa-user" style={{ color: '#0078d4', fontSize: 18 }}></i>
                </span>
                <span style={{ fontWeight: 700, color: '#222', fontFamily: 'Poppins, Inter, sans-serif', fontSize: '1.08rem', letterSpacing: 0.1 }}>
                  {userInfo.Username}
                </span>
                <i className={`fas fa-chevron-${dropdownOpen ? 'up' : 'down'} ms-2`} style={{ color: '#0078d4', fontSize: 15, marginLeft: 12 }}></i>
              </button>
              {dropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="profile-dropdown shadow-lg"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: profileBtnWidth || 220,
                    background: '#fff',
                    borderRadius: 18,
                    boxShadow: '0 8px 32px #0078d422',
                    zIndex: 100,
                    padding: '18px 22px 10px 22px',
                    fontFamily: 'Poppins, Inter, sans-serif',
                    fontWeight: 500,
                    color: '#222',
                    marginTop: 2,
                    border: '1.5px solid #e0e6ed',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#0078d4', fontSize: 14, marginBottom: 4 }}>
                    Client Code:
                    <span style={{ color: '#d60000', fontWeight: 700, marginLeft: 6 }}>{userInfo.ClientCode}</span>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, color: '#222', fontSize: 13, marginBottom: 2 }}>Last Login:</div>
                    <div style={{ color: '#222', fontWeight: 500, fontSize: 12, marginLeft: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fas fa-clock" style={{ color: '#0078d4', fontSize: 13, marginRight: 4 }}></i>
                      <span>{lastLoginTime}</span>
                    </div>
                  </div>
                  <hr style={{ margin: '7px 0 7px 0', border: 0, borderTop: '1px solid #e0e6ed' }} />
                  <button
                    onClick={handleLogout}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0078d4',
                      fontWeight: 700,
                      fontFamily: 'Poppins, Inter, sans-serif',
                      fontSize: 13,
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 18px',
                      cursor: 'pointer',
                      borderRadius: 10,
                      transition: 'background 0.18s, color 0.18s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(214,0,0,0.10)'; e.currentTarget.style.color = '#d60000'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#0078d4'; }}
                  >
                    <i className="fas fa-sign-out-alt" style={{ fontSize: 15, marginRight: 7 }}></i>
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Responsive header CSS */}
      <style>{`
        @media (max-width: 900px) {
          .d-lg-flex { display: none !important; }
          .d-lg-none { display: block !important; }
        }
        @media (min-width: 901px) {
          .d-lg-flex { display: flex !important; }
          .d-lg-none { display: none !important; }
        }
        @media (max-width: 600px) {
          header {
            padding: 0.7rem 0.5rem !important;
          }
          .profile-btn {
            min-width: 120px !important;
            font-size: 0.98rem !important;
            padding: 8px 10px 8px 10px !important;
          }
        }
      `}</style>
    </header>
  );
};

export default Header; 