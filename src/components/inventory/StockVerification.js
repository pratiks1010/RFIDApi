import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useLoading } from '../../App';

const StockVerification = () => {
  // Global loader
  const { setLoading } = useLoading();
  
  // State Management
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'SessionNumber', direction: 'desc' });
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
  const [tableItemsPerPage] = useState(10);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [pageInput, setPageInput] = useState('');
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
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
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
  }, [sessions, searchQuery, dateFrom, dateTo]);

  // Sorting logic
  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
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
    setShowDetailsSlider(true);
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
              placeholder="Search by session ID or batch..."
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
              {(dateFrom || dateTo) && (
                <div style={{
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '12px',
                  color: '#64748b'
                }}>
                  Filtering by: {dateFrom ? `From ${dateFrom}` : ''} {dateTo ? `To ${dateTo}` : ''}
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
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Session Number</th>
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
                      }}>{session.SessionNumber || globalIndex + 1}</td>
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
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        padding: '12px 16px',
                        background: '#f0fdf4',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <FaCheckCircle style={{ color: '#10b981', fontSize: '14px' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Matched Items</span>
                        <span style={{
                          fontSize: '10px',
                          color: '#64748b',
                          background: '#d1fae5',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          marginLeft: 'auto'
                        }}>{sessionDetails.MatchedList?.length || 0} items</span>
                          </div>
                      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 500px)', minHeight: '300px' }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '12px'
                        }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>Item Code</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>Product Name</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>Category</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Gross Wt</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Pieces</th>
                    </tr>
                  </thead>
                  <tbody>
                                {sessionDetails.MatchedList?.length === 0 ? (
                                  <tr>
                                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                  No matched items
                                    </td>
                      </tr>
                                ) : (
                              getPaginatedData(sessionDetails.MatchedList || [], matchedPage, tableItemsPerPage).map((item, index) => {
                                const globalIndex = (matchedPage - 1) * tableItemsPerPage + index;
                                return (
                                  <tr
                                    key={item.Id || index}
                                    style={{
                                      borderBottom: '1px solid #e5e7eb',
                                      background: globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc'}
                                  >
                                    <td style={{ padding: '10px', fontSize: '12px', color: '#1e293b', whiteSpace: 'nowrap' }}>{item.ItemCode || 'N/A'}</td>
                                    <td style={{ padding: '10px', fontSize: '12px', color: '#1e293b', whiteSpace: 'nowrap' }}>{item.ProductName || 'N/A'}</td>
                                    <td style={{ padding: '10px', fontSize: '12px', color: '#1e293b', whiteSpace: 'nowrap' }}>{item.CategoryName || 'N/A'}</td>
                                    <td style={{ padding: '10px', fontSize: '12px', color: '#1e293b', textAlign: 'center', whiteSpace: 'nowrap' }}>{item.GrossWeight || 0}g</td>
                                    <td style={{ padding: '10px', fontSize: '12px', color: '#1e293b', textAlign: 'center', whiteSpace: 'nowrap' }}>{item.Quantity || 0}</td>
                                    </tr>
                                );
                              })
                                )}
                        </tbody>
                      </table>
                          </div>
                          {/* Matched Items Pagination */}
                          {sessionDetails.MatchedList && sessionDetails.MatchedList.length > tableItemsPerPage && (
                        <div style={{
                          padding: '12px 16px',
                          borderTop: '1px solid #e5e7eb',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                            Showing {((matchedPage - 1) * tableItemsPerPage) + 1} to {Math.min(matchedPage * tableItemsPerPage, sessionDetails.MatchedList.length)} of {sessionDetails.MatchedList.length} items
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                                <button 
                                  onClick={() => setMatchedPage(prev => Math.max(1, prev - 1))}
                                  disabled={matchedPage === 1}
                              style={{
                                padding: '4px 10px',
                                fontSize: '10px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid #10b981',
                                background: matchedPage === 1 ? '#f1f5f9' : '#ffffff',
                                color: matchedPage === 1 ? '#94a3b8' : '#10b981',
                                cursor: matchedPage === 1 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (matchedPage !== 1) {
                                  e.target.style.background = '#10b981';
                                  e.target.style.color = '#ffffff';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (matchedPage !== 1) {
                                  e.target.style.background = '#ffffff';
                                  e.target.style.color = '#10b981';
                                }
                              }}
                            >
                              Previous
                                </button>
                            <span style={{
                              padding: '4px 10px',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#475569'
                            }}>
                                  {matchedPage} / {getTotalPages(sessionDetails.MatchedList, tableItemsPerPage)}
                                </span>
                                <button 
                                  onClick={() => setMatchedPage(prev => Math.min(getTotalPages(sessionDetails.MatchedList, tableItemsPerPage), prev + 1))}
                                  disabled={matchedPage === getTotalPages(sessionDetails.MatchedList, tableItemsPerPage)}
                              style={{
                                padding: '4px 10px',
                                fontSize: '10px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid #10b981',
                                background: matchedPage === getTotalPages(sessionDetails.MatchedList, tableItemsPerPage) ? '#f1f5f9' : '#ffffff',
                                color: matchedPage === getTotalPages(sessionDetails.MatchedList, tableItemsPerPage) ? '#94a3b8' : '#10b981',
                                cursor: matchedPage === getTotalPages(sessionDetails.MatchedList, tableItemsPerPage) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (matchedPage !== getTotalPages(sessionDetails.MatchedList, tableItemsPerPage)) {
                                  e.target.style.background = '#10b981';
                                  e.target.style.color = '#ffffff';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (matchedPage !== getTotalPages(sessionDetails.MatchedList, tableItemsPerPage)) {
                                  e.target.style.background = '#ffffff';
                                  e.target.style.color = '#10b981';
                                }
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
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        padding: '12px 16px',
                        background: '#fef2f2',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <FaTimesCircle style={{ color: '#ef4444', fontSize: '14px' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Unmatched Items</span>
                        <span style={{
                          fontSize: '10px',
                          color: '#64748b',
                          background: '#fee2e2',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          marginLeft: 'auto'
                        }}>{sessionDetails.UnmatchedList?.length || 0} items</span>
                          </div>
                      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 500px)', minHeight: '300px' }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '12px'
                        }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>Item Code</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>Product Name</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>Category</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Gross Wt</th>
                              <th style={{ padding: '10px', fontSize: '10px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Pieces</th>
                      </tr>
                        </thead>
                        <tbody>
                                {sessionDetails.UnmatchedList?.length === 0 ? (
                                  <tr>
                                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                  No unmatched items
                                    </td>
                            </tr>
                                ) : (
                              getPaginatedData(sessionDetails.UnmatchedList || [], unmatchedPage, tableItemsPerPage).map((item, index) => {
                                const globalIndex = (unmatchedPage - 1) * tableItemsPerPage + index;
                                return (
                                  <tr
                                    key={item.Id || index}
                                    style={{
                                      borderBottom: '1px solid #e5e7eb',
                                      background: globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc'}
                                  >
                                    <td style={{ padding: '10px', fontSize: '12px', color: '#1e293b', whiteSpace: 'nowrap' }}>{item.ItemCode || 'N/A'}</td>
                                    <td style={{ padding: '10px', fontSize: '12px', color: '#1e293b', whiteSpace: 'nowrap' }}>{item.ProductName || 'N/A'}</td>
                                    <td style={{ padding: '10px', fontSize: '12px', color: '#1e293b', whiteSpace: 'nowrap' }}>{item.CategoryName || 'N/A'}</td>
                                    <td style={{ padding: '10px', fontSize: '12px', color: '#1e293b', textAlign: 'center', whiteSpace: 'nowrap' }}>{item.GrossWeight || 0}g</td>
                                    <td style={{ padding: '10px', fontSize: '12px', color: '#1e293b', textAlign: 'center', whiteSpace: 'nowrap' }}>{item.Quantity || 0}</td>
                                    </tr>
                                );
                              })
                                )}
                  </tbody>
                </table>
              </div>
                          {/* Unmatched Items Pagination */}
                          {sessionDetails.UnmatchedList && sessionDetails.UnmatchedList.length > tableItemsPerPage && (
                        <div style={{
                          padding: '12px 16px',
                          borderTop: '1px solid #e5e7eb',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                            Showing {((unmatchedPage - 1) * tableItemsPerPage) + 1} to {Math.min(unmatchedPage * tableItemsPerPage, sessionDetails.UnmatchedList.length)} of {sessionDetails.UnmatchedList.length} items
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                                  onClick={() => setUnmatchedPage(prev => Math.max(1, prev - 1))}
                                  disabled={unmatchedPage === 1}
                              style={{
                                padding: '4px 10px',
                                fontSize: '10px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid #ef4444',
                                background: unmatchedPage === 1 ? '#f1f5f9' : '#ffffff',
                                color: unmatchedPage === 1 ? '#94a3b8' : '#ef4444',
                                cursor: unmatchedPage === 1 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (unmatchedPage !== 1) {
                                  e.target.style.background = '#ef4444';
                                  e.target.style.color = '#ffffff';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (unmatchedPage !== 1) {
                                  e.target.style.background = '#ffffff';
                                  e.target.style.color = '#ef4444';
                                }
                              }}
                            >
                              Previous
                                </button>
                            <span style={{
                              padding: '4px 10px',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#475569'
                            }}>
                                  {unmatchedPage} / {getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage)}
                                </span>
                        <button 
                                  onClick={() => setUnmatchedPage(prev => Math.min(getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage), prev + 1))}
                                  disabled={unmatchedPage === getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage)}
                              style={{
                                padding: '4px 10px',
                                fontSize: '10px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid #ef4444',
                                background: unmatchedPage === getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage) ? '#f1f5f9' : '#ffffff',
                                color: unmatchedPage === getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage) ? '#94a3b8' : '#ef4444',
                                cursor: unmatchedPage === getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (unmatchedPage !== getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage)) {
                                  e.target.style.background = '#ef4444';
                                  e.target.style.color = '#ffffff';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (unmatchedPage !== getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage)) {
                                  e.target.style.background = '#ffffff';
                                  e.target.style.color = '#ef4444';
                                }
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
