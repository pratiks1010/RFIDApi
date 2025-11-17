import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  FaThLarge
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

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

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
  // State variables
  const [labeledStock, setLabeledStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const [allFilteredData, setAllFilteredData] = useState([]);
  const [loadingAllData, setLoadingAllData] = useState(false);

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
    counters: [],
    branches: []
  });

  // Get userInfo from localStorage
  const [userInfo, setUserInfo] = useState(null);
  const { addNotification } = useNotifications();



  // Add state for status change popup
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [selectedItemForStatus, setSelectedItemForStatus] = useState(null);
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);
  const [availableStatuses] = useState(['ApiActive', 'Sold']);
  const isFetchingRef = useRef(false);

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
          
          // Fetch filter data and stock data in parallel for faster loading
          // Stock data can load independently while filters load
          const [filterDataResult] = await Promise.allSettled([
            fetchFilterData(),
            fetchLabeledStock(1, itemsPerPage, '', defaultFilters)
          ]);
          
          // If filter data failed, still allow stock to display
          if (filterDataResult.status === 'rejected') {
            console.warn('Filter data fetch failed, but continuing with stock data');
          }
        } catch (error) {
          console.error('Error in initial data fetch:', error);
          setError('Failed to load data. Please refresh the page.');
        } finally {
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

      // Build payload for all data (no pagination)
      const payload = {
        ClientCode: clientCode,
        CategoryId: getFilterValueForAPI('categoryId', filterValues.categoryId),
        ProductId: getFilterValueForAPI('productId', filterValues.productId),
        DesignId: getFilterValueForAPI('designId', filterValues.designId),
        PageNumber: 1,
        PageSize: 999999, // Large number to get all data
        BranchId: filterValues.branch !== 'All' ? (() => {
          // Find the branch ID from the selected branch name
          const selectedBranch = apiFilterData.branches.find(branch => 
            branch.BranchName === filterValues.branch || 
            branch.Name === filterValues.branch || 
            branch.branchName === filterValues.branch ||
            branch.name === filterValues.branch
          );
          return selectedBranch ? (selectedBranch.Id || selectedBranch.id || 0) : 0;
        })() : 0,
        Status: filterValues.status !== 'All' ? filterValues.status : "ApiActive",
        SearchQuery: searchQuery && searchQuery.trim() !== '' ? searchQuery.trim() : "",
        ListType: "ascending"
      };

      // Add date filters if provided (format: YYYY-MM-DD)
      if (filterValues.dateFrom && filterValues.dateFrom.trim() !== '') {
        payload.FromDate = filterValues.dateFrom.trim();
      }
      if (filterValues.dateTo && filterValues.dateTo.trim() !== '') {
        payload.ToDate = filterValues.dateTo.trim();
      }

      // Add additional filter parameters if not 'All'
      if (filterValues.counterName !== 'All' && filterValues.counterName) {
        const selectedCounter = apiFilterData.counters?.find(counter => 
          counter.CounterName === filterValues.counterName || 
          counter.Name === filterValues.counterName || 
          counter.counterName === filterValues.counterName ||
          (counter.CounterName && counter.CounterName.toLowerCase() === filterValues.counterName.toLowerCase()) ||
          (counter.Name && counter.Name.toLowerCase() === filterValues.counterName.toLowerCase())
        );
        if (selectedCounter) {
          payload.CounterId = selectedCounter.Id || selectedCounter.id;
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

      const [
        productsResponse,
        designsResponse,
        categoriesResponse,
        countersResponse,
        branchesResponse
      ] = await Promise.all([
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllProductMaster', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllDesign', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllCategory', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllCounters', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllBranchMaster', requestBody, { headers })
      ]);

      console.log('Counters API Response:', countersResponse.data);
      console.log('Branches API Response:', branchesResponse.data);
      console.log('Counters data structure:', {
        isArray: Array.isArray(countersResponse.data),
        length: countersResponse.data?.length,
        sampleItem: countersResponse.data?.[0],
        allKeys: countersResponse.data?.[0] ? Object.keys(countersResponse.data[0]) : []
      });

      // Handle different response structures - some APIs might return objects or arrays
      const normalizeArray = (data) => {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
          // If it's an object, try to extract array from common properties
          return data.data || data.items || data.results || data.list || [];
        }
        return [];
      };

      const normalizedData = {
        products: normalizeArray(productsResponse.data),
        designs: normalizeArray(designsResponse.data),
        categories: normalizeArray(categoriesResponse.data),
        counters: normalizeArray(countersResponse.data),
        branches: normalizeArray(branchesResponse.data)
      };

      setApiFilterData(normalizedData);

      console.log('Filter data loaded:', {
        products: normalizedData.products.length,
        designs: normalizedData.designs.length,
        categories: normalizedData.categories.length,
        counters: normalizedData.counters.length,
        branches: normalizedData.branches.length
      });

    } catch (error) {
      console.error('Error fetching filter data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      // Set empty arrays for failed API calls to prevent errors
      // Don't overwrite existing data if we have it
      setApiFilterData(prev => ({
        products: prev.products.length > 0 ? prev.products : [],
        designs: prev.designs.length > 0 ? prev.designs : [],
        categories: prev.categories.length > 0 ? prev.categories : [],
        counters: prev.counters.length > 0 ? prev.counters : [],
        branches: prev.branches.length > 0 ? prev.branches : []
      }));
    }
  };

  const fetchLabeledStock = async (page = currentPage, pageSize = itemsPerPage, search = searchQuery, filters = filterValues) => {
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

      // Build the payload following the reference pattern
      const payload = {
        ClientCode: clientCode,
        CategoryId: getFilterValueForAPI('categoryId', safeFilters.categoryId),
        ProductId: getFilterValueForAPI('productId', safeFilters.productId),
        DesignId: getFilterValueForAPI('designId', safeFilters.designId),
        PageNumber: page,
        PageSize: pageSize,
        BranchId: safeFilters.branch !== 'All' && safeFilters.branch ? (() => {
          // Find the branch ID from the selected branch name
          if (!apiFilterData.branches || apiFilterData.branches.length === 0) {
            console.warn('No branches data available for filter mapping');
            return 0;
          }
          
          const selectedBranch = apiFilterData.branches.find(branch => {
            const branchName = branch.BranchName || branch.Name || branch.branchName || branch.name || '';
            return branchName === safeFilters.branch || 
                   branchName.toLowerCase() === safeFilters.branch.toLowerCase();
          });
          
          const branchId = selectedBranch ? (selectedBranch.Id || selectedBranch.id || 0) : 0;
          console.log('Branch filter mapping:', {
            selectedBranchName: safeFilters.branch,
            selectedBranch: selectedBranch,
            branchId: branchId,
            availableBranches: apiFilterData.branches.length,
            firstBranchSample: apiFilterData.branches[0]
          });
          if (!selectedBranch && safeFilters.branch !== 'All') {
            console.warn('Branch not found in API data:', safeFilters.branch, 'Available branches:', apiFilterData.branches.map(b => b.BranchName || b.Name || b.branchName || b.name));
          }
          return branchId;
        })() : 0,
        Status: safeFilters.status !== 'All' ? safeFilters.status : "ApiActive",
        SearchQuery: search && search.trim() !== '' ? search.trim() : "",
        ListType: "ascending"
      };

      // Add date filters if provided (format: YYYY-MM-DD)
      if (safeFilters.dateFrom && safeFilters.dateFrom.trim() !== '') {
        payload.FromDate = safeFilters.dateFrom.trim();
      }
      if (safeFilters.dateTo && safeFilters.dateTo.trim() !== '') {
        payload.ToDate = safeFilters.dateTo.trim();
      }

      // Add additional filter parameters if not 'All'
      if (safeFilters.counterName !== 'All' && safeFilters.counterName) {
        // Find the counter ID from the selected counter name
        const selectedCounter = apiFilterData.counters?.find(counter => 
          counter.CounterName === safeFilters.counterName || 
          counter.Name === safeFilters.counterName || 
          counter.counterName === safeFilters.counterName ||
          (counter.CounterName && counter.CounterName.toLowerCase() === safeFilters.counterName.toLowerCase()) ||
          (counter.Name && counter.Name.toLowerCase() === safeFilters.counterName.toLowerCase())
        );
        if (selectedCounter) {
          payload.CounterId = selectedCounter.Id || selectedCounter.id;
          console.log('Counter filter mapping:', {
            selectedCounterName: safeFilters.counterName,
            selectedCounter: selectedCounter,
            counterId: payload.CounterId
          });
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
      console.log('Filter Values:', {
        categoryId: safeFilters.categoryId,
        productId: safeFilters.productId,
        designId: safeFilters.designId,
        counterName: safeFilters.counterName,
        branch: safeFilters.branch,
        boxName: safeFilters.boxName,
        vendor: safeFilters.vendor,
        status: safeFilters.status,
        dateFrom: safeFilters.dateFrom || 'Not set',
        dateTo: safeFilters.dateTo || 'Not set',
        resolvedCategoryId: getFilterValueForAPI('categoryId', safeFilters.categoryId),
        resolvedProductId: getFilterValueForAPI('productId', safeFilters.productId),
        resolvedDesignId: getFilterValueForAPI('designId', safeFilters.designId),
        counterId: payload.CounterId || 'Not selected',
        branchId: payload.BranchId || 'Not selected',
        fromDate: payload.FromDate || 'Not set',
        toDate: payload.ToDate || 'Not set'
      });

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
        const stockWithSerialNumbers = response.data.map((item, index) => ({
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
        
        // Debug: Log first item to verify field mapping
        if (stockWithSerialNumbers.length > 0) {
          console.log('Sample mapped item:', {
            ItemCode: stockWithSerialNumbers[0].ItemCode,
            StoneWt: stockWithSerialNumbers[0].StoneWt,
            StonePcs: stockWithSerialNumbers[0].StonePcs,
            StoneAmt: stockWithSerialNumbers[0].StoneAmt,
            DiamondWt: stockWithSerialNumbers[0].DiamondWt,
            DiamondPcs: stockWithSerialNumbers[0].DiamondPcs,
            DiamondAmount: stockWithSerialNumbers[0].DiamondAmount,
            MakingFixedAmt: stockWithSerialNumbers[0].MakingFixedAmt,
            HallmarkAmount: stockWithSerialNumbers[0].HallmarkAmount,
            MakingPerGram: stockWithSerialNumbers[0].MakingPerGram,
            MakingPercentage: stockWithSerialNumbers[0].MakingPercentage,
            FixedWastage: stockWithSerialNumbers[0].FixedWastage,
            FixedAmt: stockWithSerialNumbers[0].FixedAmt,
            // Original API fields for comparison
            TotalStoneWeight: stockWithSerialNumbers[0].TotalStoneWeight,
            TotalStonePieces: stockWithSerialNumbers[0].TotalStonePieces,
            TotalStoneAmount: stockWithSerialNumbers[0].TotalStoneAmount,
            TotalDiamondWeight: stockWithSerialNumbers[0].TotalDiamondWeight,
            TotalDiamondPieces: stockWithSerialNumbers[0].TotalDiamondPieces,
            TotalDiamondAmount: stockWithSerialNumbers[0].TotalDiamondAmount
          });
        }
        
        // Check for TotalCount in the response (this is the total number of records)
        if (response.data.length > 0 && response.data[0].TotalCount) {
          const totalCount = response.data[0].TotalCount;
          setTotalRecords(totalCount);
          setTotalPages(Math.ceil(totalCount / pageSize));
          console.log(`Page ${page}: Received ${response.data.length} items, TotalCount: ${totalCount}, TotalPages: ${Math.ceil(totalCount / pageSize)}`);
        } else if (response.data.length > 0 && response.data[0].TotalRecords) {
          // Fallback to TotalRecords if TotalCount is not available
          setTotalRecords(response.data[0].TotalRecords);
          setTotalPages(Math.ceil(response.data[0].TotalRecords / pageSize));
          console.log(`Page ${page}: Received ${response.data.length} items, TotalRecords: ${response.data[0].TotalRecords}, TotalPages: ${Math.ceil(response.data[0].TotalRecords / pageSize)}`);
        } else {
          // Fallback: if no pagination info, assume we have all records
          setTotalRecords(response.data.length);
          setTotalPages(1);
          console.log(`Page ${page}: Received ${response.data.length} items, No pagination info found`);
        }
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch labeled stock data');
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
  }, [labeledStock, searchQuery]);

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
    fetchLabeledStock(1, newItemsPerPage, searchQuery, filterValues); // Fetch new page with updated page size
  };

  const showSuccessNotification = (title, message) => {
    setSuccessMessage({ title, message });
    setShowSuccess(true);
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
        'Category': item.Category || '',
        'Gross Wt': item.GrossWt ? Number(item.GrossWt).toFixed(3) : '',
        'Net Wt': item.NetWt ? Number(item.NetWt).toFixed(3) : '',
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
        { wch: 12 }, // Gross Wt
        { wch: 12 }, // Net Wt
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
        'Category': item.Category || '',
        'Gross Wt': item.GrossWt ? Number(item.GrossWt).toFixed(3) : '',
        'Net Wt': item.NetWt ? Number(item.NetWt).toFixed(3) : '',
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
        { wch: 12 }, // Gross Wt
        { wch: 12 }, // Net Wt
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
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchLabeledStock(1, itemsPerPage, searchQuery, filterValues);
      }
    }, 2000); // 2 second debounce like reference

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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
        fetchLabeledStock(1, itemsPerPage, searchQuery, filterValues);
      });
    } else {
      // Always fetch data when filters change
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
  }, [filterValues.categoryId, filterValues.productId, filterValues.designId, 
      filterValues.branch, filterValues.counterName, filterValues.boxName, filterValues.vendor, filterValues.status]);

  const handleResetFilters = () => {
    const resetFilters = {
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
    setFilterValues(resetFilters);
    // Reset to first page when resetting filters
    setCurrentPage(1);
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
        fetchLabeledStock(1, itemsPerPage, searchQuery, filterValues);
        if (showAllData) {
          fetchAllFilteredData();
        }
      });
    } else {
      setShowFilterPanel(false);
      // Reset to first page when applying filters
      setCurrentPage(1);
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
    try {
      setIsRefreshing(true);
      await fetchLabeledStock(currentPage, itemsPerPage, searchQuery, filterValues);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(err.message || 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePrintLabel = () => {
    try {
      const selectedItems = currentItems.filter(item => selectedRows.includes(item.Id));
      
      if (selectedItems.length === 0) {
        showSuccessNotification('No Selection', 'Please select at least one item to print labels.');
        return;
      }

      // Create a new PDF document with small page size for labels (horizontal)
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [14, 27] // 14mm height x 27mm width (landscape)
      });

      selectedItems.forEach((item, index) => {
        if (index > 0) {
          doc.addPage(); // Add new page for each label
        }

        // Use complete label space with BIG fonts for perfect readability
        // Product Name - Top left, BIG font (like "GOLD 22 CT")
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        const productName = (item.ProductName || 'N/A').substring(0, 18);
        doc.text(productName, 1, 5);

        // Item Code - BIG font without "Code:" text
        doc.setFontSize(5);
        doc.setFont("helvetica", "bold");
        doc.text(item.ItemCode || 'N/A', 1, 9);

        // Weights - Right side, BIG font
        doc.text(`G: ${item.GrossWt || '0'}g`, 16, 5);
        doc.text(`N: ${item.NetWt || '0'}g`, 16, 9);

        // No border around the label
      });

      // Open PDF in new tab instead of downloading
      const pdfDataUri = doc.output('datauristring');
      const newTab = window.open();
      newTab.document.write(`
        <html>
          <head>
            <title>Labels - ${selectedItems.length} items</title>
            <style>
              body { margin: 0; padding: 20px; background: #f5f5f5; }
              iframe { width: 100%; height: calc(100vh - 40px); border: none; }
            </style>
          </head>
          <body>
            <iframe src="${pdfDataUri}"></iframe>
          </body>
        </html>
      `);
      newTab.document.close();
      
      showSuccessNotification(
        'Labels Opened', 
        `Successfully opened ${selectedItems.length} label(s) in new tab for printing.`
      );

    } catch (error) {
      console.error('Error generating labels:', error);
      showSuccessNotification('Error', 'Failed to generate labels. Please try again.');
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
      
      // Get all current stock data (either filtered or all data)
      const dataToDelete = showAllData && allFilteredData.length > 0 ? allFilteredData : labeledStock;
      
      if (dataToDelete.length === 0) {
        showSuccessNotification('No Data', 'No stock data available to delete.');
        return;
      }

      // Use the new endpoint for deleting all stock for a client
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
        
        // Refresh the data
        await fetchLabeledStock();
        if (showAllData) {
          setShowAllData(false);
          setAllFilteredData([]);
        }

        // After successful delete:
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
  }, [labeledStock, apiFilterData.counters, apiFilterData.products, apiFilterData.categories, apiFilterData.designs, apiFilterData.branches]);

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
    { key: 'srNo', label: 'Sr No', width: '60px' },
    { key: 'CounterName', label: 'Counter Name', width: '150px' },
    { key: 'ItemCode', label: 'Item Code', width: '120px' },
    { key: 'RFIDCode', label: 'RFID Code', width: '120px' },
    { key: 'ProductName', label: 'Product Name', width: '150px' },
    { key: 'CategoryName', label: 'Category', width: '120px' },
    { key: 'DesignName', label: 'Design', width: '120px' },
    { key: 'PurityName', label: 'Purity', width: '100px' },
    { key: 'GrossWt', label: 'Gross Wt', width: '100px' },
    { key: 'StoneWt', label: 'Stone Wt', width: '100px' },
    { key: 'DiamondWt', label: 'Diamond Wt', width: '100px' },
    { key: 'NetWt', label: 'Net Wt', width: '100px' },
    { key: 'StoneAmt', label: 'Stone Amt', width: '120px' },
    { key: 'FixedAmt', label: 'Fixed Amt', width: '120px' },
    { key: 'Vendor', label: 'Vendor', width: '120px' },
    { key: 'Branch', label: 'Branch', width: '120px' },
    { key: 'CreatedDate', label: 'Created Date', width: '150px' },
    { key: 'PackingWeight', label: 'Packing Weight', width: '120px' },
    { key: 'TotalWeight', label: 'Total Weight', width: '120px' },
    { key: 'Status', label: 'Status', width: '110px' }
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

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
      }}>
        <div className="loading-card" style={{
          background: '#ffffff',
          borderRadius: '18px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          padding: '48px 64px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: '320px',
          maxWidth: '90vw',
          border: '1px solid #e5e7eb'
        }}>
          <div className="loading-spinner" style={{
            width: '64px',
            height: '64px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #0077d4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '24px'
          }} />
          <div className="loading-title" style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            Loading Label Stock Data
          </div>
          <div className="loading-text" style={{
            fontSize: '14px',
            color: '#6b7280',
            textAlign: 'center',
            fontWeight: 400
          }}>
            Please wait while we fetch your data...
          </div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @media (max-width: 768px) {
            .loading-card {
              padding: 36px 32px !important;
              minWidth: 280px !important;
            }
            .loading-spinner {
              width: 48px !important;
              height: 48px !important;
              border-width: 3px !important;
            }
            .loading-title {
              font-size: 18px !important;
            }
            .loading-text {
              font-size: 13px !important;
            }
          }
          @media (max-width: 480px) {
            .loading-card {
              padding: 32px 24px !important;
              minWidth: 260px !important;
            }
            .loading-spinner {
              width: 40px !important;
              height: 40px !important;
            }
            .loading-title {
              font-size: 16px !important;
            }
            .loading-text {
              font-size: 12px !important;
            }
          }
        `}</style>
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
                <path d="M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm14 0v14H7V5h10zm-7 2v2h4V7h-4zm0 4v2h4v-2h-4zm0 4v2h4v-2h-4z"/>
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
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm12 6V9c0-.55-.45-1-1-1h-2v5h2c.55 0 1-.45 1-1zm-2-3h1v3h-1V9z"/>
              </svg>
            </div>
            <div className="option-content">
              <span className="option-title">Export as PDF</span>
              <span className="option-description">Download as formatted PDF document</span>
            </div>
          </button>
          {exportErrors.pdf && <div className="error-message">{exportErrors.pdf}</div>}

          <div className="export-option email-section">
            <div className="option-header">
              <div className="option-icon email">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
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

  return (
    <div className="container-fluid p-3" style={{ position: 'relative' }}>
      {(loading || isRefreshing) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
          <div className="loading-card" style={{
            background: '#ffffff',
            borderRadius: '18px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            padding: '48px 64px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '320px',
            maxWidth: '90vw',
            border: '1px solid #e5e7eb'
          }}>
            <div className="loading-spinner" style={{
              width: '64px',
              height: '64px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #0077d4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '24px'
            }} />
            <div className="loading-title" style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#1f2937',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              {isRefreshing ? 'Refreshing Data' : 'Loading Label Stock Data'}
            </div>
            <div className="loading-text" style={{
              fontSize: '14px',
              color: '#6b7280',
              textAlign: 'center',
              fontWeight: 400
            }}>
              Please wait while we fetch your data...
            </div>
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @media (max-width: 768px) {
              .loading-card {
                padding: 36px 32px !important;
                minWidth: 280px !important;
              }
              .loading-spinner {
                width: 48px !important;
                height: 48px !important;
                border-width: 3px !important;
              }
              .loading-title {
                font-size: 18px !important;
              }
              .loading-text {
                font-size: 13px !important;
              }
            }
            @media (max-width: 480px) {
              .loading-card {
                padding: 32px 24px !important;
                minWidth: 260px !important;
              }
              .loading-spinner {
                width: 40px !important;
                height: 40px !important;
              }
              .loading-title {
                font-size: 16px !important;
              }
              .loading-text {
                font-size: 12px !important;
              }
            }
          `}</style>
        </div>
      )}
      <SuccessNotification
        title={successMessage.title}
        message={successMessage.message}
        isVisible={showSuccess}
        onClose={() => setShowSuccess(false)}
      />

      <div>
      {/* Header Section - Title on left, Search on right */}
        <div className="card shadow-sm border-0 mb-3">
          <div className="card-body p-3">
            <div className="row align-items-start align-items-md-center">
              <div className="col-12 col-md-6 mb-3 mb-md-0">
                <div className="d-flex align-items-center">
                  <div className="bg-primary rounded-3 p-2 me-3">
                    <FaFileExport className="text-white" style={{ fontSize: '20px' }} />
                  </div>
                  <div>
                    <h5 className="mb-1 fw-bold text-dark">Label Stock List</h5>
                    <p className="mb-0 text-muted small">View and manage your labelled stock records</p>
                    <span className="badge bg-primary mt-1">
                      {showAllData && allFilteredData.length > 0 
                        ? `${allFilteredData.length} total records` 
                        : `${filteredStock.length} records (page ${currentPage})`
                      }
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="d-flex justify-content-end">
                  <div className="position-relative search-input-container" style={{ width: '100%', maxWidth: '400px' }}>
                    <FaSearch className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: '14px', zIndex: 1 }} />
                    <input
                      type="text"
                      className="form-control form-control-sm ps-4"
                      placeholder="Search by Product Name, Category, SKU..."
                      value={searchQuery}
                      onChange={e => handleSearchChange(e.target.value)}
                      style={{ width: '100%', minWidth: '0', maxWidth: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Section - All buttons on left */}
        <div className="card shadow-sm border-0 mb-3">
          <div className="card-body p-3">
            <div className="d-flex flex-wrap gap-2 align-items-center action-buttons-container">
              <button 
                onClick={toggleDataView}
                className={`btn btn-sm ${showAllData ? 'btn-success' : 'btn-outline-success'}`}
                disabled={loadingAllData}
              >
                {loadingAllData ? (
                  <>
                    <FaSpinner className="me-1 spin" />
                    Loading...
                  </>
                ) : showAllData ? (
                  <>
                    <FaThList className="me-1" />
                    Show Paginated ({filteredStock.length})
                  </>
                ) : (
                  <>
                    <FaThLarge className="me-1" />
                    Show All Data
                  </>
                )}
              </button>
              <button 
                onClick={handleDelete} 
                disabled={selectedRows.length === 0}
                className="btn btn-outline-danger btn-sm"
              >
                <FaTrash className="me-1" /> Delete
              </button>
              <button 
                onClick={handlePrintLabel} 
                disabled={selectedRows.length === 0}
                className="btn btn-outline-info btn-sm"
              >
                <FaFilePdf className="me-1" /> Print Label
              </button>
              <button 
                onClick={() => setShowExportModal(true)}
                className="btn btn-outline-primary btn-sm"
              >
                <FaFileExport className="me-1" /> Export
              </button>
              <button 
                onClick={generateAndShowReport}
                className="btn btn-outline-warning btn-sm"
              >
                <FaFilePdf className="me-1" /> Report
              </button>
              <button 
                onClick={() => setShowFilterPanel(true)}
                className="btn btn-outline-success btn-sm"
              >
                <FaFilter className="me-1" /> Filter
              </button>
              <button 
                onClick={handleDeleteAllStock} 
                className="btn btn-outline-danger btn-sm delete-all-stock-btn"
                style={{ 
                  borderColor: '#dc3545', 
                  color: '#dc3545',
                  minWidth: 'fit-content',
                  whiteSpace: 'nowrap'
                }}
              >
                <FaTrash className="me-1" /> 
                <span className="d-none d-sm-inline">Delete All Stock</span>
                <span className="d-inline d-sm-none">Delete All</span>
              </button>
            </div>
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
                  background: '#10b981',
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
                  background: '#f3f4f6',
                  color: '#4b5563',
                  border: 'none',
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

      {/* Filter Panel */}
      {showFilterPanel && (
          <div className="card shadow-sm border-0 mb-3">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold">Filter Options</h6>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowFilterPanel(false)}
              ></button>
              </div>
            <div className="card-body">
                <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Branch</label>
                    <select 
                      className="form-select form-select-sm"
                    value={filterValues.branch} 
                    onChange={e => handleFilterChange('branch', e.target.value)}
                    >
                    <option value="All">All</option>
                    {apiFilterData.branches?.map(branch => (
                      <option key={branch.Id || branch.id} value={branch.BranchName || branch.Name || branch.branchName || branch.name}>
                        {branch.BranchName || branch.Name || branch.branchName || branch.name}
                      </option>
                    ))}
                    </select>
                  </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Counter Name</label>
                    <select 
                      className="form-select form-select-sm"
                    value={filterValues.counterName} 
                    onChange={e => handleFilterChange('counterName', e.target.value)}
                    >
                    <option value="All">All Counters</option>
                    {apiFilterData.counters?.map(counter => (
                      <option key={counter.Id || counter.id} value={counter.CounterName || counter.Name || counter.counterName}>
                        {counter.CounterName || counter.Name || counter.counterName}
                      </option>
                    ))}
                    </select>
                    {apiFilterData.counters && apiFilterData.counters.length > 0 && (
                      <small className="text-muted">Loaded {apiFilterData.counters.length} counters</small>
                    )}
                  </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Box Name</label>
                    <select 
                      className="form-select form-select-sm"
                    value={filterValues.boxName} 
                    onChange={e => handleFilterChange('boxName', e.target.value)}
                    >
                    {filterOptions.boxNames.map((option, index) => (
                      <option key={`box-${option}-${index}`} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Category</label>
                    <select 
                      className="form-select form-select-sm"
                    value={filterValues.categoryId} 
                    onChange={e => handleFilterChange('categoryId', e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    {apiFilterData.categories.map(category => (
                      <option key={category.Id} value={category.CategoryName}>{category.CategoryName}</option>
                      ))}
                    </select>
                  </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Product Name</label>
                    <select 
                      className="form-select form-select-sm"
                    value={filterValues.productId} 
                    onChange={e => handleFilterChange('productId', e.target.value)}
                    >
                    <option value="All">All Products</option>
                    {apiFilterData.products.map(product => (
                      <option key={product.Id} value={product.ProductName}>{product.ProductName}</option>
                      ))}
                    </select>
                  </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Design</label>
                    <select 
                      className="form-select form-select-sm"
                    value={filterValues.designId} 
                    onChange={e => handleFilterChange('designId', e.target.value)}
                    >
                    <option value="All">All Designs</option>
                    {apiFilterData.designs.map(design => (
                      <option key={design.Id} value={design.DesignName}>{design.DesignName}</option>
                      ))}
                    </select>
                  </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Status</label>
                    <select 
                      className="form-select form-select-sm"
                      value={filterValues.status}
                    onChange={e => handleFilterChange('status', e.target.value)}
                    >
                      {filterOptions.statuses.map((option, index) => (
                        <option key={`status-${option}-${index}`} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">From Date</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={filterValues.dateFrom}
                    onChange={e => handleFilterChange('dateFrom', e.target.value)}
                    max={filterValues.dateTo || undefined}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">To Date</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={filterValues.dateTo}
                    onChange={e => handleFilterChange('dateTo', e.target.value)}
                    min={filterValues.dateFrom || undefined}
                  />
                </div>
                </div>
              <div className="d-flex justify-content-end gap-2 mt-3">
                <button className="btn btn-outline-secondary btn-sm" onClick={handleResetFilters}>
                  Reset
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleApplyFilters}>
                  Apply
                </button>
            </div>
          </div>
        </div>
      )}

                 {/* Table Container */}
         <div className="card shadow-sm border-0" style={{ marginTop: '24px' }}>
           <div className="card-body p-0" style={{ overflow: 'hidden' }}>
            <div className="table-responsive label-stock-table-wrapper" style={{ 
              overflowX: 'auto', 
              overflowY: 'visible',
              width: '100%',
              position: 'relative'
            }}>
              <table className="table table-hover table-sm mb-0" style={{ 
                minWidth: '1400px', 
                width: '100%',
                marginBottom: 0,
                tableLayout: 'auto'
              }}>
                <thead className="table-light">
                  <tr>
                    <th className="text-center" style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(currentItems.map(item => item.Id));
                          } else {
                            setSelectedRows([]);
                          }
                        }}
                        checked={currentItems.length > 0 && selectedRows.length === currentItems.length}
                      />
                    </th>
                    {columns.filter(col => col.key !== 'Status').map((column, colIdx) => (
                      <th
                        key={column.key}
                        className="text-nowrap"
                        style={{ width: column.width }}
                        onClick={() => {
                          if (column.key !== 'checkbox') {
                            const direction = sortConfig.key === column.key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                            setSortConfig({ key: column.key, direction });
                          }
                        }}
                      >
                        <div className="d-flex align-items-center">
                          {column.label}
                          {sortConfig.key === column.key && (
                            <span className="ms-1">
                              {sortConfig.direction === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                            </span>
                          )}
              </div>
                      </th>
                    ))}
                    <th className="text-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllData && allFilteredData.length > 0 ? allFilteredData : currentItems).map((item, index) => (
                    <tr
                      key={item.Id}
                      className={
                        selectedRows.includes(item.Id)
                          ? 'table-primary'
                          : (item.Status === 'Sold' ? 'table-danger' : '')
                      }
                      onClick={() => handleRowSelection(item.Id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedRows.includes(item.Id)}
                          onChange={() => handleRowSelection(item.Id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      {columns.filter(col => col.key !== 'Status').map(column => (
                        <td key={column.key} className="text-nowrap">
                          {column.key === 'srNo' ? ((currentPage - 1) * itemsPerPage) + index + 1 : (() => {
                            const value = item[column.key];
                            if (value === undefined || value === null || value === '') return '';
                            // Format numeric fields (weights)
                            if (['GrossWt', 'NetWt', 'StoneWt', 'DiamondWt', 'PackingWeight', 'TotalWeight'].includes(column.key)) {
                              const numValue = parseFloat(value);
                              return isNaN(numValue) ? value : numValue.toFixed(3);
                            }
                            // Format amount fields
                            if (['StoneAmt', 'FixedAmt'].includes(column.key)) {
                              const numValue = parseFloat(value);
                              return isNaN(numValue) ? value : numValue.toString();
                            }
                            // Format date fields
                            if (column.key === 'CreatedDate' && value) {
                              try {
                                const date = new Date(value);
                                if (!isNaN(date.getTime())) {
                                  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                }
                              } catch (e) {
                                // If date parsing fails, return original value
                              }
                            }
                            return value;
                          })()}
                        </td>
                      ))}
                      <td>
                  <button 
                          className={`btn btn-sm ${
                            item.Status === 'ApiActive' ? 'btn-outline-primary' : 
                            item.Status === 'Sold' ? 'btn-outline-danger' : 
                            'btn-outline-secondary'
                          }`}
                          onClick={(e) => openRFIDTransactionPopup(item, e)}
                        >
                          {item.Status || 'N/A'}
                  </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="d-flex justify-content-between align-items-center p-3 border-top">
              <div className="d-flex align-items-center gap-3">
                {showAllData && allFilteredData.length > 0 ? (
                  <span className="text-muted small">
                    Showing all {allFilteredData.length} filtered records
                  </span>
                ) : (
                  <>
                    <span className="text-muted small">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} entries
                    </span>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted small">Show:</span>
                      <select 
                        className="form-select form-select-sm"
                        style={{ width: 'auto' }}
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                      >
                        {PAGE_SIZE_OPTIONS.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                      <span className="text-muted small">per page</span>
                    </div>
                  </>
                )}
              </div>
              
              {!showAllData && (
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                        className="page-link"
                        onClick={() => {
                          const newPage = Math.max(currentPage - 1, 1);
                          setCurrentPage(newPage);
                          fetchLabeledStock(newPage, itemsPerPage, searchQuery, filterValues);
                        }}
                        disabled={currentPage === 1}
                      >
                        Previous
                    </button>
                    </li>
                    {generatePagination().map((page, index) =>
                      page === "..." ? (
                        <li key={`ellipsis-${index}`} className="page-item disabled">
                          <span className="page-link">...</span>
                        </li>
                      ) : (
                        <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                        <button 
                            className="page-link"
                            onClick={() => {
                              setCurrentPage(page);
                              fetchLabeledStock(page, itemsPerPage, searchQuery, filterValues);
                            }}
                          >
                            {page}
                        </button>
                        </li>
                      )
                    )}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => {
                          const newPage = Math.min(currentPage + 1, totalPages);
                          setCurrentPage(newPage);
                          fetchLabeledStock(newPage, itemsPerPage, searchQuery, filterValues);
                        }}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
                    </div>
                  </div>
                </div>

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
            overflow-y: visible;
            -webkit-overflow-scrolling: touch;
            width: 100%;
            position: relative;
            scrollbar-width: thin;
            scrollbar-color: #888 #f1f1f1;
          }
          .label-stock-table-wrapper::-webkit-scrollbar {
            height: 10px;
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
                    <i className="fas fa-gem me-2" style={{ color: '#8b5cf6' }}></i>
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
                      <i className="fas fa-info-circle me-1" style={{ color: '#3b82f6' }}></i>
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
                      <i className="fas fa-edit me-1" style={{ color: '#3b82f6' }}></i>
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
                   <i className="fas fa-times me-1"></i>
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
                   <i className="fas fa-save me-1"></i>
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