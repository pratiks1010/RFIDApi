import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  FaSearch, 
  FaSpinner, 
  FaExclamationTriangle,
  FaSync,
  FaFileExcel,
  FaThLarge,
  FaThList
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { useLoading } from '../../App';
import { useNotifications } from '../../context/NotificationContext';

const PAGE_SIZE_OPTIONS = [500, 1000, 2000, 5000];
const DEFAULT_PAGE_SIZE = 500;

const OrderList = () => {
  // Global loader
  const { loading, setLoading } = useLoading();
  
  // State variables
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [userInfo, setUserInfo] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
  const isFetchingRef = useRef(false);
  
  const { addNotification } = useNotifications();

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
        setError(null);
      } catch (err) {
        console.error('Error parsing user info:', err);
        setError('Error loading user information');
      }
    } else {
      setError('No user information found. Please login again.');
    }
  }, []);

  // Initial data fetch when userInfo is loaded
  useEffect(() => {
    if (userInfo && userInfo.ClientCode) {
      // Only fetch if we haven't fetched yet or if itemsPerPage changed
      const fetchData = async () => {
        if (isFetchingRef.current) {
          return; // Prevent duplicate calls
        }
        try {
          await fetchOrders(1, itemsPerPage, '');
        } catch (err) {
          console.error('Error fetching orders:', err);
        }
      };
      fetchData();
    }
  }, [userInfo, itemsPerPage]);

  // Debounced search effect - only run when searchQuery changes (not on initial mount)
  useEffect(() => {
    // Skip if userInfo is not loaded yet or if this is the initial mount with empty search
    if (!userInfo || !userInfo.ClientCode) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (userInfo && userInfo.ClientCode) {
        setLoading(true);
        if (currentPage !== 1) {
          setCurrentPage(1);
        }
        fetchOrders(1, itemsPerPage, searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, userInfo, itemsPerPage]);

  const fetchOrders = async (page = currentPage, pageSize = itemsPerPage, search = searchQuery) => {
    // Prevent duplicate concurrent calls
    if (isFetchingRef.current) {
      return;
    }
    
    isFetchingRef.current = true;
    setLoading(true);
    
    try {
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
        setOrders([]);
        setTotalRecords(0);
        setTotalPages(0);
        return;
      }
      
      setError(null);

      const payload = {
        ClientCode: clientCode,
        PageNumber: page,
        PageSize: pageSize,
        SearchQuery: search && search.trim() !== '' ? search.trim() : ""
      };

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/Order/GetAllOrders',
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.Data) {
        const ordersData = Array.isArray(response.data.Data) ? response.data.Data : [];
        setOrders(ordersData);
        
        // Set pagination info if available
        if (response.data.TotalRecords !== undefined) {
          setTotalRecords(response.data.TotalRecords);
          const calculatedPages = Math.ceil(response.data.TotalRecords / pageSize);
          setTotalPages(calculatedPages || 1);
        } else {
          // Fallback: calculate from data length
          setTotalRecords(ordersData.length);
          setTotalPages(1);
        }
      } else if (Array.isArray(response.data)) {
        setOrders(response.data);
        setTotalRecords(response.data.length);
        setTotalPages(Math.ceil(response.data.length / pageSize) || 1);
      } else {
        setOrders([]);
        setTotalRecords(0);
        setTotalPages(0);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch orders');
      setOrders([]);
      setTotalRecords(0);
      setTotalPages(0);
      addNotification({
        type: 'error',
        message: 'Failed to fetch orders. Please try again.',
        duration: 5000
      });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Handle search with debouncing
  const handleSearchChange = (value) => {
    setSearchQuery(value);
  };

  // Pagination handlers
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    setLoading(true);
    fetchOrders(1, newItemsPerPage, searchQuery);
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

  const handleRefresh = async () => {
    // Reset the fetching ref to allow refresh even if stuck
    isFetchingRef.current = false;
    setLoading(true);
    await fetchOrders(currentPage, itemsPerPage, searchQuery);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  // Format number with 3 decimal places
  const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? value : numValue.toFixed(3);
  };

  // Format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? value : numValue.toFixed(2);
  };

  // Helper function to extract value from order object
  const getOrderValue = (order, key) => {
    switch(key) {
      case 'OrderNo':
        return order.OrderNo || order.OrderId || '-';
      case 'CustomerName':
        if (order.Customer) {
          const firstName = order.Customer.FirstName || '';
          const middleName = order.Customer.MiddleName || '';
          const lastName = order.Customer.LastName || '';
          return [firstName, middleName, lastName].filter(Boolean).join(' ').trim() || '-';
        }
        return '-';
      case 'Contact':
        return order.Customer?.Mobile || order.Customer?.Email || '-';
      case 'OrderRemark':
        return order.Remark || order.CustomOrderItem?.[0]?.Remark || '-';
      case 'Product':
        return order.CustomOrderItem?.[0]?.ProductName || '-';
      case 'NumberOfItems':
        return order.Qty || order.OrderCount || (order.CustomOrderItem?.length || 0);
      case 'GrossWt':
        return order.CustomOrderItem?.[0]?.GrossWt || order.CustomOrderItem?.[0]?.TotalWt || '0';
      case 'FineMetal':
        return order.TotalFineMetal || order.FineMetal || '0';
      case 'PaidMetal':
        return order.PaidMetal || '0';
      case 'BalanceMetal':
        return order.TotalBalanceMetal || order.BalanceMetal || '0';
      case 'GSTAmount':
        return order.TotalGSTAmount || order.GstAmount || '0';
      case 'TaxableAmount':
        return order.TaxableAmount || order.TaxableAmt || '0.00';
      case 'TotalAmount':
        return order.TotalAmount || order.TotalNetAmount || '0.00';
      case 'PaidAmount':
        return order.PaidAmount || order.PaidAmt || order.ReceivedAmount || '0.00';
      case 'BalanceAmount':
        return order.BalanceAmount || order.BalanceAmt || '0.00';
      case 'OrderStatus':
        return order.OrderStatus || '-';
      case 'Branch':
        return order.CustomOrderItem?.[0]?.BranchName || order.BranchId || '-';
      case 'Exhibition':
        return order.CustomOrderItem?.[0]?.Exhibition || '-';
      case 'OrderDate':
        return order.OrderDate || '-';
      case 'DeliveryDate':
        return order.CustomOrderItem?.[0]?.DeliverDate || order.CustomOrderItem?.[0]?.DeliveryDate || '-';
      case 'Image':
        return order.CustomOrderItem?.[0]?.Image || '';
      default:
        return order[key] || order[key.toLowerCase()] || '-';
    }
  };

  // Get image URL from order
  const getOrderImage = (order) => {
    const imageUrl = order.CustomOrderItem?.[0]?.Image || '';
    return imageUrl || null;
  };

  // Table columns
  const columns = [
    { key: 'OrderNo', label: 'Order No', width: '120px' },
    { key: 'CustomerName', label: 'Customer Name', width: '150px' },
    { key: 'Contact', label: 'Contact', width: '120px' },
    { key: 'OrderRemark', label: 'Order Remark', width: '150px' },
    { key: 'Product', label: 'Product', width: '150px' },
    { key: 'NumberOfItems', label: 'Number of Items', width: '120px' },
    { key: 'GrossWt', label: 'Gross Wt', width: '100px' },
    { key: 'FineMetal', label: 'Fine Metal', width: '100px' },
    { key: 'PaidMetal', label: 'Paid Metal', width: '100px' },
    { key: 'BalanceMetal', label: 'Balance Metal', width: '120px' },
    { key: 'GSTAmount', label: 'GST Amount', width: '120px' },
    { key: 'TaxableAmount', label: 'Taxable Amount', width: '130px' },
    { key: 'TotalAmount', label: 'Total Amount', width: '120px' },
    { key: 'PaidAmount', label: 'Paid Amount', width: '120px' },
    { key: 'BalanceAmount', label: 'Balance Amount', width: '130px' },
    { key: 'OrderStatus', label: 'Order Status', width: '120px' },
    { key: 'Branch', label: 'Branch', width: '120px' },
    { key: 'Exhibition', label: 'Exhibition', width: '120px' },
    { key: 'OrderDate', label: 'Order Date', width: '120px' },
    { key: 'DeliveryDate', label: 'Delivery Date', width: '120px' }
  ];

  // Calculate totals for summary row
  const calculateTotals = () => {
    const totals = {
      NumberOfItems: 0,
      GrossWt: 0,
      FineMetal: 0,
      PaidMetal: 0,
      BalanceMetal: 0,
      GSTAmount: 0,
      TaxableAmount: 0,
      TotalAmount: 0,
      PaidAmount: 0,
      BalanceAmount: 0
    };

    orders.forEach(order => {
      const numItems = parseFloat(getOrderValue(order, 'NumberOfItems')) || 0;
      const grossWt = parseFloat(getOrderValue(order, 'GrossWt')) || 0;
      const fineMetal = parseFloat(getOrderValue(order, 'FineMetal')) || 0;
      const paidMetal = parseFloat(getOrderValue(order, 'PaidMetal')) || 0;
      const balanceMetal = parseFloat(getOrderValue(order, 'BalanceMetal')) || 0;
      const gstAmount = parseFloat(getOrderValue(order, 'GSTAmount')) || 0;
      const taxableAmount = parseFloat(getOrderValue(order, 'TaxableAmount')) || 0;
      const totalAmount = parseFloat(getOrderValue(order, 'TotalAmount')) || 0;
      const paidAmount = parseFloat(getOrderValue(order, 'PaidAmount')) || 0;
      const balanceAmount = parseFloat(getOrderValue(order, 'BalanceAmount')) || 0;

      totals.NumberOfItems += numItems;
      totals.GrossWt += grossWt;
      totals.FineMetal += fineMetal;
      totals.PaidMetal += paidMetal;
      totals.BalanceMetal += balanceMetal;
      totals.GSTAmount += gstAmount;
      totals.TaxableAmount += taxableAmount;
      totals.TotalAmount += totalAmount;
      totals.PaidAmount += paidAmount;
      totals.BalanceAmount += balanceAmount;
    });

    return totals;
  };

  // Use orders directly since search is handled server-side
  const currentItems = orders;
  const effectiveTotalRecords = totalRecords;
  const effectiveTotalPages = totalPages;
  const totals = calculateTotals();

  // Export to Excel
  const handleExportToExcel = () => {
    try {
      if (orders.length === 0) {
        addNotification({
          type: 'error',
          message: 'No orders to export',
          duration: 3000
        });
        return;
      }

      const exportData = orders.map((order, index) => {
        const grossWt = parseFloat(getOrderValue(order, 'GrossWt')) || 0;
        const fineMetal = parseFloat(getOrderValue(order, 'FineMetal')) || 0;
        const paidMetal = parseFloat(getOrderValue(order, 'PaidMetal')) || 0;
        const balanceMetal = parseFloat(getOrderValue(order, 'BalanceMetal')) || 0;
        const gstAmount = parseFloat(getOrderValue(order, 'GSTAmount')) || 0;
        const taxableAmount = parseFloat(getOrderValue(order, 'TaxableAmount')) || 0;
        const totalAmount = parseFloat(getOrderValue(order, 'TotalAmount')) || 0;
        const paidAmount = parseFloat(getOrderValue(order, 'PaidAmount')) || 0;
        const balanceAmount = parseFloat(getOrderValue(order, 'BalanceAmount')) || 0;
        const numItems = parseFloat(getOrderValue(order, 'NumberOfItems')) || 0;

        return {
          'Sr No': index + 1,
          'Order No': getOrderValue(order, 'OrderNo'),
          'Customer Name': getOrderValue(order, 'CustomerName'),
          'Contact': getOrderValue(order, 'Contact'),
          'Order Remark': getOrderValue(order, 'OrderRemark'),
          'Product': getOrderValue(order, 'Product'),
          'Number of Items': numItems,
          'Gross Wt': grossWt,
          'Fine Metal': fineMetal,
          'Paid Metal': paidMetal,
          'Balance Metal': balanceMetal,
          'GST Amount': gstAmount,
          'Taxable Amount': taxableAmount,
          'Total Amount': totalAmount,
          'Paid Amount': paidAmount,
          'Balance Amount': balanceAmount,
          'Order Status': getOrderValue(order, 'OrderStatus'),
          'Branch': getOrderValue(order, 'Branch'),
          'Exhibition': getOrderValue(order, 'Exhibition'),
          'Order Date': getOrderValue(order, 'OrderDate'),
          'Delivery Date': getOrderValue(order, 'DeliveryDate')
        };
      });

      // Add summary row
      exportData.push({
        'Sr No': '',
        'Order No': '',
        'Customer Name': '',
        'Contact': '',
        'Order Remark': '',
        'Product': 'TOTAL',
        'Number of Items': totals.NumberOfItems,
        'Gross Wt': totals.GrossWt,
        'Fine Metal': totals.FineMetal,
        'Paid Metal': totals.PaidMetal,
        'Balance Metal': totals.BalanceMetal,
        'GST Amount': totals.GSTAmount,
        'Taxable Amount': totals.TaxableAmount,
        'Total Amount': totals.TotalAmount,
        'Paid Amount': totals.PaidAmount,
        'Balance Amount': totals.BalanceAmount,
        'Order Status': '',
        'Branch': '',
        'Exhibition': '',
        'Order Date': '',
        'Delivery Date': ''
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const colWidths = [
        { wch: 8 },   // Sr No
        { wch: 12 },  // Order No
        { wch: 20 },  // Customer Name
        { wch: 15 },  // Contact
        { wch: 20 },  // Order Remark
        { wch: 18 },  // Product
        { wch: 15 },  // Number of Items
        { wch: 12 },  // Gross Wt
        { wch: 12 },  // Fine Metal
        { wch: 12 },  // Paid Metal
        { wch: 14 },  // Balance Metal
        { wch: 12 },  // GST Amount
        { wch: 15 },  // Taxable Amount
        { wch: 12 },  // Total Amount
        { wch: 12 },  // Paid Amount
        { wch: 14 },  // Balance Amount
        { wch: 15 },  // Order Status
        { wch: 12 },  // Branch
        { wch: 12 },  // Exhibition
        { wch: 12 },  // Order Date
        { wch: 14 }   // Delivery Date
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      
      const fileName = `OrderList_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      addNotification({
        type: 'success',
        message: `Order list exported to ${fileName} successfully`,
        duration: 3000
      });
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      addNotification({
        type: 'error',
        message: 'Failed to export order list. Please try again.',
        duration: 3000
      });
    }
  };

  return (
    <div style={{
      padding: '20px',
      background: '#ffffff',
      minHeight: '100vh'
    }}>
      {/* Header with Search, Refresh, and Export */}
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
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 600,
            color: '#1e293b',
            flex: '0 0 auto'
          }}>
            Order List
          </h1>
          
          {/* Right Side: Search, Refresh, and Export */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            flex: '0 0 auto',
            marginLeft: 'auto'
          }}>
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
                placeholder="Search by Customer Name..."
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

            {/* Buttons Container */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
              minWidth: 'fit-content'
            }}>
              {/* View Toggle Buttons */}
              <div style={{
                display: 'flex',
                gap: '4px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '2px',
                background: '#f8fafc'
              }}>
                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: viewMode === 'table' ? '#ffffff' : 'transparent',
                    color: viewMode === 'table' ? '#3b82f6' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <FaThList />
                  <span>Table</span>
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: viewMode === 'card' ? '#ffffff' : 'transparent',
                    color: viewMode === 'card' ? '#3b82f6' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: viewMode === 'card' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <FaThLarge />
                  <span>Card</span>
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
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
                <span>Refresh</span>
              </button>

              {/* Export Button */}
              <button
                onClick={handleExportToExcel}
                disabled={orders.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #3b82f6',
                  background: '#ffffff',
                  color: '#3b82f6',
                  cursor: orders.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: orders.length === 0 ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (orders.length > 0) {
                    e.target.style.background = '#3b82f6';
                    e.target.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (orders.length > 0) {
                    e.target.style.background = '#ffffff';
                    e.target.style.color = '#3b82f6';
                  }
                }}
              >
                <FaFileExcel />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

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

      {/* Table or Card Container */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        marginTop: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        {viewMode === 'card' ? (
          /* Card Grid View */
          <div style={{
            padding: '16px',
            display: 'grid',
            gridTemplateColumns: windowWidth <= 768 
              ? '1fr' 
              : windowWidth <= 1024 
              ? 'repeat(2, 1fr)' 
              : 'repeat(5, 1fr)',
            gap: '12px'
          }}>
            {currentItems.length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                padding: '40px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '14px'
              }}>
                {loading ? 'Loading...' : 'No orders found'}
              </div>
            ) : (
              currentItems.map((order, index) => {
                const imageUrl = getOrderImage(order);
                return (
                  <div
                    key={order.Id || order.id || index}
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Image Section - Reduced height */}
                    <div style={{
                      width: '100%',
                      height: '120px',
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={getOrderValue(order, 'Product')}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{
                        display: imageUrl ? 'none' : 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        color: '#94a3b8',
                        fontSize: '12px'
                      }}>
                        No Image
                      </div>
                    </div>

                    {/* Details Section - Compact */}
                    <div style={{
                      padding: '12px',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      {/* Order No and Status */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '2px'
                      }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1e293b'
                        }}>
                          Order #{getOrderValue(order, 'OrderNo')}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '3px 6px',
                          borderRadius: '4px',
                          background: getOrderValue(order, 'OrderStatus') === 'CustomerReceived' ? '#d1fae5' : '#fef3c7',
                          color: getOrderValue(order, 'OrderStatus') === 'CustomerReceived' ? '#065f46' : '#92400e'
                        }}>
                          {getOrderValue(order, 'OrderStatus')}
                        </span>
                      </div>

                      {/* Customer and Contact Side by Side */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginBottom: '2px'
                      }}>
                        <div>
                          <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>CUSTOMER</span>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', marginTop: '1px' }}>
                            {getOrderValue(order, 'CustomerName')}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>CONTACT</span>
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>
                            {getOrderValue(order, 'Contact')}
                          </div>
                        </div>
                      </div>

                      {/* Product */}
                      <div style={{ marginBottom: '2px' }}>
                        <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>PRODUCT</span>
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>
                          {getOrderValue(order, 'Product')}
                        </div>
                      </div>

                      {/* Grid for weights and amounts */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        marginTop: '4px',
                        paddingTop: '6px',
                        borderTop: '1px solid #e5e7eb'
                      }}>
                        <div>
                          <span style={{ fontSize: '9px', color: '#64748b' }}>Items</span>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#1e293b' }}>
                            {getOrderValue(order, 'NumberOfItems')}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '9px', color: '#64748b' }}>Gross Wt</span>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#1e293b' }}>
                            {formatNumber(getOrderValue(order, 'GrossWt'))}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '9px', color: '#64748b' }}>Fine Metal</span>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#1e293b' }}>
                            {formatNumber(getOrderValue(order, 'FineMetal'))}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '9px', color: '#64748b' }}>Total Amount</span>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#10b981' }}>
                            ₹{formatCurrency(getOrderValue(order, 'TotalAmount'))}
                          </div>
                        </div>
                      </div>

                      {/* Dates and Branch Side by Side */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        marginTop: '2px',
                        paddingTop: '6px',
                        borderTop: '1px solid #e5e7eb'
                      }}>
                        <div>
                          <span style={{ fontSize: '9px', color: '#64748b' }}>Order Date</span>
                          <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>
                            {formatDate(getOrderValue(order, 'OrderDate'))}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '9px', color: '#64748b' }}>Delivery Date</span>
                          <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>
                            {formatDate(getOrderValue(order, 'DeliveryDate'))}
                          </div>
                        </div>
                      </div>

                      {/* Branch and Exhibition */}
                      {(getOrderValue(order, 'Branch') !== '-' || getOrderValue(order, 'Exhibition') !== '-') && (
                        <div style={{
                          marginTop: '2px',
                          paddingTop: '6px',
                          borderTop: '1px solid #e5e7eb',
                          fontSize: '9px',
                          color: '#64748b'
                        }}>
                          {getOrderValue(order, 'Branch') !== '-' && `Branch: ${getOrderValue(order, 'Branch')}`}
                          {getOrderValue(order, 'Branch') !== '-' && getOrderValue(order, 'Exhibition') !== '-' && ' • '}
                          {getOrderValue(order, 'Exhibition') !== '-' && `Exhibition: ${getOrderValue(order, 'Exhibition')}`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Table View */
          <div style={{ overflowX: 'auto', overflowY: 'visible', width: '100%', maxWidth: '100%' }}>
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
                  Sr No
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
                      width: column.width
                    }}
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
                    {loading ? 'Loading...' : 'No orders found'}
                  </td>
                </tr>
              ) : (
                currentItems.map((order, index) => (
                  <tr
                    key={order.Id || order.id || index}
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
                      const value = getOrderValue(order, column.key);
                      let displayValue = value;
                      
                      // Format based on column type
                      if (['GrossWt', 'FineMetal', 'PaidMetal', 'BalanceMetal'].includes(column.key)) {
                        displayValue = formatNumber(value);
                      } else if (['GSTAmount', 'TaxableAmount', 'TotalAmount', 'PaidAmount', 'BalanceAmount'].includes(column.key)) {
                        displayValue = formatCurrency(value);
                      } else if (['OrderDate', 'DeliveryDate'].includes(column.key)) {
                        displayValue = formatDate(value);
                      } else if (column.key === 'NumberOfItems') {
                        displayValue = value || '0';
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
                  {columns.map(column => {
                    let displayValue = '-';
                    
                    if (column.key === 'NumberOfItems') {
                      displayValue = totals.NumberOfItems.toString();
                    } else if (['GrossWt', 'FineMetal', 'PaidMetal', 'BalanceMetal'].includes(column.key)) {
                      displayValue = formatNumber(totals[column.key]);
                    } else if (['GSTAmount', 'TaxableAmount', 'TotalAmount', 'PaidAmount', 'BalanceAmount'].includes(column.key)) {
                      displayValue = formatCurrency(totals[column.key]);
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
            <span>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, effectiveTotalRecords)} of {effectiveTotalRecords} entries
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
                setLoading(true);
                fetchOrders(newPage, itemsPerPage, searchQuery);
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
                    setLoading(true);
                    fetchOrders(page, itemsPerPage, searchQuery);
                  }}
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
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() => {
                const newPage = Math.min(currentPage + 1, effectiveTotalPages);
                setCurrentPage(newPage);
                setLoading(true);
                fetchOrders(newPage, itemsPerPage, searchQuery);
              }}
              disabled={currentPage === effectiveTotalPages}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: currentPage === effectiveTotalPages ? '#f1f5f9' : '#ffffff',
                color: currentPage === effectiveTotalPages ? '#94a3b8' : '#475569',
                cursor: currentPage === effectiveTotalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
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

export default OrderList;

