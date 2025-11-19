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
  FaFileExport,
  FaFilePdf,
  FaFileInvoice,
  FaSync,
  FaEye,
  FaEdit,
  FaDownload,
  FaTimes
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useTranslation } from '../../hooks/useTranslation';
import { useLoading } from '../../App';

const InvoiceStock = () => {
  const { t } = useTranslation();
  const { loading, setLoading } = useLoading();
  
  // State Management
  const [invoiceData, setInvoiceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [clientCode, setClientCode] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const searchTimeoutRef = useRef(null);

  // Filter States
  const [filters, setFilters] = useState({
    branch: 'All',
    counter: 'All',
    box: 'All',
    category: 'All',
    product: 'All',
    status: 'All',
    dateFrom: '',
    dateTo: ''
  });

  const [filterOptions, setFilterOptions] = useState({
    branches: ['All'],
    counters: ['All'],
    boxes: ['All'],
    categories: ['All'],
    products: ['All'],
    statuses: ['All', 'Sold', 'Pending', 'Cancelled']
  });

  // Table Columns Configuration
  const columns = [
    { key: 'srNo', label: t('invoiceStock.srNo'), width: '60px', sortable: false },
    { key: 'CounterName', label: t('invoiceStock.counterName'), width: '120px', sortable: true },
    { key: 'ItemCode', label: t('invoiceStock.itemCode'), width: '120px', sortable: true },
    { key: 'RFIDCode', label: t('invoiceStock.rfidCode'), width: '140px', sortable: true },
    { key: 'SKU', label: t('invoiceStock.sku'), width: '120px', sortable: true },
    { key: 'ProductName', label: t('invoiceStock.productName'), width: '180px', sortable: true },
    { key: 'CategoryName', label: t('invoiceStock.categoryName'), width: '120px', sortable: true },
    { key: 'Design', label: t('invoiceStock.design'), width: '120px', sortable: true },
    { key: 'Purity', label: t('invoiceStock.purity'), width: '100px', sortable: true },
    { key: 'GrossWt', label: t('invoiceStock.grossWt'), width: '100px', sortable: true },
    { key: 'StoneWt', label: t('invoiceStock.stoneWt'), width: '100px', sortable: true },
    { key: 'StonePcs', label: t('invoiceStock.stonePcs'), width: '100px', sortable: true },
    { key: 'DiamondWt', label: t('invoiceStock.diamondWt'), width: '100px', sortable: true },
    { key: 'DiamondPcs', label: t('invoiceStock.diamondPcs'), width: '100px', sortable: true },
    { key: 'NetWt', label: t('invoiceStock.netWt'), width: '100px', sortable: true },
    { key: 'Pieces', label: t('invoiceStock.pieces'), width: '80px', sortable: true },
    { key: 'StoneAmt', label: t('invoiceStock.stoneAmt'), width: '100px', sortable: true },
    { key: 'FixedWastage', label: t('invoiceStock.fixedWastage'), width: '120px', sortable: true },
    { key: 'FixedAmt', label: t('invoiceStock.fixedAmt'), width: '100px', sortable: true },
    { key: 'BoxName', label: t('invoiceStock.boxName'), width: '120px', sortable: true },
    { key: 'Vendor', label: t('invoiceStock.vendor'), width: '120px', sortable: true },
    { key: 'BranchName', label: t('invoiceStock.branchName'), width: '120px', sortable: true },
    { key: 'CreatedDate', label: t('invoiceStock.createdDate'), width: '120px', sortable: true },
    { key: 'PackingWeight', label: t('invoiceStock.packingWeight'), width: '120px', sortable: true },
    { key: 'TotalWeight', label: t('invoiceStock.totalWeight'), width: '120px', sortable: true },
    { key: 'Status', label: t('common.status'), width: '100px', sortable: true },
    { key: 'actions', label: t('common.actions'), width: '120px', sortable: false }
  ];

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get Client Code from localStorage
  useEffect(() => {
    const getUserInfo = () => {
      try {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
          const parsed = JSON.parse(userInfo);
          if (parsed.ClientCode) {
            setClientCode(parsed.ClientCode);
            return;
          }
        }

        const token = localStorage.getItem('token');
        if (token) {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const decoded = JSON.parse(window.atob(base64));
          if (decoded.ClientCode) {
            setClientCode(decoded.ClientCode);
          } else {
            setError('Client code not found. Please login again.');
          }
        } else {
          setError('No authentication found. Please login again.');
        }
      } catch (err) {
        console.error('Error getting client code:', err);
        setError('Error loading user information');
      }
    };

    getUserInfo();
  }, []);

  // Fetch Invoice Data
  useEffect(() => {
    if (clientCode) {
      fetchInvoiceData(currentPage, itemsPerPage, searchQuery);
    }
  }, [clientCode, currentPage, itemsPerPage]);

  const fetchInvoiceData = async (page = currentPage, pageSize = itemsPerPage, search = searchQuery) => {
    try {
      setLoading(true);
      setError(null);

      if (!clientCode) {
        throw new Error('Client code not found. Please login again.');
      }

      const requestBody = {
        ClientCode: clientCode,
        Status: "Sold",
        PageNumber: page,
        PageSize: pageSize,
        SearchQuery: search && search.trim() !== '' ? search.trim() : ""
      };

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllLabeledStock',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      let data = [];
      let total = 0;

      // Handle different response structures
      if (Array.isArray(response.data)) {
        data = response.data;
        total = response.data.length;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        data = response.data.data;
        total = response.data.data.length;
      } else if (response.data.data && response.data.data.data && Array.isArray(response.data.data.data)) {
        data = response.data.data.data;
        total = response.data.data.totalRecords || response.data.data.data.length;
      } else if (response.data.success && response.data.data && Array.isArray(response.data.data)) {
        data = response.data.data;
        total = response.data.data.length;
      } else {
        data = response.data || [];
        total = data.length;
      }

             // Transform data to include calculated fields
       const transformedData = data.map((item, index) => ({
         ...item,
         srNo: index + 1,
         CounterName: item.CounterName || 'N/A',
         ItemCode: item.ItemCode || item.SKU || 'N/A',
         RFIDCode: item.RFIDCode || 'N/A',
         SKU: item.SKU || item.ItemCode || 'N/A',
         ProductName: item.ProductName || 'N/A',
         CategoryName: item.CategoryName || 'N/A',
         Design: item.Design || item.DesignName || 'N/A',
         Purity: item.Purity || '0.000',
         GrossWt: item.GrossWt || item.GrossWeight || '0.000',
         // Map stone fields from API response
         StoneWt: item.TotalStoneWeight !== undefined && item.TotalStoneWeight !== null ? item.TotalStoneWeight : (item.StoneWt || item.StoneWeight || ''),
         StonePcs: item.TotalStonePieces !== undefined && item.TotalStonePieces !== null ? item.TotalStonePieces : (item.StonePcs || item.StonePieces || ''),
         StoneAmt: item.TotalStoneAmount !== undefined && item.TotalStoneAmount !== null ? item.TotalStoneAmount : (item.StoneAmt || item.StoneAmount || ''),
         // Map diamond fields from API response
         DiamondWt: item.TotalDiamondWeight !== undefined && item.TotalDiamondWeight !== null ? item.TotalDiamondWeight : (item.DiamondWt || item.DiamondWeight || ''),
         DiamondPcs: item.TotalDiamondPieces !== undefined && item.TotalDiamondPieces !== null ? item.TotalDiamondPieces : (item.DiamondPcs || item.DiamondPieces || ''),
         DiamondAmount: item.TotalDiamondAmount !== undefined && item.TotalDiamondAmount !== null ? item.TotalDiamondAmount : (item.DiamondAmount || ''),
         // Map making and hallmark fields
         MakingFixedAmt: item.MakingFixedAmt !== undefined && item.MakingFixedAmt !== null ? item.MakingFixedAmt : (item.MakingFixedAmt || ''),
         HallmarkAmount: item.HallmarkAmount !== undefined && item.HallmarkAmount !== null ? item.HallmarkAmount : (item.HallmarkAmount || ''),
         MakingPerGram: item.MakingPerGram !== undefined && item.MakingPerGram !== null ? item.MakingPerGram : (item.MakingPerGram || ''),
         MakingPercentage: item.MakingPercentage !== undefined && item.MakingPercentage !== null ? item.MakingPercentage : (item.MakingPercentage || ''),
         FixedWastage: item.MakingFixedWastage !== undefined && item.MakingFixedWastage !== null ? item.MakingFixedWastage : (item.FixedWastage || ''),
         FixedAmt: item.MakingFixedAmt !== undefined && item.MakingFixedAmt !== null ? item.MakingFixedAmt : (item.FixedAmt || item.FixedAmount || ''),
         // Map other fields
         NetWt: item.NetWt || item.NetWeight || '0.000',
         Pieces: item.Pieces || '',
         BoxName: item.BoxName || '',
         Vendor: item.VendorName || item.Vendor || '',
         BranchName: item.BranchName || item.Branch || '',
         CreatedDate: item.CreatedOn || item.CreatedDate || item.InvoiceDate || new Date().toISOString().split('T')[0],
         PackingWeight: item.PackingWeight !== undefined && item.PackingWeight !== null ? item.PackingWeight : (item.PackingWeight || ''),
         TotalWeight: item.TotalWeight !== undefined && item.TotalWeight !== null ? item.TotalWeight : (item.TotalWeight || item.GrossWt || '0.000'),
         Status: item.Status || 'Sold'
       }));

      setInvoiceData(transformedData);
      setFilteredData(transformedData);
      setTotalRecords(total);
      setTotalPages(Math.ceil(total / pageSize));
      setCurrentPage(page);

      // Update filter options
      updateFilterOptions(transformedData);

    } catch (error) {
      console.error('Error fetching invoice data:', error);
      setError('Failed to fetch invoice data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFilterOptions = (data) => {
    const branches = [...new Set(data.map(item => item.BranchName).filter(Boolean))];
    const counters = [...new Set(data.map(item => item.CounterName).filter(Boolean))];
    const boxes = [...new Set(data.map(item => item.BoxName).filter(Boolean))];
    const categories = [...new Set(data.map(item => item.CategoryName).filter(Boolean))];
    const products = [...new Set(data.map(item => item.ProductName).filter(Boolean))];

    setFilterOptions({
      branches: ['All', ...branches],
      counters: ['All', ...counters],
      boxes: ['All', ...boxes],
      categories: ['All', ...categories],
      products: ['All', ...products],
      statuses: ['All', 'Sold', 'Pending', 'Cancelled']
    });
  };

  // Sorting Logic
  const sortedData = useMemo(() => {
    let sortableData = [...filteredData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [filteredData, sortConfig]);

  // Pagination Logic
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  // Event Handlers
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    // Debounce search - fetch after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      fetchInvoiceData(1, itemsPerPage, value);
    }, 500);
  };

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const handleRowSelection = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(currentItems.map(item => item.Id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    let filtered = [...invoiceData];

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(item =>
        Object.values(item).some(val =>
          val && val.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply filters
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'All') {
        filtered = filtered.filter(item => {
          const itemValue = item[key.replace(/([A-Z])/g, '$1')] || item[key];
          return itemValue === filters[key];
        });
      }
    });

    setFilteredData(filtered);
    setCurrentPage(1);
    setShowFilterPanel(false);
  };

  const handleResetFilters = () => {
    setFilters({
      branch: 'All',
      counter: 'All',
      box: 'All',
      category: 'All',
      product: 'All',
      status: 'All',
      dateFrom: '',
      dateTo: ''
    });
    setSearchQuery('');
    setFilteredData(invoiceData);
    setCurrentPage(1);
    setShowFilterPanel(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchInvoiceData();
    setIsRefreshing(false);
  };

  const handleViewDetails = (item) => {
    setSelectedInvoice(item);
    setShowDetailsModal(true);
  };

  const handleExportToExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(currentItems);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Invoice Stock');
      XLSX.writeFile(wb, `invoice_stock_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  const handleExportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Invoice Stock Report', 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
      doc.text(`Total Records: ${currentItems.length}`, 14, 40);

      // Create table
      const tableData = currentItems.map((item, index) => [
        index + 1,
        item.InvoiceNo,
        item.CustomerName,
        item.ProductName,
        item.NetWt,
        item.GrossWt,
        item.Pieces,
        item.Amount,
        item.Status
      ]);

      doc.autoTable({
        startY: 50,
        head: [['Sr.', 'Invoice No.', 'Customer', 'Product', 'Net Wt', 'Gross Wt', 'Pieces', 'Amount', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 }
      });

      doc.save(`invoice_stock_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    }
  };

  const handleDelete = async () => {
    if (selectedItems.length === 0) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleteLoading(true);
      setShowDeleteModal(false);
      
      const response = await axios.delete(
        'https://soni.loyalstring.co.in/api/ProductMaster/DeleteAllSoldStockForClient',
        {
          data: {
            ClientCode: clientCode
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        // Refresh the data after successful deletion
        await fetchInvoiceData();
        setSelectedItems([]);
        // Show success notification instead of alert
        // You can replace this with your notification system
        alert('Selected items deleted successfully!');
      } else {
        throw new Error('Failed to delete items');
      }
    } catch (error) {
      console.error('Error deleting items:', error);
      alert('Failed to delete items. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };


  // Error State
  if (error) {
    return (
      <div className="container-fluid p-3">
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <FaExclamationTriangle className="me-2" />
          <div>{error}</div>
        </div>
      </div>
    );
  }

  // Pagination helper
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
  
  const generatePagination = () => {
    const pages = [];
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    if (startPage > 1) pages.push(1, "...");
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    if (endPage < totalPages) pages.push("...", totalPages);
    
    return pages;
  };

  const handleItemsPerPageChange = (newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
    fetchInvoiceData(1, newSize, searchQuery);
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '16px' }}>
      {/* Global Loading Overlay */}
      {(loading || isRefreshing) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(255, 255, 255, 0.9)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <FaSpinner style={{ fontSize: '32px', color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
        </div>
      )}

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
          gap: '12px'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: '#1e293b',
              lineHeight: '1.2'
            }}>Invoice Stock</h2>
          </div>
          <div style={{
            fontSize: '12px',
            color: '#64748b',
            fontWeight: 600
          }}>
            Total: {totalRecords} records
          </div>
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          marginTop: '16px',
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
              placeholder="Search by Product Name, Item Code, SKU..."
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
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          {/* Action Buttons */}
          <button
            onClick={handleDelete}
            disabled={selectedItems.length === 0}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid #ef4444',
              background: selectedItems.length === 0 ? '#f1f5f9' : '#ffffff',
              color: selectedItems.length === 0 ? '#94a3b8' : '#ef4444',
              cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (selectedItems.length > 0) {
                e.target.style.background = '#ef4444';
                e.target.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedItems.length > 0) {
                e.target.style.background = '#ffffff';
                e.target.style.color = '#ef4444';
              }
            }}
          >
            <FaTrash /> Delete
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid #3b82f6',
              background: '#ffffff',
              color: '#3b82f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#3b82f6';
              e.target.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#ffffff';
              e.target.style.color = '#3b82f6';
            }}
          >
            <FaFileExport /> Export
          </button>
          <button
            onClick={() => setShowFilterPanel(true)}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid #10b981',
              background: '#ffffff',
              color: '#10b981',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
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
            <FaFilter /> Filter
          </button>
          <button
            onClick={handleRefresh}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid #64748b',
              background: '#ffffff',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#64748b';
              e.target.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#ffffff';
              e.target.style.color = '#64748b';
            }}
          >
            <FaSync /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Slider - Right Side */}
      {showFilterPanel && (
        <>
          <div 
            onClick={() => setShowFilterPanel(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              animation: 'fadeIn 0.3s ease'
            }}
          />
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: windowWidth <= 768 ? '100%' : '400px',
            maxWidth: '90vw',
            height: '100vh',
            background: '#ffffff',
            boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInRight 0.3s ease',
            overflowY: 'auto'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaFilter style={{ color: '#ffffff', fontSize: '16px' }} />
                <h6 style={{
                  margin: 0,
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#ffffff'
                }}>Filter Options</h6>
              </div>
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
            <div style={{ padding: '20px', flex: 1 }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px'
                  }}>Branch Name</label>
                  <select 
                    value={filters.branch} 
                    onChange={e => handleFilterChange('branch', e.target.value)}
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
                  >
                    {filterOptions.branches.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px'
                  }}>Counter Name</label>
                  <select 
                    value={filters.counter} 
                    onChange={e => handleFilterChange('counter', e.target.value)}
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
                  >
                    {filterOptions.counters.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px'
                  }}>Box Name</label>
                  <select 
                    value={filters.box} 
                    onChange={e => handleFilterChange('box', e.target.value)}
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
                  >
                    {filterOptions.boxes.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px'
                  }}>Category Name</label>
                  <select 
                    value={filters.category} 
                    onChange={e => handleFilterChange('category', e.target.value)}
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
                  >
                    {filterOptions.categories.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px'
                  }}>Product Name</label>
                  <select 
                    value={filters.product} 
                    onChange={e => handleFilterChange('product', e.target.value)}
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
                  >
                    {filterOptions.products.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px'
                  }}>Status</label>
                  <select 
                    value={filters.status} 
                    onChange={e => handleFilterChange('status', e.target.value)}
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
                  >
                    {filterOptions.statuses.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px'
                  }}>Date From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={e => handleFilterChange('dateFrom', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      outline: 'none',
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
                  }}>Date To</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={e => handleFilterChange('dateTo', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      outline: 'none',
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
                    transition: 'all 0.2s'
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
                  Reset
                </button>
                <button 
                  onClick={handleApplyFilters}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: 'none',
                    background: '#10b981',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#059669'}
                  onMouseLeave={(e) => e.target.style.background = '#10b981'}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </>
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
        <div style={{ overflowX: 'auto', overflowY: 'visible', width: '100%', maxWidth: '100%' }}>
          <table style={{ 
            width: '100%',
            minWidth: '2800px',
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
                  width: '40px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569'
                }}>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(currentItems.map(item => item.Id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                    checked={currentItems.length > 0 && selectedItems.length === currentItems.length}
                    style={{
                      cursor: 'pointer',
                      width: '16px',
                      height: '16px'
                    }}
                  />
                </th>
                {columns.filter(col => col.key !== 'Status' && col.key !== 'actions').map((column) => (
                  <th
                    key={column.key}
                    style={{
                      padding: '12px',
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
                      if (column.sortable !== false) {
                        const direction = sortConfig.key === column.key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                        setSortConfig({ key: column.key, direction });
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
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  position: 'sticky',
                  right: 0,
                  background: '#f8fafc',
                  zIndex: 10,
                  borderLeft: '2px solid #e5e7eb'
                }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item, index) => (
                <tr
                  key={item.Id || index}
                  onClick={() => handleRowSelection(item.Id)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid #e5e7eb',
                    background: selectedItems.includes(item.Id) 
                      ? '#eff6ff' 
                      : item.Status === 'Sold' 
                      ? '#fef2f2' 
                      : index % 2 === 0 
                      ? '#ffffff' 
                      : '#f8fafc',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedItems.includes(item.Id)) {
                      e.currentTarget.style.background = '#f1f5f9';
                      // Update sticky Status column background on hover
                      const statusCell = e.currentTarget.querySelector('td:last-child');
                      if (statusCell) {
                        statusCell.style.background = '#f1f5f9';
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedItems.includes(item.Id)) {
                      const bgColor = item.Status === 'Sold' 
                        ? '#fef2f2' 
                        : index % 2 === 0 
                        ? '#ffffff' 
                        : '#f8fafc';
                      e.currentTarget.style.background = bgColor;
                      // Update sticky Status column background on hover leave
                      const statusCell = e.currentTarget.querySelector('td:last-child');
                      if (statusCell) {
                        statusCell.style.background = bgColor;
                      }
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
                      checked={selectedItems.includes(item.Id)}
                      onChange={() => handleRowSelection(item.Id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        cursor: 'pointer',
                        width: '16px',
                        height: '16px'
                      }}
                    />
                  </td>
                  {columns.filter(col => col.key !== 'Status' && col.key !== 'actions').map(column => (
                    <td key={column.key} style={{
                      padding: '12px',
                      fontSize: '12px',
                      color: '#1e293b',
                      whiteSpace: 'nowrap'
                    }}>
                      {column.key === 'srNo' ? ((currentPage - 1) * itemsPerPage) + index + 1 : (() => {
                        const value = item[column.key];
                        if (value === undefined || value === null || value === '') return '';
                        if (['GrossWt', 'NetWt', 'StoneWt', 'DiamondWt', 'PackingWeight', 'TotalWeight'].includes(column.key)) {
                          const numValue = parseFloat(value);
                          return isNaN(numValue) ? value : numValue.toFixed(3);
                        }
                        if (['StoneAmt', 'FixedAmt'].includes(column.key)) {
                          const numValue = parseFloat(value);
                          return isNaN(numValue) ? value : numValue.toString();
                        }
                        if (column.key === 'CreatedDate' && value) {
                          try {
                            const date = new Date(value);
                            if (!isNaN(date.getTime())) {
                              return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            }
                          } catch (e) {
                          }
                        }
                        return value;
                      })()}
                    </td>
                  ))}
                  <td style={{
                    padding: '12px',
                    fontSize: '12px',
                    position: 'sticky',
                    right: 0,
                    background: selectedItems.includes(item.Id) 
                      ? '#eff6ff' 
                      : item.Status === 'Sold' 
                      ? '#fef2f2' 
                      : index % 2 === 0 
                      ? '#ffffff' 
                      : '#f8fafc',
                    zIndex: 5,
                    borderLeft: '2px solid #e5e7eb'
                  }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(item);
                      }}
                      style={{
                        padding: '4px 12px',
                        fontSize: '10px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid',
                        background: '#ffffff',
                        color: item.Status === 'Sold' ? '#ef4444' : (item.Status === 'ApiActive' ? '#3b82f6' : '#64748b'),
                        borderColor: item.Status === 'Sold' ? '#ef4444' : (item.Status === 'ApiActive' ? '#3b82f6' : '#64748b'),
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = item.Status === 'Sold' ? '#ef4444' : (item.Status === 'ApiActive' ? '#3b82f6' : '#64748b');
                        e.target.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#ffffff';
                        e.target.style.color = item.Status === 'Sold' ? '#ef4444' : (item.Status === 'ApiActive' ? '#3b82f6' : '#64748b');
                      }}
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
                fetchInvoiceData(newPage, itemsPerPage, searchQuery);
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
                    fetchInvoiceData(page, itemsPerPage, searchQuery);
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid',
                    background: currentPage === page ? '#3b82f6' : '#ffffff',
                    color: currentPage === page ? '#ffffff' : '#475569',
                    borderColor: currentPage === page ? '#3b82f6' : '#e2e8f0',
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
                fetchInvoiceData(newPage, itemsPerPage, searchQuery);
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Export Invoice Data</h5>
                <button type="button" className="btn-close" onClick={() => setShowExportModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">Choose your preferred export format:</p>
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-outline-success"
                    onClick={handleExportToExcel}
                  >
                    <FaFileExcel className="me-2" />
                    Export to Excel
                  </button>
                  <button 
                    className="btn btn-outline-danger"
                    onClick={handleExportToPDF}
                  >
                    <FaFilePdf className="me-2" />
                    Export to PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Styles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
          /* Header responsive */
          .invoice-stock-header {
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
          
          /* Table responsive - allow horizontal scroll */
          .table-container {
            overflow-x: auto !important;
          }
          
          table {
            font-size: 10px !important;
            min-width: 2400px !important;
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
        }
        
        @media (max-width: 480px) {
          /* Smaller fonts for mobile */
          h2 {
            font-size: 14px !important;
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
            min-width: 2000px !important;
          }
          
          th, td {
            padding: 6px 4px !important;
            font-size: 10px !important;
          }
        }
        
        /* Hide all scrollbars */
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        *::-webkit-scrollbar {
          display: none;
        }
        
        /* Ensure no horizontal scroll */
        body, html {
          overflow-x: hidden !important;
          max-width: 100vw !important;
        }
      `}</style>

      {/* Details Modal */}
      {showDetailsModal && selectedInvoice && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Invoice Details</h5>
                <button type="button" className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="fw-bold">Invoice Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><td><strong>Invoice No:</strong></td><td>{selectedInvoice.InvoiceNo}</td></tr>
                        <tr><td><strong>Date:</strong></td><td>{selectedInvoice.InvoiceDate}</td></tr>
                        <tr><td><strong>Customer:</strong></td><td>{selectedInvoice.CustomerName}</td></tr>
                        <tr><td><strong>Status:</strong></td><td>
                          <span className={`badge ${selectedInvoice.Status === 'Sold' ? 'bg-success' : 'bg-warning'}`}>
                            {selectedInvoice.Status}
                          </span>
                        </td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold">Product Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><td><strong>Item Code:</strong></td><td>{selectedInvoice.ItemCode}</td></tr>
                        <tr><td><strong>Product:</strong></td><td>{selectedInvoice.ProductName}</td></tr>
                        <tr><td><strong>Category:</strong></td><td>{selectedInvoice.CategoryName}</td></tr>
                        <tr><td><strong>RFID Code:</strong></td><td className="font-monospace">{selectedInvoice.RFIDCode}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-md-6">
                    <h6 className="fw-bold">Weight Details</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><td><strong>Net Weight:</strong></td><td>{selectedInvoice.NetWt} g</td></tr>
                        <tr><td><strong>Gross Weight:</strong></td><td>{selectedInvoice.GrossWt} g</td></tr>
                        <tr><td><strong>Pieces:</strong></td><td>{selectedInvoice.Pieces}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold">Pricing Details</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><td><strong>Rate:</strong></td><td>₹{selectedInvoice.Rate}</td></tr>
                        <tr><td><strong>Amount:</strong></td><td className="fw-bold">₹{selectedInvoice.Amount}</td></tr>
                        <tr><td><strong>Counter:</strong></td><td>{selectedInvoice.CounterName}</td></tr>
                        <tr><td><strong>Box:</strong></td><td>{selectedInvoice.BoxName}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>
                  Close
                </button>
                <button type="button" className="btn btn-primary" onClick={() => console.log('Print invoice:', selectedInvoice)}>
                  Print Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-danger text-white border-0">
                <div className="d-flex align-items-center">
                  <FaExclamationTriangle className="me-2" style={{ fontSize: '20px' }} />
                  <h5 className="modal-title mb-0 fw-bold">Confirm Deletion</h5>
                </div>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowDeleteModal(false)}
                ></button>
              </div>
              <div className="modal-body text-center py-4">
                <div className="mb-3">
                  <FaTrash className="text-danger mb-3" style={{ fontSize: '48px', opacity: '0.7' }} />
                </div>
                <h6 className="fw-bold text-dark mb-2">Are you sure you want to delete?</h6>
                <p className="text-muted mb-0">
                  This action will permanently delete <strong>{selectedItems.length}</strong> selected item{selectedItems.length > 1 ? 's' : ''} from the invoice stock.
                </p>
                <div className="alert alert-warning mt-3 mb-0" role="alert">
                  <small>
                    <FaExclamationTriangle className="me-1" />
                    <strong>Warning:</strong> This action cannot be undone.
                  </small>
                </div>
              </div>
              <div className="modal-footer border-0 justify-content-center gap-3 pb-4">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary px-4" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger px-4" 
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <FaSpinner className="fa-spin me-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FaTrash className="me-2" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceStock;
