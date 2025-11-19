import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaMicrochip, FaSearch, FaFilter, FaFileExport, FaTrash, FaSync, FaFilePdf, FaFileExcel, FaEnvelope, FaTimes } from 'react-icons/fa';
import { MdEmail, MdClear } from 'react-icons/md';
import { BiSearchAlt } from 'react-icons/bi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNotifications } from '../../context/NotificationContext';
import { useLoading } from '../../App';

const ITEMS_PER_PAGE = 10;

const RFIDDeviceDetails = () => {
  // Global loader
  const { setLoading } = useLoading();
  
  // State variables
  const [deviceData, setDeviceData] = useState([]);
  const [error, setError] = useState(null);
  const [deviceId, setDeviceId] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    DeviceId: '',
    Status: '',
    Location: ''
  });
  const [searchRfid, setSearchRfid] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const { addNotification } = useNotifications();

  // Get userInfo and token from localStorage
  useEffect(() => {
    // First try to get from userInfo as it's the most reliable source
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const parsedUserInfo = JSON.parse(userInfo);
        if (parsedUserInfo.ClientCode) {
          setClientCode(parsedUserInfo.ClientCode);
          return; // Exit if we got the client code
        }
      } catch (err) {
        console.error('Error parsing userInfo:', err);
      }
    }

    // Fallback to token if userInfo doesn't have ClientCode
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decodedToken = JSON.parse(window.atob(base64));
        
        if (decodedToken.ClientCode) {
          setClientCode(decodedToken.ClientCode);
        } else {
          setError('Client code not found. Please login again.');
        }
      } catch (err) {
        console.error('Error getting client code from token:', err);
        setError('Error loading client information');
      }
    } else {
      setError('No authentication found. Please login again.');
    }

    // Handle window resize for responsive design
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Run only once on component mount

  // Fetch RFID device details with validation
  const fetchDeviceDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!clientCode) {
        throw new Error('Client code not found. Please login again.');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/RFIDDevice/GetAllRFIDDetails',
        { ClientCode: clientCode },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setDeviceData(response.data.data);
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (err) {
      console.error('Error fetching device details:', err);
      setError(err.message || 'Failed to fetch device details');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (clientCode) {
      fetchDeviceDetails();
    }
  }, [clientCode]);

  const handleGetDetails = () => {
    fetchDeviceDetails();
  };

  const handleClear = async () => {
    try {
      if (!deviceId && !selectedDevice) {
        toast.error('Please select a device or enter a device ID');
        return;
      }

      const deviceToDelete = deviceId || selectedDevice;
      const clientCode = localStorage.getItem('userInfo') ? 
        JSON.parse(localStorage.getItem('userInfo')).ClientCode : '';

      if (!clientCode) {
        toast.error('Client code not found. Please login again.');
        return;
      }

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/RFIDDevice/DeleteRFIDByClientAndDevice',
        {
          ClientCode: clientCode,
          DeviceId: deviceToDelete
        }
      );

      if (response.data && response.data.success) {
        toast.success('Device deleted successfully');
        // Reset all form fields
        setDeviceId('');
        setSelectedDevice('');
        setSearch('');
        setSearchRfid('');
        setFilters({
          DeviceId: '',
          Status: '',
          Location: ''
        });
        // Refresh the device list
        fetchDeviceDetails();
        addNotification({
          title: 'Device deleted',
          description: `Device deleted: ${deviceToDelete}`,
          type: 'success'
        });
      } else {
        toast.error(response.data?.message || 'Failed to delete device');
      }
    } catch (err) {
      console.error('Error deleting device:', err);
      toast.error(err.response?.data?.message || 'Failed to delete device');
    }
  };

  const handleDelete = async () => {
    try {
      if (selectedRows.length === 0) {
        toast.error('Please select rows to delete');
        return;
      }

      const clientCode = localStorage.getItem('userInfo') ? 
        JSON.parse(localStorage.getItem('userInfo')).ClientCode : '';

      if (!clientCode) {
        toast.error('Client code not found. Please login again.');
        return;
      }

      // Get the device ID from the selected row
      const deviceToDelete = deviceData.find(d => selectedRows.includes(d.Id))?.DeviceId;
      
      if (!deviceToDelete) {
        toast.error('Selected device not found');
        return;
      }

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/RFIDDevice/DeleteRFIDByClientAndDevice',
        {
          ClientCode: clientCode,
          DeviceId: deviceToDelete
        }
      );

      if (response.data && response.data.success) {
        toast.success('Device deleted successfully');
        setSelectedRows([]);
        fetchDeviceDetails(); // Refresh the list
        addNotification({
          title: 'Device deleted',
          description: `Device deleted: ${deviceToDelete}`,
          type: 'success'
        });
      } else {
        toast.error(response.data?.message || 'Failed to delete device');
      }
    } catch (err) {
      console.error('Error deleting device:', err);
      toast.error(err.response?.data?.message || 'Failed to delete device');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDeviceDetails();
  };

  const handleRowSelection = (id) => {
    setSelectedRows(prev => {
      if (prev.includes(id)) {
        return prev.filter(rowId => rowId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Filtering and searching
  const filteredDeviceData = useMemo(() => {
    let data = deviceData;
    // Search
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(d =>
        (d.DeviceId && d.DeviceId.toLowerCase().includes(s)) ||
        (d.Status && d.Status.toLowerCase().includes(s)) ||
        (d.Location && d.Location.toLowerCase().includes(s))
      );
    }
    // Column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        data = data.filter(d => (d[key] || '').toString().toLowerCase().includes(value.toLowerCase()));
      }
    });
    return data;
  }, [deviceData, search, filters]);

  // Filter data based on device selection and RFID search
  const filteredData = filteredDeviceData.filter(item => {
    const matchesDevice = !selectedDevice || item.DeviceId === selectedDevice;
    const matchesRfid = !searchRfid || 
      item.RFIDCode?.toLowerCase().includes(searchRfid.toLowerCase());
    return matchesDevice && matchesRfid;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const totalRecords = filteredData.length;
  const paginatedDeviceData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  // Handle search change
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setCurrentPage(1);
  };

  // Export functions
  const handleExportToExcel = () => {
    try {
      if (!filteredData || filteredData.length === 0) {
        toast.error('No data available to export');
        return;
      }

      const exportData = filteredData.map((item, index) => ({
        'Sr No.': index + 1,
        'Device ID': item.DeviceId || '',
        'RFID Code': item.RFIDCode || '',
        'EPC Value': item.EPCValue || '',
        'TID Value': item.TIDValue || '',
        'Client Code': clientCode || '',
        'Status': item.StatusType ? 'Active' : 'Inactive',
        'Created On': item.CreatedOn ? new Date(item.CreatedOn).toLocaleString() : '',
        'Last Updated': item.LastUpdated ? new Date(item.LastUpdated).toLocaleString() : '',
        'Location': item.Location || '',
        'Description': item.Description || '',
        'Notes': item.Notes || ''
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'RFID Devices');
      XLSX.writeFile(wb, 'RFID_Devices.xlsx');
      setShowExportModal(false);
      toast.success('Excel file downloaded successfully!');
      addNotification({
        title: 'Export successful',
        description: `RFID device details exported to Excel by ${localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')).Username : 'User'}`,
        type: 'info'
      });
    } catch (err) {
      console.error('Export to Excel failed:', err);
      toast.error('Failed to export Excel file');
    }
  };

  const handleExportToPDF = () => {
    try {
      if (!filteredData || filteredData.length === 0) {
        toast.error('No data available to export');
        return;
      }

      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('RFID Device Details', 14, 15);
      
      // Add timestamp
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);

      const tableColumn = [
        'Sr No.', 'Device ID', 'RFID Code', 'EPC Value', 'TID Value',
        'Client Code', 'Status', 'Created On', 'Last Updated'
      ];

      const tableRows = filteredData.map((item, index) => [
        index + 1,
        item.DeviceId || '',
        item.RFIDCode || '',
        item.EPCValue || '',
        item.TIDValue || '',
        clientCode || '',
        item.StatusType ? 'Active' : 'Inactive',
        item.CreatedOn ? new Date(item.CreatedOn).toLocaleString() : '',
        item.LastUpdated ? new Date(item.LastUpdated).toLocaleString() : ''
      ]);

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });

      doc.save('RFID_Devices.pdf');
      setShowExportModal(false);
      toast.success('PDF file downloaded successfully!');
      addNotification({
        title: 'Export successful',
        description: `RFID device details exported to PDF by ${localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')).Username : 'User'}`,
        type: 'info'
      });
    } catch (err) {
      console.error('Export to PDF failed:', err);
      toast.error('Failed to export PDF file');
    }
  };

  const handleSendEmail = () => {
    if (!emailAddress) {
      toast.error('Please enter an email address');
      return;
    }

    // Here you would implement the email sending logic
    // For now, we'll just show a success message
    toast.success(`Export sent to ${emailAddress}`);
    setShowExportModal(false);
    setEmailAddress('');
  };

  // Styles
  const thStyle = {
    padding: '12px 16px',
    fontWeight: '600',
    color: '#38414a',
    whiteSpace: 'nowrap',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
  };

  const tdStyle = {
    padding: '12px 16px',
    verticalAlign: 'middle',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '16px' }}>
      <style>
        {`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        *::-webkit-scrollbar {
          display: none;
        }
        body, html {
          overflow-x: hidden;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .table-responsive {
            font-size: 10px;
          }
        }
        @media (max-width: 480px) {
          .table-responsive {
            font-size: 10px;
          }
        }
        `}
      </style>
      <style>
        {`
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
          .table-responsive .btn-sm {
            font-size: 11px;
            padding: 0.25rem 0.5rem;
          }
        `}
      </style>
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
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: '#1e293b',
              lineHeight: '1.2'
            }}>RFID Device Details</h2>
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
              placeholder="Search by RFID Code..."
              value={searchRfid}
              onChange={(e) => {
                setSearchRfid(e.target.value);
                setCurrentPage(1);
              }}
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
            disabled={selectedRows.length === 0}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid #ef4444',
              background: selectedRows.length === 0 ? '#f1f5f9' : '#ffffff',
              color: selectedRows.length === 0 ? '#94a3b8' : '#ef4444',
              cursor: selectedRows.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (selectedRows.length > 0) {
                e.target.style.background = '#ef4444';
                e.target.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedRows.length > 0) {
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

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div style={{
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
            minWidth: '1400px',
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
                        setSelectedRows(paginatedDeviceData.map(item => item.Id));
                      } else {
                        setSelectedRows([]);
                      }
                    }}
                    checked={paginatedDeviceData.length > 0 && selectedRows.length === paginatedDeviceData.length}
                    style={{
                      cursor: 'pointer',
                      width: '16px',
                      height: '16px'
                    }}
                  />
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Sr No.</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Device ID</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>RFID Code</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>EPC Value</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>TID Value</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Created On</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Last Updated</th>
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
              {paginatedDeviceData.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                    No devices found
                  </td>
                </tr>
              ) : (
                paginatedDeviceData.map((item, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index;
                  const isSelected = selectedRows.includes(item.Id);
                  return (
                    <tr
                      key={item.Id}
                      onClick={() => handleRowSelection(item.Id)}
                      style={{
                        cursor: 'pointer',
                        borderBottom: '1px solid #e5e7eb',
                        background: isSelected 
                          ? '#eff6ff' 
                          : globalIndex % 2 === 0 
                          ? '#ffffff' 
                          : '#f8fafc',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '#f1f5f9';
                          const statusCell = e.currentTarget.querySelector('td:last-child');
                          if (statusCell) {
                            statusCell.style.background = '#f1f5f9';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          const bgColor = globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
                          e.currentTarget.style.background = bgColor;
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
                          checked={isSelected}
                          onChange={() => handleRowSelection(item.Id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px'
                          }}
                        />
                      </td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>{globalIndex + 1}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>{item.DeviceId}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>{item.RFIDCode}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>{item.EPCValue || 'N/A'}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        fontFamily: 'monospace'
                      }}>{item.TIDValue}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>{item.CreatedOn ? new Date(item.CreatedOn).toLocaleString() : 'N/A'}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>{item.LastUpdated ? new Date(item.LastUpdated).toLocaleString() : 'N/A'}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        position: 'sticky',
                        right: 0,
                        background: isSelected 
                          ? '#eff6ff' 
                          : globalIndex % 2 === 0 
                          ? '#ffffff' 
                          : '#f8fafc',
                        zIndex: 5,
                        borderLeft: '2px solid #e5e7eb'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          style={{
                            padding: '4px 12px',
                            fontSize: '10px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid',
                            background: '#ffffff',
                            color: item.StatusType ? '#10b981' : '#64748b',
                            borderColor: item.StatusType ? '#10b981' : '#cbd5e1',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = item.StatusType ? '#10b981' : '#64748b';
                            e.target.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#ffffff';
                            e.target.style.color = item.StatusType ? '#10b981' : '#64748b';
                          }}
                        >
                          {item.StatusType ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderTop: '1px solid #e5e7eb',
          background: '#ffffff',
          borderRadius: '0 0 12px 12px',
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
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
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
              onClick={() => handlePageChange(currentPage - 1)}
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
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: currentPage === page ? '#3b82f6' : '#ffffff',
                    color: currentPage === page ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
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
              );
            })}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
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
      )}

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
                }}>
                  Filter Devices
                </h6>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Device ID */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: 600, 
                    fontSize: '10px',
                    color: '#475569'
                  }}>
                    Device ID
                  </label>
                  <input
                    type="text"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    placeholder="Enter Device ID"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>

                {/* Select Device */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: 600, 
                    fontSize: '10px',
                    color: '#475569'
                  }}>
                    Select Device
                  </label>
                  <select
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box',
                      background: '#ffffff',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  >
                    <option value="">Select Device</option>
                    {Array.from(new Set(deviceData.map(d => d.DeviceId))).map(deviceId => (
                      <option key={deviceId} value={deviceId}>{deviceId}</option>
                    ))}
                  </select>
                </div>

                {/* Client Code */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: 600, 
                    fontSize: '10px',
                    color: '#475569'
                  }}>
                    Client Code
                  </label>
                  <input
                    type="text"
                    value={clientCode}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      outline: 'none',
                      background: '#f8fafc',
                      color: '#64748b',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <button
                    onClick={() => {
                      handleGetDetails();
                      setShowFilterPanel(false);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      background: '#ffffff',
                      color: '#10b981',
                      border: '1px solid #10b981',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
                    <FaSearch /> Get Details
                  </button>
                  <button
                    onClick={() => {
                      setDeviceId('');
                      setSelectedDevice('');
                      setShowFilterPanel(false);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      background: '#ffffff',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#ef4444';
                      e.target.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#ffffff';
                      e.target.style.color = '#ef4444';
                    }}
                  >
                    <MdClear /> Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="export-modal-overlay">
          <div className="export-modal">
            <div className="export-modal-header">
              <h2>Export Label Stock List</h2>
              <button 
                className="close-button"
                onClick={() => setShowExportModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="export-modal-content">
              <p className="export-subtitle">Choose your preferred export format</p>
              
              <div className="export-option" onClick={handleExportToExcel}>
                <div className="export-option-icon excel">
                  <FaFileExcel />
                </div>
                <div className="export-option-text">
                  <h3>Export as Excel</h3>
                  <p>Download as .xlsx spreadsheet file</p>
                </div>
              </div>

              <div className="export-option" onClick={handleExportToPDF}>
                <div className="export-option-icon pdf">
                  <FaFilePdf />
                </div>
                <div className="export-option-text">
                  <h3>Export as PDF</h3>
                  <p>Download as formatted PDF document</p>
                </div>
              </div>

              <div className="export-option">
                <div className="export-option-icon email">
                  <MdEmail />
                </div>
                <div className="export-option-text">
                  <h3>Send to Email</h3>
                  <p>Send data to specified email address</p>
                  <div className="email-input-container">
                    <input
                      type="email"
                      placeholder="Enter email address"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                    />
                    <button 
                      className="send-email-btn"
                      onClick={handleSendEmail}
                      disabled={!emailAddress}
                    >
                      Send Email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .rfid-device-container {
          padding: 24px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section-title {
          font-size: 24px;
          color: #2d3748;
          margin-bottom: 24px;
          font-weight: 600;
        }

        .search-section {
          background: #f8fafc;
          padding: 24px;
          border-radius: 8px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }

        .search-form {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          align-items: end;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 14px;
          color: #4a5568;
          font-weight: 500;
        }

        .form-input,
        .form-select {
          height: 40px;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s;
          width: 100%;
          background: white;
        }

        .form-input:focus,
        .form-select:focus {
          border-color: #3182ce;
          outline: none;
          box-shadow: 0 0 0 1px #3182ce;
        }

        .readonly-input {
          background: #f7fafc;
          cursor: not-allowed;
          color: #4a5568;
        }

        .button-group {
          display: flex;
          gap: 12px;
          margin-top: 4px;
        }

        .btn-get-details,
        .btn-clear {
          height: 40px;
          padding: 0 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          min-width: 120px;
          justify-content: center;
        }

        .btn-icon {
          font-size: 16px;
        }

        .btn-get-details {
          background: #2196f3;
          color: white;
          border: none;
        }

        .btn-get-details:hover:not(:disabled) {
          background: #1976d2;
        }

        .btn-get-details:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-clear {
          background: #dc3545;
          color: white;
          border: none;
        }

        .btn-clear:hover {
          background: #c82333;
        }

        .table-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .search-box {
          display: flex;
          align-items: center;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 12px;
          width: 300px;
          transition: all 0.2s;
        }

        .search-box:focus-within {
          border-color: #3182ce;
          box-shadow: 0 0 0 1px #3182ce;
        }

        .search-box input {
          border: none;
          outline: none;
          padding: 4px 8px;
          font-size: 14px;
          width: 100%;
          color: #2d3748;
        }

        .search-box input::placeholder {
          color: #a0aec0;
        }

        .search-icon {
          color: #a0aec0;
          font-size: 14px;
        }

        .right-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .control-btn {
          height: 40px;
          padding: 0 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          min-width: 120px;
          justify-content: center;
        }

        .btn-export {
          background: #4caf50;
          color: white;
          border: none;
        }

        .btn-export:hover:not(:disabled) {
          background: #43a047;
        }

        .btn-refresh {
          background: #6b7280;
          color: white;
          border: none;
        }

        .btn-refresh:hover:not(:disabled) {
          background: #4b5563;
        }

        .btn-refresh.refreshing svg {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .control-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .table-container {
          overflow-x: auto;
          background: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
        }

        th {
          background: #f7fafc;
          color: #4a5568;
          font-weight: 500;
        }

        tr:hover {
          background: #f7fafc;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.active {
          background: #f0fff4;
          color: #38a169;
        }

        .status-badge.inactive {
          background: #fff5f5;
          color: #e53e3e;
        }

        .error-message {
          background-color: #fee2e2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 6px;
          margin: 16px 0;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-get-details:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .export-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .export-modal {
          background: white;
          border-radius: 8px;
          width: 500px;
          max-width: 90vw;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .export-modal-header {
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .export-modal-header h2 {
          margin: 0;
          font-size: 18px;
          color: #2d3748;
        }

        .close-button {
          background: none;
          border: none;
          color: #718096;
          cursor: pointer;
          padding: 4px;
        }

        .export-modal-content {
          padding: 20px;
        }

        .export-subtitle {
          color: #718096;
          margin-bottom: 20px;
        }

        .export-option {
          display: flex;
          align-items: flex-start;
          padding: 15px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 15px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .export-option:hover {
          border-color: #3182ce;
          background: #f7fafc;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .export-option-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
          font-size: 20px;
        }

        .export-option-icon.excel {
          background-color: #ebf8ff;
          color: #2b6cb0;
        }

        .export-option-icon.pdf {
          background-color: #fff5f5;
          color: #e53e3e;
        }

        .export-option-icon.email {
          background-color: #f0fff4;
          color: #38a169;
        }

        .export-option-text h3 {
          margin: 0;
          font-size: 16px;
          color: #2d3748;
        }

        .export-option-text p {
          margin: 5px 0 0;
          font-size: 14px;
          color: #718096;
        }

        .email-input-container {
          margin-top: 10px;
          display: flex;
          gap: 10px;
        }

        .email-input-container input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 14px;
        }

        .send-email-btn {
          background-color: #3182ce;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .send-email-btn:hover:not(:disabled) {
          background-color: #2c5282;
        }

        .send-email-btn:disabled {
          background-color: #cbd5e0;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default RFIDDeviceDetails; 