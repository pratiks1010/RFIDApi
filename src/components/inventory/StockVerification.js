import React, { useState, useEffect, useRef } from 'react';
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
  FaChevronRight
} from 'react-icons/fa';
import { useNotifications } from '../../context/NotificationContext';
import { useTranslation } from '../../hooks/useTranslation';

const StockVerification = () => {
  // State Management
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'SessionNumber', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalSessions, setTotalSessions] = useState(0);
  const [userInfo, setUserInfo] = useState({});
  const [clientCode, setClientCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [matchedPage, setMatchedPage] = useState(1);
  const [unmatchedPage, setUnmatchedPage] = useState(1);
  const [tableItemsPerPage] = useState(10);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const isInitialMount = useRef(true);

  const { addNotification } = useNotifications();
  const { t } = useTranslation();

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

  // Handle date filter reset
  const handleResetDateFilters = () => {
    setDateFrom('');
    setDateTo('');
    setShowFilterPanel(false);
  };

  // Handle apply date filters
  const handleApplyDateFilters = () => {
    setShowFilterPanel(false);
    // The useEffect will trigger fetchSessions when dateFrom/dateTo change
  };

  // Search and filter logic
  const filteredSessions = sessions.filter(session => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = (
        session.ScanBatchId?.toLowerCase().includes(searchLower) ||
        session.SessionNumber?.toString().includes(searchLower) ||
        new Date(session.StartedOn).toLocaleDateString().includes(searchLower) ||
        new Date(session.EndedOn).toLocaleDateString().includes(searchLower)
      );
      if (!matchesSearch) return false;
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

  // Sorting logic
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
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

  // Pagination logic
  const totalPages = Math.ceil(sortedSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSessions = sortedSessions.slice(startIndex, startIndex + itemsPerPage);

  // Handle sorting
  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

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

  // Handle view session details
  const handleViewSession = (session) => {
    console.log('View session:', session);
    setMatchedPage(1);
    setUnmatchedPage(1);
    setShowDetailsModal(true);
    fetchSessionDetails(session.ScanBatchId);
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
          'Gross Weight (g)',
          'Pieces',
          'Net Weight (g)',
          'Status'
        ];

        const matchedData = sessionDetails.MatchedList.map(item => [
          item.ItemCode || 'N/A',
          item.ProductName || 'N/A',
          item.CategoryName || 'N/A',
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
          'Gross Weight (g)',
          'Pieces',
          'Net Weight (g)',
          'Status'
        ];

        const unmatchedData = sessionDetails.UnmatchedList.map(item => [
          item.ItemCode || 'N/A',
          item.ProductName || 'N/A',
          item.CategoryName || 'N/A',
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

  // Loading state
  if (loading) {
    return (
      <div className="container-fluid p-4">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
          <div className="text-center">
            <FaSpinner className="fa-spin mb-3 text-primary" style={{ fontSize: '48px' }} />
            <h5 className="text-muted">{t('stockVerification.loading')}</h5>
            <p className="text-muted">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="container-fluid p-3">
      <style>
        {`
          .table-responsive {
            position: relative;
          }
          .table-responsive table {
            position: relative;
            font-size: 12px;
          }
          .table-responsive th {
            font-size: 12px;
            font-weight: 500;
          }
          .table-responsive td {
            font-size: 12px;
          }
        `}
      </style>

      {/* Compact Header */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body p-3">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="d-flex align-items-center">
                <div className="bg-primary rounded-3 p-2 me-3">
                  <FaClipboardCheck className="text-white" style={{ fontSize: '20px' }} />
                </div>
                <div>
                  <h5 className="mb-1 fw-bold text-dark">{t('stockVerification.title')}</h5>
                  <p className="mb-0 text-muted small">{t('stockVerification.description')}</p>
                  <span className="badge bg-primary mt-1">{totalSessions} {t('stockVerification.sessions')}</span>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex align-items-center justify-content-end gap-2">
                <div className="d-flex gap-2 me-3">
                  <div className="card border-0 bg-light" style={{ minWidth: '120px' }}>
                    <div className="card-body p-2 text-center">
                      <div className="d-flex align-items-center justify-content-center mb-1">
                        <FaCheckCircle className="text-success me-1" style={{ fontSize: '14px' }} />
                        <small className="text-muted fw-bold">{t('stockVerification.activeSessions')}</small>
                    </div>
                      <div className="fw-bold text-success">{totalSessions}</div>
              </div>
            </div>
                  <div className="card border-0 bg-light" style={{ minWidth: '120px' }}>
                    <div className="card-body p-2 text-center">
                      <div className="d-flex align-items-center justify-content-center mb-1">
                        <FaLayerGroup className="text-primary me-1" style={{ fontSize: '14px' }} />
                        <small className="text-muted fw-bold">{t('stockVerification.totalBatches')}</small>
          </div>
                      <div className="fw-bold text-primary">{totalSessions}</div>
        </div>
      </div>
            </div>
                <button 
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className={`btn btn-sm ${showFilterPanel ? 'btn-primary' : 'btn-outline-primary'}`}
                >
                  <FaFilter className="me-1" />
                  Filter
                </button>
                                    <button 
                  onClick={handleRefresh}
                  className="btn btn-outline-primary btn-sm"
                  disabled={refreshing}
                >
                  <FaSpinner className={`me-1 ${refreshing ? 'fa-spin' : ''}`} />
                  {refreshing ? t('common.refreshing') : t('common.refresh')}
                </button>
          </div>
        </div>
            </div>
          </div>
        </div>

      {/* Date Filter Panel */}
      {showFilterPanel && (
        <div className="card shadow-sm border-0 mb-3">
          <div className="card-header bg-light d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-bold">
              <FaCalendarAlt className="me-2" />
              Date Filter Options
            </h6>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setShowFilterPanel(false)}
            ></button>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label small fw-bold">From Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo || undefined}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">To Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                />
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <div className="d-flex gap-2 w-100">
                  <button 
                    className="btn btn-outline-secondary btn-sm flex-fill" 
                    onClick={handleResetDateFilters}
                  >
                    Reset
                  </button>
                  <button 
                    className="btn btn-primary btn-sm flex-fill" 
                    onClick={handleApplyDateFilters}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
            {(dateFrom || dateTo) && (
              <div className="mt-2">
                <small className="text-muted">
                  Filtering by: {dateFrom ? `From ${dateFrom}` : ''} {dateTo ? `To ${dateTo}` : ''}
                </small>
              </div>
            )}
          </div>
        </div>
      )}

            {/* Sessions Table */}
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm border-0 mb-3">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <FaClipboardCheck className="text-primary me-2" />
                <h6 className="mb-0 fw-bold">{t('stockVerification.verificationSessions')}</h6>
                <span className="badge bg-primary ms-2">{filteredSessions.length} {t('common.items')}</span>
            </div>
              <div className="position-relative">
                <FaSearch className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: '14px' }} />
                <input
                  type="text"
                  className="form-control form-control-sm ps-4"
                  placeholder={t('stockVerification.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '240px' }}
                />
          </div>
        </div>

        <div className="card-body p-0">
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="table table-hover table-sm mb-0" style={{ minWidth: '800px' }}>
                  <thead className="table-light">
                <tr>
                  <th>{t('stockVerification.sessionNumber')}</th>
                  <th>{t('common.batchId')}</th>
                  <th>{t('stockVerification.startedOn')}</th>
                  <th>{t('stockVerification.endedOn')}</th>
                  <th>{t('common.totalQty')}</th>
                      <th>{t('stockVerification.matchedItems')}</th>
                      <th>{t('stockVerification.unmatchedItems')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            <div className="spinner-border spinner-border-sm text-primary" role="status">
                              <span className="visually-hidden">Loading...</span>
            </div>
                            <span className="text-muted small">{t('stockVerification.sessionsLoaded')}</span>
        </div>
                    </td>
                      </tr>
                    ) : currentSessions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          <span className="text-muted small">{t('stockVerification.noSessionsFound')}</span>
                    </td>
                      </tr>
                    ) : (
                      currentSessions.map((session, index) => (
                        <tr key={session.ScanBatchId || index}>
                          <td className="text-nowrap">{session.SessionNumber || index + 1}</td>
                          <td className="text-nowrap">
                            {session.ScanBatchId ? session.ScanBatchId.substring(0, 8) + '...' : 'N/A'}
                    </td>
                          <td className="text-nowrap">
                            {session.StartedOn ? formatDate(session.StartedOn) : 'N/A'}
                    </td>
                          <td className="text-nowrap">
                            {session.EndedOn ? formatDate(session.EndedOn) : 'N/A'}
                    </td>
                          <td className="text-nowrap">
                            <button className="btn btn-sm btn-outline-primary">
                              {session.TotalQty || 0}
                            </button>
                    </td>
                          <td className="text-nowrap">
                            <button className="btn btn-sm btn-outline-success">
                              {session.MatchQty || 0}
                            </button>
                    </td>
                          <td className="text-nowrap">
                            <button className="btn btn-sm btn-outline-danger">
                              {session.UnmatchQty || 0}
                            </button>
                    </td>
                    <td>
                        <button 
                              className="btn btn-sm btn-outline-primary"
                          onClick={() => handleViewSession(session)}
                              title="View Session Details"
                        >
                              <FaEye className="me-1" />
                              {t('common.view')}
                        </button>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-3 border-top">
              <div className="small text-muted">
                    {t('pagination.showing')} {((currentPage - 1) * itemsPerPage) + 1} {t('pagination.to')} {Math.min(currentPage * itemsPerPage, filteredSessions.length)} {t('pagination.of')} {filteredSessions.length} {t('pagination.entries')}
              </div>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
          </div>
        </div>
          </div>
        </div>

      {/* Session Details Modal */}
      {showDetailsModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
          <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable" style={{ maxWidth: '95vw', margin: '1rem auto' }}>
            <div className="modal-content border-0 shadow-lg" style={{ maxHeight: '85vh' }}>
                            <div className="modal-header bg-primary text-white border-0 flex-shrink-0">
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="d-flex align-items-center flex-grow-1">
                    <FaClipboardCheck className="me-2 d-none d-sm-inline" style={{ fontSize: '20px' }} />
                    <h5 className="modal-title mb-0 fw-bold">
                      {sessionDetails ? `${t('stockVerification.sessionDetails')} ${sessionDetails.SessionNumber}` : t('stockVerification.sessionDetails')}
                    </h5>
              </div>
                <button 
                  type="button" 
                    className="btn-close btn-close-white flex-shrink-0" 
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSessionDetails(null);
                    }}
                    style={{ marginLeft: '1rem' }}
                ></button>
            </div>
              </div>
              
              <div className="modal-body p-0">
                {detailsLoading ? (
                  <div className="d-flex justify-content-center align-items-center py-5">
                    <div className="text-center">
                      <FaSpinner className="fa-spin mb-3 text-primary" style={{ fontSize: '32px' }} />
                      <p className="text-muted">{t('stockVerification.loading')}</p>
                    </div>
                  </div>
                ) : sessionDetails ? (
                  <>
                {/* Session Summary */}
                    <div className="p-3 bg-light border-bottom">
                      <div className="row g-2 align-items-center">
                        <div className="col-12 col-md-4">
                          <div className="d-flex align-items-center">
                            <h6 className="text-muted small mb-0 me-2">Batch ID:</h6>
                            <code className="bg-white px-2 py-1 rounded text-primary" style={{ fontSize: '0.75rem' }}>
                              {sessionDetails.ScanBatchId?.substring(0, 12)}...
                            </code>
                    </div>
                  </div>
                        <div className="col-12 col-md-8">
                          <div className="d-flex flex-wrap gap-3 justify-content-md-end">
                            <div className="text-center">
                              <h6 className="text-muted small mb-1">Total Items</h6>
                              <span className="badge bg-primary px-2 py-1">
                                {sessionDetails.Totals?.TotalQty || 0}
                              </span>
                    </div>
                            <div className="text-center">
                              <h6 className="text-muted small mb-1">Matched</h6>
                              <span className="badge bg-success px-2 py-1">
                                {sessionDetails.Totals?.TotalMatchQty || 0}
                              </span>
                  </div>
                            <div className="text-center">
                              <h6 className="text-muted small mb-1">Unmatched</h6>
                              <span className="badge bg-danger px-2 py-1">
                                {sessionDetails.Totals?.TotalUnmatchQty || 0}
                              </span>
                    </div>
                            <div className="text-center">
                              <h6 className="text-muted small mb-1">Total Weight</h6>
                              <span className="fw-bold text-dark">
                                {sessionDetails.Totals?.TotalGrossWeight || 0}g
                              </span>
                  </div>
                      </div>
                        </div>
                    </div>
                </div>

                                        {/* Tables Container */}
                    <div className="row g-0">
                {/* Matched Items Table */}
                      <div className="col-12 col-lg-6">
                        <div className="p-3 border-end border-lg-end-0 border-bottom border-lg-bottom-0">
                          <div className="d-flex align-items-center mb-3">
                            <FaCheckCircle className="text-success me-2" />
                            <h6 className="mb-0 fw-bold">{t('stockVerification.matchedItems')}</h6>
                            <span className="badge bg-success ms-2">
                              {sessionDetails.MatchedList?.length || 0}
                            </span>
                          </div>
                          
                          <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            <table className="table table-hover table-sm mb-0">
                              <thead className="table-success sticky-top">
                          <tr>
                            <th>{t('invoiceStock.itemCode')}</th>
                            <th>{t('invoiceStock.productName')}</th>
                            <th>{t('invoiceStock.categoryName')}</th>
                                  <th>{t('invoiceStock.grossWt')}</th>
                                  <th>{t('invoiceStock.pieces')}</th>
                    </tr>
                  </thead>
                  <tbody>
                                {sessionDetails.MatchedList?.length === 0 ? (
                                  <tr>
                                    <td colSpan="5" className="text-center py-3">
                                      <span className="text-muted small">{t('common.noData')}</span>
                                    </td>
                      </tr>
                                ) : (
                                  getPaginatedData(sessionDetails.MatchedList || [], matchedPage, tableItemsPerPage).map((item, index) => (
                                    <tr key={item.Id || index}>
                                      <td className="text-nowrap small">{item.ItemCode || 'N/A'}</td>
                                      <td className="text-nowrap small">{item.ProductName || 'N/A'}</td>
                                      <td className="text-nowrap small">{item.CategoryName || 'N/A'}</td>
                                      <td className="text-nowrap small">{item.GrossWeight || 0}g</td>
                                      <td className="text-nowrap small">{item.Quantity || 0}</td>
                                    </tr>
                                  ))
                                )}
                        </tbody>
                      </table>
                          </div>
                          
                          {/* Matched Items Pagination */}
                          {sessionDetails.MatchedList && sessionDetails.MatchedList.length > tableItemsPerPage && (
                            <div className="d-flex justify-content-between align-items-center mt-2 px-2">
                              <small className="text-muted">
                                {t('pagination.showing')} {((matchedPage - 1) * tableItemsPerPage) + 1} {t('pagination.to')} {Math.min(matchedPage * tableItemsPerPage, sessionDetails.MatchedList.length)} {t('pagination.of')} {sessionDetails.MatchedList.length} {t('common.items')}
                              </small>
                              <div className="btn-group btn-group-sm">
                                <button 
                                  className="btn btn-outline-success"
                                  onClick={() => setMatchedPage(prev => Math.max(1, prev - 1))}
                                  disabled={matchedPage === 1}
                                >
                                  <FaChevronLeft />
                                </button>
                                <span className="btn btn-outline-success disabled">
                                  {matchedPage} / {getTotalPages(sessionDetails.MatchedList, tableItemsPerPage)}
                                </span>
                                <button 
                                  className="btn btn-outline-success"
                                  onClick={() => setMatchedPage(prev => Math.min(getTotalPages(sessionDetails.MatchedList, tableItemsPerPage), prev + 1))}
                                  disabled={matchedPage === getTotalPages(sessionDetails.MatchedList, tableItemsPerPage)}
                                >
                                  <FaChevronRight />
                                </button>
                    </div>
                  </div>
                )}
                  </div>
                      </div>

                {/* Unmatched Items Table */}
                      <div className="col-12 col-lg-6">
                        <div className="p-3">
                          <div className="d-flex align-items-center mb-3">
                            <FaTimesCircle className="text-danger me-2" />
                            <h6 className="mb-0 fw-bold">{t('stockVerification.unmatchedItems')}</h6>
                            <span className="badge bg-danger ms-2">
                              {sessionDetails.UnmatchedList?.length || 0}
                            </span>
                          </div>
                          
                                                    <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            <table className="table table-hover table-sm mb-0">
                              <thead className="table-danger sticky-top">
                          <tr>
                            <th>{t('invoiceStock.itemCode')}</th>
                            <th>{t('invoiceStock.productName')}</th>
                            <th>{t('invoiceStock.categoryName')}</th>
                                  <th>{t('invoiceStock.grossWt')}</th>
                                  <th>{t('invoiceStock.pieces')}</th>
                      </tr>
                        </thead>
                        <tbody>
                                {sessionDetails.UnmatchedList?.length === 0 ? (
                                  <tr>
                                    <td colSpan="5" className="text-center py-3">
                                      <span className="text-muted small">{t('common.noData')}</span>
                                    </td>
                            </tr>
                                ) : (
                                  getPaginatedData(sessionDetails.UnmatchedList || [], unmatchedPage, tableItemsPerPage).map((item, index) => (
                                    <tr key={item.Id || index}>
                                      <td className="text-nowrap small">{item.ItemCode || 'N/A'}</td>
                                      <td className="text-nowrap small">{item.ProductName || 'N/A'}</td>
                                      <td className="text-nowrap small">{item.CategoryName || 'N/A'}</td>
                                      <td className="text-nowrap small">{item.GrossWeight || 0}g</td>
                                      <td className="text-nowrap small">{item.Quantity || 0}</td>
                                    </tr>
                                  ))
                                )}
                  </tbody>
                </table>
              </div>
                          
                          {/* Unmatched Items Pagination */}
                          {sessionDetails.UnmatchedList && sessionDetails.UnmatchedList.length > tableItemsPerPage && (
                            <div className="d-flex justify-content-between align-items-center mt-2 px-2">
                              <small className="text-muted">
                                {t('pagination.showing')} {((unmatchedPage - 1) * tableItemsPerPage) + 1} {t('pagination.to')} {Math.min(unmatchedPage * tableItemsPerPage, sessionDetails.UnmatchedList.length)} {t('pagination.of')} {sessionDetails.UnmatchedList.length} {t('common.items')}
                              </small>
                              <div className="btn-group btn-group-sm">
                <button 
                                  className="btn btn-outline-danger"
                                  onClick={() => setUnmatchedPage(prev => Math.max(1, prev - 1))}
                                  disabled={unmatchedPage === 1}
                                >
                                  <FaChevronLeft />
                                </button>
                                <span className="btn btn-outline-danger disabled">
                                  {unmatchedPage} / {getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage)}
                                </span>
                        <button 
                                  className="btn btn-outline-danger"
                                  onClick={() => setUnmatchedPage(prev => Math.min(getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage), prev + 1))}
                                  disabled={unmatchedPage === getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage)}
                        >
                                  <FaChevronRight />
                        </button>
          </div>
        </div>
                          )}
                  </div>
                </div>
          </div>

                                        {/* Detailed Information */}
                    {(sessionDetails.MatchedList?.length > 0 || sessionDetails.UnmatchedList?.length > 0) && (
                      <div className="p-3 p-md-4 bg-light border-top">
                        <h6 className="fw-bold mb-3">Additional Details</h6>
                        <div className="row g-3">
                          <div className="col-12 col-lg-6">
                      <div className="table-responsive">
                              <table className="table table-sm">
                                <tbody>
                                  <tr>
                                    <td><strong>Client Code:</strong></td>
                                    <td className="text-break">{sessionDetails.ClientCode}</td>
                            </tr>
                                  <tr>
                                    <td><strong>Session Number:</strong></td>
                                    <td>{sessionDetails.SessionNumber}</td>
                                  </tr>
                                  <tr>
                                    <td><strong>Total Sessions:</strong></td>
                                    <td>{sessionDetails.TotalSessions}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div className="col-12 col-lg-6">
                            <div className="table-responsive">
                              <table className="table table-sm">
                          <tbody>
                                  <tr>
                                    <td><strong>Total Gross Weight:</strong></td>
                                    <td>{sessionDetails.Totals?.TotalGrossWeight || 0}g</td>
                              </tr>
                                  <tr>
                                    <td><strong>Total Net Weight:</strong></td>
                                    <td>{sessionDetails.Totals?.TotalNetWeight || 0}g</td>
                                  </tr>
                                  <tr>
                                    <td><strong>Match Weight:</strong></td>
                                    <td>{sessionDetails.Totals?.TotalMatchGrossWeight || 0}g</td>
                                  </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                </div>
              </div>
                    )}
                    </>
                  ) : (
                  <div className="text-center py-5">
                    <FaExclamationTriangle className="text-warning mb-3" style={{ fontSize: '48px' }} />
                    <h5 className="text-muted">No Data Available</h5>
                    <p className="text-muted">Unable to load session details.</p>
                </div>
              )}
              </div>

                            <div className="modal-footer border-0 flex-shrink-0">
                <div className="d-flex flex-column flex-sm-row gap-2 w-100 justify-content-end">
                    <button
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSessionDetails(null);
                    }}
                  >
                    {t('common.close')}
                    </button>
                  {sessionDetails && (
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={exportSessionDetails}
                    >
                      <FaFileExcel className="me-2 d-none d-sm-inline" />
                      {t('common.export')} {t('stockVerification.sessionDetails')}
                    </button>
                  )}
                </div>
            </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StockVerification;
