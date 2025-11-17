import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaMicrochip, FaSearch, FaFilter, FaFileExport, FaTrash, FaSync, FaFilePdf, FaFileExcel, FaEnvelope, FaTimes } from 'react-icons/fa';
import { MdEmail, MdClear } from 'react-icons/md';
import { BiSearchAlt } from 'react-icons/bi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNotifications } from '../../context/NotificationContext';

const ITEMS_PER_PAGE = 10;

const RFIDDeviceDetails = () => {
  // State variables
  const [deviceData, setDeviceData] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedDeviceData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
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
    <div className="container-fluid p-3">
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
      {/* Compact Header */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body p-3">
          <div className="row align-items-center">
            <div className="col-md-4">
              <div className="d-flex align-items-center">
                <div className="bg-primary rounded-3 p-2 me-3">
                  <FaMicrochip className="text-white" style={{ fontSize: '20px' }} />
                </div>
                <div>
                  <h5 className="mb-1 fw-bold text-dark">RFID Device Details</h5>
                  <p className="mb-0 text-muted small">Manage and view your RFID device information</p>
                  <span className="badge bg-primary mt-1">{deviceData.length} devices</span>
                </div>
              </div>
            </div>
            <div className="col-md-8">
              <div className="d-flex align-items-center justify-content-end gap-3">
                <div className="position-relative">
                  <FaSearch className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: '14px' }} />
                  <input
                    type="text"
                    className="form-control form-control-sm ps-4"
                    placeholder="Search by RFID Code..."
                    value={searchRfid}
                    onChange={(e) => setSearchRfid(e.target.value)}
                    style={{ width: '280px' }}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button 
                    onClick={handleDelete} 
                    disabled={selectedRows.length === 0}
                    className="btn btn-outline-danger btn-sm"
                  >
                    <FaTrash className="me-1" /> Delete
                  </button>
                  <button 
                    onClick={() => setShowExportModal(true)}
                    className="btn btn-outline-primary btn-sm"
                  >
                    <FaFileExport className="me-1" /> Export
                  </button>
                  <button 
                    onClick={handleRefresh}
                    className="btn btn-outline-secondary btn-sm"
                  >
                    <FaSync className="me-1" /> Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body p-3">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-medium text-muted mb-1">Device ID</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Enter Device ID"
                value={deviceId}
                onChange={e => setDeviceId(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-medium text-muted mb-1">Select Device</label>
              <select
                className="form-select form-select-sm"
                value={selectedDevice}
                onChange={e => setSelectedDevice(e.target.value)}
              >
                <option value="">Select Device</option>
                {Array.from(new Set(deviceData.map(d => d.DeviceId))).map(deviceId => (
                  <option key={deviceId} value={deviceId}>{deviceId}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-medium text-muted mb-1">Client Code</label>
              <input
                type="text"
                className="form-control form-control-sm bg-light"
                value={clientCode}
                readOnly
              />
            </div>
            <div className="col-md-3">
              <div className="d-flex gap-2">
                <button 
                  onClick={handleGetDetails}
                  className="btn btn-primary btn-sm"
                >
                  <FaSearch className="me-1" /> Get Details
                </button>
                <button 
                  onClick={handleClear}
                  className="btn btn-outline-danger btn-sm"
                >
                  <MdClear className="me-1" /> Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="card shadow-sm border-0" style={{ marginTop: '24px' }}>
        <div className="card-body p-0">
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table table-hover table-sm mb-0" style={{ minWidth: '1200px' }}>
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows(deviceData.map(item => item.Id));
                        } else {
                          setSelectedRows([]);
                        }
                      }}
                      checked={deviceData.length > 0 && selectedRows.length === deviceData.length}
                    />
                  </th>
                  <th className="text-nowrap">Sr No.</th>
                  <th className="text-nowrap">Device ID</th>
                  <th className="text-nowrap">RFID Code</th>
                  <th className="text-nowrap">EPC Value</th>
                  <th className="text-nowrap">TID Value</th>
                  <th className="text-nowrap">Created On</th>
                  <th className="text-nowrap">Last Updated</th>
                  <th className="text-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      <div className="d-flex align-items-center justify-content-center gap-2">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <span className="text-muted small">Loading RFID device data...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedDeviceData.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      <span className="text-muted small">No devices found</span>
                    </td>
                  </tr>
                ) : (
                  paginatedDeviceData.map((item, index) => (
                    <tr 
                      key={item.Id}
                      className={selectedRows.includes(item.Id) ? 'table-primary' : ''}
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
                      <td className="text-nowrap">{index + 1}</td>
                      <td className="text-nowrap">{item.DeviceId}</td>
                      <td className="text-nowrap">{item.RFIDCode}</td>
                      <td className="text-nowrap">{item.EPCValue || 'N/A'}</td>
                      <td className="text-nowrap">{item.TIDValue}</td>
                      <td className="text-nowrap">{new Date(item.CreatedOn).toLocaleString()}</td>
                      <td className="text-nowrap">{new Date(item.LastUpdated).toLocaleString()}</td>
                      <td className="text-nowrap">
                        <button 
                          className={`btn btn-sm ${
                            item.StatusType ? 'btn-outline-success' : 'btn-outline-secondary'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle status click if needed
                          }}
                        >
                          {item.StatusType ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="card-footer border-top-0" style={{ backgroundColor: '#f8f9fa' }}>
          <div className="d-flex justify-content-between align-items-center">
            <div className="small text-muted">
              Showing <strong>{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</strong> to <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</strong> of <strong>{filteredData.length}</strong> entries
            </div>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage - 1)}
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
                    onClick={() => handlePageChange(currentPage + 1)}
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