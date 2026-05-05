import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { 
  FaClipboardCheck, 
  FaSearch, 
  FaPlus, 
  FaEye, 
  FaCalendarAlt,
  FaFilter,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaLayerGroup,
  FaChartBar,
  FaFileExcel,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaBoxes,
  FaTimes
} from 'react-icons/fa';
import { useNotifications } from '../../context/NotificationContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useLoading } from '../../App';

/** Teal theme — distinct from Sample Out (red) / Sample In palettes */
const SV = {
  stripe: 'linear-gradient(90deg, #0f7669 0%, #14b8a6 45%, #0d9488 100%)',
  accent: '#0d9488',
  accentDark: '#0f7669',
  accentMuted: '#ccfbf1',
  headerBg: '#f4f4f5',
  tableBg: '#fafafa',
};

const StockVerification = () => {
  const navigate = useNavigate();
  const pick = (obj, keys, fallback = 0) => {
    if (!obj) return fallback;
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return fallback;
  };

  const resolveConsolidationTotals = (totals) => {
    const totalInventoryQty = Number(pick(totals, ['TotalInventoryQty', 'TotalInventory', 'totalInventoryQty'], 0)) || 0;
    const matchedQty = Number(pick(totals, ['MatchedQty', 'matchedQty'], 0)) || 0;
    const unmatchQty = Number(pick(totals, ['UnmatchQty', 'unmatchQty', 'UnMatchedQty'], 0)) || 0;

    let totalInventoryGrossWeight = Number(pick(totals, ['TotalInventoryGrossWeight', 'totalInventoryGrossWeight', 'TotalInventoryWeight'], 0)) || 0;
    let totalInventoryNetWeight = Number(pick(totals, ['TotalInventoryNetWeight', 'totalInventoryNetWeight', 'TotalInventoryweight', 'TotalInventoryWeight'], 0)) || 0;
    const totalMatchGrossWeight = Number(pick(totals, ['TotalMatchGrossWeight', 'totalMatchGrossWeight', 'TotalMatchWeight'], 0)) || 0;
    const totalMatchNetWeight = Number(pick(totals, ['TotalMatchNetWeight', 'totalMatchNetWeight', 'TotalMatchweight', 'TotalMatchWeight'], 0)) || 0;
    const totalUnmatchGrossWeight = Number(pick(totals, ['TotalUnmatchGrossWeight', 'totalUnmatchGrossWeight', 'TotalUnMatchGrossWeight', 'TotalUnmatchWeight'], 0)) || 0;
    const totalUnmatchNetWeight = Number(pick(totals, ['TotalUnmatchNetWeight', 'totalUnmatchNetWeight', 'TotalUnmatchweight', 'TotalUnMatchNetWeight', 'TotalUnmatchWeight'], 0)) || 0;

    // If everything is unmatched, inventory totals should mirror unmatched totals.
    if (matchedQty === 0 && totalInventoryQty === unmatchQty) {
      totalInventoryGrossWeight = totalUnmatchGrossWeight;
      totalInventoryNetWeight = totalUnmatchNetWeight;
    }

    return {
      totalInventoryQty,
      matchedQty,
      unmatchQty,
      totalInventoryGrossWeight,
      totalInventoryNetWeight,
      totalMatchGrossWeight,
      totalMatchNetWeight,
      totalUnmatchGrossWeight,
      totalUnmatchNetWeight,
    };
  };
  // Global loader
  const { setLoading } = useLoading();
  
  // State Management
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'BranchName', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalSessions, setTotalSessions] = useState(0);
  const [userInfo, setUserInfo] = useState({});
  const [clientCode, setClientCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailsSlider, setShowDetailsSlider] = useState(false);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [matchedPage, setMatchedPage] = useState(1);
  const [unmatchedPage, setUnmatchedPage] = useState(1);
  const [matchedSearchQuery, setMatchedSearchQuery] = useState('');
  const [unmatchedSearchQuery, setUnmatchedSearchQuery] = useState('');
  const [tableItemsPerPage] = useState(10);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [pageInput, setPageInput] = useState('');
  const isInitialMount = useRef(true);
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' or 'combineReport'
  
  // Combine Report State
  const [consolidationData, setConsolidationData] = useState(null);
  const [consolidationLoading, setConsolidationLoading] = useState(false);
  const [consolidationError, setConsolidationError] = useState(null);
  const [selectedReportDate, setSelectedReportDate] = useState(() => {
    // Default to today's date in YYYY-MM-DD format
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [showExportBranchModal, setShowExportBranchModal] = useState(false);
  const [selectedExportBranchId, setSelectedExportBranchId] = useState('');
  const [consolidationTreePage, setConsolidationTreePage] = useState(1);
  const [consolidationItemsPerPage, setConsolidationItemsPerPage] = useState(15);

  const { addNotification } = useNotifications();
  const { t } = useTranslation();

  // Filtered lists for Matched/Unmatched items in Session Details
  const filteredMatchedList = useMemo(() => {
    if (!sessionDetails?.MatchedList) return [];
    if (!matchedSearchQuery) return sessionDetails.MatchedList;
    const lowerQuery = matchedSearchQuery.toLowerCase();
    return sessionDetails.MatchedList.filter(item =>
      (item.ItemCode && String(item.ItemCode).toLowerCase().includes(lowerQuery)) ||
      (item.ProductName && String(item.ProductName).toLowerCase().includes(lowerQuery)) ||
      (item.CategoryName && String(item.CategoryName).toLowerCase().includes(lowerQuery)) ||
      (item.RFIDCode && String(item.RFIDCode).toLowerCase().includes(lowerQuery))
    );
  }, [sessionDetails?.MatchedList, matchedSearchQuery]);

  const filteredUnmatchedList = useMemo(() => {
    if (!sessionDetails?.UnmatchedList) return [];
    if (!unmatchedSearchQuery) return sessionDetails.UnmatchedList;
    const lowerQuery = unmatchedSearchQuery.toLowerCase();
    return sessionDetails.UnmatchedList.filter(item =>
      (item.ItemCode && String(item.ItemCode).toLowerCase().includes(lowerQuery)) ||
      (item.ProductName && String(item.ProductName).toLowerCase().includes(lowerQuery)) ||
      (item.CategoryName && String(item.CategoryName).toLowerCase().includes(lowerQuery)) ||
      (item.RFIDCode && String(item.RFIDCode).toLowerCase().includes(lowerQuery))
    );
  }, [sessionDetails?.UnmatchedList, unmatchedSearchQuery]);

  // Reset pagination when search query changes
  useEffect(() => {
    setMatchedPage(1);
  }, [matchedSearchQuery]);

  useEffect(() => {
    setUnmatchedPage(1);
  }, [unmatchedSearchQuery]);

  // Get user info and client code
  useEffect(() => {
    const getUserInfo = () => {
      try {
        console.log('Getting user info...');
        const stored = localStorage.getItem('userInfo');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUserInfo(parsed);
          console.log('User info from localStorage:', parsed);
          if (parsed.ClientCode) {
            const clientCode = parsed.ClientCode.trim();
            setClientCode(clientCode);
            console.log('ClientCode set from localStorage:', clientCode);
            return;
          }
        }

        // Fallback to token
        const token = localStorage.getItem('token');
        console.log('Token found:', !!token);
        if (token) {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const decoded = JSON.parse(window.atob(base64));
          console.log('Decoded token:', decoded);
          if (decoded.ClientCode) {
            const clientCode = decoded.ClientCode.trim();
            setClientCode(clientCode);
            console.log('ClientCode set from token:', clientCode);
          } else {
            console.log('No ClientCode in token');
            setError('Client code not found in token. Please login again.');
          }
        } else {
          console.log('No token found');
          setError('No authentication found. Please login again.');
        }
      } catch (err) {
        console.error('Error getting client code:', err);
        setError('Error loading user information');
      }
    };

    getUserInfo();
  }, []);

  // Fetch sessions data
  const fetchSessions = async (pageOverride, pageSizeOverride) => {
    if (!clientCode) {
      console.log('No clientCode available, skipping fetch');
      setError('Client code not found. Please login again.');
      setLoading(false);
      return;
    }
    
    try {
    setLoading(true);
      setError(null);

      console.log('Fetching sessions for clientCode:', clientCode);

      // Build payload with date filters if provided
      const payload = {
        clientCode,
        pageNumber: pageOverride || currentPage,
        pageSize: pageSizeOverride || itemsPerPage,
        returnAllData: false
      };

      // Add date filters if provided
      if (dateFrom) {
        payload.dateFrom = dateFrom;
      }
      if (dateTo) {
        payload.dateTo = dateTo;
      }

      console.log('Fetching sessions with payload:', payload);

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllStockVerificationBySession',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          timeout: 30000 // 30 second timeout
        }
      );

      console.log('Sessions API Response:', response.data);

      // Handle different response structures
      let sessionsData = [];
      let totalCount = 0;

      if (response.data) {
        const responseSessions = response.data.Sessions || response.data.sessions;
        if (Array.isArray(responseSessions)) {
          sessionsData = responseSessions.map((session) => ({
            ...session,
            SessionNumber: session.SessionNumber ?? session.sessionNumber,
            SessionId: session.SessionId ?? session.sessionId,
            ScanBatchId: session.ScanBatchId ?? session.scanBatchId,
            BatchName: session.BatchName ?? session.batchName,
            BranchId: session.BranchId ?? session.branchId,
            BranchName: session.BranchName ?? session.branchName,
            StartedOn: session.StartedOn ?? session.startedOn,
            EndedOn: session.EndedOn ?? session.endedOn,
            TotalQty: session.TotalQty ?? session.totalQty,
            MatchQty: session.MatchQty ?? session.matchQty,
            UnmatchQty: session.UnmatchQty ?? session.unmatchQty
          }));
          totalCount =
            response.data.TotalSessions ||
            response.data.totalSessions ||
            response.data.Paging?.TotalRecords ||
            response.data.paging?.totalRecords ||
            sessionsData.length;
        }
        // Check if response.data is directly an array
        else if (Array.isArray(response.data)) {
          sessionsData = response.data;
          totalCount = response.data.length;
        }
        // Check for nested data structure
        else if (response.data.data && Array.isArray(response.data.data)) {
          sessionsData = response.data.data;
          totalCount = response.data.totalRecords || response.data.data.length;
        }
      }

      setSessions(sessionsData);
      setTotalSessions(totalCount);
      
      if (sessionsData.length > 0) {
        addNotification({
          title: 'Sessions Loaded',
          description: `Found ${sessionsData.length} verification sessions`,
          type: 'success'
        });
      } else {
        console.log('No sessions found in response');
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error config:', err.config);
      
      let errorMessage = 'Failed to fetch verification sessions';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your internet connection and try again.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to view sessions.';
      } else if (err.response?.status === 404) {
        errorMessage = 'API endpoint not found. Please contact support.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.response?.data?.Message) {
        errorMessage = err.response.data.Message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load sessions on component mount and when clientCode changes
  useEffect(() => {
    if (clientCode) {
      fetchSessions(1, itemsPerPage);
    }
    
    // Handle window resize for responsive design
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clientCode]);

  // Reload sessions when date filters change
  useEffect(() => {
    if (clientCode) {
      // Skip on initial mount to avoid duplicate API call
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      
      // Debounce to prevent too many API calls
      const timeoutId = setTimeout(() => {
        fetchSessions(1, itemsPerPage);
      }, 300); // Small delay to debounce rapid date changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [dateFrom, dateTo, clientCode]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSessions(currentPage, itemsPerPage);
  };

  // Handle filter reset
  const handleResetDateFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedBranch('');
    setShowFilterPanel(false);
  };

  // Handle apply date filters
  const handleApplyDateFilters = () => {
    setShowFilterPanel(false);
    // The useEffect will trigger fetchSessions when dateFrom/dateTo change
  };

  // Get unique branches from sessions
  const uniqueBranches = useMemo(() => {
    const branches = sessions
      .map(session => session.BranchName)
      .filter(branch => branch && branch.trim() !== '')
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return branches;
  }, [sessions]);

  // Search and filter logic
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = (
        session.ScanBatchId?.toLowerCase().includes(searchLower) ||
        session.SessionNumber?.toString().includes(searchLower) ||
        session.BranchName?.toLowerCase().includes(searchLower) ||
        new Date(session.StartedOn).toLocaleDateString().includes(searchLower) ||
        new Date(session.EndedOn).toLocaleDateString().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Branch filter
    if (selectedBranch) {
      if (session.BranchName !== selectedBranch) return false;
    }

    // Date filter (client-side filtering as backup, but API should handle it)
    if (dateFrom || dateTo) {
      const sessionDate = new Date(session.StartedOn);
      sessionDate.setHours(0, 0, 0, 0);
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (sessionDate < fromDate) return false;
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (sessionDate > toDate) return false;
      }
    }

    return true;
  });
  }, [sessions, searchQuery, dateFrom, dateTo, selectedBranch]);

  // Sorting logic
  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    // Handle null/undefined values
    if (aValue == null) aValue = '';
    if (bValue == null) bValue = '';
    
    // Convert to string for comparison if not date
    if (sortConfig.key !== 'StartedOn' && sortConfig.key !== 'EndedOn') {
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
    }
    
    // Handle dates
    if (sortConfig.key === 'StartedOn' || sortConfig.key === 'EndedOn') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
  }, [filteredSessions, sortConfig]);

  // Pagination logic
  const hasLocalFilters = Boolean(searchQuery || selectedBranch);
  const totalRecords = hasLocalFilters ? sortedSessions.length : totalSessions;
  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));
  const currentSessions = useMemo(() => {
    if (!hasLocalFilters) return sortedSessions;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedSessions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedSessions, currentPage, itemsPerPage, hasLocalFilters]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (!clientCode || hasLocalFilters) return;
    fetchSessions(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, clientCode, hasLocalFilters]);

  // Handle page input
  const handlePageInputChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setPageInput(value);
    }
  };

  const handlePageInputSubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      const pageNum = parseInt(pageInput);
      if (pageNum >= 1 && pageNum <= totalPages) {
        setCurrentPage(pageNum);
        setPageInput('');
      } else {
        toast.error(`Please enter a page number between 1 and ${totalPages}`);
        setPageInput('');
      }
    }
  };

  // Handle sorting
  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  // Fetch Consolidation Report
  const fetchConsolidationReport = async (payload = null) => {
    if (!clientCode) return;

    try {
      setConsolidationLoading(true);
      setConsolidationError(null);

      const requestPayload = payload || { 
        ClientCode: clientCode,
        ReportDate: selectedReportDate
      };

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/GetConsolidationStockVerificationReport',
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      console.log('Consolidation Report Response:', response.data);

      if (response.data && response.data.Branches) {
        setConsolidationData(response.data);
      } else {
        setConsolidationData(null);
      }

    } catch (err) {
      console.error('Error fetching consolidation report:', err);
      setConsolidationError('Failed to load consolidation report');
      toast.error('Failed to load consolidation report');
    } finally {
      setConsolidationLoading(false);
    }
  };

  // Fetch consolidation data when tab changes
  useEffect(() => {
    if (activeTab === 'combineReport' && clientCode) {
      fetchConsolidationReport();
    }
  }, [activeTab, clientCode]);

  // Fetch session details
  const fetchSessionDetails = async (scanBatchId) => {
    try {
      setDetailsLoading(true);
      
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllStockVerificationBySession',
        {
          clientCode,
          scanBatchId,
          pageNumber: 1,
          pageSize: 1000,
          returnAllData: false,
          status: null,
          counterName: null,
          categoryName: null,
          productName: null,
          designName: null,
          purityName: null,
          companyName: null,
          branchName: null,
          fromDate: null,
          toDate: null
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Session Details Response:', response.data);
      const normalizedDetails = {
        ...response.data,
        ScanBatchId: response.data.ScanBatchId ?? response.data.scanBatchId,
        SessionId: response.data.SessionId ?? response.data.sessionId,
        SessionNumber: response.data.SessionNumber ?? response.data.sessionNumber,
        BatchName: response.data.BatchName ?? response.data.batchName,
        BranchId: response.data.BranchId ?? response.data.branchId,
        BranchName: response.data.BranchName ?? response.data.branchName,
        TotalSessions: response.data.TotalSessions ?? response.data.totalSessions,
        MatchedList: response.data.MatchedList ?? response.data.matchedList ?? [],
        UnmatchedList: response.data.UnmatchedList ?? response.data.unmatchedList ?? [],
        Totals: response.data.Totals ?? response.data.totals ?? {}
      };
      setSessionDetails(normalizedDetails);
      
    } catch (err) {
      console.error('Error fetching session details:', err);
      toast.error('Failed to load session details');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Handle view session details - navigate to separate page
  const handleViewSession = (session) => {
    console.log('View session:', session);
    navigate(`/session-details/${encodeURIComponent(session.ScanBatchId)}`);
  };

  // Pagination helper functions
  const getPaginatedData = (data, page, itemsPerPage) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data, itemsPerPage) => {
    return Math.ceil(data.length / itemsPerPage);
  };

  // Render sort icon
  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <FaSort className="ms-1 text-muted" style={{ fontSize: '12px' }} />;
    }
    return sortConfig.direction === 'asc' 
      ? <FaSortUp className="ms-1 text-primary" style={{ fontSize: '12px' }} />
      : <FaSortDown className="ms-1 text-primary" style={{ fontSize: '12px' }} />;
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const isSmallScreen = windowWidth <= 768;
  const consolidationBranchCount = (consolidationData?.Branches || []).length;
  const consolidationBranchTotalPages = Math.max(
    1,
    Math.ceil(consolidationBranchCount / consolidationItemsPerPage)
  );
  const paginatedConsolidationBranches = useMemo(() => {
    const list = consolidationData?.Branches || [];
    const start = (consolidationTreePage - 1) * consolidationItemsPerPage;
    return list.slice(start, start + consolidationItemsPerPage);
  }, [consolidationData?.Branches, consolidationTreePage, consolidationItemsPerPage]);

  useEffect(() => {
    setConsolidationTreePage(1);
  }, [consolidationItemsPerPage, selectedReportDate, activeTab]);

  useEffect(() => {
    if (consolidationTreePage > consolidationBranchTotalPages) {
      setConsolidationTreePage(consolidationBranchTotalPages);
    }
  }, [consolidationTreePage, consolidationBranchTotalPages]);

  const svLabelStyle = {
    fontSize: 11,
    color: '#737373',
    fontWeight: 700,
    display: 'block',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };
  const svInputBase = {
    width: '100%',
    padding: '0 8px',
    fontSize: 11,
    border: '1px solid #e5e5e5',
    borderRadius: 8,
    height: 30,
    boxSizing: 'border-box',
    color: '#404040',
    background: '#fff',
  };
  const svTh = {
    padding: isSmallScreen ? '6px 6px' : '7px 8px',
    textAlign: 'left',
    fontWeight: 700,
    fontSize: isSmallScreen ? 10 : 11,
    color: '#18181b',
    borderRight: '1px solid #e4e4e7',
    borderBottom: '2px solid #d4d4d8',
    whiteSpace: 'nowrap',
    background: SV.headerBg,
  };
  const svTd = {
    padding: isSmallScreen ? '5px 6px' : '6px 8px',
    color: '#404040',
    fontSize: isSmallScreen ? 10 : 11,
    lineHeight: 1.35,
    borderRight: '1px solid #ececec',
    borderBottom: '1px solid #e5e5e5',
  };
  const svPageBtn = (disabled) => ({
    padding: '5px 11px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 8,
    border: '1px solid #d4d4d8',
    background: disabled ? '#f4f4f5' : '#fff',
    color: disabled ? '#a3a3a3' : '#262626',
    cursor: disabled ? 'not-allowed' : 'pointer',
  });
  const svActionBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '4px 10px',
    border: `1px solid ${SV.accentMuted}`,
    borderRadius: 6,
    background: '#fff',
    color: SV.accentDark,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 700,
  };

  // Export session details to Excel
  const exportSessionDetails = () => {
    if (!sessionDetails) {
      toast.error('No session data available for export');
      return;
    }

    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Session Summary Sheet
      const summaryData = [
        ['Session Details Export'],
        ['Generated on:', new Date().toLocaleString('en-IN')],
        [''],
        ['Session Information'],
        ['Batch ID:', sessionDetails.ScanBatchId || 'N/A'],
        ['Client Code:', sessionDetails.ClientCode || 'N/A'],
        ['Session Number:', sessionDetails.SessionNumber || 'N/A'],
        ['Total Sessions:', sessionDetails.TotalSessions || 'N/A'],
        [''],
        ['Summary Statistics'],
        ['Total Items:', sessionDetails.Totals?.TotalQty || 0],
        ['Matched Items:', sessionDetails.Totals?.TotalMatchQty || 0],
        ['Unmatched Items:', sessionDetails.Totals?.TotalUnmatchQty || 0],
        ['Total Gross Weight:', `${sessionDetails.Totals?.TotalGrossWeight || 0}g`],
        ['Total Net Weight:', `${sessionDetails.Totals?.TotalNetWeight || 0}g`],
        ['Match Weight:', `${sessionDetails.Totals?.TotalMatchGrossWeight || 0}g`],
        [''],
        ['Export Details'],
        ['Matched Items Count:', sessionDetails.MatchedList?.length || 0],
        ['Unmatched Items Count:', sessionDetails.UnmatchedList?.length || 0]
      ];

      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Set column widths for summary sheet
      summaryWS['!cols'] = [
        { width: 25 },
        { width: 30 }
      ];

      XLSX.utils.book_append_sheet(wb, summaryWS, 'Session Summary');

      // Matched Items Sheet
      if (sessionDetails.MatchedList && sessionDetails.MatchedList.length > 0) {
        const matchedHeaders = [
          'Item Code',
          'Product Name',
          'Category',
          'RFIDCode',
          'Gross Weight (g)',
          'Pieces',
          'Net Weight (g)',
          'Status'
        ];

        const matchedData = sessionDetails.MatchedList.map(item => [
          item.ItemCode || 'N/A',
          item.ProductName || 'N/A',
          item.CategoryName || 'N/A',
          item.RFIDCode || 'RFID Tag not Attached',
          item.GrossWeight || 0,
          item.Quantity || 0,
          item.NetWeight || 0,
          'MATCHED'
        ]);

        const matchedWS = XLSX.utils.aoa_to_sheet([matchedHeaders, ...matchedData]);
        
        // Set column widths for matched items
        matchedWS['!cols'] = [
          { width: 15 },
          { width: 25 },
          { width: 15 },
          { width: 20 },
          { width: 15 },
          { width: 10 },
          { width: 15 },
          { width: 12 }
        ];

        XLSX.utils.book_append_sheet(wb, matchedWS, 'Matched Items');
      }

      // Unmatched Items Sheet
      if (sessionDetails.UnmatchedList && sessionDetails.UnmatchedList.length > 0) {
        const unmatchedHeaders = [
          'Item Code',
          'Product Name',
          'Category',
          'RFIDCode',
          'Gross Weight (g)',
          'Pieces',
          'Net Weight (g)',
          'Status'
        ];

        const unmatchedData = sessionDetails.UnmatchedList.map(item => [
          item.ItemCode || 'N/A',
          item.ProductName || 'N/A',
          item.CategoryName || 'N/A',
          item.RFIDCode || 'RFID Tag not Attached',
          item.GrossWeight || 0,
          item.Quantity || 0,
          item.NetWeight || 0,
          'UNMATCHED'
        ]);

        const unmatchedWS = XLSX.utils.aoa_to_sheet([unmatchedHeaders, ...unmatchedData]);
        
        // Set column widths for unmatched items
        unmatchedWS['!cols'] = [
          { width: 15 },
          { width: 25 },
          { width: 15 },
          { width: 20 },
          { width: 15 },
          { width: 10 },
          { width: 15 },
          { width: 12 }
        ];

        XLSX.utils.book_append_sheet(wb, unmatchedWS, 'Unmatched Items');
      }

      // Combined Items Sheet (All Items)
      const allItemsHeaders = [
        'Item Code',
        'Product Name',
        'Category',
        'RFIDCode',
        'Gross Weight (g)',
        'Pieces',
        'Net Weight (g)',
        'Status',
        'Match Type'
      ];

      const allItemsData = [];
      
      // Add matched items
      if (sessionDetails.MatchedList && sessionDetails.MatchedList.length > 0) {
        sessionDetails.MatchedList.forEach(item => {
          allItemsData.push([
            item.ItemCode || 'N/A',
            item.ProductName || 'N/A',
            item.CategoryName || 'N/A',
            item.RFIDCode || 'RFID Tag not Attached',
            item.GrossWeight || 0,
            item.Quantity || 0,
            item.NetWeight || 0,
            'MATCHED',
            'Matched'
          ]);
        });
      }

      // Add unmatched items
      if (sessionDetails.UnmatchedList && sessionDetails.UnmatchedList.length > 0) {
        sessionDetails.UnmatchedList.forEach(item => {
          allItemsData.push([
            item.ItemCode || 'N/A',
            item.ProductName || 'N/A',
            item.CategoryName || 'N/A',
            item.RFIDCode || 'RFID Tag not Attached',
            item.GrossWeight || 0,
            item.Quantity || 0,
            item.NetWeight || 0,
            'UNMATCHED',
            'Unmatched'
          ]);
        });
      }

      if (allItemsData.length > 0) {
        const allItemsWS = XLSX.utils.aoa_to_sheet([allItemsHeaders, ...allItemsData]);
        
        // Set column widths for all items
        allItemsWS['!cols'] = [
          { width: 15 },
          { width: 25 },
          { width: 15 },
          { width: 20 },
          { width: 15 },
          { width: 10 },
          { width: 15 },
          { width: 12 },
          { width: 12 }
        ];

        XLSX.utils.book_append_sheet(wb, allItemsWS, 'All Items');
      }

      // Generate filename with timestamp and session info
      const timestamp = new Date().toISOString().split('T')[0];
      const sessionNum = sessionDetails.SessionNumber || 'Unknown';
      const clientCode = sessionDetails.ClientCode || 'Unknown';
      const filename = `StockVerification_Session_${sessionNum}_${clientCode}_${timestamp}.xlsx`;

      // Save the file
      XLSX.writeFile(wb, filename);

      // Show success notification
      toast.success(`Session details exported successfully as ${filename}`);
      addNotification({
        title: 'Export Successful',
        description: `Session details exported to ${filename}`,
        type: 'success'
      });

    } catch (error) {
      console.error('Error exporting session details:', error);
      toast.error('Failed to export session details. Please try again.');
      addNotification({
        title: 'Export Failed',
        description: 'Failed to export session details. Please try again.',
        type: 'error'
      });
    }
  };


  // Export Consolidation Report
  const exportConsolidationReport = (selectedBranchId = '') => {
    if (!consolidationData || !consolidationData.Branches || consolidationData.Branches.length === 0) {
      toast.error('No data available for export');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      const branchesToExport = selectedBranchId
        ? (consolidationData.Branches || []).filter((branch) => String(branch.BranchId) === String(selectedBranchId))
        : (consolidationData.Branches || []);
      if (!branchesToExport.length) {
        toast.error('Selected branch not found for export.');
        return;
      }
      const selectedBranch = selectedBranchId ? branchesToExport[0] : null;
      
      // Summary Sheet
      const reportDateStr = consolidationData.ReportDate
        ? new Date(consolidationData.ReportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '-';
      const baseTotals = resolveConsolidationTotals(consolidationData.Totals);
      const selectedBranchTotals = selectedBranch
        ? {
            totalInventoryGrossWeight: Number(pick(selectedBranch, ['TotalInventoryGrossWeight', 'TotalInventoryWeight'], 0)) || 0,
            totalInventoryNetWeight: Number(pick(selectedBranch, ['TotalInventoryNetWeight', 'TotalInventoryweight', 'TotalInventoryWeight'], 0)) || 0,
            totalMatchGrossWeight: Number(pick(selectedBranch, ['MatchGrossWeight', 'MatchWeight'], 0)) || 0,
            totalMatchNetWeight: Number(pick(selectedBranch, ['MatchNetWeight', 'Matchweight', 'MatchWeight'], 0)) || 0,
            totalUnmatchGrossWeight: Number(pick(selectedBranch, ['UnmatchGrossWeight', 'UnMatchGrossWeight', 'UnmatchWeight'], 0)) || 0,
            totalUnmatchNetWeight: Number(pick(selectedBranch, ['UnmatchNetWeight', 'Unmatchweight', 'UnMatchNetWeight', 'UnmatchWeight'], 0)) || 0,
          }
        : null;
      const {
        totalInventoryGrossWeight,
        totalInventoryNetWeight,
        totalMatchGrossWeight,
        totalMatchNetWeight,
        totalUnmatchGrossWeight,
        totalUnmatchNetWeight,
      } = selectedBranchTotals || baseTotals;

      const summaryData = [
        ['Consolidation Stock Verification Report'],
        selectedBranch ? ['Branch:', selectedBranch.BranchName || '-'] : [],
        ['Report Date:', reportDateStr],
        ['Generated on:', new Date().toLocaleString('en-IN')],
        consolidationData.Message ? ['Message:', consolidationData.Message] : [],
        [''],
        ['Summary'],
        ['Total Scanned Items:', selectedBranch ? (selectedBranch.TotalScannedItems ?? selectedBranch.ScannedCount ?? 0) : (consolidationData.Totals?.TotalScannedItems ?? 0)],
        ['Matched Qty:', selectedBranch ? (selectedBranch.MatchedQty ?? 0) : (consolidationData.Totals?.MatchedQty ?? 0)],
        ['Unmatch Qty:', selectedBranch ? (selectedBranch.UnmatchQty ?? 0) : (consolidationData.Totals?.UnmatchQty ?? 0)],
        ['Total Inventory Gross Weight:', `${totalInventoryGrossWeight}g`],
        ['Total Inventory Net Weight:', `${totalInventoryNetWeight}g`],
        ['Total Match Gross Weight:', `${totalMatchGrossWeight}g`],
        ['Total Match Net Weight:', `${totalMatchNetWeight}g`],
        ['Total Unmatch Gross Weight:', `${totalUnmatchGrossWeight}g`],
        ['Total Unmatch Net Weight:', `${totalUnmatchNetWeight}g`],
        [''],
        ['Detailed Report']
      ].filter(row => row.length > 0);

      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWS['!cols'] = [{ width: 25 }, { width: 30 }];
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');


      // Detailed Report Sheet - Category -> Product -> Design -> Item level rows
      const headers = [
        'Branch',
        'Category',
        'Product',
        'Design',
        'Item Code',
        'RFID Code',
        'Status',
        'Gross Weight',
        'Net Weight',
        'Matched Qty',
        'Unmatch Qty'
      ];

      const data = [];
      branchesToExport.forEach(branch => {
        (branch.Categories || []).forEach(category => {
          (category.Products || []).forEach(product => {
            (product.Designs || []).forEach(design => {
              const items = design.Items || [];
              if (items.length === 0) {
                data.push([
                  branch.BranchName || '',
                  category.CategoryName || '',
                  product.ProductName || '',
                  design.DesignName || '',
                  '',
                  '',
                  '',
                  Number(design.GrossWeight ?? 0).toFixed(3),
                  Number(design.NetWeight ?? 0).toFixed(3),
                  design.MatchedQty ?? 0,
                  design.UnmatchQty ?? 0
                ]);
                return;
              }
              items.forEach((item) => {
                const normalizedStatus = String(item.Status || '').toLowerCase();
                data.push([
                  branch.BranchName || '',
                  category.CategoryName || '',
                  product.ProductName || '',
                  design.DesignName || '',
                  item.ItemCode || '',
                  item.RFIDCode || '',
                  item.Status || '',
                  Number(item.GrossWeight ?? item.GrossWt ?? 0).toFixed(3),
                  Number(item.NetWeight ?? item.NetWt ?? 0).toFixed(3),
                  normalizedStatus === 'matched' ? 1 : 0,
                  normalizedStatus === 'unmatched' ? 1 : 0
                ]);
              });
            });
          });
        });
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws['!cols'] = [
        { width: 22 },
        { width: 20 },
        { width: 25 },
        { width: 22 },
        { width: 16 },
        { width: 16 },
        { width: 14 },
        { width: 14 },
        { width: 12 },
        { width: 12 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Detailed Report');

      const timestamp = new Date().toISOString().split('T')[0];
      const fileSuffix = selectedBranch ? `_${(selectedBranch.BranchName || 'Branch').replace(/\s+/g, '_')}` : '';
      XLSX.writeFile(wb, `Consolidation_Stock_Report${fileSuffix}_${timestamp}.xlsx`);
      
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  // Collect items from a node for total / matched / unmatched (for modal)
  const collectItemsFromNode = (node, type, level) => {
    const items = [];
    const isMatched = (item) => (item.Status || '').toString().toLowerCase() === 'matched';
    const isUnmatched = (item) => (item.Status || '').toString().toLowerCase() === 'unmatched';
    const add = (list) => {
      if (!Array.isArray(list)) return;
      list.forEach((item) => {
        if (type === 'total') items.push(item);
        else if (type === 'matched' && isMatched(item)) items.push(item);
        else if (type === 'unmatched' && isUnmatched(item)) items.push(item);
      });
    };
    if (level === 'design' && node.Items) add(node.Items);
    else if (level === 'product' && node.Designs) node.Designs.forEach(d => add(d.Items));
    else if (level === 'category' && node.Products) node.Products.forEach(p => (p.Designs || []).forEach(d => add(d.Items)));
    else if (level === 'branch' && node.Categories) node.Categories.forEach(c => (c.Products || []).forEach(p => (p.Designs || []).forEach(d => add(d.Items))));
    return items;
  };

  const ITEMS_PAGE_SIZE = 50;

  // Items detail modal: paginated list for large data (10k+)
  const ItemsDetailModal = ({ open, onClose, title, items = [], type = 'total' }) => {
    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState('');
    const filteredItems = useMemo(() => {
      const q = searchText.trim().toLowerCase();
      if (!q) return items || [];
      return (items || []).filter((item) =>
        String(item?.ItemCode ?? '').toLowerCase().includes(q) ||
        String(item?.RFIDCode ?? '').toLowerCase().includes(q) ||
        String(item?.CategoryName ?? '').toLowerCase().includes(q) ||
        String(item?.ProductName ?? '').toLowerCase().includes(q) ||
        String(item?.DesignName ?? '').toLowerCase().includes(q) ||
        String(item?.Status ?? '').toLowerCase().includes(q)
      );
    }, [items, searchText]);
    const totalPages = Math.max(1, Math.ceil((filteredItems.length || 0) / ITEMS_PAGE_SIZE));
    const start = (page - 1) * ITEMS_PAGE_SIZE;
    const pageItems = filteredItems.slice(start, start + ITEMS_PAGE_SIZE);

    const exportModalItems = () => {
      try {
        const headers = ['Item Code', 'RFID Code', 'Category', 'Product', 'Design', 'Status', 'Gross Weight', 'Net Weight'];
        const rows = filteredItems.map((item) => ([
          item?.ItemCode ?? '',
          item?.RFIDCode ?? '',
          item?.CategoryName ?? '',
          item?.ProductName ?? '',
          item?.DesignName ?? '',
          item?.Status ?? '',
          Number(item?.GrossWeight ?? item?.GrossWt ?? 0).toFixed(3),
          Number(item?.NetWeight ?? item?.NetWt ?? 0).toFixed(3)
        ]));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = [
          { width: 18 }, { width: 18 }, { width: 22 }, { width: 22 },
          { width: 22 }, { width: 14 }, { width: 14 }, { width: 14 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Items');
        const cleanTitle = (title || 'Items').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
        const dateTag = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `${cleanTitle}_${type}_${dateTag}.xlsx`);
        toast.success('Items exported successfully');
      } catch (error) {
        console.error('Error exporting items modal data:', error);
        toast.error('Failed to export items');
      }
    };

    useEffect(() => {
      if (open) {
        setPage(1);
        setSearchText('');
      }
    }, [open]);
    useEffect(() => { setPage(1); }, [searchText]);

    if (!open) return null;
    const mTh = (extra = {}) => ({ ...svTh, ...extra });
    const mTd = (extra = {}) => ({ ...svTd, ...extra });
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
        <div style={{ background: '#fff', borderRadius: 12, maxWidth: '95vw', width: '920px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.18)', border: '1px solid #e4e4e7', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
          <div style={{ height: 3, background: SV.stripe }} />
          <div style={{ padding: '12px 16px', background: `linear-gradient(135deg, ${SV.accentDark} 0%, ${SV.accent} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: isSmallScreen ? 13 : 14, fontWeight: 800, color: '#fff' }}>{title}</h3>
            <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }} aria-label="Close"><FaTimes size={14} /></button>
          </div>
          <div style={{ padding: '12px 14px', overflow: 'auto', flex: 1, minHeight: 0, background: SV.tableBg }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e5e5e5', borderRadius: 8, padding: '6px 10px', minWidth: 260, flex: '1 1 220px', background: '#fff' }}>
                <FaSearch style={{ color: '#94a3b8', fontSize: 11 }} />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search item, RFID, category…"
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: 11, color: '#404040', background: 'transparent' }}
                />
              </div>
              <button
                type="button"
                onClick={exportModalItems}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${SV.accentMuted}`, background: '#ecfdf5', color: SV.accentDark, borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                <FaFileExcel />
                Export
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#525252', marginBottom: 8, fontWeight: 600 }}>
              {filteredItems.length.toLocaleString()} of {(items.length || 0).toLocaleString()} item(s)
            </div>
            <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #d4d4d8', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: isSmallScreen ? 10 : 11, minWidth: 720 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: SV.headerBg, boxShadow: '0 1px 0 #e4e4e7' }}>
                    <th style={mTh()}>Item Code</th>
                    <th style={mTh()}>RFID Code</th>
                    <th style={mTh()}>Category</th>
                    <th style={mTh()}>Product</th>
                    <th style={mTh()}>Design</th>
                    <th style={mTh({ textAlign: 'right' })}>Gross Wt</th>
                    <th style={mTh({ textAlign: 'right' })}>Net Wt</th>
                    <th style={mTh({ textAlign: 'center', borderRight: 'none' })}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr><td colSpan={8} style={{ ...mTd(), padding: 22, textAlign: 'center', color: '#737373', borderRight: 'none' }}>No items</td></tr>
                  ) : pageItems.map((item, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : SV.tableBg }}>
                      <td style={mTd({ fontWeight: 600, color: '#171717' })}>{item.ItemCode ?? '–'}</td>
                      <td style={mTd({ fontFamily: 'ui-monospace, monospace' })}>{item.RFIDCode ?? '–'}</td>
                      <td style={mTd()}>{item.CategoryName ?? '–'}</td>
                      <td style={mTd()}>{item.ProductName ?? '–'}</td>
                      <td style={mTd()}>{item.DesignName ?? '–'}</td>
                      <td style={mTd({ textAlign: 'right', fontVariantNumeric: 'tabular-nums' })}>{Number(item.GrossWeight ?? item.GrossWt ?? 0).toFixed(2)}</td>
                      <td style={mTd({ textAlign: 'right', fontVariantNumeric: 'tabular-nums' })}>{Number(item.NetWeight ?? item.NetWt ?? 0).toFixed(2)}</td>
                      <td style={mTd({ textAlign: 'center', borderRight: 'none' })}>
                        <span style={{ padding: '1px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700, border: '1px solid', borderColor: (item.Status || '').toString().toLowerCase() === 'matched' ? '#86efac' : '#fdba74', background: (item.Status || '').toString().toLowerCase() === 'matched' ? '#f0fdf4' : '#fff7ed', color: (item.Status || '').toString().toLowerCase() === 'matched' ? '#166534' : '#c2410c' }}>{item.Status ?? '–'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={svPageBtn(page <= 1)}>Prev</button>
                <span style={{ fontSize: 11, color: '#404040', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>Page {page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={svPageBtn(page >= totalPages)}>Next</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // View Components for Page-Based Navigation — Tree: Branch → Category → Product → Design; cols: Total Inventory, Matched, Unmatched only
  const ConsolidatedTreeView = ({ branches }) => {
    const [expandedBranches, setExpandedBranches] = useState({});
    const [expandedCategories, setExpandedCategories] = useState({});
    const [expandedProducts, setExpandedProducts] = useState({});
    const [itemsModal, setItemsModal] = useState({ open: false, title: '', items: [], type: 'total' });

    const pick = (obj, keys, fallback = 0) => {
      if (!obj) return fallback;
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
      }
      return fallback;
    };

    const getMatchGrossWeight = (obj) => pick(obj, ['MatchGrossWeight', 'matchGrossWeight', 'MatchWeight'], 0);
    const getMatchNetWeight = (obj) => pick(obj, ['MatchNetWeight', 'matchNetWeight', 'Matchweight', 'MatchWeight'], 0);
    const getUnmatchGrossWeight = (obj) => pick(obj, ['UnmatchGrossWeight', 'unmatchGrossWeight', 'UnMatchGrossWeight', 'UnmatchWeight'], 0);
    const getUnmatchNetWeight = (obj) => pick(obj, ['UnmatchNetWeight', 'unmatchNetWeight', 'Unmatchweight', 'UnMatchNetWeight', 'UnmatchWeight'], 0);

    const toggle = (setter, key) => setter(prev => ({ ...prev, [key]: !prev[key] }));

    const StatPill = ({ value, color, grossWeight, netWeight, weightColor = '#334155', onClick }) => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
          className="consolidation-tree-pill"
          style={{
            padding: '4px 10px',
            borderRadius: '7px',
            background: `linear-gradient(135deg, ${color}1f 0%, ${color}12 100%)`,
            color,
            fontWeight: 800,
            fontSize: '11px',
            minWidth: '34px',
            textAlign: 'center',
            border: `1px solid ${color}45`,
            cursor: onClick ? 'pointer' : 'default',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (onClick) { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = `0 4px 12px ${color}30`; }
          }}
          onMouseLeave={(e) => {
            if (onClick) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }
          }}
        >
          {value?.toLocaleString() ?? 0}
        </div>
        {(grossWeight !== undefined || netWeight !== undefined) && (
          <>
            <div style={{ fontSize: '9px', color: weightColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
              G: {grossWeight ? `${Number(grossWeight).toFixed(2)}g` : '0g'} · N: {netWeight ? `${Number(netWeight).toFixed(2)}g` : '0g'}
            </div>
          </>
        )}
      </div>
    );

    const openItemsModal = (title, node, level, type) => {
      const items = collectItemsFromNode(node, type, level);
      setItemsModal({ open: true, title, items, type });
    };

    const rowBase = { transition: 'background 0.12s ease' };
    const renderRow = (content, isExpanded, onToggle, hasChildren, rowKey) => (
      <tr
        key={rowKey}
        className="consolidation-tree-row"
        style={{
          ...rowBase,
          background: '#ffffff',
          cursor: hasChildren ? 'pointer' : 'default',
          borderBottom: '1px solid #e5e5e5'
        }}
        onClick={hasChildren ? () => onToggle() : undefined}
        onMouseEnter={(e) => { if (hasChildren) e.currentTarget.style.background = '#fafafa'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
      >
        {content}
      </tr>
    );

    const safeBranches = branches || [];
    const paddedRows = Math.max(0, consolidationItemsPerPage - safeBranches.length);

    return (
      <>
        <div
          className="consolidation-tree-wrap"
          style={{
            overflowX: 'auto',
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #d4d4d8',
            boxShadow: 'none',
            overflow: 'hidden'
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 640, fontSize: isSmallScreen ? 10 : 11 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ background: SV.headerBg }}>
                <th style={{ ...svTh, width: '40%' }}>Name</th>
                <th style={{ ...svTh, textAlign: 'center', width: '20%' }}>Total Inv.</th>
                <th style={{ ...svTh, textAlign: 'center', width: '20%' }}>Matched</th>
                <th style={{ ...svTh, textAlign: 'center', width: '20%', borderRight: 'none' }}>Unmatched</th>
              </tr>
            </thead>
            <tbody>
              {safeBranches.map((branch) => {
                const branchExp = expandedBranches[branch.BranchId];
                return (
                  <React.Fragment key={branch.BranchId}>
                    {renderRow(
                      <>
                        <td style={{ ...svTd, padding: '7px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#737373',
                              background: 'transparent'
                            }}>
                              {branchExp ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                            </div>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: isSmallScreen ? 10 : 12, letterSpacing: '0.01em' }}>{branch.BranchName}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }} onClick={e => e.stopPropagation()}>
                          <StatPill value={branch.TotalInventoryItems} color="#0369a1" onClick={() => openItemsModal(`Total Inventory – ${branch.BranchName}`, branch, 'branch', 'total')} />
                        </td>
                        <td style={{ padding: '12px' }} onClick={e => e.stopPropagation()}>
                          <StatPill value={branch.MatchedQty} color="#047857" grossWeight={getMatchGrossWeight(branch)} netWeight={getMatchNetWeight(branch)} onClick={() => openItemsModal(`Matched – ${branch.BranchName}`, branch, 'branch', 'matched')} />
                        </td>
                        <td style={{ padding: '12px' }} onClick={e => e.stopPropagation()}>
                          <StatPill value={branch.UnmatchQty} color="#c2410c" grossWeight={getUnmatchGrossWeight(branch)} netWeight={getUnmatchNetWeight(branch)} onClick={() => openItemsModal(`Unmatched – ${branch.BranchName}`, branch, 'branch', 'unmatched')} />
                        </td>
                      </>,
                      branchExp, () => toggle(setExpandedBranches, branch.BranchId), true, `branch_${branch.BranchId}`
                    )}
                    {branchExp && (branch.Categories || []).map((category) => {
                      const catKey = `${branch.BranchId}_${category.CategoryId}`;
                      const catExp = expandedCategories[catKey];
                      return (
                        <React.Fragment key={catKey}>
                          {renderRow(
                            <>
                              <td style={{ ...svTd, padding: '7px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 24 }}>
                                  <div style={{
                                    width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#737373',
                                    background: 'transparent'
                                  }}>
                                    {catExp ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                                  </div>
                                  <span style={{ fontWeight: 700, color: '#1f2937', fontSize: isSmallScreen ? 10 : 11 }}>{category.CategoryName}</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                <StatPill value={category.TotalInventoryItems} color="#0284c7" onClick={() => openItemsModal(`Total Inventory – ${category.CategoryName}`, category, 'category', 'total')} />
                              </td>
                              <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                <StatPill value={category.MatchedQty} color="#059669" grossWeight={getMatchGrossWeight(category)} netWeight={getMatchNetWeight(category)} onClick={() => openItemsModal(`Matched – ${category.CategoryName}`, category, 'category', 'matched')} />
                              </td>
                              <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                <StatPill value={category.UnmatchQty} color="#ea580c" grossWeight={getUnmatchGrossWeight(category)} netWeight={getUnmatchNetWeight(category)} onClick={() => openItemsModal(`Unmatched – ${category.CategoryName}`, category, 'category', 'unmatched')} />
                              </td>
                            </>,
                            catExp, () => toggle(setExpandedCategories, catKey), true, catKey
                          )}
                          {catExp && (category.Products || []).map((product) => {
                            const prodKey = `${catKey}_${product.ProductId}`;
                            const prodExp = expandedProducts[prodKey];
                            return (
                              <React.Fragment key={prodKey}>
                                {renderRow(
                                  <>
                                    <td style={{ ...svTd, padding: '7px 10px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 40 }}>
                                        <div style={{
                                          width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          color: '#737373',
                                          background: 'transparent'
                                        }}>
                                          {prodExp ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
                                        </div>
                                        <span style={{ fontWeight: 700, color: '#334155', fontSize: isSmallScreen ? 10 : 11 }}>{product.ProductName}</span>
                                      </div>
                                    </td>
                                    <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                      <StatPill value={product.TotalInventoryItems} color="#0284c7" onClick={() => openItemsModal(`Total Inventory – ${product.ProductName}`, product, 'product', 'total')} />
                                    </td>
                                    <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                      <StatPill value={product.MatchedQty} color="#059669" grossWeight={getMatchGrossWeight(product)} netWeight={getMatchNetWeight(product)} onClick={() => openItemsModal(`Matched – ${product.ProductName}`, product, 'product', 'matched')} />
                                    </td>
                                    <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                      <StatPill value={product.UnmatchQty} color="#ea580c" grossWeight={getUnmatchGrossWeight(product)} netWeight={getUnmatchNetWeight(product)} onClick={() => openItemsModal(`Unmatched – ${product.ProductName}`, product, 'product', 'unmatched')} />
                                    </td>
                                  </>,
                                  prodExp, () => toggle(setExpandedProducts, prodKey), (product.Designs || []).length > 0, prodKey
                                )}
                                {prodExp && (product.Designs || []).map((design) => {
                                  const designKey = `${prodKey}_${design.DesignId}`;
                                  return (
                                    <tr
                                      key={designKey}
                                      className="consolidation-tree-row"
                                      style={{ ...rowBase, background: '#fff', borderBottom: '1px solid #f1f5f9' }}
                                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                                    >
                                      <td style={{ ...svTd, padding: '7px 10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 56 }}>
                                          <span style={{ fontWeight: 700, color: '#374151', fontSize: isSmallScreen ? 10 : 11 }}>{design.DesignName}</span>
                                        </div>
                                      </td>
                                      <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                        <StatPill value={design.TotalInventoryItems} color="#0284c7" onClick={() => openItemsModal(`Total Inventory – ${design.DesignName}`, design, 'design', 'total')} />
                                      </td>
                                      <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                        <StatPill value={design.MatchedQty} color="#059669" grossWeight={getMatchGrossWeight(design)} netWeight={getMatchNetWeight(design)} onClick={() => openItemsModal(`Matched – ${design.DesignName}`, design, 'design', 'matched')} />
                                      </td>
                                      <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                        <StatPill value={design.UnmatchQty} color="#ea580c" grossWeight={getUnmatchGrossWeight(design)} netWeight={getUnmatchNetWeight(design)} onClick={() => openItemsModal(`Unmatched – ${design.DesignName}`, design, 'design', 'unmatched')} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {Array.from({ length: paddedRows }).map((_, idx) => (
                <tr key={`consolidation-pad-${idx}`} style={{ background: SV.tableBg }}>
                  <td colSpan={4} style={{ ...svTd, borderRight: 'none', height: 36 }} aria-hidden />
                </tr>
              ))}
            </tbody>
          </table>
          {(!safeBranches || safeBranches.length === 0) && (
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaLayerGroup style={{ fontSize: '24px', color: '#94a3b8' }} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>No data yet</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>No consolidation data available for this date</div>
            </div>
          )}
        </div>
        <ItemsDetailModal
          open={itemsModal.open}
          onClose={() => setItemsModal(prev => ({ ...prev, open: false }))}
          title={itemsModal.title}
          items={itemsModal.items}
          type={itemsModal.type}
        />
      </>
    );
  };



  // Error state
  if (error) {
    return (
      <div className="container-fluid p-4">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <FaExclamationTriangle className="text-danger mb-3" style={{ fontSize: '48px' }} />
                <h5 className="text-danger mb-3">{t('stockVerification.errorLoadingSessions')}</h5>
                <p className="text-muted mb-4">{error}</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setError(null);
                    fetchSessions();
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: 'var(--font-family)',
        padding: 12,
        fontSize: 11,
        minHeight: '100%',
        background: '#ffffff',
      }}
      className="stock-verification-page"
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 12,
          boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ height: 3, background: SV.stripe }} />
        <div style={{ padding: '12px 14px 12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              paddingBottom: 12,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div
                style={{
                  width: isSmallScreen ? 34 : 38,
                  height: isSmallScreen ? 34 : 38,
                  borderRadius: 10,
                  background: SV.stripe,
                  boxShadow: '0 2px 8px rgba(13, 148, 136, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <FaClipboardCheck style={{ fontSize: isSmallScreen ? 15 : 17 }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: isSmallScreen ? '1.05rem' : '1.15rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    lineHeight: 1.2,
                  }}
                >
                  Stock verification
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                  Batch sessions and consolidated tree report
                </p>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                padding: 4,
                background: '#f4f4f5',
                borderRadius: 10,
                gap: 4,
                border: '1px solid #e4e4e7',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('batches')}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 11,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: activeTab === 'batches' ? SV.stripe : 'transparent',
                  color: activeTab === 'batches' ? '#fff' : '#525252',
                  boxShadow: activeTab === 'batches' ? '0 2px 6px rgba(13,148,136,0.25)' : 'none',
                }}
              >
                <FaLayerGroup style={{ fontSize: 12 }} />
                Batches
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('combineReport')}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 11,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: activeTab === 'combineReport' ? 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)' : 'transparent',
                  color: activeTab === 'combineReport' ? '#fff' : '#525252',
                  boxShadow: activeTab === 'combineReport' ? '0 2px 6px rgba(124,58,237,0.22)' : 'none',
                }}
              >
                <FaChartBar style={{ fontSize: 12 }} />
                Consolidation
              </button>
            </div>
          </div>

      {/* Batches Tab */}
      {activeTab === 'batches' && (
        <>
      <div
        style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 10,
          background: '#ffffff',
          border: '1px solid #e5e5e5',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 10,
            rowGap: 10,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, flex: '1 1 auto' }}>
            <span style={{ fontSize: 10, color: '#525252', fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
              <FaCheckCircle style={{ color: SV.accent, marginRight: 4, verticalAlign: 'middle' }} />
              {totalRecords} rows · API batches {totalSessions}
            </span>
            <button
              type="button"
              onClick={() => setShowFilterPanel(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 30,
                padding: '0 12px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 8,
                border: `1px solid ${showFilterPanel ? SV.accent : '#d4d4d8'}`,
                background: showFilterPanel ? SV.accentMuted : '#fafafa',
                color: SV.accentDark,
                cursor: 'pointer',
              }}
            >
              <FaFilter style={{ fontSize: 11 }} /> Filters
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 30,
                padding: '0 12px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 8,
                border: '1px solid #d4d4d8',
                background: '#fafafa',
                color: '#262626',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                opacity: refreshing ? 0.55 : 1,
              }}
            >
              <FaSpinner className={refreshing ? 'fa-spin' : ''} style={{ fontSize: 11 }} /> Refresh
            </button>
          </div>
          <div style={{ flex: isSmallScreen ? '1 1 100%' : '0 1 280px', minWidth: isSmallScreen ? '100%' : 200, maxWidth: 380 }}>
            <label style={{ ...svLabelStyle, textAlign: isSmallScreen ? 'left' : 'right' }}>Search</label>
            <div style={{ position: 'relative' }}>
              <FaSearch
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: 11,
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Branch, session, batch…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ ...svInputBase, width: '100%', paddingLeft: 30 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Slider (Right-Side) */}
      {showFilterPanel && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              animation: 'fadeIn 0.2s ease-in-out'
            }}
            onClick={() => setShowFilterPanel(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: windowWidth <= 768 ? '100%' : '400px',
              maxWidth: '90vw',
              height: '100vh',
              background: '#ffffff',
              boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.3s ease-out',
              overflowY: 'auto'
            }}
          >
            {/* Filter Header */}
            <div style={{
              background: `linear-gradient(135deg, ${SV.accentDark} 0%, ${SV.accent} 100%)`,
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FaFilter style={{ color: '#ffffff', fontSize: '18px' }} />
                <h3 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#ffffff'
                }}>Filter Options</h3>
              </div>
            <button 
              onClick={() => setShowFilterPanel(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                <FaTimesCircle style={{ color: '#ffffff', fontSize: '16px' }} />
              </button>
          </div>

            {/* Filter Content */}
            <div style={{ padding: '20px', flex: 1 }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '8px'
                }}>Branch Name</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = SV.accent; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                >
                  <option value="">All Branches</option>
                  {uniqueBranches.map((branch, index) => (
                    <option key={index} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '8px'
                }}>From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo || undefined}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '8px'
                }}>To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              {(dateFrom || dateTo || selectedBranch) && (
                <div style={{
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '12px',
                  color: '#64748b'
                }}>
                  Filtering by: {selectedBranch ? `Branch: ${selectedBranch}` : ''} {selectedBranch && (dateFrom || dateTo) ? ' | ' : ''} {dateFrom ? `From ${dateFrom}` : ''} {dateTo ? `To ${dateTo}` : ''}
                </div>
              )}
            </div>

            {/* Filter Footer */}
            <div style={{
              padding: '20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '12px'
            }}>
                  <button 
                    onClick={handleResetDateFilters}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f8fafc';
                  e.target.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ffffff';
                  e.target.style.borderColor = '#e2e8f0';
                }}
                  >
                    Reset
                  </button>
                  <button 
                    onClick={handleApplyDateFilters}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: `1px solid ${SV.accent}`,
                  background: SV.accent,
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = SV.accentDark;
                  e.target.style.borderColor = SV.accentDark;
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = SV.accent;
                  e.target.style.borderColor = SV.accent;
                }}
              >
                Apply Filters
                  </button>
                </div>
              </div>
        </>
      )}

      {/* Table Container */}
      <div
        className="table-print-area"
        style={{
          marginTop: 12,
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #d4d4d8',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ overflowX: 'auto', width: '100%', background: SV.tableBg }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              fontSize: isSmallScreen ? 10 : 11,
              minWidth: 1100,
              tableLayout: 'fixed',
            }}
          >
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ background: SV.headerBg, boxShadow: '0 1px 0 #e4e4e7' }}>
                <th
                  onClick={() => handleSort('BranchName')}
                  style={{ ...svTh, cursor: 'pointer', userSelect: 'none' }}
                >
                  Branch
                  {renderSortIcon('BranchName')}
                </th>
                <th style={svTh}>Batch ID</th>
                <th style={svTh}>Started</th>
                <th style={svTh}>Ended</th>
                <th style={{ ...svTh, textAlign: 'center' }}>Total</th>
                <th style={{ ...svTh, textAlign: 'center' }}>Matched</th>
                <th style={{ ...svTh, textAlign: 'center' }}>Unmatched</th>
                <th
                  style={{
                    ...svTh,
                    textAlign: 'center',
                    position: 'sticky',
                    right: 0,
                    zIndex: 3,
                    background: SV.headerBg,
                    borderLeft: '1px solid #e4e4e7',
                    borderRight: 'none',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
              <tbody>
                    {currentSessions.length === 0 ? (
                      <tr>
                  <td colSpan={8} style={{ ...svTd, padding: 36, textAlign: 'center', color: '#737373', borderRight: 'none' }}>
                    No sessions found
                  </td>
                      </tr>
                    ) : (
                currentSessions.map((session, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index;
                  return (
                    <tr
                      key={session.ScanBatchId || index}
                      style={{
                        background: globalIndex % 2 === 0 ? '#ffffff' : SV.tableBg,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f0fdfa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = globalIndex % 2 === 0 ? '#ffffff' : SV.tableBg;
                      }}
                    >
                      <td style={{ ...svTd, fontWeight: 700, color: '#171717' }}>{session.BranchName || 'N/A'}</td>
                      <td style={{ ...svTd, fontFamily: 'ui-monospace, monospace', color: '#262626' }}>
                        {session.ScanBatchId ? `${session.ScanBatchId.substring(0, 12)}…` : 'N/A'}
                      </td>
                      <td style={svTd}>{session.StartedOn ? formatDate(session.StartedOn) : 'N/A'}</td>
                      <td style={svTd}>{session.EndedOn ? formatDate(session.EndedOn) : 'N/A'}</td>
                      <td style={{ ...svTd, textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '1px 7px',
                            fontSize: 10,
                            fontWeight: 700,
                            borderRadius: 6,
                            border: `1px solid ${SV.accent}`,
                            background: SV.accentMuted,
                            color: SV.accentDark,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {session.TotalQty || 0}
                        </span>
                      </td>
                      <td style={{ ...svTd, textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '1px 7px',
                            fontSize: 10,
                            fontWeight: 700,
                            borderRadius: 6,
                            border: '1px solid #86efac',
                            background: '#f0fdf4',
                            color: '#166534',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {session.MatchQty || 0}
                        </span>
                      </td>
                      <td style={{ ...svTd, textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '1px 7px',
                            fontSize: 10,
                            fontWeight: 700,
                            borderRadius: 6,
                            border: '1px solid #fca5a5',
                            background: '#fef2f2',
                            color: '#b91c1c',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {session.UnmatchQty || 0}
                        </span>
                      </td>
                      <td
                        style={{
                          ...svTd,
                          textAlign: 'center',
                          position: 'sticky',
                          right: 0,
                          background: globalIndex % 2 === 0 ? '#ffffff' : SV.tableBg,
                          zIndex: 1,
                          borderLeft: '1px solid #ececec',
                          borderRight: 'none',
                        }}
                        className="no-print"
                      >
                        <button
                          type="button"
                          onClick={() => handleViewSession(session)}
                          style={svActionBtn}
                          title="View session"
                        >
                          <FaEye style={{ fontSize: 11 }} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
                    )}
                  </tbody>
                </table>
              </div>

            {/* Pagination */}
          {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            background: '#ffffff',
            borderRadius: '0 0 12px 12px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              fontSize: '12px',
              color: '#64748b'
            }}>
              <span>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} entries
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span>per page</span>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap'
            }}>
                    <button 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                  color: currentPage === 1 ? '#94a3b8' : '#475569',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.background = '#f8fafc';
                    e.target.style.borderColor = '#cbd5e1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.background = '#ffffff';
                    e.target.style.borderColor = '#e2e8f0';
                  }
                }}
                    >
                      Previous
                    </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                    <button 
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      background: currentPage === page ? SV.accent : '#ffffff',
                      color: currentPage === page ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== page) {
                        e.target.style.background = '#f8fafc';
                        e.target.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== page) {
                        e.target.style.background = '#ffffff';
                        e.target.style.borderColor = '#e2e8f0';
                      }
                    }}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                  color: currentPage === totalPages ? '#94a3b8' : '#475569',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.background = '#f8fafc';
                    e.target.style.borderColor = '#cbd5e1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.background = '#ffffff';
                    e.target.style.borderColor = '#e2e8f0';
                  }
                }}
                    >
                      Next
                    </button>
              {/* Go to Page */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginLeft: '8px',
                paddingLeft: '8px',
                borderLeft: '1px solid #e2e8f0'
              }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Go to:</span>
                <input
                  type="text"
                  value={pageInput}
                  onChange={handlePageInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePageInputSubmit(e);
                    }
                  }}
                  placeholder="Page"
                  style={{
                    width: '60px',
                    padding: '6px 8px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = SV.accent; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                />
                <button
                  onClick={handlePageInputSubmit}
                  disabled={!pageInput || pageInput === ''}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: `1px solid ${SV.accent}`,
                    background: (!pageInput || pageInput === '') ? '#f1f5f9' : '#ffffff',
                    color: (!pageInput || pageInput === '') ? '#94a3b8' : SV.accent,
                    cursor: (!pageInput || pageInput === '') ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (pageInput && pageInput !== '') {
                      e.target.style.background = SV.accent;
                      e.target.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (pageInput && pageInput !== '') {
                      e.target.style.background = '#ffffff';
                      e.target.style.color = SV.accent;
                    }
                  }}
                >
                  Go
                </button>
            </div>
          </div>
        </div>
        )}
        </div>

      {/* Session Details Slider (Right-Side) */}
      {showDetailsSlider && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              animation: 'fadeIn 0.2s ease-in-out'
            }}
            onClick={() => {
              setShowDetailsSlider(false);
              setSessionDetails(null);
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: windowWidth <= 768 ? '100%' : '90%',
              maxWidth: '1200px',
              height: '100vh',
              background: '#ffffff',
              boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.3s ease-out',
              overflowY: 'auto'
            }}
          >
            {/* Slider Header */}
            <div style={{
              background: `linear-gradient(135deg, ${SV.accentDark} 0%, ${SV.accent} 100%)`,
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e5e7eb',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FaClipboardCheck style={{ color: '#ffffff', fontSize: '18px' }} />
                <h3 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#ffffff'
                }}>
                  {sessionDetails ? `Session Details - Session ${sessionDetails.SessionNumber}` : 'Session Details'}
                </h3>
              </div>
                <button 
                    onClick={() => {
                  setShowDetailsSlider(false);
                      setSessionDetails(null);
                    }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                <FaTimesCircle style={{ color: '#ffffff', fontSize: '16px' }} />
              </button>
              </div>
              
            {/* Slider Content */}
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {detailsLoading ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '60px 20px',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <FaSpinner className="fa-spin" style={{ color: SV.accent, fontSize: '32px' }} />
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Loading session details...</p>
                  </div>
              ) : sessionDetails ? (
                <>
                  {/* Combined Summary & Additional Details Section */}
                  <div style={{
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: windowWidth <= 768 ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Batch ID</div>
                        <div style={{
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          color: SV.accentDark,
                          background: '#ffffff',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: `1px solid ${SV.accentMuted}`
                        }}>
                          {sessionDetails.ScanBatchId?.substring(0, 24)}...
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Client Code</div>
                        <div style={{
                          fontSize: '12px',
                          color: '#1e293b',
                          background: '#ffffff',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}>
                          {sessionDetails.ClientCode || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Session Number</div>
                        <div style={{
                          fontSize: '12px',
                          color: '#1e293b',
                          background: '#ffffff',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}>
                          {sessionDetails.SessionNumber || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: windowWidth <= 768 ? '1fr' : 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Total Items</div>
                        <span style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          borderRadius: '8px',
                          border: `1px solid ${SV.accent}`,
                          background: SV.accentMuted,
                          color: SV.accentDark,
                          display: 'inline-block'
                        }}>{sessionDetails.Totals?.TotalQty || 0}</span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Matched</div>
                        <span style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          borderRadius: '8px',
                          border: '1px solid #10b981',
                          background: '#f0fdf4',
                          color: '#10b981',
                          display: 'inline-block'
                        }}>{sessionDetails.Totals?.TotalMatchQty || 0}</span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Unmatched</div>
                        <span style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          borderRadius: '8px',
                          border: '1px solid #ef4444',
                          background: '#fef2f2',
                          color: '#ef4444',
                          display: 'inline-block'
                        }}>{sessionDetails.Totals?.TotalUnmatchQty || 0}</span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Total Gross Wt</div>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#1e293b'
                        }}>{sessionDetails.Totals?.TotalGrossWeight || 0}g</span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Total Net Wt</div>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#1e293b'
                        }}>{sessionDetails.Totals?.TotalNetWeight || 0}g</span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Match Weight</div>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#1e293b'
                        }}>{sessionDetails.Totals?.TotalMatchGrossWeight || 0}g</span>
                      </div>
                    </div>
                  </div>

                                        {/* Tables Container */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: windowWidth <= 768 ? '1fr' : '1fr 1fr',
                    gap: '16px',
                    flex: 1,
                    minHeight: 0
                  }}>
                {/* Matched Items Table */}
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{
                        padding: '12px 16px',
                        background: '#f0fdf4',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaCheckCircle style={{ color: '#10b981', fontSize: '14px' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Matched Items</span>
                        <span style={{
                          fontSize: '10px',
                            color: '#065f46',
                          background: '#d1fae5',
                          padding: '2px 8px',
                          borderRadius: '12px',
                            fontWeight: 600
                          }}>{filteredMatchedList.length} items</span>
                          </div>
                        <div style={{ position: 'relative', width: '150px' }}>
                          <FaSearch style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '12px' }} />
                          <input 
                            type="text" 
                            placeholder="Search..." 
                            value={matchedSearchQuery}
                            onChange={(e) => setMatchedSearchQuery(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px 6px 28px',
                              fontSize: '11px',
                              border: '1px solid #bbf7d0',
                              borderRadius: '6px',
                              outline: 'none',
                              background: '#ffffff'
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, maxHeight: 'calc(100vh - 550px)', minHeight: '300px' }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'separate',
                          borderSpacing: '0',
                          fontSize: '12px'
                        }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Item Code</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Product Name</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Category</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>RFID Code</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'center', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Gross Wt</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'center', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Pieces</th>
                    </tr>
                  </thead>
                  <tbody>
                            {filteredMatchedList.length === 0 ? (
                                  <tr>
                                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                  {matchedSearchQuery ? 'No matches found' : 'No matched items'}
                                    </td>
                      </tr>
                                ) : (
                              getPaginatedData(filteredMatchedList, matchedPage, tableItemsPerPage).map((item, index) => {
                                const globalIndex = (matchedPage - 1) * tableItemsPerPage + index;
                                return (
                                  <tr
                                    key={item.Id || index}
                                    style={{
                                      background: globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                                      transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf4'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc'}
                                  >
                                    <td style={{ padding: '8px 10px', fontSize: '11px', color: '#1e293b', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>{item.ItemCode || 'N/A'}</td>
                                    <td style={{ padding: '8px 10px', fontSize: '11px', color: '#1e293b', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.ProductName}>{item.ProductName || 'N/A'}</td>
                                    <td style={{ padding: '8px 10px', fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>{item.CategoryName || 'N/A'}</td>
                                    <td style={{ padding: '8px 10px', fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9', fontFamily: 'monospace' }}>{item.RFIDCode || '-'}</td>
                                    <td style={{ padding: '8px 10px', fontSize: '11px', color: '#1e293b', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>{item.GrossWeight || 0}g</td>
                                    <td style={{ padding: '8px 10px', fontSize: '11px', color: '#1e293b', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>{item.Quantity || 0}</td>
                                    </tr>
                                );
                              })
                                )}
                        </tbody>
                      </table>
                          </div>
                      {filteredMatchedList.length > tableItemsPerPage && (
                        <div style={{
                          padding: '8px 12px',
                          borderTop: '1px solid #e5e7eb',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#f9fafb'
                        }}>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                            {((matchedPage - 1) * tableItemsPerPage) + 1}-{Math.min(matchedPage * tableItemsPerPage, filteredMatchedList.length)} of {filteredMatchedList.length}
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                                <button 
                                  onClick={() => setMatchedPage(prev => Math.max(1, prev - 1))}
                                  disabled={matchedPage === 1}
                              style={{
                                padding: '4px 8px',
                                fontSize: '10px',
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb',
                                background: matchedPage === 1 ? '#f3f4f6' : '#ffffff',
                                color: matchedPage === 1 ? '#9ca3af' : '#374151',
                                cursor: matchedPage === 1 ? 'not-allowed' : 'pointer'
                              }}
                            >
                              Prev
                                </button>
                                <button 
                              onClick={() => setMatchedPage(prev => Math.min(getTotalPages(filteredMatchedList, tableItemsPerPage), prev + 1))}
                              disabled={matchedPage === getTotalPages(filteredMatchedList, tableItemsPerPage)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '10px',
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb',
                                background: matchedPage === getTotalPages(filteredMatchedList, tableItemsPerPage) ? '#f3f4f6' : '#ffffff',
                                color: matchedPage === getTotalPages(filteredMatchedList, tableItemsPerPage) ? '#9ca3af' : '#374151',
                                cursor: matchedPage === getTotalPages(filteredMatchedList, tableItemsPerPage) ? 'not-allowed' : 'pointer'
                              }}
                            >
                              Next
                                </button>
                    </div>
                  </div>
                )}
                      </div>

                {/* Unmatched Items Table */}
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{
                        padding: '12px 16px',
                        background: '#fef2f2',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaTimesCircle style={{ color: '#ef4444', fontSize: '14px' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Unmatched Items</span>
                        <span style={{
                          fontSize: '10px',
                            color: '#7f1d1d',
                          background: '#fee2e2',
                          padding: '2px 8px',
                          borderRadius: '12px',
                            fontWeight: 600
                          }}>{filteredUnmatchedList.length} items</span>
                          </div>
                        <div style={{ position: 'relative', width: '150px' }}>
                          <FaSearch style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '12px' }} />
                          <input 
                            type="text" 
                            placeholder="Search..." 
                            value={unmatchedSearchQuery}
                            onChange={(e) => setUnmatchedSearchQuery(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px 6px 28px',
                              fontSize: '11px',
                              border: '1px solid #fca5a5',
                              borderRadius: '6px',
                              outline: 'none',
                              background: '#ffffff'
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, maxHeight: 'calc(100vh - 550px)', minHeight: '300px' }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'separate',
                          borderSpacing: '0',
                          fontSize: '12px'
                        }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Item Code</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Product Name</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Category</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>RFID Code</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'center', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Gross Wt</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'center', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Pieces</th>
                      </tr>
                        </thead>
                        <tbody>
                            {filteredUnmatchedList.length === 0 ? (
                                  <tr>
                                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                  {unmatchedSearchQuery ? 'No matches found' : 'No unmatched items'}
                                    </td>
                            </tr>
                                ) : (
                              getPaginatedData(filteredUnmatchedList, unmatchedPage, tableItemsPerPage).map((item, index) => {
                                const globalIndex = (unmatchedPage - 1) * tableItemsPerPage + index;
                                return (
                                  <tr
                                    key={item.Id || index}
                                    style={{
                                      background: globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                                      transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc'}
                                  >
                                    <td style={{ padding: '8px 10px', fontSize: '11px', color: '#1e293b', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>{item.ItemCode || 'N/A'}</td>
                                    <td style={{ padding: '8px 10px', fontSize: '11px', color: '#1e293b', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.ProductName}>{item.ProductName || 'N/A'}</td>
                                    <td style={{ padding: '8px 10px', fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>{item.CategoryName || 'N/A'}</td>
                                    <td style={{ padding: '8px 10px', fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9', fontFamily: 'monospace' }}>{item.RFIDCode || '-'}</td>
                                    <td style={{ padding: '8px 10px', fontSize: '11px', color: '#1e293b', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>{item.GrossWeight || 0}g</td>
                                    <td style={{ padding: '8px 10px', fontSize: '11px', color: '#1e293b', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>{item.Quantity || 0}</td>
                                    </tr>
                                );
                              })
                                )}
                  </tbody>
                </table>
              </div>
                      {filteredUnmatchedList.length > tableItemsPerPage && (
                        <div style={{
                          padding: '8px 12px',
                          borderTop: '1px solid #e5e7eb',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#f9fafb'
                        }}>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                            {((unmatchedPage - 1) * tableItemsPerPage) + 1}-{Math.min(unmatchedPage * tableItemsPerPage, filteredUnmatchedList.length)} of {filteredUnmatchedList.length}
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                                  onClick={() => setUnmatchedPage(prev => Math.max(1, prev - 1))}
                                  disabled={unmatchedPage === 1}
                              style={{
                                padding: '4px 8px',
                                fontSize: '10px',
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb',
                                background: unmatchedPage === 1 ? '#f3f4f6' : '#ffffff',
                                color: unmatchedPage === 1 ? '#9ca3af' : '#374151',
                                cursor: unmatchedPage === 1 ? 'not-allowed' : 'pointer'
                              }}
                            >
                              Prev
                                </button>
                        <button 
                              onClick={() => setUnmatchedPage(prev => Math.min(getTotalPages(filteredUnmatchedList, tableItemsPerPage), prev + 1))}
                              disabled={unmatchedPage === getTotalPages(filteredUnmatchedList, tableItemsPerPage)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '10px',
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb',
                                background: unmatchedPage === getTotalPages(filteredUnmatchedList, tableItemsPerPage) ? '#f3f4f6' : '#ffffff',
                                color: unmatchedPage === getTotalPages(filteredUnmatchedList, tableItemsPerPage) ? '#9ca3af' : '#374151',
                                cursor: unmatchedPage === getTotalPages(filteredUnmatchedList, tableItemsPerPage) ? 'not-allowed' : 'pointer'
                              }}
                            >
                              Next
                        </button>
          </div>
        </div>
                          )}
                </div>
          </div>

                    </>
                  ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px 20px',
                  gap: '16px'
                }}>
                  <FaExclamationTriangle style={{ color: '#f59e0b', fontSize: '48px' }} />
                  <h5 style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>No Data Available</h5>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Unable to load session details.</p>
                </div>
              )}
              </div>

            {/* Slider Footer */}
            <div style={{
              padding: '20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              background: '#ffffff',
              position: 'sticky',
              bottom: 0,
              zIndex: 10
            }}>
                    <button
                    onClick={() => {
                  setShowDetailsSlider(false);
                      setSessionDetails(null);
                    }}
                style={{
                  padding: '10px 20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f8fafc';
                  e.target.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ffffff';
                  e.target.style.borderColor = '#e2e8f0';
                }}
              >
                Close
                    </button>
                  {sessionDetails && (
                    <button 
                      onClick={exportSessionDetails}
                  style={{
                    padding: '10px 20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: `1px solid ${SV.accent}`,
                    background: SV.accent,
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = SV.accentDark;
                    e.target.style.borderColor = SV.accentDark;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = SV.accent;
                    e.target.style.borderColor = SV.accent;
                  }}
                >
                  <FaFileExcel /> Export
                    </button>
                  )}
                </div>
            </div>
        </>
      )}
        </>
      )}

      {/* Combine Report of Stock Verification Tab */}
      {activeTab === 'combineReport' && (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
          {/* Unified Header & Action Section */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: 'none',
            border: '1px solid #f1f5f9'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div style={{ flex: 1 }}>
                <h2 style={{
                  margin: 0,
                  fontSize: isSmallScreen ? '1rem' : '1.1rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: '1.2'
                }}>Consolidated Stock Report</h2>
                <div style={{
                  fontSize: '11px',
                  color: '#64748b',
                  marginTop: '4px',
                  fontWeight: 600
                }}>
                  Comprehensive view of stock verification across all branches
                </div>
              </div>

              {/* Date Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaCalendarAlt style={{ color: '#64748b', fontSize: '14px' }} />
                <input
                  type="date"
                  value={selectedReportDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setSelectedReportDate(newDate);
                    setConsolidationTreePage(1);
                    if (clientCode) {
                      fetchConsolidationReport({
                        ClientCode: clientCode,
                        ReportDate: newDate,
                      });
                    }
                  }}
                  max={new Date().toISOString().split('T')[0]} // Can't select future dates
                  style={{
                    padding: '8px 12px',
                    fontSize: '13px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => {
                    setConsolidationTreePage(1);
                    fetchConsolidationReport();
                  }}
                  disabled={consolidationLoading}
                  style={{
                    height: 34,
                    padding: '0 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: '1px solid #d4d4d8',
                    background: '#fafafa',
                    color: '#262626',
                    cursor: consolidationLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    opacity: consolidationLoading ? 0.7 : 1,
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    if (!consolidationLoading) {
                      e.target.style.background = '#f8fafc';
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.color = '#1e293b';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!consolidationLoading) {
                      e.target.style.background = '#ffffff';
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.color = '#475569';
                    }
                  }}
                >
                  <FaSpinner className={consolidationLoading ? 'fa-spin' : ''} /> 
                  {consolidationLoading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button 
                  onClick={() => {
                    setSelectedExportBranchId('');
                    setShowExportBranchModal(true);
                  }}
                  style={{
                    height: 34,
                    padding: '0 14px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    boxShadow: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = 'none';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <FaFileExcel /> Export
                </button>
              </div>
            </div>
          </div>

          {showExportBranchModal && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10001,
                background: 'rgba(15, 23, 42, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
              }}
              onClick={() => setShowExportBranchModal(false)}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 460,
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  boxShadow: 'none',
                  overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ height: 3, background: SV.stripe }} />
                <div style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Export branch report</h3>
                <p style={{ margin: '0 0 14px 0', color: '#64748b', fontSize: 11 }}>
                  Select a branch to export only that branch details in Excel.
                </p>
                <select
                  value={selectedExportBranchId}
                  onChange={(e) => setSelectedExportBranchId(e.target.value)}
                  style={{
                    width: '100%',
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 14,
                    color: '#1e293b',
                    marginBottom: 14,
                  }}
                >
                  <option value="">Select branch...</option>
                  {(consolidationData?.Branches || []).map((branch) => (
                    <option key={branch.BranchId} value={branch.BranchId}>
                      {branch.BranchName}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowExportBranchModal(false)}
                    style={{
                      padding: '9px 14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 10,
                      background: '#fff',
                      color: '#334155',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedExportBranchId) {
                        toast.error('Please select a branch.');
                        return;
                      }
                      exportConsolidationReport(selectedExportBranchId);
                      setShowExportBranchModal(false);
                    }}
                    style={{
                      padding: '9px 14px',
                      border: 'none',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Export Branch Excel
                  </button>
                </div>
                </div>
              </div>
            </div>
          )}

          {/* Combine Report Content */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: 'none',
            border: '1px solid #f1f5f9',
            overflow: 'hidden'
          }}>
            {consolidationLoading ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ 
                  display: 'inline-block', 
                  padding: '16px', 
                  borderRadius: '50%', 
                  background: SV.accentMuted, 
                  marginBottom: '16px' 
                }}>
                  <FaSpinner className="fa-spin" style={{ fontSize: '32px', color: SV.accent }} />
                </div>
                <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '16px', fontWeight: 600 }}>Loading Report</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Fetching consolidated data from all branches...</p>
              </div>
            ) : consolidationError ? (
               <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ 
                  display: 'inline-block', 
                  padding: '16px', 
                  borderRadius: '50%', 
                  background: '#fef2f2', 
                  marginBottom: '16px' 
                }}>
                  <FaExclamationTriangle style={{ fontSize: '32px', color: '#ef4444' }} />
                </div>
                <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '16px', fontWeight: 600 }}>Unable to Load Data</h3>
                <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '13px' }}>{consolidationError}</p>
                <button 
                  onClick={fetchConsolidationReport}
                  style={{
                    padding: '10px 24px',
                    background: SV.accent,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.target.style.background = SV.accentDark; }}
                  onMouseLeave={(e) => { e.target.style.background = SV.accent; }}
                >
                  Retry Request
                </button>
              </div>
            ) : consolidationData && (consolidationData.Branches || consolidationData.Totals) ? (
              <>
                {consolidationData.Totals && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid #e5e7eb',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        {
                          key: 'inv',
                          title: 'Total Inventory',
                          qty: consolidationData.Totals.TotalInventoryQty?.toLocaleString() ?? 0,
                          g: resolveConsolidationTotals(consolidationData.Totals).totalInventoryGrossWeight,
                          n: resolveConsolidationTotals(consolidationData.Totals).totalInventoryNetWeight,
                          bg: '#ecfdf5',
                          bd: '#99f6e4',
                          fg: '#0f766e',
                          icon: <FaBoxes />,
                        },
                        {
                          key: 'mat',
                          title: 'Matched',
                          qty: consolidationData.Totals.MatchedQty?.toLocaleString() ?? 0,
                          g: resolveConsolidationTotals(consolidationData.Totals).totalMatchGrossWeight,
                          n: resolveConsolidationTotals(consolidationData.Totals).totalMatchNetWeight,
                          bg: '#f0fdfa',
                          bd: '#99f6e4',
                          fg: '#0d9488',
                          icon: <FaCheckCircle />,
                        },
                        {
                          key: 'unm',
                          title: 'Unmatched',
                          qty: consolidationData.Totals.UnmatchQty?.toLocaleString() ?? 0,
                          g: resolveConsolidationTotals(consolidationData.Totals).totalUnmatchGrossWeight,
                          n: resolveConsolidationTotals(consolidationData.Totals).totalUnmatchNetWeight,
                          bg: '#fff7ed',
                          bd: '#fdba74',
                          fg: '#c2410c',
                          icon: <FaTimesCircle />,
                        },
                      ].map((s) => (
                        <div
                          key={s.key}
                          style={{
                            flex: '1 1 220px',
                            minWidth: 190,
                            border: `1px solid ${s.bd}`,
                            background: s.bg,
                            borderRadius: 8,
                            padding: '8px 10px',
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            columnGap: 8,
                            rowGap: 2,
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', color: s.fg }}>
                            {s.title}
                          </div>
                          <div style={{ color: s.fg, opacity: 0.45, fontSize: 14 }}>{s.icon}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: s.fg, lineHeight: 1 }}>
                            {s.qty}
                          </div>
                          <div />
                          <div style={{ gridColumn: '1 / span 2', fontSize: 10, color: '#525252', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            G: {Number(s.g || 0).toFixed(2)} g · N: {Number(s.n || 0).toFixed(2)} g
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consolidated Tree View (branch-level pagination) */}
                <ConsolidatedTreeView branches={paginatedConsolidationBranches} />
                {consolidationBranchCount > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderTop: '1px solid #e5e5e5',
                      flexWrap: 'wrap',
                      gap: 10,
                      background: SV.tableBg,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#525252', fontWeight: 600 }}>
                        {consolidationBranchCount} branch{consolidationBranchCount !== 1 ? 'es' : ''} · {consolidationItemsPerPage} rows/page
                        {` · ${(consolidationTreePage - 1) * consolidationItemsPerPage + 1}–${Math.min(consolidationTreePage * consolidationItemsPerPage, consolidationBranchCount)} shown`}
                      </span>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#404040' }}>
                        Per page
                        <select
                          value={consolidationItemsPerPage}
                          onChange={(e) => setConsolidationItemsPerPage(Number(e.target.value))}
                          style={{ ...svInputBase, width: 68, height: 28, padding: '0 6px' }}
                        >
                          {[10, 15, 25, 50].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setConsolidationTreePage((p) => Math.max(1, p - 1))}
                        disabled={consolidationTreePage === 1}
                        style={svPageBtn(consolidationTreePage === 1)}
                      >
                        Prev
                      </button>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#404040', fontVariantNumeric: 'tabular-nums' }}>
                        Page {consolidationTreePage} / {consolidationBranchTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setConsolidationTreePage((p) => Math.min(consolidationBranchTotalPages, p + 1))}
                        disabled={consolidationTreePage === consolidationBranchTotalPages}
                        style={svPageBtn(consolidationTreePage === consolidationBranchTotalPages)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ 
                  display: 'inline-block', 
                  padding: '20px', 
                  borderRadius: '50%', 
                  background: '#f8fafc', 
                  marginBottom: '16px',
                  border: '1px solid #e2e8f0'
                }}>
                  <FaChartBar style={{ fontSize: '32px', color: '#cbd5e1' }} />
                </div>
                <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '16px', fontWeight: 600 }}>No Data Found</h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>There is no consolidation data available for the current selection.</p>
              </div>
            )}
          </div>
        </div>
      )}

        </div>
      </div>

      <style>{`
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        *::-webkit-scrollbar {
          display: none;
        }
        body, html {
          overflow-x: hidden;
          box-sizing: border-box;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (max-width: 768px) {
          .table-responsive {
            font-size: 10px;
          }
        }
        @media (max-width: 480px) {
          .table-responsive {
            font-size: 10px;
          }
          table {
            font-size: 10px;
          }
          th, td {
            padding: 8px;
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default StockVerification;
