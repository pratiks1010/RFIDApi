import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FaSearch,
  FaSpinner,
  FaExclamationTriangle,
  FaFileExcel,
  FaTrash,
  FaFilter,
  FaSortAmountDown,
  FaSortAmountUp,
  FaEllipsisV,
  FaSync,
  FaFileExport,
  FaFilePdf,
  FaEnvelope,
  FaThList,
  FaThLarge,
  FaGem,
  FaInfoCircle,
  FaEdit,
  FaTimes,
  FaSave,
  FaPrint,
  FaEye,
  FaArrowLeft,
  FaImage,
  FaWeightHanging,
  FaRupeeSign,
  FaMapMarkerAlt,
  FaCamera
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import SuccessNotification from '../common/SuccessNotification';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import IconButton from '@mui/material/IconButton';
import { useNotifications } from '../../context/NotificationContext';
import { useLoading } from '../../App';

// Separate axios instance for FormData uploads so global interceptor does not set Content-Type: application/json
const formDataAxios = axios.create();
formDataAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    if (config.data instanceof FormData) delete config.headers['Content-Type'];
    return config;
  },
  (err) => Promise.reject(err)
);

const PAGE_SIZE_OPTIONS = [500, 1000, 2000, 5000];
const DEFAULT_PAGE_SIZE = 500;
const IMAGE_BASE_URL = 'https://rrgold.loyalstring.co.in/';

/** Get display image URL for an item: from API "Images" (comma-separated paths) or Image1/imageurl/ImageUrl */
const getItemImageUrl = (item) => {
  if (!item) return null;
  if (item.Images && typeof item.Images === 'string') {
    const firstPath = item.Images.split(',')[0]?.trim();
    if (firstPath) {
      const base = IMAGE_BASE_URL.replace(/\/$/, '');
      const path = firstPath.replace(/^\//, '');
      return `${base}/${path}`;
    }
  }
  return item.Image1 || item.imageurl || item.ImageUrl || null;
};

const getUniqueOptions = (data, field) => {
  if (!data || !Array.isArray(data)) return ['All'];

  const options = data
    .map(item => item[field])
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort((a, b) => a?.toString().localeCompare(b?.toString()));

  return ['All', ...options];
};

const formatValue = (value) => {
  if (!value) return '-';
  if (typeof value === 'number') return value.toFixed(3);
  return value.toString();
};

const LabelStockList = () => {
  // Global loader
  const { loading, setLoading } = useLoading();

  // State variables
  const [labeledStock, setLabeledStock] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportErrors, setExportErrors] = useState({
    pdf: '',
    excel: '',
    email: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterValues, setFilterValues] = useState({
    counterName: 'All',
    productId: 'All', // Store the actual selected value
    categoryId: 'All', // Store the actual selected value
    designId: 'All', // Store the actual selected value
    purityId: 'All', // Store the actual selected value
    boxName: 'All',
    vendor: 'All',
    branch: 'All',
    status: 'All',
    dateFrom: '',
    dateTo: ''
  });
  const [activeFilters, setActiveFilters] = useState([]);
  const [originalStock, setOriginalStock] = useState([]);
  const [showAllData, setShowAllData] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
  const [allFilteredData, setAllFilteredData] = useState([]);
  const [loadingAllData, setLoadingAllData] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Add these state variables for filter options
  const [filterOptions, setFilterOptions] = useState({
    counterNames: ['All'],
    productNames: ['All'],
    categories: ['All'],
    designs: ['All'],
    boxNames: ['All'],
    vendors: ['All'],
    branches: ['All'],
    statuses: ['All', 'ApiActive', 'Sold']
  });

  // State for API filter data
  const [apiFilterData, setApiFilterData] = useState({
    products: [],
    designs: [],
    categories: [],
    purities: [],
    counters: [],
    branches: []
  });

  // State for searchable dropdowns
  const [dropdownStates, setDropdownStates] = useState({
    branch: { isOpen: false, searchTerm: '', filteredOptions: [] },
    counterName: { isOpen: false, searchTerm: '', filteredOptions: [] },
    boxName: { isOpen: false, searchTerm: '', filteredOptions: [] },
    categoryId: { isOpen: false, searchTerm: '', filteredOptions: [] },
    productId: { isOpen: false, searchTerm: '', filteredOptions: [] },
    designId: { isOpen: false, searchTerm: '', filteredOptions: [] },
    purityId: { isOpen: false, searchTerm: '', filteredOptions: [] },
    status: { isOpen: false, searchTerm: '', filteredOptions: [] }
  });

  // Get userInfo from localStorage
  const [userInfo, setUserInfo] = useState(null);
  const { addNotification } = useNotifications();

  // Template selector state
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Label preview modal state
  const [previewLoading, setPreviewLoading] = useState(false);

  const navigate = useNavigate();

  // Add state for status change popup
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [selectedItemForStatus, setSelectedItemForStatus] = useState(null);
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);
  const [availableStatuses] = useState(['ApiActive', 'Sold']);
  const isFetchingRef = useRef(false);

  // Window width state for responsive design
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const filterDropdownOpenRef = useRef(false);

  useEffect(() => {
    filterDropdownOpenRef.current = Object.values(dropdownStates).some(s => s?.isOpen);
  }, [dropdownStates]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!filterDropdownOpenRef.current) return;
      if (e.target.closest('[data-filter-dropdown]')) return;
      closeAllDropdowns();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    console.log('Stored userInfo from localStorage:', storedUserInfo);

    if (storedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(storedUserInfo);
        console.log('Parsed userInfo:', parsedUserInfo);
        setUserInfo(parsedUserInfo);
        setError(null); // Clear any existing errors
      } catch (err) {
        console.error('Error parsing user info:', err);
        setError('Error loading user information');
      }
    } else {
      console.log('No userInfo found in localStorage');
      setError('No user information found. Please login again.');
    }
  }, []);

  useEffect(() => {
    if (userInfo && userInfo.ClientCode && !isFetchingRef.current) {
      // Only fetch if not already loading to prevent double loading
      const fetchData = async () => {
        isFetchingRef.current = true;
        // Show loader immediately when page loads
        setLoading(true);
        try {
          // Reset filters to default on page load/refresh
          const defaultFilters = {
            counterName: 'All',
            productId: 'All',
            categoryId: 'All',
            designId: 'All',
            boxName: 'All',
            vendor: 'All',
            branch: 'All',
            status: 'All',
            dateFrom: '',
            dateTo: ''
          };
          setFilterValues(defaultFilters);
          setCurrentPage(1);

          // Fetch stock data first (most important) - await this to show data quickly
          // Filters and templates can load in background without blocking
          try {
            await fetchLabeledStock(1, itemsPerPage, '', defaultFilters);
          } catch (err) {
            console.error('Stock data fetch failed:', err);
            setError('Failed to load stock data. Please try again.');
          }

          // Fetch filter data and templates in parallel (non-blocking, don't await)
          // These can load in background - page will work even if they fail
          Promise.allSettled([
            fetchFilterData(),
            fetchSavedTemplates()
          ]).then(([filterDataResult, templatesResult]) => {
            // Log results but don't block - each function handles its own errors
            if (filterDataResult.status === 'rejected') {
              console.warn('Filter data fetch failed, but continuing with stock data:', filterDataResult.reason);
            }
            if (templatesResult.status === 'rejected') {
              console.warn('Templates fetch failed, but continuing:', templatesResult.reason);
            }
          });
        } catch (error) {
          console.error('Error in initial data fetch:', error);
          setError('Failed to load data. Please refresh the page.');
        } finally {
          setLoading(false);
          isFetchingRef.current = false;
        }
      };
      fetchData();
    }
  }, [userInfo?.ClientCode]); // Only depend on ClientCode to prevent multiple calls

  // Function to fetch all filtered data (no pagination)
  const fetchAllFilteredData = async () => {
    try {
      setLoadingAllData(true);

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
        console.log('ClientCode not found in userInfo or localStorage');
        setError('Client code not found. Please login again.');
        setLoadingAllData(false);
        return;
      }

      // Build payload for all data: BranchId, CounterId, CategoryId, ProductId, PurityId as IDs
      const allBranchId = filterValues.branch !== 'All' && filterValues.branch && apiFilterData.branches?.length
        ? (() => {
            const selectedBranch = apiFilterData.branches.find(branch => {
              const n = branch.BranchName || branch.Name || branch.branchName || branch.name || '';
              return n === filterValues.branch || n.toLowerCase() === filterValues.branch.toLowerCase();
            });
            return selectedBranch ? Number(selectedBranch.Id ?? selectedBranch.id ?? 0) : 0;
          })()
        : 0;
      const payload = {
        ClientCode: clientCode,
        CategoryId: Number(getFilterValueForAPI('categoryId', filterValues.categoryId)) || 0,
        ProductId: Number(getFilterValueForAPI('productId', filterValues.productId)) || 0,
        DesignId: Number(getFilterValueForAPI('designId', filterValues.designId)) || 0,
        PurityId: Number(getFilterValueForAPI('purityId', filterValues.purityId)) || 0,
        FromDate: filterValues.dateFrom && filterValues.dateFrom.trim() !== '' ? filterValues.dateFrom.trim() : null,
        ToDate: filterValues.dateTo && filterValues.dateTo.trim() !== '' ? filterValues.dateTo.trim() : null,
        RFIDCode: "",
        PageNumber: 1,
        PageSize: 999999,
        BranchId: allBranchId,
        Status: showActiveOnly ? "Active" : (filterValues.status !== 'All' ? filterValues.status : "ApiActive"),
        SearchQuery: searchQuery && searchQuery.trim() !== '' ? searchQuery.trim() : "",
        ListType: "ascending",
        SortColumn: sortConfig.key || null
      };

      if (filterValues.counterName !== 'All' && filterValues.counterName) {
        const selectedCounter = apiFilterData.counters?.find(counter =>
          counter.CounterName === filterValues.counterName ||
          counter.Name === filterValues.counterName ||
          counter.counterName === filterValues.counterName ||
          (counter.CounterName && counter.CounterName.toLowerCase() === filterValues.counterName.toLowerCase()) ||
          (counter.Name && counter.Name.toLowerCase() === filterValues.counterName.toLowerCase())
        );
        if (selectedCounter) {
          payload.CounterId = Number(selectedCounter.Id ?? selectedCounter.id ?? 0);
        } else {
          console.warn('Counter not found in API data (all data fetch):', filterValues.counterName);
        }
      }
      if (filterValues.boxName !== 'All' && filterValues.boxName) {
        payload.BoxName = filterValues.boxName;
      }
      if (filterValues.vendor !== 'All' && filterValues.vendor) {
        payload.Vendor = filterValues.vendor;
      }

      console.log('Fetching ALL filtered data:', payload);

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllLabeledStock',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && Array.isArray(response.data)) {
        const allDataWithSerialNumbers = response.data.map((item, index) => ({
          ...item,
          srNo: index + 1,
          // Map stone fields from API response
          StoneWt: item.TotalStoneWeight !== undefined && item.TotalStoneWeight !== null ? item.TotalStoneWeight : (item.StoneWt || ''),
          StonePcs: item.TotalStonePieces !== undefined && item.TotalStonePieces !== null ? item.TotalStonePieces : (item.StonePcs || ''),
          StoneAmt: item.TotalStoneAmount !== undefined && item.TotalStoneAmount !== null ? item.TotalStoneAmount : (item.StoneAmt || ''),
          // Map diamond fields from API response
          DiamondWt: item.TotalDiamondWeight !== undefined && item.TotalDiamondWeight !== null ? item.TotalDiamondWeight : (item.DiamondWt || ''),
          // Map DiamondPcs to TotalDiamondPieces (pieces count)
          DiamondPcs: item.TotalDiamondPieces !== undefined && item.TotalDiamondPieces !== null ? item.TotalDiamondPieces : (item.DiamondPcs || item.DiamondPieces || ''),
          // Map DiamondAmount to TotalDiamondAmount (amount value)
          DiamondAmount: item.TotalDiamondAmount !== undefined && item.TotalDiamondAmount !== null ? item.TotalDiamondAmount : (item.DiamondAmount || ''),
          // Map making and hallmark fields from API response
          MakingFixedAmt: item.MakingFixedAmt !== undefined && item.MakingFixedAmt !== null ? item.MakingFixedAmt : (item.MakingFixedAmt || ''),
          HallmarkAmount: item.HallmarkAmount !== undefined && item.HallmarkAmount !== null ? item.HallmarkAmount : (item.HallmarkAmount || ''),
          MakingPerGram: item.MakingPerGram !== undefined && item.MakingPerGram !== null ? item.MakingPerGram : (item.MakingPerGram || ''),
          MakingPercentage: item.MakingPercentage !== undefined && item.MakingPercentage !== null ? item.MakingPercentage : (item.MakingPercentage || ''),
          FixedWastage: item.MakingFixedWastage !== undefined && item.MakingFixedWastage !== null ? item.MakingFixedWastage : (item.FixedWastage || ''),
          FixedAmt: item.MakingFixedAmt !== undefined && item.MakingFixedAmt !== null ? item.MakingFixedAmt : (item.FixedAmt || ''),
          // Map other fields that might have different names
          CounterName: item.CounterName || '',
          BoxName: item.BoxName || '',
          Vendor: item.VendorName || item.Vendor || '',
          Branch: item.BranchName || item.Branch || '',
          CategoryName: item.CategoryName || item.Category || '',
          DesignName: item.DesignName || item.Design || '',
          PurityName: item.PurityName || item.Purity || '',
          CreatedDate: item.CreatedOn || item.CreatedDate || '',
          PackingWeight: item.PackingWeight !== undefined && item.PackingWeight !== null ? item.PackingWeight : (item.PackingWeight || ''),
          TotalWeight: item.TotalWeight !== undefined && item.TotalWeight !== null ? item.TotalWeight : (item.TotalWeight || '')
        }));
        setAllFilteredData(allDataWithSerialNumbers);
        console.log(`Fetched ALL data: ${response.data.length} items`);

        // Debug: Log first item to verify field mapping
        if (allDataWithSerialNumbers.length > 0) {
          console.log('Sample mapped item (all data):', {
            ItemCode: allDataWithSerialNumbers[0].ItemCode,
            StoneWt: allDataWithSerialNumbers[0].StoneWt,
            StonePcs: allDataWithSerialNumbers[0].StonePcs,
            StoneAmt: allDataWithSerialNumbers[0].StoneAmt,
            DiamondWt: allDataWithSerialNumbers[0].DiamondWt,
            DiamondPcs: allDataWithSerialNumbers[0].DiamondPcs,
            DiamondAmount: allDataWithSerialNumbers[0].DiamondAmount,
            MakingFixedAmt: allDataWithSerialNumbers[0].MakingFixedAmt,
            HallmarkAmount: allDataWithSerialNumbers[0].HallmarkAmount,
            MakingPerGram: allDataWithSerialNumbers[0].MakingPerGram,
            MakingPercentage: allDataWithSerialNumbers[0].MakingPercentage,
            FixedWastage: allDataWithSerialNumbers[0].FixedWastage,
            FixedAmt: allDataWithSerialNumbers[0].FixedAmt,
            // Original API fields for comparison
            API_TotalStoneWeight: response.data[0].TotalStoneWeight,
            API_TotalStonePieces: response.data[0].TotalStonePieces,
            API_TotalStoneAmount: response.data[0].TotalStoneAmount,
            API_TotalDiamondWeight: response.data[0].TotalDiamondWeight,
            API_TotalDiamondPieces: response.data[0].TotalDiamondPieces,
            API_TotalDiamondAmount: response.data[0].TotalDiamondAmount,
            API_MakingFixedAmt: response.data[0].MakingFixedAmt,
            API_HallmarkAmount: response.data[0].HallmarkAmount
          });
        }
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (err) {
      console.error('Error fetching all data:', err);
      setError(err.message || 'Failed to fetch all filtered stock data');
    } finally {
      setLoadingAllData(false);
    }
  };

  // Function to fetch filter data from APIs
  const fetchFilterData = async () => {
    try {
      const clientCode = userInfo?.ClientCode;
      if (!clientCode) return;

      // Fetch all filter data in parallel for faster loading
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const requestBody = { ClientCode: clientCode };

      // Add timeout to prevent hanging requests (20 seconds)
      const timeoutConfig = { timeout: 20000 };

      // Use Promise.allSettled to handle individual API failures gracefully
      const [
        productsResult,
        designsResult,
        categoriesResult,
        puritiesResult,
        countersResult,
        branchesResult
      ] = await Promise.allSettled([
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllProductMaster', requestBody, { headers, ...timeoutConfig }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllDesign', requestBody, { headers, ...timeoutConfig }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllCategory', requestBody, { headers, ...timeoutConfig }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllPurity', requestBody, { headers, ...timeoutConfig }),
        axios.post('https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllCounters', requestBody, { headers, ...timeoutConfig }),
        axios.post('https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllBranchMaster', requestBody, { headers, ...timeoutConfig })
      ]);

      // Extract responses from settled promises, handling failures
      const productsResponse = productsResult.status === 'fulfilled' ? productsResult.value : null;
      const designsResponse = designsResult.status === 'fulfilled' ? designsResult.value : null;
      const categoriesResponse = categoriesResult.status === 'fulfilled' ? categoriesResult.value : null;
      const puritiesResponse = puritiesResult.status === 'fulfilled' ? puritiesResult.value : null;
      const countersResponse = countersResult.status === 'fulfilled' ? countersResult.value : null;
      const branchesResponse = branchesResult.status === 'fulfilled' ? branchesResult.value : null;

      // Log any failures
      if (productsResult.status === 'rejected') {
        console.warn('GetAllProductMaster failed:', productsResult.reason?.message || 'Unknown error');
      }
      if (designsResult.status === 'rejected') {
        console.warn('GetAllDesign failed:', designsResult.reason?.message || 'Unknown error');
      }
      if (categoriesResult.status === 'rejected') {
        console.warn('GetAllCategory failed:', categoriesResult.reason?.message || 'Unknown error');
      }
      if (puritiesResult.status === 'rejected') {
        console.warn('GetAllPurity failed:', puritiesResult.reason?.message || 'Unknown error');
      }
      if (countersResult.status === 'rejected') {
        console.warn('GetAllCounters failed:', countersResult.reason?.message || 'Unknown error');
      }
      if (branchesResult.status === 'rejected') {
        console.warn('GetAllBranchMaster failed:', branchesResult.reason?.message || 'Unknown error');
      }

      if (countersResponse) {
        console.log('Counters API Response:', countersResponse.data);
      }
      if (branchesResponse) {
        console.log('Branches API Response:', branchesResponse.data);
      }
      if (countersResponse) {
        console.log('Counters data structure:', {
          isArray: Array.isArray(countersResponse.data),
          length: countersResponse.data?.length,
          sampleItem: countersResponse.data?.[0],
          allKeys: countersResponse.data?.[0] ? Object.keys(countersResponse.data[0]) : []
        });
      }

      // Handle different response structures - some APIs might return objects or arrays
      const normalizeArray = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
          // If it's an object, try to extract array from common properties
          return data.data || data.items || data.results || data.list || [];
        }
        return [];
      };

      const normalizedData = {
        products: normalizeArray(productsResponse?.data),
        designs: normalizeArray(designsResponse?.data),
        categories: normalizeArray(categoriesResponse?.data),
        purities: normalizeArray(puritiesResponse?.data),
        counters: normalizeArray(countersResponse?.data),
        branches: normalizeArray(branchesResponse?.data)
      };

      setApiFilterData(normalizedData);

      console.log('Filter data loaded:', {
        products: normalizedData.products.length,
        designs: normalizedData.designs.length,
        categories: normalizedData.categories.length,
        purities: normalizedData.purities.length,
        counters: normalizedData.counters.length,
        branches: normalizedData.branches.length
      });

    } catch (error) {
      console.error('Error in fetchFilterData:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });

      // Set empty arrays for failed API calls to prevent errors
      // Don't overwrite existing data if we have it
      setApiFilterData(prev => ({
        products: prev?.products?.length > 0 ? prev.products : [],
        designs: prev?.designs?.length > 0 ? prev.designs : [],
        categories: prev?.categories?.length > 0 ? prev.categories : [],
        purities: prev?.purities?.length > 0 ? prev.purities : [],
        counters: prev?.counters?.length > 0 ? prev.counters : [],
        branches: prev?.branches?.length > 0 ? prev.branches : []
      }));
    }
  };

  const fetchLabeledStock = async (page = currentPage, pageSize = itemsPerPage, search = searchQuery, filters = filterValues, sort = sortConfig) => {
    // Prevent duplicate loading if already fetching
    if (isFetchingRef.current) {
      console.log('Already fetching, skipping duplicate fetch');
      return;
    }

    // Ensure we have valid filters
    const safeFilters = filters || {
      counterName: 'All',
      productId: 'All',
      categoryId: 'All',
      designId: 'All',
      purityId: 'All',
      boxName: 'All',
      vendor: 'All',
      branch: 'All',
      status: 'All'
    };

    isFetchingRef.current = true;
    try {
      setLoading(true);

      // Try to get ClientCode from userInfo or fallback to localStorage
      let clientCode = null;
      if (userInfo && userInfo.ClientCode) {
        clientCode = userInfo.ClientCode;
        console.log('userInfo check passed:', { userInfo, clientCode });
      } else {
        // Fallback: try to get from localStorage directly
        try {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            const parsedUserInfo = JSON.parse(storedUserInfo);
            if (parsedUserInfo && parsedUserInfo.ClientCode) {
              clientCode = parsedUserInfo.ClientCode;
              console.log('Fallback clientCode from localStorage:', clientCode);
            }
          }
        } catch (err) {
          console.error('Error in fallback userInfo retrieval:', err);
        }
      }

      if (!clientCode) {
        console.log('ClientCode not found in userInfo or localStorage');
        setError('Client code not found. Please login again.');
        setLoading(false);
        return;
      }

      setError(null); // Clear any existing errors

      // Build the payload: BranchId, CounterId, CategoryId, ProductId, PurityId as IDs for GetAllLabeledStock API
      const resolvedBranchId = safeFilters.branch !== 'All' && safeFilters.branch && apiFilterData.branches?.length
        ? (() => {
            const selectedBranch = apiFilterData.branches.find(branch => {
              const branchName = branch.BranchName || branch.Name || branch.branchName || branch.name || '';
              return branchName === safeFilters.branch || branchName.toLowerCase() === safeFilters.branch.toLowerCase();
            });
            return selectedBranch ? Number(selectedBranch.Id ?? selectedBranch.id ?? 0) : 0;
          })()
        : 0;
      const resolvedCategoryId = Number(getFilterValueForAPI('categoryId', safeFilters.categoryId)) || 0;
      const resolvedProductId = Number(getFilterValueForAPI('productId', safeFilters.productId)) || 0;
      const resolvedPurityId = Number(getFilterValueForAPI('purityId', safeFilters.purityId)) || 0;
      const resolvedDesignId = Number(getFilterValueForAPI('designId', safeFilters.designId)) || 0;

      const payload = {
        ClientCode: clientCode,
        CategoryId: resolvedCategoryId,
        ProductId: resolvedProductId,
        DesignId: resolvedDesignId,
        PurityId: resolvedPurityId,
        FromDate: safeFilters.dateFrom && safeFilters.dateFrom.trim() !== '' ? safeFilters.dateFrom.trim() : null,
        ToDate: safeFilters.dateTo && safeFilters.dateTo.trim() !== '' ? safeFilters.dateTo.trim() : null,
        RFIDCode: "", // Always include RFIDCode as empty string
        PageNumber: page,
        PageSize: pageSize,
        BranchId: resolvedBranchId,
        Status: showActiveOnly ? "Active" : (safeFilters.status !== 'All' ? safeFilters.status : "ApiActive"),
        SearchQuery: search && search.trim() !== '' ? search.trim() : "",
        ListType: sort && sort.direction === 'desc' ? "descending" : "ascending",
        SortColumn: sort && sort.key ? sort.key : null // Include SortColumn based on current sort configuration
      };

      // Counter: send CounterId in payload when user selects a counter
      if (safeFilters.counterName !== 'All' && safeFilters.counterName) {
        const selectedCounter = apiFilterData.counters?.find(counter =>
          counter.CounterName === safeFilters.counterName ||
          counter.Name === safeFilters.counterName ||
          counter.counterName === safeFilters.counterName ||
          (counter.CounterName && counter.CounterName.toLowerCase() === safeFilters.counterName.toLowerCase()) ||
          (counter.Name && counter.Name.toLowerCase() === safeFilters.counterName.toLowerCase())
        );
        if (selectedCounter) {
          payload.CounterId = Number(selectedCounter.Id ?? selectedCounter.id ?? 0);
        } else {
          console.warn('Counter not found in API data:', safeFilters.counterName, 'Available counters:', apiFilterData.counters);
        }
      }
      if (safeFilters.boxName !== 'All' && safeFilters.boxName) {
        payload.BoxName = safeFilters.boxName;
      }
      if (safeFilters.vendor !== 'All' && safeFilters.vendor) {
        payload.Vendor = safeFilters.vendor;
      }

      console.log(`API Request - Page ${page}:`, payload);
      console.log('Filter → API IDs:', {
        branch: safeFilters.branch,
        branchId: payload.BranchId,
        counterName: safeFilters.counterName,
        counterId: payload.CounterId,
        categoryId: payload.CategoryId,
        productId: payload.ProductId,
        purityId: payload.PurityId,
        designId: payload.DesignId
      });

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllLabeledStock',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000 // 20 seconds timeout to prevent hanging
        }
      );

      // Handle different response structures
      let dataArray = [];
      let totalCount = 0;

      if (response.data) {
        // Case 1: Direct array
        if (Array.isArray(response.data)) {
          dataArray = response.data;
          // Try to get total count from first item
          if (dataArray.length > 0 && dataArray[0].TotalCount !== undefined) {
            totalCount = dataArray[0].TotalCount;
          } else if (dataArray.length > 0 && dataArray[0].TotalRecords !== undefined) {
            totalCount = dataArray[0].TotalRecords;
          }
        }
        // Case 2: Nested in data property
        else if (response.data.data && Array.isArray(response.data.data)) {
          dataArray = response.data.data;
          totalCount = response.data.totalRecords || response.data.totalCount || response.data.total || dataArray.length;
        }
        // Case 3: Success wrapper
        else if (response.data.success && response.data.data && Array.isArray(response.data.data)) {
          dataArray = response.data.data;
          totalCount = response.data.totalRecords || response.data.totalCount || response.data.total || dataArray.length;
        }
        // Case 4: Deeply nested
        else if (response.data.data && response.data.data.data && Array.isArray(response.data.data.data)) {
          dataArray = response.data.data.data;
          totalCount = response.data.data.totalRecords || response.data.data.totalCount || response.data.data.total || dataArray.length;
        }
        // Case 5: Check root level for total count (even if data structure is different)
        else if (response.data.totalRecords !== undefined) {
          totalCount = response.data.totalRecords;
        } else if (response.data.totalCount !== undefined) {
          totalCount = response.data.totalCount;
        } else if (response.data.total !== undefined) {
          totalCount = response.data.total;
        }
      }

      // Process data if available
      if (dataArray.length > 0 || (Array.isArray(response.data) && response.data.length > 0)) {
        const stockData = dataArray.length > 0 ? dataArray : (Array.isArray(response.data) ? response.data : []);
        const stockWithSerialNumbers = stockData.map((item, index) => ({
          ...item,
          srNo: ((page - 1) * pageSize) + index + 1,
          // Map stone fields
          StoneWt: item.TotalStoneWeight !== undefined && item.TotalStoneWeight !== null ? item.TotalStoneWeight : (item.StoneWt || ''),
          StonePcs: item.TotalStonePieces !== undefined && item.TotalStonePieces !== null ? item.TotalStonePieces : (item.StonePcs || ''),
          StoneAmt: item.TotalStoneAmount !== undefined && item.TotalStoneAmount !== null ? item.TotalStoneAmount : (item.StoneAmt || ''),
          // Map diamond fields
          DiamondWt: item.TotalDiamondWeight !== undefined && item.TotalDiamondWeight !== null ? item.TotalDiamondWeight : (item.DiamondWt || ''),
          DiamondPcs: item.TotalDiamondPieces !== undefined && item.TotalDiamondPieces !== null ? item.TotalDiamondPieces : (item.DiamondPcs || ''),
          DiamondAmount: item.TotalDiamondAmount !== undefined && item.TotalDiamondAmount !== null ? item.TotalDiamondAmount : (item.DiamondAmount || ''),
          // Map making and hallmark fields
          MakingFixedAmt: item.MakingFixedAmt !== undefined && item.MakingFixedAmt !== null ? item.MakingFixedAmt : (item.MakingFixedAmt || ''),
          HallmarkAmount: item.HallmarkAmount !== undefined && item.HallmarkAmount !== null ? item.HallmarkAmount : (item.HallmarkAmount || ''),
          MakingPerGram: item.MakingPerGram !== undefined && item.MakingPerGram !== null ? item.MakingPerGram : (item.MakingPerGram || ''),
          MakingPercentage: item.MakingPercentage !== undefined && item.MakingPercentage !== null ? item.MakingPercentage : (item.MakingPercentage || ''),
          FixedWastage: item.MakingFixedWastage !== undefined && item.MakingFixedWastage !== null ? item.MakingFixedWastage : (item.FixedWastage || ''),
          FixedAmt: item.MakingFixedAmt !== undefined && item.MakingFixedAmt !== null ? item.MakingFixedAmt : (item.FixedAmt || ''),
          // Map other fields that might have different names
          CounterName: item.CounterName || '',
          BoxName: item.BoxName || '',
          Vendor: item.VendorName || item.Vendor || '',
          Branch: item.BranchName || item.Branch || '',
          CategoryName: item.CategoryName || item.Category || '',
          DesignName: item.DesignName || item.Design || '',
          PurityName: item.PurityName || item.Purity || '',
          CreatedDate: item.CreatedOn || item.CreatedDate || '',
          PackingWeight: item.PackingWeight !== undefined && item.PackingWeight !== null ? item.PackingWeight : (item.PackingWeight || ''),
          TotalWeight: item.TotalWeight !== undefined && item.TotalWeight !== null ? item.TotalWeight : (item.TotalWeight || '')
        }));
        setLabeledStock(stockWithSerialNumbers);

        // Set pagination info
        if (totalCount > 0) {
          setTotalRecords(totalCount);
          setTotalPages(Math.ceil(totalCount / pageSize));
          console.log(`Page ${page}: Received ${stockWithSerialNumbers.length} items, TotalRecords: ${totalCount}, TotalPages: ${Math.ceil(totalCount / pageSize)}`);
        } else if (stockWithSerialNumbers.length > 0) {
          // Fallback: if no total count, use current page size
          setTotalRecords(stockWithSerialNumbers.length);
          setTotalPages(Math.ceil(stockWithSerialNumbers.length / pageSize));
          console.log(`Page ${page}: Received ${stockWithSerialNumbers.length} items, No pagination info available`);
        } else {
          // No data
          setTotalRecords(0);
          setTotalPages(0);
          console.log(`Page ${page}: No data received`);
        }
      } else {
        // No data received
        setLabeledStock([]);
        setTotalRecords(0);
        setTotalPages(0);
        console.log(`Page ${page}: Empty response received`);
      }
    } catch (err) {
      console.error('Error fetching data:', err);

      // Handle different error types
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        // Timeout error
        setError('Request timed out. The server is taking too long to respond. Please try again.');
      } else if (err.response) {
        // Server responded with error status
        const status = err.response.status;
        const message = err.response.data?.message || err.response.data?.error || 'Server error occurred';

        if (status === 401) {
          setError('Unauthorized. Please login again.');
        } else if (status === 403) {
          setError('Access forbidden. Please check your permissions.');
        } else if (status === 404) {
          setError('API endpoint not found. Please contact support.');
        } else if (status >= 500) {
          setError('Server error. Please try again later.');
        } else {
          setError(message || 'Failed to fetch labeled stock data');
        }
      } else if (err.request) {
        // Request was made but no response received
        setError('Network error. Please check your connection and try again.');
      } else {
        // Something else happened
        setError(err.message || 'Failed to fetch labeled stock data');
      }

      // Clear data on error
      setLabeledStock([]);
      setTotalRecords(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Search functionality - now using server-side data
  const filteredStock = useMemo(() => {
    // Since we're using server-side pagination, we only filter the current page data
    // For full search/filter functionality, we would need to implement server-side filtering
    let filtered = labeledStock;

    // Filter by RFIDCode when showActiveOnly is true - only show items where RFIDCode is not null
    if (showActiveOnly) {
      filtered = filtered.filter(item => item.RFIDCode && item.RFIDCode.trim() !== '');
    }

    // Apply search query to current page data only
    if (searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(item =>
        Object.values(item).some(val =>
          (val !== undefined && val !== null && val.toString().toLowerCase().includes(q))
        )
      );
    }

    return filtered;
  }, [labeledStock, searchQuery, showActiveOnly]);

  // Pagination - now using server-side pagination
  const currentItems = filteredStock; // filteredStock now contains only the current page data

  const handleRowSelection = (id) => {
    setSelectedRows(prev => {
      if (prev.includes(id)) {
        return prev.filter(rowId => rowId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing page size
    // Show loader immediately
    setLoading(true);
    fetchLabeledStock(1, newItemsPerPage, searchQuery, filterValues); // Fetch new page with updated page size
  };

  const showSuccessNotification = (title, message) => {
    setSuccessMessage({ title, message });
    setShowSuccess(true);
  };

  // Fetch saved label templates
  const fetchSavedTemplates = async () => {
    if (!userInfo?.ClientCode) return;

    try {
      setTemplatesLoading(true);
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const requestBody = { ClientCode: userInfo.ClientCode };

      // Use LabelTemplates API (matching backend) with timeout
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/LabelTemplates/GetAllLabelTemplates',
        requestBody,
        {
          headers,
          timeout: 10000 // 10 seconds timeout
        }
      );

      const normalizeArray = (data) => {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
          return data.data || data.items || data.results || data.list || [];
        }
        return [];
      };

      setSavedTemplates(normalizeArray(response.data));
    } catch (error) {
      console.error('Error fetching saved templates:', error);
      // Don't show error notification for 500 errors - just log and continue
      if (error.response?.status !== 500) {
        setSavedTemplates([]);
        addNotification({
          type: 'error',
          title: 'Error',
          message: error.response?.data?.message || 'Failed to load saved templates.'
        });
      } else {
        // For 500 errors, just set empty array and continue silently
        setSavedTemplates([]);
        console.warn('GetAllLabelTemplates returned 500 error - continuing without templates');
      }
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Template options for dropdown
  const templateOptions = useMemo(() => {
    const options = savedTemplates.map((template) => ({
      value: template.Id || template.id || template.LabelTemplateId,
      label: template.TemplateName || template.Name || 'Unnamed Template',
      template: template,
    }));
    return options;
  }, [savedTemplates]);

  // Auto-select first template when templates are loaded
  useEffect(() => {
    if (templateOptions.length > 0 && !selectedTemplate && !templatesLoading) {
      setSelectedTemplate(templateOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateOptions.length, templatesLoading]);

  // Function to print a single label
  const handlePrintSingleLabel = async (item, e) => {
    if (e) {
      e.stopPropagation(); // Prevent row selection
    }

    if (!selectedTemplate) {
      showSuccessNotification('No Template Selected', 'Please select a template from the dropdown to print labels.');
      return;
    }

    try {
      setPreviewLoading(true);

      // Prepare API payload
      const clientCode = userInfo?.ClientCode || '';
      const templateId = selectedTemplate.value;

      // Build payload - use ItemCode if available, otherwise RFIDCode
      const payload = {
        clientCode: clientCode,
        templateId: templateId,
        itemCode: item.ItemCode || null,
        rfidCode: item.RFIDCode || null,
        itemCodes: null,
        rfidCodes: null
      };

      // Call GenerateLabel API
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/LabelTemplates/GenerateLabel',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Process response
      const labels = response.data.labels || response.data.Labels || [];

      if (!labels || labels.length === 0) {
        showSuccessNotification('Error', 'No label was generated. Please check the item.');
        setPreviewLoading(false);
        return;
      }

      const label = labels[0];

      if (!(label.isSuccess || label.IsSuccess)) {
        const errorMsg = label.errorMessage || label.ErrorMessage || 'Failed to generate label.';
        showSuccessNotification('Error', errorMsg);
        setPreviewLoading(false);
        return;
      }

      const generatedLayout = label.generatedLayout || label.GeneratedLayout;

      if (!generatedLayout) {
        showSuccessNotification('Error', 'Invalid label layout received from server.');
        setPreviewLoading(false);
        return;
      }

      // Extract label data from elements (for PDF generation)
      const labelData = {};
      if (generatedLayout.elements) {
        generatedLayout.elements.forEach(element => {
          if (element.binding && element.value !== undefined) {
            labelData[element.binding] = element.value;
          }
        });
      }

      // Add item code and RFID code
      labelData.ItemCode = label.itemCode || label.ItemCode || item.ItemCode || '';
      labelData.RFIDCode = label.rfidCode || label.RFIDCode || item.RFIDCode || '';

      // Ensure Stone Amount and all other important fields are always mapped from item data
      // This ensures they're available even if API doesn't return them in the layout
      // Use item data as fallback if labelData doesn't have the value or if it's empty
      if (!labelData.StoneAmount || labelData.StoneAmount === '' || labelData.StoneAmount === null) {
        labelData.StoneAmount = item.TotalStoneAmount || item.StoneAmt || item.StoneAmount || '';
      }
      if (!labelData.TotalStoneWeight || labelData.TotalStoneWeight === '' || labelData.TotalStoneWeight === null) {
        labelData.TotalStoneWeight = item.TotalStoneWeight || item.StoneWt || item.StoneWeight || '';
      }
      if (!labelData.StoneWeight || labelData.StoneWeight === '' || labelData.StoneWeight === null) {
        labelData.StoneWeight = item.TotalStoneWeight || item.StoneWt || item.StoneWeight || '';
      }
      if (!labelData.DiamondAmount || labelData.DiamondAmount === '' || labelData.DiamondAmount === null) {
        labelData.DiamondAmount = item.TotalDiamondAmount || item.DiamondAmount || '';
      }
      if (!labelData.DiamondWeight || labelData.DiamondWeight === '' || labelData.DiamondWeight === null) {
        labelData.DiamondWeight = item.TotalDiamondWeight || item.DiamondWt || item.DiamondWeight || '';
      }
      if (!labelData.GrossWt || labelData.GrossWt === '' || labelData.GrossWt === null) {
        labelData.GrossWt = item.GrossWt || item.GrossWeight || '';
      }
      if (!labelData.NetWt || labelData.NetWt === '' || labelData.NetWt === null) {
        labelData.NetWt = item.NetWt || item.NetWeight || '';
      }
      if (!labelData.ProductName || labelData.ProductName === '' || labelData.ProductName === null) {
        labelData.ProductName = item.ProductName || '';
      }
      if (!labelData.CategoryName || labelData.CategoryName === '' || labelData.CategoryName === null) {
        labelData.CategoryName = item.CategoryName || item.Category || '';
      }
      if (!labelData.DesignName || labelData.DesignName === '' || labelData.DesignName === null) {
        labelData.DesignName = item.DesignName || item.Design || '';
      }
      if (!labelData.PurityName || labelData.PurityName === '' || labelData.PurityName === null) {
        labelData.PurityName = item.PurityName || item.Purity || '';
      }
      if (!labelData.BranchName || labelData.BranchName === '' || labelData.BranchName === null) {
        labelData.BranchName = item.BranchName || item.Branch || '';
      }
      if (!labelData.CounterName || labelData.CounterName === '' || labelData.CounterName === null) {
        labelData.CounterName = item.CounterName || item.Counter || '';
      }
      if (!labelData.MRP || labelData.MRP === '' || labelData.MRP === null) {
        labelData.MRP = item.MRP || '';
      }
      if (!labelData.Size || labelData.Size === '' || labelData.Size === null) {
        labelData.Size = item.Size || '';
      }
      if (!labelData.MakingFixedAmt || labelData.MakingFixedAmt === '' || labelData.MakingFixedAmt === null) {
        labelData.MakingFixedAmt = item.MakingFixedAmt || item.FixedAmt || '';
      }
      if (!labelData.HallmarkAmount || labelData.HallmarkAmount === '' || labelData.HallmarkAmount === null) {
        labelData.HallmarkAmount = item.HallmarkAmount || '';
      }
      if (!labelData.MakingPerGram || labelData.MakingPerGram === '' || labelData.MakingPerGram === null) {
        labelData.MakingPerGram = item.MakingPerGram || '';
      }
      if (!labelData.MakingPercentage || labelData.MakingPercentage === '' || labelData.MakingPercentage === null) {
        labelData.MakingPercentage = item.MakingPercentage || '';
      }
      if (!labelData.BoxDetails || labelData.BoxDetails === '' || labelData.BoxDetails === null) {
        labelData.BoxDetails = item.BoxDetails || item.box_details || '';
      }
      if (!labelData.RFIDNumber || labelData.RFIDNumber === '' || labelData.RFIDNumber === null) {
        labelData.RFIDNumber = item.RFIDNumber || item.RFIDCode || '';
      }

      // Debug log to verify StoneAmount is populated
      console.log('Label Data for printing:', {
        StoneAmount: labelData.StoneAmount,
        itemStoneAmount: item.TotalStoneAmount || item.StoneAmt || item.StoneAmount,
        allLabelData: labelData
      });

      // Generate and open PDF directly
      await generateAndOpenPDF(generatedLayout, labelData, item);
      setPreviewLoading(false);

    } catch (error) {
      console.error('Error generating label:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to generate label. Please try again.';
      showSuccessNotification('Error', errorMessage);
      setPreviewLoading(false);
    }
  };

  // Function to generate and open PDF directly
  const generateAndOpenPDF = async (layout, labelData, item) => {
    try {
      // Import required libraries
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      const QRCode = (await import('qrcode')).default;

      // Create a temporary container for rendering - completely hidden
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-99999px';
      tempContainer.style.top = '-99999px';
      tempContainer.style.width = `${layout.page.width}px`;
      tempContainer.style.height = `${layout.page.height}px`;
      tempContainer.style.background = '#ffffff';
      tempContainer.style.overflow = 'hidden';
      tempContainer.style.opacity = '0';
      tempContainer.style.pointerEvents = 'none';
      tempContainer.style.visibility = 'hidden';
      tempContainer.className = 'label-canvas-print-target';
      document.body.appendChild(tempContainer);

      // Render elements directly to DOM
      layout.elements.forEach(element => {
        const elementDiv = document.createElement('div');
        elementDiv.style.position = 'absolute';
        elementDiv.style.left = `${element.x}px`;
        elementDiv.style.top = `${element.y}px`;
        elementDiv.style.width = `${element.width}px`;
        elementDiv.style.height = `${element.height}px`;
        elementDiv.style.zIndex = element.zIndex || 10;

        if (element.type === 'text') {
          const labelText = element.label || '';
          // Get binding value - ALWAYS use labelData if binding exists (it has fallback from item data)
          let bindingValue = '';
          if (element.binding) {
            // If element has a binding, ALWAYS use labelData first (which has fallback from item data)
            // This ensures StoneAmount and other fields always show even if API returns empty
            const labelDataValue = labelData[element.binding];
            if (labelDataValue !== undefined && labelDataValue !== null && String(labelDataValue).trim() !== '') {
              bindingValue = String(labelDataValue);
            } else if (element.value !== undefined && element.value !== null && String(element.value).trim() !== '') {
              // Fallback to element.value only if labelData is empty
              bindingValue = String(element.value);
            }
          } else if (element.value !== undefined && element.value !== null && String(element.value).trim() !== '') {
            // No binding, just use element.value
            bindingValue = String(element.value);
          }

          // Debug log for StoneAmount binding
          if (element.binding === 'StoneAmount') {
            console.log('Rendering StoneAmount element:', {
              binding: element.binding,
              elementValue: element.value,
              labelDataValue: labelData[element.binding],
              finalBindingValue: bindingValue,
              labelText: labelText,
              itemData: {
                TotalStoneAmount: item.TotalStoneAmount,
                StoneAmt: item.StoneAmt,
                StoneAmount: item.StoneAmount
              }
            });
          }

          let displayText = '';
          if (labelText && bindingValue) {
            displayText = `${labelText}: ${bindingValue}`;
          } else if (labelText) {
            displayText = labelText;
          } else if (bindingValue) {
            displayText = bindingValue;
          }

          elementDiv.style.fontSize = `${element.fontSize || 12}px`;
          elementDiv.style.fontWeight = element.fontWeight || 'normal';
          elementDiv.style.color = element.color || '#000000';
          elementDiv.style.display = 'flex';
          elementDiv.style.alignItems = 'center';
          elementDiv.style.padding = '2px';
          elementDiv.style.whiteSpace = 'nowrap';
          elementDiv.style.overflow = 'hidden';
          elementDiv.textContent = displayText;
        } else if (element.type === 'qrcode') {
          // QR code will be added directly to PDF, just mark the position
          elementDiv.style.border = '1px dashed transparent';
          elementDiv.setAttribute('data-qr-value', element.value || labelData.ItemCode || '');
          elementDiv.setAttribute('data-qr-size', element.width || 60);
        }

        tempContainer.appendChild(elementDiv);
      });

      // Wait a bit for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture canvas while container is still hidden off-screen
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: layout.page.width,
        height: layout.page.height,
        windowWidth: layout.page.width,
        windowHeight: layout.page.height,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (element) => {
          return element.hasAttribute('data-qr-value');
        },
        onclone: (clonedDoc) => {
          // Ensure cloned document also has hidden container
          const clonedContainer = clonedDoc.querySelector('.label-canvas-print-target');
          if (clonedContainer) {
            clonedContainer.style.position = 'fixed';
            clonedContainer.style.left = '0px';
            clonedContainer.style.top = '0px';
            clonedContainer.style.opacity = '1';
            clonedContainer.style.visibility = 'visible';
          }
        }
      });

      // Cleanup immediately
      document.body.removeChild(tempContainer);

      // Convert to image
      const imgData = canvas.toDataURL('image/png', 1.0);

      // Get dimensions in mm
      const pxToMm = 0.264583; // 96 DPI
      let labelWidthMm = layout.page.width * pxToMm;
      let labelHeightMm = layout.page.height * pxToMm;

      // Ensure minimum dimensions (at least 10mm)
      if (labelWidthMm < 10) labelWidthMm = 100;
      if (labelHeightMm < 10) labelHeightMm = 50;

      // Create PDF with proper dimensions
      const doc = new jsPDF({
        orientation: labelWidthMm > labelHeightMm ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [Math.max(labelHeightMm, 10), Math.max(labelWidthMm, 10)]
      });

      // Add background image
      doc.addImage(imgData, 'PNG', 0, 0, labelWidthMm, labelHeightMm);

      // Add QR codes directly to PDF for better quality
      const qrElementsArray = layout.elements.filter(el => el.type === 'qrcode');
      for (const qrElement of qrElementsArray) {
        const qrValue = qrElement.value || labelData.ItemCode || '';
        if (qrValue) {
          const qrDataUrl = await QRCode.toDataURL(String(qrValue), {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 1.0,
            margin: 1,
            width: (qrElement.width || 60) * 3
          });
          const qrX = qrElement.x * pxToMm;
          const qrY = qrElement.y * pxToMm;
          const qrWidth = (qrElement.width || 60) * pxToMm;
          const qrHeight = (qrElement.height || qrElement.width || 60) * pxToMm;
          doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrWidth, qrHeight);
        }
      }

      // Open PDF in new tab
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const newTab = window.open(pdfUrl, '_blank');

      if (!newTab) {
        // Fallback: download the PDF
        doc.save(`Label-${labelData.ItemCode || 'N/A'}.pdf`);
        showSuccessNotification('Info', 'PDF downloaded. Please check your downloads folder.');
      } else {
        // Clean up the blob URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 1000);
      }

      showSuccessNotification('Success', `Label PDF opened for ${labelData.ItemCode || 'N/A'}.`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      showSuccessNotification('Error', 'Failed to generate PDF. Please try again.');
      throw error;
    }
  };

  // Helper function to handle dropdown search and filtering
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
      } else if (field === 'boxName') {
        const options = filterOptions.boxNames || [];
        filteredOptions = options.filter(opt => opt !== 'All' && opt.toLowerCase().includes(searchTerm.toLowerCase()));
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
      } else if (field === 'status') {
        const options = filterOptions.statuses || [];
        filteredOptions = options.filter(opt => opt !== 'All' && opt.toLowerCase().includes(searchTerm.toLowerCase()));
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

  // Helper function to toggle dropdown
  // Helper function to toggle dropdown with auto-close of others
  const toggleDropdown = (field) => {
    setDropdownStates(prev => {
      // Create a new state object where all dropdowns are closed
      const updated = {};
      Object.keys(prev).forEach(key => {
        // Reset all to closed, clear search terms if you want, or keep them.
        // Existing logic for closeAllDropdowns cleared search terms: searchTerm: ''
        updated[key] = { ...prev[key], isOpen: false, searchTerm: '' };
      });

      // If the clicked dropdown was NOT open, open it now
      // We check prev[field].isOpen to see if it was open before this click
      if (!prev[field]?.isOpen) {
        updated[field] = {
          ...prev[field],
          isOpen: true,
          searchTerm: prev[field]?.searchTerm || ''
        };
      }

      return updated;
    });
  };

  // Helper function to close all dropdowns
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
      <div data-filter-dropdown style={{ position: 'relative', width: '100%' }}>
        <label style={{
          display: 'block',
          fontSize: windowWidth <= 768 ? '11px' : '10px',
          fontWeight: 600,
          color: '#475569',
          marginBottom: '6px'
        }}>{label}</label>
        <div style={{ position: 'relative' }}>
          <div
            onClick={(e) => {
              e.stopPropagation();
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
                <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                  <input
                    type="text"
                    placeholder={placeholder || `Search ${label.toLowerCase()}...`}
                    value={searchTerm}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleDropdownSearch(field, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      color: '#1e293b',
                      background: '#fff'
                    }}
                    onFocus={(e) => {
                      e.stopPropagation();
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
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
                    <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                      No results found
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

  const handleExportAllReport = async () => {
    try {
      setExportLoading(true);

      // Get ClientCode
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
          console.error('Error retrieving userInfo:', err);
        }
      }

      if (!clientCode) {
        addNotification({
          title: 'Export Failed',
          description: 'Client code not found. Please login again.',
          type: 'error'
        });
        setExportLoading(false);
        return;
      }

      // Build the payload - same structure as GetAllLabeledStock but without pagination
      const safeFilters = filterValues || {
        counterName: 'All',
        productId: 'All',
        categoryId: 'All',
        designId: 'All',
        purityId: 'All',
        boxName: 'All',
        vendor: 'All',
        branch: 'All',
        status: 'All'
      };

      // Export payload: BranchId, CounterId, CategoryId, ProductId, PurityId as IDs
      const exportBranchId = safeFilters.branch !== 'All' && safeFilters.branch && apiFilterData.branches?.length
        ? (() => {
            const selectedBranch = apiFilterData.branches.find(branch => {
              const n = branch.BranchName || branch.Name || branch.branchName || branch.name || '';
              return n === safeFilters.branch || n.toLowerCase() === safeFilters.branch.toLowerCase();
            });
            return selectedBranch ? Number(selectedBranch.Id ?? selectedBranch.id ?? 0) : 0;
          })()
        : 0;
      const payload = {
        ClientCode: clientCode,
        CategoryId: Number(getFilterValueForAPI('categoryId', safeFilters.categoryId)) || 0,
        ProductId: Number(getFilterValueForAPI('productId', safeFilters.productId)) || 0,
        DesignId: Number(getFilterValueForAPI('designId', safeFilters.designId)) || 0,
        PurityId: Number(getFilterValueForAPI('purityId', safeFilters.purityId)) || 0,
        FromDate: safeFilters.dateFrom && safeFilters.dateFrom.trim() !== '' ? safeFilters.dateFrom.trim() : null,
        ToDate: safeFilters.dateTo && safeFilters.dateTo.trim() !== '' ? safeFilters.dateTo.trim() : null,
        RFIDCode: "",
        BranchId: exportBranchId,
        Status: safeFilters.status !== 'All' ? safeFilters.status : "ApiActive",
        SearchQuery: searchQuery && searchQuery.trim() !== '' ? searchQuery.trim() : "",
        ListType: sortConfig && (sortConfig.direction === 'desc' || sortConfig.direction === 'descending') ? "descending" : "ascending",
        SortColumn: sortConfig && sortConfig.key ? sortConfig.key : null
      };

      if (safeFilters.counterName !== 'All' && safeFilters.counterName) {
        const selectedCounter = apiFilterData.counters?.find(counter =>
          counter.CounterName === safeFilters.counterName ||
          counter.Name === safeFilters.counterName ||
          counter.counterName === safeFilters.counterName ||
          (counter.CounterName && counter.CounterName.toLowerCase() === safeFilters.counterName.toLowerCase()) ||
          (counter.Name && counter.Name.toLowerCase() === safeFilters.counterName.toLowerCase())
        );
        if (selectedCounter) {
          payload.CounterId = Number(selectedCounter.Id ?? selectedCounter.id ?? 0);
        }
      }
      if (safeFilters.boxName !== 'All' && safeFilters.boxName) {
        payload.BoxName = safeFilters.boxName;
      }
      if (safeFilters.vendor !== 'All' && safeFilters.vendor) {
        payload.Vendor = safeFilters.vendor;
      }

      console.log('Export All Report - API Request:', payload);

      // Call the export API
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/ExportLabelledStockToExcel',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          responseType: 'blob', // Important for file download
          timeout: 300000 // 5 minutes timeout for large exports
        }
      );

      // Create a blob from the response
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'LabelledStock_Export.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      } else {
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        filename = `LabelledStock_Export_${timestamp}.xlsx`;
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success popup
      addNotification({
        title: 'Export Successful',
        description: `All labeled stock data has been exported to Excel successfully. File: ${filename}`,
        type: 'success'
      });

      // Show success notification
      showSuccessNotification(
        'Export Successful',
        `All labeled stock data has been exported to Excel successfully.\nFile: ${filename}`
      );

    } catch (error) {
      console.error('Export All Report error:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to export labeled stock. Please try again.';

      addNotification({
        title: 'Export Failed',
        description: errorMessage,
        type: 'error'
      });

      showSuccessNotification('Export Failed', errorMessage);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    try {
      setExportLoading(true);
      setExportErrors({ ...exportErrors, excel: '' });

      const wb = XLSX.utils.book_new();

      // Use all filtered data if available, otherwise use current page data
      const dataToExport = showAllData && allFilteredData.length > 0 ? allFilteredData : filteredStock;

      const exportData = dataToExport.map((item, index) => ({
        'Sr No': index + 1,
        'Counter Name': item.CounterName || '',
        'Item Code': item.ItemCode || '',
        'RFID Code': item.RFIDCode || '',
        'Product Name': item.ProductName || '',
        'Category': item.CategoryName || item.Category || '',
        'Design': item.DesignName || item.Design || '',
        'Purity': item.PurityName || item.Purity || '',
        'Gross Wt': item.GrossWt ? Number(item.GrossWt).toFixed(3) : '',
        'Stone Wt': item.StoneWt ? Number(item.StoneWt).toFixed(3) : '',
        'Diamond Wt': item.DiamondWt ? Number(item.DiamondWt).toFixed(3) : '',
        'Net Wt': item.NetWt ? Number(item.NetWt).toFixed(3) : '',
        'Stone Amt': item.StoneAmt ? Number(item.StoneAmt).toFixed(2) : '',
        'Fixed Amt': item.FixedAmt ? Number(item.FixedAmt).toFixed(2) : '',
        'Vendor': item.Vendor || '',
        'Branch': item.Branch || '',
        'Created Date': item.CreatedDate ? new Date(item.CreatedDate).toLocaleDateString('en-GB') : '',
        'Packing Weight': item.PackingWeight ? Number(item.PackingWeight).toFixed(3) : '',
        'Total Weight': item.TotalWeight ? Number(item.TotalWeight).toFixed(3) : '',
        'Status': item.Status || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);

      ws['!cols'] = [
        { wch: 8 },  // Sr No
        { wch: 15 }, // Counter Name
        { wch: 12 }, // Item Code
        { wch: 15 }, // RFID Code
        { wch: 25 }, // Product Name
        { wch: 15 }, // Category
        { wch: 15 }, // Design
        { wch: 12 }, // Purity
        { wch: 12 }, // Gross Wt
        { wch: 12 }, // Stone Wt
        { wch: 12 }, // Diamond Wt
        { wch: 12 }, // Net Wt
        { wch: 12 }, // Stone Amt
        { wch: 12 }, // Fixed Amt
        { wch: 15 }, // Vendor
        { wch: 15 }, // Branch
        { wch: 15 }, // Created Date
        { wch: 15 }, // Packing Weight
        { wch: 15 }, // Total Weight
        { wch: 12 }  // Status
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Label Stock");

      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `label_stock_${date}.xlsx`);

      // Show success notification before closing modal
      showSuccessNotification(
        'Export Successful',
        'Data has been exported to Excel successfully'
      );

      // Add a small delay before closing the modal
      setTimeout(() => {
        setShowExportModal(false);
        setExportLoading(false);
      }, 500);

      // After export:
      addNotification({
        title: 'Export successful',
        description: `Label stock exported to Excel by ${userInfo?.Username || userInfo?.UserName || 'User'}`,
        type: 'info'
      });
    } catch (error) {
      console.error('Excel export error:', error);
      setExportErrors({ ...exportErrors, excel: 'Failed to export Excel. Please try again.' });
      setExportLoading(false);
    }
  };

  const handleExportCatalog = async () => {
    try {
      setExportLoading(true);
      setExportErrors({ ...exportErrors, pdf: '' });

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFontSize(16);
      doc.text('Product Catalog', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

      // Use all filtered data if available, otherwise use current filtered stock
      const dataToExport = showAllData && allFilteredData.length > 0 ? allFilteredData : filteredStock;

      let x = 14;
      let y = 30;
      const cardWidth = 57; // 3 items per row approx (14 + 57 + 5 + 57 + 5 + 57 + 14 = 209 close to 210)
      const cardHeight = 75;
      const gap = 6;
      const columns = 3;

      const IMAGE_LOAD_TIMEOUT_MS = 8000;

      const blobToDataURL = (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

      const getBase64ImageFromURL = (url) => {
        if (!url) return Promise.resolve(null);
        const fullUrl = url.startsWith('http') ? url : `${IMAGE_BASE_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
        const proxyBase = typeof process !== 'undefined' && process.env?.REACT_APP_CATALOG_IMAGE_PROXY;

        const withTimeout = (p) =>
          Promise.race([
            p,
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), IMAGE_LOAD_TIMEOUT_MS))
          ]);

        const fetchAsBlob = (targetUrl) =>
          fetch(targetUrl, { mode: 'cors', credentials: 'omit' })
            .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('not ok'))))
            .then((blob) => blobToDataURL(blob));

        const viaFetch = (targetUrl) => withTimeout(fetchAsBlob(targetUrl));

        const viaImage = () =>
          new Promise((resolve) => {
            const img = new Image();
            img.setAttribute('crossOrigin', 'anonymous');
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || img.width;
              canvas.height = img.naturalHeight || img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              try {
                resolve(canvas.toDataURL('image/jpeg', 0.85));
              } catch (e) {
                resolve(null);
              }
            };
            img.onerror = () => resolve(null);
            img.src = fullUrl;
          });

        const tryDirect = () => viaFetch(fullUrl).catch(() => withTimeout(viaImage()));
        const tryProxy = () => (proxyBase ? viaFetch(`${proxyBase}?url=${encodeURIComponent(fullUrl)}`) : Promise.reject());

        return tryDirect().catch(() => tryProxy()).catch(() => null);
      };

      for (let i = 0; i < dataToExport.length; i++) {
        const item = dataToExport[i];
        const imageUrl = getItemImageUrl(item);

        if (y + cardHeight > pageHeight - 10) {
          doc.addPage();
          y = 20;
          x = 14;
        }

        doc.setDrawColor(220, 220, 220);
        doc.rect(x, y, cardWidth, cardHeight);

        const imageH = cardHeight * 0.55;
        if (imageUrl) {
          try {
            const imgData = await getBase64ImageFromURL(imageUrl);
            if (imgData) {
              doc.addImage(imgData, 'JPEG', x + 2, y + 2, cardWidth - 4, imageH, undefined, 'FAST');
            } else {
              doc.setFontSize(8);
              doc.text('No Image', x + cardWidth / 2, y + imageH / 2 + 2, { align: 'center' });
            }
          } catch (e) {
            doc.setFontSize(8);
            doc.text('No Image', x + cardWidth / 2, y + imageH / 2 + 2, { align: 'center' });
          }
        } else {
          doc.setFontSize(8);
          doc.text('No Image', x + cardWidth / 2, y + imageH / 2 + 2, { align: 'center' });
        }

        // Product Details
        const detailsY = y + imageH + 5;
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        const productName = item.ProductName || 'Unknown';
        // Truncate name
        const truncatedName = productName.length > 22 ? productName.substring(0, 22) + '...' : productName;
        doc.text(truncatedName, x + 2, detailsY);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text(`RFID: ${item.RFIDCode || '-'}`, x + 2, detailsY + 5);
        doc.text(`Item: ${item.ItemCode || '-'}`, x + 2, detailsY + 9);
        doc.text(`Gr Wt: ${item.GrossWt || '-'}`, x + 2, detailsY + 13);
        doc.text(`Nt Wt: ${item.NetWt || '-'}`, x + 2, detailsY + 17);
        doc.text(`Purity: ${item.Purity || '-'}`, x + 2, detailsY + 21);

        // Move X
        x += cardWidth + gap;

        // Check row full
        if ((i + 1) % columns === 0) {
          x = 14;
          y += cardHeight + gap;
        }
      }

      const date = new Date().toISOString().split('T')[0];
      const pdfBlob = doc.output('bloburl');
      window.open(pdfBlob, '_blank');

      showSuccessNotification('Catalog Exported', 'Catalog PDF has been opened in new tab');
      setTimeout(() => {
        setShowExportModal(false);
        setExportLoading(false);
      }, 500);

    } catch (error) {
      console.error('Catalog export error:', error);
      setExportErrors({ ...exportErrors, pdf: 'Failed to generate catalog.' });
      setExportLoading(false);
    }
  };

  const handleExportToPDF = async () => {
    try {
      setExportLoading(true);
      setExportErrors({ ...exportErrors, pdf: '' });

      const doc = new jsPDF('landscape');
      doc.setFontSize(16);
      doc.text('Label Stock List', 15, 20);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 28);
      doc.text(`Total Records: ${filteredStock.length}`, 15, 34);

      // Use the columns array for headers and keys
      const tableHeaders = columns.map(col => col.label);
      const tableKeys = columns.map(col => col.key);

      // Use all filtered data if available, otherwise use current page data
      const dataToExport = showAllData && allFilteredData.length > 0 ? allFilteredData : filteredStock;

      const tableData = dataToExport.map((item, idx) =>
        tableKeys.map(key => {
          if (key === 'srNo') return idx + 1;
          const val = item[key];
          if (val === undefined || val === null || val === '') return '-';
          if (typeof val === 'number') return val;
          return val;
        })
      );

      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [69, 73, 232], textColor: 255, fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 8, right: 8 },
        tableWidth: 'auto',
      });

      const date = new Date().toISOString().split('T')[0];
      doc.save(`label_stock_${date}.pdf`);

      showSuccessNotification('Export Successful', 'Data has been exported to PDF successfully');
      setTimeout(() => {
        setShowExportModal(false);
        setExportLoading(false);
      }, 500);
    } catch (error) {
      console.error('PDF export error:', error);
      setExportErrors({ ...exportErrors, pdf: 'Failed to generate PDF. Please try again.' });
      setExportLoading(false);
    }
  };

  const handleEmailExport = async () => {
    if (!emailAddress) {
      setExportErrors({ ...exportErrors, email: 'Please enter an email address' });
      return;
    }

    if (!emailAddress.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setExportErrors({ ...exportErrors, email: 'Please enter a valid email address' });
      return;
    }

    setExportLoading(true);
    setExportErrors({ ...exportErrors, email: '' });

    try {
      const wb = XLSX.utils.book_new();

      // Use all filtered data if available, otherwise use current page data
      const dataToExport = showAllData && allFilteredData.length > 0 ? allFilteredData : filteredStock;

      const exportData = dataToExport.map((item, index) => ({
        'Sr No': index + 1,
        'Counter Name': item.CounterName || '',
        'Item Code': item.ItemCode || '',
        'RFID Code': item.RFIDCode || '',
        'Product Name': item.ProductName || '',
        'Category': item.CategoryName || item.Category || '',
        'Design': item.DesignName || item.Design || '',
        'Purity': item.PurityName || item.Purity || '',
        'Gross Wt': item.GrossWt ? Number(item.GrossWt).toFixed(3) : '',
        'Stone Wt': item.StoneWt ? Number(item.StoneWt).toFixed(3) : '',
        'Diamond Wt': item.DiamondWt ? Number(item.DiamondWt).toFixed(3) : '',
        'Net Wt': item.NetWt ? Number(item.NetWt).toFixed(3) : '',
        'Stone Amt': item.StoneAmt ? Number(item.StoneAmt).toFixed(2) : '',
        'Fixed Amt': item.FixedAmt ? Number(item.FixedAmt).toFixed(2) : '',
        'Vendor': item.Vendor || '',
        'Branch': item.Branch || '',
        'Created Date': item.CreatedDate ? new Date(item.CreatedDate).toLocaleDateString('en-GB') : '',
        'Packing Weight': item.PackingWeight ? Number(item.PackingWeight).toFixed(3) : '',
        'Total Weight': item.TotalWeight ? Number(item.TotalWeight).toFixed(3) : '',
        'Status': item.Status || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);

      ws['!cols'] = [
        { wch: 8 },  // Sr No
        { wch: 15 }, // Counter Name
        { wch: 12 }, // Item Code
        { wch: 15 }, // RFID Code
        { wch: 25 }, // Product Name
        { wch: 15 }, // Category
        { wch: 15 }, // Design
        { wch: 12 }, // Purity
        { wch: 12 }, // Gross Wt
        { wch: 12 }, // Stone Wt
        { wch: 12 }, // Diamond Wt
        { wch: 12 }, // Net Wt
        { wch: 12 }, // Stone Amt
        { wch: 12 }, // Fixed Amt
        { wch: 15 }, // Vendor
        { wch: 15 }, // Branch
        { wch: 15 }, // Created Date
        { wch: 15 }, // Packing Weight
        { wch: 15 }, // Total Weight
        { wch: 12 }  // Status
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Label Stock");

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      const formData = new FormData();
      formData.append('email', emailAddress);
      formData.append('clientCode', userInfo.ClientCode);
      formData.append('subject', 'RFID Label Stock Report');

      const date = new Date().toISOString().split('T')[0];
      const filename = `label_stock_${date}.xlsx`;
      const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      formData.append('file', excelBlob, filename);

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/Export/SendLabelStockEmail',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data && response.data.success) {
        // Show success notification before closing modal
        showSuccessNotification(
          'Email Sent Successfully',
          `Report has been sent to ${emailAddress}`
        );

        // Add a small delay before closing the modal
        setTimeout(() => {
          setShowExportModal(false);
          setEmailAddress('');
          setExportLoading(false);
        }, 500);
      } else {
        throw new Error(response.data?.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Email export error:', error);
      setExportErrors({
        ...exportErrors,
        email: error.response?.data?.message || 'Failed to send email. Please try again.'
      });
      setExportLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return {
          backgroundColor: '#e6f4ea',
          color: '#1e7e34',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500'
        };
      case 'apiactive':
        return {
          backgroundColor: '#e8f0fe',
          color: '#1a73e8',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500'
        };
      default:
        return {
          backgroundColor: '#f8f9fa',
          color: '#6c757d',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500'
        };
    }
  };

  const handleFilterChange = (field, value) => {
    console.log(`Filter changed - ${field}:`, value);
    if (field === 'counterName') {
      console.log('Counter name selected:', value);
      console.log('Available counters:', apiFilterData.counters);
    }
    setFilterValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to get the actual ID value for API payload
  const getFilterValueForAPI = (field, value) => {
    if (value === 'All' || value === 0 || !value) return 0;

    switch (field) {
      case 'categoryId':
        const category = apiFilterData.categories?.find(cat =>
          cat.CategoryName === value ||
          cat.Name === value ||
          cat.categoryName === value ||
          (cat.CategoryName && cat.CategoryName.toLowerCase() === value.toLowerCase()) ||
          (cat.Name && cat.Name.toLowerCase() === value.toLowerCase())
        );
        const categoryId = category ? (category.Id || category.id || 0) : 0;
        if (!category && value !== 'All') {
          console.warn('Category not found in API data:', value, 'Available categories:', apiFilterData.categories);
        }
        return categoryId;
      case 'productId':
        const product = apiFilterData.products?.find(prod =>
          prod.ProductName === value ||
          prod.Name === value ||
          prod.productName === value ||
          (prod.ProductName && prod.ProductName.toLowerCase() === value.toLowerCase()) ||
          (prod.Name && prod.Name.toLowerCase() === value.toLowerCase())
        );
        const productId = product ? (product.Id || product.id || 0) : 0;
        if (!product && value !== 'All') {
          console.warn('Product not found in API data:', value, 'Available products:', apiFilterData.products);
        }
        return productId;
      case 'designId':
        const design = apiFilterData.designs?.find(des =>
          des.DesignName === value ||
          des.Name === value ||
          des.designName === value ||
          (des.DesignName && des.DesignName.toLowerCase() === value.toLowerCase()) ||
          (des.Name && des.Name.toLowerCase() === value.toLowerCase())
        );
        const designId = design ? (design.Id || design.id || 0) : 0;
        if (!design && value !== 'All') {
          console.warn('Design not found in API data:', value, 'Available designs:', apiFilterData.designs);
        }
        return designId;
      case 'purityId':
        const purity = apiFilterData.purities?.find(p =>
          (p.PurityName && p.PurityName === value) ||
          (p.Name && p.Name === value) ||
          (p.Purity && p.Purity === value) ||
          (p.purityName && p.purityName === value) ||
          (p.PurityName && p.PurityName.toLowerCase() === String(value).toLowerCase()) ||
          (p.Name && p.Name.toLowerCase() === String(value).toLowerCase()) ||
          (p.Purity && p.Purity.toLowerCase() === String(value).toLowerCase())
        );
        const purityId = purity ? (purity.Id || purity.id || 0) : 0;
        if (!purity && value !== 'All') {
          console.warn('Purity not found in API data:', value, 'Available purities:', apiFilterData.purities);
        }
        return purityId;
      default:
        return value;
    }
  };

  // Handle date filter changes


  // Handle search with debouncing
  const handleSearchChange = (value) => {
    setSearchQuery(value);
  };

  // Debounced search effect - similar to reference code
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Show loader immediately when search executes
      setLoading(true);
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchLabeledStock(1, itemsPerPage, searchQuery, filterValues);
      }
    }, 2000); // 2 second debounce like reference

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Effect for toggle change - refetch data when showActiveOnly changes
  useEffect(() => {
    if (userInfo?.ClientCode) {
      setLoading(true);
      setCurrentPage(1);
      fetchLabeledStock(1, itemsPerPage, searchQuery, filterValues);
    }
  }, [showActiveOnly]);

  // Effect for filter changes - similar to reference code
  useEffect(() => {
    // Skip if this is the initial mount (userInfo not loaded yet)
    // The initial fetch is handled in the userInfo effect
    if (!userInfo?.ClientCode) {
      return;
    }

    console.log('Filter values changed:', filterValues);
    console.log('API Filter Data state:', {
      products: apiFilterData.products?.length || 0,
      designs: apiFilterData.designs?.length || 0,
      categories: apiFilterData.categories?.length || 0,
      counters: apiFilterData.counters?.length || 0,
      branches: apiFilterData.branches?.length || 0
    });

    // Always reset to page 1 when filters change
    if (currentPage !== 1) {
      setCurrentPage(1);
    }

    // Only fetch if we have filter data loaded, or if filters are set to 'All'
    const needsFilterData = (filterValues.categoryId !== 'All' && filterValues.categoryId) ||
      (filterValues.productId !== 'All' && filterValues.productId) ||
      (filterValues.designId !== 'All' && filterValues.designId) ||
      (filterValues.counterName !== 'All' && filterValues.counterName) ||
      (filterValues.branch !== 'All' && filterValues.branch);

    const hasFilterData = apiFilterData.products?.length > 0 ||
      apiFilterData.designs?.length > 0 ||
      apiFilterData.categories?.length > 0 ||
      apiFilterData.counters?.length > 0 ||
      apiFilterData.branches?.length > 0;

    if (needsFilterData && !hasFilterData) {
      console.warn('Filter data not loaded, fetching filter data first...');
      fetchFilterData().then(() => {
        // Wait for state update then fetch
        setTimeout(() => {
          // Show loader immediately
          setLoading(true);
          fetchLabeledStock(1, itemsPerPage, searchQuery, filterValues).catch(err => {
            console.error('Error fetching filtered stock:', err);
            // If filter fails, try fetching without filters
            const defaultFilters = {
              counterName: 'All',
              productId: 'All',
              categoryId: 'All',
              designId: 'All',
              boxName: 'All',
              vendor: 'All',
              branch: 'All',
              status: 'All'
            };
            setFilterValues(defaultFilters);
            fetchLabeledStock(1, itemsPerPage, searchQuery, defaultFilters);
          });
          if (showAllData) {
            fetchAllFilteredData();
          }
        }, 500);
      }).catch(err => {
        console.error('Error fetching filter data:', err);
        // If filter data fetch fails, still try to fetch stock with current filters
        setLoading(true);
        fetchLabeledStock(1, itemsPerPage, searchQuery, filterValues);
      });
    } else {
      // Always fetch data when filters change
      // Show loader immediately when filters change
      setLoading(true);
      fetchLabeledStock(1, itemsPerPage, searchQuery, filterValues).catch(err => {
        console.error('Error fetching filtered stock:', err);
        // If filter fails, reset to default and fetch all data
        const defaultFilters = {
          counterName: 'All',
          productId: 'All',
          categoryId: 'All',
          designId: 'All',
          boxName: 'All',
          vendor: 'All',
          branch: 'All',
          status: 'All'
        };
        setFilterValues(defaultFilters);
        fetchLabeledStock(1, itemsPerPage, searchQuery, defaultFilters);
      });

      // If user is viewing all data, also refresh the all data
      if (showAllData) {
        fetchAllFilteredData();
      }
    }
  }, [filterValues.categoryId, filterValues.productId, filterValues.designId, filterValues.purityId,
  filterValues.branch, filterValues.counterName, filterValues.boxName, filterValues.vendor, filterValues.status]);

  const handleResetFilters = () => {
    const resetFilters = {
      counterName: 'All',
      productId: 'All',
      categoryId: 'All',
      designId: 'All',
      purityId: 'All',
      boxName: 'All',
      vendor: 'All',
      branch: 'All',
      status: 'All',
      dateFrom: '',
      dateTo: ''
    };
    setFilterValues(resetFilters);
    closeAllDropdowns();
    // Reset to first page when resetting filters
    setCurrentPage(1);
    // Show loader immediately
    setLoading(true);
    // Fetch data with reset filters
    fetchLabeledStock(1, itemsPerPage, searchQuery, resetFilters);
  };

  const handleApplyFilters = () => {
    console.log('Applying filters:', filterValues);
    console.log('API Filter Data available:', {
      products: apiFilterData.products?.length || 0,
      designs: apiFilterData.designs?.length || 0,
      categories: apiFilterData.categories?.length || 0,
      counters: apiFilterData.counters?.length || 0,
      branches: apiFilterData.branches?.length || 0
    });
    console.log('Counter name filter:', filterValues.counterName);

    // Check if filter data is loaded, if not, fetch it first
    const hasFilterData = apiFilterData.products?.length > 0 ||
      apiFilterData.designs?.length > 0 ||
      apiFilterData.categories?.length > 0 ||
      apiFilterData.counters?.length > 0 ||
      apiFilterData.branches?.length > 0;

    if (!hasFilterData) {
      console.warn('Filter data not loaded yet, fetching filter data first...');
      fetchFilterData().then(() => {
        // Wait a bit for state to update, then apply filters
        setTimeout(() => {
          setShowFilterPanel(false);
          setCurrentPage(1);
          // Show loader immediately
          setLoading(true);
          fetchLabeledStock(1, itemsPerPage, searchQuery, filterValues);
          if (showAllData) {
            fetchAllFilteredData();
          }
        }, 500);
      }).catch(err => {
        console.error('Error fetching filter data before applying filters:', err);
        // Still try to apply filters even if filter data fetch fails
        setShowFilterPanel(false);
        setCurrentPage(1);
        // Show loader immediately
        setLoading(true);
        fetchLabeledStock(1, itemsPerPage, searchQuery, filterValues);
        if (showAllData) {
          fetchAllFilteredData();
        }
      });
    } else {
      setShowFilterPanel(false);
      // Reset to first page when applying filters
      setCurrentPage(1);
      // Show loader immediately
      setLoading(true);
      // Explicitly fetch data with current filter values
      fetchLabeledStock(1, itemsPerPage, searchQuery, filterValues);

      // If user is viewing all data, also refresh the all data
      if (showAllData) {
        fetchAllFilteredData();
      }
    }
  };

  const toggleDataView = async () => {
    if (showAllData) {
      // Switch back to paginated view
      setShowAllData(false);
      setAllFilteredData([]);
    } else {
      // Switch to all data view
      setShowAllData(true);
      await fetchAllFilteredData();
    }
  };

  const getActiveFilterCount = () => {
    return Object.entries(filterValues).reduce((count, [key, value]) => {
      return value !== 'All' ? count + 1 : count;
    }, 0);
  };

  const getUniqueValues = (field) => {
    const values = ['All', ...new Set(labeledStock.map(item => item[field]).filter(Boolean))];
    return values;
  };

  // Smart Pagination Logic - similar to reference code
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

  const handleRefresh = async () => {
    // Show loader immediately when refresh is clicked
    setLoading(true);
    await fetchLabeledStock(currentPage, itemsPerPage, searchQuery, filterValues);
  };

  // Function to generate PDF for multiple labels
  const generateMultipleLabelsPDF = async (labels, selectedItems) => {
    try {
      // Import required libraries
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      const QRCode = (await import('qrcode')).default;

      let doc = null;
      let firstLabelDimensions = null;

      // Process each label
      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const generatedLayout = label.generatedLayout || label.GeneratedLayout;

        if (!generatedLayout) {
          console.warn(`Skipping label ${i + 1}: Invalid layout`);
          continue;
        }

        // Find corresponding item from selectedItems
        const itemCode = label.itemCode || label.ItemCode || '';
        const rfidCode = label.rfidCode || label.RFIDCode || '';
        const item = selectedItems.find(it =>
          (it.ItemCode && it.ItemCode === itemCode) ||
          (it.RFIDCode && it.RFIDCode === rfidCode)
        ) || selectedItems[i] || {};

        // Extract label data from elements
        const labelData = {};
        if (generatedLayout.elements) {
          generatedLayout.elements.forEach(element => {
            if (element.binding && element.value !== undefined) {
              labelData[element.binding] = element.value;
            }
          });
        }

        // Add item code and RFID code
        labelData.ItemCode = itemCode || item.ItemCode || '';
        labelData.RFIDCode = rfidCode || item.RFIDCode || '';

        // Ensure all important fields are always mapped from item data (same as single label)
        // This ensures they're available even if API doesn't return them in the layout
        if (!labelData.StoneAmount || labelData.StoneAmount === '' || labelData.StoneAmount === null) {
          labelData.StoneAmount = item.TotalStoneAmount || item.StoneAmt || item.StoneAmount || '';
        }
        if (!labelData.TotalStoneWeight || labelData.TotalStoneWeight === '' || labelData.TotalStoneWeight === null) {
          labelData.TotalStoneWeight = item.TotalStoneWeight || item.StoneWt || item.StoneWeight || '';
        }
        if (!labelData.StoneWeight || labelData.StoneWeight === '' || labelData.StoneWeight === null) {
          labelData.StoneWeight = item.TotalStoneWeight || item.StoneWt || item.StoneWeight || '';
        }
        if (!labelData.DiamondAmount || labelData.DiamondAmount === '' || labelData.DiamondAmount === null) {
          labelData.DiamondAmount = item.TotalDiamondAmount || item.DiamondAmount || '';
        }
        if (!labelData.DiamondWeight || labelData.DiamondWeight === '' || labelData.DiamondWeight === null) {
          labelData.DiamondWeight = item.TotalDiamondWeight || item.DiamondWt || item.DiamondWeight || '';
        }
        if (!labelData.GrossWt || labelData.GrossWt === '' || labelData.GrossWt === null) {
          labelData.GrossWt = item.GrossWt || item.GrossWeight || '';
        }
        if (!labelData.NetWt || labelData.NetWt === '' || labelData.NetWt === null) {
          labelData.NetWt = item.NetWt || item.NetWeight || '';
        }
        if (!labelData.ProductName || labelData.ProductName === '' || labelData.ProductName === null) {
          labelData.ProductName = item.ProductName || '';
        }
        if (!labelData.CategoryName || labelData.CategoryName === '' || labelData.CategoryName === null) {
          labelData.CategoryName = item.CategoryName || item.Category || '';
        }
        if (!labelData.DesignName || labelData.DesignName === '' || labelData.DesignName === null) {
          labelData.DesignName = item.DesignName || item.Design || '';
        }
        if (!labelData.PurityName || labelData.PurityName === '' || labelData.PurityName === null) {
          labelData.PurityName = item.PurityName || item.Purity || '';
        }
        if (!labelData.BranchName || labelData.BranchName === '' || labelData.BranchName === null) {
          labelData.BranchName = item.BranchName || item.Branch || '';
        }
        if (!labelData.CounterName || labelData.CounterName === '' || labelData.CounterName === null) {
          labelData.CounterName = item.CounterName || item.Counter || '';
        }
        if (!labelData.MRP || labelData.MRP === '' || labelData.MRP === null) {
          labelData.MRP = item.MRP || '';
        }
        if (!labelData.Size || labelData.Size === '' || labelData.Size === null) {
          labelData.Size = item.Size || '';
        }
        if (!labelData.MakingFixedAmt || labelData.MakingFixedAmt === '' || labelData.MakingFixedAmt === null) {
          labelData.MakingFixedAmt = item.MakingFixedAmt || item.FixedAmt || '';
        }
        if (!labelData.HallmarkAmount || labelData.HallmarkAmount === '' || labelData.HallmarkAmount === null) {
          labelData.HallmarkAmount = item.HallmarkAmount || '';
        }
        if (!labelData.MakingPerGram || labelData.MakingPerGram === '' || labelData.MakingPerGram === null) {
          labelData.MakingPerGram = item.MakingPerGram || '';
        }
        if (!labelData.MakingPercentage || labelData.MakingPercentage === '' || labelData.MakingPercentage === null) {
          labelData.MakingPercentage = item.MakingPercentage || '';
        }
        if (!labelData.BoxDetails || labelData.BoxDetails === '' || labelData.BoxDetails === null) {
          labelData.BoxDetails = item.BoxDetails || item.box_details || '';
        }
        if (!labelData.RFIDNumber || labelData.RFIDNumber === '' || labelData.RFIDNumber === null) {
          labelData.RFIDNumber = item.RFIDNumber || item.RFIDCode || '';
        }

        // Get dimensions in mm
        const pxToMm = 0.264583; // 96 DPI
        let labelWidthMm = generatedLayout.page.width * pxToMm;
        let labelHeightMm = generatedLayout.page.height * pxToMm;

        // Ensure minimum dimensions (at least 10mm)
        if (labelWidthMm < 10) labelWidthMm = 100;
        if (labelHeightMm < 10) labelHeightMm = 50;

        // Initialize PDF with first label dimensions
        if (!doc) {
          firstLabelDimensions = { width: labelWidthMm, height: labelHeightMm };
          doc = new jsPDF({
            orientation: labelWidthMm > labelHeightMm ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [Math.max(labelHeightMm, 10), Math.max(labelWidthMm, 10)]
          });
        } else {
          // Add new page for each additional label
          doc.addPage([Math.max(labelHeightMm, 10), Math.max(labelWidthMm, 10)],
            labelWidthMm > labelHeightMm ? 'landscape' : 'portrait');
        }

        // Create temporary container for rendering
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0px';
        tempContainer.style.width = `${generatedLayout.page.width}px`;
        tempContainer.style.height = `${generatedLayout.page.height}px`;
        tempContainer.style.background = '#ffffff';
        // Allow overflow during rendering so html2canvas can capture full text
        // The PDF dimensions will naturally crop to the label size
        tempContainer.style.overflow = 'visible';
        tempContainer.className = 'label-canvas-print-target';
        document.body.appendChild(tempContainer);

        // Render elements directly to DOM
        generatedLayout.elements.forEach(element => {
          const elementDiv = document.createElement('div');
          elementDiv.style.position = 'absolute';
          elementDiv.style.left = `${element.x}px`;
          elementDiv.style.top = `${element.y}px`;
          elementDiv.style.width = `${element.width}px`;
          elementDiv.style.height = `${element.height}px`;
          elementDiv.style.zIndex = element.zIndex || 10;

          if (element.type === 'text') {
            const labelText = element.label || '';
            // Get binding value - ALWAYS use labelData if binding exists (it has fallback from item data)
            let bindingValue = '';
            if (element.binding) {
              // If element has a binding, ALWAYS use labelData first (which has fallback from item data)
              // This ensures all fields always show even if API returns empty
              const labelDataValue = labelData[element.binding];
              if (labelDataValue !== undefined && labelDataValue !== null && String(labelDataValue).trim() !== '') {
                bindingValue = String(labelDataValue);
              } else if (element.value !== undefined && element.value !== null && String(element.value).trim() !== '') {
                // Fallback to element.value only if labelData is empty
                bindingValue = String(element.value);
              }
            } else if (element.value !== undefined && element.value !== null && String(element.value).trim() !== '') {
              // No binding, just use element.value
              bindingValue = String(element.value);
            }

            let displayText = '';
            if (labelText && bindingValue) {
              displayText = `${labelText}: ${bindingValue}`;
            } else if (labelText) {
              displayText = labelText;
            } else if (bindingValue) {
              displayText = bindingValue;
            }

            // Calculate appropriate font size based on text length and container width
            let fontSize = element.fontSize || 12;
            if (element.width && displayText.length > 0) {
              // More accurate estimation: numbers are narrower, letters vary
              // For numbers: ~0.55 * font size, for mixed: ~0.65 * font size
              const isNumeric = /^\d+$/.test(displayText.replace(/[:\s]/g, ''));
              const charWidthMultiplier = isNumeric ? 0.55 : 0.65;
              const avgCharWidth = fontSize * charWidthMultiplier;
              const estimatedTextWidth = displayText.length * avgCharWidth;
              const availableWidth = element.width - 4; // Account for padding

              // If text is too wide, scale down font size to fit
              if (estimatedTextWidth > availableWidth) {
                fontSize = Math.max((availableWidth / displayText.length) / charWidthMultiplier, 7);
              }
            }

            elementDiv.style.fontSize = `${fontSize}px`;
            elementDiv.style.fontWeight = element.fontWeight || 'normal';
            elementDiv.style.color = element.color || '#000000';
            elementDiv.style.display = 'flex';
            elementDiv.style.alignItems = 'center';
            elementDiv.style.justifyContent = 'flex-start';
            elementDiv.style.padding = '1px 2px';
            // Use nowrap to keep text on one line, but allow it to be fully visible
            elementDiv.style.whiteSpace = 'nowrap';
            elementDiv.style.overflow = 'visible';
            elementDiv.style.textOverflow = 'clip';
            // Ensure minimum width to show full text
            elementDiv.style.minWidth = '0';
            elementDiv.style.maxWidth = `${element.width}px`;
            // Use textContent to ensure full text is rendered
            elementDiv.textContent = displayText;
          } else if (element.type === 'qrcode') {
            // QR code will be added directly to PDF, just mark the position
            elementDiv.style.border = '1px dashed transparent';
            elementDiv.setAttribute('data-qr-value', element.value || labelData.ItemCode || '');
            elementDiv.setAttribute('data-qr-size', element.width || 60);
          }

          tempContainer.appendChild(elementDiv);
        });

        // Wait a bit for rendering
        await new Promise(resolve => setTimeout(resolve, 200));

        // Ensure container is visible for html2canvas
        tempContainer.style.left = '0px';
        tempContainer.style.top = '0px';
        tempContainer.style.zIndex = '9999';

        // Capture canvas (without QR codes, we'll add them to PDF)
        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          width: generatedLayout.page.width,
          height: generatedLayout.page.height,
          windowWidth: generatedLayout.page.width,
          windowHeight: generatedLayout.page.height,
          ignoreElements: (element) => {
            return element.hasAttribute('data-qr-value');
          }
        });

        // Cleanup
        document.body.removeChild(tempContainer);

        // Convert to image
        const imgData = canvas.toDataURL('image/png', 1.0);

        // Add background image to PDF
        doc.addImage(imgData, 'PNG', 0, 0, labelWidthMm, labelHeightMm);

        // Add QR codes directly to PDF for better quality
        const qrElementsArray = generatedLayout.elements.filter(el => el.type === 'qrcode');
        for (const qrElement of qrElementsArray) {
          const qrValue = qrElement.value || labelData.ItemCode || '';
          if (qrValue) {
            const qrDataUrl = await QRCode.toDataURL(String(qrValue), {
              errorCorrectionLevel: 'M',
              type: 'image/png',
              quality: 1.0,
              margin: 1,
              width: (qrElement.width || 60) * 3
            });
            const qrX = qrElement.x * pxToMm;
            const qrY = qrElement.y * pxToMm;
            const qrWidth = (qrElement.width || 60) * pxToMm;
            const qrHeight = (qrElement.height || qrElement.width || 60) * pxToMm;
            doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrWidth, qrHeight);
          }
        }
      }

      // Open PDF in new tab
      if (doc) {
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const newTab = window.open(pdfUrl, '_blank');

        if (!newTab) {
          // Fallback: download the PDF
          doc.save(`Labels-${labels.length}-items.pdf`);
          showSuccessNotification('Info', 'PDF downloaded. Please check your downloads folder.');
        } else {
          // Clean up the blob URL after a delay
          setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
          }, 1000);
        }
      }

    } catch (error) {
      console.error('Error generating multiple labels PDF:', error);
      showSuccessNotification('Error', 'Failed to generate PDF. Please try again.');
      throw error;
    }
  };

  const handlePrintLabel = async () => {
    try {
      if (!selectedTemplate) {
        showSuccessNotification('No Template Selected', 'Please select a template from the dropdown to print labels.');
        return;
      }

      const selectedItems = showAllData && allFilteredData.length > 0
        ? allFilteredData.filter(item => selectedRows.includes(item.Id))
        : currentItems.filter(item => selectedRows.includes(item.Id));

      if (selectedItems.length === 0) {
        showSuccessNotification('No Selection', 'Please select at least one item to print labels.');
        return;
      }

      setPreviewLoading(true);

      // Prepare API payload for multiple products
      const clientCode = userInfo?.ClientCode || '';
      const templateId = selectedTemplate.value;

      // Collect item codes and RFID codes
      const itemCodes = selectedItems
        .map(item => item.ItemCode)
        .filter(code => code && code.trim() !== '');

      const rfidCodes = selectedItems
        .map(item => item.RFIDCode)
        .filter(code => code && code.trim() !== '');

      // Build payload for multiple products
      const payload = {
        clientCode: clientCode,
        templateId: templateId,
        itemCode: null,
        rfidCode: null,
        itemCodes: itemCodes.length > 0 ? itemCodes : null,
        rfidCodes: rfidCodes.length > 0 ? rfidCodes : null
      };

      // Call GenerateLabel API
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/LabelTemplates/GenerateLabel',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Process response
      const labels = response.data.labels || response.data.Labels || [];

      if (!labels || labels.length === 0) {
        showSuccessNotification('Error', 'No labels were generated. Please check your selection.');
        setPreviewLoading(false);
        return;
      }

      // Filter successful labels
      const successfulLabels = labels.filter(label => label.isSuccess || label.IsSuccess);
      const failedLabels = labels.filter(label => !(label.isSuccess || label.IsSuccess));

      if (successfulLabels.length === 0) {
        const errorMsg = failedLabels.length > 0
          ? failedLabels.map(l => l.errorMessage || l.ErrorMessage).join('; ')
          : 'All label generation requests failed.';
        showSuccessNotification('Error', errorMsg);
        setPreviewLoading(false);
        return;
      }

      // Generate PDF for all successful labels
      await generateMultipleLabelsPDF(successfulLabels, selectedItems);

      // Show success notification
      let message = `Successfully generated ${successfulLabels.length} label(s)`;
      if (failedLabels.length > 0) {
        message += ` (${failedLabels.length} failed)`;
      }
      message += '. PDF opened in new tab for printing.';
      showSuccessNotification('Labels Generated', message);
      setPreviewLoading(false);

    } catch (error) {
      console.error('Error generating labels:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to generate labels. Please try again.';
      showSuccessNotification('Error', errorMessage);
      setPreviewLoading(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteAllStockConfirm, setShowDeleteAllStockConfirm] = useState(false);
  const [deleteAllStockLoading, setDeleteAllStockLoading] = useState(false);
  const [showReportView, setShowReportView] = useState(false);
  const [reportData, setReportData] = useState([]);

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const deletedItems = labeledStock.filter(item => selectedRows.includes(item.Id));
      const itemCodes = deletedItems.map(item => item.ItemCode); // keep as array
      const clientCode = userInfo?.ClientCode || '';
      const response = await axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/DeleteLabelledStockItems', {
        ClientCode: clientCode,
        ItemCodes: itemCodes // send as array
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.data && response.data.success !== false) {
        setShowDeleteConfirm(false);
        setSelectedRows([]);
        showSuccessNotification('Delete Successful', `Selected items have been deleted successfully. ${deletedItems.length} item(s) deleted: ${itemCodes.join(', ')}`);
        await fetchLabeledStock();

        // After successful delete:
        addNotification({
          title: 'Stock deleted',
          description: `${deletedItems.length} item(s) deleted: ${itemCodes.join(', ')}`,
          type: 'success'
        });
      } else {
        throw new Error(response.data?.message || 'Failed to delete items');
      }
    } catch (err) {
      setShowDeleteConfirm(false);
      showSuccessNotification('Delete Failed', err.message || 'Failed to delete items.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle delete all stock
  const handleDeleteAllStock = () => {
    setShowDeleteAllStockConfirm(true);
  };

  const confirmDeleteAllStock = async () => {
    setDeleteAllStockLoading(true);
    try {
      const clientCode = userInfo?.ClientCode || '';

      const response = await axios.delete(`https://soni.loyalstring.co.in/api/ProductMaster/DeleteAllStockForClient`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        data: {
          ClientCode: clientCode
        }
      });

      if (response.data && response.data.success !== false) {
        setShowDeleteAllStockConfirm(false);
        setSelectedRows([]);
        showSuccessNotification(
          'Delete All Successful',
          `All stock items for client ${clientCode} have been deleted successfully.`
        );

        await fetchLabeledStock();
        if (showAllData) {
          setShowAllData(false);
          setAllFilteredData([]);
        }

        addNotification({
          title: 'All stock deleted',
          description: `All stock items deleted for client ${clientCode}`,
          type: 'success'
        });
      } else {
        throw new Error(response.data?.message || 'Failed to delete all stock for client');
      }
    } catch (err) {
      setShowDeleteAllStockConfirm(false);
      showSuccessNotification('Delete All Failed', err.message || 'Failed to delete all stock for client.');
    } finally {
      setDeleteAllStockLoading(false);
    }
  };


  // Handle RFID transaction update
  const handleRFIDTransactionUpdate = async (newStatus) => {
    if (!selectedItemForStatus) return;

    setStatusChangeLoading(true);
    try {
      const response = await axios.post(
        'https://soni.loyalstring.co.in/api/ProductMaster/UpdateRFIDTransactionDetails',
        {
          itemcode: selectedItemForStatus.ItemCode,
          rfidcode: selectedItemForStatus.RFIDCode
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success !== false) {
        // Update the local state
        setLabeledStock(prev => prev.map(item =>
          item.Id === selectedItemForStatus.Id
            ? { ...item, Status: newStatus }
            : item
        ));

        setShowStatusPopup(false);
        setSelectedItemForStatus(null);

        showSuccessNotification(
          'RFID Transaction Updated',
          `RFID transaction details updated for item ${selectedItemForStatus.ItemCode}`
        );

        addNotification({
          title: 'RFID transaction updated',
          description: `RFID transaction details updated for item ${selectedItemForStatus.ItemCode}`,
          type: 'success'
        });
      } else {
        throw new Error(response.data?.message || 'Failed to update RFID transaction');
      }
    } catch (err) {
      console.error('Error updating RFID transaction:', err);
      showSuccessNotification('RFID Update Failed', err.message || 'Failed to update RFID transaction.');
    } finally {
      setStatusChangeLoading(false);
    }
  };

  // Open RFID transaction update popup
  const openRFIDTransactionPopup = (item, event) => {
    event.stopPropagation();
    setSelectedItemForStatus(item);
    setShowStatusPopup(true);
  };

  useEffect(() => {
    setOriginalStock(labeledStock);
  }, [labeledStock]);

  // Add this useEffect to populate filter options when data changes
  useEffect(() => {
    if (labeledStock && labeledStock.length > 0) {
      setFilterOptions(prev => ({
        ...prev,
        // Use API data for counters, categories, products, designs, branches
        // Fall back to stock data for boxNames, vendors, purities, statuses
        counterNames: ['All', ...(apiFilterData.counters?.map(counter => counter.CounterName || counter.Name || counter.counterName) || [])],
        productNames: apiFilterData.products?.length > 0
          ? ['All', ...apiFilterData.products.map(p => p.ProductName || p.Name || p.productName)]
          : getUniqueOptions(labeledStock, 'ProductName'),
        categories: apiFilterData.categories?.length > 0
          ? ['All', ...apiFilterData.categories.map(c => c.CategoryName || c.Name || c.categoryName)]
          : getUniqueOptions(labeledStock, 'CategoryName'),
        designs: apiFilterData.designs?.length > 0
          ? ['All', ...apiFilterData.designs.map(d => d.DesignName || d.Name || d.designName)]
          : getUniqueOptions(labeledStock, 'DesignName'),
        branches: apiFilterData.branches?.length > 0
          ? ['All', ...apiFilterData.branches.map(b => b.BranchName || b.Name || b.branchName || b.name)]
          : getUniqueOptions(labeledStock, 'Branch'),
        purities: getUniqueOptions(labeledStock, 'PurityName'),
        boxNames: getUniqueOptions(labeledStock, 'BoxName'),
        vendors: getUniqueOptions(labeledStock, 'Vendor'),
        statuses: (() => {
          const defaultStatuses = ['All', 'ApiActive', 'Sold'];
          const stockStatuses = getUniqueOptions(labeledStock, 'Status').filter(s => s && s !== 'All');
          // Combine and remove duplicates
          const allStatuses = [...new Set([...defaultStatuses, ...stockStatuses])];
          return allStatuses;
        })()
      }));
    }
  }, [labeledStock, apiFilterData.counters, apiFilterData.products, apiFilterData.categories, apiFilterData.designs, apiFilterData.purities, apiFilterData.branches]);

  // Add useEffect to populate filter options when API data is loaded (even if stock data is empty)
  useEffect(() => {
    if (apiFilterData.counters && apiFilterData.counters.length > 0) {
      console.log('Counters data loaded:', apiFilterData.counters);
      setFilterOptions(prev => ({
        ...prev,
        counterNames: ['All', ...apiFilterData.counters.map(counter => counter.CounterName || counter.Name || counter.counterName)]
      }));
    }
    if (apiFilterData.branches && apiFilterData.branches.length > 0) {
      console.log('Branches data loaded:', apiFilterData.branches);
      setFilterOptions(prev => ({
        ...prev,
        branches: ['All', ...apiFilterData.branches.map(branch => branch.BranchName || branch.Name || branch.branchName || branch.name)]
      }));
    }
    if (apiFilterData.products && apiFilterData.products.length > 0) {
      console.log('Products data loaded:', apiFilterData.products);
      setFilterOptions(prev => ({
        ...prev,
        productNames: ['All', ...apiFilterData.products.map(product => product.ProductName || product.Name || product.productName)]
      }));
    }
    if (apiFilterData.categories && apiFilterData.categories.length > 0) {
      console.log('Categories data loaded:', apiFilterData.categories);
      setFilterOptions(prev => ({
        ...prev,
        categories: ['All', ...apiFilterData.categories.map(category => category.CategoryName || category.Name || category.categoryName)]
      }));
    }
    if (apiFilterData.designs && apiFilterData.designs.length > 0) {
      console.log('Designs data loaded:', apiFilterData.designs);
      setFilterOptions(prev => ({
        ...prev,
        designs: ['All', ...apiFilterData.designs.map(design => design.DesignName || design.Name || design.designName)]
      }));
    }
  }, [apiFilterData.counters, apiFilterData.branches, apiFilterData.products, apiFilterData.categories, apiFilterData.designs]);

  // Restrict columns to only the specified fields, in this order
  const columns = [
    { key: 'srNo', label: 'Sr No', width: '50px' },
    { key: 'CounterName', label: 'Counter', width: '100px' },
    { key: 'ItemCode', label: 'Item Code', width: '100px' },
    { key: 'RFIDCode', label: 'RFID Code', width: '100px' },
    { key: 'ProductName', label: 'Product', width: '120px' },
    { key: 'CategoryName', label: 'Category', width: '100px' },
    { key: 'DesignName', label: 'Design', width: '100px' },
    { key: 'PurityName', label: 'Purity', width: '80px' },
    { key: 'GrossWt', label: 'Gross Wt', width: '85px' },
    { key: 'StoneWt', label: 'Stone Wt', width: '85px' },
    { key: 'DiamondWt', label: 'Diamond Wt', width: '90px' },
    { key: 'NetWt', label: 'Net Wt', width: '85px' },
    { key: 'Vendor', label: 'Vendor', width: '100px' },
    { key: 'Branch', label: 'Branch', width: '100px' }
  ];

  const generateAndShowReport = () => {
    // Group data by Counter Name, Category and Product Name, and sum weights
    const grouped = {};

    // Use all filtered data if available, otherwise use current page data
    const dataToReport = showAllData && allFilteredData.length > 0 ? allFilteredData : filteredStock;

    dataToReport.forEach(item => {
      const counter = item.CounterName || '-';
      const cat = item.CategoryName || '-';
      const prod = item.ProductName || '-';
      const key = `${counter}||${cat}||${prod}`;
      if (!grouped[key]) {
        grouped[key] = {
          counter: counter,
          category: cat,
          product: prod,
          qty: 0,
          grossWt: 0,
          netWt: 0,
        };
      }
      // Handle quantity calculation properly
      const pieces = item.Pieces ? Number(item.Pieces) : 0;
      const quantity = item.Quantity ? Number(item.Quantity) : 0;
      const itemQty = pieces > 0 ? pieces : (quantity > 0 ? quantity : 1);

      // Handle weight calculations with proper number conversion
      const grossWt = item.GrossWt ? Number(item.GrossWt) : 0;
      const netWt = item.NetWt ? Number(item.NetWt) : 0;

      grouped[key].qty += itemQty;
      grouped[key].grossWt += grossWt;
      grouped[key].netWt += netWt;
    });
    const rows = Object.values(grouped);

    setReportData(rows);
    setShowReportView(true);
  };

  const handleDownloadReportPDF = () => {
    if (reportData.length === 0) {
      console.error("No report data to download.");
      return;
    }
    // Generate PDF
    const doc = new jsPDF();
    const title = 'Label Stock Report';
    const dateStr = new Date().toLocaleString();
    const clientCode = userInfo?.ClientCode || '-';
    doc.setFontSize(16);
    doc.text(title, 14, 18);
    doc.setFontSize(11);
    doc.text(`Date: ${dateStr}`, 14, 26);
    doc.text(`Client Code: ${clientCode}`, 14, 32);
    doc.autoTable({
      head: [["Sr No", "Counter Name", "Category", "Product Name", "Qty", "Gross Wt", "Net Wt"]],
      body: reportData.map((row, idx) => [
        idx + 1,
        row.counter,
        row.category,
        row.product,
        row.qty,
        row.grossWt.toFixed(3),
        row.netWt.toFixed(3)
      ]),
      startY: 40,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 119, 212] },
      margin: { left: 8, right: 8 },
      tableWidth: 'auto',
    });
    const fileDate = new Date().toISOString().split('T')[0];
    doc.save(`label_stock_report_${fileDate}.pdf`);
  };

  const handleDownloadReport = () => {
    // Group data by Category and Product Name, count qty
    const grouped = {};
    filteredStock.forEach(item => {
      const cat = item.CategoryName || '-';
      const prod = item.ProductName || '-';
      const key = `${cat}||${prod}`;
      if (!grouped[key]) {
        grouped[key] = { category: cat, product: prod, qty: 0 };
      }
      // Handle quantity calculation properly
      const pieces = item.Pieces ? Number(item.Pieces) : 0;
      const quantity = item.Quantity ? Number(item.Quantity) : 0;
      const itemQty = pieces > 0 ? pieces : (quantity > 0 ? quantity : 1);
      grouped[key].qty += itemQty;
    });
    const rows = Object.values(grouped);

    // Generate PDF
    const doc = new jsPDF();
    const title = 'Label Stock Report';
    const dateStr = new Date().toLocaleString();
    const clientCode = userInfo?.ClientCode || '-';
    doc.setFontSize(16);
    doc.text(title, 14, 18);
    doc.setFontSize(11);
    doc.text(`Date: ${dateStr}`, 14, 26);
    doc.text(`Client Code: ${clientCode}`, 14, 32);
    doc.autoTable({
      head: [["Sr No", "Category", "Product Name", "Qty"]],
      body: rows.map((row, idx) => [idx + 1, row.category, row.product, row.qty]),
      startY: 40,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 119, 212] },
      margin: { left: 8, right: 8 },
      tableWidth: 'auto',
    });
    const fileDate = new Date().toISOString().split('T')[0];
    doc.save(`label_stock_report_${fileDate}.pdf`);
  };

  if (!userInfo) {
    return (
      <div className="error-container">
        <FaExclamationTriangle />
        <p>Please login to view labeled stock data</p>
      </div>
    );
  }


  if (error) {
    return (
      <div className="error-container">
        <FaExclamationTriangle />
        <p>Error: {error}</p>
      </div>
    );
  }

  const exportModal = showExportModal && (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Export Label Stock List</h2>
          <button className="close-button" onClick={() => setShowExportModal(false)}>
            <span>&times;</span>
          </button>
        </div>
        <p className="modal-subtitle">Choose your preferred export format</p>

        <div className="export-options">
          <button
            className="export-option"
            onClick={handleExportToExcel}
            disabled={exportLoading}
          >
            <div className="option-icon excel">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm14 0v14H7V5h10zm-7 2v2h4V7h-4zm0 4v2h4v-2h-4zm0 4v2h4v-2h-4z" />
              </svg>
            </div>
            <div className="option-content">
              <span className="option-title">Export as Excel</span>
              <span className="option-description">Download as .xlsx spreadsheet file</span>
            </div>
          </button>
          {exportErrors.excel && <div className="error-message">{exportErrors.excel}</div>}

          <button
            className="export-option"
            onClick={handleExportToPDF}
            disabled={exportLoading}
          >
            <div className="option-icon pdf">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm12 6V9c0-.55-.45-1-1-1h-2v5h2c.55 0 1-.45 1-1zm-2-3h1v3h-1V9z" />
              </svg>
            </div>
            <div className="option-content">
              <span className="option-title">Export as PDF</span>
              <span className="option-description">Download as formatted PDF document</span>
            </div>
          </button>
          {exportErrors.pdf && <div className="error-message">{exportErrors.pdf}</div>}

          {/* Catalog Export Option - Only if grid view or images relevant */}
          <button
            className="export-option"
            onClick={handleExportCatalog}
            disabled={exportLoading}
          >
            <div className="option-icon catalog">
              <FaThLarge size={24} />
            </div>
            <div className="option-content">
              <span className="option-title">Export as Catalog</span>
              <span className="option-description">Download PDF with product images</span>
            </div>
          </button>

          <button
            className="export-option"
            onClick={handleExportAllReport}
            disabled={exportLoading || loading}
          >
            <div className="option-icon excel">
              <FaFileExport size={24} />
            </div>
            <div className="option-content">
              <span className="option-title">Export All Report</span>
              <span className="option-description">Export full report via API (all records)</span>
            </div>
          </button>

          <div className="export-option email-section">
            <div className="option-header">
              <div className="option-icon email">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z" />
                </svg>
              </div>
              <div className="option-content">
                <span className="option-title">Send to Email</span>
                <span className="option-description">Send data to specified email address</span>
              </div>
            </div>

            <div className="email-form">
              <div className="input-wrapper">
                <input
                  type="email"
                  placeholder="Enter email address"
                  className="email-input"
                  value={emailAddress}
                  onChange={(e) => {
                    setEmailAddress(e.target.value);
                    setExportErrors({ ...exportErrors, email: '' });
                  }}
                  disabled={exportLoading}
                />
                {exportErrors.email && <div className="error-message">{exportErrors.email}</div>}
              </div>
              <button
                className={`send-button ${exportLoading ? 'loading' : ''}`}
                onClick={handleEmailExport}
                disabled={exportLoading || !emailAddress}
              >
                {exportLoading ? (
                  <>
                    <FaSpinner className="spinner" />
                    Sending...
                  </>
                ) : (
                  'Send Email'
                )}
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.4);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(2px);
          }

          .modal-content {
            background: white;
            border-radius: 8px;
            padding: 20px;
            width: 460px;
            max-width: 95vw;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            position: relative;
            animation: modalSlideIn 0.2s ease-out;
          }

          @keyframes modalSlideIn {
            from {
              transform: translateY(10px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .modal-title {
            font-size: 18px;
            font-weight: 600;
            color: #2D3E50;
            margin: 0;
            line-height: 1.2;
          }

          .close-button {
            background: none;
            border: none;
            color: #7F8B9A;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .close-button:hover {
            background: #F5F7FA;
            color: #2D3E50;
          }

          .modal-subtitle {
            color: #7F8B9A;
            font-size: 13px;
            margin: 0 0 16px 0;
          }

          .export-options {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .export-option {
            display: flex;
            align-items: center;
            padding: 12px;
            border: 1px solid #E5E9F2;
            border-radius: 6px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
            width: 100%;
            text-align: left;
            opacity: ${exportLoading ? '0.7' : '1'};
            cursor: ${exportLoading ? 'not-allowed' : 'pointer'};
          }

          .export-option:hover {
            border-color: #2D9CDB;
            background: #F8FAFC;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(45, 156, 219, 0.1);
          }

          .export-option:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .export-option:disabled:hover {
            transform: none;
            box-shadow: none;
            border-color: #E5E9F2;
          }

          .option-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 6px;
            margin-right: 12px;
            transition: all 0.2s;
          }

          .option-icon.excel {
            background: #E3FCF4;
            color: #0CAF60;
          }

          .option-icon.pdf {
            background: #FFE9E9;
            color: #FF4B4B;
          }

          .option-icon.catalog {
            background: #E0E7FF;
            color: #6366F1;
          }

          .option-icon.email {
            background: #EBF5FF;
            color: #2D9CDB;
          }

          .option-content {
            flex: 1;
          }

          .option-title {
            display: block;
            font-weight: 500;
            font-size: 14px;
            color: #2D3E50;
            margin-bottom: 2px;
          }

          .option-description {
            display: block;
            font-size: 12px;
            color: #7F8B9A;
          }

          .email-section {
            cursor: default;
          }

          .email-section:hover {
            transform: none;
          }

          .option-header {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
          }

          .email-form {
            margin-left: 48px;
          }

          .input-wrapper {
            position: relative;
            margin-bottom: 12px;
          }

          .email-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #E5E9F2;
            border-radius: 4px;
            font-size: 13px;
            transition: all 0.2s;
            color: #2D3E50;
          }

          .email-input:focus {
            outline: none;
            border-color: #2D9CDB;
            box-shadow: 0 0 0 2px rgba(45, 156, 219, 0.1);
          }

          .email-input::placeholder {
            color: #A0AEC0;
          }

          .error-message {
            color: #FF4B4B;
            font-size: 12px;
            margin: 4px 0 8px 48px;
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .send-button {
            background: #2D9CDB;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }

          .send-button:not(:disabled):hover {
            background: #2589BD;
            transform: translateY(-1px);
          }

          .send-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .spinner {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );

  /* product details moved to ProductDetailsPage - navigate to /product-details with state: { product, apiFilterData } */
  return (
    <div className="container-fluid p-3" style={{ position: 'relative' }}>
      <SuccessNotification
        title={successMessage.title}
        message={successMessage.message}
        isVisible={showSuccess}
        onClose={() => setShowSuccess(false)}
      />

      <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Unified Header & Action Section - Sticky */}
        <div
          role="banner"
          aria-label="Label Stock List Header with Actions"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            position: 'sticky',
            top: '0',
            zIndex: 100,
            transition: 'box-shadow 0.2s'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {/* Left: Title */}
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 700,
                color: '#1e293b',
                lineHeight: '1.2'
              }}>Label Stock List</h2>
            </div>

            {/* Right: Total Count, Template & Print Label */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {/* Total Count */}
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 600
              }}>
                Total: {showAllData && allFilteredData.length > 0
                  ? allFilteredData.length
                  : totalRecords} records
              </div>

              {/* Template Selector - Small */}
              <div style={{
                minWidth: '160px',
                flexShrink: 0
              }}>
                <select
                  id="template-selector-header"
                  value={selectedTemplate?.value || ''}
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    if (selectedValue === '') {
                      setSelectedTemplate(null);
                    } else {
                      const option = templateOptions.find(opt => String(opt.value) === String(selectedValue));
                      if (option) {
                        setSelectedTemplate(option);
                      }
                    }
                  }}
                  disabled={templatesLoading}
                  aria-label="Select label template"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 500,
                    border: selectedTemplate ? '1.5px solid #06b6d4' : '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none',
                    background: templatesLoading ? '#f1f5f9' : '#ffffff',
                    cursor: templatesLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    color: selectedTemplate ? '#1e293b' : '#64748b'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#06b6d4';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = selectedTemplate ? '#06b6d4' : '#cbd5e1';
                  }}
                >
                  {templateOptions.length === 0 ? (
                    <option value="">{templatesLoading ? 'Loading...' : 'No templates'}</option>
                  ) : (
                    <>
                      <option value="">Select Template</option>
                      {templateOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Print Label Button - Small */}
              <button
                onClick={handlePrintLabel}
                disabled={selectedRows.length === 0 || !selectedTemplate || previewLoading}
                aria-label={selectedRows.length === 0
                  ? 'Please select items to print labels'
                  : !selectedTemplate
                    ? 'Please select a template to print labels'
                    : `Print labels for ${selectedRows.length} selected item(s)`}
                title={selectedRows.length === 0
                  ? 'Please select items to print labels'
                  : !selectedTemplate
                    ? 'Please select a template to print labels'
                    : `Print labels for ${selectedRows.length} selected item(s)`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: (selectedRows.length > 0 && selectedTemplate && !previewLoading)
                    ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                    : '#e2e8f0',
                  color: (selectedRows.length > 0 && selectedTemplate && !previewLoading)
                    ? '#ffffff'
                    : '#94a3b8',
                  cursor: (selectedRows.length === 0 || !selectedTemplate || previewLoading) ? 'not-allowed' : 'pointer',
                  opacity: (selectedRows.length === 0 || !selectedTemplate || previewLoading) ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  minWidth: '100px',
                  justifyContent: 'center',
                  height: '32px'
                }}
                onMouseEnter={(e) => {
                  if (selectedRows.length > 0 && selectedTemplate && !previewLoading) {
                    e.target.style.background = 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)';
                    e.target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedRows.length > 0 && selectedTemplate && !previewLoading) {
                    e.target.style.background = 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {previewLoading ? (
                  <>
                    <FaSpinner style={{ animation: 'spin 1s linear infinite', fontSize: '10px' }} />
                    <span>Printing...</span>
                  </>
                ) : (
                  <>
                    <FaFilePdf style={{ fontSize: '11px' }} />
                    <span>Print Label</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons & Search Row */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb'
          }}
            role="toolbar"
            aria-label="Action buttons toolbar"
          >
            {/* Search Input */}
            <div style={{
              position: 'relative',
              flex: '0 1 auto',
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
                placeholder="Search by Product Name, Category, SKU..."
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
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
                onFocus={(e) => e.target.style.borderColor = '#9ca3af'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Toggle Button for Active Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: showActiveOnly ? '#059669' : '#f8fafc',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: showActiveOnly ? '#059669' : '#e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s',
              userSelect: 'none'
            }}
              onClick={() => setShowActiveOnly(!showActiveOnly)}
              title={showActiveOnly ? 'Show all items' : 'Show only items with RFID Code'}
            >
              <div style={{
                width: '36px',
                height: '20px',
                background: showActiveOnly ? '#ffffff' : '#e2e8f0',
                borderRadius: '10px',
                position: 'relative',
                transition: 'all 0.2s'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  background: '#ffffff',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: showActiveOnly ? '18px' : '2px',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </div>
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: showActiveOnly ? '#ffffff' : '#64748b'
              }}>
                Active Only
              </span>
            </div>

            {/* Buttons Container - Right Aligned */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
              marginLeft: 'auto',
              minWidth: 'fit-content'
            }}
              role="group"
              aria-label="Action buttons group"
            >
              {/* View Toggle Button */}
              <button
                onClick={() => setIsGridView(!isGridView)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #4f46e5',
                  background: isGridView ? '#4f46e5' : '#ffffff',
                  color: isGridView ? '#ffffff' : '#4f46e5',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title={isGridView ? "Switch to List View" : "Switch to Grid View"}
              >
                {isGridView ? <FaThList /> : <FaThLarge />}
                <span>{isGridView ? "List View" : "Grid View"}</span>
              </button>

              {/* Delete Button */}
              <button
                onClick={handleDelete}
                disabled={selectedRows.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #dc2626',
                  background: '#ffffff',
                  color: '#dc2626',
                  cursor: selectedRows.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedRows.length === 0 ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedRows.length > 0) {
                    e.target.style.background = '#dc2626';
                    e.target.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedRows.length > 0) {
                    e.target.style.background = '#ffffff';
                    e.target.style.color = '#dc2626';
                  }
                }}
              >
                <FaTrash />
                <span>Delete</span>
              </button>

              {/* Export Button */}
              <button
                onClick={() => setShowExportModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #0ea5e9',
                  background: '#ffffff',
                  color: '#0ea5e9',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#0ea5e9';
                  e.target.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ffffff';
                  e.target.style.color = '#0ea5e9';
                }}
              >
                <FaFileExport />
                <span>Export</span>
              </button>

              {/* Report Button */}
              <button
                onClick={generateAndShowReport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #d97706',
                  background: '#ffffff',
                  color: '#d97706',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#d97706';
                  e.target.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ffffff';
                  e.target.style.color = '#d97706';
                }}
              >
                <FaFilePdf />
                <span>Report</span>
              </button>

              {/* Filter Button - toggles inline filter section below */}
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
                  border: '1px solid #0d9488',
                  background: showFilterPanel ? '#0d9488' : '#ffffff',
                  color: showFilterPanel ? '#ffffff' : '#0d9488',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!showFilterPanel) e.target.style.background = '#ccfbf1';
                }}
                onMouseLeave={(e) => {
                  if (!showFilterPanel) e.target.style.background = '#ffffff';
                }}
              >
                <FaFilter />
                <span>Filter</span>
              </button>

              {/* Delete All Button */}
              <button
                onClick={handleDeleteAllStock}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #e11d48',
                  background: '#ffffff',
                  color: '#e11d48',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e11d48';
                  e.target.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ffffff';
                  e.target.style.color = '#e11d48';
                }}
              >
                <FaTrash />
                <span>Delete All</span>
              </button>
            </div>
          </div>

        {showReportView && (
          <div style={{
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 6px 24px #e0e7ef66',
            border: '1.5px solid #e6eaf0',
            padding: '24px 32px',
            margin: '0 auto 32px auto',
            fontFamily: 'Inter, sans-serif',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#232a36' }}>Stock Report Summary</h3>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={handleDownloadReportPDF} style={{
                  background: '#059669',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <FaFilePdf /> Download
                </button>
                <button onClick={() => setShowReportView(false)} style={{
                  background: '#e2e8f0',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer'
                }}>
                  Close
                </button>
              </div>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ background: '#f9fafb', padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>Sr No</th>
                    <th style={{ background: '#f9fafb', padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>Counter Name</th>
                    <th style={{ background: '#f9fafb', padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>Category</th>
                    <th style={{ background: '#f9fafb', padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>Product Name</th>
                    <th style={{ background: '#f9fafb', padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>Qty</th>
                    <th style={{ background: '#f9fafb', padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>Gross Wt</th>
                    <th style={{ background: '#f9fafb', padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>Net Wt</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px' }}>{index + 1}</td>
                      <td style={{ padding: '12px 16px' }}>{row.counter}</td>
                      <td style={{ padding: '12px 16px' }}>{row.category}</td>
                      <td style={{ padding: '12px 16px' }}>{row.product}</td>
                      <td style={{ padding: '12px 16px' }}>{row.qty}</td>
                      <td style={{ padding: '12px 16px' }}>{row.grossWt.toFixed(3)}</td>
                      <td style={{ padding: '12px 16px' }}>{row.netWt.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filter Slider - Right Side */}
        {/* Inline filter section - opens below toolbar when Filter clicked (no sidebar) */}
        {showFilterPanel && (
          <div className="filter-inline-section" style={{
            marginTop: '12px',
            padding: '12px 16px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              gap: '10px',
              rowGap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '4px', flexShrink: 0 }}>
                <FaFilter style={{ color: '#0d9488', fontSize: '14px' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Filters</span>
              </div>
              <div style={{ minWidth: 100, flex: '1 1 0', maxWidth: 160 }}>{renderSearchableDropdown(
                'branch',
                'Branch',
                'Search branch...',
                apiFilterData.branches || [],
                (item) => item.BranchName || item.Name || item.branchName || item.name,
                (item) => item.BranchName || item.Name || item.branchName || item.name,
                'All'
              )}</div>
              <div style={{ minWidth: 100, flex: '1 1 0', maxWidth: 160 }}>{renderSearchableDropdown(
                'counterName',
                'Counter Name',
                'Search counter...',
                apiFilterData.counters || [],
                (item) => item.CounterName || item.Name || item.counterName,
                (item) => item.CounterName || item.Name || item.counterName,
                'All Counters'
              )}</div>
              <div style={{ minWidth: 100, flex: '1 1 0', maxWidth: 160 }}>{renderSearchableDropdown(
                'boxName',
                'Box Name',
                'Search box...',
                filterOptions.boxNames.filter(opt => opt !== 'All') || [],
                (item) => item,
                (item) => item,
                'All'
              )}</div>
              <div style={{ minWidth: 100, flex: '1 1 0', maxWidth: 160 }}>{renderSearchableDropdown(
                'categoryId',
                'Category',
                'Search category...',
                apiFilterData.categories || [],
                (item) => item.CategoryName || item.Name || item.categoryName,
                (item) => item.CategoryName || item.Name || item.categoryName,
                'All Categories'
              )}</div>
              <div style={{ minWidth: 100, flex: '1 1 0', maxWidth: 160 }}>{renderSearchableDropdown(
                'productId',
                'Product',
                'Search product...',
                apiFilterData.products || [],
                (item) => item.ProductName || item.Name || item.productName,
                (item) => item.ProductName || item.Name || item.productName,
                'All Products'
              )}</div>
              <div style={{ minWidth: 100, flex: '1 1 0', maxWidth: 160 }}>{renderSearchableDropdown(
                'designId',
                'Design',
                'Search design...',
                apiFilterData.designs || [],
                (item) => item.DesignName || item.Name || item.designName,
                (item) => item.DesignName || item.Name || item.designName,
                'All Designs'
              )}</div>
              <div style={{ minWidth: 100, flex: '1 1 0', maxWidth: 160 }}>{renderSearchableDropdown(
                'purityId',
                'Purity',
                'Search purity...',
                apiFilterData.purities || [],
                (item) => item.PurityName || item.Name || item.Purity || item.purityName,
                (item) => item.PurityName || item.Name || item.Purity || item.purityName,
                'All Purities'
              )}</div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
                <button
                  onClick={handleResetFilters}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #64748b',
                    background: '#ffffff',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
                <button
                  onClick={handleApplyFilters}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: '#7c3aed',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Apply
                </button>
                <button
                  onClick={() => { closeAllDropdowns(); setShowFilterPanel(false); }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: '#f1f5f9',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FaTimes size={12} /> Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data Display Container */}
        <div className="data-display-container" style={{
          background: isGridView ? 'transparent' : '#ffffff',
          borderRadius: '12px',
          marginTop: '16px',
          boxShadow: isGridView ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
          border: isGridView ? 'none' : '1px solid #e5e7eb',
          overflow: isGridView ? 'visible' : 'visible',
          display: 'flex',
          flexDirection: 'column',
          height: isGridView ? 'auto' : 'calc(100vh - 280px)',
          minHeight: isGridView ? 'auto' : '400px'
        }}>
          {isGridView ? (
            <div className="product-grid">
              {(showAllData && allFilteredData.length > 0 ? allFilteredData : currentItems).map((item) => {
                const imgUrl = getItemImageUrl(item);
                const isSelected = selectedRows.includes(item.Id);
                return (
                  <article
                    key={item.Id}
                    className={`product-card ${isSelected ? 'product-card--selected' : ''}`}
                    onClick={() => handleRowSelection(item.Id)}
                  >
                    <div className="product-card__checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => { e.stopPropagation(); handleRowSelection(item.Id); }}
                        aria-label="Select item"
                      />
                    </div>
                    <span className={`product-card__badge product-card__badge--${(item.Status || 'ApiActive').toLowerCase()}`}>
                      {item.Status || 'ApiActive'}
                    </span>
                    <div className="product-card__image-wrap">
                      {imgUrl ? (
                        <img src={imgUrl} alt={item.ProductName || 'Product'} className="product-card__image" />
                      ) : (
                        <div className="product-card__image-placeholder">
                          <FaGem size={32} />
                          <span>No Image</span>
                        </div>
                      )}
                      <div className="product-card__actions">
                        <button
                          type="button"
                          className="product-card__action product-card__action--view"
                          onClick={(e) => { e.stopPropagation(); navigate('/product-details', { state: { product: item, apiFilterData } }); }}
                          title="View Details"
                        >
                          <FaEye size={14} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          className="product-card__action product-card__action--print"
                          onClick={(e) => { e.stopPropagation(); handlePrintSingleLabel(item, e); }}
                          disabled={!selectedTemplate || previewLoading}
                          title={!selectedTemplate ? 'Select template first' : 'Print Label'}
                        >
                          {previewLoading ? <FaSpinner className="spin" size={14} /> : <FaPrint size={14} />}
                          <span>Print</span>
                        </button>
                      </div>
                    </div>
                    <div className="product-card__body">
                      <h3 className="product-card__title">{item.ProductName || 'Unknown'}</h3>
                      <dl className="product-card__meta">
                        <div className="product-card__meta-row">
                          <dt>RFID</dt>
                          <dd>{item.RFIDCode || '–'}</dd>
                        </div>
                        <div className="product-card__meta-row">
                          <dt>Design</dt>
                          <dd>{item.Design || item.DesignName || '–'}</dd>
                        </div>
                      </dl>
                      <div className="product-card__footer">
                        <span className="product-card__weight">
                          {item.NetWt ? parseFloat(item.NetWt).toFixed(3) : '0.000'} g
                        </span>
                        <span className="product-card__purity">{item.Purity || '–'}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div
              className="table-scroll-container"
              style={{
                overflowX: 'auto',
                overflowY: 'scroll',
                width: '100%',
                maxWidth: '100%',
                position: 'relative',
                height: '100%',
                flex: 1,
                scrollbarWidth: 'thin',
                scrollbarColor: '#888 #f1f1f1'
              }}>
              <table style={{
                width: '100%',
                minWidth: '1400px',
                borderCollapse: 'collapse',
                fontSize: '12px',
                tableLayout: 'auto'
              }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{
                    background: '#f8fafc',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    <th style={{
                      padding: '12px',
                      textAlign: 'center',
                      width: '40px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#475569'
                    }}>
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(currentItems.map(item => item.Id));
                          } else {
                            setSelectedRows([]);
                          }
                        }}
                        checked={currentItems.length > 0 && selectedRows.length === currentItems.length}
                        style={{
                          cursor: 'pointer',
                          width: '16px',
                          height: '16px'
                        }}
                      />
                    </th>
                    {columns.map((column) => (
                        <th
                          key={column.key}
                          style={{
                            padding: '10px 8px',
                            textAlign: 'left',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#475569',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            width: column.width,
                            transition: 'background 0.2s'
                          }}
                          onClick={() => {
                            if (column.key !== 'checkbox') {
                              const direction = sortConfig.key === column.key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                              const newSortConfig = { key: column.key, direction };
                              setSortConfig(newSortConfig);
                              // Trigger API call with new sort configuration
                              setCurrentPage(1); // Reset to first page when sorting changes
                              fetchLabeledStock(1, itemsPerPage, searchQuery, filterValues, newSortConfig);
                            }
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                          onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {column.label}
                            {sortConfig.key === column.key && (
                              <span>
                                {sortConfig.direction === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    <th style={{
                      padding: '10px 8px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#475569',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      right: '50px',
                      background: '#f8fafc',
                      zIndex: 10,
                      width: '50px',
                      minWidth: '50px',
                      borderLeft: '1px solid #e5e7eb'
                    }}>View</th>
                    <th style={{
                      padding: '10px 8px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#475569',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      right: 0,
                      background: '#f8fafc',
                      zIndex: 10,
                      width: '50px',
                      minWidth: '50px',
                      borderLeft: '1px solid #e5e7eb'
                    }}>Print</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllData && allFilteredData.length > 0 ? allFilteredData : currentItems).map((item, index) => (
                    <tr
                      key={item.Id}
                      onClick={() => handleRowSelection(item.Id)}
                      style={{
                        cursor: 'pointer',
                        borderBottom: '1px solid #e2e8f0',
                        background: selectedRows.includes(item.Id)
                          ? '#fff7ed'
                          : index % 2 === 0
                            ? '#ffffff'
                            : '#f8fafc',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedRows.includes(item.Id)) {
                          e.currentTarget.style.background = '#f8fafc';
                          const cells = e.currentTarget.querySelectorAll('td');
                          cells.forEach(cell => {
                            if (cell.style.position === 'sticky') cell.style.background = '#f8fafc';
                          });
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedRows.includes(item.Id)) {
                          const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                          e.currentTarget.style.background = bgColor;
                          const cells = e.currentTarget.querySelectorAll('td');
                          cells.forEach(cell => {
                            if (cell.style.position === 'sticky') cell.style.background = bgColor;
                          });
                        }
                      }}
                    >
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '12px'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(item.Id)}
                          onChange={() => handleRowSelection(item.Id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px',
                            accentColor: '#4f46e5'
                          }}
                        />
                      </td>
                      {columns.map(column => (
                        <td key={column.key} style={{
                          padding: '10px 8px',
                          fontSize: '12px',
                          color: '#1e293b',
                          whiteSpace: 'nowrap'
                        }}>
                          {column.key === 'srNo' ? ((currentPage - 1) * itemsPerPage) + index + 1 : (() => {
                            const value = item[column.key];
                            if (value === undefined || value === null || value === '') return '-';
                            // Format numeric fields (weights)
                            if (['GrossWt', 'NetWt', 'StoneWt', 'DiamondWt'].includes(column.key)) {
                              const numValue = parseFloat(value);
                              return isNaN(numValue) ? value : numValue.toFixed(3);
                            }
                            return value;
                          })()}
                        </td>
                      ))}
                      {/* View Details Button */}
                      <td style={{
                        padding: '8px 4px',
                        textAlign: 'center',
                        position: 'sticky',
                        right: '50px',
                        background: selectedRows.includes(item.Id)
                          ? '#fff7ed'
                          : index % 2 === 0
                            ? '#ffffff'
                            : '#f8fafc',
                        zIndex: 5,
                        borderLeft: '1px solid #e2e8f0',
                        width: '50px',
                        minWidth: '50px'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/product-details', { state: { product: item, apiFilterData } });
                          }}
                          style={{
                            width: '32px',
                            height: '32px',
                            padding: 0,
                            borderRadius: '6px',
                            border: 'none',
                            background: '#8b5cf6',
                            color: '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            boxShadow: '0 1px 2px rgba(139, 92, 246, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#7c3aed';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#8b5cf6';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          title="View Product Details"
                        >
                          <FaEye size={14} />
                        </button>
                      </td>
                      {/* Print Label Button */}
                      <td style={{
                        padding: '8px 4px',
                        textAlign: 'center',
                        position: 'sticky',
                        right: 0,
                        background: selectedRows.includes(item.Id)
                          ? '#fff7ed'
                          : index % 2 === 0
                            ? '#ffffff'
                            : '#f8fafc',
                        zIndex: 5,
                        borderLeft: '1px solid #e2e8f0',
                        width: '50px',
                        minWidth: '50px'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintSingleLabel(item, e);
                          }}
                          disabled={!selectedTemplate || previewLoading}
                          style={{
                            width: '32px',
                            height: '32px',
                            padding: 0,
                            borderRadius: '6px',
                            border: 'none',
                            background: (!selectedTemplate || previewLoading) ? '#cbd5e1' : '#3b82f6',
                            color: '#ffffff',
                            cursor: (!selectedTemplate || previewLoading) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            boxShadow: (!selectedTemplate || previewLoading) ? 'none' : '0 1px 2px rgba(59, 130, 246, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedTemplate && !previewLoading) {
                              e.currentTarget.style.background = '#2563eb';
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedTemplate && !previewLoading) {
                              e.currentTarget.style.background = '#3b82f6';
                              e.currentTarget.style.transform = 'scale(1)';
                            }
                          }}
                          title={!selectedTemplate ? "Please select a template first" : "Print Label"}
                        >
                          {previewLoading ? (
                            <FaSpinner style={{ animation: 'spin 1s linear infinite' }} size={14} />
                          ) : (
                            <FaPrint size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
              {showAllData && allFilteredData.length > 0 ? (
                <span>
                  Showing all {allFilteredData.length} filtered records
                </span>
              ) : (
                <>
                  <span>
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} entries
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#64748b' }}>Showing per page</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        outline: 'none',
                        cursor: 'pointer',
                        background: '#ffffff',
                        color: '#1e293b',
                        fontWeight: 500
                      }}
                    >
                      {PAGE_SIZE_OPTIONS.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {!showAllData && (
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
                    // Show loader immediately when pagination is clicked
                    setLoading(true);
                    fetchLabeledStock(newPage, itemsPerPage, searchQuery, filterValues);
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
                      onClick={() => {
                        setCurrentPage(page);
                        // Show loader immediately when pagination is clicked
                        setLoading(true);
                        fetchLabeledStock(page, itemsPerPage, searchQuery, filterValues);
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: '1px solid',
                        background: currentPage === page ? '#4f46e5' : '#ffffff',
                        color: currentPage === page ? '#ffffff' : '#475569',
                        borderColor: currentPage === page ? '#4f46e5' : '#e2e8f0',
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
                    setLoading(true);
                    fetchLabeledStock(newPage, itemsPerPage, searchQuery, filterValues);
                  }}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '8px',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Go to page</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages || 1}
                    value={currentPage}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (e.target.value === '') return;
                      if (!isNaN(v) && v >= 1) setCurrentPage(Math.min(v, totalPages || 1));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 1 && v <= (totalPages || 1)) {
                          setCurrentPage(v);
                          setLoading(true);
                          fetchLabeledStock(v, itemsPerPage, searchQuery, filterValues);
                        }
                      }
                    }}
                    style={{
                      width: '52px',
                      padding: '6px 8px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      outline: 'none',
                      textAlign: 'center',
                      background: '#ffffff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      fetchLabeledStock(currentPage, itemsPerPage, searchQuery, filterValues);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: 'none',
                      background: '#4f46e5',
                      color: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    Go
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Responsive Styles */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          /* E-commerce product grid */
          .product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
            padding: 4px 0;
          }
          @media (min-width: 1400px) {
            .product-grid { grid-template-columns: repeat(5, 1fr); }
          }
          @media (min-width: 1024px) and (max-width: 1399px) {
            .product-grid { grid-template-columns: repeat(4, 1fr); }
          }
          @media (min-width: 640px) and (max-width: 1023px) {
            .product-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; }
          }
          @media (max-width: 639px) {
            .product-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          }

          .product-card {
            background: #fff;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            overflow: hidden;
            cursor: pointer;
            position: relative;
            display: flex;
            flex-direction: column;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          }
          .product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.1);
          }
          .product-card--selected {
            border: 2px solid #4f46e5;
            box-shadow: 0 8px 24px rgba(79, 70, 229, 0.2);
          }
          .product-card--selected:hover {
            box-shadow: 0 12px 28px rgba(79, 70, 229, 0.25);
          }

          .product-card__checkbox {
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 3;
          }
          .product-card__checkbox input {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #4f46e5;
          }

          .product-card__badge {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 2;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 4px 8px;
            border-radius: 6px;
          }
          .product-card__badge--apiactive {
            background: #d1fae5;
            color: #065f46;
          }
          .product-card__badge--sold {
            background: #fee2e2;
            color: #991b1b;
          }
          .product-card__badge:not([class*="--"]) {
            background: #e0e7ff;
            color: #3730a3;
          }

          .product-card__image-wrap {
            position: relative;
            aspect-ratio: 1;
            background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .product-card__image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 12px;
          }
          .product-card__image-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            color: #94a3b8;
            font-size: 12px;
            font-weight: 500;
          }
          .product-card__image-placeholder svg {
            opacity: 0.6;
          }

          .product-card__actions {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            gap: 8px;
            padding: 10px 12px;
            background: linear-gradient(transparent, rgba(0,0,0,0.6));
            opacity: 0;
            transition: opacity 0.2s ease;
            z-index: 2;
          }
          .product-card:hover .product-card__actions {
            opacity: 1;
          }
          .product-card__action {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 10px;
            border: none;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s, color 0.2s;
          }
          .product-card__action--view {
            background: rgba(255,255,255,0.95);
            color: #5b21b6;
          }
          .product-card__action--view:hover {
            background: #fff;
            color: #4c1d95;
          }
          .product-card__action--print {
            background: rgba(37, 99, 235, 0.9);
            color: #fff;
          }
          .product-card__action--print:hover:not(:disabled) {
            background: #2563eb;
          }
          .product-card__action--print:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .product-card__body {
            padding: 14px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex: 1;
            min-height: 0;
          }
          .product-card__title {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
            line-height: 1.35;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .product-card__meta {
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .product-card__meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
          }
          .product-card__meta-row dt {
            margin: 0;
            color: #64748b;
            font-weight: 500;
          }
          .product-card__meta-row dd {
            margin: 0;
            color: #334155;
            font-weight: 600;
            max-width: 65%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .product-card__footer {
            margin-top: auto;
            padding-top: 10px;
            border-top: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .product-card__weight {
            font-size: 13px;
            font-weight: 700;
            color: #059669;
          }
          .product-card__purity {
            font-size: 12px;
            font-weight: 600;
            color: #b45309;
          }
          
          @media (max-width: 768px) {
            .product-card__actions { opacity: 1; background: rgba(0,0,0,0.5); }
            /* Header responsive */
            .label-stock-header {
              flex-direction: column !important;
              align-items: flex-start !important;
            }
            
            /* Buttons responsive */
            .action-buttons-container {
              flex-direction: column !important;
              width: 100% !important;
            }
            
            .action-buttons-container button {
              width: 100% !important;
              justify-content: center !important;
            }
            
            /* Table responsive */
            table {
              font-size: 10px !important;
            }
            
            th, td {
              padding: 8px 6px !important;
              font-size: 10px !important;
            }
            
            /* Pagination responsive */
            .pagination-container {
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 12px !important;
            }
            
            /* Inline filter section responsive */
            .filter-inline-section {
              padding: 14px !important;
            }
            .filter-grid {
              grid-template-columns: 1fr !important;
              gap: 12px !important;
            }
          }
          
          @media (max-width: 480px) {
            /* Smaller fonts for mobile */
            h2 {
              font-size: 14px !important;
            }
            
            p {
              font-size: 10px !important;
            }
            
            button {
              font-size: 10px !important;
              padding: 6px 10px !important;
            }
            
            input, select {
              font-size: 10px !important;
              padding: 6px 10px !important;
            }
            
            table {
              font-size: 10px !important;
            }
            
            th, td {
              padding: 6px 4px !important;
              font-size: 10px !important;
            }
            
            /* Hide some columns on very small screens */
            th:nth-child(n+8),
            td:nth-child(n+8) {
              display: none;
            }
          }
        `}</style>

        {exportModal}

        {showDeleteConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(44,62,80,0.18)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 18,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              width: 420,
              maxWidth: '98vw',
              padding: '0 0 18px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'fadeIn 0.2s',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 32px 0 32px' }}>
                <FaExclamationTriangle style={{ color: '#f59e42', fontSize: 48, marginBottom: 12 }} />
                <div style={{ fontWeight: 700, fontSize: 22, color: '#232a36', marginBottom: 8, textAlign: 'center' }}>Delete Selected Items?</div>
                <div style={{ color: '#64748b', fontSize: 15, marginBottom: 18, textAlign: 'center', maxWidth: 340 }}>
                  Are you sure you want to delete the selected item(s)? This action cannot be undone.
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 8 }}>
                <button onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading} style={{
                  background: '#f3f4f6',
                  color: '#232a36',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 32px',
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: 'pointer',
                  minWidth: 110,
                  opacity: deleteLoading ? 0.6 : 1,
                }}>Cancel</button>
                <button onClick={confirmDelete} disabled={deleteLoading} style={{
                  background: deleteLoading ? '#fca5a5' : '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 32px',
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  minWidth: 110,
                  boxShadow: '0 2px 8px #ef444422',
                  opacity: deleteLoading ? 0.7 : 1,
                }}>{deleteLoading ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </div>
        )}

        {showDeleteAllStockConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(44,62,80,0.18)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 18,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              width: 480,
              maxWidth: '98vw',
              padding: '0 0 18px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'fadeIn 0.2s',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 32px 0 32px' }}>
                <FaExclamationTriangle style={{ color: '#dc3545', fontSize: 48, marginBottom: 12 }} />
                <div style={{ fontWeight: 700, fontSize: 22, color: '#dc3545', marginBottom: 8, textAlign: 'center' }}>Delete ALL Stock for Client?</div>
                <div style={{ color: '#64748b', fontSize: 15, marginBottom: 18, textAlign: 'center', maxWidth: 400 }}>
                  <strong>WARNING:</strong> This will permanently delete ALL stock items for the current client ({userInfo?.ClientCode || 'Unknown'}). This action cannot be undone and will remove all stock data associated with this client.
                  <br /><br />
                  <span style={{ color: '#dc3545', fontWeight: 600 }}>
                    Are you absolutely sure you want to proceed?
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 8 }}>
                <button onClick={() => setShowDeleteAllStockConfirm(false)} disabled={deleteAllStockLoading} style={{
                  background: '#f3f4f6',
                  color: '#232a36',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 32px',
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: 'pointer',
                  minWidth: 110,
                  opacity: deleteAllStockLoading ? 0.6 : 1,
                }}>Cancel</button>
                <button onClick={confirmDeleteAllStock} disabled={deleteAllStockLoading} style={{
                  background: deleteAllStockLoading ? '#fca5a5' : '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 32px',
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: deleteAllStockLoading ? 'not-allowed' : 'pointer',
                  minWidth: 110,
                  boxShadow: '0 2px 8px #dc354522',
                  opacity: deleteAllStockLoading ? 0.7 : 1,
                }}>{deleteAllStockLoading ? 'Deleting All...' : 'Delete ALL Stock for Client'}</button>
              </div>
            </div>
          </div>
        )}


        <style jsx>{`
          .main-container {
            position: relative;
            width: 100%;
            height: 100%;
          }

          .label-stock-container {
            padding: 24px;
            background: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }

          .list-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 24px 0;
          }

          .header-left {
            display: flex;
            align-items: baseline;
          }

          .header-title {
            font-size: 26px;
            font-weight: 600;
            color: #1a1a1a;
            margin: 0;
            letter-spacing: -0.5px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }

          .record-count {
            color: #6B7280;
            font-size: 15px;
            font-weight: normal;
            margin-left: 12px;
            opacity: 0.9;
          }

          .header-controls {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .control-button {
            display: inline-flex;
            align-items: center;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            border: 1px solid transparent;
            transition: all 0.2s ease;
            height: 36px;
            gap: 8px;
            background: #FFFFFF;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          }

          .control-button.danger {
            color: #DC2626;
            border-color: #FCA5A5;
            background-color: #FEF2F2;
          }

          .control-button.danger:hover:not(:disabled) {
            background-color: #DC2626;
            border-color: #DC2626;
            color: white;
            box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
          }

          .control-button.danger:active:not(:disabled) {
            background-color: #B91C1C;
            border-color: #B91C1C;
            color: white;
            transform: translateY(1px);
          }

          .control-button.danger:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background-color: #F3F4F6;
            border-color: #E5E7EB;
            color: #9CA3AF;
          }

          .control-button.secondary {
            color: #1D4ED8;
            border-color: #93C5FD;
            background-color: #EFF6FF;
          }

          .control-button.secondary:hover {
            background-color: #1D4ED8;
            border-color: #1D4ED8;
            color: white;
            box-shadow: 0 2px 4px rgba(29, 78, 216, 0.2);
          }

          .control-button.secondary:active {
            background-color: #1E40AF;
            border-color: #1E40AF;
            color: white;
            transform: translateY(1px);
          }

          .control-button.filter {
            color: #047857;
            border-color: #6EE7B7;
            background-color: #ECFDF5;
          }

          .control-button.filter:hover {
            background-color: #047857;
            border-color: #047857;
            color: white;
            box-shadow: 0 2px 4px rgba(4, 120, 87, 0.2);
          }

          .control-button.filter:active {
            background-color: #065F46;
            border-color: #065F46;
            color: white;
            transform: translateY(1px);
          }

          .refresh-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px 16px;
            border-radius: 6px;
            color: #4B5563;
            border: 1px solid #E5E7EB;
            background-color: #F9FAFB;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            font-size: 14px;
            font-weight: 500;
            gap: 8px;
          }

          .refresh-button:hover {
            background-color: #6366F1;
            border-color: #6366F1;
            color: white;
            box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
          }

          .refresh-button:active {
            background-color: #4F46E5;
            border-color: #4F46E5;
            color: white;
            transform: translateY(1px);
          }

          .refresh-button svg {
            font-size: 16px;
            transition: transform 0.3s ease;
          }

          .refresh-button:hover svg {
            transform: rotate(180deg);
          }

          .refresh-button.refreshing svg {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          .table-container {
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            overflow: hidden;
            background: white;
            box-shadow: 0 2px 8px rgba(44, 62, 80, 0.04);
          }
          .table-wrapper {
            overflow-x: auto;
            position: relative;
            margin-bottom: 6px;
            min-height: 400px;
          }
          .table-responsive {
            overflow-x: auto;
            overflow-y: visible;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: #888 #f1f1f1;
          }
          .label-stock-table-wrapper {
            overflow-x: auto !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
            width: 100%;
            position: relative;
            scrollbar-width: thin;
            scrollbar-color: #888 #f1f1f1;
          }
          .label-stock-table-wrapper::-webkit-scrollbar {
            width: 12px;
            height: 12px;
            -webkit-appearance: none;
          }
          .label-stock-table-wrapper::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 5px;
            margin: 2px;
          }
          .label-stock-table-wrapper::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 5px;
            border: 2px solid #f1f1f1;
          }
          .label-stock-table-wrapper::-webkit-scrollbar-thumb:hover {
            background: #555;
          }
          .label-stock-table-wrapper::-webkit-scrollbar-corner {
            background: #f1f1f1;
          }
          
          /* Data display container scrollbar styling - Always visible */
          .data-display-container > div,
          .table-scroll-container {
            scrollbar-width: thin !important;
            scrollbar-color: #888 #f1f1f1 !important;
            overflow-y: scroll !important;
            overflow-x: auto !important;
          }
          .data-display-container > div::-webkit-scrollbar,
          .table-scroll-container::-webkit-scrollbar {
            width: 12px !important;
            height: 12px !important;
            -webkit-appearance: none !important;
            display: block !important;
          }
          .data-display-container > div::-webkit-scrollbar-track,
          .table-scroll-container::-webkit-scrollbar-track {
            background: #f1f1f1 !important;
            border-radius: 6px !important;
            -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.1) !important;
          }
          .data-display-container > div::-webkit-scrollbar-thumb,
          .table-scroll-container::-webkit-scrollbar-thumb {
            background: #888 !important;
            border-radius: 6px !important;
            border: 2px solid #f1f1f1 !important;
            -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.3) !important;
          }
          .data-display-container > div::-webkit-scrollbar-thumb:hover,
          .table-scroll-container::-webkit-scrollbar-thumb:hover {
            background: #555 !important;
          }
          .data-display-container > div::-webkit-scrollbar-corner,
          .table-scroll-container::-webkit-scrollbar-corner {
            background: #f1f1f1 !important;
          }
          .table-responsive::-webkit-scrollbar {
            height: 10px;
            -webkit-appearance: none;
          }
          .table-responsive::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 5px;
            margin: 2px;
          }
          .table-responsive::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 5px;
            border: 2px solid #f1f1f1;
          }
          .table-responsive::-webkit-scrollbar-thumb:hover {
            background: #555;
          }
          table {
            width: 100%;
            min-width: 1400px;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 13px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            table-layout: auto;
          }
          thead tr {
            background: linear-gradient(90deg, #f8f9fa 0%, #e9ecef 100%);
            border-bottom: 2px solid #e5e7eb;
          }
          th {
            padding: 8px 10px;
            font-size: 12px;
            font-weight: 600;
            color: #38414a;
            white-space: nowrap;
            text-align: left;
            vertical-align: middle;
            border-bottom: 1px solid #e5e7eb;
            background: none;
            letter-spacing: 0.01em;
          }
          .th-content {
            display: flex;
            align-items: center;
            gap: 4px;
            line-height: 1.2;
            white-space: nowrap;
          }
          td {
            padding: 8px 10px;
            font-size: 13px;
            color: #38414a;
            border-bottom: 1px solid #f0f0f0;
            background: inherit;
            font-weight: 400;
            vertical-align: middle;
            white-space: nowrap;
          }
          tr:hover td {
            background: #f6faff;
          }
          tr.selected td {
            background: #eaf1fb;
          }
          .checkbox-column {
            width: 40px;
            text-align: center;
            padding: 8px 4px !important;
          }
          .checkbox-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          input[type="checkbox"] {
            width: 16px;
            height: 16px;
            border-radius: 3px;
            border: 1px solid #d9d9d9;
            background-color: white;
            cursor: pointer;
            position: relative;
            transition: all 0.2s;
          }
          input[type="checkbox"]:checked {
            background-color: #1890ff;
            border-color: #1890ff;
          }
          input[type="checkbox"]:hover:not(:checked) {
            border-color: #1890ff;
          }
          td[data-type="number"] {
            text-align: right;
          }
          th:last-child,
          td:last-child {
            position: sticky;
            right: 0;
            z-index: 10;
            background: inherit;
            box-shadow: -4px 0 6px rgba(0, 0, 0, 0.05);
            min-width: 110px;
            max-width: 110px;
            width: 110px;
            border-left: 2px solid #e5e7eb;
          }
          th:last-child {
            background: #f8f9fa;
          }
          td:last-child {
            background: white;
          }
          .sold-row td:last-child {
            background: #fff1f2 !important;
          }
          .status-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 500;
          }
          .status-badge.active {
            background-color: #DCFCE7;
            color: #15803D;
          }
          .status-badge.apiactive {
            background-color: #DBEAFE;
            color: #1D4ED8;
          }
          .status-badge.sold {
            background-color: #fee2e2;
            color: #dc2626;
          }
          
          .status-badge.sold.clickable:hover {
            background-color: #fecaca;
            color: #b91c1c;
          }
          .sold-row td {
            background: #fff1f2 !important;
          }
          .pagination {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #4b5563;
            flex-wrap: wrap;
            gap: 16px;
          }
          .pagination-controls {
            display: flex;
            gap: 4px;
            align-items: center;
          }
          .page-btn {
            padding: 6px 12px;
            border: 1px solid #e5e7eb;
            background: white;
            color: #374151;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .page-btn:hover:not(:disabled) {
            background: #f9fafb;
            border-color: #d1d5db;
          }
          .page-btn.active {
            background: #2563eb;
            color: white;
            border-color: #2563eb;
          }
          .page-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .ellipsis {
            padding: 6px 8px;
            color: #6b7280;
          }
          .loading-container,
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
          }
          .loading-container {
            color: #2563eb;
          }
          .error-container {
            color: #dc2626;
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @media (max-width: 768px) {
            .controls {
              flex-direction: column;
              align-items: stretch;
            }
            .search-box {
              max-width: none;
            }
            .action-buttons {
              justify-content: space-between;
            }
            .pagination {
              flex-direction: column;
              gap: 16px;
              align-items: center;
            }
            
            /* Ensure horizontal scroll for table on mobile */
            .label-stock-table-wrapper {
              overflow-x: scroll !important;
              -webkit-overflow-scrolling: touch;
            }
            table {
              min-width: 1400px !important;
            }
            
            /* Responsive button layout */
            .delete-all-stock-btn {
              font-size: 12px;
              padding: 6px 10px;
              min-width: auto;
            }
            
            /* Buttons wrap on tablet */
            .action-buttons-container {
              flex-wrap: wrap !important;
              overflow-x: visible;
              overflow-y: visible;
              justify-content: flex-start;
            }
            
            .action-buttons-container .btn {
              flex-shrink: 0;
              min-width: fit-content;
            }
          }
          
          @media (max-width: 576px) {
            /* Extra small screens */
            .delete-all-stock-btn {
              font-size: 11px;
              padding: 5px 8px;
            }
            
            /* Make search bar responsive on mobile */
            .search-input-container {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
            }
            
            .position-relative.w-auto {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
            }
            
            /* Adjust button text for very small screens */
            .delete-all-stock-btn .d-inline.d-sm-none {
              font-size: 10px;
            }
          }
          
          @media (max-width: 480px) {
            /* Mobile portrait */
            .delete-all-stock-btn {
              font-size: 10px;
              padding: 4px 6px;
            }
            
            /* Reduce gaps between elements */
            .gap-3 {
              gap: 0.75rem !important;
            }
            
            .gap-2 {
              gap: 0.5rem !important;
            }
            
            /* Buttons wrap on mobile */
            .action-buttons-container {
              flex-wrap: wrap !important;
              overflow-x: visible;
              overflow-y: visible;
              justify-content: flex-start;
            }
            
            .action-buttons-container .btn {
              flex-shrink: 0;
              min-width: fit-content;
              font-size: 11px;
              padding: 4px 6px;
            }
          }
          
          @media (max-width: 360px) {
            /* Very small screens */
            .delete-all-stock-btn {
              font-size: 9px;
              padding: 3px 5px;
            }
            
            .action-buttons-container .btn {
              font-size: 9px;
              padding: 3px 5px;
              flex-shrink: 0;
              min-width: fit-content;
            }
            
            /* Ensure horizontal scrolling works on very small screens */
            .action-buttons-container {
              overflow-x: auto;
              overflow-y: hidden;
              padding-bottom: 2px;
            }
          }
          
          /* Search bar styling */
          .search-input-container {
            width: 100%;
            min-width: 200px;
            max-width: 400px;
          }
          
          @media (max-width: 768px) {
            .search-input-container {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
            }
            
            /* Make action buttons wrap properly on mobile */
            .action-buttons-container {
              justify-content: flex-start !important;
            }
          }
          
          @media (max-width: 576px) {
            .search-input-container {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
            }
          }
          
          .position-relative.w-auto {
            min-width: 200px;
            max-width: 300px;
          }
          
          @media (max-width: 768px) {
            .position-relative.w-auto {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
            }
          }
          
          .search-input-container .form-control,
          .position-relative.w-auto .form-control {
            padding-left: 2.5rem !important;
            padding-right: 0.75rem !important;
            border-radius: 6px;
            border: 1px solid #E5E7EB;
            transition: all 0.2s ease;
          }
          
          .position-relative.w-auto .form-control:focus {
            border-color: #3B82F6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
            outline: none;
          }
          
          /* Ensure search icon is visible */
          .position-relative.w-auto .fa-search {
            z-index: 2;
            pointer-events: none;
          }
          
          /* Enhanced responsive styles for Delete All Stock button */
          .delete-all-stock-btn {
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            color: #dc3545;
            background-color: transparent;
            border-color: #dc3545;
          }
          
          .delete-all-stock-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(220, 53, 69, 0.2);
            color: white !important;
            background-color: #dc3545 !important;
            border-color: #dc3545 !important;
          }
          
          .delete-all-stock-btn:active {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(220, 53, 69, 0.15);
          }
          
          /* Enhanced Modal Styles */
          .modal-content {
            border: none !important;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
          }
          
          .modal-header {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }
          
          .modal-title {
            font-weight: 700 !important;
            color: #1e293b !important;
          }
          
          .btn-close {
            opacity: 0.7;
            transition: all 0.2s ease;
          }
          
          .btn-close:hover {
            opacity: 1;
            transform: scale(1.1);
          }
          
          /* Enhanced form controls */
          .form-check-input:checked {
            background-color: #3b82f6 !important;
            border-color: #3b82f6 !important;
          }
          
          .form-check-input:focus {
            box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25) !important;
          }
          
          /* Button hover effects */
          .btn-outline-secondary:hover {
            background-color: #64748b !important;
            border-color: #64748b !important;
            color: white !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(100, 116, 139, 0.3);
          }
          
          .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
          }
          
          /* Status-specific styling */
          .status-sold {
            color: #dc2626 !important;
            background-color: #fef2f2 !important;
            border-color: #fecaca !important;
          }
          
          .status-sold:hover {
            background-color: #fee2e2 !important;
            border-color: #fca5a5 !important;
          }
          
          .status-sold .form-check-label {
            color: #dc2626 !important;
          }
          
          /* Zoho-like compact styling */
          .modal-content {
            border-radius: 8px !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
          }
          
          .modal-header {
            padding: 16px 20px !important;
            background: #f8fafc !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }
          
          .modal-body {
            padding: 16px 20px !important;
          }
          
          .modal-footer {
            padding: 16px 20px !important;
            background: #f8fafc !important;
            border-top: 1px solid #e2e8f0 !important;
          }
          
          /* Responsive button container */
          .d-flex.flex-wrap.gap-2,
          .action-buttons-container {
            transition: all 0.3s ease;
            gap: 0.5rem !important;
            flex-wrap: wrap !important;
            overflow-x: visible;
            overflow-y: visible;
            padding-bottom: 0;
          }
          
          /* Custom scrollbar for button container */
          .action-buttons-container::-webkit-scrollbar {
            height: 6px;
          }
          
          .action-buttons-container::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .action-buttons-container::-webkit-scrollbar-thumb {
            background: #cbd5e0;
            border-radius: 3px;
          }
          
          .action-buttons-container::-webkit-scrollbar-thumb:hover {
            background: #a0aec0;
          }
          
          /* Ensure buttons don't overflow on small screens */
          .btn {
            word-wrap: break-word;
            hyphens: auto;
            flex-shrink: 0;
            white-space: nowrap;
          }
          
          /* Button container specific styles */
          .action-buttons-container .btn {
            flex-shrink: 0;
            min-width: fit-content;
            white-space: nowrap;
          }
          
          .search-box {
            position: relative;
            width: 320px;
            margin-right: 8px;
          }
          .search-box input {
            width: 100%;
            height: 36px;
            padding: 8px 12px 8px 36px;
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            font-size: 14px;
            background-color: #F9FAFB;
            color: #374151;
            transition: all 0.2s;
          }
          .search-box input:focus {
            background-color: #FFFFFF;
            border-color: #3B82F6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
            outline: none;
          }
          .search-box input::placeholder {
            color: #9CA3AF;
          }
          .search-box .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #9CA3AF;
            font-size: 14px;
          }
          .filter-panel-zoho {
            background: #f7fafd;
            border-radius: 10px;
            box-shadow: 0 2px 12px rgba(44, 62, 80, 0.07);
            margin: 18px 0 24px 0;
            padding: 24px 28px 18px 28px;
            border: 1px solid #e3eaf3;
            max-width: 100%;
            animation: fadeIn 0.3s;
          }
          .filter-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .filter-panel-header h2 {
            font-size: 18px;
            color: #2d3e50;
            font-weight: 600;
            margin: 0;
          }
          .close-panel-btn {
            background: none;
            border: none;
            font-size: 22px;
            color: #7f8b9a;
            cursor: pointer;
            border-radius: 4px;
            padding: 2px 8px;
            transition: background 0.2s;
          }
          .close-panel-btn:hover {
            background: #eaf1fb;
          }
          .filter-panel-content {
            display: flex;
            flex-wrap: wrap;
            gap: 18px 32px;
            margin-bottom: 18px;
          }
          .filter-row {
            display: flex;
            flex-wrap: wrap;
            gap: 18px 32px;
            width: 100%;
          }
          .filter-field {
            display: flex;
            flex-direction: column;
            min-width: 180px;
            max-width: 220px;
            flex: 1 1 180px;
          }
          .filter-field label {
            font-size: 13px;
            color: #6b7a90;
            margin-bottom: 6px;
            font-weight: 500;
          }
          .filter-field input,
          .filter-field select {
            padding: 7px 12px;
            border: 1px solid #dbe6f3;
            border-radius: 6px;
            background: #fff;
            font-size: 14px;
            color: #2d3e50;
            outline: none;
            transition: border 0.2s;
          }
          .filter-field input:focus,
          .filter-field select:focus {
            border-color: #2d9cdb;
          }
          .filter-panel-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 8px;
          }
          .reset-button,
          .apply-button {
            padding: 8px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          .reset-button {
            background: #fff;
            border: 1px solid #dbe6f3;
            color: #2d3e50;
          }
          .reset-button:hover {
            background: #eaf1fb;
            border-color: #2d9cdb;
          }
          .apply-button {
            background: #2d9cdb;
            border: 1px solid #2d9cdb;
            color: #fff;
          }
          .apply-button:hover {
            background: #2589c1;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .sticky-status-col {
            position: sticky;
            right: 0;
            z-index: 20;
            min-width: 110px;
            max-width: 110px;
            width: 110px;
            background: inherit;
            border-left: 2px solid #e5e7eb;
          }
          .sold-row.sticky-status-col, .sold-row td.sticky-status-col {
            background: #fff1f2 !important;
          }
          
          /* Status popup styles */
          .status-popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.2s ease-out;
          }
          
          .status-popup {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            width: 90%;
            max-width: 480px;
            max-height: 80vh;
            overflow: hidden;
            animation: slideUp 0.3s ease-out;
          }
          
          .status-popup-header {
            padding: 24px 24px 16px 24px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .status-popup-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin: 0;
          }
          
          .status-popup-close {
            background: none;
            border: none;
            font-size: 20px;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: background 0.2s;
          }
          
          .status-popup-close:hover {
            background: #f3f4f6;
          }
          
          .status-popup-content {
            padding: 24px;
          }
          
          .status-popup-item-info {
            background: #f9fafb;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
          }
          
          .status-popup-item-title {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 8px;
          }
          
          .status-popup-item-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            font-size: 14px;
            color: #6b7280;
          }
          
          .status-popup-item-detail {
            display: flex;
            justify-content: space-between;
          }
          
          .status-popup-item-detail strong {
            color: #374151;
          }
          
          .status-popup-current-status {
            margin-bottom: 24px;
          }
          
          .status-popup-current-status-label {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 8px;
          }
          
          .status-popup-options {
            display: grid;
            gap: 12px;
          }
          
          .status-option {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            background: white;
          }
          
          .status-option:hover {
            border-color: #3b82f6;
            background: #f8fafc;
          }
          
          .status-option.selected {
            border-color: #3b82f6;
            background: #eff6ff;
          }
          
          .status-option-radio {
            margin-right: 12px;
            width: 16px;
            height: 16px;
            accent-color: #3b82f6;
          }
          
          .status-option-label {
            font-size: 14px;
            font-weight: 500;
            color: #1f2937;
          }
          
          .status-popup-footer {
            padding: 16px 24px 24px 24px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }
          
          .status-popup-btn {
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
          }
          
          .status-popup-btn-cancel {
            background: white;
            border: 1px solid #d1d5db;
            color: #374151;
          }
          
          .status-popup-btn-cancel:hover {
            background: #f9fafb;
            border-color: #9ca3af;
          }
          
          .status-popup-btn-update {
            background: #3b82f6;
            color: white;
          }
          
          .status-popup-btn-update:hover:not(:disabled) {
            background: #2563eb;
          }
          
          .status-popup-btn-update:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          
          @keyframes slideUp {
            from { 
              opacity: 0; 
              transform: translateY(20px) scale(0.95); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0) scale(1); 
            }
          }
          
          .status-badge.clickable:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
        `}</style>

        {/* Zoho-style Status Change Modal */}
        {showStatusPopup && selectedItemForStatus && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <div className="modal-header border-bottom-0 pb-2" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
                  <h6 className="modal-title fw-bold text-dark mb-0" style={{ fontSize: '16px', color: '#1e293b' }}>
                    <FaGem className="me-2" style={{ color: '#8b5cf6' }} />
                    {selectedItemForStatus.ProductName}
                  </h6>
                  <button
                    type="button"
                    className="btn-close btn-close-sm"
                    onClick={() => setShowStatusPopup(false)}
                    style={{ fontSize: '16px', color: '#64748b' }}
                  ></button>
                </div>

                <div className="modal-body pt-2 px-3">
                  {/* Item Info - Compact */}
                  <div className="bg-light rounded-2 p-3 mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="row g-2">
                      <div className="col-6">
                        <div className="d-flex flex-column">
                          <span className="fw-semibold text-muted mb-1" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Item Code</span>
                          <span className="text-dark fw-bold" style={{ fontSize: '13px', color: '#1e293b' }}>{selectedItemForStatus.ItemCode}</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="d-flex flex-column">
                          <span className="fw-semibold text-muted mb-1" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>RFID Code</span>
                          <span className="text-dark fw-bold" style={{ fontSize: '13px', color: '#1e293b' }}>{selectedItemForStatus.RFIDCode}</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="d-flex flex-column">
                          <span className="fw-semibold text-muted mb-1" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Category</span>
                          <span className="text-dark fw-bold" style={{ fontSize: '13px', color: '#1e293b' }}>{selectedItemForStatus.CategoryName}</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="d-flex flex-column">
                          <span className="fw-semibold text-muted mb-1" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Net Weight</span>
                          <span className="text-dark fw-bold" style={{ fontSize: '13px', color: '#1e293b' }}>{selectedItemForStatus.NetWt} g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Current Status - Compact */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-muted mb-1" style={{ fontSize: '12px', color: '#64748b' }}>
                      <FaInfoCircle className="me-1" style={{ color: '#3b82f6' }} />
                      Current Status
                    </label>
                    <div>
                      <span className={`badge ${selectedItemForStatus.Status?.toLowerCase() === 'apiactive' ? 'bg-primary' : 'bg-success'}`}
                        style={{
                          fontSize: '11px',
                          padding: '6px 12px',
                          borderRadius: '16px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px'
                        }}>
                        {selectedItemForStatus.Status || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* New Status Selection - Compact */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-muted mb-2" style={{ fontSize: '12px', color: '#64748b' }}>
                      <FaEdit className="me-1" style={{ color: '#3b82f6' }} />
                      Select New Status
                    </label>
                    <div className="d-grid gap-2">
                      {availableStatuses.map((status) => (
                        <div key={status} className={`form-check border-0 rounded-2 p-2 ${status === 'Sold' ? 'status-sold' : ''}`} style={{
                          background: selectedItemForStatus.Status === status ?
                            (status === 'Sold' ? '#fef2f2' : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)') : '#f8fafc',
                          border: selectedItemForStatus.Status === status ?
                            (status === 'Sold' ? '2px solid #dc2626' : '2px solid #3b82f6') : '1px solid #e2e8f0',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}>
                          <input
                            type="radio"
                            name="newStatus"
                            value={status}
                            className="form-check-input"
                            id={`status-${status}`}
                            defaultChecked={selectedItemForStatus.Status === status}
                            style={{ transform: 'scale(1.1)', accentColor: '#3b82f6' }}
                          />
                          <label className="form-check-label fw-semibold ms-2" htmlFor={`status-${status}`} style={{
                            color: selectedItemForStatus.Status === status ?
                              (status === 'Sold' ? '#dc2626' : '#1e40af') : '#475569',
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}>
                            {status}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top-0 pt-0 px-3 pb-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-3"
                    onClick={() => setShowStatusPopup(false)}
                    disabled={statusChangeLoading}
                    style={{
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontWeight: '600',
                      fontSize: '13px',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <FaTimes className="me-1" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm px-3 ms-2"
                    onClick={() => {
                      const selectedStatus = document.querySelector('input[name="newStatus"]:checked')?.value;
                      if (selectedStatus && selectedStatus !== selectedItemForStatus.Status) {
                        handleRFIDTransactionUpdate(selectedStatus);
                      }
                    }}
                    disabled={statusChangeLoading}
                    style={{
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '13px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <FaSave className="me-1" />
                    {statusChangeLoading ? 'Updating...' : 'Update RFID Transaction'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabelStockList; 