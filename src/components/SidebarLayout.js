import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaHome, 
  FaPlug, 
  FaList, 
  FaMicrochip, 
  FaTags, 
  FaTag, 
  FaClipboard, 
  FaUpload,
  FaUserCircle,
  FaBell,
  FaCog,
  FaSignOutAlt,
  FaTachometerAlt,
  FaRegBell,
  FaDatabase,
  FaMobileAlt,
  FaFileInvoice,
  FaChevronDown,
  FaPrint,
  FaExpand,
  FaCompress,
  FaBars,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaBook,
  FaBox,
  FaFileAlt,
  FaTag as FaCreateLabel,
  FaExchangeAlt,
  FaArrowDown,
  FaArrowUp
} from 'react-icons/fa';
import { 
  HiChartBar,
  HiHome,
  HiBookOpen,
  HiLightningBolt,
  HiClipboardList,
  HiDocumentText,
  HiPrinter,
  HiChip,
  HiTag,
  HiCheckCircle,
  HiCloudUpload,
  HiCube,
  HiDocument,
  HiPencil,
  HiReceiptTax
} from 'react-icons/hi';
import {
  MdInventory,
  MdDescription,
  MdLabel
} from 'react-icons/md';
import { useNotifications } from '../context/NotificationContext';
import { useTranslation } from '../hooks/useTranslation';
import LanguageSwitcher from './common/LanguageSwitcher';
import axios from 'axios';
import RFIDAppDownload from './RFIDAppDownload';

// Component wrapper for modal
const RFIDAppDownloadPopup = () => {
  return <RFIDAppDownload />;
};

const SidebarLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { notifications, addNotification } = useNotifications();
  
  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [showRFIDDownload, setShowRFIDDownload] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);

  // Navigation items with attractive icons - organized in sections
  const navigationSection1 = [
    { path: '/analytics', icon: HiChartBar, label: 'Smart Analytics', color: '#10b981' },
    { path: '/dashboard', icon: HiHome, label: 'RFID API Hub', color: '#3b82f6' },
    { path: '/api-documentation', icon: HiBookOpen, label: 'API Integration Guide', color: '#9333ea' },
    { path: '/rfid-integration', icon: HiLightningBolt, label: 'Quick Integration', color: '#8b5cf6' },
  ];

  const navigationSection2 = [
    { path: '/stock', icon: HiCube, label: 'Add Stocks', color: '#f59e0b' },
    { path: '/label-stock', icon: HiClipboardList, label: 'Label List', color: '#f59e0b' },
    { path: '/labeling', icon: HiPrinter, label: 'Labeling', color: '#667eea' },
    { path: '/create-invoice', icon: HiReceiptTax, label: 'Create Invoice', color: '#22c55e' },
    { path: '/quotation', icon: HiDocument, label: 'Create Quotation', color: '#ec4899' },
    { path: '/rfid-label', icon: HiPrinter, label: 'Create PRN Label', color: '#667eea' },
    { path: '/create-label', icon: HiPencil, label: 'Create Label', color: '#06b6d4' },
    { path: '/stock-transfer', icon: FaExchangeAlt, label: 'Stock Transfer', color: '#f97316', comingSoon: true },
    { path: '/sample-in', icon: FaArrowDown, label: 'Sample In', color: '#10b981', comingSoon: true },
    { path: '/sample-out', icon: FaArrowUp, label: 'Sample Out', color: '#ef4444' },
  ];

  const navigationSection3 = [
    { path: '/rfid-devices', icon: HiChip, label: 'Scan to Desktop', color: '#ec4899' },
    { path: '/rfid-tags', icon: HiTag, label: 'Tag Explorer', color: '#ef4444' },
    { path: '/tag-usage', icon: FaTag, label: 'RFID Tags Usage', color: '#06b6d4' },
    { path: '/stock-verification', icon: HiCheckCircle, label: 'RFID Stock Verification', color: '#84cc16' },
    { path: '/upload-rfid', icon: HiCloudUpload, label: 'RFID Tags Sheet Upload', color: '#6366f1' },
  ];

  // Effects
  useEffect(() => {
    try {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        setUserInfo(JSON.parse(stored));
      }
    } catch (err) {
      setUserInfo({});
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
    setNotificationsOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const checkFullscreen = () => {
      const isFull = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isFull);
    };
    const handleFullscreenChange = () => checkFullscreen();
    checkFullscreen();
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Handlers
  const toggleFullscreen = useCallback(() => {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    if (!isCurrentlyFullscreen) {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(err => console.log('Error enabling fullscreen:', err));
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }, []);

  // Keyboard shortcut for fullscreen (Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Ctrl+F or Cmd+F (Mac) - prevent default browser find behavior
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault(); // Prevent browser's find function
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleFullscreen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('lastLoginTime');
    localStorage.removeItem('showWelcomeToast');
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupError('');
    try {
      const code = clientCode || (userInfo && (userInfo.ClientCode || userInfo.clientCode || userInfo.clientcode)) || 'N/A';
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/LabelledStockTransfer/DownloadServerBackup',
        { ClientCode: code },
        { responseType: 'blob' }
      );
      let fileName = 'backup.bak';
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        fileName = disposition.split('filename=')[1].replace(/['"]/g, '').trim();
      }
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      setShowBackupModal(false);
      addNotification({
        title: 'Backup Downloaded',
        description: 'Backup file has been downloaded successfully.',
        type: 'success',
      });
    } catch (err) {
      if (err.message && err.message.includes('Network Error')) {
        setBackupError('Network error: Unable to reach the backup server.');
      } else if (err.response?.data?.error) {
        setBackupError(err.response.data.error);
      } else {
        setBackupError(err.message || 'Backup failed.');
      }
    } finally {
      setBackupLoading(false);
    }
  };

  function formatRelativeTime(date) {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) === 1 ? '' : 's'} ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) === 1 ? '' : 's'} ago`;
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) === 1 ? '' : 's'} ago`;
  }

  const username = userInfo.Username || userInfo.UserName || userInfo.name || 'User';
  const clientCode = userInfo.ClientCode || userInfo.clientcode || userInfo.clientCode || 'N/A';
  const tcode = userInfo.TCode || userInfo.tcode || userInfo.TCODE || '';
  const avatarLetter = username ? username[0].toUpperCase() : 'U';

  const sidebarWidth = sidebarCollapsed ? (isMobile ? '0' : '64px') : '260px';
  const mainContentMargin = isMobile ? '0' : sidebarWidth;

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-family, "Roboto", sans-serif)'
    }}>
      {/* Top Header Bar */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderBottom: '1px solid #e5e7eb',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: isMobile ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            padding: '8px',
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '12px',
            color: '#64748b'
          }}
        >
          {mobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
        </button>

        {/* Logo */}
        <Link 
          to="/analytics" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            flexShrink: 0, 
            marginRight: '20px',
            textDecoration: 'none',
            transition: 'transform 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <img 
            src="/Logo/Sparkle RFID svg.svg" 
            alt="Sparkle RFID" 
            style={{ height: '36px', width: 'auto' }}
          />
        </Link>

        {/* App Title */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          borderRadius: '8px',
          border: '1px solid #bfdbfe',
          padding: '8px 14px',
          fontWeight: 600,
          fontSize: '14px',
          color: '#1e40af',
          marginRight: 'auto',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(59, 130, 246, 0.1)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
          e.currentTarget.style.boxShadow = '0 2px 6px rgba(59, 130, 246, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(59, 130, 246, 0.1)';
        }}
        >
          <div style={{
            width: '14px',
            height: '14px',
            borderRadius: '3px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '1px',
              background: '#ffffff'
            }} />
          </div>
          <span style={{ whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>RFID Dashboard</span>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <LanguageSwitcher variant="header" />
          
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
            title={isFullscreen ? 'Exit Fullscreen (Ctrl+F)' : 'Enter Fullscreen (Ctrl+F)'}
          >
            {isFullscreen ? <FaCompress size={18} /> : <FaExpand size={18} />}
          </button>

          {/* Notifications */}
          <div ref={notificationsRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              style={{
                background: notificationsOpen ? '#eff6ff' : 'transparent',
                border: 'none',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                position: 'relative',
                color: notificationsOpen ? '#3b82f6' : '#64748b',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!notificationsOpen) {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.color = '#3b82f6';
                }
              }}
              onMouseLeave={(e) => {
                if (!notificationsOpen) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              <FaRegBell size={18} />
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '10px',
                  height: '10px',
                  background: '#ef4444',
                  borderRadius: '50%',
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)',
                  animation: 'pulse 2s infinite'
                }} />
              )}
            </button>
            {notificationsOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                border: '1px solid #e2e8f0',
                width: '320px',
                zIndex: 1000,
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                    {t('header.notifications') || 'Notifications'}
                  </h3>
                </div>
                <div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px', color: '#64748b', fontSize: 14, textAlign: 'center' }}>
                      {t('header.noNotifications') || 'No notifications'}
                    </div>
                  ) : notifications.slice(0, 5).map((notif, idx) => (
                    <div key={notif.id} style={{ borderBottom: idx !== notifications.length - 1 ? '1px solid #f1f5f9' : 'none', padding: '16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{notif.title}</div>
                      <div style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0 0' }}>{notif.description}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{formatRelativeTime(notif.timestamp)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                background: dropdownOpen ? '#eff6ff' : '#ffffff',
                border: dropdownOpen ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                borderRadius: '8px',
                boxShadow: dropdownOpen ? '0 2px 8px rgba(59, 130, 246, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!dropdownOpen) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (!dropdownOpen) {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                }
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                border: '2px solid rgba(255, 255, 255, 0.2)'
              }}>
                {avatarLetter}
              </div>
              {!isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#1e293b', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap', 
                    maxWidth: '120px',
                    display: 'inline-block'
                  }}>
                    {username}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {clientCode}
                  </span>
                </div>
              )}
              <FaChevronDown style={{ 
                fontSize: 11, 
                color: dropdownOpen ? '#3b82f6' : '#64748b', 
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                marginLeft: '4px'
              }} />
            </button>
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0',
                width: '300px',
                zIndex: 1000,
                padding: '8px',
                animation: 'dropdownSlideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: 1,
                transform: 'translateY(0)',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      fontWeight: 600
                    }}>
                      {avatarLetter}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: 16, color: '#1e293b', marginBottom: 2 }}>{username}</span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Client: {clientCode}</span>
                      {tcode && <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 500 }}>TCode: {tcode}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '4px 0' }}>
                  <button 
                    onClick={() => { setDropdownOpen(false); }} 
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      background: 'transparent', 
                      border: 'none', 
                      textAlign: 'left', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer', 
                      color: '#475569', 
                      fontSize: '14px', 
                      fontWeight: 500,
                      borderRadius: '8px', 
                      marginBottom: '4px',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <FaUserCircle style={{ fontSize: '16px', color: '#64748b', transition: 'color 0.2s' }} />
                    <span>{t('header.profile') || 'Profile'}</span>
                  </button>
                  <button 
                    onClick={() => { setDropdownOpen(false); }} 
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      background: 'transparent', 
                      border: 'none', 
                      textAlign: 'left', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer', 
                      color: '#475569', 
                      fontSize: '14px', 
                      fontWeight: 500,
                      borderRadius: '8px', 
                      marginBottom: '4px',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <FaCog style={{ fontSize: '16px', color: '#64748b', transition: 'color 0.2s' }} />
                    <span>{t('header.settings') || 'Settings'}</span>
                  </button>
                  <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 0' }}></div>
                  <button 
                    onClick={handleBackup} 
                    disabled={backupLoading} 
                    onMouseEnter={(e) => {
                      if (!backupLoading) {
                        e.currentTarget.style.background = '#eff6ff';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!backupLoading) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      background: 'transparent', 
                      border: 'none', 
                      textAlign: 'left', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 12, 
                      color: '#3b82f6', 
                      fontWeight: 600, 
                      fontSize: 14, 
                      cursor: backupLoading ? 'not-allowed' : 'pointer', 
                      opacity: backupLoading ? 0.6 : 1, 
                      borderRadius: '8px', 
                      marginBottom: '4px',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <FaDatabase style={{ fontSize: 18, color: '#3b82f6', transition: 'transform 0.2s' }} />
                    {backupLoading ? (t('header.backingUp') || 'Backing up...') : (t('header.backupData') || 'Backup Data')}
                  </button>
                  <button 
                    onClick={() => { setShowRFIDDownload(true); setDropdownOpen(false); }} 
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0fdf4';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      background: 'transparent', 
                      border: 'none', 
                      textAlign: 'left', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer', 
                      color: '#16a34a', 
                      fontSize: '14px', 
                      borderRadius: '8px', 
                      marginBottom: '4px', 
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <FaMobileAlt style={{ fontSize: '16px', color: '#16a34a', transition: 'transform 0.2s' }} />
                    <span>{t('header.rfidAppDownload') || 'RFID App Download'}</span>
                  </button>
                  <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 0' }}></div>
                  <button 
                    onClick={handleLogout} 
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      background: 'transparent', 
                      border: 'none', 
                      textAlign: 'left', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer', 
                      color: '#dc2626', 
                      fontSize: '14px', 
                      borderRadius: '8px', 
                      marginBottom: 0, 
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <FaSignOutAlt style={{ fontSize: '16px', color: '#dc2626', transition: 'transform 0.2s' }} />
                    <span>{t('header.logout') || 'Logout'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', marginTop: '64px', minHeight: 'calc(100vh - 64px)' }}>
        {/* Sidebar */}
        <aside style={{
          position: 'fixed',
          left: 0,
          top: '64px',
          bottom: 0,
          width: sidebarWidth,
          background: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          zIndex: 999,
          display: isMobile && !mobileMenuOpen ? 'none' : 'block',
          overflowY: isMobile ? 'visible' : 'auto'
        }}>
          {/* Collapse Toggle Button - More Attractive */}
          {!isMobile && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                position: 'absolute',
                top: '12px',
                right: sidebarCollapsed ? '8px' : '-18px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                zIndex: 10,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.5)';
                e.currentTarget.style.transform = 'scale(1.15)';
                const icon = e.currentTarget.querySelector('svg');
                if (icon) icon.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                e.currentTarget.style.transform = 'scale(1)';
                const icon = e.currentTarget.querySelector('svg');
                if (icon) icon.style.color = '#ffffff';
              }}
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? (
                <FaChevronRight size={16} color="#ffffff" style={{ transition: 'all 0.2s ease', fontWeight: 'bold' }} />
              ) : (
                <FaChevronLeft size={16} color="#ffffff" style={{ transition: 'all 0.2s ease', fontWeight: 'bold' }} />
              )}
            </button>
          )}

          {/* Sidebar Content */}
          <div className="sidebar-content" style={{ padding: '4px 0', height: '100%', overflowY: 'auto' }}>
            {/* Section 1 - First 3 items */}
            {navigationSection1.map(({ path, icon: Icon, label, color }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  className="sidebar-nav-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: sidebarCollapsed ? '0' : '10px',
                    padding: sidebarCollapsed ? '10px' : '8px 14px',
                    margin: '1px 8px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    color: isActive ? '#1e293b' : '#1e293b',
                    background: isActive ? `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)` : 'transparent',
                    fontWeight: isActive ? 700 : 600,
                    fontSize: '13px',
                    transition: 'all 0.2s ease',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    position: 'relative',
                    border: isActive ? `1px solid ${color}40` : '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = `${color}30`;
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
                  }}
                  title={sidebarCollapsed ? label : ''}
                >
                  <Icon style={{ 
                    fontSize: '18px', 
                    color: isActive ? color : color, 
                    flexShrink: 0,
                    filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' : 'none'
                  }} />
                  {!sidebarCollapsed && (
                    <span style={{ 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      maxWidth: '180px',
                      display: 'inline-block',
                      color: '#1e293b',
                      letterSpacing: '-0.2px'
                    }}>
                      {label}
                    </span>
                  )}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '3px',
                      height: '60%',
                      background: `linear-gradient(180deg, ${color} 0%, ${color}dd 100%)`,
                      borderRadius: '0 3px 3px 0',
                      boxShadow: `0 2px 6px ${color}40`
                    }} />
                  )}
                </Link>
              );
            })}

            {/* Separator Line */}
            <div style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, #e5e7eb 20%, #e5e7eb 80%, transparent 100%)',
              margin: '6px 10px',
              opacity: 0.6
            }} />

            {/* Section 2 - Next 6 items */}
            {navigationSection2.map(({ path, icon: Icon, label, color, comingSoon }) => {
              const isActive = location.pathname === path;
              
              // If coming soon, render as non-clickable div
              if (comingSoon) {
                return (
                  <div
                    key={path}
                    className="sidebar-nav-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: sidebarCollapsed ? '0' : '8px',
                      padding: sidebarCollapsed ? '8px' : '6px 12px',
                      margin: '1px 6px',
                      borderRadius: '8px',
                      color: '#94a3b8',
                      background: 'transparent',
                      fontWeight: 500,
                      fontSize: '12px',
                      transition: 'all 0.2s ease',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      position: 'relative',
                      border: '1px solid transparent',
                      cursor: 'not-allowed',
                      opacity: 0.6
                    }}
                    title={sidebarCollapsed ? label : 'Coming Soon'}
                  >
                    <Icon style={{ 
                      fontSize: '18px', 
                      color: '#cbd5e1', 
                      flexShrink: 0
                    }} />
                    {!sidebarCollapsed && (
                      <>
                        <span style={{ 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          maxWidth: '120px',
                          display: 'inline-block',
                          color: '#94a3b8',
                          letterSpacing: '-0.2px',
                          flex: 1
                        }}>
                          {label}
                        </span>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '700',
                          color: '#ffffff',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)',
                          whiteSpace: 'nowrap'
                        }}>
                          Coming Soon
                        </span>
                      </>
                    )}
                  </div>
                );
              }
              
              // Regular clickable link
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  className="sidebar-nav-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: sidebarCollapsed ? '0' : '8px',
                    padding: sidebarCollapsed ? '8px' : '6px 12px',
                    margin: '1px 6px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: isActive ? '#1e293b' : '#1e293b',
                    background: isActive ? `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)` : 'transparent',
                    fontWeight: isActive ? 700 : 600,
                    fontSize: '12px',
                    transition: 'all 0.2s ease',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    position: 'relative',
                    border: isActive ? `1px solid ${color}40` : '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = `${color}30`;
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
                  }}
                  title={sidebarCollapsed ? label : ''}
                >
                  <Icon style={{ 
                    fontSize: '18px', 
                    color: isActive ? color : color, 
                    flexShrink: 0,
                    filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' : 'none'
                  }} />
                  {!sidebarCollapsed && (
                    <span style={{ 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      maxWidth: '180px',
                      display: 'inline-block',
                      color: '#1e293b',
                      letterSpacing: '-0.2px'
                    }}>
                      {label}
                    </span>
                  )}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '3px',
                      height: '60%',
                      background: `linear-gradient(180deg, ${color} 0%, ${color}dd 100%)`,
                      borderRadius: '0 3px 3px 0',
                      boxShadow: `0 2px 6px ${color}40`
                    }} />
                  )}
                </Link>
              );
            })}

            {/* Section 3 - Remaining items */}
            {navigationSection3.map(({ path, icon: Icon, label, color }, index) => {
              const isActive = location.pathname === path;
              return (
                <React.Fragment key={path}>
                  <Link
                    to={path}
                    onClick={() => isMobile && setMobileMenuOpen(false)}
                    className="sidebar-nav-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: sidebarCollapsed ? '0' : '8px',
                      padding: sidebarCollapsed ? '8px' : '6px 12px',
                      margin: '1px 6px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: isActive ? '#1e293b' : '#1e293b',
                      background: isActive ? `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)` : 'transparent',
                      fontWeight: isActive ? 700 : 600,
                      fontSize: '12px',
                      transition: 'all 0.2s ease',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      position: 'relative',
                      border: isActive ? `1px solid ${color}40` : '1px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = `${color}30`;
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                    title={sidebarCollapsed ? label : ''}
                  >
                    <Icon style={{ 
                      fontSize: '18px', 
                      color: isActive ? color : color, 
                      flexShrink: 0,
                      filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' : 'none'
                    }} />
                    {!sidebarCollapsed && (
                      <span style={{ 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        maxWidth: '180px',
                        display: 'inline-block',
                        color: '#1e293b',
                        letterSpacing: '-0.2px'
                      }}>
                        {label}
                      </span>
                    )}
                    {isActive && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '4px',
                        height: '70%',
                        background: `linear-gradient(180deg, ${color} 0%, ${color}dd 100%)`,
                        borderRadius: '0 3px 3px 0',
                        boxShadow: `0 2px 6px ${color}40`
                      }} />
                    )}
                  </Link>
                  {/* Add separator after Print Labels (first item) */}
                  {index === 0 && (
                    <div style={{
                      height: '1px',
                      background: 'linear-gradient(90deg, transparent 0%, #e5e7eb 20%, #e5e7eb 80%, transparent 100%)',
                      margin: '6px 10px',
                      opacity: 0.6
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isMobile && mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              top: '64px',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 998
            }}
          />
        )}

        {/* Main Content */}
        <main style={{
          flex: 1,
          marginLeft: mainContentMargin,
          transition: 'margin-left 0.3s ease',
          padding: '24px',
          minHeight: 'calc(100vh - 64px)',
          background: '#f8fafc',
          width: `calc(100% - ${mainContentMargin})`
        }}>
          {children}
        </main>
      </div>

      {/* Modals */}
      {showBackupModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.5)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 25px rgba(0, 0, 0, 0.25)', width: 420, maxWidth: '98vw', padding: '32px' }}>
            <h2 style={{ fontWeight: 700, fontSize: 20, color: '#3b82f6', marginBottom: 18 }}>{t('header.downloadBackup') || 'Download Backup'}</h2>
            <div style={{ width: '100%', marginBottom: 18 }}>
              <div style={{ fontSize: 14, color: '#64748b', marginBottom: 6 }}>{t('header.backupDescription') || 'Download your data backup'}</div>
              {backupError && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 4 }}>{backupError}</div>}
            </div>
            <div style={{ display: 'flex', gap: 16, width: '100%', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowBackupModal(false)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }} disabled={backupLoading}>
                {t('header.cancel') || 'Cancel'}
              </button>
              <button onClick={handleBackup} style={{ background: backupLoading ? '#94a3b8' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 14, cursor: backupLoading ? 'not-allowed' : 'pointer', opacity: backupLoading ? 0.7 : 1 }} disabled={backupLoading}>
                {backupLoading ? (t('header.downloading') || 'Downloading...') : (t('header.downloadBackupButton') || 'Download Backup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRFIDDownload && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.5)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 25px rgba(0, 0, 0, 0.25)', width: 340, maxWidth: '98vw', padding: '28px 24px 24px 24px', position: 'relative' }}>
            <button onClick={() => setShowRFIDDownload(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 22, color: '#64748b', cursor: 'pointer', zIndex: 2 }}>&times;</button>
            <RFIDAppDownloadPopup />
          </div>
        </div>
      )}

      <style>{`
        /* Trailing ellipsis for all labels and text */
        .text-truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        /* Syncfusion grid label support */
        .e-grid .e-headertext,
        .e-grid .e-rowcell,
        .e-grid .e-columnheader {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        /* General label trailing support */
        label,
        .label,
        [class*="label"] {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        
        /* Table cell text truncation */
        td, th {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          main {
            margin-left: 0 !important;
            width: 100% !important;
            padding: 16px !important;
          }
          
          aside {
            width: 280px !important;
          }
        }
        
        @media (max-width: 480px) {
          aside {
            width: 100% !important;
            max-width: 100vw !important;
          }
        }
        
        /* Smooth transitions */
        * {
          transition: width 0.3s ease, margin-left 0.3s ease;
        }
        
        /* Pulse animation for notification badge */
        @keyframes dropdownSlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }
        
        /* Header improvements */
        header {
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        
        /* Mobile responsive sidebar */
        @media (max-width: 768px) {
          .sidebar-content {
            padding: 4px 0 !important;
            overflow-y: visible !important;
            overflow-x: hidden !important;
            height: auto !important;
            max-height: calc(100vh - 64px) !important;
          }
          .sidebar-nav-item {
            padding: 5px 10px !important;
            margin: 1px 5px !important;
            font-size: 11px !important;
            gap: 7px !important;
          }
          .sidebar-nav-item svg {
            font-size: 16px !important;
          }
          aside {
            width: 240px !important;
            overflow-y: visible !important;
            overflow-x: hidden !important;
          }
          main {
            padding: 12px !important;
            overflow-x: hidden !important;
          }
        }
        
        @media (max-width: 480px) {
          .sidebar-content {
            padding: 3px 0 !important;
            overflow-y: visible !important;
            overflow-x: hidden !important;
          }
          .sidebar-nav-item {
            padding: 4px 8px !important;
            margin: 1px 4px !important;
            font-size: 10px !important;
            gap: 6px !important;
          }
          .sidebar-nav-item svg {
            font-size: 14px !important;
          }
          aside {
            width: 220px !important;
            overflow-y: visible !important;
            overflow-x: hidden !important;
          }
          main {
            padding: 8px !important;
            overflow-x: hidden !important;
          }
        }
        
        @media (max-width: 360px) {
          .sidebar-nav-item {
            padding: 3px 6px !important;
            margin: 1px 3px !important;
            font-size: 9px !important;
            gap: 5px !important;
          }
          .sidebar-nav-item svg {
            font-size: 12px !important;
          }
          aside {
            width: 200px !important;
          }
        }
        
        /* Tablet responsive */
        @media (min-width: 769px) and (max-width: 1024px) {
          .sidebar-nav-item {
            padding: 5px 10px !important;
            font-size: 11px !important;
          }
          .sidebar-nav-item svg {
            font-size: 17px !important;
          }
        }
        
        /* Prevent all scrollbars */
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        *::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default SidebarLayout;

