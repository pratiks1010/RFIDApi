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
  FaBarcode,
  FaTimes
} from 'react-icons/fa';
import { useNotifications } from '../../context/NotificationContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useLoading } from '../../App';

const StockVerification = () => {
  const navigate = useNavigate();
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
  
  // Navigation State for Zoho-like flow
  const [currentView, setCurrentView] = useState('branches'); // 'branches', 'categories', 'products'
  const [selectedBranchForView, setSelectedBranchForView] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [branchDetails, setBranchDetails] = useState({});
  const [categoryDetails, setCategoryDetails] = useState({});
  const [loadingBranch, setLoadingBranch] = useState(null);
  const [loadingCategory, setLoadingCategory] = useState(null);
  
  // Pagination for each view
  const [branchPage, setBranchPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [consolidationItemsPerPage] = useState(20);

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
  const fetchSessions = async () => {
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
        ClientCode: clientCode
      };

      // Add date filters if provided
      if (dateFrom) {
        payload.DateFrom = dateFrom;
      }
      if (dateTo) {
        payload.DateTo = dateTo;
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
        // Check for Sessions array in response
        if (response.data.Sessions && Array.isArray(response.data.Sessions)) {
          sessionsData = response.data.Sessions;
          totalCount = response.data.TotalSessions || response.data.Sessions.length;
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
      fetchSessions();
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
        fetchSessions();
      }, 300); // Small delay to debounce rapid date changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [dateFrom, dateTo, clientCode]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSessions();
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
  const totalPages = Math.ceil(sortedSessions.length / itemsPerPage);
  const totalRecords = sortedSessions.length;
  const currentSessions = useMemo(() => {
  const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedSessions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedSessions, currentPage, itemsPerPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

  // Navigate to Branch Categories View
  const handleBranchClick = async (branch) => {
    setSelectedBranchForView(branch);
    setCategoryPage(1);
    
    // Load branch details if not cached
    if (!branchDetails[branch.BranchId]) {
      try {
        setLoadingBranch(branch.BranchId);
        
        const response = await axios.post(
          'https://rrgold.loyalstring.co.in/api/ProductMaster/GetConsolidationStockVerificationReport',
          {
            ClientCode: clientCode,
            ReportDate: selectedReportDate,
            BranchId: branch.BranchId
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        if (response.data && response.data.Branches && response.data.Branches.length > 0) {
          const branchData = response.data.Branches[0];
          setBranchDetails(prev => ({
            ...prev,
            [branch.BranchId]: branchData
          }));
        }
      } catch (err) {
        console.error('Error fetching branch details:', err);
        toast.error('Failed to load branch details');
      } finally {
        setLoadingBranch(null);
      }
    }
    
    setCurrentView('categories');
  };

  // Navigate to Category Products View
  const handleCategoryClick = async (category) => {
    setSelectedCategory(category);
    setProductPage(1);
    
    const key = `${selectedBranchForView.BranchId}_${category.CategoryId}`;
    
    // Load category details if not cached
    if (!categoryDetails[key]) {
      try {
        setLoadingCategory(key);
        
        const response = await axios.post(
          'https://rrgold.loyalstring.co.in/api/ProductMaster/GetConsolidationStockVerificationReport',
          {
            ClientCode: clientCode,
            ReportDate: selectedReportDate,
            BranchId: selectedBranchForView.BranchId,
            CategoryId: category.CategoryId
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        if (response.data && response.data.Branches && response.data.Branches.length > 0) {
          const branchData = response.data.Branches[0];
          const categoryData = branchData.Categories?.find(cat => cat.CategoryId === category.CategoryId);
          
          if (categoryData) {
            setCategoryDetails(prev => ({
              ...prev,
              [key]: categoryData
            }));
          }
        }
      } catch (err) {
        console.error('Error fetching category details:', err);
        toast.error('Failed to load category details');
      } finally {
        setLoadingCategory(null);
      }
    }
    
    setCurrentView('products');
  };

  // Navigation handlers
  const handleBackToBranches = () => {
    setCurrentView('branches');
    setSelectedBranchForView(null);
    setSelectedCategory(null);
    setBranchPage(1);
  };

  const handleBackToCategories = () => {
    setCurrentView('categories');
    setSelectedCategory(null);
    setProductPage(1);
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
          ClientCode: clientCode,
          ScanBatchId: scanBatchId
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Session Details Response:', response.data);
      setSessionDetails(response.data);
      
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
  const exportConsolidationReport = () => {
    if (!consolidationData || !consolidationData.Branches || consolidationData.Branches.length === 0) {
      toast.error('No data available for export');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      
      // Summary Sheet
      const reportDateStr = consolidationData.ReportDate
        ? new Date(consolidationData.ReportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '-';
      const summaryData = [
        ['Consolidation Stock Verification Report'],
        ['Report Date:', reportDateStr],
        ['Generated on:', new Date().toLocaleString('en-IN')],
        consolidationData.Message ? ['Message:', consolidationData.Message] : [],
        [''],
        ['Summary'],
        ['Total Scanned Items:', consolidationData.Totals?.TotalScannedItems ?? 0],
        ['Matched Qty:', consolidationData.Totals?.MatchedQty ?? 0],
        ['Unmatch Qty:', consolidationData.Totals?.UnmatchQty ?? 0],
        ['Total Match Weight:', `${consolidationData.Totals?.TotalMatchWeight ?? 0}g`],
        ['Total Unmatch Weight:', `${consolidationData.Totals?.TotalUnmatchWeight ?? 0}g`],
        [''],
        ['Detailed Report']
      ].filter(row => row.length > 0);

      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWS['!cols'] = [{ width: 25 }, { width: 30 }];
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');

      // Detailed Report Sheet - TotalScannedItems, MatchedQty, UnmatchQty, MatchWeight, UnmatchWeight
      const headers = [
        'Branch',
        'Category',
        'Product',
        'Total Scanned Items',
        'Matched Qty',
        'Unmatch Qty',
        'Match Weight',
        'Unmatch Weight'
      ];

      const data = [];
      (consolidationData.Branches || []).forEach(branch => {
        (branch.Categories || []).forEach(category => {
          (category.Products || []).forEach(product => {
            data.push([
              branch.BranchName || '',
              category.CategoryName || '',
              product.ProductName || '',
              product.TotalScannedItems ?? product.ScannedCount ?? 0,
              product.MatchedQty ?? 0,
              product.UnmatchQty ?? 0,
              product.MatchWeight ?? 0,
              product.UnmatchWeight ?? 0
            ]);
          });
        });
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws['!cols'] = [
        { width: 20 },
        { width: 20 },
        { width: 25 },
        { width: 16 },
        { width: 12 },
        { width: 12 },
        { width: 14 },
        { width: 14 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Detailed Report');

      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Consolidation_Stock_Report_${timestamp}.xlsx`);
      
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
    const totalPages = Math.max(1, Math.ceil((items.length || 0) / ITEMS_PAGE_SIZE));
    const start = (page - 1) * ITEMS_PAGE_SIZE;
    const pageItems = (items || []).slice(start, start + ITEMS_PAGE_SIZE);

    useEffect(() => { if (open) setPage(1); }, [open]);

    if (!open) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
        <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '95vw', width: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
            <button type="button" onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#64748b' }}><FaTimes size={16} /></button>
          </div>
          <div style={{ padding: '12px', overflow: 'auto', flex: 1, minHeight: 0 }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{items.length.toLocaleString()} item(s)</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Item Code</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>RFID Code</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Category</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Product</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Design</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Gross Wt (g)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Net Wt (g)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No items</td></tr>
                  ) : pageItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px' }}>{item.ItemCode ?? '–'}</td>
                      <td style={{ padding: '8px' }}>{item.RFIDCode ?? '–'}</td>
                      <td style={{ padding: '8px' }}>{item.CategoryName ?? '–'}</td>
                      <td style={{ padding: '8px' }}>{item.ProductName ?? '–'}</td>
                      <td style={{ padding: '8px' }}>{item.DesignName ?? '–'}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{(item.GrossWeight ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{(item.NetWeight ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: (item.Status || '').toString().toLowerCase() === 'matched' ? '#dcfce7' : '#ffedd5', color: (item.Status || '').toString().toLowerCase() === 'matched' ? '#166534' : '#c2410c' }}>{item.Status ?? '–'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 12px', border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}><FaChevronLeft /></button>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Page {page} of {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 12px', border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}><FaChevronRight /></button>
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

    const toggle = (setter, key) => setter(prev => ({ ...prev, [key]: !prev[key] }));

    const StatPill = ({ value, color, weight, weightColor = '#64748b', onClick }) => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
          className="consolidation-tree-pill"
          style={{
            padding: '6px 14px',
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${color}12 0%, ${color}08 100%)`,
            color,
            fontWeight: 700,
            fontSize: '13px',
            minWidth: '44px',
            textAlign: 'center',
            border: `1px solid ${color}25`,
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
        {weight !== undefined && (
          <div style={{ fontSize: '10px', color: weightColor, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {weight ? `${Number(weight).toFixed(2)}g` : '0g'}
          </div>
        )}
      </div>
    );

    const openItemsModal = (title, node, level, type) => {
      const items = collectItemsFromNode(node, type, level);
      setItemsModal({ open: true, title, items, type });
    };

    const rowBase = { transition: 'background 0.15s ease' };
    const renderRow = (content, isExpanded, onToggle, hasChildren, rowKey) => (
      <tr
        key={rowKey}
        className="consolidation-tree-row"
        style={{
          ...rowBase,
          background: isExpanded ? 'linear-gradient(90deg, #f0f9ff 0%, #ffffff 100%)' : '#ffffff',
          cursor: hasChildren ? 'pointer' : 'default',
          borderBottom: '1px solid #f1f5f9'
        }}
        onClick={hasChildren ? () => onToggle() : undefined}
        onMouseEnter={(e) => { if (hasChildren) e.currentTarget.style.background = isExpanded ? 'linear-gradient(90deg, #e0f2fe 0%, #f8fafc 100%)' : '#f8fafc'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = isExpanded ? 'linear-gradient(90deg, #f0f9ff 0%, #ffffff 100%)' : '#ffffff'; }}
      >
        {content}
      </tr>
    );

    return (
      <>
        <div
          className="consolidation-tree-wrap"
          style={{
            overflowX: 'auto',
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04), 0 2px 4px -2px rgba(0,0,0,0.02)',
            overflow: 'hidden'
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px', fontSize: '13px' }}>
            <thead>
              <tr style={{
                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                borderBottom: '2px solid #e2e8f0'
              }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', width: '40%', color: '#475569', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Name</th>
                <th style={{ padding: '16px 12px', textAlign: 'center', width: '20%', color: '#475569', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Inventory</th>
                <th style={{ padding: '16px 12px', textAlign: 'center', width: '20%', color: '#475569', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Matched</th>
                <th style={{ padding: '16px 12px', textAlign: 'center', width: '20%', color: '#475569', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unmatched</th>
              </tr>
            </thead>
            <tbody>
              {(branches || []).map((branch) => {
                const branchExp = expandedBranches[branch.BranchId];
                return (
                  <React.Fragment key={branch.BranchId}>
                    {renderRow(
                      <>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: branchExp ? '#2563eb' : '#64748b',
                              background: branchExp ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' : '#f1f5f9',
                              borderRadius: '8px',
                              transition: 'all 0.2s ease',
                              border: `1px solid ${branchExp ? '#93c5fd' : '#e2e8f0'}`
                            }}>
                              <FaChevronRight size={12} style={{ transform: branchExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }} />
                            </div>
                            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FaLayerGroup size={14} />
                            </div>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px', letterSpacing: '-0.01em' }}>{branch.BranchName}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }} onClick={e => e.stopPropagation()}>
                          <StatPill value={branch.TotalInventoryItems} color="#0ea5e9" onClick={() => openItemsModal(`Total Inventory – ${branch.BranchName}`, branch, 'branch', 'total')} />
                        </td>
                        <td style={{ padding: '12px' }} onClick={e => e.stopPropagation()}>
                          <StatPill value={branch.MatchedQty} color="#0d9488" weight={branch.MatchWeight} onClick={() => openItemsModal(`Matched – ${branch.BranchName}`, branch, 'branch', 'matched')} />
                        </td>
                        <td style={{ padding: '12px' }} onClick={e => e.stopPropagation()}>
                          <StatPill value={branch.UnmatchQty} color="#ea580c" weight={branch.UnmatchWeight} onClick={() => openItemsModal(`Unmatched – ${branch.BranchName}`, branch, 'branch', 'unmatched')} />
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
                              <td style={{ padding: '12px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '36px' }}>
                                  <div style={{
                                    width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: catExp ? '#d97706' : '#64748b',
                                    background: catExp ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : '#f8fafc',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s ease',
                                    border: `1px solid ${catExp ? '#fcd34d' : '#e2e8f0'}`
                                  }}>
                                    <FaChevronRight size={10} style={{ transform: catExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }} />
                                  </div>
                                  <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaChartBar size={12} />
                                  </div>
                                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>{category.CategoryName}</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                <StatPill value={category.TotalInventoryItems} color="#0ea5e9" onClick={() => openItemsModal(`Total Inventory – ${category.CategoryName}`, category, 'category', 'total')} />
                              </td>
                              <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                <StatPill value={category.MatchedQty} color="#0d9488" weight={category.MatchWeight} onClick={() => openItemsModal(`Matched – ${category.CategoryName}`, category, 'category', 'matched')} />
                              </td>
                              <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                <StatPill value={category.UnmatchQty} color="#ea580c" weight={category.UnmatchWeight} onClick={() => openItemsModal(`Unmatched – ${category.CategoryName}`, category, 'category', 'unmatched')} />
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
                                    <td style={{ padding: '10px 20px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '56px' }}>
                                        <div style={{
                                          width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          color: prodExp ? '#7c3aed' : '#64748b',
                                          background: prodExp ? 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' : '#f8fafc',
                                          borderRadius: '6px',
                                          transition: 'all 0.2s ease',
                                          border: `1px solid ${prodExp ? '#c4b5fd' : '#e2e8f0'}`
                                        }}>
                                          <FaChevronRight size={9} style={{ transform: prodExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }} />
                                        </div>
                                        <div style={{ width: 24, height: 24, borderRadius: '6px', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <FaBoxes size={10} />
                                        </div>
                                        <span style={{ fontWeight: 600, color: '#334155', fontSize: '12px' }}>{product.ProductName}</span>
                                      </div>
                                    </td>
                                    <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                      <StatPill value={product.TotalInventoryItems} color="#0ea5e9" onClick={() => openItemsModal(`Total Inventory – ${product.ProductName}`, product, 'product', 'total')} />
                                    </td>
                                    <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                      <StatPill value={product.MatchedQty} color="#0d9488" weight={product.MatchWeight} onClick={() => openItemsModal(`Matched – ${product.ProductName}`, product, 'product', 'matched')} />
                                    </td>
                                    <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                      <StatPill value={product.UnmatchQty} color="#ea580c" weight={product.UnmatchWeight} onClick={() => openItemsModal(`Unmatched – ${product.ProductName}`, product, 'product', 'unmatched')} />
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
                                      <td style={{ padding: '10px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '80px' }}>
                                          <div style={{ width: 22, height: 22, borderRadius: '6px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaBarcode size={10} />
                                          </div>
                                          <span style={{ fontWeight: 500, color: '#64748b', fontSize: '12px' }}>{design.DesignName}</span>
                                        </div>
                                      </td>
                                      <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                        <StatPill value={design.TotalInventoryItems} color="#0ea5e9" onClick={() => openItemsModal(`Total Inventory – ${design.DesignName}`, design, 'design', 'total')} />
                                      </td>
                                      <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                        <StatPill value={design.MatchedQty} color="#0d9488" weight={design.MatchWeight} onClick={() => openItemsModal(`Matched – ${design.DesignName}`, design, 'design', 'matched')} />
                                      </td>
                                      <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                                        <StatPill value={design.UnmatchQty} color="#ea580c" weight={design.UnmatchWeight} onClick={() => openItemsModal(`Unmatched – ${design.DesignName}`, design, 'design', 'unmatched')} />
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
            </tbody>
          </table>
          {(!branches || branches.length === 0) && (
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
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '16px', position: 'relative' }}>
      {/* Modern Tabs */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-start',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '4px' 
      }}>
        <div style={{
          display: 'flex',
          padding: '6px',
          background: '#ffffff',
          borderRadius: '16px',
          gap: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <button
            onClick={() => setActiveTab('batches')}
            style={{
              padding: '10px 24px',
              background: activeTab === 'batches' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
              color: activeTab === 'batches' ? '#ffffff' : '#64748b',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === 'batches' ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none',
              transform: activeTab === 'batches' ? 'translateY(-1px)' : 'none'
            }}
          >
            <FaLayerGroup /> 
            <span>Batch Wise Verification</span>
          </button>
          <button
            onClick={() => setActiveTab('combineReport')}
            style={{
              padding: '10px 24px',
              background: activeTab === 'combineReport' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'transparent',
              color: activeTab === 'combineReport' ? '#ffffff' : '#64748b',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === 'combineReport' ? '0 4px 12px rgba(124, 58, 237, 0.2)' : 'none',
              transform: activeTab === 'combineReport' ? 'translateY(-1px)' : 'none'
            }}
          >
            <FaChartBar /> 
            <span>Consolidated Report</span>
          </button>
        </div>
      </div>

      {/* Batches Tab */}
      {activeTab === 'batches' && (
        <>
      {/* Unified Header & Action Section */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}>
                <div>
            <h2 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: '#1e293b',
              lineHeight: '1.2'
            }}>Stock Verification</h2>
                </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #dcfce7'
            }}>
              <FaCheckCircle style={{ color: '#10b981', fontSize: '14px' }} />
              <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>Active: {totalSessions}</span>
              </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #dbeafe'
            }}>
              <FaLayerGroup style={{ color: '#3b82f6', fontSize: '14px' }} />
              <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>Batches: {totalSessions}</span>
            </div>
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              fontWeight: 600
            }}>
              Total: {totalRecords} records
                    </div>
              </div>
            </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          {/* Search Input */}
          <div style={{
            position: 'relative',
            flex: '1',
            minWidth: windowWidth <= 768 ? '100%' : '250px',
            maxWidth: windowWidth <= 768 ? '100%' : '350px'
          }}>
            <FaSearch style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '14px',
              zIndex: 1
            }} />
            <input
              type="text"
              placeholder="Search by branch name, session ID or batch..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
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
          {/* Action Buttons */}
                <button 
            onClick={() => setShowFilterPanel(true)}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid #3b82f6',
              background: showFilterPanel ? '#3b82f6' : '#ffffff',
              color: showFilterPanel ? '#ffffff' : '#3b82f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!showFilterPanel) {
                e.target.style.background = '#3b82f6';
                e.target.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (!showFilterPanel) {
                e.target.style.background = '#ffffff';
                e.target.style.color = '#3b82f6';
              }
            }}
          >
            <FaFilter /> Filter
                </button>
                                    <button 
                  onClick={handleRefresh}
                  disabled={refreshing}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid #3b82f6',
              background: '#ffffff',
              color: '#3b82f6',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              opacity: refreshing ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!refreshing) {
                e.target.style.background = '#3b82f6';
                e.target.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (!refreshing) {
                e.target.style.background = '#ffffff';
                e.target.style.color = '#3b82f6';
              }
            }}
          >
            <FaSpinner className={refreshing ? 'fa-spin' : ''} /> Refresh
                </button>
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
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
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
                  border: '1px solid #3b82f6',
                  background: '#3b82f6',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#2563eb';
                  e.target.style.borderColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#3b82f6';
                  e.target.style.borderColor = '#3b82f6';
                }}
              >
                Apply Filters
                  </button>
                </div>
              </div>
        </>
      )}

      {/* Table Container */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        marginTop: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto', overflowY: 'visible', width: '100%', maxWidth: '100%' }}>
          <table style={{ 
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px',
            tableLayout: 'auto',
            minWidth: '1200px'
          }}>
            <thead>
              <tr style={{
                background: '#f8fafc',
                borderBottom: '2px solid #e5e7eb'
              }}>
                <th 
                  onClick={() => handleSort('BranchName')}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  Branch Name
                  {renderSortIcon('BranchName')}
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Batch ID</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Started On</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Ended On</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Total Qty</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Matched Items</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Unmatched Items</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  position: 'sticky',
                  right: 0,
                  background: '#f8fafc',
                  zIndex: 10,
                  borderLeft: '2px solid #e5e7eb'
                }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                    {currentSessions.length === 0 ? (
                      <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
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
                        borderBottom: '1px solid #e5e7eb',
                        background: globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f1f5f9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
                      }}
                    >
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        fontWeight: 600
                      }}>{session.BranchName || 'N/A'}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        fontFamily: 'monospace'
                      }}>{session.ScanBatchId ? session.ScanBatchId.substring(0, 12) + '...' : 'N/A'}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>{session.StartedOn ? formatDate(session.StartedOn) : 'N/A'}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>{session.EndedOn ? formatDate(session.EndedOn) : 'N/A'}</td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '12px'
                      }}>
                        <span style={{
                          padding: '4px 10px',
                          fontSize: '10px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #3b82f6',
                          background: '#eff6ff',
                          color: '#3b82f6'
                        }}>{session.TotalQty || 0}</span>
                    </td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '12px'
                      }}>
                        <span style={{
                          padding: '4px 10px',
                          fontSize: '10px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #10b981',
                          background: '#f0fdf4',
                          color: '#10b981'
                        }}>{session.MatchQty || 0}</span>
                    </td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '12px'
                      }}>
                        <span style={{
                          padding: '4px 10px',
                          fontSize: '10px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #ef4444',
                          background: '#fef2f2',
                          color: '#ef4444'
                        }}>{session.UnmatchQty || 0}</span>
                    </td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '12px',
                        position: 'sticky',
                        right: 0,
                        background: globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                        zIndex: 5,
                        borderLeft: '2px solid #e5e7eb'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f1f5f9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
                      }}
                      >
                        <button 
                          onClick={() => handleViewSession(session)}
                          style={{
                            padding: '4px 12px',
                            fontSize: '10px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #3b82f6',
                            background: '#ffffff',
                            color: '#3b82f6',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#3b82f6';
                            e.target.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#ffffff';
                            e.target.style.color = '#3b82f6';
                          }}
                              title="View Session Details"
                        >
                          <FaEye /> View
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
                      background: currentPage === page ? '#3b82f6' : '#ffffff',
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
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
                <button
                  onClick={handlePageInputSubmit}
                  disabled={!pageInput || pageInput === ''}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #3b82f6',
                    background: (!pageInput || pageInput === '') ? '#f1f5f9' : '#ffffff',
                    color: (!pageInput || pageInput === '') ? '#94a3b8' : '#3b82f6',
                    cursor: (!pageInput || pageInput === '') ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (pageInput && pageInput !== '') {
                      e.target.style.background = '#3b82f6';
                      e.target.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (pageInput && pageInput !== '') {
                      e.target.style.background = '#ffffff';
                      e.target.style.color = '#3b82f6';
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
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
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
                  <FaSpinner className="fa-spin" style={{ color: '#3b82f6', fontSize: '32px' }} />
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
                          color: '#8b5cf6',
                          background: '#ffffff',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #e9d5ff'
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
                          border: '1px solid #3b82f6',
                          background: '#eff6ff',
                          color: '#3b82f6',
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
                    border: '1px solid #3b82f6',
                    background: '#3b82f6',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#2563eb';
                    e.target.style.borderColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#3b82f6';
                    e.target.style.borderColor = '#3b82f6';
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
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
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
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#0f172a',
                  lineHeight: '1.2',
                  letterSpacing: '-0.025em'
                }}>Consolidated Stock Report</h2>
                <div style={{
                  fontSize: '13px',
                  color: '#64748b',
                  marginTop: '4px',
                  fontWeight: 500
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
                    // Reset view and fetch new data when date changes
                    setCurrentView('branches');
                    setSelectedBranchForView(null);
                    setSelectedCategory(null);
                    setBranchDetails({});
                    setCategoryDetails({});
                    setBranchPage(1);
                    setCategoryPage(1);
                    setProductPage(1);
                    // Fetch data for the new date
                    if (clientCode) {
                      fetchConsolidationReport({ 
                        ClientCode: clientCode, 
                        ReportDate: newDate 
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
                    setCurrentView('branches');
                    setSelectedBranchForView(null);
                    setSelectedCategory(null);
                    setBranchDetails({});
                    setCategoryDetails({});
                    setBranchPage(1);
                    setCategoryPage(1);
                    setProductPage(1);
                    fetchConsolidationReport();
                  }}
                  disabled={consolidationLoading}
                  style={{
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#475569',
                    cursor: consolidationLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    opacity: consolidationLoading ? 0.7 : 1,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
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
                  {consolidationLoading ? 'Refreshing...' : 'Refresh Data'}
                </button>
                <button 
                  onClick={exportConsolidationReport}
                  style={{
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 6px 8px -1px rgba(16, 185, 129, 0.3), 0 3px 6px -1px rgba(16, 185, 129, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)';
                  }}
                >
                  <FaFileExcel /> Export Excel
                </button>
              </div>
            </div>
          </div>

          {/* Combine Report Content */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #f1f5f9',
            overflow: 'hidden'
          }}>
            {consolidationLoading ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ 
                  display: 'inline-block', 
                  padding: '16px', 
                  borderRadius: '50%', 
                  background: '#eff6ff', 
                  marginBottom: '16px' 
                }}>
                  <FaSpinner className="fa-spin" style={{ fontSize: '32px', color: '#3b82f6' }} />
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
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#2563eb'}
                  onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
                >
                  Retry Request
                </button>
              </div>
            ) : consolidationData && (consolidationData.Branches || consolidationData.Totals) ? (
              <>
                {/* Summary Totals - Modern Dashboard Cards */}
                {consolidationData.Totals && currentView === 'branches' && (
                  <div style={{ 
                    padding: '24px', 
                    background: '#ffffff', 
                    borderBottom: '1px solid #f1f5f9',
                    marginBottom: '20px'
                  }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '20px' 
                  }}>
                      
                      {/* Total Inventory Card */}
                      <div style={{ 
                        background: '#f0f9ff', 
                        borderRadius: '12px', 
                        padding: '20px', 
                        border: '1px solid #e0f2fe',
                        boxShadow: '0 2px 4px rgba(14, 165, 233, 0.05)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1 }}>
                          <FaBoxes size={80} color="#0ea5e9" />
                        </div>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Inventory</h4>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: '#0284c7', lineHeight: 1 }}>
                          {consolidationData.Totals.TotalInventoryQty?.toLocaleString() ?? 0}
                      </div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', fontWeight: 500 }}>
                          {consolidationData.Totals.TotalInventoryWeight?.toLocaleString() ?? 0} g
                        </div>
                      </div>

                      {/* Matched Qty Card */}
                      <div style={{ 
                        background: '#f0fdfa', 
                        borderRadius: '12px', 
                        padding: '20px', 
                        border: '1px solid #ccfbf1',
                        boxShadow: '0 2px 4px rgba(20, 184, 166, 0.05)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1 }}>
                          <FaCheckCircle size={80} color="#14b8a6" />
                        </div>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0f766e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Matched Qty</h4>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: '#0d9488', lineHeight: 1 }}>
                        {consolidationData.Totals.MatchedQty?.toLocaleString() ?? 0}
                      </div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', fontWeight: 500 }}>
                          {consolidationData.Totals.TotalMatchWeight?.toLocaleString() ?? 0} g
                    </div>
                      </div>

                      {/* Unmatched Qty Card */}
                      <div style={{ 
                        background: '#fff7ed', 
                        borderRadius: '12px', 
                        padding: '20px', 
                        border: '1px solid #ffedd5',
                        boxShadow: '0 2px 4px rgba(249, 115, 22, 0.05)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1 }}>
                          <FaTimesCircle size={80} color="#f97316" />
                    </div>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#c2410c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unmatch Qty</h4>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: '#ea580c', lineHeight: 1 }}>
                          {consolidationData.Totals.UnmatchQty?.toLocaleString() ?? 0}
                      </div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', fontWeight: 500 }}>
                          {consolidationData.Totals.TotalUnmatchWeight?.toLocaleString() ?? 0} g
                    </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Consolidated Tree View */}
                <ConsolidatedTreeView 
                    branches={consolidationData.Branches || []}
                />
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
