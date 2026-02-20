import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FaSpinner, 
  FaExclamationTriangle,
  FaSync,
  FaFilter,
  FaTimes,
  FaFileExcel,
  FaFilePdf,
  FaChevronDown
} from 'react-icons/fa';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useLoading } from '../App';
import { useNotifications } from '../context/NotificationContext';

const PAGE_SIZE_OPTIONS = [500, 1000, 2000, 5000];
const DEFAULT_PAGE_SIZE = 500;

const Reports = () => {
  const { loading, setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  
  const [reportData, setReportData] = useState([]);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
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
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef(null);

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

  // Pagination logic
  const totalRecords = reportData.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return reportData.slice(start, end);
  }, [reportData, currentPage, itemsPerPage]);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

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

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
          'Name': getValue(item, 'Name'),
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
        'Name': 'TOTAL',
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
        { wch: 8 },   // S.No
        { wch: 25 },  // Name
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
      setShowExportDropdown(false);
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
        'Name',
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
        headStyles: { fillColor: [69, 73, 232], textColor: 255, fontSize: 8, fontStyle: 'bold' },
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
      setShowExportDropdown(false);
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      addNotification({
        type: 'error',
        message: 'Failed to export stock report. Please try again.',
        duration: 3000
      });
    }
  };

  const getValue = (item, key) => {
    // Map API response field names to table keys
    const fieldMapping = {
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
    { key: 'Name', label: 'Name', width: '200px' },
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

  return (
    <div style={{
      padding: '20px',
      background: '#ffffff',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 600,
                color: '#1e293b'
              }}>
                Stock Report 
              </h1>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // Navigate to summary page with date filters
                  const dateFrom = filterValues.dateFrom || getCurrentDate();
                  const dateTo = filterValues.dateTo || getCurrentDate();
                  navigate(`/stock-report-summary?dateFrom=${dateFrom}&dateTo=${dateTo}`);
                }}
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#3b82f6',
                  textDecoration: 'none',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: '1px solid #3b82f6',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#3b82f6';
                  e.target.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#3b82f6';
                }}
              >
                Stock Report Summary
              </a>
            </div>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#64748b'
            }}>
              View detailed stock report by design with opening, stock in, sale, and closing quantities
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            {/* Filter Button */}
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid #10b981',
                background: showFilterPanel ? '#10b981' : '#ffffff',
                color: showFilterPanel ? '#ffffff' : '#10b981',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!showFilterPanel) {
                  e.target.style.background = '#f0fdf4';
                }
              }}
              onMouseLeave={(e) => {
                if (!showFilterPanel) {
                  e.target.style.background = '#ffffff';
                }
              }}
            >
              <FaFilter />
              <span>Filter</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid #3b82f6',
                background: '#ffffff',
                color: '#3b82f6',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = '#3b82f6';
                  e.target.style.color = '#ffffff';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = '#ffffff';
                  e.target.style.color = '#3b82f6';
                }
              }}
            >
              {loading ? (
                <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <FaSync />
              )}
              Refresh
            </button>

            {/* Export Button with Dropdown */}
            <div ref={exportDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={reportData.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #10b981',
                  background: '#ffffff',
                  color: '#10b981',
                  cursor: reportData.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: reportData.length === 0 ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (reportData.length > 0) {
                    e.target.style.background = '#10b981';
                    e.target.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (reportData.length > 0) {
                    e.target.style.background = '#ffffff';
                    e.target.style.color = '#10b981';
                  }
                }}
              >
                <FaFileExcel />
                Export
                <FaChevronDown style={{ fontSize: '10px' }} />
              </button>

              {showExportDropdown && reportData.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
                  zIndex: 1000,
                  minWidth: '180px',
                  overflow: 'hidden'
                }}>
                  <button
                    onClick={handleExportToExcel}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: 'none',
                      background: '#ffffff',
                      color: '#10b981',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#f0fdf4';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#ffffff';
                    }}
                  >
                    <FaFileExcel style={{ fontSize: '16px' }} />
                    Export to Excel
                  </button>
                  <button
                    onClick={handleExportToPDF}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: 'none',
                      background: '#ffffff',
                      color: '#ef4444',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#fef2f2';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#ffffff';
                    }}
                  >
                    <FaFilePdf style={{ fontSize: '16px' }} />
                    Export to PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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

      {/* Table Container */}
      <div className="table-container" style={{
        background: '#ffffff',
        borderRadius: '12px',
        marginTop: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto', overflowY: 'visible', width: '100%', maxWidth: '100%', position: 'relative' }}>
          <table style={{ 
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px',
            tableLayout: 'auto'
          }}>
            <thead>
              <tr style={{
                background: '#f8fafc',
                borderBottom: '2px solid #e5e7eb'
              }}>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  width: '60px'
                }}>
                  S.No
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#475569',
                      whiteSpace: 'nowrap',
                      width: column.width,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '14px'
                  }}>
                    {loading ? 'Loading...' : 'No data found'}
                  </td>
                </tr>
              ) : (
                currentItems.map((item, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      background: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                    }}
                  >
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: '#1e293b'
                    }}>
                      {((currentPage - 1) * itemsPerPage) + index + 1}
                    </td>
                    {columns.map(column => {
                      const value = getValue(item, column.key);
                      let displayValue = value;
                      
                      if (column.key === 'Name') {
                        displayValue = value || '-';
                      } else if (column.key === 'OpeningQty' || column.key === 'StockInQty' || column.key === 'SaleQty' || column.key === 'ClosingQty') {
                        displayValue = formatQty(value);
                      } else {
                        displayValue = formatNumber(value);
                      }
                      
                      return (
                        <td key={column.key} style={{
                          padding: '12px',
                          fontSize: '12px',
                          color: '#1e293b',
                          whiteSpace: 'nowrap'
                        }}>
                          {displayValue || '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
            {/* Summary Row */}
            {currentItems.length > 0 && (
              <tfoot>
                <tr style={{
                  background: '#f1f5f9',
                  borderTop: '2px solid #e5e7eb',
                  fontWeight: 600
                }}>
                  <td style={{
                    padding: '12px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1e293b'
                  }}>
                    <strong>Total</strong>
                  </td>
                  <td style={{
                    padding: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1e293b',
                    whiteSpace: 'nowrap'
                  }}>
                    <strong>-</strong>
                  </td>
                  {columns.slice(1).map(column => {
                    let displayValue = '-';
                    
                    if (column.key === 'OpeningQty' || column.key === 'StockInQty' || column.key === 'SaleQty' || column.key === 'ClosingQty') {
                      displayValue = formatQty(totals[column.key]);
                    } else {
                      displayValue = formatNumber(totals[column.key]);
                    }
                    
                    return (
                      <td key={column.key} style={{
                        padding: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>
                        <strong>{displayValue}</strong>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        
        {/* Pagination */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderTop: '1px solid #e5e7eb',
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
                onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
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
              onClick={() => {
                const newPage = Math.max(currentPage - 1, 1);
                setCurrentPage(newPage);
              }}
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
            {generatePagination().map((page, index) =>
              page === "..." ? (
                <span key={`ellipsis-${index}`} style={{
                  padding: '6px 8px',
                  fontSize: '12px',
                  color: '#94a3b8'
                }}>...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid',
                    background: currentPage === page ? '#9ca3af' : '#ffffff',
                    color: currentPage === page ? '#ffffff' : '#475569',
                    borderColor: currentPage === page ? '#9ca3af' : '#e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minWidth: '36px'
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
              )
            )}
            <button
              onClick={() => {
                const newPage = Math.min(currentPage + 1, totalPages);
                setCurrentPage(newPage);
              }}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
