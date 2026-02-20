import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  FaSave,
  FaList,
  FaTrash,
  FaCheckCircle,
  FaTimes,
  FaSearch,
  FaSpinner,
  FaArrowRight,
  FaArrowLeft
} from 'react-icons/fa';
import { useLoading } from '../../App';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { stockTransferService } from '../../services/stockTransferService';

const StockTransfer = () => {
  const { loading, setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Stock Type Selection
  const [selectedValue, setSelectedValue] = useState('labelled'); // 'labelled' or 'unlabelled'
  
  // Form Data
  const [formData, setFormData] = useState({
    StockTransferTypeName: '',
    Source: '',
    Destination: '',
    TransferDate: new Date().toISOString().split('T')[0],
    TransferByEmployee: '',
    TransferedToBranch: '',
    TransferToEmployee: '',
    StockTransferItems: []
  });

  // Sidebar state
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);

  // Filter Data
  const [filterData, setFilterData] = useState({
    CategoryName: '',
    ProductName: '',
    DesignName: '',
    PurityName: ''
  });

  // Master Data
  const [allCategories, setAllCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [allDesigns, setAllDesigns] = useState([]);
  const [allPurities, setAllPurities] = useState([]);
  const [branches, setBranches] = useState([]);
  const [counters, setCounters] = useState([]);
  const [packets, setPackets] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Transfer Type Options
  const [transferTypes, setTransferTypes] = useState([
    { Id: 1, TransferType: 'Branch To Branch' },
    { Id: 2, TransferType: 'Branch To Counter' },
    { Id: 3, TransferType: 'Branch To Packet' },
    { Id: 4, TransferType: 'Branch To Box' },
    { Id: 5, TransferType: 'Counter To Branch' },
    { Id: 6, TransferType: 'Counter To Counter' },
    { Id: 7, TransferType: 'Counter To Packet' },
    { Id: 8, TransferType: 'Counter To Box' },
    { Id: 9, TransferType: 'Packet To Branch' },
    { Id: 10, TransferType: 'Packet To Counter' },
    { Id: 11, TransferType: 'Packet To Packet' },
    { Id: 12, TransferType: 'Packet To Box' },
    { Id: 13, TransferType: 'Box To Branch' },
    { Id: 14, TransferType: 'Box To Counter' },
    { Id: 15, TransferType: 'Box To Packet' },
    { Id: 16, TransferType: 'Box To Box' }
  ]);

  // Dynamic Options based on Transfer Type
  const [fromOption, setFromOption] = useState([]);
  const [fromOptionKey, setFromOptionKey] = useState('');
  const [toOption, setToOption] = useState([]);
  const [toOptionKey, setToOptionKey] = useState('');

  // Stock Data
  const [tableData, setTableData] = useState([]); // Available stock
  const [transferredData, setTransferredData] = useState([]); // Selected for transfer
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Search/Scan
  const [searchCode, setSearchCode] = useState('');
  const searchInputRef = useRef(null);

  // Loading States
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingMasterData, setLoadingMasterData] = useState(false);

  // Calculate totals
  const [totalGrossWT, setTotalGrossWT] = useState(0);
  const [totalNetWT, setTotalNetWT] = useState(0);

  // Fetch user info
  useEffect(() => {
    try {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserInfo(parsed);
        setFormData(prev => ({
          ...prev,
          TransferByEmployee: parsed.EmployeeId || parsed.Id || ''
        }));
      }
    } catch (err) {
      console.error('Error parsing userInfo:', err);
    }
  }, []);

  // Fetch master data on mount
  useEffect(() => {
    if (userInfo?.ClientCode) {
      fetchMasterData();
    }
  }, [userInfo]);

  // Fetch stock data when filters or stock type changes
  useEffect(() => {
    if (userInfo?.ClientCode) {
      fetchStockData();
    }
  }, [selectedValue, filterData, userInfo]);

  // Update dynamic options when transfer type changes
  useEffect(() => {
    if (formData.StockTransferTypeName) {
      updateTransferOptions();
    }
  }, [formData.StockTransferTypeName, branches, counters, packets, boxes, employees]);

  // Calculate totals when transferred data changes
  useEffect(() => {
    const grossWT = transferredData.reduce((sum, item) => {
      return sum + (parseFloat(item.GrossWt || item.TotalGrossWt || 0));
    }, 0);
    const netWT = transferredData.reduce((sum, item) => {
      return sum + (parseFloat(item.NetWt || item.TotalNetWt || 0));
    }, 0);
    setTotalGrossWT(grossWT);
    setTotalNetWT(netWT);
  }, [transferredData]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch master data
  const fetchMasterData = async () => {
    if (!userInfo?.ClientCode) return;
    
    setLoadingMasterData(true);
    try {
      const [
        categories,
        products,
        designs,
        purities,
        branchesData,
        countersData,
        packetsData,
        boxesData,
        employeesData
      ] = await Promise.all([
        stockTransferService.getAllCategories(userInfo.ClientCode),
        stockTransferService.getAllProducts(userInfo.ClientCode),
        stockTransferService.getAllDesigns(userInfo.ClientCode),
        stockTransferService.getAllPurities(userInfo.ClientCode),
        stockTransferService.getAllBranches(userInfo.ClientCode),
        stockTransferService.getAllCounters(userInfo.ClientCode),
        stockTransferService.getAllPackets(userInfo.ClientCode),
        stockTransferService.getAllBoxes(userInfo.ClientCode),
        stockTransferService.getAllEmployees(userInfo.ClientCode)
      ]);

      setAllCategories(categories);
      setAllProducts(products);
      setAllDesigns(designs);
      setAllPurities(purities);
      setBranches(branchesData);
      setCounters(countersData);
      setPackets(packetsData);
      setBoxes(boxesData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching master data:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load master data. Please refresh the page.'
      });
    } finally {
      setLoadingMasterData(false);
    }
  };

  // Fetch stock data
  const fetchStockData = async () => {
    if (!userInfo?.ClientCode) return;
    
    setLoadingStock(true);
    try {
      const categoryId = allCategories.find(c => c.CategoryName === filterData.CategoryName)?.Id || 0;
      const productId = allProducts.find(p => p.ProductName === filterData.ProductName)?.Id || 0;
      const designId = allDesigns.find(d => d.DesignName === filterData.DesignName)?.Id || 0;
      const purityId = allPurities.find(p => p.PurityName === filterData.PurityName)?.Id || 0;

      const payload = {
        ClientCode: userInfo.ClientCode,
        CategoryId: categoryId || 0,
        ProductId: productId || 0,
        DesignId: designId || 0,
        PurityId: purityId || 0
      };

      let stockData = [];
      if (selectedValue === 'labelled') {
        stockData = await stockTransferService.getAllLabeledStock(payload);
      } else {
        stockData = await stockTransferService.getAllUnlabeledStock(payload);
      }

      // Filter out already transferred items
      const transferredIds = transferredData.map(item => item.Id);
      const availableStock = stockData.filter(item => !transferredIds.includes(item.Id));
      
      setTableData(availableStock);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load stock data. Please try again.'
      });
    } finally {
      setLoadingStock(false);
    }
  };

  // Update transfer options based on transfer type
  const updateTransferOptions = () => {
    const transferType = formData.StockTransferTypeName;
    if (!transferType) return;

    const parts = transferType.split(' To ');
    const fromPart = parts[0]?.trim();
    const toPart = parts[1]?.trim();

    // Set From options
    if (fromPart === 'Branch') {
      setFromOptionKey('BranchName');
      setFromOption(branches);
    } else if (fromPart === 'Counter') {
      setFromOptionKey('CounterName');
      setFromOption(counters);
    } else if (fromPart === 'Packet') {
      setFromOptionKey('PacketName');
      setFromOption(packets);
    } else if (fromPart === 'Box') {
      setFromOptionKey('BoxName');
      setFromOption(boxes);
    }

    // Set To options
    if (toPart === 'Branch') {
      setToOptionKey('BranchName');
      setToOption(branches);
    } else if (toPart === 'Counter') {
      setToOptionKey('CounterName');
      setToOption(counters);
    } else if (toPart === 'Packet') {
      setToOptionKey('PacketName');
      setToOption(packets);
    } else if (toPart === 'Box') {
      setToOptionKey('BoxName');
      setToOption(boxes);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Reset Source and Destination when transfer type changes
    if (name === 'StockTransferTypeName') {
      setFormData(prev => ({
        ...prev,
        Source: '',
        Destination: ''
      }));
    }
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle row selection
  const handleRowCheckboxChange = (e, id) => {
    const isChecked = e.target.checked;
    setSelectedRows(prev => 
      isChecked 
        ? [...prev, id]
        : prev.filter(rowId => rowId !== id)
    );
  };

  // Handle select all
  const handleSelectAll = (e) => {
    const isChecked = e.target.checked;
    setSelectAll(isChecked);
    if (isChecked) {
      setSelectedRows(tableData.map(item => item.Id));
    } else {
      setSelectedRows([]);
    }
  };

  // Transfer selected items
  const transferSelectedItems = () => {
    const selectedItems = tableData.filter(item => selectedRows.includes(item.Id));
    setTransferredData(prev => [...prev, ...selectedItems]);
    setTableData(prev => prev.filter(item => !selectedRows.includes(item.Id)));
    setSelectedRows([]);
    setSelectAll(false);
  };

  // Remove item from transferred list
  const removeTransferredItem = (id) => {
    const item = transferredData.find(i => i.Id === id);
    if (item) {
      setTransferredData(prev => prev.filter(i => i.Id !== id));
      setTableData(prev => [...prev, item]);
    }
  };

  // Remove all transferred items
  const removeAllTransferred = () => {
    setTableData(prev => [...prev, ...transferredData]);
    setTransferredData([]);
  };

  // Handle search/scan
  const handleSearch = () => {
    const scanned = searchCode.trim();
    if (!scanned) return;

    // Handle duplicate EPC (48+ chars)
    let searchTerm = scanned;
    if (scanned.length >= 48 && scanned.slice(0, 24) === scanned.slice(24, 48)) {
      searchTerm = scanned.slice(0, 24);
    }

    // Search in available stock
    const matchedItem = tableData.find(item =>
      (item.RFIDCode && item.RFIDCode.toLowerCase() === searchTerm.toLowerCase()) ||
      (item.ItemCode && item.ItemCode.toLowerCase() === searchTerm.toLowerCase()) ||
      (item.TIDNumber && item.TIDNumber.toLowerCase() === searchTerm.toLowerCase()) ||
      (item.BarcodeNumber && item.BarcodeNumber.toLowerCase() === searchTerm.toLowerCase())
    );

    if (matchedItem) {
      setTransferredData(prev => [...prev, matchedItem]);
      setTableData(prev => prev.filter(item => item.Id !== matchedItem.Id));
      addNotification({
        type: 'success',
        title: 'Item Added',
        message: `Item ${matchedItem.ItemCode || matchedItem.RFIDCode} added to transfer list`
      });
      setSearchCode('');
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    } else {
      addNotification({
        type: 'error',
        title: 'Not Found',
        message: `Item with code "${scanned}" not found in available stock`
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.StockTransferTypeName) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select Transfer Type'
      });
      return;
    }

    if (!formData.Source) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select Source'
      });
      return;
    }

    if (!formData.Destination) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select Destination'
      });
      return;
    }

    if (transferredData.length === 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select at least one item to transfer'
      });
      return;
    }

    setLoading(true);
    try {
      // Find source and destination IDs
      const sourceItem = fromOption.find(item => item[fromOptionKey] === formData.Source);
      const destinationItem = toOption.find(item => item[toOptionKey] === formData.Destination);

      // Format date as DD-MM-YYYY
      const transferDate = formData.TransferDate.split('-').reverse().join('-');

      // Find transfer type ID
      const transferType = transferTypes.find(t => t.TransferType === formData.StockTransferTypeName);

      const payload = {
        ClientCode: userInfo.ClientCode,
        StockType: selectedValue,
        StockTransferTypeName: formData.StockTransferTypeName,
        TransferTypeId: transferType?.Id || 0,
        TransferByEmployee: String(formData.TransferByEmployee || userInfo.EmployeeId || userInfo.Id),
        TransferedToBranch: String(formData.TransferedToBranch || ''),
        TransferToEmployee: String(formData.TransferToEmployee || ''),
        Source: sourceItem?.Id || 0,
        Destination: destinationItem?.Id || 0,
        StockTransferDate: transferDate,
        ReceivedByEmployee: String(formData.TransferByEmployee || userInfo.EmployeeId || userInfo.Id),
        StockTransferItems: transferredData.map(item => ({ stockId: item.Id }))
      };

      const response = await stockTransferService.createStockTransfer(payload);

      // Check for error status
      if (response?.Status === 400 || response?.status === 400) {
        throw new Error(response?.Message || response?.message || 'Failed to create stock transfer');
      }

      addNotification({
        type: 'success',
        title: 'Success',
        message: response?.message || 'Stock transfer created successfully!'
      });

      // Reset form
      setFormData({
        StockTransferTypeName: '',
        Source: '',
        Destination: '',
        TransferDate: new Date().toISOString().split('T')[0],
        TransferByEmployee: userInfo?.EmployeeId || userInfo?.Id || '',
        TransferedToBranch: '',
        TransferToEmployee: '',
        StockTransferItems: []
      });
      setFilterData({
        CategoryName: '',
        ProductName: '',
        DesignName: '',
        PurityName: ''
      });
      setTransferredData([]);
      setSelectedRows([]);
      setSelectAll(false);

      // Refresh stock data
      setTimeout(() => {
        fetchStockData();
      }, 1000);

    } catch (error) {
      console.error('Error creating stock transfer:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || error.response?.data?.Message || error.message || 'Failed to create stock transfer. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const isSmallScreen = windowWidth <= 768;

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
      `}</style>

      {/* Header */}
      <div style={{
        background: '#ffffff',
        borderRadius: '8px',
        padding: isSmallScreen ? '8px 10px' : '10px 16px',
        marginBottom: isSmallScreen ? '8px' : '12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: isSmallScreen ? '8px' : '10px'
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: isSmallScreen ? '14px' : '16px', 
          fontWeight: 700, 
          color: '#1e293b'
        }}>
          Stock Transfer
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowFilterSidebar(true)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
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
              e.currentTarget.style.background = '#3b82f6';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.color = '#3b82f6';
            }}
          >
            <FaSearch /> Filter
          </button>
          <button
            onClick={() => navigate('/inventory')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
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
            <FaList /> Transfer List
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Stock Type Selection */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          padding: isSmallScreen ? '10px 12px' : '12px 16px',
          marginBottom: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
              Stock Type:
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                value="labelled"
                checked={selectedValue === 'labelled'}
                onChange={(e) => setSelectedValue(e.target.value)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px' }}>Labelled Stock</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                value="unlabelled"
                checked={selectedValue === 'unlabelled'}
                onChange={(e) => setSelectedValue(e.target.value)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px' }}>Unlabelled Stock</span>
            </label>
          </div>
        </div>

        {/* Transfer Form */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          padding: isSmallScreen ? '10px 12px' : '12px 16px',
          marginBottom: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
            Transfer Details
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isSmallScreen ? '1fr' : windowWidth <= 1024 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
            gap: '12px' 
          }}>
            {/* Transfer Type */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#475569', 
                marginBottom: '4px' 
              }}>
                Transfer Type <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                name="StockTransferTypeName"
                value={formData.StockTransferTypeName}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              >
                <option value="">Select Transfer Type</option>
                {transferTypes.map((type) => (
                  <option key={type.Id} value={type.TransferType}>
                    {type.TransferType}
                  </option>
                ))}
              </select>
            </div>

            {/* Source */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#475569', 
                marginBottom: '4px' 
              }}>
                From (Source) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                name="Source"
                value={formData.Source}
                onChange={handleInputChange}
                required
                disabled={!formData.StockTransferTypeName}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none',
                  background: !formData.StockTransferTypeName ? '#f9fafb' : '#ffffff'
                }}
              >
                <option value="">Select Source</option>
                {fromOption.map((item, index) => (
                  <option key={index} value={item[fromOptionKey]}>
                    {item[fromOptionKey]}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#475569', 
                marginBottom: '4px' 
              }}>
                To (Destination) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                name="Destination"
                value={formData.Destination}
                onChange={handleInputChange}
                required
                disabled={!formData.StockTransferTypeName}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none',
                  background: !formData.StockTransferTypeName ? '#f9fafb' : '#ffffff'
                }}
              >
                <option value="">Select Destination</option>
                {toOption.map((item, index) => (
                  <option key={index} value={item[toOptionKey]}>
                    {item[toOptionKey]}
                  </option>
                ))}
              </select>
            </div>

            {/* Transfer Date */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#475569', 
                marginBottom: '4px' 
              }}>
                Transfer Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                name="TransferDate"
                value={formData.TransferDate}
                onChange={handleInputChange}
                required
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

        {/* Search/Scan Input */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          padding: isSmallScreen ? '10px 12px' : '12px 16px',
          marginBottom: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#475569', 
                marginBottom: '4px' 
              }}>
                Search/Scan Item Code or RFID
              </label>
              <div style={{ position: 'relative' }}>
                <FaSearch style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: '14px',
                  pointerEvents: 'none'
                }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder="Scan or type Item Code / RFID / TID / Barcode"
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 38px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSearch}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                background: '#3b82f6',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <FaSearch /> Search
            </button>
          </div>
        </div>

        {/* Available Stock Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          padding: isSmallScreen ? '10px 12px' : '12px 16px',
          marginBottom: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              Available Stock ({tableData.length} items)
            </h3>
            {selectedRows.length > 0 && (
              <button
                type="button"
                onClick={transferSelectedItems}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: '#10b981',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FaArrowRight /> Transfer Selected ({selectedRows.length})
              </button>
            )}
          </div>

          {loadingStock ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <FaSpinner style={{ animation: 'spin 1s linear infinite', fontSize: '24px', color: '#3b82f6' }} />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Item Code</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>RFID Code</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Product</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Gross Wt</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Net Wt</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.length > 0 ? (
                    tableData.map((item, index) => (
                      <tr key={item.Id || index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(item.Id)}
                            onChange={(e) => handleRowCheckboxChange(e, item.Id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>{item.ItemCode || '-'}</td>
                        <td style={{ padding: '8px' }}>{item.RFIDCode || item.RFIDNumber || '-'}</td>
                        <td style={{ padding: '8px' }}>{item.CategoryName || '-'}</td>
                        <td style={{ padding: '8px' }}>{item.ProductName || '-'}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          {item.GrossWt || item.TotalGrossWt || '0.000'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          {item.NetWt || item.TotalNetWt || '0.000'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        No stock available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transferred Stock Table */}
        {transferredData.length > 0 && (
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            padding: isSmallScreen ? '10px 12px' : '12px 16px',
            marginBottom: '12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                Items to Transfer ({transferredData.length} items)
                <span style={{ marginLeft: '12px', fontSize: '12px', fontWeight: 400, color: '#64748b' }}>
                  Total Gross WT: {totalGrossWT.toFixed(3)} | Total Net WT: {totalNetWT.toFixed(3)}
                </span>
              </h3>
              <button
                type="button"
                onClick={removeAllTransferred}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #ef4444',
                  background: '#ffffff',
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FaTrash /> Remove All
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Item Code</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>RFID Code</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Product</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Gross Wt</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Net Wt</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transferredData.map((item, index) => (
                    <tr key={item.Id || index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px' }}>{item.ItemCode || '-'}</td>
                      <td style={{ padding: '8px' }}>{item.RFIDCode || item.RFIDNumber || '-'}</td>
                      <td style={{ padding: '8px' }}>{item.CategoryName || '-'}</td>
                      <td style={{ padding: '8px' }}>{item.ProductName || '-'}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {item.GrossWt || item.TotalGrossWt || '0.000'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {item.NetWt || item.TotalNetWt || '0.000'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeTransferredItem(item.Id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '4px',
                            border: '1px solid #ef4444',
                            background: '#ffffff',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FaTimes /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          marginTop: '12px'
        }}>
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || transferredData.length === 0}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              background: loading || transferredData.length === 0 
                ? '#cbd5e1' 
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              cursor: loading || transferredData.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                Processing...
              </>
            ) : (
              <>
                <FaSave />
                Create Transfer
              </>
            )}
          </button>
        </div>
      </form>

      {/* Filter Sidebar */}
      {showFilterSidebar && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowFilterSidebar(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              transition: 'opacity 0.3s ease'
            }}
          />
          
          {/* Sidebar */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: isSmallScreen ? '100%' : '400px',
              maxWidth: '90vw',
              height: '100vh',
              background: '#ffffff',
              boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.15)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              transform: showFilterSidebar ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.3s ease'
            }}
          >
            {/* Sidebar Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: '#1e293b'
              }}>
                Filter Stock
              </h3>
              <button
                onClick={() => setShowFilterSidebar(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.color = '#1e293b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Sidebar Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px'
            }}>
              <form onSubmit={(e) => {
                e.preventDefault();
                fetchStockData();
                setShowFilterSidebar(false);
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Category */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      color: '#475569', 
                      marginBottom: '8px' 
                    }}>
                      Category
                    </label>
                    <select
                      name="CategoryName"
                      value={filterData.CategoryName}
                      onChange={handleFilterChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '13px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        outline: 'none',
                        background: '#ffffff'
                      }}
                    >
                      <option value="">All Categories</option>
                      {allCategories.map((cat, index) => (
                        <option key={index} value={cat.CategoryName}>
                          {cat.CategoryName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Product */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      color: '#475569', 
                      marginBottom: '8px' 
                    }}>
                      Product
                    </label>
                    <select
                      name="ProductName"
                      value={filterData.ProductName}
                      onChange={handleFilterChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '13px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        outline: 'none',
                        background: '#ffffff'
                      }}
                    >
                      <option value="">All Products</option>
                      {allProducts
                        .filter(p => !filterData.CategoryName || p.CategoryName === filterData.CategoryName)
                        .map((prod, index) => (
                          <option key={index} value={prod.ProductName}>
                            {prod.ProductName}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Design */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      color: '#475569', 
                      marginBottom: '8px' 
                    }}>
                      Design
                    </label>
                    <select
                      name="DesignName"
                      value={filterData.DesignName}
                      onChange={handleFilterChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '13px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        outline: 'none',
                        background: '#ffffff'
                      }}
                    >
                      <option value="">All Designs</option>
                      {allDesigns.map((design, index) => (
                        <option key={index} value={design.DesignName}>
                          {design.DesignName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Purity */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      color: '#475569', 
                      marginBottom: '8px' 
                    }}>
                      Purity
                    </label>
                    <select
                      name="PurityName"
                      value={filterData.PurityName}
                      onChange={handleFilterChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '13px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        outline: 'none',
                        background: '#ffffff'
                      }}
                    >
                      <option value="">All Purities</option>
                      {allPurities.map((purity, index) => (
                        <option key={index} value={purity.PurityName}>
                          {purity.PurityName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sidebar Footer */}
                <div style={{
                  marginTop: '24px',
                  paddingTop: '20px',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  gap: '12px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterData({
                        CategoryName: '',
                        ProductName: '',
                        DesignName: '',
                        PurityName: ''
                      });
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '6px',
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
                    Reset
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                    }}
                  >
                    Apply Filter
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StockTransfer;
