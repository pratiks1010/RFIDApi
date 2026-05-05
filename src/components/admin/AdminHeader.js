import React, { useState, useRef, useEffect } from 'react';
import { FaHome, FaUserPlus, FaUsers, FaFileUpload, FaUserShield, FaCog, FaUserCog, FaChartLine } from 'react-icons/fa';

// Utility function to decode JWT token
const decodeJWT = (token) => {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
};

// Add CSS animations for enhanced header
const headerStyles = `
  @keyframes slideInDown {
    from {
      opacity: 0;
      transform: translate3d(0, -100%, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeInScale {
    0% { 
      opacity: 0; 
      transform: scale(0.95) translateY(-10px); 
    }
    100% { 
      opacity: 1; 
      transform: scale(1) translateY(0); 
    }
  }
  
  @keyframes pulse {
    0%, 100% { 
      box-shadow: 0 2px 8px rgba(0, 119, 212, 0.2); 
    }
    50% { 
      box-shadow: 0 4px 16px rgba(0, 119, 212, 0.3); 
    }
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .nav-button {
    transition: all 0.2s ease;
  }
  
  .nav-button:hover {
    transform: translateY(-1px);
  }
  
  .profile-dropdown {
    animation: fadeInScale 0.2s ease;
  }

  .mobile-menu {
    animation: slideInRight 0.3s ease;
  }

  @media (max-width: 768px) {
    .admin-header-nav {
      display: none !important;
    }
    .mobile-menu-open .admin-header-nav {
      display: flex !important;
    }
  }

  @media (min-width: 769px) {
    .mobile-menu-button {
      display: none !important;
    }
    .mobile-menu-overlay {
      display: none !important;
    }
  }
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = headerStyles;
  if (!document.head.querySelector('style[data-admin-header]')) {
    styleElement.setAttribute('data-admin-header', 'true');
    document.head.appendChild(styleElement);
  }
}

const AdminHeader = ({ 
  activeSection = 'home',
  onNavigate
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [usersDropdownOpen, setUsersDropdownOpen] = useState(false);
  const [activitiesDropdownOpen, setActivitiesDropdownOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [adminInfo, setAdminInfo] = useState({
    username: 'Admin User',
    employeeId: 'Loading...',
    email: '',
    role: 'Administrator'
  });
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'New RFID device registered', time: '2 min ago', type: 'success', read: false },
    { id: 2, message: 'User registration pending approval', time: '15 min ago', type: 'warning', read: false },
    { id: 3, message: 'Daily backup completed', time: '1 hour ago', type: 'info', read: true },
    { id: 4, message: 'System maintenance scheduled', time: '2 hours ago', type: 'info', read: true }
  ]);
  const profileRef = useRef();
  const notificationRef = useRef();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Extract admin info from JWT token
  useEffect(() => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    
    // Also check if username is stored directly in localStorage from login
    const storedUsername = localStorage.getItem('adminUsername') || 
                          localStorage.getItem('currentUsername') ||
                          localStorage.getItem('loginUsername');
    
    if (token) {
      const decodedToken = decodeJWT(token);
      if (decodedToken) {
        console.log('Decoded admin token:', decodedToken);
        console.log('Available token fields:', Object.keys(decodedToken));
        
        // Try to get username from various possible fields in token
        const tokenUsername = decodedToken.username || 
                             decodedToken.UserName || 
                             decodedToken.userName || 
                             decodedToken.name || 
                             decodedToken.Name ||
                             decodedToken.user_name ||
                             decodedToken.clientName ||
                             decodedToken.ClientName ||
                             decodedToken.adminName ||
                             decodedToken.AdminName ||
                             decodedToken.sub ||  // Common JWT subject field
                             decodedToken.preferred_username ||
                             decodedToken.login ||
                             decodedToken.email?.split('@')[0]; // Extract username from email if available
        
        // Prefer stored username from login, then token username
        const finalUsername = storedUsername || tokenUsername || 'Admin User';
        
        const employeeId = decodedToken.employeeId || 
                          decodedToken.EmployeeId || 
                          decodedToken.employeeNumber ||
                          decodedToken.EmployeeNumber ||
                          decodedToken.emp_id || 
                          decodedToken.emp_number ||
                          decodedToken.id || 
                          decodedToken.Id ||
                          decodedToken.clientCode ||
                          decodedToken.ClientCode ||
                          decodedToken.adminId ||
                          decodedToken.AdminId ||
                          decodedToken.userId ||
                          decodedToken.UserId ||
                          decodedToken.jti ||  // JWT ID
                          'N/A';
        
        const email = decodedToken.email || 
                     decodedToken.Email || 
                     decodedToken.emailAddress ||
                     decodedToken.EmailAddress ||
                     decodedToken.user_email ||
                     '';
        
        const role = decodedToken.role || 
                    decodedToken.Role || 
                    decodedToken.userRole ||
                    decodedToken.UserRole ||
                    decodedToken.adminRole ||
                    decodedToken.AdminRole ||
                    decodedToken.scope ||
                    'Administrator';
        
        console.log('Extracted admin info:', {
          finalUsername,
          employeeId,
          email,
          role,
          storedUsername,
          tokenUsername
        });
        
        // Debug: Show which source provided the username
        if (storedUsername) {
          console.log('✅ Username found in localStorage:', storedUsername);
        } else if (tokenUsername) {
          console.log('✅ Username extracted from token:', tokenUsername);
        } else {
          console.log('⚠️ Using fallback username');
        }
        
        setAdminInfo({
          username: finalUsername,
          employeeId: employeeId,
          email: email,
          role: role
        });
      }
    } else if (storedUsername) {
      // If no token but username is stored, use it
      setAdminInfo(prev => ({
        ...prev,
        username: storedUsername
      }));
    }
    
    // Also check sessionStorage for username
    const sessionUsername = sessionStorage.getItem('adminUsername') ||
                           sessionStorage.getItem('currentUsername') ||
                           sessionStorage.getItem('loginUsername');
    
    if (sessionUsername && !storedUsername && !token) {
      setAdminInfo(prev => ({
        ...prev,
        username: sessionUsername
      }));
    }
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationOpen(false);
      }
    }
    if (profileOpen || notificationOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen, notificationOpen]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('lastLoginTime');
    localStorage.removeItem('showWelcomeToast');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('loginUsername');
    sessionStorage.clear();
    window.location.replace('/admin-login');
  };

  const menuItems = [
    { key: 'home', label: 'Home', icon: <FaHome style={{ fontSize: 16, marginBottom: -2 }} /> },
    { key: 'register', label: 'Register', icon: <FaUserPlus style={{ fontSize: 16, marginBottom: -2 }} /> },
    { key: 'users', label: 'Users', icon: <FaUsers style={{ fontSize: 16, marginBottom: -2 }} /> },
    { key: 'activities', label: 'Activities', icon: <FaChartLine style={{ fontSize: 16, marginBottom: -2 }} /> },
    { key: 'user-activity', label: 'User Activity', icon: <FaUserCog style={{ fontSize: 16, marginBottom: -2 }} /> },
    { key: 'upload', label: 'Upload RFID', icon: <FaFileUpload style={{ fontSize: 16, marginBottom: -2 }} /> },
    { key: 'settings', label: 'Settings', icon: <FaCog style={{ fontSize: 16, marginBottom: -2 }} /> },
  ];

  const getFirstName = (fullName) => {
    return fullName.split(' ')[0];
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const markNotificationAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <React.Fragment>
      <div style={{
        width: '100%',
        background: '#ffffff',
        padding: isMobile ? '12px 16px' : '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1)',
        borderBottom: '1px solid #e4e7ec',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        minHeight: isMobile ? '60px' : '72px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
      }}>
        {/* Logo Section */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? 8 : 16,
          minWidth: isMobile ? 'auto' : '220px',
          flexShrink: 0
        }}>
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: 'transparent',
                border: '1px solid #e4e7ec',
                borderRadius: 8,
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginRight: 8,
                outline: 'none'
              }}
              className="mobile-menu-button"
            >
              <i className="fas fa-bars" style={{ fontSize: 18, color: '#667085' }}></i>
            </button>
          )}
          <img 
            src={`${process.env.PUBLIC_URL || ''}/Logo/Sparkle%20RFID%20svg.svg`}
            alt="Sparkle RFID" 
            style={{ height: isMobile ? 24 : 32, width: 'auto', display: 'block' }}
            onError={(e) => { e.target.onerror = null; e.target.src = `${process.env.PUBLIC_URL || ''}/Logo/LSlogo.png`; }}
          />
          {!isMobile && (
            <div style={{
              color: '#101828',
              fontSize: '18px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              Admin Portal
            </div>
          )}
        </div>

        {/* Navigation Menu - Hidden on mobile, shown in sidebar */}
        <nav className="admin-header-nav" style={{ 
          display: isMobile ? 'none' : 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: isMobile ? 16 : 32, 
          flex: 1,
          margin: '0 auto',
          flexWrap: isMobile ? 'wrap' : 'nowrap'
        }}> 
        {menuItems.map((item) => {
          if (item.key === 'users') {
            return (
              <div key={item.key} style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={() => setUsersDropdownOpen(true)}
                onMouseLeave={() => setUsersDropdownOpen(false)}
              >
                <button
                  onClick={() => setUsersDropdownOpen(v => !v)}
                  className="nav-button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: (activeSection === 'rfid-users' || activeSection === 'erp-users' || activeSection === 'user-plans') ? '#0077d4' : '#667085',
                    fontWeight: (activeSection === 'rfid-users' || activeSection === 'erp-users' || activeSection === 'user-plans') ? 500 : 400,
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    outline: 'none',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    whiteSpace: 'nowrap',
                    borderBottom: (activeSection === 'rfid-users' || activeSection === 'erp-users' || activeSection === 'user-plans') ? '2px solid #0077d4' : '2px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== 'rfid-users' && activeSection !== 'erp-users' && activeSection !== 'user-plans') {
                      e.currentTarget.style.color = '#0077d4';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== 'rfid-users' && activeSection !== 'erp-users' && activeSection !== 'user-plans') {
                      e.currentTarget.style.color = '#667085';
                    }
                  }}
                >
                  {item.icon} 
                  <span>{item.label}</span>
                  <i className="fas fa-chevron-down" style={{ fontSize: 10, marginLeft: 2 }}></i>
                </button>
                {usersDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 50,
                    left: 0,
                    minWidth: 240,
                    background: '#ffffff',
                    borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(16, 24, 40, 0.12), 0 2px 8px rgba(16, 24, 40, 0.08)',
                    zIndex: 9999,
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    border: '1px solid #e4e7ec',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                  }}>
                    <button 
                      onClick={() => { 
                        onNavigate && onNavigate('rfid-users'); 
                        setUsersDropdownOpen(false); 
                      }} 
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: activeSection === 'rfid-users' ? '#0077d4' : '#667085', 
                        fontWeight: 400, 
                        fontSize: '14px', 
                        cursor: 'pointer', 
                        padding: '10px 12px', 
                        textAlign: 'left', 
                        width: '100%', 
                        borderRadius: 6, 
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        whiteSpace: 'nowrap',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.color = '#101828';
                      }} 
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = activeSection === 'rfid-users' ? '#0077d4' : '#667085';
                      }}
                    >
                      <i className="fas fa-users" style={{ fontSize: 14, minWidth: '14px', color: 'inherit' }}></i>
                      <span>RFID Third Party Users</span>
                    </button>
                    <button 
                      onClick={() => { 
                        onNavigate && onNavigate('erp-users'); 
                        setUsersDropdownOpen(false); 
                      }} 
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: activeSection === 'erp-users' ? '#0077d4' : '#667085', 
                        fontWeight: 400, 
                        fontSize: '14px', 
                        cursor: 'pointer', 
                        padding: '10px 12px', 
                        textAlign: 'left', 
                        width: '100%', 
                        borderRadius: 6, 
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        whiteSpace: 'nowrap',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                      }} 
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.color = '#101828';
                      }} 
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = activeSection === 'erp-users' ? '#0077d4' : '#667085';
                      }}
                    >
                      <i className="fas fa-building" style={{ fontSize: 14, minWidth: '14px', color: 'inherit' }}></i>
                      <span>Sparkle ERP Users</span>
                    </button>
                    <button 
                      onClick={() => { 
                        onNavigate && onNavigate('user-plans'); 
                        setUsersDropdownOpen(false); 
                      }} 
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: activeSection === 'user-plans' ? '#0077d4' : '#667085', 
                        fontWeight: 400, 
                        fontSize: '14px', 
                        cursor: 'pointer', 
                        padding: '10px 12px', 
                        textAlign: 'left', 
                        width: '100%', 
                        borderRadius: 6, 
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        whiteSpace: 'nowrap',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                      }} 
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.color = '#101828';
                      }} 
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = activeSection === 'user-plans' ? '#0077d4' : '#667085';
                      }}
                    >
                      <i className="fas fa-credit-card" style={{ fontSize: 14, minWidth: '14px', color: 'inherit' }}></i>
                      <span>User Plans</span>
                    </button>
                  </div>
                )}
              </div>
            );
          } else if (item.key === 'activities') {
            return (
              <div key={item.key} style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={() => setActivitiesDropdownOpen(true)}
                onMouseLeave={() => setActivitiesDropdownOpen(false)}
              >
                <button
                  onClick={() => setActivitiesDropdownOpen(v => !v)}
                  className="nav-button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: (activeSection === 'request-demo' || activeSection === 'user-contact-list') ? '#0077d4' : '#667085',
                    fontWeight: (activeSection === 'request-demo' || activeSection === 'user-contact-list') ? 500 : 400,
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    outline: 'none',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    whiteSpace: 'nowrap',
                    borderBottom: (activeSection === 'request-demo' || activeSection === 'user-contact-list') ? '2px solid #0077d4' : '2px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== 'request-demo' && activeSection !== 'user-contact-list') {
                      e.currentTarget.style.color = '#0077d4';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== 'request-demo' && activeSection !== 'user-contact-list') {
                      e.currentTarget.style.color = '#667085';
                    }
                  }}
                >
                  {item.icon} 
                  <span>{item.label}</span>
                  <i className="fas fa-chevron-down" style={{ fontSize: 10, marginLeft: 2 }}></i>
                </button>
                {activitiesDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 50,
                    left: 0,
                    minWidth: 240,
                    background: '#ffffff',
                    borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(16, 24, 40, 0.12), 0 2px 8px rgba(16, 24, 40, 0.08)',
                    zIndex: 9999,
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    border: '1px solid #e4e7ec',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                  }}>
                    <button 
                      onClick={() => { 
                        onNavigate && onNavigate('request-demo'); 
                        setActivitiesDropdownOpen(false); 
                      }} 
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: activeSection === 'request-demo' ? '#0077d4' : '#667085', 
                        fontWeight: 400, 
                        fontSize: '14px', 
                        cursor: 'pointer', 
                        padding: '10px 12px', 
                        textAlign: 'left', 
                        width: '100%', 
                        borderRadius: 6, 
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        whiteSpace: 'nowrap',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.color = '#101828';
                      }} 
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = activeSection === 'request-demo' ? '#0077d4' : '#667085';
                      }}
                    >
                      <i className="fas fa-desktop" style={{ fontSize: 14, minWidth: '14px', color: 'inherit' }}></i>
                      <span>Request for Demo</span>
                    </button>
                    <button 
                      onClick={() => { 
                        onNavigate && onNavigate('user-contact-list'); 
                        setActivitiesDropdownOpen(false); 
                      }} 
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: activeSection === 'user-contact-list' ? '#0077d4' : '#667085', 
                        fontWeight: 400, 
                        fontSize: '14px', 
                        cursor: 'pointer', 
                        padding: '10px 12px', 
                        textAlign: 'left', 
                        width: '100%', 
                        borderRadius: 6, 
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        whiteSpace: 'nowrap',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                      }} 
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.color = '#101828';
                      }} 
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = activeSection === 'user-contact-list' ? '#0077d4' : '#667085';
                      }}
                    >
                      <i className="fas fa-address-book" style={{ fontSize: 14, minWidth: '14px', color: 'inherit' }}></i>
                      <span>User Contact List</span>
                    </button>
                  </div>
                )}
              </div>
            );
          } else if (item.key === 'user-activity') {
            return (
              <button
                key={item.key}
                className="nav-button"
                onClick={() => onNavigate && onNavigate('user-activity')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSection === 'user-activity' ? '#0077d4' : '#667085',
                  fontWeight: activeSection === 'user-activity' ? 500 : 400,
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  outline: 'none',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  whiteSpace: 'nowrap',
                  borderBottom: activeSection === 'user-activity' ? '2px solid #0077d4' : '2px solid transparent',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  if (activeSection !== 'user-activity') {
                    e.currentTarget.style.color = '#0077d4';
                  }
                }}
                onMouseLeave={e => {
                  if (activeSection !== 'user-activity') {
                    e.currentTarget.style.color = '#667085';
                  }
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          } else if (item.key === 'settings') {
            return (
              <div key={item.key} style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={() => setSettingsDropdownOpen(true)}
                onMouseLeave={() => setSettingsDropdownOpen(false)}
              >
                <button
                  onClick={() => setSettingsDropdownOpen(v => !v)}
                  className="nav-button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: (activeSection === 'user-backup' || activeSection === 'settings') ? '#0077d4' : '#667085',
                    fontWeight: (activeSection === 'user-backup' || activeSection === 'settings') ? 500 : 400,
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    outline: 'none',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    whiteSpace: 'nowrap',
                    borderBottom: (activeSection === 'user-backup' || activeSection === 'settings') ? '2px solid #0077d4' : '2px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== 'user-backup' && activeSection !== 'settings') {
                      e.currentTarget.style.color = '#0077d4';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== 'user-backup' && activeSection !== 'settings') {
                      e.currentTarget.style.color = '#667085';
                    }
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  <i className="fas fa-chevron-down" style={{ fontSize: 10, marginLeft: 2 }}></i>
                </button>
                {settingsDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 50,
                    left: 0,
                    minWidth: 220,
                    background: '#ffffff',
                    borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(16, 24, 40, 0.15), 0 4px 16px rgba(16, 24, 40, 0.1)',
                    zIndex: 9999,
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    border: '1px solid #e4e7ec',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                  }}>
                    <div style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: '1px solid #f1f1f1',
                      marginBottom: '4px'
                    }}>
                      Administration
                    </div>
                    <button 
                      onClick={() => { 
                        onNavigate && onNavigate('user-backup'); 
                        setSettingsDropdownOpen(false); 
                      }} 
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: activeSection === 'user-backup' ? '#0077d4' : '#374151', 
                        fontWeight: 500, 
                        fontSize: '14px', 
                        cursor: 'pointer', 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        width: '100%', 
                        borderRadius: 8, 
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        whiteSpace: 'nowrap',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.color = '#0077d4';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }} 
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = activeSection === 'user-backup' ? '#0077d4' : '#374151';
                        e.currentTarget.style.transform = 'translateX(0px)';
                      }}
                    >
                      <FaUserCog style={{ fontSize: 16, minWidth: '16px', color: 'inherit' }} />
                      <span>User Backup</span>
                    </button>
                    <button 
                      onClick={() => { 
                        onNavigate && onNavigate('rfid-tags'); 
                        setSettingsDropdownOpen(false); 
                      }} 
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: activeSection === 'rfid-tags' ? '#0077d4' : '#374151', 
                        fontWeight: 500, 
                        fontSize: '14px', 
                        cursor: 'pointer', 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        width: '100%', 
                        borderRadius: 8, 
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        whiteSpace: 'nowrap',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.color = '#0077d4';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }} 
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = activeSection === 'rfid-tags' ? '#0077d4' : '#374151';
                        e.currentTarget.style.transform = 'translateX(0px)';
                      }}
                    >
                      <FaUserShield style={{ fontSize: 16, minWidth: '16px', color: 'inherit' }} />
                      <span>RFID Tags</span>
                    </button>
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <button
                key={item.key}
                onClick={() => onNavigate && onNavigate(item.key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSection === item.key ? '#0077d4' : '#667085',
                  fontWeight: activeSection === item.key ? 500 : 400,
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  outline: 'none',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  whiteSpace: 'nowrap',
                  borderBottom: activeSection === item.key ? '2px solid #0077d4' : '2px solid transparent',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== item.key) {
                    e.currentTarget.style.color = '#0077d4';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== item.key) {
                    e.currentTarget.style.color = '#667085';
                  }
                }}
              >
                {item.icon} 
                <span>{item.label}</span>
              </button>
            );
          }
        })}
      </nav>

      {/* Right Side Actions */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: isMobile ? 8 : 12,
        minWidth: isMobile ? 'auto' : '320px',
        justifyContent: 'flex-end',
        flexShrink: 0
      }}>
        {/* Search Button - Hidden on mobile */}
        {!isMobile && (
          <button
            style={{
              background: 'transparent',
              border: '1px solid #e4e7ec',
              borderRadius: 8,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#e4e7ec';
            }}
          >
            <i className="fas fa-search" style={{ fontSize: 16, color: '#667085' }}></i>
          </button>
        )}

        {/* Notification Button */}
        <div style={{ position: 'relative' }} ref={notificationRef}>
          <button
            onClick={() => setNotificationOpen(!notificationOpen)}
            style={{
              background: 'transparent',
              border: '1px solid #e4e7ec',
              borderRadius: 8,
              width: isMobile ? 36 : 40,
              height: isMobile ? 36 : 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              outline: 'none',
              position: 'relative',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#e4e7ec';
            }}
          >
            <i className="fas fa-bell" style={{ fontSize: isMobile ? 14 : 16, color: '#667085' }}></i>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: '#dc2626',
                color: '#ffffff',
                borderRadius: '50%',
                width: 18,
                height: 18,
                fontSize: '10px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                border: '2px solid #ffffff'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notificationOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: isMobile ? 42 : 48,
              width: isMobile ? Math.min(360, window.innerWidth - 32) : 360,
              maxWidth: isMobile ? 'calc(100vw - 32px)' : '360px',
              background: '#ffffff',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(16, 24, 40, 0.12), 0 2px 8px rgba(16, 24, 40, 0.08)',
              zIndex: 1001,
              border: '1px solid #e4e7ec',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              {/* Header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e4e7ec',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#101828'
                }}>
                  Notifications
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0077d4',
                      fontSize: '12px',
                      fontWeight: 400,
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markNotificationAsRead(notification.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f1f1',
                      cursor: 'pointer',
                      background: notification.read ? 'transparent' : '#f0f9ff',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10
                    }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: notification.read ? '#f1f1f1' : '#0077d4',
                        marginTop: 4,
                        flexShrink: 0
                      }}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: notification.read ? 400 : 500,
                          color: '#38414a',
                          lineHeight: 1.4,
                          marginBottom: 4
                        }}>
                          {notification.message}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          fontWeight: 400
                        }}>
                          {notification.time}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {notifications.length === 0 && (
                <div style={{
                  padding: '40px 16px',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  No notifications
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, position: 'relative' }} ref={profileRef}>
          {/* Admin Info Display - Hidden on mobile */}
          {!isMobile && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#101828',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                lineHeight: 1.2
              }}>
                {adminInfo.username}
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: 400,
                color: '#667085',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                lineHeight: 1.2,
                marginTop: 2
              }}>
                {adminInfo.role}
              </div>
            </div>
          )}

          {/* Profile Avatar */}
          <button
            onClick={() => setProfileOpen((o) => !o)}
            style={{
              background: '#0077d4',
              color: '#ffffff',
              border: '2px solid #ffffff',
              borderRadius: 8,
              width: isMobile ? 36 : 40,
              height: isMobile ? 36 : 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              flexShrink: 0,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 119, 212, 0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(16, 24, 40, 0.1)';
            }}
          >
            {getInitials(adminInfo.username)}
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: isMobile ? 42 : 50,
              minWidth: isMobile ? Math.min(260, window.innerWidth - 32) : 260,
              maxWidth: isMobile ? 'calc(100vw - 32px)' : '260px',
              background: '#ffffff',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(16, 24, 40, 0.12), 0 2px 8px rgba(16, 24, 40, 0.08)',
              zIndex: 1001,
              padding: '16px',
              border: '1px solid #e4e7ec',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
            {/* Profile Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingBottom: 12,
              borderBottom: '1px solid #e4e7ec'
            }}>
              <div style={{
                width: 40,
                height: 40,
                background: '#0077d4',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }}>
                {getInitials(adminInfo.username)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#101828',
                  lineHeight: 1.2,
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                }}>
                  {adminInfo.username}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#667085',
                  fontWeight: 400,
                  lineHeight: 1.2,
                  marginTop: 2,
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                }}>
                  {adminInfo.role}
                </div>
              </div>
            </div>

            {/* Admin Details */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0'
              }}>
                <i className="fas fa-id-badge" style={{ color: '#667085', fontSize: 14, width: 16 }}></i>
                <span style={{ fontSize: '12px', color: '#667085', fontWeight: 400, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>Employee ID:</span>
                <span style={{ fontSize: '12px', color: '#101828', fontWeight: 500, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                  {adminInfo.employeeId}
                </span>
              </div>
              
              {adminInfo.email && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 0'
                }}>
                  <i className="fas fa-envelope" style={{ color: '#667085', fontSize: 14, width: 16 }}></i>
                  <span style={{ fontSize: '12px', color: '#101828', fontWeight: 400, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                    {adminInfo.email}
                  </span>
                </div>
              )}
            </div>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                color: '#dc2626',
                border: '1px solid #e4e7ec',
                borderRadius: 6,
                padding: '10px 16px',
                fontWeight: 400,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                outline: 'none',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                marginTop: 8
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dc2626';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#dc2626';
                e.currentTarget.style.borderColor = '#e4e7ec';
              }}
            >
              <i className="fas fa-sign-out-alt" style={{ fontSize: 13 }}></i> 
              Sign Out
            </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && isMobile && (
        <React.Fragment>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
              animation: 'fadeIn 0.2s ease'
            }}
            className="mobile-menu-overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="mobile-menu"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '280px',
              maxWidth: '85vw',
              background: '#ffffff',
              boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              overflowY: 'auto',
              padding: '20px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            {/* Mobile Menu Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              paddingBottom: 16,
              borderBottom: '1px solid #e4e7ec'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#101828'
              }}>
                Menu
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 20,
                  color: '#667085',
                  cursor: 'pointer',
                  padding: 4,
                  outline: 'none'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Mobile Menu Items */}
            {menuItems.map((item) => {
              if (item.key === 'users') {
                return (
                  <div key={item.key} style={{ marginBottom: 4 }}>
                    <button
                      onClick={() => {
                        onNavigate && onNavigate('rfid-users');
                        setMobileMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        background: activeSection === 'rfid-users' ? '#f0f9ff' : 'transparent',
                        border: 'none',
                        color: activeSection === 'rfid-users' ? '#0077d4' : '#667085',
                        fontWeight: activeSection === 'rfid-users' ? 500 : 400,
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '12px 16px',
                        textAlign: 'left',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        outline: 'none',
                        marginBottom: 4
                      }}
                    >
                      <i className="fas fa-users" style={{ fontSize: 16, width: 20 }}></i>
                      <span>RFID Users</span>
                    </button>
                    <button
                      onClick={() => {
                        onNavigate && onNavigate('erp-users');
                        setMobileMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        background: activeSection === 'erp-users' ? '#f0f9ff' : 'transparent',
                        border: 'none',
                        color: activeSection === 'erp-users' ? '#0077d4' : '#667085',
                        fontWeight: activeSection === 'erp-users' ? 500 : 400,
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '12px 16px',
                        textAlign: 'left',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        outline: 'none',
                        marginBottom: 4
                      }}
                    >
                      <i className="fas fa-building" style={{ fontSize: 16, width: 20 }}></i>
                      <span>ERP Users</span>
                    </button>
                    <button
                      onClick={() => {
                        onNavigate && onNavigate('user-plans');
                        setMobileMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        background: activeSection === 'user-plans' ? '#f0f9ff' : 'transparent',
                        border: 'none',
                        color: activeSection === 'user-plans' ? '#0077d4' : '#667085',
                        fontWeight: activeSection === 'user-plans' ? 500 : 400,
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '12px 16px',
                        textAlign: 'left',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        outline: 'none'
                      }}
                    >
                      <i className="fas fa-credit-card" style={{ fontSize: 16, width: 20 }}></i>
                      <span>User Plans</span>
                    </button>
                  </div>
                );
              } else if (item.key === 'activities') {
                return (
                  <div key={item.key} style={{ marginBottom: 4 }}>
                    <button
                      onClick={() => {
                        onNavigate && onNavigate('request-demo');
                        setMobileMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        background: activeSection === 'request-demo' ? '#f0f9ff' : 'transparent',
                        border: 'none',
                        color: activeSection === 'request-demo' ? '#0077d4' : '#667085',
                        fontWeight: activeSection === 'request-demo' ? 500 : 400,
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '12px 16px',
                        textAlign: 'left',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        outline: 'none',
                        marginBottom: 4
                      }}
                    >
                      <i className="fas fa-desktop" style={{ fontSize: 16, width: 20 }}></i>
                      <span>Request Demo</span>
                    </button>
                    <button
                      onClick={() => {
                        onNavigate && onNavigate('user-contact-list');
                        setMobileMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        background: activeSection === 'user-contact-list' ? '#f0f9ff' : 'transparent',
                        border: 'none',
                        color: activeSection === 'user-contact-list' ? '#0077d4' : '#667085',
                        fontWeight: activeSection === 'user-contact-list' ? 500 : 400,
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '12px 16px',
                        textAlign: 'left',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        outline: 'none'
                      }}
                    >
                      <i className="fas fa-address-book" style={{ fontSize: 16, width: 20 }}></i>
                      <span>Contact List</span>
                    </button>
                  </div>
                );
              } else if (item.key === 'settings') {
                return (
                  <div key={item.key} style={{ marginBottom: 4 }}>
                    <button
                      onClick={() => {
                        onNavigate && onNavigate('user-backup');
                        setMobileMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        background: activeSection === 'user-backup' ? '#f0f9ff' : 'transparent',
                        border: 'none',
                        color: activeSection === 'user-backup' ? '#0077d4' : '#667085',
                        fontWeight: activeSection === 'user-backup' ? 500 : 400,
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '12px 16px',
                        textAlign: 'left',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        outline: 'none'
                      }}
                    >
                      <i className="fas fa-database" style={{ fontSize: 16, width: 20 }}></i>
                      <span>User Backup</span>
                    </button>
                  </div>
                );
              } else {
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      onNavigate && onNavigate(item.key);
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      background: activeSection === item.key ? '#f0f9ff' : 'transparent',
                      border: 'none',
                      color: activeSection === item.key ? '#0077d4' : '#667085',
                      fontWeight: activeSection === item.key ? 500 : 400,
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      outline: 'none',
                      marginBottom: 4
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              }
            })}
          </div>
        </React.Fragment>
      )}
    </React.Fragment>
  );
};

export default AdminHeader; 