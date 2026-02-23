import React, { useState, useEffect } from 'react';
import { 
  FaUserPlus, 
  FaUserShield, 
  FaUsers,
  FaSearch,
  FaUserSlash,
  FaUserCheck,
  FaSpinner,
  FaEnvelope,
  FaUser,
  FaCrown,
  FaBuilding,
  FaEdit,
  FaSave,
  FaTrash,
  FaMapMarkerAlt,
  FaChevronDown,
  FaChevronUp,
  FaIdCard,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaLock,
  FaKey,
  FaShieldAlt,
  FaChartLine,
  FaSignal,
  FaSignOutAlt,
  FaPowerOff
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { userManagementService } from '../services/userManagementService';
import Loader from './common/Loader';
import axios from 'axios';

// --- Custom Components ---

// 1. Custom Confirmation Modal
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, type = 'warning', confirmText = 'Confirm', cancelText = 'Cancel', loading = false }) => {
  if (!isOpen) return null;

  const colors = {
    danger: { bg: '#fee2e2', text: '#991b1b', btn: '#dc2626', icon: '#dc2626' },
    warning: { bg: '#fef3c7', text: '#92400e', btn: '#d97706', icon: '#d97706' },
    success: { bg: '#dcfce7', text: '#166534', btn: '#16a34a', icon: '#16a34a' },
    info: { bg: '#e0e7ff', text: '#3730a3', btn: '#4f46e5', icon: '#4f46e5' }
  };
  const theme = colors[type] || colors.warning;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }} onClick={!loading ? onClose : undefined}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '0', width: '400px', maxWidth: '90%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
        animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
          <div style={{ 
            width: '64px', height: '64px', background: theme.bg, borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <FaExclamationTriangle size={28} color={theme.icon} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>{title}</h3>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>{message}</p>
        </div>
        <div style={{ padding: '24px', display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0',
              background: 'white', color: '#64748b', fontSize: '13px', fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
              background: theme.btn, color: 'white', fontSize: '13px', fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: `0 4px 6px -1px ${theme.btn}40`
            }}
          >
            {loading && <FaSpinner className="spin" />} {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Modern Toggle Switch
const ModernToggle = ({ label, checked, onChange, disabled = false }) => (
  <div 
    onClick={() => !disabled && onChange(!checked)}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: '10px',
      background: checked ? '#f0f9ff' : '#f8fafc',
      border: checked ? '1px solid #bae6fd' : '1px solid #f1f5f9',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      marginBottom: '8px'
    }}
  >
    <span style={{ fontSize: '13px', fontWeight: '500', color: checked ? '#0369a1' : '#475569' }}>{label}</span>
    <div style={{
      width: '40px', height: '22px', background: checked ? '#0ea5e9' : '#cbd5e1',
      borderRadius: '20px', position: 'relative', transition: 'background 0.2s'
    }}>
      <div style={{
        width: '18px', height: '18px', background: 'white', borderRadius: '50%',
        position: 'absolute', top: '2px', left: checked ? '20px' : '2px',
        transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
      }} />
    </div>
  </div>
);

// 3. Modal Wrapper
const Modal = ({ isOpen, onClose, title, children, maxWidth = '600px' }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998,
      padding: isMobile ? '16px' : '24px'
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: isMobile ? '12px' : '16px', 
        width: isMobile ? '100%' : maxWidth, maxWidth: isMobile ? '100%' : '95%',
        maxHeight: isMobile ? '95vh' : '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        animation: 'modalFadeUp 0.3s ease-out'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ 
          padding: isMobile ? '16px' : '20px 24px', borderBottom: '1px solid #f1f5f9', 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
        }}>
          <h3 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
            <FaTimes size={isMobile ? 14 : 16} />
          </button>
        </div>
        <div style={{ padding: isMobile ? '16px' : '24px', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

const UserProfile = () => {
  // --- State ---
  const [userInfo, setUserInfo] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth > 768 && window.innerWidth <= 1024);
  
  // Modals state
  const [modalView, setModalView] = useState(null); // 'create', 'edit-user', 'edit-permissions', 'assign-branches'
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: null });
  
  // Selection state
  const [selectedUser, setSelectedUser] = useState(null);
  const [branchAccess, setBranchAccess] = useState(null);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]); // Can be null (all), [] (none), or [1,2,3] (specific)
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  // Form state
  const [creatingUser, setCreatingUser] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // For inline actions
  const [newUser, setNewUser] = useState({
    UserName: '', Password: '', Email: '', RoleType: 'User',
    Permissions: {
      CanViewStock: true, CanAddStock: false, CanEditStock: false, CanDeleteStock: false,
      CanManageUsers: false, CanViewReports: false, CanExportData: false, 
      CanViewAllBranches: false, CanManageBranches: false
    },
    AllowedBranchIds: []
  });

  // --- Effects ---
  useEffect(() => {
    try {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserInfo(parsed);
      }
      // Also get username from login if available
      const loginUsername = JSON.parse(localStorage.getItem('userInfo') || '{}')?.Username;
      if (loginUsername && !userInfo.Username) {
        setUserInfo(prev => ({ ...prev, Username: loginUsername }));
      }
    } catch (err) { console.error(err); }
    
    fetchUsers();
    fetchBranches();
  }, []);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth > 768 && window.innerWidth <= 1024);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- API Calls ---
  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      const clientCode = userInfo?.ClientCode || JSON.parse(localStorage.getItem('userInfo') || '{}')?.ClientCode;
      if (!clientCode) return;

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllBranchMaster',
        { ClientCode: clientCode },
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );

      const normalizeArray = (data) => {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') return data.data || data.items || data.results || data.list || [];
        return [];
      };
      setBranches(normalizeArray(response.data));
    } catch (error) {
      console.error('Failed to fetch branches', error);
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userManagementService.getAllSubUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to fetch users', error);
      toast.error('Failed to load user list.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserBranchAccess = async (userId) => {
    try {
      setLoadingBranches(true);
      const data = await userManagementService.getUserBranchAccess(userId);
      setBranchAccess(data);
      
      // Extract branch IDs from the response
      // Response can be array of { branchId, isAssigned } or { AllowedBranchIds: [...] }
      if (Array.isArray(data)) {
        // Format: [{ branchId: 1, isAssigned: true }, ...]
        const assignedBranchIds = data
          .filter(item => item.isAssigned === true)
          .map(item => item.branchId || item.BranchId || item.Id);
        setSelectedBranchIds(assignedBranchIds);
      } else if (data?.AllowedBranchIds) {
        // Format: { AllowedBranchIds: [1, 2, 3] }
        setSelectedBranchIds(data.AllowedBranchIds || []);
      } else {
        setSelectedBranchIds([]);
      }
    } catch (error) {
      console.error('Failed to load branch access', error);
      toast.error('Failed to load branch access.');
      setSelectedBranchIds([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  // --- Handlers ---
  const showConfirm = (title, message, onConfirm, type = 'warning') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, type });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.UserName || !newUser.Password || !newUser.Email) {
      toast.warning('Please fill in all required fields.');
      return;
    }

    try {
      setCreatingUser(true);
      await userManagementService.createDashboardUser({ ...newUser, AllowedBranchIds: selectedBranchIds });
      toast.success('User created successfully!');
      
      // Reset form
      setNewUser({
        UserName: '', Password: '', Email: '', RoleType: 'User',
        Permissions: {
          CanViewStock: true, CanAddStock: false, CanEditStock: false, CanDeleteStock: false,
          CanManageUsers: false, CanViewReports: false, CanExportData: false, 
          CanViewAllBranches: false, CanManageBranches: false
        },
        AllowedBranchIds: []
      });
      setSelectedBranchIds([]);
      setModalView(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to create user.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;
    try {
      setCreatingUser(true);
      await userManagementService.updatePermissions(selectedUser.UserId, selectedUser.Permissions);
      toast.success('Permissions updated successfully!');
      fetchUsers();
      setModalView(null);
    } catch (error) {
      toast.error(error.message || 'Failed to update permissions.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      setCreatingUser(true);
      await userManagementService.updateSubUser({
        UserId: selectedUser.UserId,
        UserName: selectedUser.UserName,
        Email: selectedUser.Email,
        Password: selectedUser.Password || undefined,
        RoleType: selectedUser.RoleType,
        Permissions: selectedUser.Permissions,
        AllowedBranchIds: selectedUser.AllowedBranchIds || []
      });
      toast.success('User updated successfully!');
      fetchUsers();
      setModalView(null);
    } catch (error) {
      toast.error(error.message || 'Failed to update user.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleAssignBranches = async () => {
    if (!selectedUser) return;
    try {
      setCreatingUser(true);
      // Handle different branch access scenarios:
      // - null = All branches access
      // - [] = No branch access
      // - [1, 2, 3] = Specific branches only
      let branchIdsToAssign;
      if (selectedBranchIds === null) {
        // All branches access
        branchIdsToAssign = null;
      } else if (Array.isArray(selectedBranchIds) && selectedBranchIds.length === 0) {
        // No access
        branchIdsToAssign = [];
      } else {
        // Specific branches
        branchIdsToAssign = selectedBranchIds;
      }
      
      await userManagementService.assignBranches(selectedUser.UserId, branchIdsToAssign);
      toast.success('Branch access updated successfully.');
      fetchUsers();
      setModalView(null);
      setSelectedBranchIds([]);
      setBranchAccess(null);
    } catch (error) {
      toast.error(error.message || 'Failed to assign branches.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleOpenBranchAccess = async (user) => {
    setSelectedUser(user);
    setModalView('assign-branches');
    await loadUserBranchAccess(user.UserId);
  };

  const handleDeleteUser = (userId, userName) => {
    showConfirm(
      'Delete User',
      `Are you sure you want to permanently delete "${userName}"? This action cannot be undone.`,
      async () => {
        try {
          setConfirmModal(prev => ({ ...prev, loading: true }));
          await userManagementService.deleteSubUser(userId);
          toast.success('User deleted successfully.');
          fetchUsers();
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (error) {
          toast.error('Failed to delete user.');
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        }
      },
      'danger'
    );
  };

  const handleToggleStatus = (userId, currentStatus) => {
    showConfirm(
      currentStatus ? 'Block User' : 'Activate User',
      `Are you sure you want to ${currentStatus ? 'block' : 'unblock'} this user account?`,
      async () => {
        try {
          setConfirmModal(prev => ({ ...prev, loading: true }));
          await userManagementService.toggleUserStatus(userId, !currentStatus);
          toast.success(`User ${currentStatus ? 'blocked' : 'activated'} successfully.`);
          setUsers(users.map(u => u.UserId === userId ? { ...u, IsActive: !currentStatus } : u));
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (error) {
          toast.error('Failed to update status.');
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        }
      },
      currentStatus ? 'warning' : 'success'
    );
  };

  const handleForceLogout = (userId, userName) => {
    showConfirm(
      'Force Logout',
      `Are you sure you want to force logout "${userName}"? They will be immediately signed out from all sessions.`,
      async () => {
        try {
          setConfirmModal(prev => ({ ...prev, loading: true }));
          await userManagementService.forceLogout(userId);
          toast.success(`User "${userName}" has been forced to logout successfully.`);
          // Update user's online status
          setUsers(users.map(u => u.UserId === userId ? { ...u, IsOnline: false } : u));
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (error) {
          const errorMessage = error.message || error?.message || 'Failed to force logout user.';
          toast.error(errorMessage);
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        }
      },
      'warning'
    );
  };

  // --- Helpers & Colors ---
  const getBranchName = (branchId) => {
    const branch = branches.find(b => b.BranchId === branchId || b.Id === branchId || b.branchId === branchId);
    return branch ? (branch.BranchName || branch.Name || branch.branchName || `Branch ${branchId}`) : `Branch ${branchId}`;
  };

  const toggleBranchSelection = (branchId) => {
    setSelectedBranchIds(prev => {
      // If prev is null (all branches), convert to array with all except the one being toggled
      if (prev === null) {
        const allIds = branches.map(b => b.BranchId || b.Id || b.branchId || b.id).filter(Boolean);
        return allIds.filter(id => id !== branchId);
      }
      // Normal toggle for array
      if (Array.isArray(prev)) {
        return prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId];
      }
      // Fallback
      return [branchId];
    });
  };

  const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : 'U';

  // --- Color Generators ---
  const getAvatarColor = (name) => {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
      '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', 
      '#d946ef', '#ec4899', '#f43f5e'
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getRoleBadgeStyle = (role) => {
    const styles = {
      'Admin': { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
      'Manager': { bg: '#ffedd5', color: '#9a3412', border: '#fed7aa' },
      'User': { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
      'Viewer': { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
      'Staff': { bg: '#fce7f3', color: '#be185d', border: '#fbcfe8' }
    };
    return styles[role] || styles['User'];
  };

  const getPermissionColor = (key) => {
    const permissionColors = {
      'Stock': { bg: '#ecfccb', text: '#3f6212', border: '#d9f99d' },
      'Users': { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
      'Reports': { bg: '#fae8ff', text: '#86198f', border: '#f5d0fe' },
      'Export': { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' },
      'Branches': { bg: '#ccfbf1', text: '#115e59', border: '#99f6e4' }
    };
    
    if (key.includes('Stock')) return permissionColors['Stock'];
    if (key.includes('User')) return permissionColors['Users'];
    if (key.includes('Report')) return permissionColors['Reports'];
    if (key.includes('Export')) return permissionColors['Export'];
    if (key.includes('Branch')) return permissionColors['Branches'];
    return { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' };
  };

  const filteredUsers = users.filter(user => 
    user.UserName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.Email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ 
      height: '100vh', display: 'flex', flexDirection: 'column', 
      background: '#ffffff', overflow: 'hidden', fontFamily: "'Inter', sans-serif" 
    }}>
      <style>{`
        @keyframes modalSlideIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes modalFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .hover-tr:hover { background-color: #f8fafc; transform: scale(1); }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; borderRadius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        /* Responsive styles */
        @media (max-width: 768px) {
          .user-profile-header { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; padding: 12px 16px !important; }
          .user-profile-stats { flex-direction: column !important; width: 100% !important; gap: 12px !important; }
          .user-profile-stats-card { width: 100% !important; min-width: auto !important; }
          .user-profile-toolbar { flex-direction: column !important; gap: 12px !important; padding: 12px 16px !important; }
          .user-profile-search { width: 100% !important; }
          .user-profile-table-wrapper { overflow-x: auto !important; }
          .user-profile-table { min-width: 800px !important; }
          .user-profile-actions { flex-wrap: wrap !important; justify-content: flex-start !important; }
          .user-profile-action-btn { font-size: 10px !important; padding: 5px 8px !important; }
          .user-profile-main-content { padding: 12px 16px !important; }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          .user-profile-header { padding: 14px 20px !important; }
          .user-profile-stats { gap: 12px !important; }
          .user-profile-stats-card { min-width: 120px !important; }
          .user-profile-toolbar { padding: 14px 18px !important; }
          .user-profile-search { width: 220px !important; }
          .user-profile-table-wrapper { overflow-x: auto !important; }
        }
      `}</style>

      {/* 1. Slim Profile Header */}
      <div className="user-profile-header" style={{ 
        background: 'white', borderBottom: '1px solid #e2e8f0', 
        padding: isMobile ? '12px 16px' : isTablet ? '14px 20px' : '16px 32px', 
        flexShrink: 0, display: 'flex', 
        alignItems: 'center', justifyContent: 'space-between', zIndex: 10,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px', flex: isMobile ? '1 1 100%' : '0 1 auto' }}>
          <div style={{ 
            width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px', 
            borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)', 
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold', 
            boxShadow: '0 4px 10px -2px rgba(79, 70, 229, 0.4)', flexShrink: 0
          }}>
            {getInitials(userInfo.UserName)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ 
                fontSize: isMobile ? '14px' : '16px', fontWeight: '700', color: '#1e293b', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {userInfo.Username || userInfo.UserName || 'Admin'}
              </h1>
              <span style={{ 
                fontSize: isMobile ? '9px' : '10px', background: '#fef3c7', color: '#b45309', 
                padding: isMobile ? '2px 8px' : '3px 10px', borderRadius: '12px', fontWeight: '700', 
                letterSpacing: '0.5px', border: '1px solid #fde68a', whiteSpace: 'nowrap'
              }}>
                SUPER ADMIN
              </span>
            </div>
            <div style={{ 
              fontSize: isMobile ? '10px' : '11px', color: '#64748b', marginTop: '4px', 
              display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FaBuilding size={isMobile ? 8 : 9} /> {userInfo.ClientCode || 'N/A'}
              </span>
              {!isMobile && <span style={{ color: '#cbd5e1' }}>|</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FaEnvelope size={isMobile ? 8 : 9} /> {userInfo.Email || 'N/A'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="user-profile-stats" style={{ 
          display: 'flex', gap: isMobile ? '12px' : '16px', 
          flex: isMobile ? '1 1 100%' : '0 0 auto',
          width: isMobile ? '100%' : 'auto'
        }}>
          <div className="card-hover user-profile-stats-card" style={{ 
            background: '#ffffff', padding: isMobile ? '10px 12px' : '12px 16px', borderRadius: '10px', 
            border: '1px solid #e5e7eb', transition: 'all 0.2s', 
            minWidth: isMobile ? 'auto' : isTablet ? '120px' : '130px', 
            flex: isMobile ? '1 1 calc(33.333% - 8px)' : '0 0 auto',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '10px' }}>
              <div style={{ 
                padding: isMobile ? '5px' : '6px', background: '#eff6ff', borderRadius: '6px', 
                color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <FaUsers size={isMobile ? 10 : 12} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '700', color: '#1e40af', lineHeight: 1 }}>{users.length}</div>
                <div style={{ fontSize: isMobile ? '9px' : '10px', color: '#3b82f6', fontWeight: '600', marginTop: '2px', letterSpacing: '0.3px' }}>TOTAL USERS</div>
              </div>
            </div>
          </div>

          <div className="card-hover user-profile-stats-card" style={{ 
            background: '#ffffff', padding: isMobile ? '10px 12px' : '12px 16px', borderRadius: '10px', 
            border: '1px solid #e5e7eb', transition: 'all 0.2s', 
            minWidth: isMobile ? 'auto' : isTablet ? '120px' : '130px',
            flex: isMobile ? '1 1 calc(33.333% - 8px)' : '0 0 auto',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '10px' }}>
              <div style={{ 
                padding: isMobile ? '5px' : '6px', background: '#dcfce7', borderRadius: '6px', 
                color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <FaUserCheck size={isMobile ? 10 : 12} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '700', color: '#15803d', lineHeight: 1 }}>{users.filter(u => u.IsActive).length}</div>
                <div style={{ fontSize: isMobile ? '9px' : '10px', color: '#22c55e', fontWeight: '600', marginTop: '2px', letterSpacing: '0.3px' }}>ACTIVE</div>
              </div>
            </div>
          </div>

          <div className="card-hover user-profile-stats-card" style={{ 
            background: '#ffffff', padding: isMobile ? '10px 12px' : '12px 16px', borderRadius: '10px', 
            border: '1px solid #e5e7eb', transition: 'all 0.2s', 
            minWidth: isMobile ? 'auto' : isTablet ? '120px' : '130px',
            flex: isMobile ? '1 1 calc(33.333% - 8px)' : '0 0 auto',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '10px' }}>
              <div style={{ 
                padding: isMobile ? '5px' : '6px', background: '#fff7ed', borderRadius: '6px', 
                color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <FaSignal size={isMobile ? 10 : 12} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '700', color: '#c2410c', lineHeight: 1 }}>{users.filter(u => u.IsOnline).length}</div>
                <div style={{ fontSize: isMobile ? '9px' : '10px', color: '#f97316', fontWeight: '600', marginTop: '2px', letterSpacing: '0.3px' }}>ONLINE</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="user-profile-main-content" style={{ 
        flex: 1, overflow: 'hidden', 
        padding: isMobile ? '12px 16px' : isTablet ? '16px 20px' : '20px 24px', 
        display: 'flex', flexDirection: 'column', background: '#ffffff' 
      }}>
        <div style={{ 
          background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', 
          display: 'flex', flexDirection: 'column', flex: 1, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}>
          {/* Toolbar */}
          <div className="user-profile-toolbar" style={{ 
            padding: isMobile ? '12px 16px' : isTablet ? '14px 18px' : '16px 20px', 
            borderBottom: '1px solid #e5e7eb', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'flex-start' : 'center', 
            background: '#ffffff',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            gap: isMobile ? '12px' : '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: isMobile ? '1 1 100%' : '0 1 auto' }}>
              <h2 style={{ 
                fontSize: isMobile ? '13px' : '14px', fontWeight: '700', color: '#111827', 
                margin: 0, letterSpacing: '0.3px' 
              }}>
                User Management
              </h2>
              <span style={{ 
                background: '#f3f4f6', color: '#6b7280', 
                fontSize: isMobile ? '10px' : '11px', 
                padding: isMobile ? '2px 6px' : '3px 8px', 
                borderRadius: '6px', fontWeight: '600',
                whiteSpace: 'nowrap'
              }}>
                {filteredUsers.length} Results
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', gap: isMobile ? '12px' : '16px', 
              flex: isMobile ? '1 1 100%' : '0 0 auto',
              width: isMobile ? '100%' : 'auto'
            }}>
              <div className="user-profile-search" style={{ 
                position: 'relative', 
                width: isMobile ? '100%' : isTablet ? '220px' : '260px',
                flex: isMobile ? '1 1 auto' : '0 0 auto'
              }}>
                <FaSearch style={{ 
                  position: 'absolute', left: '10px', top: '50%', 
                  transform: 'translateY(-50%)', color: '#9ca3af', 
                  fontSize: isMobile ? '11px' : '12px' 
                }} />
                <input
                  type="text"
                  placeholder="Search keyword..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%', 
                    padding: isMobile ? '7px 10px 7px 30px' : '8px 12px 8px 32px', 
                    borderRadius: '8px',
                    border: '1px solid #d1d5db', 
                    fontSize: isMobile ? '11px' : '12px', 
                    outline: 'none',
                    background: '#ffffff', transition: 'all 0.2s',
                    color: '#374151'
                  }}
                  onFocus={(e) => {
                    e.target.style.background = '#ffffff';
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.background = '#ffffff';
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <button
                onClick={() => { setSelectedBranchIds([]); setModalView('create'); }}
                style={{
                  background: '#3b82f6', 
                  color: 'white', border: 'none', 
                  padding: isMobile ? '7px 12px' : '8px 16px',
                  borderRadius: '8px', 
                  fontSize: isMobile ? '11px' : '12px', 
                  fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', 
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#2563eb'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#3b82f6'; }}
              >
                <FaUserPlus size={isMobile ? 11 : 12} /> 
                {isMobile ? 'Add' : 'Add New User'}
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="user-profile-table-wrapper" style={{ 
            flex: 1, overflow: 'auto', background: '#ffffff',
            overflowX: isMobile ? 'auto' : 'hidden'
          }}>
            <table className="user-profile-table" style={{ 
              width: '100%', borderCollapse: 'collapse', 
              fontSize: isMobile ? '11px' : '12px', 
              background: '#ffffff',
              minWidth: isMobile ? '800px' : '100%'
            }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 5, borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ 
                    padding: isMobile ? '10px 12px' : '12px 16px', 
                    textAlign: 'left', fontWeight: '600', color: '#6b7280', 
                    fontSize: isMobile ? '9px' : '10px', 
                    letterSpacing: '0.5px', textTransform: 'uppercase' 
                  }}>
                    User
                  </th>
                  <th style={{ 
                    padding: isMobile ? '10px 12px' : '12px 16px', 
                    textAlign: 'left', fontWeight: '600', color: '#6b7280', 
                    fontSize: isMobile ? '9px' : '10px', 
                    letterSpacing: '0.5px', textTransform: 'uppercase' 
                  }}>
                    Role
                  </th>
                  <th style={{ 
                    padding: isMobile ? '10px 12px' : '12px 16px', 
                    textAlign: 'left', fontWeight: '600', color: '#6b7280', 
                    fontSize: isMobile ? '9px' : '10px', 
                    letterSpacing: '0.5px', textTransform: 'uppercase' 
                  }}>
                    Status
                  </th>
                  <th style={{ 
                    padding: isMobile ? '10px 12px' : '12px 16px', 
                    textAlign: 'left', fontWeight: '600', color: '#6b7280', 
                    fontSize: isMobile ? '9px' : '10px', 
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                    display: isMobile ? 'none' : 'table-cell'
                  }}>
                    Permissions
                  </th>
                  <th style={{ 
                    padding: isMobile ? '10px 12px' : '12px 16px', 
                    textAlign: 'left', fontWeight: '600', color: '#6b7280', 
                    fontSize: isMobile ? '9px' : '10px', 
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                    display: isMobile ? 'none' : 'table-cell'
                  }}>
                    Branch Access
                  </th>
                  <th style={{ 
                    padding: isMobile ? '10px 12px' : '12px 16px', 
                    textAlign: 'right', fontWeight: '600', color: '#6b7280', 
                    fontSize: isMobile ? '9px' : '10px', 
                    letterSpacing: '0.5px', textTransform: 'uppercase' 
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center' }}><Loader /></td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ marginBottom: '12px' }}><FaSearch size={24} color="#e2e8f0" /></div>
                    No users found matching your search.
                  </td></tr>
                ) : (
                  filteredUsers.map((user) => {
                    const roleStyle = getRoleBadgeStyle(user.RoleType || 'User');
                    const avatarColor = getAvatarColor(user.UserName);
                    
                    return (
                      <tr key={user.UserId} className="hover-tr" style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s', background: '#ffffff' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}>
                        <td style={{ padding: isMobile ? '10px 12px' : '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px' }}>
                            <div style={{ 
                              width: isMobile ? '28px' : '32px', 
                              height: isMobile ? '28px' : '32px', 
                              borderRadius: '8px', background: avatarColor, 
                              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              fontWeight: '700', fontSize: isMobile ? '10px' : '12px', flexShrink: 0
                            }}>
                              {getInitials(user.UserName)}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ 
                                fontWeight: '600', color: '#111827', 
                                fontSize: isMobile ? '11px' : '12px', 
                                lineHeight: '1.4',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                              }}>
                                {user.UserName}
                              </div>
                              <div style={{ 
                                fontSize: isMobile ? '10px' : '11px', 
                                color: '#6b7280', marginTop: '2px', 
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                              }}>
                                {user.Email}
                              </div>
                              {/* Show permissions on mobile in user cell */}
                              {isMobile && (
                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '4px' }}>
                                  {Object.entries(user.Permissions || {}).filter(([_, v]) => v).slice(0, 2).map(([key]) => {
                                    const pStyle = getPermissionColor(key);
                                    return (
                                      <span key={key} style={{ 
                                        fontSize: '8px', background: pStyle.bg, color: pStyle.text, 
                                        padding: '2px 5px', borderRadius: '4px', border: `1px solid ${pStyle.border}`,
                                        fontWeight: '500'
                                      }}>
                                        {key.replace('Can', '').replace(/([A-Z])/g, ' $1').trim().substring(0, 8)}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: isMobile ? '10px 12px' : '12px 16px' }}>
                          <span style={{ 
                            padding: isMobile ? '3px 8px' : '4px 10px', 
                            borderRadius: '6px', 
                            fontSize: isMobile ? '9px' : '10px', 
                            fontWeight: '600',
                            background: roleStyle.bg, color: roleStyle.color, border: `1px solid ${roleStyle.border}`,
                            display: 'inline-block', letterSpacing: '0.3px'
                          }}>
                            {user.RoleType || 'User'}
                          </span>
                        </td>
                        <td style={{ padding: isMobile ? '10px 12px' : '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px' }}>
                            <div style={{ 
                              width: isMobile ? '5px' : '6px', 
                              height: isMobile ? '5px' : '6px', 
                              borderRadius: '50%', 
                              background: user.IsActive ? '#10b981' : '#ef4444'
                            }} />
                            <span style={{ 
                              color: user.IsActive ? '#059669' : '#dc2626', 
                              fontWeight: '600', 
                              fontSize: isMobile ? '10px' : '11px',
                              padding: isMobile ? '2px 6px' : '3px 8px',
                              background: user.IsActive ? '#d1fae5' : '#fee2e2',
                              borderRadius: '6px',
                              border: `1px solid ${user.IsActive ? '#a7f3d0' : '#fecaca'}`
                            }}>
                              {user.IsActive ? 'Active' : 'Blocked'}
                            </span>
                          </div>
                        </td>
                        <td style={{ 
                          padding: isMobile ? '10px 12px' : '12px 16px',
                          display: isMobile ? 'none' : 'table-cell'
                        }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: isMobile ? '100%' : '280px' }}>
                            {Object.entries(user.Permissions || {}).filter(([_, v]) => v).slice(0, 3).map(([key]) => {
                              const pStyle = getPermissionColor(key);
                              return (
                                <span key={key} style={{ 
                                  fontSize: isMobile ? '9px' : '10px', background: pStyle.bg, color: pStyle.text, 
                                  padding: isMobile ? '2px 6px' : '3px 7px', borderRadius: '5px', border: `1px solid ${pStyle.border}`,
                                  fontWeight: '500', letterSpacing: '0.2px'
                                }}>
                                  {key.replace('Can', '').replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                              );
                            })}
                            {Object.values(user.Permissions || {}).filter(v => v).length > 3 && (
                              <span style={{ 
                                fontSize: isMobile ? '9px' : '10px', color: '#6b7280', 
                                padding: isMobile ? '2px 6px' : '3px 7px', 
                                background: '#f3f4f6', borderRadius: '5px', border: '1px solid #e5e7eb', fontWeight: '500' 
                              }}>
                                +{Object.values(user.Permissions || {}).filter(v => v).length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ 
                          padding: isMobile ? '10px 12px' : '12px 16px',
                          display: isMobile ? 'none' : 'table-cell'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {user.AllowedBranchIds === null || user.HasAllBranchAccess ? (
                              <span style={{ 
                                fontSize: '10px', 
                                background: '#f0fdf4', 
                                color: '#16a34a', 
                                padding: '3px 8px', 
                                borderRadius: '4px', 
                                border: '1px solid #bbf7d0',
                                fontWeight: '500',
                                display: 'inline-block',
                                width: 'fit-content'
                              }}>
                                All Branches
                              </span>
                            ) : Array.isArray(user.AllowedBranchIds) && user.AllowedBranchIds.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span style={{ 
                                  fontSize: '10px', 
                                  background: '#eff6ff', 
                                  color: '#2563eb', 
                                  padding: '3px 8px', 
                                  borderRadius: '4px', 
                                  border: '1px solid #bfdbfe',
                                  fontWeight: '500',
                                  display: 'inline-block',
                                  width: 'fit-content'
                                }}>
                                  {user.AllowedBranchIds.length} Branch{user.AllowedBranchIds.length !== 1 ? 'es' : ''}
                                </span>
                                {user.AllowedBranchIds.slice(0, 2).map(branchId => (
                                  <span key={branchId} style={{ 
                                    fontSize: '9px', 
                                    color: '#64748b',
                                    marginLeft: '4px'
                                  }}>
                                    • {getBranchName(branchId)}
                                  </span>
                                ))}
                                {user.AllowedBranchIds.length > 2 && (
                                  <span style={{ fontSize: '9px', color: '#94a3b8', marginLeft: '4px' }}>
                                    +{user.AllowedBranchIds.length - 2} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ 
                                fontSize: '10px', 
                                background: '#fef2f2', 
                                color: '#dc2626', 
                                padding: '3px 8px', 
                                borderRadius: '4px', 
                                border: '1px solid #fecaca',
                                fontWeight: '500',
                                display: 'inline-block',
                                width: 'fit-content'
                              }}>
                                No Access
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ 
                          padding: isMobile ? '10px 12px' : '12px 16px', 
                          textAlign: isMobile ? 'left' : 'right' 
                        }}>
                          <div className="user-profile-actions" style={{ 
                            display: 'flex', 
                            justifyContent: isMobile ? 'flex-start' : 'flex-end', 
                            gap: isMobile ? '4px' : '6px',
                            flexWrap: 'wrap'
                          }}>
                            <button className="user-profile-action-btn" onClick={() => { setSelectedUser(user); setModalView('edit-user'); }} title="Edit"
                              style={{ 
                                padding: isMobile ? '5px 8px' : '6px 10px', 
                                border: '1px solid #e5e7eb', borderRadius: '6px', 
                                background: '#ffffff', color: '#6b7280', cursor: 'pointer', transition: 'all 0.2s',
                                fontSize: isMobile ? '10px' : '11px', fontWeight: '500', 
                                display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '4px',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#3b82f6'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#6b7280'; }}>
                              <FaEdit size={isMobile ? 10 : 11} /> {isMobile ? '' : 'Edit'}
                            </button>
                            <button className="user-profile-action-btn" onClick={() => { setSelectedUser(user); setModalView('edit-permissions'); }} title="Permissions"
                              style={{ 
                                padding: isMobile ? '5px 8px' : '6px 10px', 
                                border: '1px solid #e5e7eb', borderRadius: '6px', 
                                background: '#ffffff', color: '#6b7280', cursor: 'pointer', transition: 'all 0.2s',
                                fontSize: isMobile ? '10px' : '11px', fontWeight: '500', 
                                display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '4px',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.color = '#8b5cf6'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#6b7280'; }}>
                              <FaUserShield size={isMobile ? 10 : 11} /> {isMobile ? '' : 'Perms'}
                            </button>
                            <button className="user-profile-action-btn" onClick={() => handleOpenBranchAccess(user)} title="Branch Access"
                              style={{ 
                                padding: isMobile ? '5px 8px' : '6px 10px', 
                                border: '1px solid #e5e7eb', borderRadius: '6px', 
                                background: '#ffffff', color: '#6b7280', cursor: 'pointer', transition: 'all 0.2s',
                                fontSize: isMobile ? '10px' : '11px', fontWeight: '500', 
                                display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '4px',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.color = '#10b981'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#6b7280'; }}>
                              <FaMapMarkerAlt size={isMobile ? 10 : 11} /> {isMobile ? '' : 'Branches'}
                            </button>
                            {user.IsActive && (
                              <button className="user-profile-action-btn" onClick={() => handleForceLogout(user.UserId, user.UserName)} title="Force Logout"
                                style={{ 
                                  padding: isMobile ? '5px 8px' : '6px 10px', 
                                  border: '1px solid #e5e7eb', borderRadius: '6px', 
                                  background: '#ffffff', color: '#f59e0b', 
                                  cursor: 'pointer', transition: 'all 0.2s',
                                  fontSize: isMobile ? '10px' : '11px', fontWeight: '500', 
                                  display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '4px',
                                  whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={e => { 
                                  e.currentTarget.style.borderColor = '#f59e0b'; 
                                  e.currentTarget.style.background = '#fffbeb'; 
                                  e.currentTarget.style.color = '#d97706';
                                }}
                                onMouseLeave={e => { 
                                  e.currentTarget.style.borderColor = '#e5e7eb'; 
                                  e.currentTarget.style.background = '#ffffff'; 
                                  e.currentTarget.style.color = '#f59e0b';
                                }}>
                                <FaSignOutAlt size={isMobile ? 10 : 11} /> {isMobile ? '' : 'Logout'}
                              </button>
                            )}
                            <button className="user-profile-action-btn" onClick={() => handleToggleStatus(user.UserId, user.IsActive)} title={user.IsActive ? "Block" : "Unblock"}
                              style={{ 
                                padding: isMobile ? '5px 8px' : '6px 10px', 
                                border: '1px solid #e5e7eb', borderRadius: '6px', 
                                background: user.IsActive ? '#ffffff' : '#dcfce7', 
                                color: user.IsActive ? '#6b7280' : '#059669', 
                                cursor: 'pointer', transition: 'all 0.2s',
                                fontSize: isMobile ? '10px' : '11px', fontWeight: '500', 
                                display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '4px',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={e => { 
                                if (user.IsActive) {
                                  e.currentTarget.style.borderColor = '#ef4444'; 
                                  e.currentTarget.style.background = '#fef2f2'; 
                                  e.currentTarget.style.color = '#dc2626';
                                }
                              }}
                              onMouseLeave={e => { 
                                if (user.IsActive) {
                                  e.currentTarget.style.borderColor = '#e5e7eb'; 
                                  e.currentTarget.style.background = '#ffffff'; 
                                  e.currentTarget.style.color = '#6b7280';
                                }
                              }}>
                              {user.IsActive ? <FaUserSlash size={isMobile ? 10 : 11} /> : <FaCheck size={isMobile ? 10 : 11} />} 
                              {isMobile ? '' : (user.IsActive ? 'Block' : 'Active')}
                            </button>
                            <button className="user-profile-action-btn" onClick={() => handleDeleteUser(user.UserId, user.UserName)} title="Delete"
                              style={{ 
                                padding: isMobile ? '5px 8px' : '6px 10px', 
                                border: '1px solid #e5e7eb', borderRadius: '6px', 
                                background: '#ffffff', color: '#6b7280', cursor: 'pointer', transition: 'all 0.2s',
                                fontSize: isMobile ? '10px' : '11px', fontWeight: '500', 
                                display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '4px',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#6b7280'; }}>
                              <FaTrash size={isMobile ? 10 : 11} /> {isMobile ? '' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Create User Modal */}
      <Modal isOpen={modalView === 'create'} onClose={() => setModalView(null)} title="Create New User">
        <form onSubmit={handleCreateUser}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Full Name</label>
              <input type="text" required placeholder="John Doe"
                value={newUser.UserName} onChange={e => setNewUser({...newUser, UserName: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Email</label>
              <input type="email" required placeholder="john@example.com"
                value={newUser.Email} onChange={e => setNewUser({...newUser, Email: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Role</label>
              <select value={newUser.RoleType} onChange={e => setNewUser({...newUser, RoleType: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}>
                <option value="User">User</option>
                <option value="Manager">Manager</option>
                <option value="Viewer">Viewer</option>
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Password</label>
              <input type="password" required placeholder="••••••••"
                value={newUser.Password} onChange={e => setNewUser({...newUser, Password: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Assign Branches</label>
            <div style={{ position: 'relative' }}>
              <div onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                  fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                <span style={{ color: selectedBranchIds.length ? '#1e293b' : '#94a3b8' }}>
                  {selectedBranchIds.length ? `${selectedBranchIds.length} branches selected` : 'Select branches...'}
                </span>
                <FaChevronDown size={12} color="#94a3b8" />
              </div>
              {showBranchDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0',
                  borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                  {branches.map(branch => {
                    const id = branch.BranchId || branch.Id;
                    const name = branch.BranchName || branch.Name;
                    const isSel = selectedBranchIds.includes(id);
                    return (
                      <div key={id} onClick={() => toggleBranchSelection(id)}
                        style={{ padding: '8px 12px', fontSize: '13px', background: isSel ? '#f0f9ff' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSel ? '#2563eb' : 'white' }}>
                          {isSel && <FaCheck size={10} color="white" />}
                        </div>
                        {name}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '10px' }}>Default Permissions</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {Object.keys(newUser.Permissions).map(key => (
                <ModernToggle key={key}
                  label={key.replace('Can', '').replace(/([A-Z])/g, ' $1').trim()}
                  checked={newUser.Permissions[key]}
                  onChange={val => setNewUser(prev => ({ ...prev, Permissions: { ...prev.Permissions, [key]: val } }))}
                />
              ))}
            </div>
          </div>

          <button type="submit" disabled={creatingUser}
            style={{
              width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none',
              borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: creatingUser ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}>
            {creatingUser ? <FaSpinner className="spin" /> : <FaUserPlus />} Create User Account
          </button>
        </form>
      </Modal>

      {/* 2. Edit User Modal */}
      <Modal isOpen={modalView === 'edit-user'} onClose={() => setModalView(null)} title="Edit User Details">
        {selectedUser && (
          <form onSubmit={(e) => { e.preventDefault(); handleUpdateUser(); }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Full Name</label>
              <input type="text" value={selectedUser.UserName || ''} onChange={e => setSelectedUser({...selectedUser, UserName: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Email</label>
              <input type="email" value={selectedUser.Email || ''} onChange={e => setSelectedUser({...selectedUser, Email: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Role</label>
              <select value={selectedUser.RoleType || 'User'} onChange={e => setSelectedUser({...selectedUser, RoleType: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}>
                <option value="User">User</option>
                <option value="Manager">Manager</option>
                <option value="Viewer">Viewer</option>
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Reset Password (Optional)</label>
              <input type="password" placeholder="Enter new password to change" value={selectedUser.Password || ''} onChange={e => setSelectedUser({...selectedUser, Password: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
            </div>
            <button type="submit" disabled={creatingUser}
              style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              {creatingUser ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </Modal>

      {/* 3. Edit Permissions Modal */}
      <Modal isOpen={modalView === 'edit-permissions'} onClose={() => setModalView(null)} title="Manage Permissions">
        {selectedUser && (
          <div>
            <div style={{ marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: '#64748b' }}>
              Configuring access for <strong>{selectedUser.UserName}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {Object.keys(selectedUser.Permissions || {}).map(key => (
                <ModernToggle key={key}
                  label={key.replace('Can', '').replace(/([A-Z])/g, ' $1').trim()}
                  checked={selectedUser.Permissions[key]}
                  onChange={val => setSelectedUser(prev => ({ ...prev, Permissions: { ...prev.Permissions, [key]: val } }))}
                />
              ))}
            </div>
            <button onClick={handleUpdatePermissions} disabled={creatingUser}
              style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              {creatingUser ? 'Updating...' : 'Update Permissions'}
            </button>
          </div>
        )}
      </Modal>

      {/* 4. Assign Branches Modal - Enhanced */}
      <Modal isOpen={modalView === 'assign-branches'} onClose={() => { setModalView(null); setSelectedBranchIds([]); setBranchAccess(null); }} title="Manage Branch Access" maxWidth="700px">
        {selectedUser && (
          <div>
            <div style={{ marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: '#64748b', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: '600', color: '#334155', marginBottom: '4px' }}>User: {selectedUser.UserName}</div>
              <div style={{ fontSize: '12px' }}>
                {selectedUser.Permissions?.CanViewStock ? (
                  <span style={{ color: '#059669' }}>✓ Can View Stock</span>
                ) : (
                  <span style={{ color: '#dc2626' }}>⚠ Cannot View Stock - Enable "CanViewStock" permission first</span>
                )}
              </div>
            </div>

            {loadingBranches ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><Loader /></div>
            ) : (
              <>
                {/* Quick Actions */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      // Select all branches
                      const allBranchIds = branches.map(b => b.BranchId || b.Id).filter(Boolean);
                      setSelectedBranchIds(allBranchIds);
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedBranchIds([])}
                    style={{
                      padding: '6px 12px',
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => {
                      // Set to null for all branches access
                      setSelectedBranchIds(null);
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#f0fdf4',
                      color: '#16a34a',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Allow All Branches
                  </button>
                </div>

                {/* Branch Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '10px' }}>
                    Select Branches for Stock Access
                    {selectedBranchIds === null && (
                      <span style={{ marginLeft: '8px', color: '#16a34a', fontSize: '11px' }}>(All branches enabled)</span>
                    )}
                    {Array.isArray(selectedBranchIds) && selectedBranchIds.length > 0 && (
                      <span style={{ marginLeft: '8px', color: '#2563eb', fontSize: '11px' }}>({selectedBranchIds.length} selected)</span>
                    )}
                    {Array.isArray(selectedBranchIds) && selectedBranchIds.length === 0 && (
                      <span style={{ marginLeft: '8px', color: '#dc2626', fontSize: '11px' }}>(No access)</span>
                    )}
                  </label>
                  <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff' }}>
                    {branches.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                        <FaMapMarkerAlt size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                        <div>No branches found</div>
                      </div>
                    ) : (
                      branches.map(branch => {
                        const id = branch.BranchId || branch.Id || branch.branchId || branch.id;
                        const name = branch.BranchName || branch.Name || branch.branchName || branch.name || `Branch ${id}`;
                        const isSel = selectedBranchIds === null || (Array.isArray(selectedBranchIds) && selectedBranchIds.includes(id));
                        const wasAssigned = branchAccess && Array.isArray(branchAccess) 
                          ? branchAccess.find(b => (b.branchId || b.BranchId || b.Id) === id)?.isAssigned
                          : false;
                        
                        return (
                          <div 
                            key={id} 
                            onClick={() => {
                              if (selectedBranchIds === null) {
                                // If "all branches" is selected, switch to specific selection
                                const allIds = branches.map(b => b.BranchId || b.Id || b.branchId || b.id).filter(Boolean);
                                setSelectedBranchIds(allIds.filter(bid => bid !== id));
                              } else {
                                toggleBranchSelection(id);
                              }
                            }}
                            style={{ 
                              padding: '12px 16px', 
                              borderBottom: '1px solid #f1f5f9', 
                              cursor: 'pointer', 
                              background: isSel ? '#f0f9ff' : 'white', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '12px',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSel) e.currentTarget.style.background = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSel) e.currentTarget.style.background = 'white';
                            }}
                          >
                            <div style={{ 
                              width: '20px', 
                              height: '20px', 
                              borderRadius: '4px', 
                              border: isSel ? 'none' : '2px solid #cbd5e1', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              background: isSel ? '#2563eb' : 'white',
                              flexShrink: 0
                            }}>
                              {isSel && <FaCheck size={12} color="white" />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>
                                {name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                ID: {id}
                                {wasAssigned && !isSel && (
                                  <span style={{ marginLeft: '8px', color: '#f59e0b', fontSize: '10px' }}>(Previously assigned)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Selected Branches Summary */}
                {selectedBranchIds !== null && Array.isArray(selectedBranchIds) && selectedBranchIds.length > 0 && (
                  <div style={{ marginBottom: '20px', padding: '12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
                      Selected Branches ({selectedBranchIds.length}):
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {selectedBranchIds.map(id => (
                        <span key={id} style={{ 
                          fontSize: '11px', 
                          background: '#ffffff', 
                          color: '#1e40af', 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          border: '1px solid #93c5fd',
                          fontWeight: '500'
                        }}>
                          {getBranchName(id)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBranchIds === null && (
                  <div style={{ marginBottom: '20px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaCheck /> All Branches Access Enabled
                    </div>
                    <div style={{ fontSize: '11px', color: '#15803d', marginTop: '4px' }}>
                      User will be able to view stock from all branches.
                    </div>
                  </div>
                )}

                {Array.isArray(selectedBranchIds) && selectedBranchIds.length === 0 && (
                  <div style={{ marginBottom: '20px', padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaExclamationTriangle /> No Branch Access
                    </div>
                    <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '4px' }}>
                      User will not be able to view any stock. Select branches or enable "All Branches" access.
                    </div>
                  </div>
                )}

                {/* Info Note */}
                <div style={{ marginBottom: '20px', padding: '10px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '11px', color: '#92400e' }}>
                  <strong>Note:</strong> Branch access controls which stock data the user can view. User must also have "CanViewStock" permission enabled.
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => { setModalView(null); setSelectedBranchIds([]); setBranchAccess(null); }}
                    disabled={creatingUser}
                    style={{ 
                      flex: 1, 
                      padding: '12px', 
                      background: '#f3f4f6', 
                      color: '#374151', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '8px', 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      cursor: creatingUser ? 'not-allowed' : 'pointer',
                      opacity: creatingUser ? 0.6 : 1
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAssignBranches} 
                    disabled={creatingUser || !selectedUser.Permissions?.CanViewStock}
                    style={{ 
                      flex: 1, 
                      padding: '12px', 
                      background: selectedUser.Permissions?.CanViewStock ? '#10b981' : '#9ca3af', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      cursor: (creatingUser || !selectedUser.Permissions?.CanViewStock) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {creatingUser ? (
                      <>
                        <FaSpinner className="spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <FaSave /> Save Branch Access
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmation Popup */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        loading={confirmModal.loading}
      />
    </div>
  );
};

export default UserProfile;
