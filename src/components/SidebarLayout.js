import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaHome,
  FaPlug,
  FaTags,
  FaTag,
  FaUserCircle,
  FaRegBell,
  FaDatabase,
  FaPrint,
  FaExpand,
  FaCompress,
  FaBars,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaExchangeAlt,
  FaArrowDown,
  FaArrowUp,
  FaSignOutAlt,
  FaChartLine,
  FaBoxes,
  FaListUl,
  FaPaintBrush,
  FaBarcode,
  FaFileUpload,
  FaFileInvoice,
  FaClipboardList,
  FaChartPie,
  FaThLarge,
  FaCog,
} from 'react-icons/fa';
import {
  HiDocumentText,
  HiDocument,
  HiReceiptTax,
  HiCheckCircle,
  HiTag,
} from 'react-icons/hi';
import { useNotifications } from '../context/NotificationContext';
import { useTranslation } from '../hooks/useTranslation';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout as logoutAction } from '../store/slices/authSlice';
import { clearAuthData } from '../utils/tokenUtils';
import axios from 'axios';
const SidebarLayout = ({ children }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { notifications, addNotification } = useNotifications();
  
  // Get permissions from Redux store
  const { permissions, isSuperAdmin, isSubUser } = useAppSelector((state) => state.auth);

  // State - sidebar open/closed and collapsed (icon-only) on desktop
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sidebarCollapsed') || 'false');
    } catch {
      return false;
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const notificationsRef = useRef(null);

  // Section 0: Quick Access
  const navigationProfile = [
    { path: '/profile-menu', icon: FaThLarge, label: 'All Apps & Resources', color: '#6366f1', isProfile: true },
    { path: '/settings', icon: FaCog, label: 'Settings', color: '#475569', isProfile: true },
    { path: '/profile', icon: FaUserCircle, label: 'Profile', color: '#0ea5e9', isProfile: true }
  ];

  // Helper function to check if user has permission
  const hasPermission = (requiredPermission) => {
    if (isSuperAdmin) return true;
    if (!requiredPermission) return true; // No permission required
    return permissions?.[requiredPermission] === true;
  };

  // Helper function to filter menu items based on permissions
  const filterMenuItems = (items) => {
    return items.filter(item => {
      if (!item.requiredPermission) return true; // No permission required
      return hasPermission(item.requiredPermission);
    });
  };

  // Navigation items – icons matched to menu names, distinct colors
  // Section 1: Inventory Management
  const inventorySession = [
    { path: '/analytics', icon: FaChartLine, label: 'Dashboard', color: '#0d9488', section: 'Inventory Management', requiredPermission: 'CanViewStock' },
    { path: '/stock', icon: FaBoxes, label: 'Add Inventory', color: '#d97706', section: 'Inventory Management', requiredPermission: 'CanAddStock' },
    { path: '/label-stock', icon: FaListUl, label: 'Inventory List', color: '#2563eb', section: 'Inventory Management', requiredPermission: 'CanViewStock' },
    { path: '/stock-verification', icon: HiCheckCircle, label: 'Stock Verification', color: '#059669', section: 'Inventory Management', requiredPermission: 'CanViewStock' },
    { path: '/create-label', icon: FaPaintBrush, label: 'Design Label', color: '#0891b2', section: 'Inventory Management', requiredPermission: 'CanViewStock' },
    { path: '/rfid-label', icon: FaPrint, label: 'Create PRN Label', color: '#7c3aed', section: 'Inventory Management', requiredPermission: 'CanViewStock' },
  ];

  // Section 2: Transaction
  const navigationSection2 = [
    { path: '/quotation', icon: HiDocument, label: 'Quotation', color: '#be185d', requiredPermission: 'CanViewStock' },
    { path: '/create-invoice', icon: HiReceiptTax, label: 'Invoice', color: '#15803d', requiredPermission: 'CanViewStock' },
    { path: '/sample-in', icon: FaArrowDown, label: 'Sample In', color: '#0d9488', requiredPermission: 'CanAddStock' },
    { path: '/sample-out', icon: FaArrowUp, label: 'Sample Out', color: '#b91c1c', requiredPermission: 'CanViewStock' },
    { path: '/stock-transfer', icon: FaExchangeAlt, label: 'Stock Transfer', color: '#c2410c', requiredPermission: 'CanEditStock' },
    { path: '/order-list', icon: FaClipboardList, label: 'Order List', color: '#6d28d9', requiredPermission: 'CanViewStock' },
    { path: '/reports', icon: HiDocumentText, label: 'Reports', color: '#0e7490', requiredPermission: 'CanViewReports' },
  ];

  // Section 3: RFID Tags Management
  const navigationSection3 = [
    { path: '/rfid-devices', icon: FaBarcode, label: 'Scan to Desktop', color: '#a21caf', requiredPermission: 'CanViewStock' },
    { path: '/upload-rfid', icon: FaFileUpload, label: 'RFID Tags Sheet Upload', color: '#4f46e5', requiredPermission: 'CanAddStock' },
    { path: '/rfid-tags', icon: FaTags, label: 'RFID Tag List', color: '#b91c1c', requiredPermission: 'CanViewStock' },
    { path: '/tag-usage', icon: FaChartPie, label: 'RFID Tags Usage', color: '#0e7490', requiredPermission: 'CanViewStock' },
  ];

  // Filter menu items based on permissions
  const filteredInventorySession = filterMenuItems(inventorySession);
  const filteredNavigationSection2 = filterMenuItems(navigationSection2);
  const filteredNavigationSection3 = filterMenuItems(navigationSection3);

  const clientCode = userInfo.ClientCode || userInfo.clientcode || userInfo.clientCode || 'N/A';
  const THIRD_PARTY_ALLOWED_CLIENT = 'LS000438';
  const showThirdPartyMenu = (clientCode || '').trim().toUpperCase() === THIRD_PARTY_ALLOWED_CLIENT;
  const navigationSection5 = [
    { path: '/third-party-integration', icon: FaPlug, label: 'Third Party Software Integration', color: '#0d9488' },
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
      if (mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setNotificationsOpen(false);
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  // Persist collapsed state for user preference
  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
    } catch (_) {}
  }, [sidebarCollapsed]);

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
    // Clear Redux state
    dispatch(logoutAction());
    
    // Use centralized logout utility (best practice)
    clearAuthData();
    
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
  const tcode = userInfo.TCode || userInfo.tcode || userInfo.TCODE || '';
  const avatarLetter = username ? username[0].toUpperCase() : 'U';

  const sidebarWidth = sidebarOpen
    ? (isMobile ? '260px' : (sidebarCollapsed ? '72px' : '220px'))
    : '0';
  const mainContentMargin = !isMobile && sidebarOpen
    ? (sidebarCollapsed ? '72px' : '220px')
    : '0';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-family, "Roboto", sans-serif)'
    }}>
      {/* Mobile: fixed header bar with hamburger when sidebar closed */}
      {isMobile && !sidebarOpen && (
        <header
          className="sidebar-mobile-header"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 56,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px 0 16px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="sidebar-hamburger-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              cursor: 'pointer',
              color: '#0077d4',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0';
              e.currentTarget.style.color = '#005ea8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#0077d4';
            }}
            title="Open menu"
            aria-label="Open menu"
          >
            <FaBars size={22} />
          </button>
          <span style={{ marginLeft: 12, fontSize: 18, fontWeight: 600, color: '#0f172a' }}>Menu</span>
        </header>
      )}

      {/* Desktop: floating hamburger when sidebar is closed */}
      {!isMobile && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="sidebar-hamburger-btn"
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            minWidth: 48,
            minHeight: 48,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            color: '#0077d4',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,119,212,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
          }}
          title="Open menu"
          aria-label="Open menu"
        >
          <FaBars size={22} />
        </button>
      )}

      {/* Mobile overlay when sidebar open */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998
          }}
        />
      )}

      <div style={{ display: 'flex', marginTop: 0, minHeight: '100vh' }}>
        {/* Sidebar - glassmorphism background, logo, nav, bottom controls */}
        <aside
          className="sidebar-glass"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: sidebarWidth,
            background: 'rgba(255, 255, 255, 0.72)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.5)',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            zIndex: 999,
            display: sidebarOpen ? 'flex' : 'none',
            flexDirection: 'column',
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.06), inset 1px 0 0 rgba(255,255,255,0.8)',
          }}
        >
          {/* Sidebar top: Logo + collapse/expand on desktop, close on mobile */}
          <div style={{
            flexShrink: 0,
            padding: sidebarCollapsed ? '8px 6px' : '6px 8px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: sidebarCollapsed ? 'column' : 'row',
            alignItems: 'center',
            gap: 8,
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start'
          }}>
            <Link to="/analytics" style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', flex: sidebarCollapsed ? 0 : 1, minWidth: 0, textDecoration: 'none' }} onClick={() => isMobile && setSidebarOpen(false)}>
              <img src={`${process.env.PUBLIC_URL || ''}/Logo/Sparkle%20RFID%20svg.svg`} alt="Sparkle RFID" style={{ height: sidebarCollapsed ? 24 : 28, width: 'auto', maxWidth: sidebarCollapsed ? 44 : 'none' }} onError={(e) => { e.target.onerror = null; e.target.src = `${process.env.PUBLIC_URL || ''}/Logo/LSlogo.png`; }} />
            </Link>
            {!isMobile && !sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(true)} style={{ flexShrink: 0, background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#64748b' }} title="Collapse sidebar" aria-label="Collapse sidebar"><FaChevronLeft size={14} /></button>
            )}
            {!isMobile && sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(false)} style={{ flexShrink: 0, background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#64748b' }} title="Expand sidebar" aria-label="Expand sidebar"><FaChevronRight size={12} /></button>
            )}
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)} style={{ flexShrink: 0, background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#64748b' }} title="Close menu" aria-label="Close menu"><FaTimes size={14} /></button>
            )}
          </div>

          {/* User Profile - Moved to top */}
          <div style={{
            flexShrink: 0,
            padding: sidebarCollapsed ? '8px 6px' : '6px 8px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <button onClick={() => { navigate('/profile-menu'); if (isMobile) setSidebarOpen(false); }} title={`${username} • ${clientCode}`} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? 0 : 10, justifyContent: sidebarCollapsed ? 'center' : 'flex-start', background: '#f8fafc', border: '1px solid #e2e8f0', padding: sidebarCollapsed ? '6px' : '6px 10px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s ease' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 6px rgba(2, 132, 199, 0.2)' }}>{avatarLetter}</div>
              {!sidebarCollapsed && (
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2, marginBottom: 2 }}>{username}</div>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span>
                    {clientCode}
                  </div>
                </div>
              )}
            </button>
          </div>

          {/* Sidebar nav - no scroll, all items visible in one screen */}
          <div className="sidebar-content" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '2px 0', display: 'flex', flexDirection: 'column' }}>
            {/* Nav sections - IIFE */}
            {/* Helper function to render section header */}
            {(() => {
              const renderSectionHeader = (title, gradientColors) => {
                if (sidebarCollapsed) return null;
                return (
                  <div style={{
                    padding: '1px 6px',
                    margin: '1px 6px 0px 6px',
                    background: 'transparent',
                    borderRadius: '4px',
                  }}>
                    <span style={{ fontSize: '7px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2 }}>
                      {title}
                    </span>
                  </div>
                );
              };

              const renderMenuItem = (item) => {
                const { path, icon: Icon, label, color, comingSoon, isProfile } = item;
                const isActive = location.pathname === path;

                if (comingSoon) {
                  return (
                    <div
                      key={path}
                      className="sidebar-nav-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                      gap: sidebarCollapsed ? '0' : '6px',
                      padding: sidebarCollapsed ? '4px 4px' : '1px 6px',
                      margin: sidebarCollapsed ? '1px 4px' : '0 6px',
                      borderRadius: '6px',
                        color: '#94a3b8',
                        background: 'transparent',
                        fontWeight: 500,
                        fontSize: '10px',
                        lineHeight: '1.25',
                        transition: 'all 0.2s ease',
                        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        position: 'relative',
                        border: '1px solid transparent',
                        cursor: 'not-allowed',
                        opacity: 0.6
                      }}
                      title={sidebarCollapsed ? label : 'Coming Soon'}
                    >
                      <span style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: 'rgba(148, 163, 184, 0.2)',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon style={{ fontSize: 10 }} />
                      </span>
                      {!sidebarCollapsed && (
                        <>
                          <span style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '140px',
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

                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className="sidebar-nav-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: sidebarCollapsed ? '0' : '6px',
                      padding: sidebarCollapsed ? '4px 4px' : '1px 6px',
                      margin: sidebarCollapsed ? '1px 4px' : '0 6px',
                      marginTop: isProfile ? '4px' : (sidebarCollapsed ? '1px' : '0'),
                      marginBottom: isProfile ? '4px' : '0',
                      borderRadius: isProfile ? '8px' : '6px',
                        textDecoration: 'none',
                        color: '#1e293b',
                        background: isActive
                        ? `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`
                        : (isProfile ? '#f8fafc' : 'transparent'),
                      fontWeight: isActive ? 600 : 500,
                      fontSize: isProfile ? '11px' : '10px',
                      lineHeight: '1.25',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      position: 'relative',
                      border: isActive 
                        ? `1px solid ${color}40` 
                        : (isProfile ? '1px solid #e2e8f0' : '1px solid transparent'),
                      boxShadow: isActive 
                        ? `0 1px 3px ${color}20` 
                        : (isProfile && !isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none')
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        if (isProfile) {
                          e.currentTarget.style.background = '#f1f5f9';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.06)';
                        } else {
                          e.currentTarget.style.background = `linear-gradient(135deg, ${color}12 0%, ${color}06 100%)`;
                          e.currentTarget.style.borderColor = `${color}40`;
                          e.currentTarget.style.boxShadow = `0 1px 4px ${color}15`;
                        }
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = isProfile ? '#f8fafc' : 'transparent';
                        e.currentTarget.style.borderColor = isProfile ? '#e2e8f0' : 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.boxShadow = isProfile ? '0 1px 2px rgba(0,0,0,0.05)' : 'none';
                      }
                    }}
                    title={sidebarCollapsed ? label : ''}
                  >
                    <span style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: isActive ? `${color}22` : `${color}14`,
                      color: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.25s ease',
                    }}>
                      <Icon style={{ fontSize: 10 }} />
                    </span>
                    {!sidebarCollapsed && (
                      <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '180px',
                        display: 'inline-block',
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
                        boxShadow: `0 2px 4px ${color}40`
                      }} />
                    )}
                  </Link>
                );
              };

              return (
                <>
                  {/* Section 1: Inventory Management */}
                  {filteredInventorySession.length > 0 && (
                    <>
                      {renderSectionHeader('Inventory Management', ['#10b981', '#10b981'])}
                      {filteredInventorySession.map(renderMenuItem)}
                    </>
                  )}

                  {/* Separator */}
                  {!sidebarCollapsed && (filteredInventorySession.length > 0 && (filteredNavigationSection2.length > 0 || filteredNavigationSection3.length > 0)) && (
                    <div style={{
                      height: '1px',
                      background: 'linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%)',
                      margin: '0px 8px',
                      opacity: 0.4
                    }} />
                  )}

                  {/* Section 2: Transaction */}
                  {filteredNavigationSection2.length > 0 && (
                    <>
                      {renderSectionHeader('Transaction', ['#f97316', '#f97316'])}
                      {filteredNavigationSection2.map(renderMenuItem)}
                    </>
                  )}

                  {/* Separator */}
                  {!sidebarCollapsed && (filteredNavigationSection2.length > 0 && filteredNavigationSection3.length > 0) && (
                    <div style={{
                      height: '1px',
                      background: 'linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%)',
                      margin: '0px 8px',
                      opacity: 0.4
                    }} />
                  )}

                  {/* Section 3: RFID Tags Management */}
                  {filteredNavigationSection3.length > 0 && (
                    <>
                      {renderSectionHeader('RFID Tags Management', ['#ef4444', '#ef4444'])}
                      {filteredNavigationSection3.map(renderMenuItem)}
                    </>
                  )}

                  {/* Separator */}
                  {!sidebarCollapsed && (
                    <div style={{
                      height: '1px',
                      background: 'linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%)',
                      margin: '0px 8px',
                      opacity: 0.4
                    }} />
                  )}

                  {/* Section 5: Third Party (client LS000438 only) */}
                  {showThirdPartyMenu && (
                    <>
                      {renderSectionHeader('Third Party', ['#0d9488', '#0d9488'])}
                      {navigationSection5.map(renderMenuItem)}
                      
                       {!sidebarCollapsed && (
                        <div style={{
                          height: '1px',
                          background: 'linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%)',
                          margin: '1px 8px',
                          opacity: 0.4
                        }} />
                      )}
                    </>
                  )}

                  {/* Section 0: Quick Access - Moved to Bottom - Only for Super Admin */}
                  {!isSubUser && (
                    <>
                      {renderSectionHeader('Main Menu', ['#6366f1', '#6366f1'])}
                      {navigationProfile.map(renderMenuItem)}
                    </>
                  )}

                </>
              );
            })()}
          </div>

          {/* Sidebar bottom: Fullscreen, Logout */}
          <div style={{
            flexShrink: 0,
            padding: sidebarCollapsed ? '8px 6px' : '8px 8px',
            borderTop: '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: sidebarCollapsed ? 'column' : 'row',
            alignItems: 'center',
            gap: 8,
            justifyContent: 'center'
          }}>
            <button onClick={toggleFullscreen} style={{ flexShrink: 0, background: '#f8fafc', border: '1px solid #e2e8f0', padding: 8, borderRadius: 8, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <FaCompress size={16} /> : <FaExpand size={16} />}
            </button>
            <button onClick={handleLogout} style={{ flex: 1, background: '#fee2e2', border: '1px solid #fecaca', padding: '8px', borderRadius: 8, cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: sidebarCollapsed ? 'auto' : '100%', transition: 'all 0.2s ease' }} title="Logout">
              <FaSignOutAlt size={16} />
              {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 700 }}>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
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
          paddingTop: isMobile && !sidebarOpen ? 80 : 24,
          minHeight: '100vh',
          background: '#ffffff',
          width: mainContentMargin ? `calc(100% - ${mainContentMargin})` : '100%',
          overflowX: 'hidden',
          boxSizing: 'border-box'
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

      <style>{`
        /* Sidebar glassmorphism */
        .sidebar-glass {
          -webkit-backdrop-filter: blur(14px);
          backdrop-filter: blur(14px);
        }
        .sidebar-glass .sidebar-content {
          background: transparent;
          -webkit-overflow-scrolling: touch;
        }
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
            width: 220px !important;
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
        
        .sidebar-hamburger-btn:active {
          transform: scale(0.97);
        }
        @media (max-width: 768px) {
          .sidebar-mobile-header {
            padding-left: max(16px, env(safe-area-inset-left));
          }
        }
        /* Mobile responsive sidebar */
        @media (max-width: 768px) {
          .sidebar-content {
            padding: 2px 0 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            min-height: 0 !important;
          }
          .sidebar-nav-item {
            padding: 4px 8px !important;
            margin: 0px 4px !important;
            font-size: 10px !important;
            gap: 6px !important;
            border-radius: 6px !important;
            height: 24px !important; /* Force height */
            align-items: center !important;
            display: flex !important;
          }
          .sidebar-nav-item svg {
            font-size: 12px !important;
          }
          aside {
            width: 180px !important;
            overflow: hidden !important;
          }
          main {
            padding: 12px !important;
            overflow-x: hidden !important;
          }
          /* Section headers responsive */
          .sidebar-content > div > div:first-child {
            padding: 2px 8px !important;
            margin: 4px 4px 2px 4px !important;
            font-size: 8px !important;
            line-height: 1 !important;
          }
        }
        
        @media (max-width: 480px) {
          .sidebar-content {
            padding: 2px 0 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
          .sidebar-nav-item {
            padding: 3px 6px !important;
            margin: 0px 2px !important;
            font-size: 9px !important;
            gap: 5px !important;
            height: 22px !important;
          }
          .sidebar-nav-item svg {
            font-size: 11px !important;
          }
          aside {
            width: 160px !important;
            overflow: hidden !important;
          }
          main {
            padding: 10px !important;
            overflow-x: hidden !important;
          }
          /* Section headers responsive */
          .sidebar-content > div > div:first-child {
            padding: 1px 6px !important;
            margin: 3px 2px 1px 2px !important;
            font-size: 7px !important;
          }
        }
        
        @media (max-width: 360px) {
          .sidebar-content {
            padding: 1px 0 !important;
          }
          .sidebar-nav-item {
            padding: 2px 4px !important;
            margin: 0px 2px !important;
            font-size: 8px !important;
            gap: 4px !important;
            height: 20px !important;
          }
          .sidebar-nav-item svg {
            font-size: 10px !important;
          }
          aside {
            width: 140px !important;
          }
          /* Section headers responsive */
          .sidebar-content > div > div:first-child {
            padding: 1px 4px !important;
            margin: 2px 2px 1px 2px !important;
            font-size: 6px !important;
          }
        }
        
        /* Tablet responsive */
        @media (min-width: 769px) and (max-width: 1024px) {
          .sidebar-nav-item {
            padding: 4px 8px !important;
            font-size: 10px !important;
            gap: 6px !important;
            margin: 0px 4px !important;
            height: 26px !important;
          }
          .sidebar-nav-item svg {
            font-size: 12px !important;
          }
          .sidebar-content > div > div:first-child {
            padding: 2px 8px !important;
            font-size: 8px !important;
            margin: 4px 4px 2px 4px !important;
          }
        }
        
        /* Large screens - keep compact to fit */
        @media (min-width: 1025px) {
          .sidebar-nav-item {
            padding: 2px 6px !important;
            margin: 0 4px !important;
            font-size: 10px !important;
            height: 24px !important; /* Compact desktop height */
            gap: 6px !important;
          }
           .sidebar-nav-item svg {
            font-size: 12px !important;
          }
          .sidebar-content > div > div:first-child {
             margin: 4px 4px 0px 4px !important;
             padding: 1px 4px !important;
             font-size: 8px !important;
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

