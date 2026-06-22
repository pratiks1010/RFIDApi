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
  FaBox,
  FaBoxes,
  FaListUl,
  FaPaintBrush,
  FaBarcode,
  FaFileUpload,
  FaFileInvoice,
  FaClipboardList,
  FaChartPie,
  FaThLarge,
  FaLayerGroup,
  FaTools,
  FaMoon,
  FaSun,
  FaGripVertical,
  FaEye,
  FaEyeSlash,
  FaSlidersH,
  FaUndo,
  FaChevronDown,
  FaPlus,
  FaTrash,
  FaFolder,
  FaFolderOpen,
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
import axios from 'axios';
import {
  getSidebarLayout,
  saveSidebarLayout,
  resetSidebarLayout,
  normalizeSidebarLayout,
  defaultSidebarLayout,
} from '../services/sidebarLayoutService';
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
  const [sidebarTheme, setSidebarTheme] = useState(() => {
    try {
      return localStorage.getItem('sidebarTheme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const notificationsRef = useRef(null);

  // Per-path icon + accent color registry. Labels/order/visibility/section all
  // live in the dynamic layout config (src/data/sidebarLayout.json); this map
  // only supplies the things JSON can't store (React icon components + colors).
  const SIDEBAR_REGISTRY = {
    '/analytics': { icon: FaChartLine, color: '#0d9488' },
    '/create-masters': { icon: FaLayerGroup, color: '#7c3aed' },
    '/stock': { icon: FaBoxes, color: '#d97706' },
    '/label-stock': { icon: FaListUl, color: '#2563eb' },
    '/stock-verification': { icon: HiCheckCircle, color: '#059669' },
    '/create-label': { icon: FaPaintBrush, color: '#0891b2' },
    '/rfid-label': { icon: FaPrint, color: '#7c3aed' },
    '/quotation': { icon: HiDocument, color: '#be185d' },
    '/create-invoice': { icon: HiReceiptTax, color: '#15803d' },
    '/sample-in': { icon: FaArrowDown, color: '#0d9488' },
    '/sample-out': { icon: FaArrowUp, color: '#b91c1c' },
    '/rfid-sample-in-out': { icon: FaListUl, color: '#7c3aed' },
    '/stock-transfer': { icon: FaExchangeAlt, color: '#c2410c' },
    '/order-list': { icon: FaClipboardList, color: '#6d28d9' },
    '/reports': { icon: HiDocumentText, color: '#0e7490' },
    '/rfid-devices': { icon: FaBarcode, color: '#a21caf' },
    '/stock-tracking': { icon: FaBoxes, color: '#059669' },
    '/box-rfid': { icon: FaBox, color: '#0f766e' },
    '/upload-rfid': { icon: FaFileUpload, color: '#4f46e5' },
    '/rfid-tags': { icon: FaTags, color: '#b91c1c' },
    '/tag-usage': { icon: FaChartPie, color: '#0e7490' },
    '/third-party-integration': { icon: FaPlug, color: '#0d9488' },
    '/feronia-integration': { icon: FaPlug, color: '#0f766e' },
    '/kumar916-stock-master': { icon: FaPlug, color: '#0d9488' },
    '/profile-menu': { icon: FaThLarge, color: '#6366f1' },
    '/rfid-utility': { icon: FaTools, color: '#6d28d9' },
  };

  // Selectable icons for custom (master) folders.
  const FOLDER_ICONS = {
    folder: FaFolder,
    layers: FaLayerGroup,
    grid: FaThLarge,
    tags: FaTags,
    boxes: FaBoxes,
    box: FaBox,
    tools: FaTools,
    chart: FaChartPie,
    list: FaClipboardList,
    print: FaPrint,
    barcode: FaBarcode,
    upload: FaFileUpload,
  };

  const clientCode = userInfo.ClientCode || userInfo.clientcode || userInfo.clientCode || 'N/A';
  const THIRD_PARTY_ALLOWED_CLIENT = 'LS000438';
  const FERONIA_ALLOWED_CLIENT = 'LS000512';
  const KUMAR916_ALLOWED_CLIENT = 'LS000456';
  const showThirdPartyMenu = (clientCode || '').trim().toUpperCase() === THIRD_PARTY_ALLOWED_CLIENT;
  const showFeroniaMenu = (clientCode || '').trim().toUpperCase() === FERONIA_ALLOWED_CLIENT;
  const showKumar916Menu = (clientCode || '').trim().toUpperCase() === KUMAR916_ALLOWED_CLIENT;

  // A menu item only renders if its client gate (if any) passes.
  const gatePass = useCallback((gate) => {
    if (!gate) return true;
    if (gate === 'thirdParty') return showThirdPartyMenu;
    if (gate === 'feronia') return showFeroniaMenu;
    if (gate === 'kumar916') return showKumar916Menu;
    return true;
  }, [showThirdPartyMenu, showFeroniaMenu, showKumar916Menu]);

  // --- Dynamic (per-client) sidebar layout ------------------------------
  const [sidebarLayout, setSidebarLayout] = useState(() => normalizeSidebarLayout(defaultSidebarLayout));
  const [menuEditorOpen, setMenuEditorOpen] = useState(false);
  const [draftItems, setDraftItems] = useState([]);
  const [menuDragId, setMenuDragId] = useState(null);
  const [menuDragOverId, setMenuDragOverId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (id) => setExpandedGroups((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }));

  useEffect(() => {
    let mounted = true;
    getSidebarLayout()
      .then((cfg) => { if (mounted) setSidebarLayout(cfg); })
      .catch(() => { /* keep bundled default */ });
    return () => { mounted = false; };
  }, []);

  const sortByOrder = (arr) => [...arr].sort((a, b) => (a.order || 0) - (b.order || 0));

  const openMenuEditor = () => {
    const items = sortByOrder((sidebarLayout?.items || []).map((it) => ({ ...it })));
    setDraftItems(items);
    setMenuEditorOpen(true);
  };

  const closeMenuEditor = () => {
    setMenuEditorOpen(false);
    setMenuDragId(null);
    setMenuDragOverId(null);
  };

  const toggleDraftItem = (id) => {
    setDraftItems((prev) => prev.map((it) => (it.id === id ? { ...it, visible: !it.visible } : it)));
  };

  // True if candidateAncestorId is an ancestor of itemId (used to prevent cycles).
  const isDescendant = (items, itemId, candidateAncestorId) => {
    const byId = new Map(items.map((it) => [it.id, it]));
    let cur = byId.get(candidateAncestorId)?.parentId;
    const seen = new Set();
    while (cur && !seen.has(cur)) {
      if (cur === itemId) return true;
      seen.add(cur);
      cur = byId.get(cur)?.parentId;
    }
    return false;
  };

  // Move dragged item next to the drop target (inherits target's section + parent).
  const reorderDraftMenuItem = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    setDraftItems((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((i) => i.id === fromId);
      const toIdx = arr.findIndex((i) => i.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const target = arr[toIdx];
      // Don't allow dropping a group into its own descendant.
      if (target.parentId && (target.parentId === fromId || isDescendant(arr, fromId, target.parentId))) return prev;
      const moved = { ...arr[fromIdx], section: target.section, parentId: target.parentId || null };
      arr.splice(fromIdx, 1);
      const insertIdx = arr.findIndex((i) => i.id === toId);
      arr.splice(insertIdx, 0, moved);
      return arr.map((it, i) => ({ ...it, order: i + 1 }));
    });
  };

  // Drop onto a section header -> append to top level (no parent) of that section.
  const dropDraftToSection = (fromId, sectionId) => {
    if (!fromId || !sectionId) return;
    setDraftItems((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((i) => i.id === fromId);
      if (fromIdx === -1) return prev;
      const moved = { ...arr[fromIdx], section: sectionId, parentId: null };
      arr.splice(fromIdx, 1);
      let lastIdx = -1;
      arr.forEach((it, i) => { if (it.section === sectionId) lastIdx = i; });
      arr.splice(lastIdx + 1, 0, moved);
      return arr.map((it, i) => ({ ...it, order: i + 1 }));
    });
  };

  // Drop an item INTO a folder (group) -> becomes a child appended at the end.
  const dropDraftIntoGroup = (fromId, groupId) => {
    if (!fromId || !groupId || fromId === groupId) return;
    setDraftItems((prev) => {
      const arr = [...prev];
      const from = arr.find((i) => i.id === fromId);
      const group = arr.find((i) => i.id === groupId);
      if (!from || !group || group.type !== 'group') return prev;
      // Prevent moving a folder into one of its own descendants.
      if (isDescendant(arr, fromId, groupId)) return prev;
      const fromIdx = arr.findIndex((i) => i.id === fromId);
      const moved = { ...from, section: group.section, parentId: groupId };
      arr.splice(fromIdx, 1);
      let insertIdx = arr.findIndex((i) => i.id === groupId);
      arr.forEach((it, i) => { if (it.parentId === groupId) insertIdx = i; });
      arr.splice(insertIdx + 1, 0, moved);
      return arr.map((it, i) => ({ ...it, order: i + 1 }));
    });
    setExpandedGroups((prev) => ({ ...prev, [groupId]: true }));
  };

  // Nest / un-nest: set an item's parent group (or null for top level).
  const setDraftItemParent = (itemId, parentId) => {
    setDraftItems((prev) => {
      const arr = [...prev];
      const item = arr.find((i) => i.id === itemId);
      if (!item) return prev;
      let newParent = parentId || null;
      if (newParent) {
        const parent = arr.find((i) => i.id === newParent);
        if (!parent || parent.type !== 'group' || newParent === itemId || isDescendant(arr, itemId, newParent)) {
          newParent = null;
        }
      }
      const section = newParent ? (arr.find((i) => i.id === newParent)?.section || item.section) : item.section;
      return arr.map((i) => (i.id === itemId ? { ...i, parentId: newParent, section } : i));
    });
  };

  // Add a new master folder (group container) in the dedicated "Custom" zone.
  const addCustomMenu = () => {
    const id = `group-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setDraftItems((prev) => {
      const group = {
        id,
        type: 'group',
        path: '',
        label: 'Master Folder',
        iconKey: 'folder',
        section: 'custom',
        parentId: null,
        visible: true,
        order: prev.length + 1,
      };
      return [...prev, group].map((it, i) => ({ ...it, order: i + 1 }));
    });
    setExpandedGroups((prev) => ({ ...prev, [id]: true }));
  };

  const renameDraftGroup = (id, label) => {
    setDraftItems((prev) => prev.map((it) => (it.id === id ? { ...it, label } : it)));
  };

  const setDraftGroupIcon = (id, iconKey) => {
    setDraftItems((prev) => prev.map((it) => (it.id === id ? { ...it, iconKey } : it)));
  };

  const setDraftItemColor = (id, color) => {
    setDraftItems((prev) => prev.map((it) => (it.id === id ? { ...it, color } : it)));
  };

  const clearDraftItemColor = (id) => {
    setDraftItems((prev) => prev.map((it) => (it.id === id ? { ...it, color: undefined } : it)));
  };

  // Delete a custom group; its children are lifted back to top level.
  const deleteDraftGroup = (id) => {
    setDraftItems((prev) => prev
      .filter((it) => it.id !== id)
      .map((it) => (it.parentId === id ? { ...it, parentId: null } : it))
      .map((it, i) => ({ ...it, order: i + 1 })));
  };

  const saveMenuDraft = async () => {
    const toSave = { ...sidebarLayout, items: draftItems.map((it, i) => ({ ...it, order: i + 1 })) };
    try {
      const saved = await saveSidebarLayout(toSave);
      setSidebarLayout(saved);
    } catch {
      setSidebarLayout(normalizeSidebarLayout(toSave));
    }
    closeMenuEditor();
  };

  const resetMenuDraft = async () => {
    try {
      const def = await resetSidebarLayout();
      setDraftItems(sortByOrder(def.items || []));
    } catch { /* ignore */ }
  };

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
        const response = await axios.get(
          'https://soni.loyalstring.co.in/api/ProductMaster/GetMyRFIDPlan',
          { headers: { Authorization: `Bearer ${token}` } }
        );
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
    } catch (_) { }
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem('sidebarTheme', sidebarTheme);
    } catch (_) { }
  }, [sidebarTheme]);

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
    ? (isMobile ? '280px' : (sidebarCollapsed ? '72px' : '248px'))
    : '0';
  const mainContentMargin = !isMobile && sidebarOpen
    ? (sidebarCollapsed ? '72px' : '248px')
    : '0';

  // Clean, readable font stack for the sidebar
  const sidebarFont = '"Inter", "Segoe UI", system-ui, -apple-system, "Roboto", "Helvetica Neue", Arial, sans-serif';

  // Sidebar-only theme (does not affect any other component)
  const isDarkSidebar = sidebarTheme === 'dark';
  const sb = isDarkSidebar
    ? {
        bg: '#0f172a',
        border: 'rgba(148, 163, 184, 0.12)',
        divider: 'rgba(148, 163, 184, 0.1)',
        separator: 'rgba(148, 163, 184, 0.18)',
        logo: '#f8fafc',
        neutralBtnBg: 'rgba(148, 163, 184, 0.1)',
        neutralBtnBorder: 'rgba(148, 163, 184, 0.2)',
        neutralBtnColor: '#cbd5e1',
        profileBg: 'rgba(148, 163, 184, 0.06)',
        profileBorder: 'rgba(148, 163, 184, 0.14)',
        username: '#f8fafc',
        subtext: '#cbd5e1',
        plan: '#93c5fd',
        sectionHeader: '#64748b',
        itemColor: '#cbd5e1',
        itemHoverBg: 'rgba(148, 163, 184, 0.08)',
        itemHoverBorder: 'rgba(148, 163, 184, 0.16)',
        itemHoverColor: '#ffffff',
        itemActiveColor: '#ffffff',
        itemActiveBg: 'rgba(96, 165, 250, 0.12)',
        itemActiveBorder: 'rgba(96, 165, 250, 0.28)',
        iconBg: 'rgba(148, 163, 184, 0.1)',
        iconColor: '#94a3b8',
        iconBorder: 'rgba(148, 163, 184, 0.14)',
        iconActiveBg: 'rgba(96, 165, 250, 0.18)',
        iconActiveColor: '#60a5fa',
        iconActiveBorder: 'rgba(96, 165, 250, 0.35)',
        accentBar: '#60a5fa',
        avatarBg: 'rgba(96, 165, 250, 0.16)',
        avatarColor: '#60a5fa',
        avatarBorder: 'rgba(96, 165, 250, 0.3)',
        logoutBg: 'rgba(239, 68, 68, 0.12)',
        logoutBorder: 'rgba(239, 68, 68, 0.3)',
        logoutColor: '#f87171',
      }
    : {
        bg: '#ffffff',
        border: '#e5e7eb',
        divider: '#eef2f7',
        separator: 'rgba(148, 163, 184, 0.18)',
        logo: '#0f172a',
        neutralBtnBg: '#f1f5f9',
        neutralBtnBorder: '#e5e7eb',
        neutralBtnColor: '#475569',
        profileBg: '#f8fafc',
        profileBorder: '#eef2f7',
        username: '#0f172a',
        subtext: '#64748b',
        plan: '#2563eb',
        sectionHeader: '#94a3b8',
        itemColor: '#475569',
        itemHoverBg: '#f1f5f9',
        itemHoverBorder: '#e5e7eb',
        itemHoverColor: '#1e293b',
        itemActiveColor: '#1d4ed8',
        itemActiveBg: 'rgba(37, 99, 235, 0.09)',
        itemActiveBorder: 'rgba(37, 99, 235, 0.22)',
        iconBg: '#f1f5f9',
        iconColor: '#64748b',
        iconBorder: '#e5e7eb',
        iconActiveBg: 'rgba(37, 99, 235, 0.12)',
        iconActiveColor: '#2563eb',
        iconActiveBorder: 'rgba(37, 99, 235, 0.3)',
        accentBar: '#2563eb',
        avatarBg: 'rgba(37, 99, 235, 0.1)',
        avatarColor: '#2563eb',
        avatarBorder: 'rgba(37, 99, 235, 0.2)',
        logoutBg: '#fef2f2',
        logoutBorder: '#fecaca',
        logoutColor: '#dc2626',
      };

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
            background: sb.bg,
            fontFamily: sidebarFont,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRight: `1px solid ${sb.border}`,
            transition: isMobile ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            zIndex: 999,
            display: isMobile ? 'flex' : (sidebarOpen ? 'flex' : 'none'),
            flexDirection: 'column',
            boxShadow: 'none',
            transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : undefined,
            visibility: isMobile && !sidebarOpen ? 'hidden' : 'visible',
          }}
        >
          {/* Sidebar top: Logo + collapse/expand on desktop, close on mobile */}
          <div style={{
            flexShrink: 0,
            padding: sidebarCollapsed ? '12px 8px' : '14px 14px',
            background: 'transparent',
            borderBottom: `1px solid ${sb.divider}`,
            display: 'flex',
            flexDirection: sidebarCollapsed ? 'column' : 'row',
            alignItems: 'center',
            gap: 10,
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start'
          }}>
            <Link
              to="/analytics"
              title="Loyal String Dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                flex: sidebarCollapsed ? 0 : 1,
                minWidth: 0,
                textDecoration: 'none',
              }}
              onClick={() => isMobile && setSidebarOpen(false)}
            >
              <span
                style={{
                  color: sb.logo,
                  fontWeight: 700,
                  fontSize: sidebarCollapsed ? 9 : 19,
                  letterSpacing: sidebarCollapsed ? 0 : '0.01em',
                  textAlign: sidebarCollapsed ? 'center' : 'left',
                  lineHeight: sidebarCollapsed ? 1.15 : 1.25,
                  overflow: 'hidden',
                  maxWidth: sidebarCollapsed ? 54 : '100%',
                }}
              >
                {sidebarCollapsed ? (
                  <>
                    Loyal
                    <br />
                    String
                  </>
                ) : (
                  'Loyal String'
                )}
              </span>
            </Link>
            {!isMobile && !sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(true)} style={{ flexShrink: 0, background: sb.neutralBtnBg, border: `1px solid ${sb.neutralBtnBorder}`, borderRadius: 10, padding: 9, cursor: 'pointer', color: sb.neutralBtnColor }} title="Collapse sidebar" aria-label="Collapse sidebar"><FaChevronLeft size={15} /></button>
            )}
            {!isMobile && sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(false)} style={{ flexShrink: 0, background: sb.neutralBtnBg, border: `1px solid ${sb.neutralBtnBorder}`, borderRadius: 10, padding: 7, cursor: 'pointer', color: sb.neutralBtnColor }} title="Expand sidebar" aria-label="Expand sidebar"><FaChevronRight size={13} /></button>
            )}
            {isMobile && (
              <button type="button" onClick={() => setSidebarOpen(false)} className="sidebar-close-btn" style={{ flexShrink: 0, minWidth: 44, minHeight: 44, background: sb.neutralBtnBg, border: `1px solid ${sb.neutralBtnBorder}`, borderRadius: 10, padding: 10, cursor: 'pointer', color: sb.neutralBtnColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Close menu" aria-label="Close menu"><FaTimes size={18} /></button>
            )}
          </div>

          {/* User Profile - Moved to top */}
          <div style={{
            flexShrink: 0,
            padding: sidebarCollapsed ? '10px 8px' : '12px 14px',
            borderBottom: `1px solid ${sb.divider}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <button onClick={() => { navigate('/profile-menu'); if (isMobile) setSidebarOpen(false); }} title={`${username} • ${clientCode}`} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? 0 : 12, justifyContent: sidebarCollapsed ? 'center' : 'flex-start', background: sb.profileBg, border: `1px solid ${sb.profileBorder}`, padding: sidebarCollapsed ? '9px' : '10px 12px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: sb.avatarBg, color: sb.avatarColor, border: `1px solid ${sb.avatarBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, flexShrink: 0, boxShadow: 'none' }}>{avatarLetter}</div>
              {!sidebarCollapsed && (
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: sb.username, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.25, marginBottom: 3 }}>{username}</div>
                  <div style={{ fontSize: 12, color: sb.subtext, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }}></span>
                    {clientCode}
                  </div>
                  {(planName || formattedPlanExpiry) && (
                    <div style={{ fontSize: 11, color: sb.plan, fontWeight: 700, marginTop: 3, lineHeight: 1.3 }}>
                      {planName ? `Plan: ${planName}` : ''}
                      {formattedPlanExpiry ? `${planName ? ' • ' : ''}Exp: ${formattedPlanExpiry}` : ''}
                    </div>
                  )}
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
                    padding: '4px 12px 2px',
                    margin: '10px 10px 2px',
                    position: 'relative',
                  }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: sb.sectionHeader, textTransform: 'uppercase', letterSpacing: '0.6px', lineHeight: 1.2 }}>
                      {title}
                    </span>
                  </div>
                );
              };

              const renderMenuItem = (item, depth = 0) => {
                const { path, label, comingSoon } = item;
                const reg = SIDEBAR_REGISTRY[path] || {};
                const Icon = item.icon || reg.icon || FaThLarge;
                const accent = item.color || reg.color || sb.iconColor;
                const isActive = location.pathname === path;

                if (comingSoon) {
                  return (
                    <div
                      key={path}
                      className="sidebar-nav-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: sidebarCollapsed ? '0' : '8px',
                        padding: sidebarCollapsed ? '5px 4px' : '4px 8px',
                        margin: sidebarCollapsed ? '2px 5px' : '2px 8px',
                        borderRadius: '9px',
                        color: '#64748b',
                        background: 'transparent',
                        fontWeight: 500,
                        fontSize: '12px',
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
                        width: 24,
                        height: 24,
                        borderRadius: 8,
                        background: 'rgba(148, 163, 184, 0.16)',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon style={{ fontSize: 12 }} />
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
                    gap: sidebarCollapsed ? '0' : '10px',
                    padding: sidebarCollapsed ? '7px 6px' : '6px 10px',
                    margin: sidebarCollapsed ? '2px 8px' : '2px 10px',
                    borderRadius: '11px',
                    textDecoration: 'none',
                    color: isActive ? sb.itemActiveColor : sb.itemColor,
                    background: isActive
                      ? sb.itemActiveBg
                      : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '12px',
                    lineHeight: '1.3',
                    transition: 'all 0.2s ease',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    position: 'relative',
                    border: isActive ? `1px solid ${sb.itemActiveBorder}` : '1px solid transparent',
                    boxShadow: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = sb.itemHoverBg;
                      e.currentTarget.style.borderColor = sb.itemHoverBorder;
                      e.currentTarget.style.color = sb.itemHoverColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.color = sb.itemColor;
                    }
                  }}
                  title={sidebarCollapsed ? label : ''}
                >
                  <span style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: isActive ? `${accent}29` : `${accent}1a`,
                    color: accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                    border: `1px solid ${accent}40`,
                  }}>
                    <Icon style={{ fontSize: 15 }} />
                  </span>
                    {!sidebarCollapsed && (
                      <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '170px',
                        display: 'inline-block',
                        letterSpacing: '0'
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
                      background: accent,
                      borderRadius: '0 3px 3px 0',
                      boxShadow: 'none'
                    }} />
                    )}
                  </Link>
                );
              };

              const allItems = (sidebarLayout?.items || []).filter(
                (it) => it.visible !== false
                  && gatePass(it.gate)
                  && (it.type === 'group' || SIDEBAR_REGISTRY[it.path])
              );
              const childrenOf = (parentId) => sortByOrder(allItems.filter((it) => (it.parentId || null) === parentId));
              const topLevelFor = (sectionId) => sortByOrder(allItems.filter((it) => it.section === sectionId && !it.parentId));

              // Does a group contain the active route anywhere in its subtree?
              const groupHasActive = (groupId) => {
                const stack = childrenOf(groupId);
                while (stack.length) {
                  const node = stack.pop();
                  if (node.type !== 'group' && node.path === location.pathname) return true;
                  childrenOf(node.id).forEach((c) => stack.push(c));
                }
                return false;
              };

              const renderGroupHeader = (item, depth, expanded) => {
                const GroupIcon = (item.iconKey && FOLDER_ICONS[item.iconKey])
                  ? FOLDER_ICONS[item.iconKey]
                  : (expanded ? FaFolderOpen : FaFolder);
                const folderColor = item.color || '#2563eb';
                return (
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.id)}
                    className="sidebar-nav-item"
                    title={sidebarCollapsed ? item.label : ''}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: sidebarCollapsed ? '0' : '10px',
                      padding: sidebarCollapsed ? '7px 6px' : '6px 10px',
                      margin: sidebarCollapsed ? '2px 8px' : '2px 10px',
                      borderRadius: '11px',
                      color: sb.itemColor,
                      background: 'transparent',
                      border: '1px solid transparent',
                      fontWeight: 600,
                      fontSize: '12px',
                      lineHeight: '1.3',
                      cursor: 'pointer',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      width: sidebarCollapsed ? 'auto' : 'calc(100% - 20px)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = sb.itemHoverBg; e.currentTarget.style.color = sb.itemHoverColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = sb.itemColor; }}
                  >
                    <span style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: `${folderColor}1a`,
                      color: folderColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: `1px solid ${folderColor}40`,
                    }}>
                      <GroupIcon style={{ fontSize: 14 }} />
                    </span>
                    {!sidebarCollapsed && (
                      <>
                        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>
                          {item.label}
                        </span>
                        <FaChevronDown
                          size={11}
                          style={{ flexShrink: 0, transition: 'transform 0.2s ease', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', opacity: 0.7 }}
                        />
                      </>
                    )}
                  </button>
                );
              };

              const renderNode = (item, depth = 0) => {
                if (item.type === 'group') {
                  const kids = childrenOf(item.id);
                  if (!kids.length) return null; // hide empty custom menus
                  // In collapsed (icon-only) mode there's no room for a tree:
                  // surface the group's link children directly as icons.
                  if (sidebarCollapsed) {
                    return kids.map((c) => renderNode(c, depth));
                  }
                  const expanded = expandedGroups[item.id] ?? groupHasActive(item.id);
                  return (
                    <React.Fragment key={item.id}>
                      {renderGroupHeader(item, depth, expanded)}
                      {expanded && (
                        <div style={{
                          marginLeft: 26,
                          paddingLeft: 8,
                          borderLeft: `1.5px solid ${sb.iconBorder}`,
                        }}>
                          {kids.map((c) => renderNode(c, depth + 1))}
                        </div>
                      )}
                    </React.Fragment>
                  );
                }
                return renderMenuItem(item, depth);
              };

              const sections = sortByOrder(sidebarLayout?.sections || []);
              const separator = (
                <div style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(148, 163, 184, 0.18) 50%, transparent 100%)',
                  margin: '2px 10px',
                  opacity: 1
                }} />
              );

              return (
                <>
                  {sections.map((section) => {
                    const tops = topLevelFor(section.id);
                    const nodes = tops.map((it) => renderNode(it, 0)).filter((n) => n != null);
                    if (!nodes.length) return null;
                    return (
                      <React.Fragment key={section.id}>
                        {renderSectionHeader(section.title)}
                        {nodes}
                        {!sidebarCollapsed && separator}
                      </React.Fragment>
                    );
                  })}

                  {/* Customize / arrange menu */}
                  <button
                    type="button"
                    onClick={openMenuEditor}
                    className="sidebar-nav-item"
                    title="Customize Menu"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: sidebarCollapsed ? '0' : '10px',
                      padding: sidebarCollapsed ? '7px 6px' : '6px 10px',
                      margin: sidebarCollapsed ? '5px 8px 4px' : '5px 10px 4px',
                      borderRadius: '11px',
                      color: sb.itemColor,
                      background: 'transparent',
                      border: `1px dashed ${sb.iconBorder}`,
                      fontWeight: 600,
                      fontSize: '12px',
                      lineHeight: '1.3',
                      cursor: 'pointer',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      width: sidebarCollapsed ? 'auto' : 'calc(100% - 20px)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = sb.itemHoverBg; e.currentTarget.style.color = sb.itemHoverColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = sb.itemColor; }}
                  >
                    <span style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: sb.iconBg,
                      color: sb.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: `1px solid ${sb.iconBorder}`,
                    }}>
                      <FaSlidersH style={{ fontSize: 15 }} />
                    </span>
                    {!sidebarCollapsed && <span>Customize Menu</span>}
                  </button>
                </>
              );
            })()}
          </div>

          {/* Sidebar bottom: Fullscreen, Logout */}
          <div style={{
            flexShrink: 0,
            padding: sidebarCollapsed ? '8px 6px' : '8px 10px',
            borderTop: `1px solid ${sb.divider}`,
            display: 'flex',
            flexDirection: sidebarCollapsed ? 'column' : 'row',
            alignItems: 'center',
            gap: 10,
            justifyContent: 'center'
          }}>
            <button onClick={toggleFullscreen} style={{ flexShrink: 0, background: sb.neutralBtnBg, border: `1px solid ${sb.neutralBtnBorder}`, padding: 11, borderRadius: 12, cursor: 'pointer', color: sb.neutralBtnColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <FaCompress size={17} /> : <FaExpand size={17} />}
            </button>
            <button
              onClick={() => setSidebarTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              style={{ flexShrink: 0, background: sb.neutralBtnBg, border: `1px solid ${sb.neutralBtnBorder}`, padding: 11, borderRadius: 12, cursor: 'pointer', color: isDarkSidebar ? '#facc15' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
              title={isDarkSidebar ? 'Switch to light sidebar' : 'Switch to dark sidebar'}
              aria-label="Toggle sidebar theme"
            >
              {isDarkSidebar ? <FaSun size={17} /> : <FaMoon size={17} />}
            </button>
            <button onClick={handleLogout} style={{ flex: 1, background: sb.logoutBg, border: `1px solid ${sb.logoutBorder}`, padding: '11px', borderRadius: 12, cursor: 'pointer', color: sb.logoutColor, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: sidebarCollapsed ? 'auto' : '100%', transition: 'all 0.2s ease', boxShadow: 'none' }} title="Logout">
              <FaSignOutAlt size={17} />
              {!sidebarCollapsed && <span style={{ fontSize: 14, fontWeight: 700 }}>Logout</span>}
            </button>
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

      {/* Customize Menu (arrange sidebar) modal */}
      {menuEditorOpen && (
        <div
          role="button"
          tabIndex={0}
          onClick={closeMenuEditor}
          onKeyDown={(e) => { if (e.key === 'Escape') closeMenuEditor(); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, boxShadow: '0 24px 50px rgba(0,0,0,0.3)', width: 460, maxWidth: '96vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', fontFamily: sidebarFont }}
          >
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Customize Menu</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>Add a Master Folder (lives in the “Custom” zone), then drag or use the dropdown to move options into it from any section. Your original sections stay intact.</p>
              </div>
              <button type="button" onClick={closeMenuEditor} aria-label="Close" style={{ background: '#f1f5f9', border: '1px solid #e5e7eb', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FaTimes size={15} />
              </button>
            </div>

            <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
              <button
                type="button"
                onClick={() => addCustomMenu()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: 9, padding: '8px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}
              >
                <FaPlus size={11} /> Add Master Folder
              </button>
              {(() => {
                const editorSections = sortByOrder(sidebarLayout?.sections || []);
                const usable = (it) => gatePass(it.gate) && (it.type === 'group' || SIDEBAR_REGISTRY[it.path]);
                const childrenOf = (sectionId, parentId) => sortByOrder(
                  draftItems.filter((it) => it.section === sectionId && (it.parentId || null) === parentId && usable(it))
                );
                const sectionTitleById = Object.fromEntries(editorSections.map((s) => [s.id, s.title]));
                // A folder can collect items from ANY section, so list every folder
                // (except the item itself and its own descendants, to avoid cycles).
                const groupOptions = (selfId) => draftItems.filter(
                  (it) => it.type === 'group' && it.id !== selfId && !isDescendant(draftItems, selfId, it.id)
                );

                const renderRow = (it, sectionId, depth) => {
                  const isGroup = it.type === 'group';
                  const reg = SIDEBAR_REGISTRY[it.path] || {};
                  const Icon = isGroup
                    ? (FOLDER_ICONS[it.iconKey] || FaFolder)
                    : (reg.icon || FaThLarge);
                  const isHidden = it.visible === false;
                  const isDragging = menuDragId === it.id;
                  const isDragOver = menuDragOverId === it.id && menuDragId && menuDragId !== it.id;
                  const kids = isGroup ? childrenOf(sectionId, it.id) : [];
                  const parents = groupOptions(it.id);
                  const defaultColor = isGroup ? '#2563eb' : (reg.color || '#64748b');
                  const rowColor = it.color || defaultColor;
                  return (
                    <React.Fragment key={it.id}>
                      <div
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (menuDragOverId !== it.id) setMenuDragOverId(it.id); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isGroup) { dropDraftIntoGroup(menuDragId, it.id); }
                          else { reorderDraftMenuItem(menuDragId, it.id); }
                          setMenuDragId(null);
                          setMenuDragOverId(null);
                        }}
                        onDragEnd={() => { setMenuDragId(null); setMenuDragOverId(null); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '7px 9px',
                          marginLeft: depth * 18,
                          border: isDragOver
                            ? (isGroup ? '1.5px dashed #2563eb' : '1px solid #2563eb')
                            : `1px solid ${isGroup ? '#dbeafe' : '#eef2f7'}`,
                          borderRadius: 10,
                          marginBottom: 6,
                          background: isDragOver && isGroup ? '#eff6ff' : (isHidden ? '#f8fafc' : (isGroup ? '#f8faff' : '#fff')),
                          opacity: isDragging ? 0.45 : 1,
                          boxShadow: isDragOver ? '0 0 0 2px rgba(37,99,235,0.15)' : 'none',
                          transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
                        }}
                      >
                        <span
                          draggable
                          onDragStart={(e) => { setMenuDragId(it.id); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', it.id); } catch { /* noop */ } }}
                          title="Drag to reorder"
                          aria-label="Drag to reorder"
                          style={{ cursor: 'grab', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '2px 1px', flexShrink: 0 }}
                        >
                          <FaGripVertical size={13} />
                        </span>
                        <span style={{ width: 26, height: 26, borderRadius: 8, background: `${rowColor}1a`, color: rowColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${rowColor}40` }}>
                          <Icon style={{ fontSize: 12 }} />
                        </span>
                        {isGroup ? (
                          <input
                            value={it.label}
                            onChange={(e) => renameDraftGroup(it.id, e.target.value)}
                            placeholder="Menu name"
                            style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#1e293b', border: '1px solid #e5e7eb', borderRadius: 7, padding: '5px 8px', outline: 'none', background: '#fff' }}
                          />
                        ) : (
                          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: isHidden ? '#94a3b8' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {it.label}
                          </span>
                        )}
                        <select
                          value={it.parentId || ''}
                          onChange={(e) => setDraftItemParent(it.id, e.target.value || null)}
                          title="Move inside a folder (any section)"
                          style={{ flexShrink: 0, maxWidth: 132, fontSize: 11.5, color: '#475569', border: '1px solid #e5e7eb', borderRadius: 7, padding: '5px 6px', background: '#fff', cursor: 'pointer' }}
                        >
                          <option value="">Top level</option>
                          {parents.map((g) => (
                            <option key={g.id} value={g.id}>
                              {`${g.label || 'Folder'} (${sectionTitleById[g.section] || ''})`}
                            </option>
                          ))}
                        </select>
                        <span style={{ position: 'relative', flexShrink: 0, width: 26, height: 26 }} title="Icon color">
                          <input
                            type="color"
                            value={rowColor}
                            onChange={(e) => setDraftItemColor(it.id, e.target.value)}
                            aria-label="Pick icon color"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0 }}
                          />
                          <span style={{ display: 'block', width: 26, height: 26, borderRadius: 8, background: rowColor, border: '1px solid #e5e7eb', boxShadow: 'inset 0 0 0 2px #fff' }} />
                          {it.color && (
                            <button
                              type="button"
                              onClick={() => clearDraftItemColor(it.id)}
                              title="Reset to default color"
                              aria-label="Reset color"
                              style={{ position: 'absolute', top: -6, right: -6, width: 14, height: 14, borderRadius: '50%', background: '#fff', border: '1px solid #e5e7eb', color: '#94a3b8', fontSize: 9, lineHeight: '12px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <FaTimes size={7} />
                            </button>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleDraftItem(it.id)}
                          title={isHidden ? 'Show' : 'Hide'}
                          aria-label={isHidden ? 'Show' : 'Hide'}
                          style={{ background: isHidden ? '#f1f5f9' : 'rgba(37,99,235,0.1)', border: `1px solid ${isHidden ? '#e5e7eb' : 'rgba(37,99,235,0.25)'}`, borderRadius: 8, width: 28, height: 26, cursor: 'pointer', color: isHidden ? '#94a3b8' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          {isHidden ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                        </button>
                        {isGroup && (
                          <button
                            type="button"
                            onClick={() => deleteDraftGroup(it.id)}
                            title="Delete custom menu"
                            aria-label="Delete custom menu"
                            style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, width: 28, height: 26, cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          >
                            <FaTrash size={11} />
                          </button>
                        )}
                      </div>
                      {isGroup && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '0 0 8px', marginLeft: depth * 18 + 34 }}>
                          {Object.entries(FOLDER_ICONS).map(([key, Ico]) => {
                            const selected = (it.iconKey || 'folder') === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setDraftGroupIcon(it.id, key)}
                                title={`Use ${key} icon`}
                                aria-label={`Use ${key} icon`}
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 7,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: selected ? 'rgba(37,99,235,0.12)' : '#fff',
                                  color: selected ? '#2563eb' : '#64748b',
                                  border: `1px solid ${selected ? 'rgba(37,99,235,0.45)' : '#e5e7eb'}`,
                                }}
                              >
                                <Ico size={12} />
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {kids.map((c) => renderRow(c, sectionId, depth + 1))}
                    </React.Fragment>
                  );
                };

                return editorSections.map((section) => {
                  const tops = childrenOf(section.id, null);
                  if (!tops.length) return null;
                  return (
                    <div
                      key={section.id}
                      onDragOver={(e) => { if (menuDragId) { e.preventDefault(); } }}
                      onDrop={(e) => { if (menuDragId) { e.preventDefault(); dropDraftToSection(menuDragId, section.id); setMenuDragId(null); setMenuDragOverId(null); } }}
                      style={{ marginBottom: 14 }}
                    >
                      <div style={{ padding: '4px 4px 8px' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{section.title}</span>
                      </div>
                      {tops.map((it) => renderRow(it, section.id, 0))}
                    </div>
                  );
                });
              })()}
            </div>

            <div style={{ padding: '14px 16px', borderTop: '1px solid #eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <button type="button" onClick={resetMenuDraft} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                <FaUndo size={12} /> Reset
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={closeMenuEditor} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Cancel</button>
                <button type="button" onClick={saveMenuDraft} style={{ background: '#2563eb', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Save</button>
              </div>
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
            padding: 9px 12px !important;
            margin: 2px 10px !important;
            font-size: 13px !important;
            gap: 12px !important;
            border-radius: 12px !important;
            min-height: 44px !important;
            align-items: center !important;
            display: flex !important;
          }
          .sidebar-nav-item svg {
            font-size: 17px !important;
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
            padding: 9px 11px !important;
            margin: 2px 8px !important;
            font-size: 12px !important;
            min-height: 42px !important;
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
            padding: 9px 10px !important;
            font-size: 11px !important;
            min-height: 42px !important;
          }
        }
        
        /* Tablet responsive */
        @media (min-width: 769px) and (max-width: 1024px) {
          .sidebar-nav-item {
            padding: 6px 9px !important;
            font-size: 11px !important;
            gap: 8px !important;
            margin: 2px 8px !important;
            min-height: 32px !important;
          }
          .sidebar-nav-item svg {
            font-size: 13px !important;
          }
          .sidebar-content > div > div:first-child { margin-top: 6px !important; }
        }
        
        /* Large screens - compact, easy to read */
        @media (min-width: 1025px) {
          .sidebar-nav-item {
            padding: 6px 10px !important;
            margin: 2px 10px !important;
            font-size: 12px !important;
            min-height: 34px !important;
            gap: 10px !important;
          }
           .sidebar-nav-item svg {
            font-size: 14px !important;
          }
          .sidebar-content > div > div:first-child { margin-top: 6px !important; }
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

