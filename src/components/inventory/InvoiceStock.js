import React, { useState, useEffect, useMemo } from 'react';
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
  FaDownload
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useTranslation } from '../../hooks/useTranslation';

const InvoiceStock = () => {
  const { t } = useTranslation();
  
  // State Management
  const [invoiceData, setInvoiceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
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
      fetchInvoiceData();
    }
  }, [clientCode]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!clientCode) {
        throw new Error('Client code not found. Please login again.');
      }

      const requestBody = {
        ClientCode: clientCode,
        Status: "Sold"
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
      setTotalPages(Math.ceil(total / itemsPerPage));

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
  const handleSearch = (value) => {
    setSearchQuery(value);
    const filtered = invoiceData.filter(item =>
      Object.values(item).some(val =>
        val && val.toString().toLowerCase().includes(value.toLowerCase())
      )
    );
    setFilteredData(filtered);
    setCurrentPage(1);
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
      setLoading(true);
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
      setLoading(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="container-fluid p-3">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="text-center">
            <FaSpinner className="fa-spin mb-3" style={{ fontSize: '32px', color: '#3b82f6' }} />
            <p className="text-muted">{t('invoiceStock.loadingData')}</p>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="container-fluid p-3">
      <style>
        {`
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
          
          /* Action buttons container */
          .action-buttons-container {
            gap: 0.5rem !important;
            flex-wrap: wrap !important;
            overflow-x: visible;
            overflow-y: visible;
            padding-bottom: 0;
          }
          
          @media (max-width: 768px) {
            .action-buttons-container {
              flex-wrap: wrap !important;
              overflow-x: visible;
              overflow-y: visible;
              justify-content: flex-start;
            }
          }
          
          @media (max-width: 480px) {
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
          .table-responsive th:last-child,
          .table-responsive td:last-child {
            position: sticky;
            right: 0;
            background: white;
            z-index: 10;
            border-left: 2px solid #dee2e6;
          }
          .table-responsive th:last-child {
            background: #f8f9fa;
          }
          .table-responsive td:last-child {
            background: white;
          }
          .table-responsive tr:hover td:last-child {
            background: #f8f9fa;
          }
          .table-responsive tr.table-primary td:last-child {
            background: #cfe2ff;
          }
          .table-responsive tr.table-danger td:last-child {
            background: #f8d7da;
          }
          .table-responsive .btn-sm {
            font-size: 11px;
            padding: 0.25rem 0.5rem;
          }
        `}
      </style>
      {/* Global Loading Overlay */}
      {(loading || isRefreshing) && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
             style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', zIndex: 9999 }}>
          <FaSpinner className="fa-spin" style={{ fontSize: '32px', color: '#3b82f6' }} />
        </div>
      )}

      {/* Header Section - Title on left, Search on right */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body p-3">
          <div className="row align-items-start align-items-md-center">
            <div className="col-12 col-md-6 mb-3 mb-md-0">
              <div className="d-flex align-items-center">
                <div className="bg-warning rounded-3 p-2 me-3">
                  <FaFileInvoice className="text-white" style={{ fontSize: '20px' }} />
                </div>
                <div>
                  <h5 className="mb-1 fw-bold text-dark">{t('invoiceStock.title') || 'Invoice Stock'}</h5>
                  <p className="mb-0 text-muted small">{t('invoiceStock.description') || 'View and manage your invoice stock records'}</p>
                  <span className="badge bg-warning mt-1">{filteredData.length} {t('common.records') || 'records'}</span>
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
                    placeholder={t('invoiceStock.searchPlaceholder') || 'Search by Product Name, Item Code, SKU...'}
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
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
              onClick={handleDelete} 
              disabled={selectedItems.length === 0}
              className="btn btn-outline-danger btn-sm"
              title="Delete Selected"
            >
              <FaTrash className="me-1" /> Delete
            </button>
            <button 
              onClick={() => setShowExportModal(true)}
              className="btn btn-outline-primary btn-sm"
              title="Export Data"
            >
              <FaFileExport className="me-1" /> {t('common.export') || 'Export'}
            </button>
            <button 
              onClick={() => setShowFilterPanel(true)}
              className="btn btn-outline-success btn-sm"
              title="Filter Data"
            >
              <FaFilter className="me-1" /> {t('common.filter') || 'Filter'}
            </button>
            <button 
              onClick={handleRefresh}
              className="btn btn-outline-secondary btn-sm"
              title="Refresh Data"
            >
              <FaSync className="me-1" /> {t('common.refresh') || 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="card shadow-sm border-0 mb-3">
          <div className="card-header bg-light d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-bold">{t('invoiceStock.filterOptions')}</h6>
            <button type="button" className="btn-close" onClick={() => setShowFilterPanel(false)}></button>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label small fw-bold">{t('invoiceStock.branchName')}</label>
                <select 
                  className="form-select form-select-sm"
                  value={filters.branch} 
                  onChange={e => handleFilterChange('branch', e.target.value)}
                >
                  {filterOptions.branches.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">{t('invoiceStock.counterName')}</label>
                <select 
                  className="form-select form-select-sm"
                  value={filters.counter} 
                  onChange={e => handleFilterChange('counter', e.target.value)}
                >
                  {filterOptions.counters.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">{t('invoiceStock.boxName')}</label>
                <select 
                  className="form-select form-select-sm"
                  value={filters.box} 
                  onChange={e => handleFilterChange('box', e.target.value)}
                >
                  {filterOptions.boxes.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">{t('invoiceStock.categoryName')}</label>
                <select 
                  className="form-select form-select-sm"
                  value={filters.category} 
                  onChange={e => handleFilterChange('category', e.target.value)}
                >
                  {filterOptions.categories.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">{t('invoiceStock.productName')}</label>
                <select 
                  className="form-select form-select-sm"
                  value={filters.product} 
                  onChange={e => handleFilterChange('product', e.target.value)}
                >
                  {filterOptions.products.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">{t('common.status')}</label>
                <select 
                  className="form-select form-select-sm"
                  value={filters.status} 
                  onChange={e => handleFilterChange('status', e.target.value)}
                >
                  {filterOptions.statuses.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">{t('filters.from')}</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={filters.dateFrom}
                  onChange={e => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">{t('filters.to')}</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={filters.dateTo}
                  onChange={e => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-outline-secondary btn-sm" onClick={handleResetFilters}>
                {t('filters.reset')}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleApplyFilters}>
                {t('filters.apply')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="card shadow-sm border-0" style={{ marginTop: '24px' }}>
        <div className="card-body p-0">
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table table-hover table-sm mb-0" style={{ minWidth: '2800px' }}>
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      checked={currentItems.length > 0 && selectedItems.length === currentItems.length}
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
                  {currentItems.map((item, index) => (
                    <tr
                      key={item.Id || index}
                      className={
                        selectedItems.includes(item.Id)
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
                          checked={selectedItems.includes(item.Id)}
                          onChange={() => handleRowSelection(item.Id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      {columns.filter(col => col.key !== 'Status').map(column => (
                        <td key={column.key} className="text-nowrap">
                          {column.key === 'srNo' ? ((currentPage - 1) * itemsPerPage) + index + 1 : (item[column.key] !== undefined ? item[column.key] : '')}
                        </td>
                      ))}
                      <td>
                        <button 
                          className={`btn btn-sm ${
                            item.Status === 'ApiActive' ? 'btn-outline-primary' : 
                            item.Status === 'Sold' ? 'btn-outline-danger' : 
                            'btn-outline-secondary'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(item);
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
          <div className="d-flex justify-content-between align-items-center p-3 border-top" style={{ backgroundColor: '#f8f9fa' }}>
            <div className="small text-muted">
              Showing <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, totalRecords)}</strong> of <strong>{totalRecords}</strong> entries
            </div>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    style={{ 
                      backgroundColor: currentPage === 1 ? '#e9ecef' : 'white',
                      color: currentPage === 1 ? '#6c757d' : '#0d6efd',
                      border: '1px solid #dee2e6',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      borderRadius: '0.375rem',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Previous
                  </button>
                </li>
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{ 
                      backgroundColor: currentPage === totalPages ? '#e9ecef' : 'white',
                      color: currentPage === totalPages ? '#6c757d' : '#0d6efd',
                      border: '1px solid #dee2e6',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      borderRadius: '0.375rem',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
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
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger px-4" 
                  onClick={confirmDelete}
                  disabled={loading}
                >
                  {loading ? (
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
