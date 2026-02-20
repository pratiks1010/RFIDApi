import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  FaUserPlus,
  FaCalendarAlt,
  FaSearch,
  FaSpinner,
  FaTrash,
  FaEdit,
  FaCheckCircle,
  FaList,
  FaTimes,
  FaFileInvoice,
  FaFileExcel,
  FaFilePdf,
  FaChevronDown
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useLoading } from '../../App';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const SampleOut = () => {
  const { loading, setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Sample Out Header State
  const [sampleOutNumber, setSampleOutNumber] = useState('');
  const [sampleOutDate, setSampleOutDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerMobile, setCustomerMobile] = useState('');
  const [fineGold, setFineGold] = useState('0.000');
  const [balanceAmount, setBalanceAmount] = useState('0.000');
  const [finePercent, setFinePercent] = useState('0.00');
  const [advanceAmount, setAdvanceAmount] = useState('0.00');
  const [returnDate, setReturnDate] = useState('');
  const [description, setDescription] = useState('');
  
  // Item Code Search State
  const [itemCodeSearch, setItemCodeSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);
  
  // Sample Out Items State
  const [sampleOutItems, setSampleOutItems] = useState([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  
  const customerDropdownRef = useRef(null);
  const itemCodeSearchRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Helper function to normalize array responses
  const normalizeArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.result && Array.isArray(data.result)) return data.result;
    return [];
  };

  // Fetch user info on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserInfo(parsed);
      }
    } catch (err) {
      console.error('Error parsing userInfo:', err);
    }
  }, []);

  // Fetch customers
  useEffect(() => {
    if (userInfo?.ClientCode) {
      fetchCustomers();
    }
  }, [userInfo]);

  const fetchCustomers = async () => {
    if (!userInfo?.ClientCode) return;
    
    setLoadingCustomers(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllCustomer',
        { ClientCode: userInfo.ClientCode },
        { headers }
      );
      
      const customers = normalizeArray(response.data);
      setCustomerList(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load customers. Please refresh the page.'
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Filter customers based on search input
  useEffect(() => {
    if (customerSearch.trim() === '') {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }

    const searchTerm = customerSearch.toLowerCase();
    const filtered = customerList.filter(customer => {
      const firstName = (customer.FirstName || '').toLowerCase();
      const lastName = (customer.LastName || '').toLowerCase();
      const name = (customer.Name || '').toLowerCase();
      const customerName = (customer.CustomerName || '').toLowerCase();
      const mobile = (customer.Mobile || customer.MobileNumber || '').toLowerCase();
      
      return firstName.includes(searchTerm) || 
             lastName.includes(searchTerm) || 
             name.includes(searchTerm) || 
             customerName.includes(searchTerm) ||
             mobile.includes(searchTerm);
    });

    setFilteredCustomers(filtered);
    setShowCustomerDropdown(filtered.length > 0);
  }, [customerSearch, customerList]);

  // Update customer details when customer is selected
  useEffect(() => {
    if (selectedCustomerId && customerList.length > 0) {
      const customer = customerList.find(c => c.Id == selectedCustomerId || c.Id === selectedCustomerId);
      if (customer) {
        const customerName = customer.FirstName 
          ? `${customer.FirstName}${customer.LastName ? ' ' + customer.LastName : ''}`
          : customer.Name || customer.CustomerName || 'Unknown';
        setCustomerName(customerName);
        setCustomerSearch(customerName);
        setCustomerMobile(customer.Mobile || customer.MobileNumber || '');
        setFineGold(customer.FineGold ? parseFloat(customer.FineGold).toFixed(3) : '0.000');
        setAdvanceAmount(customer.AdvanceAmount ? parseFloat(customer.AdvanceAmount).toFixed(2) : '0.00');
        setBalanceAmount(customer.BalanceAmount ? parseFloat(customer.BalanceAmount).toFixed(3) : '0.000');
        // Calculate Fine% if FineGold is available
        if (customer.FineGold) {
          const fine = parseFloat(customer.FineGold);
          setFinePercent(fine.toFixed(2));
        } else {
          setFinePercent('0.00');
        }
      } else {
        // Reset if customer not found
        setCustomerName('');
        setCustomerSearch('');
        setCustomerMobile('');
        setFineGold('0.000');
        setAdvanceAmount('0.00');
        setBalanceAmount('0.000');
        setFinePercent('0.00');
      }
    } else if (!selectedCustomerId) {
      // Reset when no customer selected
      setCustomerName('');
      setCustomerSearch('');
      setCustomerMobile('');
      setFineGold('0.000');
      setAdvanceAmount('0.00');
      setBalanceAmount('0.000');
      setFinePercent('0.00');
    }
  }, [selectedCustomerId, customerList]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle customer selection from dropdown
  const handleCustomerSelect = (customer) => {
    setSelectedCustomerId(customer.Id);
    setShowCustomerDropdown(false);
  };

  // Fetch sample out number
  const fetchSampleOutNumber = async () => {
    if (!userInfo?.ClientCode) return;
    
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/Transaction/GetCustLastSampleOutNo',
        { ClientCode: userInfo.ClientCode },
        { headers }
      );
      
      if (response.data) {
        // Get the value from response (could be in different formats)
        let lastNumberValue = response.data?.LastSampleOutNo || response.data?.SampleOutNo || response.data?.LastSampleInNo || response.data?.SampleInNo || response.data;
        
        // Convert to string if it's not already
        let lastNumberStr = String(lastNumberValue || '0');
        
        // Extract numeric part from string (handles cases like "C22" -> "22")
        // This regex extracts all digits from the string
        const numericMatch = lastNumberStr.match(/\d+/);
        let lastNumber = numericMatch ? numericMatch[0] : '0';
        
        // Parse and validate
        const parsedNumber = parseInt(lastNumber, 10);
        if (isNaN(parsedNumber) || parsedNumber < 0) {
          console.warn('Invalid sample out number from API, defaulting to 1. Response:', response.data, 'Extracted:', lastNumber);
          setSampleOutNumber('1');
        } else {
          const nextNumber = (parsedNumber + 1).toString();
          console.log('Sample Out Number - API Response:', response.data, 'Extracted Number:', lastNumber, 'Next Number:', nextNumber);
          setSampleOutNumber(nextNumber);
        }
      } else {
        console.warn('No data in API response, defaulting to 1');
        setSampleOutNumber('1');
      }
    } catch (error) {
      console.error('Error fetching sample out number:', error);
      setSampleOutNumber('1');
    }
  };

  useEffect(() => {
    if (userInfo?.ClientCode) {
      fetchSampleOutNumber();
    }
  }, [userInfo]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Debounced item code search
  useEffect(() => {
    if (!itemCodeSearch || itemCodeSearch.trim().length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      handleItemCodeSearch(itemCodeSearch);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [itemCodeSearch]);

  // Search for item by Item Code using GetAllLabeledStock API
  const handleItemCodeSearch = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    if (!userInfo?.ClientCode) {
      return;
    }

    setSearching(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };

      // Call GetAllLabeledStock API with ItemCode
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllLabeledStock',
        { 
          ClientCode: userInfo.ClientCode,
          ItemCode: searchTerm.trim()
        },
        { headers }
      );

      const results = normalizeArray(response.data);
      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } catch (error) {
      console.error('Error searching item code:', error);
      setSearchResults([]);
      setShowSearchResults(false);
      addNotification({
        type: 'error',
        title: 'Search Error',
        message: 'Failed to search for item. Please try again.'
      });
    } finally {
      setSearching(false);
    }
  };

  // Select item from search results and add to sample out
  const selectItemFromSearch = (item) => {
    // Check for duplicate Item Code
    const isDuplicate = sampleOutItems.some(sampleItem => 
      (sampleItem.Itemcode || sampleItem.ItemCode) === (item.Itemcode || item.ItemCode)
    );
    
    if (isDuplicate) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Item Code must be unique. This Item Code already exists.'
      });
      return;
    }

    // Prepare product data from search result - store full item data for API payload
    const productData = {
      id: Date.now(),
      RFIDNumber: item.RFIDNumber || item.RFID || item.RFIDCode || '',
      Itemcode: item.Itemcode || item.ItemCode || '',
      LabelledStockId: item.LabelledStockId || item.Id || item.id || '',
      category_id: item.CategoryName || item.Category || item.category_id || '',
      product_id: item.ProductName || item.Product || item.product_id || '',
      design_id: item.DesignName || item.Design || item.design_id || '',
      purity_id: item.PurityName || item.Purity || item.purity_id || '',
      grosswt: item.GrossWt || item.GrossWeight || item.grosswt || item.TWt || '0.000',
      stonewt: item.StoneWt || item.StoneWeight || item.stonewt || item.StWt || '0.000',
      diamondweight: item.DiamondWeight || item.diamondweight || item.DiaWt || '0.000',
      netwt: item.NetWt || item.NetWeight || item.netwt || item.NtWt || '0.000',
      FinePercent: item.FinePercent || item.FinePercentage || item['Fine %'] || '0.00',
      WastagePercent: item.WastagePercent || item.WastagePercentage || item['Wastage %'] || '0.00',
      Qty: item.Qty || item.Quantity || 1,
      Pieces: item.Pieces || item.Pieces || 1,
      TotalWt: item.GrossWt || item.GrossWeight || item.grosswt || item.TWt || '0.000',
      // Store full item data for API payload
      fullItemData: item
    };

    // Add to sample out items
    setSampleOutItems(prev => [...prev, productData]);
    
    // Clear search
    setSearchResults([]);
    setShowSearchResults(false);
    setItemCodeSearch('');

    addNotification({
      type: 'success',
      title: 'Success',
      message: 'Product added to sample out'
    });
  };

  // Remove item from sample out
  const removeItem = (id) => {
    setSampleOutItems(prev => prev.filter(item => item.id !== id));
    addNotification({
      type: 'success',
      title: 'Success',
      message: 'Item removed from sample out'
    });
  };

  // Helper function to get field value or null if empty
  const getValueOrNull = (value) => {
    if (value === null || value === undefined || value === '' || value === '0.000' || value === '0.00' || value === '0') {
      return null;
    }
    return value;
  };

  // Helper function to get category/product/design/purity IDs from names
  const getCategoryId = (categoryName) => {
    if (!categoryName) return 0;
    // Try to find in the item data, otherwise return 0
    return 0; // Will be set from fullItemData if available
  };

  const getProductId = (productName) => {
    if (!productName) return 0;
    return 0; // Will be set from fullItemData if available
  };

  const getDesignId = (designName) => {
    if (!designName) return 0;
    return 0; // Will be set from fullItemData if available
  };

  const getPurityId = (purityName) => {
    if (!purityName) return 0;
    return 0; // Will be set from fullItemData if available
  };

  // Handle Sample button click - Submit sample out
  const handleSampleOut = async () => {
    // Validation
    if (!selectedCustomerId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a customer.'
      });
      return;
    }

    if (sampleOutItems.length === 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please add at least one item to sample out.'
      });
      return;
    }

    if (!userInfo?.ClientCode) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'User information not found. Please refresh the page.'
      });
      return;
    }

    setLoading(true);
    try {
      // Calculate totals
      const totalQuantity = sampleOutItems.reduce((sum, item) => sum + (parseInt(item.Qty) || 1), 0);
      const totalDiamondWeight = sampleOutItems.reduce((sum, item) => sum + (parseFloat(item.diamondweight) || 0), 0).toFixed(3);
      const totalGrossWt = sampleOutItems.reduce((sum, item) => sum + (parseFloat(item.grosswt) || 0), 0).toFixed(3);
      const totalNetWt = sampleOutItems.reduce((sum, item) => sum + (parseFloat(item.netwt) || 0), 0).toFixed(3);
      const totalStoneWeight = sampleOutItems.reduce((sum, item) => sum + (parseFloat(item.stonewt) || 0), 0).toFixed(3);
      const totalWt = sampleOutItems.reduce((sum, item) => sum + (parseFloat(item.TotalWt) || 0), 0).toFixed(3);

      // Format return date - ensure YYYY-MM-DD format
      let formattedReturnDate = returnDate || sampleOutDate;
      if (formattedReturnDate) {
        // If date is already in YYYY-MM-DD format, use it; otherwise convert
        if (formattedReturnDate.includes('T')) {
          formattedReturnDate = formattedReturnDate.split('T')[0];
        } else if (formattedReturnDate.includes('/')) {
          // Convert DD/MM/YYYY or MM/DD/YYYY to YYYY-MM-DD
          const parts = formattedReturnDate.split('/');
          if (parts.length === 3) {
            formattedReturnDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      }

      // Build IssueItems array
      const issueItems = sampleOutItems.map(item => {
        const fullItem = item.fullItemData || {};
        
        // Build payload item - only include fields with values
        const issueItem = {
          Id: parseInt(item.LabelledStockId) || 0,
          ItemCode: item.Itemcode || '',
          LabelledStockId: parseInt(item.LabelledStockId) || 0,
          Quantity: parseInt(item.Qty) || 1,
          Qty: String(item.Qty || 1),
          Pieces: String(item.Pieces || 1),
          GrossWt: String(parseFloat(item.grosswt || 0).toFixed(3)),
          NetWt: String(parseFloat(item.netwt || 0).toFixed(3)),
          TotalWt: String(parseFloat(item.TotalWt || item.grosswt || 0).toFixed(3)),
          TotalStoneWeight: String(parseFloat(item.stonewt || 0).toFixed(3)),
          TotalDiamondWeight: String(parseFloat(item.diamondweight || 0).toFixed(3)),
          StoneWeight: String(parseFloat(item.stonewt || 0).toFixed(3)),
          SampleStatus: 'SampleOut',
          SampleOutNo: sampleOutNumber,
          CustomerId: parseInt(selectedCustomerId) || 0,
          return_date: formattedReturnDate ? (() => {
            // Format as DD-MM-YYYY
            const date = new Date(formattedReturnDate);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
          })() : null
        };

        // Add optional fields only if they have values
        if (fullItem.CategoryId) issueItem.CategoryId = parseInt(fullItem.CategoryId) || 0;
        if (fullItem.ProductId) issueItem.ProductId = parseInt(fullItem.ProductId) || 0;
        if (fullItem.DesignId) issueItem.DesignId = parseInt(fullItem.DesignId) || 0;
        if (fullItem.PurityId) issueItem.PurityId = parseInt(fullItem.PurityId) || 0;
        if (fullItem.RFIDNumber || item.RFIDNumber) issueItem.RFIDCode = fullItem.RFIDNumber || item.RFIDNumber || '';
        if (fullItem.TIDNumber) issueItem.TIDNumber = fullItem.TIDNumber;
        if (fullItem.BranchId) issueItem.BranchId = parseInt(fullItem.BranchId) || 0;
        if (fullItem.CounterId) issueItem.CounterId = parseInt(fullItem.CounterId) || 0;
        if (fullItem.BranchName) issueItem.BranchName = fullItem.BranchName;
        if (fullItem.CounterName) issueItem.CounterName = fullItem.CounterName;
        if (fullItem.BoxName) issueItem.BoxName = fullItem.BoxName;
        if (fullItem.BoxId) issueItem.BoxId = parseInt(fullItem.BoxId) || 0;
        if (fullItem.CategoryName || item.category_id) issueItem.CategoryName = fullItem.CategoryName || item.category_id || '';
        if (fullItem.ProductName || item.product_id) issueItem.ProductName = fullItem.ProductName || item.product_id || '';
        if (fullItem.DesignName || item.design_id) issueItem.DesignName = fullItem.DesignName || item.design_id || '';
        if (fullItem.PurityName || item.purity_id) issueItem.PurityName = fullItem.PurityName || item.purity_id || '';
        if (fullItem.VendorId) issueItem.VendorId = parseInt(fullItem.VendorId) || 0;
        if (fullItem.VendorName) issueItem.VendorName = fullItem.VendorName;
        if (fullItem.FirmName) issueItem.FirmName = fullItem.FirmName;
        if (fullItem.Size) issueItem.Size = String(fullItem.Size || '');
        if (fullItem.MRP) issueItem.MRP = String(parseFloat(fullItem.MRP || 0).toFixed(3));
        if (fullItem.HallmarkAmount) issueItem.HallmarkAmount = String(fullItem.HallmarkAmount || '');
        if (fullItem.HUIDCode) issueItem.HUIDCode = fullItem.HUIDCode || '';
        if (fullItem.PacketId) issueItem.PacketId = parseInt(fullItem.PacketId) || 0;
        if (fullItem.PacketName) issueItem.PacketName = fullItem.PacketName;
        if (fullItem.PackingWeight) issueItem.PackingWeight = parseFloat(fullItem.PackingWeight || 0);
        if (fullItem.TotalStoneAmount) issueItem.TotalStoneAmount = String(parseFloat(fullItem.TotalStoneAmount || 0).toFixed(2));
        if (fullItem.TotalStonePieces) issueItem.TotalStonePieces = String(fullItem.TotalStonePieces || '0');
        if (fullItem.TotalDiamondAmount) issueItem.TotalDiamondAmount = String(parseFloat(fullItem.TotalDiamondAmount || 0).toFixed(2));
        if (fullItem.TotalDiamondPieces) issueItem.TotalDiamondPieces = fullItem.TotalDiamondPieces;
        if (fullItem.StoneAmount) issueItem.StoneAmount = String(parseFloat(fullItem.StoneAmount || 0).toFixed(2));
        if (fullItem.FinePercent || item.FinePercent) {
          const finePercent = getValueOrNull(fullItem.FinePercent || item.FinePercent);
          if (finePercent !== null) issueItem.FinePercent = finePercent;
        }
        if (fullItem.WastagePercent || item.WastagePercent) {
          const wastagePercent = getValueOrNull(fullItem.WastagePercent || item.WastagePercent);
          if (wastagePercent !== null) issueItem.WastagePercent = wastagePercent;
        }
        if (fullItem.FineWastageWt) issueItem.FineWastageWt = String(parseFloat(fullItem.FineWastageWt || 0).toFixed(3));
        if (fullItem.ClientCode) issueItem.ClientCode = fullItem.ClientCode;
        if (fullItem.Status) issueItem.Status = fullItem.Status;

        return issueItem;
      });

      // Build main payload
      const payload = {
        ClientCode: userInfo.ClientCode,
        CustomerId: parseInt(selectedCustomerId) || 0,
        SampleOutNo: sampleOutNumber,
        ReturnDate: formattedReturnDate || sampleOutDate,
        Description: description || '',
        SampleStatus: 'SampleOut',
        Quantity: totalQuantity,
        TotalDiamondWeight: totalDiamondWeight,
        TotalGrossWt: totalGrossWt,
        TotalNetWt: totalNetWt,
        TotalStoneWeight: totalStoneWeight,
        TotalWt: totalWt,
        IssueItems: issueItems
      };

      // Remove null/empty fields from payload
      Object.keys(payload).forEach(key => {
        if (payload[key] === null || payload[key] === '' || payload[key] === undefined) {
          delete payload[key];
        }
      });

      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/Transaction/AddCustomerIssue',
        payload,
        { headers }
      );

      // Check for errors in response
      if (response.data?.Status === 400 || response.data?.status === 400) {
        throw new Error(response.data?.Message || response.data?.message || 'Failed to create sample out');
      }

      // Get customer name for success message
      const selectedCustomer = customerList.find(c => c.Id == selectedCustomerId || c.Id === selectedCustomerId);
      const customerName = selectedCustomer 
        ? (selectedCustomer.FirstName 
          ? `${selectedCustomer.FirstName}${selectedCustomer.LastName ? ' ' + selectedCustomer.LastName : ''}`
          : selectedCustomer.Name || selectedCustomer.CustomerName || 'Unknown')
        : 'Customer';

      // Show success modal
      setSuccessData({
        sampleOutNo: sampleOutNumber,
        customerName: customerName
      });
      setShowSuccessModal(true);

      // Reset form after success
      setTimeout(() => {
        setSampleOutItems([]);
        setCustomerSearch('');
        setSelectedCustomerId('');
        setCustomerMobile('');
        setFineGold('0.000');
        setBalanceAmount('0.000');
        setFinePercent('0.00');
        setReturnDate('');
        setDescription('');
        fetchSampleOutNumber(); // Get new sample out number
      }, 2000);

    } catch (error) {
      console.error('Error creating sample out:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.Message || error.response?.data?.message || error.message || 'Failed to create sample out. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(sampleOutItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = sampleOutItems.slice(startIndex, endIndex);

  // Handle click outside to close item code dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (itemCodeSearchRef.current && !itemCodeSearchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isSmallScreen = windowWidth <= 768;

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Calculate totals for export
  const calculateTotals = () => {
    const totals = {
      Qty: 0,
      TotalWt: 0,
      GrossWt: 0,
      NetWt: 0,
      StoneWt: 0,
      DiamondWt: 0
    };

    sampleOutItems.forEach(item => {
      totals.Qty += parseInt(item.Qty || 1);
      totals.TotalWt += parseFloat(item.TotalWt || 0);
      totals.GrossWt += parseFloat(item.grosswt || 0);
      totals.NetWt += parseFloat(item.netwt || 0);
      totals.StoneWt += parseFloat(item.stonewt || 0);
      totals.DiamondWt += parseFloat(item.diamondweight || 0);
    });

    return totals;
  };

  // Export to Excel
  const handleExportToExcel = () => {
    try {
      if (sampleOutItems.length === 0) {
        addNotification({
          type: 'error',
          message: 'No items to export',
          duration: 3000
        });
        return;
      }

      const totals = calculateTotals();
      const exportData = sampleOutItems.map((item, index) => ({
        'Sr No': index + 1,
        'Item Code': item.Itemcode || '-',
        'RFID Code': item.RFIDNumber || '-',
        'Category': item.category_id || '-',
        'Product Name': item.product_id || '-',
        'Design Name': item.design_id || '-',
        'Total Wt': parseFloat(item.TotalWt || 0),
        'Gross Wt': parseFloat(item.grosswt || 0),
        'Net Wt': parseFloat(item.netwt || 0),
        'Stone Wt': parseFloat(item.stonewt || 0),
        'Diamond Wt': parseFloat(item.diamondweight || 0),
        'Fine%': item.FinePercent || '0.00',
        'Wastage%': item.WastagePercent || '0.00',
        'Qty': parseInt(item.Qty || 1),
        'Pcs': parseInt(item.Pieces || 1)
      }));

      // Add summary row
      exportData.push({
        'Sr No': '',
        'Item Code': '',
        'RFID Code': '',
        'Category': '',
        'Product Name': '',
        'Design Name': 'TOTAL',
        'Total Wt': totals.TotalWt,
        'Gross Wt': totals.GrossWt,
        'Net Wt': totals.NetWt,
        'Stone Wt': totals.StoneWt,
        'Diamond Wt': totals.DiamondWt,
        'Fine%': '',
        'Wastage%': '',
        'Qty': totals.Qty,
        'Pcs': ''
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sample Out Items');
      
      const fileName = `SampleOut_${sampleOutNumber || 'Items'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      addNotification({
        type: 'success',
        message: `Sample Out items exported to ${fileName} successfully`,
        duration: 3000
      });
      setShowExportDropdown(false);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      addNotification({
        type: 'error',
        message: 'Failed to export. Please try again.',
        duration: 3000
      });
    }
  };

  // Export to PDF
  const handleExportToPDF = () => {
    try {
      if (sampleOutItems.length === 0) {
        addNotification({
          type: 'error',
          message: 'No items to export',
          duration: 3000
        });
        return;
      }

      const totals = calculateTotals();
      const doc = new jsPDF('landscape');
      
      doc.setFontSize(16);
      doc.text('Sample Out Items', 15, 20);
      doc.setFontSize(10);
      doc.text(`Sample Out No: ${sampleOutNumber || 'N/A'}`, 15, 28);
      doc.text(`Date: ${sampleOutDate}`, 15, 34);
      doc.text(`Customer: ${customerName || 'N/A'}`, 15, 40);
      doc.text(`Return Date: ${returnDate || 'N/A'}`, 15, 46);
      doc.text(`Total Items: ${sampleOutItems.length}`, 15, 52);

      const tableHeaders = [
        'Sr No',
        'Item Code',
        'RFID Code',
        'Category',
        'Product',
        'Design',
        'Total Wt',
        'Gross Wt',
        'Net Wt',
        'Stone Wt',
        'Diamond Wt',
        'Fine%',
        'Wastage%',
        'Qty',
        'Pcs'
      ];

      const tableData = sampleOutItems.map((item, index) => [
        index + 1,
        item.Itemcode || '-',
        item.RFIDNumber || '-',
        item.category_id || '-',
        item.product_id || '-',
        item.design_id || '-',
        parseFloat(item.TotalWt || 0).toFixed(3),
        parseFloat(item.grosswt || 0).toFixed(3),
        parseFloat(item.netwt || 0).toFixed(3),
        parseFloat(item.stonewt || 0).toFixed(3),
        parseFloat(item.diamondweight || 0).toFixed(3),
        item.FinePercent || '0.00',
        item.WastagePercent || '0.00',
        item.Qty || 1,
        item.Pieces || 1
      ]);

      // Add summary row
      tableData.push([
        '',
        '',
        '',
        '',
        '',
        'TOTAL',
        totals.TotalWt.toFixed(3),
        totals.GrossWt.toFixed(3),
        totals.NetWt.toFixed(3),
        totals.StoneWt.toFixed(3),
        totals.DiamondWt.toFixed(3),
        '',
        '',
        totals.Qty,
        ''
      ]);

      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 58,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [69, 73, 232], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 8, right: 8 },
        tableWidth: 'auto',
        didParseCell: function(data) {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
          }
        }
      });

      const fileName = `SampleOut_${sampleOutNumber || 'Items'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      addNotification({
        type: 'success',
        message: `Sample Out items exported to ${fileName} successfully`,
        duration: 3000
      });
      setShowExportDropdown(false);
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      addNotification({
        type: 'error',
        message: 'Failed to export. Please try again.',
        duration: 3000
      });
    }
  };

  return (
    <div style={{ 
      padding: isSmallScreen ? '8px' : '20px', 
      fontFamily: 'Inter, system-ui, sans-serif', 
      background: '#ffffff', 
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @media (max-width: 768px) {
          * {
            box-sizing: border-box;
          }
        }
      `}</style>
      {/* Top Header - Compact */}
      <div style={{
        background: '#ffffff',
        borderRadius: '8px',
        padding: isSmallScreen ? '8px 10px' : '10px 16px',
        marginBottom: isSmallScreen ? '8px' : '12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isSmallScreen ? 'flex-start' : 'center',
        flexWrap: 'wrap',
        gap: isSmallScreen ? '8px' : '10px',
        flexDirection: isSmallScreen ? 'column' : 'row'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: isSmallScreen ? '14px' : '16px', 
            fontWeight: 700, 
            color: '#1e293b',
            lineHeight: '1.2'
          }}>
            Sample Out
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: isSmallScreen ? '11px' : '12px', color: '#64748b', fontWeight: 600 }}>Sample Out No:</span>
            <span style={{ fontSize: isSmallScreen ? '12px' : '13px', color: '#1e293b', fontWeight: 600 }}>
              {sampleOutNumber || 'Auto-generated'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: isSmallScreen ? '11px' : '12px', color: '#64748b', fontWeight: 600 }}>Date:</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaCalendarAlt style={{
                position: 'absolute',
                left: '6px',
                color: '#64748b',
                fontSize: '11px',
                pointerEvents: 'none',
                zIndex: 1
              }} />
              <input
                type="date"
                value={sampleOutDate}
                onChange={(e) => setSampleOutDate(e.target.value)}
                style={{
                  padding: '4px 6px 4px 24px',
                  fontSize: isSmallScreen ? '11px' : '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none',
                  width: '130px',
                  height: '28px'
                }}
              />
            </div>
          </div>
          {/* Export Button with Dropdown */}
          {sampleOutItems.length > 0 && (
            <div ref={exportDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #10b981',
                  background: '#ffffff',
                  color: '#10b981',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#10b981';
                  e.target.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ffffff';
                  e.target.style.color = '#10b981';
                }}
              >
                <FaFileExcel />
                <span>Export</span>
                <FaChevronDown style={{ fontSize: '10px' }} />
              </button>

              {showExportDropdown && (
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
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '12px'
      }}>
        {/* Customer Information */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          padding: isSmallScreen ? '10px 12px' : '12px 16px',
          marginBottom: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isSmallScreen ? '1fr' : windowWidth <= 1024 ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', 
            gap: isSmallScreen ? '10px' : '12px' 
          }}>
             {/* Customer Name */}
             <div ref={customerDropdownRef} style={{ position: 'relative' }}>
               <label style={{ 
                 display: 'block', 
                 fontSize: '12px', 
                 fontWeight: 600, 
                 color: '#475569', 
                 marginBottom: '4px' 
               }}>
                 Customer Name<span style={{ color: '#ef4444' }}>*</span>
               </label>
               <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                 <div style={{ flex: 1, position: 'relative' }}>
                   <input
                     type="text"
                     value={customerSearch}
                     onChange={(e) => {
                       setCustomerSearch(e.target.value);
                       setSelectedCustomerId('');
                       setShowCustomerDropdown(true);
                     }}
                     onFocus={(e) => {
                       e.target.style.borderColor = '#3b82f6';
                       e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                       if (customerSearch.trim() && filteredCustomers.length > 0) {
                         setShowCustomerDropdown(true);
                       }
                     }}
                     onBlur={(e) => {
                       e.target.style.borderColor = '#d1d5db';
                       e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                     }}
                     placeholder="Type to search customer..."
                     disabled={loadingCustomers}
                     style={{
                       width: '100%',
                       padding: '10px 12px',
                       fontSize: '12px',
                       border: '1px solid #d1d5db',
                       borderRadius: '8px',
                       outline: 'none',
                       background: loadingCustomers ? '#f9fafb' : '#ffffff',
                       boxSizing: 'border-box',
                       transition: 'all 0.2s ease',
                       boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                     }}
                   />
                   {showCustomerDropdown && filteredCustomers.length > 0 && (
                     <div style={{
                       position: 'absolute',
                       top: '100%',
                       left: 0,
                       right: 0,
                       background: '#ffffff',
                       border: '1px solid #e5e7eb',
                       borderRadius: '8px',
                       boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
                       marginTop: '6px',
                       maxHeight: '280px',
                       overflowY: 'auto',
                       zIndex: 1000,
                       borderTop: '2px solid #3b82f6'
                     }}>
                       {filteredCustomers.map((customer, idx) => {
                         const customerName = customer.FirstName 
                           ? `${customer.FirstName}${customer.LastName ? ' ' + customer.LastName : ''}`
                           : customer.Name || customer.CustomerName || 'Unknown';
                         return (
                           <div
                             key={customer.Id}
                             onClick={() => handleCustomerSelect(customer)}
                             style={{
                               padding: '12px 14px',
                               cursor: 'pointer',
                               fontSize: '12px',
                               borderBottom: idx < filteredCustomers.length - 1 ? '1px solid #f1f5f9' : 'none',
                               transition: 'all 0.15s ease',
                               backgroundColor: '#ffffff'
                             }}
                             onMouseEnter={(e) => {
                               e.currentTarget.style.background = '#f8fafc';
                               e.currentTarget.style.transform = 'translateX(2px)';
                             }}
                             onMouseLeave={(e) => {
                               e.currentTarget.style.background = '#ffffff';
                               e.currentTarget.style.transform = 'translateX(0)';
                             }}
                           >
                             <div style={{ 
                               fontWeight: 600, 
                               color: '#1e293b',
                               marginBottom: customer.Mobile || customer.MobileNumber ? '4px' : '0',
                               fontSize: '13px',
                               lineHeight: '1.4'
                             }}>
                               {customerName}
                             </div>
                             {customer.Mobile || customer.MobileNumber ? (
                               <div style={{ 
                                 color: '#64748b', 
                                 fontSize: '11px',
                                 fontWeight: 400,
                                 display: 'flex',
                                 alignItems: 'center',
                                 gap: '6px'
                               }}>
                                 <span style={{ 
                                   display: 'inline-block',
                                   width: '4px',
                                   height: '4px',
                                   borderRadius: '50%',
                                   background: '#94a3b8',
                                   flexShrink: 0
                                 }}></span>
                                 {customer.Mobile || customer.MobileNumber}
                               </div>
                             ) : null}
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>
                 <button
                   type="button"
                   onClick={() => navigate('/add_customer_new')}
                   style={{
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     padding: '10px 12px',
                     fontSize: '14px',
                     fontWeight: 600,
                     borderRadius: '8px',
                     border: '1px solid #3b82f6',
                     background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                     color: '#ffffff',
                     cursor: 'pointer',
                     transition: 'all 0.2s ease',
                     boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                     minWidth: '44px',
                     height: '40px',
                     flexShrink: 0
                   }}
                   title="Add New Customer"
                   onMouseEnter={(e) => {
                     e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                     e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                     e.currentTarget.style.transform = 'translateY(-1px)';
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                     e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                     e.currentTarget.style.transform = 'translateY(0)';
                   }}
                 >
                   <FaUserPlus />
                 </button>
               </div>
             </div>

            {/* Mobile */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#475569', 
                marginBottom: '4px' 
              }}>
                Mobile
              </label>
              <input
                type="text"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                placeholder="Mobile"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Fine Gold */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#475569', 
                marginBottom: '4px' 
              }}>
                Fine Gold
              </label>
              <input
                type="number"
                value={fineGold}
                onChange={(e) => setFineGold(parseFloat(e.target.value || 0).toFixed(3))}
                step="0.001"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Balance Amount */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#475569', 
                marginBottom: '4px' 
              }}>
                Balance Amount
              </label>
              <input
                type="number"
                value={balanceAmount}
                readOnly
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  color: '#64748b'
                }}
              />
            </div>

            {/* Fine% */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#475569', 
                marginBottom: '4px' 
              }}>
                Fine%
              </label>
              <input
                type="number"
                value={finePercent}
                onChange={(e) => setFinePercent(parseFloat(e.target.value || 0).toFixed(2))}
                step="0.01"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Item Code Search and Additional Fields */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          padding: isSmallScreen ? '10px 12px' : '12px 16px',
          marginBottom: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isSmallScreen ? '1fr' : windowWidth <= 1024 ? '1fr' : '2fr 1.5fr 1fr', 
            gap: isSmallScreen ? '10px' : '12px',
            marginBottom: isSmallScreen ? '10px' : '12px'
          }}>
             {/* Item Code Search */}
             <div ref={itemCodeSearchRef} style={{ position: 'relative' }}>
               <label style={{ 
                 display: 'block', 
                 fontSize: '12px', 
                 fontWeight: 600, 
                 color: '#475569', 
                 marginBottom: '4px' 
               }}>
                 Select Item Code
               </label>
               <div style={{ position: 'relative' }}>
                 <FaSearch style={{
                   position: 'absolute',
                   left: '12px',
                   top: '50%',
                   transform: 'translateY(-50%)',
                   color: '#94a3b8',
                   fontSize: '14px',
                   zIndex: 1,
                   pointerEvents: 'none'
                 }} />
                 <input
                   type="text"
                   placeholder="Type Item Code to search..."
                   value={itemCodeSearch}
                   onChange={(e) => setItemCodeSearch(e.target.value)}
                   style={{
                     width: '100%',
                     padding: '10px 12px 10px 38px',
                     fontSize: '12px',
                     border: '1px solid #d1d5db',
                     borderRadius: '8px',
                     outline: 'none',
                     transition: 'all 0.2s ease',
                     boxSizing: 'border-box',
                     boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                   }}
                   onFocus={(e) => {
                     e.target.style.borderColor = '#3b82f6';
                     e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                     if (itemCodeSearch.trim() && searchResults.length > 0) {
                       setShowSearchResults(true);
                     }
                   }}
                   onBlur={(e) => {
                     e.target.style.borderColor = '#d1d5db';
                     e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                     setTimeout(() => setShowSearchResults(false), 200);
                   }}
                 />
                 {searching && (
                   <FaSpinner style={{
                     position: 'absolute',
                     right: '12px',
                     top: '50%',
                     transform: 'translateY(-50%)',
                     color: '#3b82f6',
                     fontSize: '14px',
                     animation: 'spin 1s linear infinite'
                   }} />
                 )}
               </div>
               
               {/* Search Results Dropdown */}
               {showSearchResults && searchResults.length > 0 && (
                 <div style={{
                   position: 'absolute',
                   top: '100%',
                   left: 0,
                   right: 0,
                   background: '#ffffff',
                   border: '1px solid #e5e7eb',
                   borderRadius: '8px',
                   boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
                   marginTop: '6px',
                   maxHeight: '280px',
                   overflowY: 'auto',
                   zIndex: 1000,
                   borderTop: '2px solid #3b82f6'
                 }}>
                   {searchResults.map((item, idx) => (
                     <div
                       key={idx}
                       onClick={() => selectItemFromSearch(item)}
                       style={{
                         padding: '12px 14px',
                         cursor: 'pointer',
                         borderBottom: idx < searchResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                         fontSize: '12px',
                         transition: 'all 0.15s ease',
                         backgroundColor: '#ffffff'
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.background = '#f8fafc';
                         e.currentTarget.style.transform = 'translateX(2px)';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.background = '#ffffff';
                         e.currentTarget.style.transform = 'translateX(0)';
                       }}
                     >
                       <div style={{ 
                         fontWeight: 600, 
                         color: '#1e293b',
                         marginBottom: '4px',
                         fontSize: '13px',
                         lineHeight: '1.4'
                       }}>
                         {item.Itemcode || item.ItemCode || '-'}
                       </div>
                       <div style={{ 
                         fontSize: '11px', 
                         color: '#64748b',
                         fontWeight: 400,
                         display: 'flex',
                         alignItems: 'center',
                         gap: '6px',
                         flexWrap: 'wrap'
                       }}>
                         <span style={{ 
                           display: 'inline-block',
                           width: '4px',
                           height: '4px',
                           borderRadius: '50%',
                           background: '#94a3b8',
                           flexShrink: 0
                         }}></span>
                         <span>{item.ProductName || item.Product || '-'}</span>
                         {item.CategoryName || item.Category ? (
                           <>
                             <span style={{ color: '#cbd5e1' }}>•</span>
                             <span>{item.CategoryName || item.Category}</span>
                           </>
                         ) : null}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>

            {/* Description */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#475569', 
                marginBottom: '4px' 
              }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Return Date */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#475569', 
                marginBottom: '4px' 
              }}>
                Return Date
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <FaCalendarAlt style={{
                  position: 'absolute',
                  left: '6px',
                  color: '#64748b',
                  fontSize: '11px',
                  pointerEvents: 'none',
                  zIndex: 1
                }} />
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 24px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          padding: isSmallScreen ? '10px 12px' : '12px 16px',
          marginBottom: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '14px', 
            fontWeight: 600, 
            color: '#1e293b' 
          }}>
            Sample Out Items
          </h3>

          {/* Items Table */}
          <div style={{ 
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: isSmallScreen ? '300px' : '500px',
            WebkitOverflowScrolling: 'touch',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            position: 'relative',
            width: '100%'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: isSmallScreen ? '9px' : '11px',
              minWidth: isSmallScreen ? '1000px' : '100%'
            }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'center', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc' }}>Sr.No.</th>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc', minWidth: '100px' }}>Item Code</th>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc', minWidth: '100px' }}>RFID Code</th>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc', minWidth: '100px' }}>Category</th>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc', minWidth: '120px' }}>Product Name</th>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc', minWidth: '120px' }}>Design Name</th>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc' }}>Total Wt</th>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc' }}>Gross Wt</th>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc' }}>Net Wt</th>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc' }}>Stone Wt</th>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc' }}>Diamond Wt</th>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc' }}>Fine%</th>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc' }}>Wastage%</th>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc' }}>Qty</th>
                  <th style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '10px' : '11px', background: '#f8fafc' }}>Pcs</th>
                  <th style={{ 
                    padding: isSmallScreen ? '6px' : '8px', 
                    textAlign: 'center', 
                    fontWeight: 600, 
                    color: '#475569', 
                    whiteSpace: 'nowrap', 
                    fontSize: isSmallScreen ? '10px' : '11px', 
                    background: '#f8fafc',
                    position: 'sticky',
                    right: 0,
                    zIndex: 10,
                    minWidth: '80px'
                  }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length > 0 ? (
                  currentItems.map((item, index) => (
                    <tr key={item.id} style={{ 
                      borderBottom: '1px solid #e5e7eb',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                    >
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'center', fontSize: isSmallScreen ? '10px' : '11px' }}>{startIndex + index + 1}</td>
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'left', fontSize: isSmallScreen ? '10px' : '11px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.Itemcode || '-'}</span>
                      </td>
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'left', fontSize: isSmallScreen ? '10px' : '11px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 500, color: '#1e293b' }}>{item.RFIDNumber || '-'}</span>
                      </td>
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'left', fontSize: isSmallScreen ? '10px' : '11px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#475569' }}>{item.category_id || '-'}</span>
                      </td>
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'left', fontSize: isSmallScreen ? '10px' : '11px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#475569' }}>{item.product_id || '-'}</span>
                      </td>
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'left', fontSize: isSmallScreen ? '10px' : '11px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#475569' }}>{item.design_id || '-'}</span>
                      </td>
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontSize: isSmallScreen ? '10px' : '11px', whiteSpace: 'nowrap' }}>{item.TotalWt || '0.000'}</td>
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontSize: isSmallScreen ? '10px' : '11px', whiteSpace: 'nowrap' }}>{item.grosswt || '0.000'}</td>
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontSize: isSmallScreen ? '10px' : '11px', whiteSpace: 'nowrap' }}>{item.netwt || '0.000'}</td>
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontSize: isSmallScreen ? '10px' : '11px', whiteSpace: 'nowrap' }}>{item.stonewt || '0.000'}</td>
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontSize: isSmallScreen ? '10px' : '11px', whiteSpace: 'nowrap' }}>{item.diamondweight || '0.000'}</td>
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontSize: isSmallScreen ? '10px' : '11px', whiteSpace: 'nowrap' }}>{item.FinePercent || '0.00'}</td>
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontSize: isSmallScreen ? '10px' : '11px', whiteSpace: 'nowrap' }}>{item.WastagePercent || '0.00'}</td>
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontSize: isSmallScreen ? '10px' : '11px', whiteSpace: 'nowrap' }}>{item.Qty || 1}</td>
                      <td style={{ padding: isSmallScreen ? '6px' : '8px', textAlign: 'right', fontSize: isSmallScreen ? '10px' : '11px', whiteSpace: 'nowrap' }}>{item.Pieces || 1}</td>
                      <td style={{ 
                        padding: isSmallScreen ? '6px' : '8px', 
                        textAlign: 'center',
                        position: 'sticky',
                        right: 0,
                        background: '#ffffff',
                        zIndex: 5,
                        borderLeft: '1px solid #e5e7eb'
                      }}>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #ef4444',
                            background: '#ffffff',
                            color: '#ef4444',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ef4444';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="16" style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: isSmallScreen ? '11px' : '12px' }}>
                      No items added yet. Search by Item Code to add items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {sampleOutItems.length > itemsPerPage && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '12px',
              padding: '8px 0'
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
              >
                Previous
              </button>
              <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                Page {currentPage} of {totalPages}
              </span>
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
              >
                Next
              </button>
            </div>
          )}

           {/* Action Buttons */}
           <div style={{
             display: 'flex',
             justifyContent: isSmallScreen ? 'center' : 'flex-end',
             gap: isSmallScreen ? '8px' : '12px',
             marginTop: isSmallScreen ? '12px' : '16px',
             paddingTop: isSmallScreen ? '12px' : '16px',
             borderTop: '1px solid #e5e7eb',
             flexWrap: 'wrap'
           }}>
             <button
               type="button"
               onClick={handleSampleOut}
               disabled={loading}
               style={{
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '6px',
                 padding: isSmallScreen ? '8px 16px' : '10px 20px',
                 fontSize: isSmallScreen ? '11px' : '12px',
                 fontWeight: 600,
                 borderRadius: '6px',
                 border: '1px solid #3b82f6',
                 background: '#3b82f6',
                 color: '#ffffff',
                 cursor: loading ? 'not-allowed' : 'pointer',
                 transition: 'all 0.2s',
                 width: isSmallScreen ? '48%' : 'auto',
                 minWidth: isSmallScreen ? '120px' : 'auto',
                 opacity: loading ? 0.6 : 1
               }}
               onMouseEnter={(e) => {
                 if (!loading) {
                   e.currentTarget.style.background = '#2563eb';
                   e.currentTarget.style.borderColor = '#2563eb';
                 }
               }}
               onMouseLeave={(e) => {
                 if (!loading) {
                   e.currentTarget.style.background = '#3b82f6';
                   e.currentTarget.style.borderColor = '#3b82f6';
                 }
               }}
             >
               {loading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaFileInvoice style={{ fontSize: isSmallScreen ? '14px' : '16px' }} />}
               <span>{loading ? 'Processing...' : 'Sample'}</span>
             </button>
             <button
               type="button"
               onClick={() => {
                 navigate('/sample-out-list');
               }}
               style={{
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '6px',
                 padding: isSmallScreen ? '8px 16px' : '10px 20px',
                 fontSize: isSmallScreen ? '11px' : '12px',
                 fontWeight: 600,
                 borderRadius: '6px',
                 border: '1px solid #627282',
                 background: '#ffffff',
                 color: '#627282',
                 cursor: 'pointer',
                 transition: 'all 0.2s',
                 width: isSmallScreen ? '48%' : 'auto',
                 minWidth: isSmallScreen ? '120px' : 'auto'
               }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.background = '#627282';
                 e.currentTarget.style.color = '#ffffff';
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.background = '#ffffff';
                 e.currentTarget.style.color = '#627282';
               }}
             >
               <FaList style={{ fontSize: isSmallScreen ? '14px' : '16px' }} />
               <span>Sample Out List</span>
             </button>
           </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}
        onClick={() => setShowSuccessModal(false)}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: isSmallScreen ? '24px' : '32px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            position: 'relative',
            animation: 'fadeIn 0.3s ease-in'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <FaTimes style={{ color: '#64748b', fontSize: '18px' }} />
            </button>

            {/* Success Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.3)',
                animation: 'popIn 0.5s cubic-bezier(.68,-0.55,.27,1.55)'
              }}>
                <FaCheckCircle style={{ fontSize: '36px', color: '#ffffff' }} />
              </div>
            </div>

            {/* Title */}
            <h2 style={{
              fontWeight: 600,
              fontSize: isSmallScreen ? '20px' : '24px',
              color: '#1e293b',
              textAlign: 'center',
              marginBottom: '12px',
              lineHeight: '1.2'
            }}>
              Sample Out Created Successfully!
            </h2>

            {/* Message */}
            <div style={{
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#64748b',
                marginBottom: '16px',
                lineHeight: '1.6'
              }}>
                Sample Out Number <strong style={{ color: '#1e293b' }}>{successData.sampleOutNo}</strong> has been assigned to
              </p>
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                borderRadius: '8px',
                padding: '12px 16px',
                border: '1px solid #bfdbfe'
              }}>
                <p style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1e40af',
                  margin: 0
                }}>
                  {successData.customerName}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                width: '100%',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes popIn {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default SampleOut;

