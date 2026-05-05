import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FaSpinner, 
  FaExclamationTriangle,
  FaSync,
  FaFilter,
  FaTimes,
  FaFileExport,
  FaFileExcel,
  FaFilePdf
} from 'react-icons/fa';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useLoading } from '../App';
import { useNotifications } from '../context/NotificationContext';

/** Fixed page size: table body always reserves 15 row slots (padded when fewer). */
const STOCK_REPORT_PAGE_SIZE = 15;

const Reports = () => {
  const { loading, setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  
  const [reportData, setReportData] = useState([]);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  // Get current date in YYYY-MM-DD format for default dates
  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [filterValues, setFilterValues] = useState({
    branch: 'All',
    counterName: 'All',
    categoryId: 'All',
    productId: 'All',
    designId: 'All',
    purityId: 'All',
    dateFrom: getCurrentDate(), // Default to current date
    dateTo: getCurrentDate()    // Default to current date
  });
  const [apiFilterData, setApiFilterData] = useState({
    products: [],
    designs: [],
    categories: [],
    purities: [],
    counters: [],
    branches: []
  });
  const [dropdownStates, setDropdownStates] = useState({
    branch: { isOpen: false, searchTerm: '', filteredOptions: [] },
    counterName: { isOpen: false, searchTerm: '', filteredOptions: [] },
    categoryId: { isOpen: false, searchTerm: '', filteredOptions: [] },
    productId: { isOpen: false, searchTerm: '', filteredOptions: [] },
    designId: { isOpen: false, searchTerm: '', filteredOptions: [] },
    purityId: { isOpen: false, searchTerm: '', filteredOptions: [] }
  });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(storedUserInfo);
        setUserInfo(parsedUserInfo);
      } catch (err) {
        console.error('Error parsing user info:', err);
        setError('Error loading user information');
      }
    }
  }, []);

  useEffect(() => {
    if (userInfo && userInfo.ClientCode) {
      fetchFilterData();
      // Initial fetch will use default filter values
      setTimeout(() => {
        fetchReportDataWithFilters(filterValues);
      }, 100);
    }
  }, [userInfo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [reportData]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterPanel) {
        const filterPanel = document.querySelector('[data-filter-panel]');
        if (filterPanel && !filterPanel.contains(event.target)) {
          closeAllDropdowns();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterPanel]);

  // Function to fetch filter data from APIs
  const fetchFilterData = async () => {
    try {
      const clientCode = userInfo?.ClientCode;
      if (!clientCode) return;

      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const requestBody = { ClientCode: clientCode };

      const [
        productsResponse,
        designsResponse,
        categoriesResponse,
        puritiesResponse,
        countersResponse,
        branchesResponse
      ] = await Promise.all([
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllProductMaster', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllDesign', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllCategory', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllPurity', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllCounters', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllBranchMaster', requestBody, { headers })
      ]);

      const normalizeArray = (data) => {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
          return data.data || data.items || data.results || data.list || [];
        }
        return [];
      };

      const normalizedData = {
        products: normalizeArray(productsResponse.data),
        designs: normalizeArray(designsResponse.data),
        categories: normalizeArray(categoriesResponse.data),
        purities: normalizeArray(puritiesResponse.data),
        counters: normalizeArray(countersResponse.data),
        branches: normalizeArray(branchesResponse.data)
      };

      setApiFilterData(normalizedData);
    } catch (error) {
      console.error('Error fetching filter data:', error);
      setApiFilterData(prev => ({
        products: prev.products.length > 0 ? prev.products : [],
        designs: prev.designs.length > 0 ? prev.designs : [],
        categories: prev.categories.length > 0 ? prev.categories : [],
        purities: prev.purities.length > 0 ? prev.purities : [],
        counters: prev.counters.length > 0 ? prev.counters : [],
        branches: prev.branches.length > 0 ? prev.branches : []
      }));
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      let clientCode = null;
      if (userInfo && userInfo.ClientCode) {
        clientCode = userInfo.ClientCode;
      } else {
        try {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            const parsedUserInfo = JSON.parse(storedUserInfo);
            if (parsedUserInfo && parsedUserInfo.ClientCode) {
              clientCode = parsedUserInfo.ClientCode;
            }
          }
        } catch (err) {
          console.error('Error in fallback userInfo retrieval:', err);
        }
      }

      if (!clientCode) {
        setError('Client code not found. Please login again.');
        setLoading(false);
        return;
      }

      // Helper to get filter ID for API
      const getFilterIdForAPI = (field, value) => {
        if (!value || value === 'All') {
          console.log(`Filter ${field}: Not selected (All), returning 0`);
          return 0;
        }
        
        let selectedItem = null;
        let id = 0;
        
        if (field === 'branch') {
          selectedItem = apiFilterData.branches.find(b => {
            const branchName = b.BranchName || b.Name || b.branchName || b.name || '';
            return branchName === value || branchName.toLowerCase() === value.toLowerCase();
          });
          if (selectedItem) {
            id = parseInt(selectedItem.Id || selectedItem.id || 0);
            console.log(`Filter ${field}: Found branch "${value}" with ID: ${id}`);
          } else {
            console.warn(`Filter ${field}: Branch "${value}" not found in API data`);
          }
        } else if (field === 'counterName') {
          selectedItem = apiFilterData.counters.find(c => {
            const counterName = c.CounterName || c.Name || c.counterName || '';
            return counterName === value || counterName.toLowerCase() === value.toLowerCase();
          });
          if (selectedItem) {
            id = parseInt(selectedItem.Id || selectedItem.id || 0);
            console.log(`Filter ${field}: Found counter "${value}" with ID: ${id}`);
          } else {
            console.warn(`Filter ${field}: Counter "${value}" not found in API data`);
          }
        } else if (field === 'categoryId') {
          selectedItem = apiFilterData.categories.find(c => {
            const categoryName = c.CategoryName || c.Name || c.categoryName || '';
            return categoryName === value || categoryName.toLowerCase() === value.toLowerCase();
          });
          if (selectedItem) {
            id = parseInt(selectedItem.Id || selectedItem.id || 0);
            console.log(`Filter ${field}: Found category "${value}" with ID: ${id}`);
          } else {
            console.warn(`Filter ${field}: Category "${value}" not found in API data`);
          }
        } else if (field === 'productId') {
          selectedItem = apiFilterData.products.find(p => {
            const productName = p.ProductName || p.Name || p.productName || '';
            return productName === value || productName.toLowerCase() === value.toLowerCase();
          });
          if (selectedItem) {
            id = parseInt(selectedItem.Id || selectedItem.id || 0);
            console.log(`Filter ${field}: Found product "${value}" with ID: ${id}`);
          } else {
            console.warn(`Filter ${field}: Product "${value}" not found in API data`);
          }
        } else if (field === 'designId') {
          selectedItem = apiFilterData.designs.find(d => {
            const designName = d.DesignName || d.Name || d.designName || '';
            return designName === value || designName.toLowerCase() === value.toLowerCase();
          });
          if (selectedItem) {
            id = parseInt(selectedItem.Id || selectedItem.id || 0);
            console.log(`Filter ${field}: Found design "${value}" with ID: ${id}`);
          } else {
            console.warn(`Filter ${field}: Design "${value}" not found in API data`);
          }
        } else if (field === 'purityId') {
          selectedItem = apiFilterData.purities.find(p => {
            const purityName = p.PurityName || p.Name || p.Purity || p.purityName || '';
            return purityName === value || purityName.toLowerCase() === value.toLowerCase();
          });
          if (selectedItem) {
            id = parseInt(selectedItem.Id || selectedItem.id || 0);
            console.log(`Filter ${field}: Found purity "${value}" with ID: ${id}`);
          } else {
            console.warn(`Filter ${field}: Purity "${value}" not found in API data`);
          }
        }
        
        return id;
      };

      // Build payload in exact format as required by API
      // Format: ClientCode (string), FromDate (string), ToDate (string), StockType (string), all IDs as numbers (0 if not selected)
      // Note: Dates are always included - use provided date or empty string if not provided
      const payload = {
        ClientCode: clientCode || '',
        FromDate: filterValues.dateFrom && filterValues.dateFrom.trim() !== '' 
          ? filterValues.dateFrom.trim() 
          : '',
        ToDate: filterValues.dateTo && filterValues.dateTo.trim() !== '' 
          ? filterValues.dateTo.trim() 
          : '',
        StockType: 'All',
        PurityId: getFilterIdForAPI('purityId', filterValues.purityId),
        CategoryId: getFilterIdForAPI('categoryId', filterValues.categoryId),
        ProductId: getFilterIdForAPI('productId', filterValues.productId),
        DesignId: getFilterIdForAPI('designId', filterValues.designId),
        CounterId: getFilterIdForAPI('counterName', filterValues.counterName),
        BranchId: getFilterIdForAPI('branch', filterValues.branch)
      };

      // Log payload for debugging - shows all filter IDs
      console.log('=== Stock Report API Payload ===');
      console.log('Filter Values:', filterValues);
      console.log('Final Payload:', JSON.stringify(payload, null, 2));
      console.log('Payload IDs:', {
        BranchId: payload.BranchId,
        CounterId: payload.CounterId,
        CategoryId: payload.CategoryId,
        ProductId: payload.ProductId,
        DesignId: payload.DesignId,
        PurityId: payload.PurityId,
        FromDate: payload.FromDate || 'Not provided',
        ToDate: payload.ToDate || 'Not provided'
      });

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/Reports/StockReportByDesign',
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && Array.isArray(response.data)) {
        setReportData(response.data);
      } else if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
        setReportData(response.data.Data);
      } else {
        setReportData([]);
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch report data');
      setReportData([]);
      addNotification({
        type: 'error',
        message: 'Failed to fetch report data. Please try again.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchReportDataWithFilters(filterValues);
  };

  // Filter handlers - Auto-apply filters when any field changes
  const handleFilterChange = (field, value) => {
    setFilterValues(prev => ({
      ...prev,
      [field]: value
    }));
    // Auto-apply filters when any field changes
    setCurrentPage(1);
    // Use setTimeout to ensure state is updated before fetching
    setTimeout(() => {
      setLoading(true);
      // Get updated filter values
      const updatedFilters = {
        ...filterValues,
        [field]: value
      };
      // Fetch with updated filters
      fetchReportDataWithFilters(updatedFilters);
    }, 100);
  };

  // Separate function to fetch with specific filters
  const fetchReportDataWithFilters = async (filters = filterValues) => {
    try {
      setLoading(true);
      setError(null);

      let clientCode = null;
      if (userInfo && userInfo.ClientCode) {
        clientCode = userInfo.ClientCode;
      } else {
        try {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            const parsedUserInfo = JSON.parse(storedUserInfo);
            if (parsedUserInfo && parsedUserInfo.ClientCode) {
              clientCode = parsedUserInfo.ClientCode;
            }
          }
        } catch (err) {
          console.error('Error in fallback userInfo retrieval:', err);
        }
      }

      if (!clientCode) {
        setError('Client code not found. Please login again.');
        setLoading(false);
        return;
      }

      // Helper to get filter ID for API
      const getFilterIdForAPI = (field, value) => {
        if (!value || value === 'All') {
          return 0;
        }
        
        let selectedItem = null;
        let id = 0;
        
        if (field === 'branch') {
          selectedItem = apiFilterData.branches.find(b => {
            const branchName = b.BranchName || b.Name || b.branchName || b.name || '';
            return branchName === value || branchName.toLowerCase() === value.toLowerCase();
          });
          if (selectedItem) {
            id = parseInt(selectedItem.Id || selectedItem.id || 0);
          }
        } else if (field === 'counterName') {
          selectedItem = apiFilterData.counters.find(c => {
            const counterName = c.CounterName || c.Name || c.counterName || '';
            return counterName === value || counterName.toLowerCase() === value.toLowerCase();
          });
          if (selectedItem) {
            id = parseInt(selectedItem.Id || selectedItem.id || 0);
          }
        } else if (field === 'categoryId') {
          selectedItem = apiFilterData.categories.find(c => {
            const categoryName = c.CategoryName || c.Name || c.categoryName || '';
            return categoryName === value || categoryName.toLowerCase() === value.toLowerCase();
          });
          if (selectedItem) {
            id = parseInt(selectedItem.Id || selectedItem.id || 0);
          }
        } else if (field === 'productId') {
          selectedItem = apiFilterData.products.find(p => {
            const productName = p.ProductName || p.Name || p.productName || '';
            return productName === value || productName.toLowerCase() === value.toLowerCase();
          });
          if (selectedItem) {
            id = parseInt(selectedItem.Id || selectedItem.id || 0);
          }
        } else if (field === 'designId') {
          selectedItem = apiFilterData.designs.find(d => {
            const designName = d.DesignName || d.Name || d.designName || '';
            return designName === value || designName.toLowerCase() === value.toLowerCase();
          });
          if (selectedItem) {
            id = parseInt(selectedItem.Id || selectedItem.id || 0);
          }
        } else if (field === 'purityId') {
          selectedItem = apiFilterData.purities.find(p => {
            const purityName = p.PurityName || p.Name || p.Purity || p.purityName || '';
            return purityName === value || purityName.toLowerCase() === value.toLowerCase();
          });
          if (selectedItem) {
            id = parseInt(selectedItem.Id || selectedItem.id || 0);
          }
        }
        
        return id;
      };

      // Build payload
      const payload = {
        ClientCode: clientCode || '',
        FromDate: filters.dateFrom && filters.dateFrom.trim() !== '' 
          ? filters.dateFrom.trim() 
          : '',
        ToDate: filters.dateTo && filters.dateTo.trim() !== '' 
          ? filters.dateTo.trim() 
          : '',
        StockType: 'All',
        PurityId: getFilterIdForAPI('purityId', filters.purityId),
        CategoryId: getFilterIdForAPI('categoryId', filters.categoryId),
        ProductId: getFilterIdForAPI('productId', filters.productId),
        DesignId: getFilterIdForAPI('designId', filters.designId),
        CounterId: getFilterIdForAPI('counterName', filters.counterName),
        BranchId: getFilterIdForAPI('branch', filters.branch)
      };

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/Reports/StockReportByDesign',
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && Array.isArray(response.data)) {
        setReportData(response.data);
      } else if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
        setReportData(response.data.Data);
      } else {
        setReportData([]);
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch report data');
      setReportData([]);
      addNotification({
        type: 'error',
        message: 'Failed to fetch report data. Please try again.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    const resetFilters = {
      branch: 'All',
      counterName: 'All',
      categoryId: 'All',
      productId: 'All',
      designId: 'All',
      purityId: 'All',
      dateFrom: getCurrentDate(), // Reset to current date
      dateTo: getCurrentDate()    // Reset to current date
    };
    setFilterValues(resetFilters);
    setCurrentPage(1);
    setLoading(true);
    // Fetch with reset filters - auto-apply
    setTimeout(() => {
      fetchReportDataWithFilters(resetFilters);
    }, 100);
  };

  // Dropdown handlers
  const handleDropdownSearch = (field, searchTerm) => {
    setDropdownStates(prev => {
      const currentState = prev[field] || { isOpen: false, searchTerm: '', filteredOptions: [] };
      let filteredOptions = [];
      
      if (field === 'branch') {
        const options = apiFilterData.branches || [];
        filteredOptions = options.filter(item => {
          const name = (item.BranchName || item.Name || item.branchName || item.name || '').toLowerCase();
          return name.includes(searchTerm.toLowerCase());
        });
      } else if (field === 'counterName') {
        const options = apiFilterData.counters || [];
        filteredOptions = options.filter(item => {
          const name = (item.CounterName || item.Name || item.counterName || '').toLowerCase();
          return name.includes(searchTerm.toLowerCase());
        });
      } else if (field === 'categoryId') {
        const options = apiFilterData.categories || [];
        filteredOptions = options.filter(item => {
          const name = (item.CategoryName || item.Name || item.categoryName || '').toLowerCase();
          return name.includes(searchTerm.toLowerCase());
        });
      } else if (field === 'productId') {
        const options = apiFilterData.products || [];
        filteredOptions = options.filter(item => {
          const name = (item.ProductName || item.Name || item.productName || '').toLowerCase();
          return name.includes(searchTerm.toLowerCase());
        });
      } else if (field === 'designId') {
        const options = apiFilterData.designs || [];
        filteredOptions = options.filter(item => {
          const name = (item.DesignName || item.Name || item.designName || '').toLowerCase();
          return name.includes(searchTerm.toLowerCase());
        });
      } else if (field === 'purityId') {
        const options = apiFilterData.purities || [];
        filteredOptions = options.filter(item => {
          const name = (item.PurityName || item.Name || item.Purity || item.purityName || '').toLowerCase();
          return name.includes(searchTerm.toLowerCase());
        });
      }
      
      return {
        ...prev,
        [field]: {
          ...currentState,
          searchTerm,
          filteredOptions: searchTerm ? filteredOptions : []
        }
      };
    });
  };

  const toggleDropdown = (field) => {
    setDropdownStates(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        isOpen: !prev[field]?.isOpen,
        searchTerm: prev[field]?.isOpen ? '' : prev[field]?.searchTerm || ''
      }
    }));
  };

  const closeAllDropdowns = () => {
    setDropdownStates(prev => {
      const updated = {};
      Object.keys(prev).forEach(key => {
        updated[key] = { ...prev[key], isOpen: false, searchTerm: '' };
      });
      return updated;
    });
  };

  // Helper function to render searchable dropdown
  const renderSearchableDropdown = (field, label, placeholder, options, getOptionValue, getOptionLabel, allLabel) => {
    const isOpen = dropdownStates[field]?.isOpen || false;
    const searchTerm = dropdownStates[field]?.searchTerm || '';
    const filteredOptions = dropdownStates[field]?.filteredOptions || [];
    const currentValue = filterValues[field] || 'All';
    const allOptions = options || [];
    const showOptions = searchTerm ? filteredOptions : allOptions;
    
    let displayValue = allLabel;
    if (currentValue !== 'All' && currentValue) {
      const selectedOption = allOptions.find(opt => {
        const optValue = getOptionValue ? getOptionValue(opt) : opt;
        return optValue === currentValue;
      });
      if (selectedOption) {
        displayValue = getOptionLabel ? getOptionLabel(selectedOption) : (getOptionValue ? getOptionValue(selectedOption) : selectedOption);
      } else {
        displayValue = currentValue;
      }
    }

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <label style={{
          display: 'block',
          fontSize: windowWidth <= 768 ? '11px' : '10px',
          fontWeight: 600,
          color: '#475569',
          marginBottom: '6px'
        }}>{label}</label>
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => {
              closeAllDropdowns();
              toggleDropdown(field);
            }}
            style={{
              width: '100%',
              padding: windowWidth <= 768 ? '10px 12px' : '8px 12px',
              fontSize: windowWidth <= 768 ? '13px' : '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: windowWidth <= 768 ? '42px' : '36px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10b981'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <span style={{ 
              color: currentValue === 'All' ? '#94a3b8' : '#1e293b',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1
            }}>
              {displayValue}
            </span>
            <KeyboardArrowDownIcon 
              style={{ 
                fontSize: '16px', 
                color: '#64748b',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }} 
            />
          </div>
          {isOpen && (
            <>
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  zIndex: 10000,
                  maxHeight: '300px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                  <input
                    type="text"
                    placeholder={placeholder || `Search ${label.toLowerCase()}...`}
                    value={searchTerm}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleDropdownSearch(field, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    autoFocus
                  />
                </div>
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <div
                    onClick={() => {
                      handleFilterChange(field, 'All');
                      closeAllDropdowns();
                    }}
                    style={{
                      padding: '10px 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      background: currentValue === 'All' ? '#f0fdf4' : '#ffffff',
                      color: currentValue === 'All' ? '#10b981' : '#1e293b',
                      fontWeight: currentValue === 'All' ? 600 : 400,
                      borderBottom: '1px solid #f1f5f9'
                    }}
                    onMouseEnter={(e) => {
                      if (currentValue !== 'All') {
                        e.currentTarget.style.background = '#f8fafc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentValue !== 'All') {
                        e.currentTarget.style.background = '#ffffff';
                      }
                    }}
                  >
                    {allLabel}
                  </div>
                  {showOptions.length > 0 ? (
                    showOptions.map((option, index) => {
                      const optionValue = getOptionValue ? getOptionValue(option) : option;
                      const optionLabel = getOptionLabel ? getOptionLabel(option) : option;
                      const isSelected = currentValue === optionValue;
                      
                      return (
                        <div
                          key={index}
                          onClick={() => {
                            console.log(`Filter selected - Field: ${field}, Value: ${optionValue}, Label: ${optionLabel}`);
                            handleFilterChange(field, optionValue);
                            closeAllDropdowns();
                          }}
                          style={{
                            padding: '10px 12px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            background: isSelected ? '#f0fdf4' : '#ffffff',
                            color: isSelected ? '#10b981' : '#1e293b',
                            fontWeight: isSelected ? 600 : 400,
                            borderBottom: index < showOptions.length - 1 ? '1px solid #f1f5f9' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = '#f8fafc';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = '#ffffff';
                            }
                          }}
                        >
                          {optionLabel}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '12px'
                    }}>
                      No options found
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const totalRecords = reportData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / STOCK_REPORT_PAGE_SIZE));

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * STOCK_REPORT_PAGE_SIZE;
    return reportData.slice(start, start + STOCK_REPORT_PAGE_SIZE);
  }, [reportData, currentPage]);

  const paddedStockSlots = useMemo(() => {
    const slots = [];
    currentItems.forEach((item) => slots.push({ kind: 'row', item }));
    const pad = Math.max(0, STOCK_REPORT_PAGE_SIZE - slots.length);
    for (let i = 0; i < pad; i += 1) {
      slots.push({ kind: 'pad', key: `sr-pad-${currentPage}-${i}` });
    }
    return slots;
  }, [currentItems, currentPage]);

  // Smart Pagination Logic
  const generatePagination = () => {
    let pages = [];
    const maxPagesToShow = 7;

    if (totalPages <= maxPagesToShow) {
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      pages.push(1);

      if (currentPage > 5) {
        pages.push("...");
      }

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  // Calculate totals for all data - using actual API response field names
  const calculateTotals = () => {
    const totals = {
      OpeningQty: 0,
      OpeningGrWt: 0,
      OpeningNetWt: 0,
      StockInQty: 0,
      StockInGrWt: 0,
      SaleQty: 0,
      SaleGrossWt: 0,
      ClosingQty: 0,
      ClosingGrWt: 0,
      ClosingNet: 0
    };

    reportData.forEach(item => {
      // Map API response fields to totals
      totals.OpeningQty += parseFloat(item.OpeningQuantity || item.OpeningQty || 0);
      totals.OpeningGrWt += parseFloat(item.OpeningGrossWeight || item.OpeningGrWt || 0);
      totals.OpeningNetWt += parseFloat(item.OpeningNetWeight || item.OpeningNetWt || 0);
      totals.StockInQty += parseFloat(item.StockEntryQuantity || item.StockInQty || 0);
      totals.StockInGrWt += parseFloat(item.StockEntryGrWt || item.StockInGrWt || 0);
      totals.SaleQty += parseFloat(item.SaleQty || 0);
      totals.SaleGrossWt += parseFloat(item.SaleGrossWt || 0);
      totals.ClosingQty += parseFloat(item.ClosingQty || 0);
      totals.ClosingGrWt += parseFloat(item.ClosingGrossWeight || item.ClosingGrWt || 0);
      totals.ClosingNet += parseFloat(item.ClosingNetWeight || item.ClosingNet || 0);
    });

    return totals;
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return '0.000';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? '0.000' : numValue.toFixed(3);
  };

  const formatQty = (value) => {
    if (value === null || value === undefined || value === '') return '0';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? '0' : numValue.toString();
  };

  // Export to Excel
  const handleExportToExcel = () => {
    try {
      if (reportData.length === 0) {
        addNotification({
          type: 'error',
          message: 'No data to export',
          duration: 3000
        });
        return;
      }

      const totals = calculateTotals();
      const exportData = reportData.map((item, index) => {
        return {
          'S.No': index + 1,
          'Employee': getValue(item, 'Employee'),
          'Item detail': getValue(item, 'Name'),
          'Opening Qty': parseFloat(item.OpeningQuantity || item.OpeningQty || 0),
          'Opening Gr Wt': parseFloat(item.OpeningGrossWeight || item.OpeningGrWt || 0),
          'Opening Net Wt': parseFloat(item.OpeningNetWeight || item.OpeningNetWt || 0),
          'Stock In Qty': parseFloat(item.StockEntryQuantity || item.StockInQty || 0),
          'Stock In Gr Wt': parseFloat(item.StockEntryGrWt || item.StockInGrWt || 0),
          'Sale Qty': parseFloat(item.SaleQty || 0),
          'Sale Gross Wt': parseFloat(item.SaleGrossWt || 0),
          'Closing Qty': parseFloat(item.ClosingQty || 0),
          'Closing Gr Wt': parseFloat(item.ClosingGrossWeight || item.ClosingGrWt || 0),
          'Closing Net': parseFloat(item.ClosingNetWeight || item.ClosingNet || 0)
        };
      });

      // Add summary row
      exportData.push({
        'S.No': '',
        'Employee': '',
        'Item detail': 'TOTAL',
        'Opening Qty': totals.OpeningQty,
        'Opening Gr Wt': totals.OpeningGrWt,
        'Opening Net Wt': totals.OpeningNetWt,
        'Stock In Qty': totals.StockInQty,
        'Stock In Gr Wt': totals.StockInGrWt,
        'Sale Qty': totals.SaleQty,
        'Sale Gross Wt': totals.SaleGrossWt,
        'Closing Qty': totals.ClosingQty,
        'Closing Gr Wt': totals.ClosingGrWt,
        'Closing Net': totals.ClosingNet
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const colWidths = [
        { wch: 8 },
        { wch: 18 },
        { wch: 28 },
        { wch: 12 },  // Opening Qty
        { wch: 15 },  // Opening Gr Wt
        { wch: 15 },  // Opening Net Wt
        { wch: 12 },  // Stock In Qty
        { wch: 15 },  // Stock In Gr Wt
        { wch: 10 },  // Sale Qty
        { wch: 15 },  // Sale Gross Wt
        { wch: 12 },  // Closing Qty
        { wch: 15 },  // Closing Gr Wt
        { wch: 15 }   // Closing Net
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Report');
      
      const fileName = `StockReport_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      addNotification({
        type: 'success',
        message: `Stock report exported to ${fileName} successfully`,
        duration: 3000
      });
      setShowExportModal(false);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      addNotification({
        type: 'error',
        message: 'Failed to export stock report. Please try again.',
        duration: 3000
      });
    }
  };

  // Export to PDF
  const handleExportToPDF = () => {
    try {
      if (reportData.length === 0) {
        addNotification({
          type: 'error',
          message: 'No data to export',
          duration: 3000
        });
        return;
      }

      const totals = calculateTotals();
      const doc = new jsPDF('landscape');
      
      // Title
      doc.setFontSize(16);
      doc.text('Stock Report', 15, 20);
      
      // Subtitle with date range
      doc.setFontSize(10);
      doc.text(`From: ${filterValues.dateFrom || getCurrentDate()} To: ${filterValues.dateTo || getCurrentDate()}`, 15, 28);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 34);
      doc.text(`Total Records: ${reportData.length}`, 15, 40);

      // Table headers
      const tableHeaders = [
        'S.No',
        'Employee',
        'Item',
        'Opening Qty',
        'Opening Gr Wt',
        'Opening Net Wt',
        'Stock In Qty',
        'Stock In Gr Wt',
        'Sale Qty',
        'Sale Gross Wt',
        'Closing Qty',
        'Closing Gr Wt',
        'Closing Net'
      ];

      // Table data
      const tableData = reportData.map((item, index) => [
        index + 1,
        getValue(item, 'Employee') || '—',
        getValue(item, 'Name') || '-',
        formatQty(item.OpeningQuantity || item.OpeningQty),
        formatNumber(item.OpeningGrossWeight || item.OpeningGrWt),
        formatNumber(item.OpeningNetWeight || item.OpeningNetWt),
        formatQty(item.StockEntryQuantity || item.StockInQty),
        formatNumber(item.StockEntryGrWt || item.StockInGrWt),
        formatQty(item.SaleQty),
        formatNumber(item.SaleGrossWt),
        formatQty(item.ClosingQty),
        formatNumber(item.ClosingGrossWeight || item.ClosingGrWt),
        formatNumber(item.ClosingNetWeight || item.ClosingNet)
      ]);

      // Add summary row
      tableData.push([
        '',
        '',
        'TOTAL',
        formatQty(totals.OpeningQty),
        formatNumber(totals.OpeningGrWt),
        formatNumber(totals.OpeningNetWt),
        formatQty(totals.StockInQty),
        formatNumber(totals.StockInGrWt),
        formatQty(totals.SaleQty),
        formatNumber(totals.SaleGrossWt),
        formatQty(totals.ClosingQty),
        formatNumber(totals.ClosingGrWt),
        formatNumber(totals.ClosingNet)
      ]);

      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 45,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 8, right: 8 },
        tableWidth: 'auto',
        // Style the last row (summary row)
        didParseCell: function(data) {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
          }
        }
      });

      const fileName = `StockReport_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      addNotification({
        type: 'success',
        message: `Stock report exported to ${fileName} successfully`,
        duration: 3000
      });
      setShowExportModal(false);
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      addNotification({
        type: 'error',
        message: 'Failed to export stock report. Please try again.',
        duration: 3000
      });
    }
  };
  
  const handleExportAllReport = () => {
    handleExportToExcel();
  };

  const resolveEmployeeName = (item) => {
    if (!item || typeof item !== 'object') return '—';
    const v =
      item.EmployeeName ||
      item.Employee ||
      item.UserName ||
      item.Username ||
      item.LoginName ||
      item.SalesmanName ||
      item.SalesPerson ||
      item.EmpName ||
      item.TCode ||
      item.CreatedBy;
    return v !== undefined && v !== null && String(v).trim() !== '' ? String(v).trim() : '—';
  };

  const getValue = (item, key) => {
    // Map API response field names to table keys
    const fieldMapping = {
      'Employee': () => resolveEmployeeName(item),
      'Name': () => {
        // Combine Category, Product, Design for Name
        const parts = [];
        if (item.Category) parts.push(item.Category);
        if (item.Product) parts.push(item.Product);
        if (item.Design) parts.push(item.Design);
        return parts.length > 0 ? parts.join(' - ') : (item.Category || 'N/A');
      },
      'OpeningQty': () => item.OpeningQuantity || item.OpeningQty || 0,
      'OpeningGrWt': () => item.OpeningGrossWeight || item.OpeningGrWt || 0,
      'OpeningNetWt': () => item.OpeningNetWeight || item.OpeningNetWt || 0,
      'StockInQty': () => item.StockEntryQuantity || item.StockInQty || 0,
      'StockInGrWt': () => item.StockEntryGrWt || item.StockInGrWt || 0,
      'SaleQty': () => item.SaleQty || 0,
      'SaleGrossWt': () => item.SaleGrossWt || 0,
      'ClosingQty': () => item.ClosingQty || 0,
      'ClosingGrWt': () => item.ClosingGrossWeight || item.ClosingGrWt || 0,
      'ClosingNet': () => item.ClosingNetWeight || item.ClosingNet || 0
    };

    if (fieldMapping[key]) {
      return fieldMapping[key]();
    }

    // Fallback: Try different possible field names
    const possibleKeys = [
      key,
      key.replace(/([A-Z])/g, '_$1').toUpperCase(),
      key.replace(/([A-Z])/g, '_$1').toLowerCase(),
      key.toLowerCase(),
      key.toUpperCase()
    ];
    
    for (const k of possibleKeys) {
      if (item[k] !== undefined && item[k] !== null) {
        return item[k];
      }
    }
    return '';
  };

  const totals = calculateTotals();

  const columns = [
    { key: 'Employee', label: 'Employee', width: '120px' },
    { key: 'Name', label: 'Item detail', width: '200px' },
    { key: 'OpeningQty', label: 'Opening Qty', width: '120px' },
    { key: 'OpeningGrWt', label: 'Opening Gr Wt', width: '140px' },
    { key: 'OpeningNetWt', label: 'Opening Net Wt', width: '140px' },
    { key: 'StockInQty', label: 'Stock In Qty', width: '120px' },
    { key: 'StockInGrWt', label: 'Stock In Gr Wt', width: '140px' },
    { key: 'SaleQty', label: 'Sale Qty', width: '120px' },
    { key: 'SaleGrossWt', label: 'Sale Gross Wt', width: '140px' },
    { key: 'ClosingQty', label: 'Closing Qty', width: '120px' },
    { key: 'ClosingGrWt', label: 'Closing Gr Wt', width: '140px' },
    { key: 'ClosingNet', label: 'Closing Net', width: '140px' }
  ];

  const isSmallScreen = windowWidth <= 768;
  const thStock = {
    padding: isSmallScreen ? '6px 6px' : '7px 8px',
    textAlign: 'left',
    fontWeight: 700,
    fontSize: isSmallScreen ? 10 : 11,
    color: '#18181b',
    borderRight: '1px solid #e4e4e7',
    borderBottom: '2px solid #d4d4d8',
    whiteSpace: 'nowrap',
    background: '#f4f4f5',
  };
  const tdStock = {
    padding: isSmallScreen ? '5px 6px' : '6px 8px',
    color: '#404040',
    fontSize: isSmallScreen ? 10 : 11,
    lineHeight: 1.35,
    borderRight: '1px solid #ececec',
    borderBottom: '1px solid #e5e5e5',
  };
  const stockPageBtn = (disabled) => ({
    padding: '5px 11px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 8,
    border: '1px solid #e5e5e5',
    background: '#ffffff',
    color: disabled ? '#a3a3a3' : '#525252',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  });
  const stockPageNum = (active) => ({
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 8,
    border: `1px solid ${active ? '#0d9488' : '#e5e5e5'}`,
    background: active ? '#0d9488' : '#ffffff',
    color: active ? '#ffffff' : '#525252',
    cursor: 'pointer',
    minWidth: 32,
  });

  return (
    <div
      className="stock-report-page"
      style={{
        fontFamily: 'var(--font-family)',
        padding: '12px',
        fontSize: 11,
        minHeight: '100%',
        background: '#ffffff',
      }}
    >
      <style>{`
        @keyframes stockReportSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
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
        <div
          style={{
            height: 3,
            background: 'linear-gradient(90deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)',
          }}
        />
        <div style={{ padding: '14px 16px' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 14,
            }}
          >
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: isSmallScreen ? '1.05rem' : '1.2rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.2,
                }}
              >
                Stock report
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748b', fontWeight: 600, lineHeight: 1.45 }}>
                Opening, stock-in, sale, and closing by item — <strong style={{ color: '#0f766e' }}>{STOCK_REPORT_PAGE_SIZE} rows</strong> per page
              </p>
              <button
                type="button"
                onClick={() => {
                  const dateFrom = filterValues.dateFrom || getCurrentDate();
                  const dateTo = filterValues.dateTo || getCurrentDate();
                  navigate(`/stock-report-summary?dateFrom=${dateFrom}&dateTo=${dateTo}`);
                }}
                style={{
                  marginTop: 10,
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 8,
                  border: '1px solid #99f6e4',
                  background: 'linear-gradient(180deg, #ecfdf5 0%, #f0fdfa 100%)',
                  color: '#0f766e',
                  cursor: 'pointer',
                }}
              >
                Open stock report summary →
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 8,
                marginLeft: 'auto',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  padding: 3,
                  background: '#f8fafc',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    fontSize: 11,
                    fontWeight: 800,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    background: showFilterPanel ? 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' : 'transparent',
                    color: showFilterPanel ? '#fff' : '#475569',
                    boxShadow: showFilterPanel ? '0 2px 8px rgba(13, 148, 136, 0.35)' : 'none',
                  }}
                >
                  <FaFilter style={{ fontSize: 12 }} />
                  Filters
                </button>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 32,
                  padding: '0 14px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 10,
                  border: '1px solid #d4d4d8',
                  background: '#fafafa',
                  color: '#262626',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.55 : 1,
                }}
              >
                {loading ? (
                  <FaSpinner style={{ animation: 'stockReportSpin 1s linear infinite' }} />
                ) : (
                  <FaSync />
                )}
                Refresh
              </button>

              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                disabled={reportData.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                  color: '#0f172a',
                  cursor: reportData.length === 0 ? 'not-allowed' : 'pointer',
                  boxSizing: 'border-box',
                  height: 30,
                  opacity: reportData.length === 0 ? 0.45 : 1,
                }}
              >
                <FaFileExport style={{ fontSize: 11, color: '#475569' }} />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showExportModal && (
        <div
          onClick={() => setShowExportModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 10,
              padding: 20,
              width: 460,
              maxWidth: '95vw',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Export Stock Report</h2>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 20,
                  color: '#64748b',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>
              Choose your preferred export option
            </p>

            <div style={{ display: 'grid', gap: 10 }}>
              <button
                type="button"
                onClick={handleExportToExcel}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid #dcfce7',
                  background: '#f0fdf4',
                  color: '#166534',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <FaFileExcel style={{ fontSize: 18 }} />
                <span>Export as Excel</span>
              </button>

              <button
                type="button"
                onClick={handleExportToPDF}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid #fee2e2',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <FaFilePdf style={{ fontSize: 18 }} />
                <span>Export as PDF</span>
              </button>

              <button
                type="button"
                onClick={handleExportAllReport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#1e293b',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <FaFileExport style={{ fontSize: 18 }} />
                <span>Export All Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      {showFilterPanel && (
        <>
          <div
            onClick={() => {
              closeAllDropdowns();
              setShowFilterPanel(false);
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              zIndex: 9998
            }}
          />
          <div 
            data-filter-panel
            style={{
              position: 'fixed',
              top: '50%',
              right: '20px',
              transform: 'translateY(-50%)',
              width: windowWidth <= 768 ? '90%' : '380px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 20px 25px rgba(0, 0, 0, 0.25)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Filter Header */}
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.2)'
            }}>
              <h6 style={{
                margin: 0,
                fontSize: '12px',
                fontWeight: 700,
                color: '#ffffff'
              }}>Filter Options</h6>
              <button 
                type="button" 
                onClick={() => setShowFilterPanel(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ffffff',
                  fontSize: '16px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              >
                <FaTimes />
              </button>
            </div>
            {/* Filter Content */}
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                {renderSearchableDropdown(
                  'branch',
                  'Branch',
                  'Search branch...',
                  apiFilterData.branches || [],
                  (item) => item.BranchName || item.Name || item.branchName || item.name,
                  (item) => item.BranchName || item.Name || item.branchName || item.name,
                  'All Branches'
                )}
                {renderSearchableDropdown(
                  'counterName',
                  'Counter Name',
                  'Search counter...',
                  apiFilterData.counters || [],
                  (item) => item.CounterName || item.Name || item.counterName,
                  (item) => item.CounterName || item.Name || item.counterName,
                  'All Counters'
                )}
                {renderSearchableDropdown(
                  'categoryId',
                  'Category',
                  'Search category...',
                  apiFilterData.categories || [],
                  (item) => item.CategoryName || item.Name || item.categoryName,
                  (item) => item.CategoryName || item.Name || item.categoryName,
                  'All Categories'
                )}
                {renderSearchableDropdown(
                  'productId',
                  'Product Name',
                  'Search product...',
                  apiFilterData.products || [],
                  (item) => item.ProductName || item.Name || item.productName,
                  (item) => item.ProductName || item.Name || item.productName,
                  'All Products'
                )}
                {renderSearchableDropdown(
                  'designId',
                  'Design',
                  'Search design...',
                  apiFilterData.designs || [],
                  (item) => item.DesignName || item.Name || item.designName,
                  (item) => item.DesignName || item.Name || item.designName,
                  'All Designs'
                )}
                {renderSearchableDropdown(
                  'purityId',
                  'Purity',
                  'Search purity...',
                  apiFilterData.purities || [],
                  (item) => item.PurityName || item.Name || item.Purity || item.purityName,
                  (item) => item.PurityName || item.Name || item.Purity || item.purityName,
                  'All Purities'
                )}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px'
                  }}>From Date</label>
                  <input
                    type="date"
                    value={filterValues.dateFrom}
                    onChange={e => handleFilterChange('dateFrom', e.target.value)}
                    max={filterValues.dateTo || undefined}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      outline: 'none',
                      background: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px'
                  }}>To Date</label>
                  <input
                    type="date"
                    value={filterValues.dateTo}
                    onChange={e => handleFilterChange('dateTo', e.target.value)}
                    min={filterValues.dateFrom || undefined}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      outline: 'none',
                      background: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>
               <div style={{
                 display: 'flex',
                 justifyContent: 'flex-end',
                 gap: '10px',
                 marginTop: '20px',
                 paddingTop: '20px',
                 borderTop: '1px solid #e5e7eb'
               }}>
                 <button 
                   onClick={handleResetFilters}
                   style={{
                     padding: '8px 16px',
                     fontSize: '12px',
                     fontWeight: 600,
                     borderRadius: '8px',
                     border: '1px solid #cbd5e1',
                     background: '#ffffff',
                     color: '#64748b',
                     cursor: 'pointer',
                     transition: 'all 0.2s',
                     width: '100%'
                   }}
                   onMouseEnter={(e) => {
                     e.target.style.background = '#f1f5f9';
                     e.target.style.borderColor = '#94a3b8';
                   }}
                   onMouseLeave={(e) => {
                     e.target.style.background = '#ffffff';
                     e.target.style.borderColor = '#cbd5e1';
                   }}
                 >
                   Reset All Filters
                 </button>
               </div>
               <div style={{
                 marginTop: '12px',
                 padding: '10px',
                 background: '#f0fdf4',
                 border: '1px solid #86efac',
                 borderRadius: '6px',
                 fontSize: '11px',
                 color: '#166534'
               }}>
                 <strong>💡 Tip:</strong> Filters apply automatically when you select any option. No need to click Apply!
               </div>
            </div>
          </div>
        </>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#dc2626'
        }}>
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      )}

      {/* Table Container — fixed 15 row body height (padded slots) */}
      <div
        className="table-container"
        style={{
          background: '#ffffff',
          borderRadius: 12,
          marginTop: 4,
          boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            overflowX: 'auto',
            overflowY: 'visible',
            width: '100%',
            maxWidth: '100%',
            position: 'relative',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'auto',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    ...thStock,
                    textAlign: 'center',
                    width: 44,
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    borderRight: '1px solid #e4e4e7',
                  }}
                >
                  S.No
                </th>
                {columns.map((column) => {
                  const numeric = column.key !== 'Employee' && column.key !== 'Name';
                  return (
                    <th
                      key={column.key}
                      style={{
                        ...thStock,
                        textAlign: numeric ? 'right' : 'left',
                        width: column.width,
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        borderRight:
                          column.key === columns[columns.length - 1].key ? 'none' : '1px solid #e4e4e7',
                      }}
                    >
                      {column.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading && totalRecords === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    style={{
                      ...tdStock,
                      padding: '28px 12px',
                      textAlign: 'center',
                      color: '#64748b',
                      fontWeight: 600,
                    }}
                  >
                    Loading…
                  </td>
                </tr>
              ) : (
                (() => {
                  let dataRowOnPage = 0;
                  return paddedStockSlots.map((slot, slotIndex) => {
                    if (slot.kind === 'pad') {
                      return (
                        <tr
                          key={slot.key}
                          style={{
                            background: slotIndex % 2 === 0 ? '#fafafa' : '#f4f4f5',
                            height: 34,
                          }}
                        >
                          <td
                            style={{
                              ...tdStock,
                              textAlign: 'center',
                              color: '#d4d4d8',
                              borderRight: '1px solid #ececec',
                            }}
                          >
                            {'\u00a0'}
                          </td>
                          {columns.map((column) => (
                            <td
                              key={column.key}
                              style={{
                                ...tdStock,
                                textAlign:
                                  column.key !== 'Employee' && column.key !== 'Name'
                                    ? 'right'
                                    : 'left',
                                color: '#e7e5e4',
                                borderRight:
                                  column.key === columns[columns.length - 1].key
                                    ? 'none'
                                    : '1px solid #ececec',
                              }}
                            >
                              {'\u00a0'}
                            </td>
                          ))}
                        </tr>
                      );
                    }
                    const item = slot.item;
                    const index = dataRowOnPage;
                    dataRowOnPage += 1;
                    const serial = (currentPage - 1) * STOCK_REPORT_PAGE_SIZE + index + 1;
                    const zebra = slotIndex % 2 === 0 ? '#ffffff' : '#fafafa';
                    return (
                      <tr
                        key={`${serial}-${index}`}
                        style={{
                          background: zebra,
                          height: 34,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f0fdfa';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = zebra;
                        }}
                      >
                        <td
                          style={{
                            ...tdStock,
                            textAlign: 'center',
                            fontWeight: 700,
                            color: '#27272a',
                            borderRight: '1px solid #ececec',
                          }}
                        >
                          {serial}
                        </td>
                        {columns.map((column) => {
                          const value = getValue(item, column.key);
                          let displayValue = value;
                          if (column.key === 'Name' || column.key === 'Employee') {
                            displayValue = value || (column.key === 'Employee' ? '—' : '-');
                          } else if (
                            column.key === 'OpeningQty' ||
                            column.key === 'StockInQty' ||
                            column.key === 'SaleQty' ||
                            column.key === 'ClosingQty'
                          ) {
                            displayValue = formatQty(value);
                          } else {
                            displayValue = formatNumber(value);
                          }
                          const numeric = column.key !== 'Employee' && column.key !== 'Name';
                          return (
                            <td
                              key={column.key}
                              style={{
                                ...tdStock,
                                textAlign: numeric ? 'right' : 'left',
                                whiteSpace: numeric ? 'nowrap' : 'normal',
                                borderRight:
                                  column.key === columns[columns.length - 1].key
                                    ? 'none'
                                    : '1px solid #ececec',
                              }}
                            >
                              {displayValue || '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
            {totalRecords > 0 && (
              <tfoot>
                <tr
                  style={{
                    background: 'linear-gradient(180deg, #ecfdf5 0%, #f0fdfa 100%)',
                    boxShadow: 'inset 0 2px 0 #99f6e4',
                  }}
                >
                  <td
                    style={{
                      ...tdStock,
                      textAlign: 'center',
                      fontWeight: 900,
                      color: '#0f766e',
                      fontSize: isSmallScreen ? 11 : 12,
                      borderTop: '2px solid #5eead4',
                      borderRight: '1px solid #cce8e4',
                    }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      ...tdStock,
                      fontWeight: 900,
                      color: '#0f766e',
                      fontSize: isSmallScreen ? 11 : 12,
                      borderTop: '2px solid #5eead4',
                      borderRight: '1px solid #cce8e4',
                    }}
                  >
                    —
                  </td>
                  <td
                    style={{
                      ...tdStock,
                      fontWeight: 900,
                      color: '#0f766e',
                      fontSize: isSmallScreen ? 11 : 12,
                      borderTop: '2px solid #5eead4',
                      borderRight: '1px solid #cce8e4',
                    }}
                  >
                    —
                  </td>
                  {columns.slice(2).map((column) => {
                    let displayValue = '-';
                    if (
                      column.key === 'OpeningQty' ||
                      column.key === 'StockInQty' ||
                      column.key === 'SaleQty' ||
                      column.key === 'ClosingQty'
                    ) {
                      displayValue = formatQty(totals[column.key]);
                    } else {
                      displayValue = formatNumber(totals[column.key]);
                    }
                    return (
                      <td
                        key={column.key}
                        style={{
                          ...tdStock,
                          textAlign: 'right',
                          fontWeight: 900,
                          color: '#0f766e',
                          fontSize: isSmallScreen ? 11 : 12,
                          borderTop: '2px solid #5eead4',
                          borderRight:
                            column.key === columns[columns.length - 1].key
                              ? 'none'
                              : '1px solid #cce8e4',
                        }}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 14px',
            borderTop: '1px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: 10,
            background: '#f8fafc',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#64748b',
            }}
          >
            {totalRecords === 0 && !loading ? (
              <>No records · {STOCK_REPORT_PAGE_SIZE} rows per page</>
            ) : (
              <>
                Showing{' '}
                <strong style={{ color: '#0f172a' }}>
                  {totalRecords === 0
                    ? 0
                    : (currentPage - 1) * STOCK_REPORT_PAGE_SIZE + 1}
                </strong>
                –
                <strong style={{ color: '#0f172a' }}>
                  {Math.min(currentPage * STOCK_REPORT_PAGE_SIZE, totalRecords)}
                </strong>{' '}
                of <strong style={{ color: '#0f172a' }}>{totalRecords}</strong> ·{' '}
                {STOCK_REPORT_PAGE_SIZE} / page
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1 || totalRecords === 0}
              style={stockPageBtn(currentPage === 1 || totalRecords === 0)}
            >
              Prev
            </button>
            {generatePagination().map((page, index) =>
              page === '...' ? (
                <span key={`ellipsis-${index}`} style={{ padding: '4px 6px', fontSize: 11, color: '#a3a3a3' }}>
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={stockPageNum(currentPage === page)}
                >
                  {page}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalRecords === 0}
              style={stockPageBtn(currentPage === totalPages || totalRecords === 0)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
