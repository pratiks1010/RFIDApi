import React, { useEffect, useState, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { FaSearch, FaFileExcel, FaFilter, FaTimes, FaCheckCircle } from 'react-icons/fa';
import Header from './Header';

const API_URL = 'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllLabeledStock';
const PAGE_SIZE = 15;

const Inventory = () => {
  const [activeTab, setActiveTab] = useState('labelList');
  const [deviceId, setDeviceId] = useState('');
  const [rfidDetails, setRfidDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [deviceIds, setDeviceIds] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [rfidData, setRfidData] = useState([]);

  // Refs for outside click
  const filterPopupRef = useRef(null);
  const filterBtnRef = useRef(null);

  // Get userInfo from localStorage
  const [userInfo, setUserInfo] = useState({});
  useEffect(() => {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        try {
        const parsed = JSON.parse(stored);
        setUserInfo(parsed);
        // Fetch device IDs when userInfo is available
        if (parsed.ClientCode) {
          fetchDeviceIds(parsed.ClientCode);
        }
      } catch (error) {
        console.error('Error parsing userInfo:', error);
      }
    }
  }, []);

  // Close filter popup on outside click
  useEffect(() => {
    if (!showFilter) return;
    function handleClick(e) {
      if (
        filterPopupRef.current &&
        !filterPopupRef.current.contains(e.target) &&
        filterBtnRef.current &&
        !filterBtnRef.current.contains(e.target)
      ) {
        setFilterAnim(false);
        setTimeout(() => setShowFilter(false), 200);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFilter]);

  // Responsive helper
  const isMobile = window.innerWidth < 600;

  // Animation for filter dropdown
  const [filterAnim, setFilterAnim] = useState(false);
  const openFilter = () => { setShowFilter(true); setTimeout(() => setFilterAnim(true), 10); };
  const closeFilter = () => { setFilterAnim(false); setTimeout(() => setShowFilter(false), 200); };

  // Table header and cell styles
  const thStyle = {
    fontWeight: 700,
    color: '#222',
    background: '#f4f8ff',
    fontSize: 14,
    padding: '6px 8px',
    border: 'none',
    minWidth: 80,
    textAlign: 'left',
    verticalAlign: 'middle',
    fontFamily: 'Poppins, Inter, sans-serif',
    letterSpacing: 0.1,
    height: 36,
    whiteSpace: 'nowrap',
  };

  const tdStyle = {
    padding: '6px 8px',
    border: 'none',
    minWidth: 80,
    textAlign: 'left',
    verticalAlign: 'middle',
    fontFamily: 'Poppins, Inter, sans-serif',
    fontSize: 13,
    height: 32,
    color: '#222',
    fontWeight: 500,
    letterSpacing: 0.1,
    whiteSpace: 'nowrap',
  };

  useEffect(() => {
    if (!userInfo.ClientCode) return;
    setLoading(true);
    axios.post(API_URL, { ClientCode: userInfo.ClientCode })
      .then(res => {
        if (Array.isArray(res.data)) {
          setLabels(res.data);
        } else if (res.data && Array.isArray(res.data.Data)) {
          setLabels(res.data.Data);
        } else {
          setLabels([]);
        }
      })
      .catch(err => {
        toast.error(err.response?.data?.Message || 'Failed to fetch label list');
      })
      .finally(() => setLoading(false));
  }, [userInfo.ClientCode]);

  // Filtering and searching
  const filteredLabels = useMemo(() => {
    let data = labels;
    // Search
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(l =>
        (l.ItemCode && l.ItemCode.toLowerCase().includes(s)) ||
        (l.ProductName && l.ProductName.toLowerCase().includes(s)) ||
        (l.BranchName && l.BranchName.toLowerCase().includes(s))
      );
    }
    // Column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        data = data.filter(l => (l[key] || '').toString().toLowerCase().includes(value.toLowerCase()));
      }
    });
    return data;
  }, [labels, search, filters]);

  // Pagination
  let paginatedLabels = filteredLabels;
  let totalPages = 1;
  if (!search) {
    totalPages = Math.ceil(filteredLabels.length / PAGE_SIZE);
    paginatedLabels = filteredLabels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }

  // Unique values for filters
  const getUnique = (key) => [...new Set(labels.map(l => l[key]).filter(Boolean))];

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  };

  // Handle search change
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  // Export to Excel
  const handleExport = () => {
    const exportData = filteredLabels.map(({ Id, ...rest }) => rest); // Remove Id if not needed
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, 'inventory.xlsx');
    setShowExportSuccess(true);
  };

  // Selection state
  const allSelected = paginatedLabels.length > 0 && paginatedLabels.every(l => selectedRows.includes(l.Id));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedRows(selectedRows.filter(id => !paginatedLabels.some(l => l.Id === id)));
    else setSelectedRows([...new Set([...selectedRows, ...paginatedLabels.map(l => l.Id)])]);
  };
  const toggleSelectRow = (id) => {
    setSelectedRows(selectedRows.includes(id) ? selectedRows.filter(i => i !== id) : [...selectedRows, id]);
  };

  // Unified filter dropdown state
  const handleFilterChangeUnified = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  };

  // Function to fetch device IDs
  const fetchDeviceIds = async (clientCode) => {
    setIsLoadingDevices(true);
    try {
      const response = await axios.post('https://rrgold.loyalstring.co.in/api/RFIDDevice/GetAllRFIDDetails', {
        ClientCode: clientCode
      });
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Extract unique device IDs from the data array
        const uniqueDeviceIds = [...new Set(response.data.data.map(item => item.DeviceId))];
        setDeviceIds(uniqueDeviceIds);
      } else {
        setDeviceIds([]);
        console.error('Invalid response format:', response.data);
      }
    } catch (error) {
      console.error('Error fetching device IDs:', error);
      toast.error('Failed to fetch device IDs');
      setDeviceIds([]);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  // Modified handleGetRFIDDetails to use axios
  const handleGetRFIDDetails = async (selectedId = deviceId) => {
    if (!selectedId.trim()) {
      toast.error('Please enter or select a Device ID');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('https://rrgold.loyalstring.co.in/api/RFIDDevice/GetAllRFIDDetails', {
        ClientCode: userInfo.ClientCode,
        DeviceId: selectedId
      });

      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setRfidDetails(response.data.data);
        if (response.data.data.length > 0) {
          toast.success('RFID details fetched successfully');
        } else {
          toast.info('No RFID details found');
        }
      } else {
        setRfidDetails([]);
        toast.info('No RFID details found');
      }
    } catch (error) {
      console.error('Error fetching RFID details:', error);
      setRfidDetails([]);
      toast.error(error.response?.data?.Message || 'Failed to fetch RFID details');
    } finally {
      setLoading(false);
    }
  };

  // Modified handleDeviceSelect to trigger data fetch
  const handleDeviceSelect = (deviceId) => {
    setSelectedDeviceId(deviceId);
    setDeviceId(deviceId);
    if (deviceId) {
      handleGetRFIDDetails(deviceId);
    }
  };

  // Add useEffect to log state changes for debugging
  useEffect(() => {
    console.log('RFID Details updated:', rfidDetails);
  }, [rfidDetails]);

  // Filter deviceIds based on search term
  const filteredDeviceIds = useMemo(() => {
    return deviceIds.filter(id => 
      id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [deviceIds, searchTerm]);

  // Add pagination state for RFID details
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Calculate paginated RFID details
  const paginatedRfidDetails = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return rfidDetails.slice(startIndex, endIndex);
  }, [rfidDetails, currentPage]);

  // Calculate total pages
  const totalPagesRfid = useMemo(() => {
    return Math.ceil(rfidDetails.length / ITEMS_PER_PAGE);
  }, [rfidDetails]);

  // Handle page change
  const handlePageChangeRfid = (newPage) => {
    if (newPage >= 1 && newPage <= totalPagesRfid) {
      setCurrentPage(newPage);
    }
  };

  // Reset pagination when new data is fetched
  useEffect(() => {
    setCurrentPage(1);
  }, [rfidDetails]);

  // Add export to excel function
  const handleExportRFIDDetails = () => {
    if (rfidDetails.length === 0) {
      toast.info('No data available to export');
      return;
    }

    const exportData = rfidDetails.map(item => ({
      'Device ID': item.DeviceId,
      'RFID Code': item.RFIDCode,
      'TID Value': item.TIDValue,
      'Created On': new Date(item.CreatedOn).toLocaleString(),
      'Last Updated': new Date(item.LastUpdated).toLocaleString(),
      'Status': item.StatusType ? 'Active' : 'Inactive'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RFID Details');
    XLSX.writeFile(wb, 'RFID_Details.xlsx');
    toast.success('Data exported successfully');
  };

  // Add filter states
  const [showRfidFilter, setShowRfidFilter] = useState(false);
  const [rfidFilters, setRfidFilters] = useState({});

  // Filter functions
  const openFilterRfid = () => { 
    setShowRfidFilter(true); 
    setTimeout(() => setFilterAnim(true), 10); 
  };
  
  const closeFilterRfid = () => { 
    setFilterAnim(false); 
    setTimeout(() => setShowRfidFilter(false), 200); 
  };

  // Handle filter change
  const handleFilterChangeRfid = (key, value) => {
    setRfidFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Reset filters
  const resetFiltersRfid = () => {
    setRfidFilters({});
  };

  // Filter RFID details
  const filteredRfidDetails = useMemo(() => {
    return rfidDetails.filter(item => {
      return Object.entries(rfidFilters).every(([key, value]) => {
        if (!value) return true;
        const itemValue = item[key]?.toString().toLowerCase() || '';
        return itemValue.includes(value.toLowerCase());
      });
    });
  }, [rfidDetails, rfidFilters]);

  // Get unique values for filters
  const getUniqueValues = (key) => {
    return [...new Set(rfidDetails.map(item => item[key]).filter(Boolean))];
  };

  // Close filter on outside click
  useEffect(() => {
    if (!showRfidFilter) return;
    function handleClick(e) {
      if (
        filterPopupRef.current &&
        !filterPopupRef.current.contains(e.target) &&
        filterBtnRef.current &&
        !filterBtnRef.current.contains(e.target)
      ) {
        setFilterAnim(false);
        setTimeout(() => setShowRfidFilter(false), 200);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showRfidFilter]);

  useEffect(() => {
    fetchRFIDDetails();
  }, []);

  const fetchRFIDDetails = async () => {
    try {
      const response = await axios.get('https://rrgold.loyalstring.co.in/api/RFIDDevice/GetAllRFIDDetails');
      setRfidData(response.data);
      // Extract unique device IDs
      const uniqueDeviceIds = [...new Set(response.data.map(item => item.DeviceId))];
      setDeviceIds(uniqueDeviceIds);
    } catch (error) {
      console.error('Error fetching RFID details:', error);
    }
  };

  // Modified handleClearRFIDByClientAndDevice to use axios
  const handleClearRFIDByClientAndDevice = async () => {
    const currentDeviceId = deviceId || selectedDeviceId;
    if (!userInfo.ClientCode || !currentDeviceId) {
      toast.error('Please enter/select a Device ID and ensure you are logged in.');
      return;
    }
    try {
      const response = await axios.post('https://rrgold.loyalstring.co.in/api/RFIDDevice/DeleteRFIDByClientAndDevice', {
        ClientCode: userInfo.ClientCode,
        DeviceId: currentDeviceId
      });
      if (response.data && response.data.success) {
        toast.success('RFID data deleted successfully!');
        setRfidDetails([]);
      } else {
        toast.info(response.data?.message || 'No data deleted.');
      }
    } catch (error) {
      toast.error(error.response?.data?.Message || 'Failed to delete RFID data.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 60%, #ececec 100%)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Header userInfo={userInfo} />
      <div className="container py-4" style={{ maxWidth: '98vw', margin: '0 auto' }}>
        <div className="card shadow-sm border-0" style={{ 
          borderRadius: '24px', 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
          boxShadow: '0 8px 32px rgba(0, 120, 212, 0.07)',
          overflow: 'hidden'
        }}>
          <div className="card-body p-0">
            {/* Tabs */}
            <div className="d-flex">
              <button
                className={`btn flex-grow-1 py-3 px-4 ${activeTab === 'labelList' ? 'active' : ''}`}
                onClick={() => setActiveTab('labelList')}
                style={{
                  borderRadius: '0',
                  border: 'none',
                  background: activeTab === 'labelList' ? 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)' : '#fff',
                  color: activeTab === 'labelList' ? '#fff' : '#666',
                  fontWeight: '600',
                  fontSize: '15px',
                  transition: 'all 0.3s ease'
                }}
              >
                <i className="fas fa-tags me-2"></i>
                Label List
              </button>
              <button
                className={`btn flex-grow-1 py-3 px-4 ${activeTab === 'rfidDetails' ? 'active' : ''}`}
                onClick={() => setActiveTab('rfidDetails')}
                style={{
                  borderRadius: '0',
                  border: 'none',
                  background: activeTab === 'rfidDetails' ? 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)' : '#fff',
                  color: activeTab === 'rfidDetails' ? '#fff' : '#666',
                  fontWeight: '600',
                  fontSize: '15px',
                  transition: 'all 0.3s ease'
                }}
              >
                <i className="fas fa-mobile-alt me-2"></i>
                RFID Device Details
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {activeTab === 'labelList' ? (
                <div>
                  <h5 className="mb-4" style={{ 
                    fontSize: '20px', 
                    fontWeight: '700',
            background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
                  }}>Label Stock List</h5>
                  {/* Search and Buttons Row */}
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                    <div className="position-relative flex-grow-1" style={{ maxWidth: '500px' }}>
              <input
                type="text"
                placeholder="Search by Product Name, Category, SKU..."
                value={search}
                onChange={handleSearchChange}
                style={{
                  width: '100%',
                          padding: '12px 20px 12px 45px',
                          borderRadius: '12px',
                          border: '1.5px solid #e5e9f2',
                  background: '#fff',
                          fontSize: '14px',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 10px rgba(77, 101, 247, 0.05)'
                        }}
              />
                      <FaSearch style={{
                        position: 'absolute',
                        left: '15px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#8e9ab4',
                        fontSize: '16px'
                      }} />
            </div>
                    <div className="d-flex gap-3">
            <button
              onClick={handleExport}
              style={{
                          padding: '10px 24px',
                          borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
                color: '#fff',
                          fontSize: '14px',
                          fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 15px rgba(0, 120, 212, 0.15)'
                        }}
            >
                        <FaFileExcel /> Export to Excel
            </button>
            <button
              ref={filterBtnRef}
              onClick={openFilter}
              style={{
                          padding: '10px 24px',
                          borderRadius: '12px',
                          border: '1.5px solid #e5e9f2',
                background: '#fff',
                color: '#0078d4',
                          fontSize: '14px',
                          fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.3s ease'
                        }}
            >
                        <FaFilter /> Filter
            </button>
            {showFilter && (
              <>
                {/* Overlay */}
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  background: 'rgba(30,40,60,0.18)',
                  zIndex: 1000,
                  transition: 'opacity 0.2s',
                  opacity: filterAnim ? 1 : 0,
                  pointerEvents: filterAnim ? 'auto' : 'none',
                }} />
                {/* Centered Popup */}
                <div
                  ref={filterPopupRef}
                  style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: filterAnim ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -60%) scale(0.98)',
                              background: '#fff',
                              borderRadius: '20px',
                              boxShadow: '0 12px 48px rgba(0, 120, 212, 0.12)',
                    padding: 0,
                              minWidth: isMobile ? '320px' : '600px',
                              maxWidth: '90vw',
                              maxHeight: '85vh',
                    zIndex: 1100,
                              border: '2px solid #0078d4',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    opacity: filterAnim ? 1 : 0,
                              transition: 'all 0.3s ease'
                  }}
                >
                  {/* Gradient Top Bar */}
                  <div style={{
                              height: '8px',
                    width: '100%',
                              background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)'
                  }} />
                            <button 
                              onClick={closeFilter} 
                              style={{ 
                                position: 'absolute', 
                                top: '14px', 
                                right: '14px',
                                background: 'none',
                                border: 'none',
                                color: '#0078d4',
                                fontSize: '20px',
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                            >
                              <FaTimes />
                            </button>
                            <div style={{ padding: '24px', overflowY: 'auto' }}>
                              <h4 style={{ 
                                textAlign: 'center',
                                marginBottom: '24px',
                    background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                fontWeight: '700'
                              }}>
                                Filter Inventory
                              </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                                gap: '16px',
                                maxHeight: '60vh',
                      overflowY: 'auto',
                                padding: '0 4px'
                    }}>
                      {/* Dropdowns for fields with limited values */}
                      {[
                        ['Product Name', 'ProductName'],
                        ['Category', 'CategoryName'],
                        ['Design', 'DesignName'],
                        ['Purity', 'PurityName'],
                        ['Box Name', 'BoxName'],
                        ['Vendor', 'VendorName'],
                        ['Branch', 'BranchName'],
                        ['Status', 'Status'],
                      ].map(([label, key]) => (
                        <div key={key}>
                                    <label style={{ 
                                      display: 'block',
                                      marginBottom: '6px',
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      color: '#0078d4'
                                    }}>
                                      {label}
                                    </label>
                                    <select
                                      className="form-select"
                                      value={filters[key] || ''}
                                      onChange={e => handleFilterChange(key, e.target.value)}
                                      style={{
                                        borderRadius: '8px',
                                        border: '1.5px solid #e5e9f2',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        width: '100%',
                                        color: '#333'
                                      }}
                                    >
                                      <option value="">All</option>
                                      {getUnique(key).map(val => (
                                        <option key={val} value={val}>{val}</option>
                                      ))}
                                    </select>
                        </div>
                      ))}
                                
                      {/* Text inputs for other fields */}
                      {[
                        ['Item Code', 'ItemCode'],
                        ['RFID Code', 'RFIDCode'],
                        ['SKU', 'SKU'],
                        ['Gross Wt', 'GrossWt'],
                        ['Stone Wt', 'StoneWt'],
                        ['Stone Pcs', 'StonePcs'],
                        ['Diamond Wt', 'DiamondWt'],
                        ['Diamond Pcs', 'DiamondPcs'],
                        ['Net Wt', 'NetWt'],
                        ['Pieces', 'Pieces'],
                        ['Stone Amt', 'StoneAmt'],
                        ['Fixed Wastage', 'FixedWastage'],
                        ['Fixed Amt', 'FixedAmt'],
                        ['Created Date', 'CreatedOn'],
                        ['Packing Weight', 'PackingWeight'],
                        ['Total Weight', 'TotalWeight'],
                      ].map(([label, key]) => (
                        <div key={key}>
                                    <label style={{ 
                                      display: 'block',
                                      marginBottom: '6px',
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      color: '#0078d4'
                                    }}>
                                      {label}
                                    </label>
                          <input
                                      type="text"
                                      className="form-control"
                            value={filters[key] || ''}
                                      onChange={e => handleFilterChange(key, e.target.value)}
                            placeholder={`Search ${label}`}
                                      style={{
                                        borderRadius: '8px',
                                        border: '1.5px solid #e5e9f2',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        width: '100%',
                                        color: '#333'
                                      }}
                          />
                        </div>
                      ))}
                    </div>
                              <div style={{
                                marginTop: '24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px'
                              }}>
                                <button
                                  onClick={() => setFilters({})}
                                  style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1.5px solid #0078d4',
                                    background: '#fff',
                                    color: '#0078d4',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Reset Filters
                                </button>
                                <button
                                  onClick={closeFilter}
                                  style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
                                    color: '#fff',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Apply Filters
                                </button>
                              </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

                  {/* Table Container */}
                  <div style={{
                    background: '#fff',
                    borderRadius: '16px',
                    border: '1.5px solid #e5e9f2',
                    overflow: 'hidden'
                  }}>
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr style={{
                            background: 'linear-gradient(90deg, #f5f7ff, #fff)',
                            borderBottom: '1.5px solid #e5e9f2'
                          }}>
                <th style={{ ...thStyle, width: 40 }}>Sr No</th>
                <th style={{ ...thStyle, width: 90 }}>Item Code</th>
                <th style={{ ...thStyle, width: 110 }}>RFID Code</th>
                <th style={{ ...thStyle, width: 80 }}>SKU</th>
                <th style={{ ...thStyle, minWidth: 120 }}>Product Name</th>
                <th style={{ ...thStyle, minWidth: 90 }}>Category</th>
                <th style={{ ...thStyle, minWidth: 90 }}>Design</th>
                <th style={{ ...thStyle, width: 70 }}>Purity</th>
                <th style={{ ...thStyle, width: 80 }}>Gross Wt</th>
                <th style={{ ...thStyle, width: 80 }}>Stone Wt</th>
                <th style={{ ...thStyle, width: 80 }}>Stone Pcs</th>
                <th style={{ ...thStyle, width: 90 }}>Diamond Wt</th>
                <th style={{ ...thStyle, width: 90 }}>Diamond Pcs</th>
                <th style={{ ...thStyle, width: 80 }}>Net Wt</th>
                <th style={{ ...thStyle, width: 70 }}>Pieces</th>
                <th style={{ ...thStyle, width: 90 }}>Stone Amt</th>
                <th style={{ ...thStyle, width: 110 }}>Fixed Wastage</th>
                <th style={{ ...thStyle, width: 90 }}>Fixed Amt</th>
                <th style={{ ...thStyle, minWidth: 90 }}>Box Name</th>
                <th style={{ ...thStyle, minWidth: 90 }}>Vendor</th>
                <th style={{ ...thStyle, minWidth: 90 }}>Branch</th>
                <th style={{ ...thStyle, minWidth: 110 }}>Created Date</th>
                <th style={{ ...thStyle, width: 110 }}>Packing Weight</th>
                <th style={{ ...thStyle, width: 110 }}>Total Weight</th>
                <th style={{ ...thStyle, minWidth: 120, position: 'sticky', right: 0, background: 'linear-gradient(90deg, #f5f7ff, #fff)', zIndex: 2, boxShadow: '-2px 0 6px -2px #e0e6ed', color: '#222' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLabels.map((label, idx) => (
                <tr key={label.Id} style={{ background: idx % 2 === 0 ? '#f7f7f7' : '#fff', transition: 'background 0.2s', cursor: 'pointer', borderBottom: '1.5px solid #e0e0e0', height: 32 }}
                  onMouseOver={e => e.currentTarget.style.background = '#e6f0ff'}
                  onMouseOut={e => e.currentTarget.style.background = idx % 2 === 0 ? '#f7f7f7' : '#fff'}
                >
                  <td style={{ ...tdStyle, width: 40, textAlign: 'center', fontWeight: 600 }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td style={{ ...tdStyle, width: 90 }}>{label.ItemCode}</td>
                  <td style={{ ...tdStyle, width: 110 }}>{label.RFIDCode}</td>
                  <td style={{ ...tdStyle, width: 80 }}>{label.SKU}</td>
                  <td style={{ ...tdStyle, minWidth: 120 }}>{label.ProductName}</td>
                  <td style={{ ...tdStyle, minWidth: 90 }}>{label.CategoryName || label.Category}</td>
                  <td style={{ ...tdStyle, minWidth: 90 }}>{label.DesignName}</td>
                  <td style={{ ...tdStyle, width: 70 }}>{label.PurityName}</td>
                  <td style={{ ...tdStyle, width: 80 }}>{label.GrossWt}</td>
                  <td style={{ ...tdStyle, width: 80 }}>{label.StoneWt}</td>
                  <td style={{ ...tdStyle, width: 80 }}>{label.StonePcs}</td>
                  <td style={{ ...tdStyle, width: 90 }}>{label.DiamondWt}</td>
                  <td style={{ ...tdStyle, width: 90 }}>{label.DiamondPcs}</td>
                  <td style={{ ...tdStyle, width: 80 }}>{label.NetWt}</td>
                  <td style={{ ...tdStyle, width: 70 }}>{label.Pieces}</td>
                  <td style={{ ...tdStyle, width: 90 }}>{label.StoneAmt}</td>
                  <td style={{ ...tdStyle, width: 110 }}>{label.FixedWastage}</td>
                  <td style={{ ...tdStyle, width: 90 }}>{label.FixedAmt}</td>
                  <td style={{ ...tdStyle, minWidth: 90 }}>{label.BoxName}</td>
                  <td style={{ ...tdStyle, minWidth: 90 }}>{label.VendorName}</td>
                  <td style={{ ...tdStyle, minWidth: 90 }}>{label.BranchName || label.Branch}</td>
                  <td style={{ ...tdStyle, minWidth: 110 }}>{label.CreatedOn ? new Date(label.CreatedOn).toLocaleDateString() : ''}</td>
                  <td style={{ ...tdStyle, width: 110 }}>{label.PackingWeight}</td>
                  <td style={{ ...tdStyle, width: 110 }}>{label.TotalWeight}</td>
                  <td style={{ ...tdStyle, minWidth: 120, position: 'sticky', right: 0, background: '#fff', zIndex: 1, boxShadow: '-2px 0 6px -2px #e0e6ed' }}>
                    <span
                      className={`badge status-badge`}
                      style={{
                        background:
                          label.Status === 'Active'
                            ? 'linear-gradient(90deg, #d4f7df 0%, #a8f0c6 100%)'
                            : label.Status === 'ApiActive'
                            ? 'linear-gradient(90deg, #ffeaea 0%, #ffd6d6 100%)'
                            : label.Status === 'Sold'
                            ? 'linear-gradient(90deg, #ffeaea 0%, #ffd6d6 100%)'
                            : '#eee',
                        color:
                          label.Status === 'Active'
                            ? '#1ca96b'
                            : label.Status === 'ApiActive'
                            ? '#e74c3c'
                            : label.Status === 'Sold'
                            ? '#d60000'
                            : '#555',
                        fontWeight: 700,
                        fontSize: 13,
                        padding: '4px 16px',
                        borderRadius: 18,
                        border:
                          label.Status === 'Active'
                            ? '1.5px solid #a8f0c6'
                            : label.Status === 'ApiActive'
                            ? '1.5px solid #ffd6d6'
                            : label.Status === 'Sold'
                            ? '1.5px solid #ffd6d6'
                            : '1.5px solid #eee',
                        letterSpacing: 0.2,
                        minWidth: 70,
                        display: 'inline-block',
                        textAlign: 'center',
                        fontFamily: 'Poppins, Inter, sans-serif',
                        boxShadow: '0 2px 8px #e0e6ed33',
                        transition: 'transform 0.15s',
                        cursor: 'default',
                      }}
                      onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                      onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      {label.Status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
                  </div>

                  {/* Pagination */}
        {totalPages > 1 && !search && (
                    <div className="d-flex justify-content-end mt-4">
            <nav>
                        <ul className="pagination mb-0" style={{ background: 'none', boxShadow: 'none', display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <li className={`page-item ${page === 1 ? 'disabled' : ''}`} style={{ border: 'none', background: 'none' }}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(page - 1)}
                              style={{
                                border: 'none',
                                background: 'none',
                                color: page === 1 ? '#b3d8ff' : '#0078d4',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                marginRight: '4px',
                                boxShadow: 'none',
                                fontWeight: 600,
                                fontSize: '16px',
                                transition: 'background 0.2s, color 0.2s',
                                cursor: page === 1 ? 'not-allowed' : 'pointer',
                                opacity: page === 1 ? 0.5 : 1
                              }}
                              onMouseOver={e => { if (page !== 1) e.currentTarget.style.background = 'linear-gradient(90deg, #e3f0ff 0%, #fafdff 100%)'; }}
                              onMouseOut={e => { e.currentTarget.style.background = 'none'; }}
                            >
                              &laquo;
                            </button>
                          </li>
                {[...Array(totalPages)].map((_, idx) => (
                            <li key={idx} className={`page-item ${page === idx + 1 ? 'active' : ''}`} style={{ border: 'none', background: 'none' }}>
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(idx + 1)}
                                style={{
                                  border: 'none',
                                  background: page === idx + 1 ? 'linear-gradient(90deg, #e3f0ff 0%, #b3d8ff 100%)' : 'none',
                                  color: page === idx + 1 ? '#0078d4' : '#0078d4',
                                  padding: '8px 16px',
                                  borderRadius: '10px',
                                  marginRight: '4px',
                                  minWidth: '36px',
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  fontSize: '16px',
                                  boxShadow: page === idx + 1 ? '0 2px 8px #b3d8ff33' : 'none',
                                  transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                                  outline: page === idx + 1 ? '2px solid #b3d8ff' : 'none',
                                  cursor: 'pointer',
                                }}
                                onMouseOver={e => { if (page !== idx + 1) { e.currentTarget.style.background = 'linear-gradient(90deg, #fafdff 0%, #e3f0ff 100%)'; e.currentTarget.style.boxShadow = '0 2px 8px #b3d8ff22'; }}}
                                onMouseOut={e => { if (page !== idx + 1) { e.currentTarget.style.background = 'none'; e.currentTarget.style.boxShadow = 'none'; }}}
                              >
                                {idx + 1}
                              </button>
                            </li>
                ))}
                          <li className={`page-item ${page === totalPages ? 'disabled' : ''}`} style={{ border: 'none', background: 'none' }}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(page + 1)}
                              style={{
                                border: 'none',
                                background: 'none',
                                color: page === totalPages ? '#b3d8ff' : '#0078d4',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                marginRight: '4px',
                                boxShadow: 'none',
                                fontWeight: 600,
                                fontSize: '16px',
                                transition: 'background 0.2s, color 0.2s',
                                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                opacity: page === totalPages ? 0.5 : 1
                              }}
                              onMouseOver={e => { if (page !== totalPages) e.currentTarget.style.background = 'linear-gradient(90deg, #e3f0ff 0%, #fafdff 100%)'; }}
                              onMouseOut={e => { e.currentTarget.style.background = 'none'; }}
                            >
                              &raquo;
                            </button>
                          </li>
              </ul>
            </nav>
          </div>
        )}
                </div>
              ) : (
                <div>
                  <h5 className="mb-4" style={{ 
                    fontSize: '20px', 
                    fontWeight: '700',
                    color: '#222222'
                  }}>RFID Device Details</h5>
                  
                  {/* RFID Device Form */}
                  <div className="rfid-form" style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    marginBottom: '24px',
                    border: '1px solid #e5e9f2',
                    fontFamily: "'Poppins', sans-serif"
                  }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
                      <div style={{ flex: '1' }}>
                        <label className="form-label" style={{ 
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#333',
                          marginBottom: '8px',
                          display: 'block',
                          fontFamily: "'Poppins', sans-serif"
                        }}>Device ID</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input
                            type="text"
                            value={deviceId}
                            onChange={(e) => setDeviceId(e.target.value)}
                            placeholder="Enter Device ID"
                            style={{
                              flex: '1',
                              padding: '10px 16px',
                              borderRadius: '8px',
                              border: '1px solid #e5e9f2',
                              fontSize: '14px',
                              transition: 'all 0.3s ease',
                              fontFamily: "'Poppins', sans-serif"
                            }}
                          />
                          <select
                            value={selectedDeviceId}
                            onChange={(e) => handleDeviceSelect(e.target.value)}
                            style={{
                              width: '200px',
                              padding: '10px 16px',
                              borderRadius: '8px',
                              border: '1px solid #e5e9f2',
                              fontSize: '14px',
                              background: '#fff',
                              transition: 'all 0.3s ease',
                              fontFamily: "'Poppins', sans-serif"
                            }}
                          >
                            <option value="">Select Device ID</option>
                            {deviceIds.map(id => (
                              <option key={id} value={id}>{id}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div style={{ flex: '1' }}>
                        <label className="form-label" style={{ 
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#333',
                          marginBottom: '8px',
                          display: 'block',
                          fontFamily: "'Poppins', sans-serif"
                        }}>Client Code</label>
                        <input
                          type="text"
                          value={userInfo.ClientCode || ''}
                          disabled
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid #e5e9f2',
                            background: '#f8f9fa',
                            fontSize: '14px',
                            fontFamily: "'Poppins', sans-serif"
                          }}
                        />
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {/* Button order: Clear, Get Details, Filter, Export Excel */}
                        <button
                          onClick={handleClearRFIDByClientAndDevice}
                          style={{
                            padding: '10px 24px',
                            borderRadius: '8px',
                            border: '1.5px solid #d60000',
                            background: '#fff',
                            color: '#d60000',
                            fontSize: '14px',
                            fontWeight: '600',
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: 'none',
                            fontFamily: "'Poppins', sans-serif"
                          }}
                          onMouseOver={e => {
                            e.currentTarget.style.background = '#ffeaea';
                            e.currentTarget.style.borderColor = '#ff4b2b';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.borderColor = '#d60000';
                          }}
                        >
                          <i className="fas fa-trash-alt"></i> Clear
                        </button>

                        <button
                          onClick={() => handleGetRFIDDetails()}
                          disabled={loading}
                          style={{
                            padding: '10px 24px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: '600',
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                            fontFamily: "'Poppins', sans-serif"
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                          }}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                              Loading...
                            </>
                          ) : (
                            'Get Details'
                          )}
                        </button>

                        <button
                          ref={filterBtnRef}
                          onClick={openFilterRfid}
                          style={{
                            padding: '10px 24px',
                            borderRadius: '8px',
                            border: '1px solid #e5e9f2',
                            background: '#fff',
                            color: '#0078d4',
                            fontSize: '14px',
                            fontWeight: '600',
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            fontFamily: "'Poppins', sans-serif"
                          }}
                        >
                          <FaFilter /> Filter
                        </button>

                        <button
                          onClick={handleExportRFIDDetails}
                          disabled={rfidDetails.length === 0}
                          style={{
                            padding: '10px 24px',
                            borderRadius: '8px',
                            border: 'none',
                            background: rfidDetails.length === 0 ? '#e5e9f2' : 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
                            color: rfidDetails.length === 0 ? '#999' : '#fff',
                            fontSize: '14px',
                            fontWeight: '600',
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: rfidDetails.length === 0 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: rfidDetails.length === 0 ? 'none' : '0 2px 6px rgba(0,0,0,0.1)',
                            fontFamily: "'Poppins', sans-serif"
                          }}
                          onMouseOver={(e) => {
                            if (rfidDetails.length > 0) {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (rfidDetails.length > 0) {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                            }
                          }}
                        >
                          <FaFileExcel style={{ fontSize: '16px' }} />
                          Export Excel
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Filter Popup */}
                  {showRfidFilter && (
                    <>
                      {/* Overlay */}
                      <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(30,40,60,0.18)',
                        zIndex: 1000,
                        transition: 'opacity 0.2s',
                        opacity: filterAnim ? 1 : 0,
                        pointerEvents: filterAnim ? 'auto' : 'none',
                      }} />

                      {/* Filter Popup */}
                      <div
                        ref={filterPopupRef}
                        style={{
                          position: 'fixed',
                          top: '50%',
                          left: '50%',
                          transform: filterAnim ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -60%) scale(0.98)',
                          background: '#fff',
                          borderRadius: '20px',
                          boxShadow: '0 12px 48px rgba(0, 120, 212, 0.12)',
                          padding: 0,
                          minWidth: '600px',
                          maxWidth: '90vw',
                          maxHeight: '85vh',
                          zIndex: 1100,
                          border: '2px solid #0078d4',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          opacity: filterAnim ? 1 : 0,
                          transition: 'all 0.3s ease',
                          fontFamily: "'Poppins', sans-serif"
                        }}
                      >
                        {/* Gradient Top Bar */}
                        <div style={{
                          height: '8px',
                          width: '100%',
                          background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)'
                        }} />

                        <button 
                          onClick={closeFilterRfid} 
                          style={{ 
                            position: 'absolute', 
                            top: '14px', 
                            right: '14px',
                            background: 'none',
                            border: 'none',
                            color: '#0078d4',
                            fontSize: '20px',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          <FaTimes />
                        </button>

                        <div style={{ padding: '24px', overflowY: 'auto' }}>
                          <h4 style={{ 
                            textAlign: 'center',
                            marginBottom: '24px',
                            background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: '700'
                          }}>
                            Filter RFID Details
                          </h4>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '16px',
                            maxHeight: '60vh',
                            overflowY: 'auto',
                            padding: '0 4px'
                          }}>
                            {[
                              ['Device ID', 'DeviceId'],
                              ['RFID Code', 'RFIDCode'],
                              ['TID Value', 'TIDValue'],
                              ['Created On', 'CreatedOn'],
                              ['Last Updated', 'LastUpdated'],
                              ['Status', 'StatusType']
                            ].map(([label, key]) => (
                              <div key={key}>
                                <label style={{ 
                                  display: 'block',
                                  marginBottom: '6px',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#0078d4'
                                }}>
                                  {label}
                                </label>
                                {key === 'StatusType' ? (
                                  <select
                                    value={rfidFilters[key] || ''}
                                    onChange={e => handleFilterChangeRfid(key, e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      border: '1.5px solid #e5e9f2',
                                      fontSize: '14px',
                                      color: '#333',
                                      fontFamily: "'Poppins', sans-serif"
                                    }}
                                  >
                                    <option value="">All</option>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                  </select>
                                ) : key === 'DeviceId' ? (
                                  <select
                                    value={rfidFilters[key] || ''}
                                    onChange={e => handleFilterChangeRfid(key, e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      border: '1.5px solid #e5e9f2',
                                      fontSize: '14px',
                                      color: '#333',
                                      fontFamily: "'Poppins', sans-serif"
                                    }}
                                  >
                                    <option value="">All</option>
                                    {deviceIds.map(id => (
                                      <option key={id} value={id}>{id}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={rfidFilters[key] || ''}
                                    onChange={e => handleFilterChangeRfid(key, e.target.value)}
                                    placeholder={`Search ${label}`}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      border: '1.5px solid #e5e9f2',
                                      fontSize: '14px',
                                      color: '#333',
                                      fontFamily: "'Poppins', sans-serif"
                                    }}
                                  />
                                )}
                              </div>
                            ))}
                          </div>

                          <div style={{
                            marginTop: '24px',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px'
                          }}>
                            <button
                              onClick={resetFiltersRfid}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1.5px solid #0078d4',
                                background: '#fff',
                                color: '#0078d4',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontFamily: "'Poppins', sans-serif"
                              }}
                            >
                              Reset Filters
                            </button>
                            <button
                              onClick={closeFilterRfid}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontFamily: "'Poppins', sans-serif"
                              }}
                            >
                              Apply Filters
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* RFID Details Table */}
                  <div className="table-container" style={{
                    background: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e5e9f2',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    fontFamily: "'Poppins', sans-serif"
                  }}>
                    <table className="table" style={{ margin: 0, width: '100%' }}>
                      <thead>
                        <tr style={{
                          background: 'linear-gradient(90deg, #f8f9fa 0%, #fff 100%)',
                          borderBottom: '1px solid #e5e9f2'
                        }}>
                          <th style={{
                            padding: '14px 20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            fontFamily: "'Poppins', sans-serif"
                          }}>Sr No.</th>
                          <th style={{
                            padding: '14px 20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            fontFamily: "'Poppins', sans-serif"
                          }}>Device ID</th>
                          <th style={{
                            padding: '14px 20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            fontFamily: "'Poppins', sans-serif"
                          }}>RFID Code</th>
                          <th style={{
                            padding: '14px 20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            fontFamily: "'Poppins', sans-serif"
                          }}>EPC Value</th>
                          <th style={{
                            padding: '14px 20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            fontFamily: "'Poppins', sans-serif"
                          }}>Created On</th>
                          <th style={{
                            padding: '14px 20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            fontFamily: "'Poppins', sans-serif"
                          }}>Last Updated</th>
                          <th style={{
                            padding: '14px 20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            fontFamily: "'Poppins', sans-serif"
                          }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '40px 20px' }}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '12px',
                                fontFamily: "'Poppins', sans-serif"
                              }}>
                                <div className="spinner-border spinner-border-sm" role="status" style={{ color: '#0078d4' }}>
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                                <span style={{ color: '#666', fontSize: '14px' }}>Loading RFID details...</span>
                              </div>
                            </td>
                          </tr>
                        ) : filteredRfidDetails.length > 0 ? (
                          filteredRfidDetails.map((item, index) => (
                            <tr key={item.Id || index} style={{
                              borderBottom: '1px solid #e5e9f2',
                              background: index % 2 === 0 ? '#fff' : '#f8f9fa',
                              transition: 'background-color 0.3s ease',
                              fontFamily: "'Poppins', sans-serif"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f0f7ff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#f8f9fa';
                            }}
                            >
                              <td style={{
                                padding: '12px 20px',
                                fontSize: '14px',
                                color: '#333',
                                whiteSpace: 'nowrap',
                                fontFamily: "'Poppins', sans-serif",
                                fontWeight: '600'
                              }}>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                              <td style={{
                                padding: '12px 20px',
                                fontSize: '14px',
                                color: '#333',
                                whiteSpace: 'nowrap',
                                fontFamily: "'Poppins', sans-serif"
                              }}>{item.DeviceId}</td>
                              <td style={{
                                padding: '12px 20px',
                                fontSize: '14px',
                                color: '#333',
                                whiteSpace: 'nowrap',
                                fontFamily: "'Poppins', sans-serif"
                              }}>{item.RFIDCode}</td>
                              <td style={{
                                padding: '12px 20px',
                                fontSize: '14px',
                                color: '#333',
                                whiteSpace: 'nowrap',
                                fontFamily: "'Poppins', sans-serif"
                              }}>{item.TIDValue}</td>
                              <td style={{
                                padding: '12px 20px',
                                fontSize: '14px',
                                color: '#333',
                                whiteSpace: 'nowrap',
                                fontFamily: "'Poppins', sans-serif"
                              }}>{new Date(item.CreatedOn).toLocaleString()}</td>
                              <td style={{
                                padding: '12px 20px',
                                fontSize: '14px',
                                color: '#333',
                                whiteSpace: 'nowrap',
                                fontFamily: "'Poppins', sans-serif"
                              }}>{new Date(item.LastUpdated).toLocaleString()}</td>
                              <td style={{
                                padding: '12px 20px',
                                fontSize: '14px',
                                whiteSpace: 'nowrap',
                                fontFamily: "'Poppins', sans-serif"
                              }}>
                                <span
                                  className={`badge status-badge`}
                                  style={{
                                    background:
                                      item.StatusType ? 'linear-gradient(90deg, #d4f7df 0%, #a8f0c6 100%)' : '#eee',
                                    color:
                                      item.StatusType ? '#1ca96b' : '#555',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    padding: '4px 16px',
                                    borderRadius: 18,
                                    border:
                                      item.StatusType ? '1.5px solid #a8f0c6' : '1.5px solid #eee',
                                    letterSpacing: 0.2,
                                    minWidth: 70,
                                    display: 'inline-block',
                                    textAlign: 'center',
                                    fontFamily: 'Poppins, Inter, sans-serif',
                                    boxShadow: '0 2px 8px #e0e6ed33',
                                    transition: 'transform 0.15s',
                                    cursor: 'default',
                                  }}
                                  onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                                  onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                  {item.StatusType ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" style={{ 
                              textAlign: 'center', 
                              padding: '40px 20px', 
                              color: '#666',
                              fontFamily: "'Poppins', sans-serif"
                            }}>
                              <div style={{ fontSize: '14px' }}>No RFID details found</div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {rfidDetails.length > ITEMS_PER_PAGE && (
                      <div style={{ 
                        padding: '16px',
                        borderTop: '1px solid #e5e9f2',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#fff',
                        fontFamily: "'Poppins', sans-serif"
                      }}>
                        <button
                          onClick={() => handlePageChangeRfid(currentPage - 1)}
                          disabled={currentPage === 1}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #e5e9f2',
                            background: currentPage === 1 ? '#f8f9fa' : '#fff',
                            color: currentPage === 1 ? '#999' : '#333',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            fontFamily: "'Poppins', sans-serif"
                          }}
                        >
                          Previous
                        </button>
                        {[...Array(totalPagesRfid)].map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => handlePageChangeRfid(idx + 1)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: currentPage === idx + 1 ? 'none' : '1px solid #e5e9f2',
                              background: currentPage === idx + 1 
                                ? 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)'
                                : '#fff',
                              color: currentPage === idx + 1 ? '#fff' : '#333',
                              cursor: 'pointer',
                              minWidth: '32px',
                              fontWeight: currentPage === idx + 1 ? '600' : 'normal',
                              fontFamily: "'Poppins', sans-serif"
                            }}
                          >
                            {idx + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => handlePageChangeRfid(currentPage + 1)}
                          disabled={currentPage === totalPagesRfid}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #e5e9f2',
                            background: currentPage === totalPagesRfid ? '#f8f9fa' : '#fff',
                            color: currentPage === totalPagesRfid ? '#999' : '#333',
                            cursor: currentPage === totalPagesRfid ? 'not-allowed' : 'pointer',
                            fontFamily: "'Poppins', sans-serif"
                          }}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Export Success Modal */}
      {showExportSuccess && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.18)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
            borderRadius: 22,
            boxShadow: '0 8px 32px #0078d422',
            padding: '2.5rem 2.5rem 2rem 2.5rem',
            minWidth: 320,
            maxWidth: 380,
            textAlign: 'center',
            fontFamily: 'Poppins, Inter, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
            position: 'relative',
            border: '2px solid #e0e6ed',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 8, background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)', borderTopLeftRadius: 22, borderTopRightRadius: 22 }}></div>
            <FaCheckCircle size={48} style={{ color: 'url(#blueRedGradient)', filter: 'drop-shadow(0 2px 8px #0078d4aa)' }} />
            <svg width="0" height="0">
              <linearGradient id="blueRedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop stopColor="#0078d4" offset="0%" />
                <stop stopColor="#5470FF" offset="100%" />
              </linearGradient>
            </svg>
            <div style={{ fontWeight: 700, fontSize: 22, color: '#0078d4', marginBottom: 8, background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>File exported successfully.</div>
            <button
              onClick={() => setShowExportSuccess(false)}
              style={{
                background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '12px 32px',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: '0 2px 12px #0078d422',
                marginTop: 8,
                fontFamily: 'Poppins, Inter, sans-serif',
                transition: 'background 0.2s, transform 0.2s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'linear-gradient(90deg, #5470FF 0%, #0078d4 100%)';
                e.currentTarget.style.transform = 'scale(1.04)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;