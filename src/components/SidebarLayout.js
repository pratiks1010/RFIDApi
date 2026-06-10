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
  FaExpand,
  FaCompress,
  FaBars,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaArrowDown,
  FaArrowUp,
  FaSignOutAlt,
  FaChartLine,
  FaBoxes,
  FaListUl,
  FaBarcode,
  FaFileUpload,
  FaChartPie,
  FaThLarge,
  FaTools,
  FaUsersCog,
  FaIdCard,
  FaUserPlus,
  FaClipboardList,
  FaInbox,
  FaList,
  FaAsterisk,
  FaSearch,
} from 'react-icons/fa';
import { isSuperAdmin } from '../utils/authState';
import { filterMenuItems } from '../utils/permissionAccess';
import { rfidUserUrls, authHeaders } from '../services/rfidUserManagementApi';
import {
  HiDocumentText,
  HiCheckCircle,
  HiTag,
} from 'react-icons/hi';
import { useNotifications } from '../context/NotificationContext';
import { useTranslation } from '../hooks/useTranslation';
import axios from 'axios';
const SidebarLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { notifications, addNotification } = useNotifications();

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
  const [rfidPlanInfo, setRfidPlanInfo] = useState(null);
  const showEmployeeAccessMenu = isSuperAdmin();

  const notificationsRef = useRef(null);

  const employeeAccessItems = [
    { path: '/create-masters', icon: FaDatabase, label: 'Create Masters', color: '#8b5cf6' },
    { path: '/rfid-admin/my-plan', icon: FaClipboardList, label: 'My Plan', color: '#f59e0b' },
    { path: '/rfid-admin/users', icon: FaUsersCog, label: 'User Management', color: '#38bdf8' },
    { path: '/rfid-admin/users/convert-from-employee', icon: FaIdCard, label: 'From employees', color: '#a78bfa' },
    { path: '/rfid-admin/users/create', icon: FaUserPlus, label: 'Add Employee', color: '#34d399' },
  ];

  // Section 0: Quick Access
  const navigationProfile = [
    { path: '/profile-menu', icon: FaThLarge, label: 'All Apps & Resources', color: '#6366f1' },
    { path: '/create-masters', icon: FaDatabase, label: 'Create Masters', color: '#8b5cf6' },
    { path: '/rfid-utility', icon: FaTools, label: 'RFID Utility', color: '#6d28d9' },
  ];

  // Navigation items – icons matched to menu names, distinct colors
  // Section 1: Inventory Management
  const inventorySession = [
    { path: '/analytics', icon: FaChartLine, label: 'Dashboard', color: '#0d9488', section: 'Inventory Management' },
    { path: '/label-stock', icon: FaListUl, label: 'Inventory List', color: '#2563eb', section: 'Inventory Management' },
  ];

  // Section 2: Transaction
  const navigationSection2 = [
    { path: '/my-samples', icon: FaInbox, label: 'My Samples', color: '#7c3aed', subUserOnly: true },
    { path: '/sample-out', icon: FaArrowUp, label: 'RFID Sample In/Out', color: '#b91c1c' },
    { path: '/sample-out-list', icon: FaList, label: 'Sample Out List', color: '#dc2626', permissionKey: 'CanSampleOut' },
    { path: '/find-item', icon: FaSearch, label: 'Find Item', color: '#0369a1' },
    { path: '/reports', icon: HiDocumentText, label: 'Reports', color: '#0e7490' },
  ];

  // Section 3: RFID Tags Management
  const navigationSection3 = [
    { path: '/rfid-devices', icon: FaBarcode, label: 'Scan to Desktop', color: '#a21caf' },
    { path: '/stock-tracking', icon: FaBoxes, label: 'Stock Tracking', color: '#059669' },
    { path: '/upload-rfid', icon: FaFileUpload, label: 'RFID Tags Sheet Upload', color: '#4f46e5' },
    { path: '/rfid-tags', icon: FaTags, label: 'RFID Tag List', color: '#b91c1c' },
    { path: '/tag-usage', icon: FaChartPie, label: 'RFID Tags Usage', color: '#0e7490' },
  ];

  const filteredProfile = filterMenuItems(navigationProfile);
  /** Super admin sees Create Masters under Employee & Access — hide duplicate in Main Menu. */
  const filteredProfileMainMenu = showEmployeeAccessMenu
    ? filteredProfile.filter((item) => !employeeAccessItems.some((e) => e.path === item.path))
    : filteredProfile;
  const filteredInventory = filterMenuItems(inventorySession);
  const filteredSection2 = filterMenuItems(navigationSection2);
  const filteredSection3 = filterMenuItems(navigationSection3);

  const clientCode = userInfo.ClientCode || userInfo.clientcode || userInfo.clientCode || 'N/A';
  const THIRD_PARTY_ALLOWED_CLIENT = 'LS000438';
  const FERONIA_ALLOWED_CLIENT = 'LS000512';
  const KUMAR916_ALLOWED_CLIENT = 'LS000456';
  const showThirdPartyMenu = (clientCode || '').trim().toUpperCase() === THIRD_PARTY_ALLOWED_CLIENT;
  const showFeroniaMenu = (clientCode || '').trim().toUpperCase() === FERONIA_ALLOWED_CLIENT;
  const showKumar916Menu = (clientCode || '').trim().toUpperCase() === KUMAR916_ALLOWED_CLIENT;
  const navigationSection5 = [
    { path: '/third-party-integration', icon: FaPlug, label: 'Third Party Software Integration', color: '#0d9488' },
  ];
  const navigationSectionFeronia = [
    { path: '/feronia-integration', icon: FaPlug, label: 'Feronia Integration', color: '#0f766e' },
  ];
  const navigationSectionKumar916 = [
    { path: '/kumar916-stock-master', icon: FaPlug, label: `Third Party (${KUMAR916_ALLOWED_CLIENT})`, color: '#0d9488' },
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
    const fetchMyPlan = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await axios.get(rfidUserUrls.getMyRFIDPlan(), {
          headers: authHeaders(),
        });
        setRfidPlanInfo(response?.data || null);
      } catch (_) {
        setRfidPlanInfo(null);
      }
    };
    fetchMyPlan();
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
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('lastLoginTime');
    localStorage.removeItem('showWelcomeToast');
    localStorage.removeItem('rfidAuthState');
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
  const tcode = userInfo.TCode || userInfo.tcode || userInfo.TCODE || '';
  const avatarLetter = username ? username[0].toUpperCase() : 'U';
  const planName = (rfidPlanInfo?.PlanName || '').trim();
  const planExpiryRaw = rfidPlanInfo?.PlanExpiryDate;
  const formattedPlanExpiry = (() => {
    if (!planExpiryRaw) return '';
    const parsed = new Date(planExpiryRaw);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  })();

  const sidebarWidth = sidebarOpen
    ? (isMobile ? '264px' : (sidebarCollapsed ? '64px' : '204px'))
    : '0';
  const mainContentMargin = !isMobile && sidebarOpen
    ? (sidebarCollapsed ? '64px' : '204px')
    : '0';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-family, "Roboto", sans-serif)'
    }}>
      {/* Top app bar with hamburger when sidebar is closed - anchored, no floating */}
      {!sidebarOpen && (
        <header
          className="sidebar-topbar"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10000,
            height: 56,
            minHeight: 56,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 12,
            paddingRight: 12,
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="sidebar-hamburger-btn"
            aria-label="Open menu"
            title="Open menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              padding: 0,
              background: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              cursor: 'pointer',
              color: '#2563eb',
              flexShrink: 0,
              transition: 'background 0.2s, box-shadow 0.2s',
            }}
          >
            <FaBars size={20} aria-hidden="true" />
          </button>
        </header>
      )}

      {/* Mobile overlay when sidebar open - tap to close */}
      {isMobile && sidebarOpen && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSidebarOpen(false); }}
          aria-label="Close menu"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 998,
            animation: 'sidebar-overlay-in 0.2s ease',
          }}
        />
      )}

      <div className="sidebar-layout-wrapper" style={{ display: 'flex', marginTop: 0, minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
        {/* Sidebar - glassmorphism background, logo, nav, bottom controls */}
        <aside
          className={`sidebar-glass ${isMobile ? 'sidebar-mobile' : ''} ${isMobile && sidebarOpen ? 'sidebar-mobile-open' : ''}`}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: isMobile ? 'min(82vw, 300px)' : sidebarWidth,
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            transition: isMobile ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            zIndex: 999,
            display: isMobile ? 'flex' : (sidebarOpen ? 'flex' : 'none'),
            flexDirection: 'column',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : undefined,
            visibility: isMobile && !sidebarOpen ? 'hidden' : 'visible',
          }}
        >
          {/* Sidebar top: Logo + collapse/expand on desktop, close on mobile */}
          <div style={{
            flexShrink: 0,
            padding: sidebarCollapsed ? '10px 6px' : '12px 14px',
            background: 'rgba(0, 0, 0, 0.12)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: sidebarCollapsed ? 'column' : 'row',
            alignItems: 'center',
            gap: 8,
            justifyContent: sidebarCollapsed ? 'center' : 'space-between'
          }}>
            <Link
              to="/analytics"
              title="Loyal String Dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                flex: sidebarCollapsed ? 0 : 1,
                minWidth: 0,
                textDecoration: 'none',
              }}
              onClick={() => isMobile && setSidebarOpen(false)}
            >
              <span style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(249, 115, 22, 0.2)'
              }}>
                <FaAsterisk style={{ fontSize: 9, color: '#ffffff' }} />
              </span>
              {!sidebarCollapsed && (
                <span
                  style={{
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 14,
                    letterSpacing: '-0.02em',
                    textAlign: 'left',
                    lineHeight: 1.2,
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                  }}
                >
                  Loyal String
                </span>
              )}
            </Link>
            {!isMobile && !sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                style={{
                  flexShrink: 0,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 6,
                  padding: '5px 6px',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <FaChevronLeft size={10} />
              </button>
            )}
            {!isMobile && sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                style={{
                  flexShrink: 0,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 6,
                  padding: '5px 6px',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  marginTop: 6
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <FaChevronRight size={8} />
              </button>
            )}
            {isMobile && (
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="sidebar-close-btn"
                style={{
                  flexShrink: 0,
                  minWidth: 28,
                  minHeight: 28,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 6,
                  padding: 4,
                  cursor: 'pointer',
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Close menu"
                aria-label="Close menu"
              >
                <FaTimes size={12} />
              </button>
            )}
          </div>

          {/* User Profile - Integrated at TOP only */}
          <div style={{
            flexShrink: 0,
            padding: sidebarCollapsed ? '6px 4px' : '8px 10px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(0, 0, 0, 0.06)',
            gap: 6
          }}>
            <button
              onClick={() => { navigate('/profile-menu'); if (isMobile) setSidebarOpen(false); }}
              title={`${username} • ${clientCode}`}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: sidebarCollapsed ? 0 : 8,
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                padding: sidebarCollapsed ? '4px' : '6px 8px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: 'none'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'; }}
            >
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f97316 0%, #facc15 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
              }}>
                {avatarLetter}
              </div>
              {!sidebarCollapsed && (
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                      {username}
                    </span>
                    {(planName || userInfo.IsSuperAdmin) && (
                      <span style={{
                        fontSize: '8px',
                        fontWeight: '800',
                        color: '#ffedd5',
                        background: '#ea580c',
                        padding: '0.5px 4px',
                        borderRadius: '3px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.2px',
                        lineHeight: 1
                      }}>
                        {userInfo.IsSuperAdmin ? 'Admin' : (planName || 'PRO')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }}></span>
                    {clientCode || 'LS000'}
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
              const renderSectionHeader = (title) => {
                if (sidebarCollapsed) return null;
                return (
                  <div style={{
                    padding: '6px 10px 4px',
                    margin: '6px 8px 2px',
                    fontSize: '9px',
                    fontWeight: '700',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    lineHeight: 1.2
                  }}>
                    {title}
                  </div>
                );
              };

              const renderMenuItem = (item, options = {}) => {
                const { path, icon: Icon, label, color, comingSoon } = item;
                const isActive =
                  options.isActive !== undefined ? options.isActive : location.pathname === path;

                if (comingSoon) {
                  return (
                    <div
                      key={path}
                      className="sidebar-nav-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: sidebarCollapsed ? '0' : '6px',
                        padding: sidebarCollapsed ? '3px 4px' : '4px 8px',
                        margin: sidebarCollapsed ? '1px 4px' : '1px 6px',
                        borderRadius: '6px',
                        color: '#64748b',
                        background: 'transparent',
                        fontWeight: 500,
                        fontSize: '11px',
                        lineHeight: '1.2',
                        transition: 'all 0.15s ease',
                        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        position: 'relative',
                        border: '1px solid transparent',
                        cursor: 'not-allowed',
                        opacity: 0.5
                      }}
                      title={sidebarCollapsed ? label : 'Coming Soon'}
                    >
                      <span style={{
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        background: 'rgba(255, 255, 255, 0.02)',
                        color: '#64748b',
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
                            maxWidth: '120px',
                            display: 'inline-block',
                            color: '#64748b',
                            letterSpacing: '-0.1px',
                            flex: 1
                          }}>
                            {label}
                          </span>
                          <span style={{
                            fontSize: '8px',
                            fontWeight: '700',
                            color: '#f97316',
                            background: 'rgba(249, 115, 22, 0.12)',
                            padding: '1px 4px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            whiteSpace: 'nowrap'
                          }}>
                            Soon
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
                      padding: sidebarCollapsed ? '3px 4px' : '4px 8px',
                      margin: sidebarCollapsed ? '1px 4px' : '1px 6px',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      color: isActive ? '#ffffff' : '#94a3b8',
                      background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '11px',
                      lineHeight: '1.2',
                      transition: 'all 0.15s ease',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      position: 'relative',
                      border: isActive ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid transparent',
                      boxShadow: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#94a3b8';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                    title={sidebarCollapsed ? label : ''}
                  >
                    <span style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      background: isActive
                        ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                        : `rgba(255, 255, 255, 0.03)`,
                      color: isActive ? '#ffffff' : (color || '#94a3b8'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                      border: isActive ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid rgba(255, 255, 255, 0.02)`,
                    }}>
                      <Icon style={{ fontSize: 10 }} />
                    </span>
                    {!sidebarCollapsed && (
                      <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '150px',
                        display: 'inline-block',
                        letterSpacing: '-0.1px'
                      }}>
                        {label}
                      </span>
                    )}
                    {isActive && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: '25%',
                        bottom: '25%',
                        width: '3px',
                        background: 'linear-gradient(180deg, #f97316 0%, #facc15 100%)',
                        borderRadius: '0 2px 2px 0',
                        boxShadow: 'none'
                      }} />
                    )}
                  </Link>
                );
              };

              const renderEmployeeAccessMenu = () => {
                if (!showEmployeeAccessMenu) return null;
                return (
                  <>
                    {renderSectionHeader('Employee & Access', ['#38bdf8', '#38bdf8'])}
                    {employeeAccessItems.map((item) => {
                      const isActive =
                        item.path === '/rfid-admin/users'
                          ? location.pathname.startsWith('/rfid-admin/users') &&
                            location.pathname !== '/rfid-admin/users/create' &&
                            location.pathname !== '/rfid-admin/users/convert-from-employee'
                          : location.pathname === item.path ||
                            location.pathname.startsWith(`${item.path}/`);
                      return renderMenuItem(item, { isActive });
                    })}
                    {!sidebarCollapsed && (
                      <div style={{
                        height: 1,
                        background: 'rgba(255, 255, 255, 0.05)',
                        margin: '4px 14px',
                      }} />
                    )}
                  </>
                );
              };

              return (
                <>
                  {renderEmployeeAccessMenu()}

                  {/* Section 1: Inventory Management */}
                  {renderSectionHeader('Inventory Management')}
                  {filteredInventory.map(renderMenuItem)}

                  {/* Separator */}
                  {!sidebarCollapsed && (
                    <div style={{
                      height: '1px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      margin: '4px 14px',
                    }} />
                  )}

                  {/* Section 2: Transaction */}
                  {renderSectionHeader('Transaction')}
                  {filteredSection2.map(renderMenuItem)}

                  {/* Separator */}
                  {!sidebarCollapsed && (
                    <div style={{
                      height: '1px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      margin: '4px 14px',
                    }} />
                  )}

                  {/* Section 3: RFID Tags Management */}
                  {renderSectionHeader('RFID Tags Management')}
                  {filteredSection3.map(renderMenuItem)}

                  {/* Separator */}
                  {!sidebarCollapsed && (
                    <div style={{
                      height: '1px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      margin: '4px 14px',
                    }} />
                  )}

                  {/* Section 5: Third Party (client LS000438 only) */}
                  {showThirdPartyMenu && (
                    <>
                      {renderSectionHeader('Third Party')}
                      {navigationSection5.map(renderMenuItem)}
                      
                      {!sidebarCollapsed && (
                        <div style={{
                          height: '1px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          margin: '4px 14px',
                        }} />
                      )}
                    </>
                  )}

                  {showFeroniaMenu && (
                    <>
                      {renderSectionHeader('Third Party')}
                      {navigationSectionFeronia.map(renderMenuItem)}
                      {!sidebarCollapsed && (
                        <div style={{
                          height: '1px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          margin: '4px 14px',
                        }} />
                      )}
                    </>
                  )}

                  {showKumar916Menu && (
                    <>
                      {renderSectionHeader('Third Party')}
                      {navigationSectionKumar916.map(renderMenuItem)}
                      {!sidebarCollapsed && (
                        <div style={{
                          height: '1px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          margin: '4px 14px',
                        }} />
                      )}
                    </>
                  )}

                  {/* Section 0: Quick Access - Moved to Bottom */}
                  {renderSectionHeader('Main Menu')}
                  {filteredProfileMainMenu.map(renderMenuItem)}

                </>
              );
            })()}
          </div>

          {/* Sidebar bottom: Compact Controls only */}
          <div style={{
            flexShrink: 0,
            padding: sidebarCollapsed ? '6px 4px' : '8px 10px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(0, 0, 0, 0.1)',
            gap: 8
          }}>
            {/* Compact Actions Row */}
            <div style={{
              display: 'flex',
              flexDirection: sidebarCollapsed ? 'column' : 'row',
              alignItems: 'center',
              gap: 6,
              width: '100%',
              justifyContent: 'center'
            }}>
              <button
                onClick={toggleFullscreen}
                style={{
                  flexShrink: 0,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: sidebarCollapsed ? '4px' : '5px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  flex: sidebarCollapsed ? 0 : 1,
                  fontSize: 10.5,
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  width: '100%'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; e.currentTarget.style.color = '#94a3b8'; }}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <FaCompress size={10} /> : <FaExpand size={10} />}
                {!sidebarCollapsed && <span>Screen</span>}
              </button>
              
              <button
                onClick={handleLogout}
                style={{
                  flex: sidebarCollapsed ? 0 : 1,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  padding: sidebarCollapsed ? '4px' : '5px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  fontSize: 10.5,
                  fontWeight: 700,
                  width: '100%',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.color = '#fca5a5'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#f87171'; }}
                title="Logout"
              >
                <FaSignOutAlt size={10} />
                {!sidebarCollapsed && <span>Logout</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content - full width, padding under top bar when sidebar closed */}
        <main
          className={`sidebar-main-content ${!sidebarOpen ? 'has-topbar' : ''}`}
          style={{
            flex: 1,
            minWidth: 0,
            marginLeft: mainContentMargin,
            transition: 'margin-left 0.3s ease, padding 0.2s ease',
            paddingTop: sidebarOpen ? (isMobile ? 12 : 20) : undefined,
            paddingBottom: isMobile ? 12 : 20,
            paddingLeft: isMobile ? 12 : 20,
            paddingRight: isMobile ? 12 : 20,
            minHeight: '100vh',
            background: '#ffffff',
            width: '100%',
            boxSizing: 'border-box',
            overflowX: 'auto',
          }}
        >
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
            <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowBackupModal(false)}
                disabled={backupLoading}
                className="layout-btn layout-btn-secondary"
                style={{
                  padding: '10px 20px', minHeight: 44, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
                  color: '#374151', fontWeight: 600, fontSize: 14, cursor: backupLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {t('header.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleBackup}
                disabled={backupLoading}
                className="layout-btn layout-btn-primary"
                style={{
                  padding: '10px 20px', minHeight: 44, borderRadius: 8, border: 'none', background: backupLoading ? '#94a3b8' : '#2563eb',
                  color: '#fff', fontWeight: 600, fontSize: 14, cursor: backupLoading ? 'not-allowed' : 'pointer', opacity: backupLoading ? 0.8 : 1,
                }}
              >
                {backupLoading ? (t('header.downloading') || 'Downloading...') : (t('header.downloadBackupButton') || 'Download Backup')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Top app bar - anchored, not floating; safe-area for notched devices */
        .sidebar-topbar {
          padding-left: max(12px, env(safe-area-inset-left)) !important;
          padding-top: env(safe-area-inset-top) !important;
          padding-bottom: env(safe-area-inset-bottom) !important;
          height: calc(56px + env(safe-area-inset-top)) !important;
          min-height: calc(56px + env(safe-area-inset-top)) !important;
        }
        /* Hamburger inside top bar - touch-friendly, no float */
        .sidebar-hamburger-btn {
          -webkit-tap-highlight-color: transparent;
        }
        .sidebar-hamburger-btn:hover {
          background: #eff6ff !important;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15) !important;
        }
        .sidebar-hamburger-btn:active {
          transform: scale(0.97);
        }
        @media (max-width: 768px) {
          .sidebar-hamburger-btn {
            width: 44px !important;
            height: 44px !important;
            min-width: 44px !important;
            min-height: 44px !important;
          }
          .sidebar-close-btn {
            -webkit-tap-highlight-color: transparent;
          }
        }
        /* Mobile sidebar - max width so content remains visible */
        .sidebar-glass.sidebar-mobile {
          max-width: min(82vw, 300px);
          width: min(82vw, 300px) !important;
        }
        @keyframes sidebar-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        /* Main content - full width, responsive */
        .sidebar-layout-wrapper {
          width: 100%;
          max-width: 100vw;
        }
        .sidebar-main-content {
          flex: 1 1 0%;
          min-width: 0;
        }
        .sidebar-main-content.has-topbar {
          padding-top: calc(56px + env(safe-area-inset-top) + 12px) !important;
        }
        @media (min-width: 769px) {
          .sidebar-main-content.has-topbar {
            padding-top: calc(56px + env(safe-area-inset-top) + 16px) !important;
          }
        }
        @media (max-width: 768px) {
          .sidebar-main-content {
            margin-left: 0 !important;
            width: 100% !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
            padding-bottom: 12px !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .sidebar-main-content { padding: 16px !important; }
        }
        @media (min-width: 1025px) {
          .sidebar-main-content { padding: 20px 24px !important; }
        }
        /* Layout action buttons - use in pages for Edit / Save */
        .layout-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.2s, box-shadow 0.2s;
        }
        .layout-btn-primary {
          background: #2563eb !important;
          color: #fff !important;
          border: none !important;
        }
        .layout-btn-primary:hover:not(:disabled) {
          background: #1d4ed8 !important;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
        }
        .layout-btn-secondary {
          background: #fff !important;
          color: #374151 !important;
          border: 1px solid #e5e7eb !important;
        }
        .layout-btn-secondary:hover:not(:disabled) {
          background: #f9fafb !important;
          border-color: #d1d5db !important;
        }
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
        
        /* Responsive adjustments - main content */
        @media (max-width: 768px) {
          main.sidebar-main-content {
            margin-left: 0 !important;
            width: 100% !important;
            padding: 12px !important;
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
        
        /* Mobile responsive sidebar - single consistent width, touch targets */
        @media (max-width: 768px) {
          .sidebar-glass.sidebar-mobile {
            width: min(82vw, 300px) !important;
            max-width: min(82vw, 300px) !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
          }
          .sidebar-content {
            padding: 6px 0 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            min-height: 0 !important;
            -webkit-overflow-scrolling: touch;
          }
          .sidebar-nav-item {
            padding: 12px 14px !important;
            margin: 0 8px 2px 8px !important;
            font-size: 12px !important;
            gap: 12px !important;
            border-radius: 11px !important;
            min-height: 44px !important;
            align-items: center !important;
            display: flex !important;
          }
          .sidebar-nav-item svg {
            font-size: 18px !important;
          }
          .sidebar-main-content {
            padding: 12px !important;
            overflow-x: auto !important;
          }
          .sidebar-content > div > div:first-child { margin-top: 10px !important; }
        }
        
        @media (max-width: 480px) {
          .sidebar-glass.sidebar-mobile {
            width: min(86vw, 280px) !important;
            max-width: 85vw !important;
          }
          .sidebar-nav-item {
            padding: 10px 12px !important;
            margin: 0 6px 2px 6px !important;
            font-size: 12px !important;
            min-height: 44px !important;
          }
          .sidebar-nav-item svg {
            font-size: 16px !important;
          }
          .sidebar-main-content {
            padding: 10px !important;
          }
        }
        
        @media (max-width: 360px) {
          .sidebar-glass.sidebar-mobile {
            width: min(90vw, 250px) !important;
            max-width: 90vw !important;
          }
          .sidebar-nav-item {
            padding: 10px 10px !important;
            font-size: 11px !important;
            min-height: 42px !important;
          }
        }
        
        /* Tablet responsive */
        @media (min-width: 769px) and (max-width: 1024px) {
          .sidebar-nav-item {
            padding: 4px 8px !important;
            font-size: 11px !important;
            gap: 6px !important;
            margin: 0px 4px !important;
            height: 26px !important;
          }
          .sidebar-nav-item svg {
            font-size: 13px !important;
          }
          .sidebar-content > div > div:first-child { margin-top: 8px !important; }
        }
        
        /* Large screens - keep compact to fit */
        @media (min-width: 1025px) {
          .sidebar-nav-item {
            padding: 2px 6px !important;
            margin: 0 4px !important;
            font-size: 11px !important;
            height: 28px !important;
            gap: 6px !important;
          }
           .sidebar-nav-item svg {
            font-size: 13px !important;
          }
          .sidebar-content > div > div:first-child { margin-top: 8px !important; }
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

