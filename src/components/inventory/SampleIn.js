import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  FaUserPlus,
  FaCalendarAlt,
  FaSearch,
  FaSpinner,
  FaTrash,
  FaCheckCircle,
  FaList,
  FaTimes,
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

const SampleIn = () => {
  const { loading, setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Sample In Header State
  const [sampleInNumber, setSampleInNumber] = useState('');
  const [sampleInDate, setSampleInDate] = useState(new Date().toISOString().split('T')[0]);
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
  
  // Sample Out Selection State
  const [sampleOutSearch, setSampleOutSearch] = useState('');
  const [sampleOutList, setSampleOutList] = useState([]);
  const [filteredSampleOuts, setFilteredSampleOuts] = useState([]);
  const [showSampleOutDropdown, setShowSampleOutDropdown] = useState(false);
  const [selectedSampleOutId, setSelectedSampleOutId] = useState(null);
  const [selectedSampleOutData, setSelectedSampleOutData] = useState(null);
  const [loadingSampleOuts, setLoadingSampleOuts] = useState(false);
  
  // Return Date and Description (auto-populated from selected Sample Out)
  const [returnDate, setReturnDate] = useState('');
  const [description, setDescription] = useState('');
  
  // Item Code Search State
  const [itemCodeSearch, setItemCodeSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);
  
  // Sample In Items State
  const [sampleInItems, setSampleInItems] = useState([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  
  const customerDropdownRef = useRef(null);
  const sampleOutDropdownRef = useRef(null);
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

  // Fetch sample outs for selected customer
  const fetchSampleOuts = async (customerId) => {
    if (!userInfo?.ClientCode || !customerId) {
      setSampleOutList([]);
      return;
    }
    
    setLoadingSampleOuts(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      
      const payload = {
        ClientCode: userInfo.ClientCode,
        CustomerId: parseInt(customerId),
        SampleStatus: 'SampleOut'
      };
      
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/Transaction/GetAllCustSampleOutNo',
        payload,
        { headers }
      );
      
      // Response is an array of strings like ["C12", "C8"]
      const sampleOutNumbers = Array.isArray(response.data) ? response.data : [];
      setSampleOutList(sampleOutNumbers);
    } catch (error) {
      console.error('Error fetching sample outs:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load sample outs. Please try again.'
      });
      setSampleOutList([]);
    } finally {
      setLoadingSampleOuts(false);
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

  // Filter sample outs based on search input
  useEffect(() => {
    const searchTerm = sampleOutSearch.trim().toLowerCase();
    
    // If search is empty, show all sample outs (will be controlled by dropdown visibility)
    if (searchTerm === '') {
      setFilteredSampleOuts(sampleOutList);
      return;
    }

    // sampleOutList is an array of strings like ["C12", "C8"]
    const filtered = sampleOutList.filter(sampleOutNo => {
      // Handle both string and object formats
      if (typeof sampleOutNo === 'string') {
        return sampleOutNo.toLowerCase().includes(searchTerm);
      } else {
        // Fallback for object format if needed
        const sampleOutNoStr = (sampleOutNo.SampleOutNo || sampleOutNo.SampleOutNumber || '').toLowerCase();
        const customerName = (sampleOutNo.CustomerName || sampleOutNo.Customer?.FirstName || '').toLowerCase();
        const description = (sampleOutNo.Description || '').toLowerCase();
        
        return sampleOutNoStr.includes(searchTerm) || 
               customerName.includes(searchTerm) ||
               description.includes(searchTerm);
      }
    });

    setFilteredSampleOuts(filtered);
  }, [sampleOutSearch, sampleOutList]);

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
        if (customer.FineGold) {
          const fine = parseFloat(customer.FineGold);
          setFinePercent(fine.toFixed(2));
        } else {
          setFinePercent('0.00');
        }
      }
      // Fetch sample outs when customer is selected
      fetchSampleOuts(selectedCustomerId);
    } else if (!selectedCustomerId) {
      setCustomerName('');
      setCustomerSearch('');
      setCustomerMobile('');
      setFineGold('0.000');
      setAdvanceAmount('0.00');
      setBalanceAmount('0.000');
      setFinePercent('0.00');
      // Clear sample outs when no customer is selected
      setSampleOutList([]);
      setSampleOutSearch('');
      setSelectedSampleOutId(null);
      setSelectedSampleOutData(null);
    }
  }, [selectedCustomerId, customerList]);

  // Handle sample out selection - populate return date and description
  const handleSampleOutSelect = (sampleOut) => {
    // Handle both string and object formats
    if (typeof sampleOut === 'string') {
      // If it's a string (sample out number like "C12")
      setSelectedSampleOutId(sampleOut);
      setSelectedSampleOutData(sampleOut);
      setSampleOutSearch(sampleOut);
      setShowSampleOutDropdown(false);
    } else {
      // If it's an object (fallback for compatibility)
      setSelectedSampleOutId(sampleOut.Id || sampleOut.CustomerIssueId || sampleOut);
      setSelectedSampleOutData(sampleOut);
      setSampleOutSearch(sampleOut.SampleOutNo || sampleOut.SampleOutNumber || '');
      setShowSampleOutDropdown(false);
      
      // Auto-populate return date and description
      if (sampleOut.ReturnDate) {
        // Format date to YYYY-MM-DD
        const date = new Date(sampleOut.ReturnDate);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          setReturnDate(`${year}-${month}-${day}`);
        }
      }
      setDescription(sampleOut.Description || '');
      
      // Also set customer if available
      if (sampleOut.CustomerId) {
        setSelectedCustomerId(sampleOut.CustomerId);
      }
    }
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
      if (sampleOutDropdownRef.current && !sampleOutDropdownRef.current.contains(event.target)) {
        setShowSampleOutDropdown(false);
      }
      if (itemCodeSearchRef.current && !itemCodeSearchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
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

  // Fetch sample in number
  const fetchSampleInNumber = async () => {
    if (!userInfo?.ClientCode) return;
    
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      
      // Assuming similar API endpoint for sample in number
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
          console.warn('Invalid sample in number from API, defaulting to 1. Response:', response.data, 'Extracted:', lastNumber);
          setSampleInNumber('1');
        } else {
          const nextNumber = (parsedNumber + 1).toString();
          console.log('Sample In Number - API Response:', response.data, 'Extracted Number:', lastNumber, 'Next Number:', nextNumber);
          setSampleInNumber(nextNumber);
        }
      } else {
        console.warn('No data in API response, defaulting to 1');
        setSampleInNumber('1');
      }
    } catch (error) {
      console.error('Error fetching sample in number:', error);
      setSampleInNumber('1');
    }
  };

  useEffect(() => {
    if (userInfo?.ClientCode) {
      fetchSampleInNumber();
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
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [itemCodeSearch]);

  // Search for item by Item Code
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

  // Select item from search results and add to sample in
  const selectItemFromSearch = (item) => {
    const isDuplicate = sampleInItems.some(sampleItem => 
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
      Qty: 1,
      Pieces: 1,
      TotalWt: item.GrossWt || item.GrossWeight || item.grosswt || item.TWt || '0.000',
      fullItemData: item
    };

    setSampleInItems([...sampleInItems, productData]);
    setItemCodeSearch('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Remove item from sample in
  const removeItem = (id) => {
    setSampleInItems(sampleInItems.filter(item => item.id !== id));
  };

  // Handle Sample In submission
  const handleSampleIn = async () => {
    if (!selectedCustomerId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a customer.'
      });
      return;
    }

    if (!selectedSampleOutId) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a sample out.'
      });
      return;
    }

    if (sampleInItems.length === 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please add at least one item to sample in.'
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
      const totalQuantity = sampleInItems.reduce((sum, item) => sum + (parseInt(item.Qty) || 1), 0);
      const totalDiamondWeight = sampleInItems.reduce((sum, item) => sum + (parseFloat(item.diamondweight) || 0), 0).toFixed(3);
      const totalGrossWt = sampleInItems.reduce((sum, item) => sum + (parseFloat(item.grosswt) || 0), 0).toFixed(3);
      const totalNetWt = sampleInItems.reduce((sum, item) => sum + (parseFloat(item.netwt) || 0), 0).toFixed(3);
      const totalStoneWeight = sampleInItems.reduce((sum, item) => sum + (parseFloat(item.stonewt) || 0), 0).toFixed(3);
      const totalWt = sampleInItems.reduce((sum, item) => sum + (parseFloat(item.TotalWt) || 0), 0).toFixed(3);

      let formattedReturnDate = returnDate || sampleInDate;
      if (formattedReturnDate) {
        if (formattedReturnDate.includes('T')) {
          formattedReturnDate = formattedReturnDate.split('T')[0];
        } else if (formattedReturnDate.includes('/')) {
          const parts = formattedReturnDate.split('/');
          if (parts.length === 3) {
            formattedReturnDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      }

      const returnItems = sampleInItems.map(item => {
        const fullItem = item.fullItemData || {};
        
        const returnItem = {
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
          SampleStatus: 'SampleIn',
          SampleInNo: sampleInNumber,
          CustomerId: parseInt(selectedCustomerId) || 0,
          CustomerIssueId: parseInt(selectedSampleOutId) || 0,
          return_date: formattedReturnDate ? (() => {
            const date = new Date(formattedReturnDate);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
          })() : null
        };

        if (fullItem.CategoryId) returnItem.CategoryId = parseInt(fullItem.CategoryId) || 0;
        if (fullItem.ProductId) returnItem.ProductId = parseInt(fullItem.ProductId) || 0;
        if (fullItem.DesignId) returnItem.DesignId = parseInt(fullItem.DesignId) || 0;
        if (fullItem.PurityId) returnItem.PurityId = parseInt(fullItem.PurityId) || 0;
        if (fullItem.RFIDNumber || item.RFIDNumber) returnItem.RFIDCode = fullItem.RFIDNumber || item.RFIDNumber || '';
        if (fullItem.TIDNumber) returnItem.TIDNumber = fullItem.TIDNumber;
        if (fullItem.BranchId) returnItem.BranchId = parseInt(fullItem.BranchId) || 0;
        if (fullItem.CounterId) returnItem.CounterId = parseInt(fullItem.CounterId) || 0;
        if (fullItem.BranchName) returnItem.BranchName = fullItem.BranchName;
        if (fullItem.CounterName) returnItem.CounterName = fullItem.CounterName;
        if (fullItem.CategoryName || item.category_id) returnItem.CategoryName = fullItem.CategoryName || item.category_id || '';
        if (fullItem.ProductName || item.product_id) returnItem.ProductName = fullItem.ProductName || item.product_id || '';
        if (fullItem.DesignName || item.design_id) returnItem.DesignName = fullItem.DesignName || item.design_id || '';
        if (fullItem.PurityName || item.purity_id) returnItem.PurityName = fullItem.PurityName || item.purity_id || '';
        if (fullItem.FinePercent || item.FinePercent) {
          const finePercent = fullItem.FinePercent || item.FinePercent;
          if (finePercent !== null && finePercent !== undefined) returnItem.FinePercent = finePercent;
        }
        if (fullItem.WastagePercent || item.WastagePercent) {
          const wastagePercent = fullItem.WastagePercent || item.WastagePercent;
          if (wastagePercent !== null && wastagePercent !== undefined) returnItem.WastagePercent = wastagePercent;
        }
        if (fullItem.ClientCode) returnItem.ClientCode = fullItem.ClientCode;
        if (fullItem.Status) returnItem.Status = fullItem.Status;

        return returnItem;
      });

      const payload = {
        ClientCode: userInfo.ClientCode,
        CustomerId: parseInt(selectedCustomerId) || 0,
        SampleInNo: sampleInNumber,
        ReturnDate: formattedReturnDate || sampleInDate,
        Description: description || '',
        SampleStatus: 'SampleIn',
        CustomerIssueId: parseInt(selectedSampleOutId) || 0,
        Quantity: totalQuantity,
        TotalDiamondWeight: totalDiamondWeight,
        TotalGrossWt: totalGrossWt,
        TotalNetWt: totalNetWt,
        TotalStoneWeight: totalStoneWeight,
        TotalWt: totalWt,
        ReturnItems: returnItems
      };

      Object.keys(payload).forEach(key => {
        if (payload[key] === null || payload[key] === '' || payload[key] === undefined) {
          delete payload[key];
        }
      });

      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };

      // Use similar API endpoint - may need to adjust based on actual API
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/Transaction/AddCustomerReturn',
        payload,
        { headers }
      );

      if (response.data?.Status === 400 || response.data?.status === 400) {
        throw new Error(response.data?.Message || response.data?.message || 'Failed to create sample in');
      }

      const selectedCustomer = customerList.find(c => c.Id == selectedCustomerId || c.Id === selectedCustomerId);
      const customerName = selectedCustomer 
        ? (selectedCustomer.FirstName 
          ? `${selectedCustomer.FirstName}${selectedCustomer.LastName ? ' ' + selectedCustomer.LastName : ''}`
          : selectedCustomer.Name || selectedCustomer.CustomerName || 'Unknown')
        : 'Customer';

      setSuccessData({
        sampleInNo: sampleInNumber,
        customerName: customerName
      });
      setShowSuccessModal(true);

      setTimeout(() => {
        setSampleInItems([]);
        setCustomerSearch('');
        setSelectedCustomerId('');
        setCustomerMobile('');
        setFineGold('0.000');
        setBalanceAmount('0.000');
        setFinePercent('0.00');
        setSampleOutSearch('');
        setSelectedSampleOutId(null);
        setSelectedSampleOutData(null);
        setReturnDate('');
        setDescription('');
        fetchSampleInNumber();
      }, 2000);

    } catch (error) {
      console.error('Error creating sample in:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.Message || error.response?.data?.message || error.message || 'Failed to create sample in. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(sampleInItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = sampleInItems.slice(startIndex, endIndex);

  const isSmallScreen = windowWidth <= 768;

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

    sampleInItems.forEach(item => {
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
      if (sampleInItems.length === 0) {
        addNotification({
          type: 'error',
          message: 'No items to export',
          duration: 3000
        });
        return;
      }

      const totals = calculateTotals();
      const exportData = sampleInItems.map((item, index) => ({
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
      XLSX.utils.book_append_sheet(wb, ws, 'Sample In Items');
      
      const fileName = `SampleIn_${sampleInNumber || 'Items'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      addNotification({
        type: 'success',
        message: `Sample In items exported to ${fileName} successfully`,
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
      if (sampleInItems.length === 0) {
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
      doc.text('Sample In Items', 15, 20);
      doc.setFontSize(10);
      doc.text(`Sample In No: ${sampleInNumber || 'N/A'}`, 15, 28);
      doc.text(`Date: ${sampleInDate}`, 15, 34);
      doc.text(`Customer: ${customerName || 'N/A'}`, 15, 40);
      doc.text(`Total Items: ${sampleInItems.length}`, 15, 46);

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

      const tableData = sampleInItems.map((item, index) => [
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
        startY: 52,
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

      const fileName = `SampleIn_${sampleInNumber || 'Items'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      addNotification({
        type: 'success',
        message: `Sample In items exported to ${fileName} successfully`,
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
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          * { box-sizing: border-box; }
        }
      `}</style>
      
      {/* Top Header */}
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
            Sample In
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: isSmallScreen ? '11px' : '12px', color: '#64748b', fontWeight: 600 }}>Sample In No:</span>
            <span style={{ fontSize: isSmallScreen ? '12px' : '13px', color: '#1e293b', fontWeight: 600 }}>
              {sampleInNumber || 'Auto-generated'}
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
                value={sampleInDate}
                onChange={(e) => setSampleInDate(e.target.value)}
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
          {sampleInItems.length > 0 && (
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
                             data-dropdown-item="true"
                             onMouseDown={(e) => {
                               e.preventDefault(); // Prevent input blur from firing before selection
                               handleCustomerSelect(customer);
                             }}
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
                  outline: 'none',
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

        {/* Sample Out Selection, Return Date, Description and Item Code Search */}
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
            gridTemplateColumns: isSmallScreen ? '1fr' : windowWidth <= 1024 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
            gap: isSmallScreen ? '10px' : '12px' 
          }}>
            {/* Sample Out Selection */}
            <div ref={sampleOutDropdownRef} style={{ position: 'relative' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#475569', 
                marginBottom: '4px' 
              }}>
                Select Sample Out<span style={{ color: '#ef4444' }}>*</span>
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
                  placeholder={!selectedCustomerId ? "Select customer first..." : "Type Sample Out No to search..."}
                  value={sampleOutSearch}
                  onChange={(e) => {
                    setSampleOutSearch(e.target.value);
                    setSelectedSampleOutId(null);
                    setSelectedSampleOutData(null);
                    setShowSampleOutDropdown(true);
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    // Show dropdown if there are sample outs available
                    if (sampleOutList.length > 0) {
                      setShowSampleOutDropdown(true);
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                  }}
                  disabled={loadingSampleOuts || !selectedCustomerId}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    fontSize: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    background: loadingSampleOuts || !selectedCustomerId ? '#f9fafb' : '#ffffff',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                />
                {loadingSampleOuts && (
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
                {showSampleOutDropdown && !loadingSampleOuts && (
                  filteredSampleOuts.length > 0 ? (
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
                    borderTop: '2px solid #10b981'
                  }}>
                    {filteredSampleOuts.map((sampleOut, idx) => {
                      // Handle both string and object formats
                      let sampleOutNo, customerNameDisplay;
                      if (typeof sampleOut === 'string') {
                        sampleOutNo = sampleOut;
                        customerNameDisplay = customerName || 'Customer';
                      } else {
                        sampleOutNo = sampleOut.SampleOutNo || sampleOut.SampleOutNumber || 'N/A';
                        customerNameDisplay = sampleOut.CustomerName || 
                          (sampleOut.Customer?.FirstName 
                            ? `${sampleOut.Customer.FirstName}${sampleOut.Customer.LastName ? ' ' + sampleOut.Customer.LastName : ''}`
                            : customerName || 'Unknown');
                      }
                      
                      return (
                        <div
                          key={typeof sampleOut === 'string' ? sampleOut : (sampleOut.Id || sampleOut.CustomerIssueId || idx)}
                          onClick={() => handleSampleOutSelect(sampleOut)}
                          style={{
                            padding: '12px 14px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            borderBottom: idx < filteredSampleOuts.length - 1 ? '1px solid #f1f5f9' : 'none',
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
                            marginBottom: typeof sampleOut === 'string' ? '0' : '4px',
                            fontSize: '13px',
                            lineHeight: '1.4'
                          }}>
                            {sampleOutNo}
                          </div>
                          {typeof sampleOut !== 'string' && (
                            <div style={{ 
                              color: '#64748b', 
                              fontSize: '11px',
                              fontWeight: 400
                            }}>
                              Customer: {customerNameDisplay}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  ) : (
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
                      padding: '16px',
                      zIndex: 1000,
                      borderTop: '2px solid #10b981',
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: '12px'
                    }}>
                      {!selectedCustomerId 
                        ? 'Please select a customer first' 
                        : sampleOutList.length === 0 
                          ? 'No sample outs found for this customer' 
                          : 'No matching sample outs found'}
                    </div>
                  )
                )}
              </div>
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
                     maxHeight: '300px',
                     overflowY: 'auto',
                     zIndex: 1000,
                     borderTop: '2px solid #3b82f6'
                   }}>
                     {searchResults.map((item, idx) => (
                       <div
                         key={item.LabelledStockId || item.Id || idx}
                         onClick={() => selectItemFromSearch(item)}
                         style={{
                           padding: '12px 14px',
                           cursor: 'pointer',
                           fontSize: '12px',
                           borderBottom: idx < searchResults.length - 1 ? '1px solid #f1f5f9' : 'none',
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
                           fontSize: '13px'
                         }}>
                           {item.Itemcode || item.ItemCode || 'N/A'}
                         </div>
                         <div style={{ 
                           color: '#64748b', 
                           fontSize: '11px',
                           display: 'flex',
                           gap: '12px',
                           flexWrap: 'wrap'
                         }}>
                           <span>{item.CategoryName || item.Category || ''}</span>
                           <span>{item.ProductName || item.Product || ''}</span>
                           <span>{item.PurityName || item.Purity || ''}</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
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
            Sample In Items
          </h3>

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
          {sampleInItems.length > itemsPerPage && (
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
        </div>

        {/* Submit Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          marginTop: '12px'
        }}>
          <button
            type="button"
            onClick={() => navigate('/sample-out-list')}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSampleIn}
            disabled={loading || sampleInItems.length === 0}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              background: loading || sampleInItems.length === 0 
                ? '#cbd5e1' 
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              cursor: loading || sampleInItems.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading || sampleInItems.length === 0 
                ? 'none' 
                : '0 2px 4px rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!loading && sampleInItems.length > 0) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && sampleInItems.length > 0) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {loading ? (
              <>
                <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                Processing...
              </>
            ) : (
              <>
                <FaCheckCircle />
                Submit Sample In
              </>
            )}
          </button>
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
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              margin: '0 auto 16px'
            }}>
              <FaCheckCircle style={{ fontSize: '32px', color: '#ffffff' }} />
            </div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: 700,
              color: '#1e293b',
              textAlign: 'center'
            }}>
              Sample In Created Successfully!
            </h3>
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '14px',
              color: '#64748b',
              textAlign: 'center'
            }}>
              Sample In No: <strong>{successData.sampleInNo}</strong>
              <br />
              Customer: <strong>{successData.customerName}</strong>
            </p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/sample-out-list');
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleIn;

