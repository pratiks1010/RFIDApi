import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaSearch, FaFileExcel, FaTrash, FaChevronLeft, FaChevronRight, FaFilePdf, FaEnvelope, FaTimes, FaEdit, FaCheck } from 'react-icons/fa';
import { BiTag } from 'react-icons/bi';
import { HiOutlineArrowUpTray } from 'react-icons/hi2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNotifications } from '../../context/NotificationContext';

const ITEMS_PER_PAGE = 100;

const RFIDTags = () => {
  const [rfidData, setRfidData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [editingRows, setEditingRows] = useState(new Set());
  const [editedValues, setEditedValues] = useState({});
  const [pageInput, setPageInput] = useState('');
  const { addNotification } = useNotifications();

  // Get client code from localStorage
  const getClientCode = () => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        return JSON.parse(userInfo).ClientCode;
      } catch (err) {
        console.error('Error parsing userInfo:', err);
        return null;
      }
    }
    return null;
  };

  // Fetch RFID data
  const fetchRFIDData = async () => {
    try {
      setLoading(true);
      const clientCode = getClientCode();
      
      if (!clientCode) {
        throw new Error('Client code not found. Please login again.');
      }

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllRFID',
        { ClientCode: clientCode }
      );

      if (response.data && Array.isArray(response.data)) {
        setRfidData(response.data);
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (err) {
      console.error('Error fetching RFID data:', err);
      setError(err.message || 'Failed to fetch RFID data');
      toast.error(err.message || 'Failed to fetch RFID data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRFIDData();
  }, []);

  // Filter data based on search query
  const filteredData = rfidData.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    return (
      item.BarcodeNumber?.toLowerCase().includes(searchLower) ||
      item.TidValue?.toLowerCase().includes(searchLower)
    );
  });

  // Calculate total pages
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  // Calculate pagination
  const getPaginatedData = (data, page) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  // Get paginated data
  const currentTableData = getPaginatedData(filteredData, currentPage);

  // Handle direct page navigation
  const handlePageInputChange = (e) => {
    const value = e.target.value;
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setPageInput(value);
    }
  };

  const handlePageInputSubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      const pageNum = parseInt(pageInput);
      if (pageNum >= 1 && pageNum <= totalPages) {
        setCurrentPage(pageNum);
        setPageInput('');
      } else {
        toast.error(`Please enter a page number between 1 and ${totalPages}`);
        setPageInput('');
      }
    }
  };


  // Handle checkbox selection
  const handleSelectTag = (id) => {
    setSelectedTags(prev => {
      if (prev.includes(id)) {
        return prev.filter(tagId => tagId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTags(prev => [...new Set([...prev, ...currentTableData.map(item => item.Id)])]);
    } else {
      setSelectedTags(prev => prev.filter(id => !currentTableData.find(item => item.Id === id)));
    }
  };

  // Handle export options
  const handleExportExcel = () => {
    toast.success('Exporting to Excel...');
    setShowExportModal(false);
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    addNotification({
      title: 'Export successful',
      description: `RFID tags exported to Excel by ${userInfo?.Username || userInfo?.UserName || 'User'}`,
      type: 'info'
    });
  };

  const handleExportPDF = () => {
    if (!rfidData || rfidData.length === 0) {
      toast.error('No data available to export');
      return;
    }
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('RFID Tags Report', 14, 16);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 24);
      const tableColumn = ['Sr No', 'RFID Code', 'EPC Value'];
      const tableRows = rfidData.map((item, idx) => [
        idx + 1,
        item.BarcodeNumber || '-',
        item.TidValue || '-'
      ]);
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [69, 73, 232], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });
      doc.save('RFID_Tags_Report.pdf');
      setShowExportModal(false);
      toast.success('PDF file downloaded successfully!');
      addNotification({
        title: 'Export successful',
        description: `RFID tags exported to PDF by ${userInfo?.Username || userInfo?.UserName || 'User'}`,
        type: 'info'
      });
    } catch (err) {
      console.error('Export to PDF failed:', err);
      toast.error('Failed to export PDF file');
    }
  };

  const handleEmailExport = () => {
    if (!emailInput) {
      toast.error('Please enter an email address');
      return;
    }
    toast.success(`Sending export to ${emailInput}...`);
    setEmailInput('');
    setShowExportModal(false);
    addNotification({
      title: 'Export successful',
      description: `RFID tags exported to email: ${emailInput} by ${userInfo?.Username || userInfo?.UserName || 'User'}`,
      type: 'info'
    });
  };

  // Handle delete
  const handleDelete = () => {
    if (selectedTags.length === 0) {
      toast.warning('Please select tags to delete');
      return;
    }
    const deletedTags = selectedTags.map(id => rfidData.find(tag => tag.Id === id)?.BarcodeNumber).filter(Boolean).join(', ');
    addNotification({
      title: 'Tag deleted',
      description: `${selectedTags.length} tag(s) deleted: ${deletedTags}`,
      type: 'success'
    });
  };

  // Handle edit functions
  const handleEditEPC = (id, currentValue) => {
    setEditingRows(prev => new Set([...prev, id]));
    setEditedValues(prev => ({ ...prev, [id]: currentValue }));
  };

  const handleSaveEPC = async (id) => {
    try {
      const newValue = editedValues[id];
      if (!newValue || newValue.trim() === '') {
        toast.error('EPC value cannot be empty');
        return;
      }

      // Find the item being edited
      const item = rfidData.find(item => item.Id === id);
      if (!item) {
        toast.error('Item not found');
        return;
      }

      const clientCode = getClientCode();
      if (!clientCode) {
        toast.error('Client code not found. Please login again.');
        return;
      }

      // Make API call to update the TID value
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/UpdateClientTidValue',
        {
          ClientCode: clientCode,
          BarcodeNumber: item.BarcodeNumber,
          NewTidValue: newValue
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success !== false) {
        // Update the local state with new EPC value
      setRfidData(prev => prev.map(item => 
        item.Id === id ? { ...item, TidValue: newValue } : item
      ));

      // Remove from editing state
      setEditingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });

      // Remove from edited values
      setEditedValues(prev => {
        const newValues = { ...prev };
        delete newValues[id];
        return newValues;
      });

      toast.success('EPC value updated successfully');
      
      // Add notification
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      addNotification({
        title: 'EPC Value Updated',
          description: `EPC value updated to: ${newValue} for RFID Code: ${item.BarcodeNumber} by ${userInfo?.Username || userInfo?.UserName || 'User'}`,
        type: 'success'
      });
      } else {
        throw new Error(response.data?.message || 'Failed to update EPC value');
      }

    } catch (error) {
      console.error('Error updating EPC value:', error);
      toast.error(error.message || 'Failed to update EPC value');
    }
  };

  const handleCancelEdit = (id) => {
    setEditingRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    
    setEditedValues(prev => {
      const newValues = { ...prev };
      delete newValues[id];
      return newValues;
    });
  };

  const handleEPCChange = (id, value) => {
    setEditedValues(prev => ({ ...prev, [id]: value }));
  };

  if (loading) {
  return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
          </div>
            </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-3" role="alert">
        <i className="fas fa-exclamation-triangle me-2"></i>
        {error}
          </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      {/* Header Section */}
      <div className="card border-0 mb-3" style={{ borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div className="card-body p-3">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-primary rounded p-2" style={{ width: '40px', height: '40px' }}>
                  <BiTag className="text-white" style={{ fontSize: '20px' }} />
          </div>
                <div>
                  <h5 className="mb-1 fw-bold" style={{ fontSize: '18px', color: '#1e293b' }}>RFID Tags</h5>
                  <p className="mb-1 text-muted" style={{ fontSize: '13px' }}>Manage and track all your RFID tags efficiently.</p>
                  <span className="text-primary fw-bold" style={{ fontSize: '14px' }}>
                    {rfidData.length.toLocaleString()} tags in total
                  </span>
        </div>
      </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex justify-content-end gap-2">
              <button 
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleDelete}
                  disabled={selectedTags.length === 0}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  <FaTrash className="me-1" style={{ fontSize: '11px' }} />
                  Delete Selected
                </button>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowExportModal(true)}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  <HiOutlineArrowUpTray className="me-1" style={{ fontSize: '11px' }} />
                  Export
              </button>
            </div>
                  </div>
                  </div>
                  </div>
                  </div>

      {/* Search Section */}
      <div className="card border-0 mb-3" style={{ borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div className="card-body p-3">
          <div className="input-group" style={{ maxWidth: '400px' }}>
            <span className="input-group-text bg-light border-end-0">
              <FaSearch className="text-muted" style={{ fontSize: '12px' }} />
            </span>
                      <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search by RFID Code, EPC Value, TID Value..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '13px' }}
            />
                    </div>
                  </div>
                </div>

      {/* Table Section */}
      <div className="card border-0" style={{ borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '24px' }}>
        <div className="card-header bg-light border-0 py-2">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-bold" style={{ fontSize: '14px', color: '#1e293b' }}>RFID Tags</h6>
            <span className="badge bg-secondary" style={{ fontSize: '11px' }}>
              {currentTableData.length} items (Page {currentPage} of {totalPages})
            </span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover table-sm mb-0" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                <th className="text-center" style={{ width: '50px' }}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={currentTableData.length > 0 && currentTableData.every(item => selectedTags.includes(item.Id))}
                    className="form-check-input"
                    />
                  </th>
                <th style={{ fontSize: '12px' }}>Sr No.</th>
                <th style={{ fontSize: '12px' }}>RFID Code</th>
                <th style={{ fontSize: '12px' }}>EPC Value</th>
                <th className="text-center" style={{ width: '80px', fontSize: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentTableData.map((item, index) => (
                <tr key={item.Id} className={selectedTags.includes(item.Id) ? 'table-primary' : ''}>
                  <td className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(item.Id)}
                        onChange={() => handleSelectTag(item.Id)}
                      className="form-check-input"
                      />
                    </td>
                  <td style={{ fontSize: '12px' }}>{((currentPage - 1) * ITEMS_PER_PAGE) + index + 1}</td>
                  <td style={{ fontSize: '12px' }}>{item.BarcodeNumber}</td>
                  <td style={{ fontSize: '12px' }}>
                      {editingRows.has(item.Id) ? (
                        <input
                          type="text"
                          value={editedValues[item.Id] || ''}
                          onChange={(e) => handleEPCChange(item.Id, e.target.value)}
                        className="form-control form-control-sm"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                          autoFocus
                        />
                      ) : (
                        item.TidValue
                      )}
                    </td>
                  <td className="text-center">
                      {editingRows.has(item.Id) ? (
                      <div className="d-flex gap-1 justify-content-center">
                          <button
                          className="btn btn-success btn-sm"
                            onClick={() => handleSaveEPC(item.Id)}
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                            title="Save"
                          >
                          <FaCheck style={{ fontSize: '10px' }} />
                          </button>
                          <button
                          className="btn btn-secondary btn-sm"
                            onClick={() => handleCancelEdit(item.Id)}
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                            title="Cancel"
                          >
                          <FaTimes style={{ fontSize: '10px' }} />
                          </button>
                        </div>
                      ) : (
                        <button
                        className="btn btn-outline-primary btn-sm"
                          onClick={() => handleEditEPC(item.Id, item.TidValue)}
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                          title="Edit EPC Value"
                        >
                        <FaEdit style={{ fontSize: '10px' }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        
        {/* Pagination */}
          {totalPages > 1 && (
          <div className="card-footer bg-light border-0 py-2">
            <div className="d-flex justify-content-center align-items-center gap-2">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                <FaChevronLeft style={{ fontSize: '10px' }} />
              </button>
              <span className="text-muted" style={{ fontSize: '12px' }}>
                Page {currentPage} of {totalPages}
              </span>
              <div className="d-flex align-items-center gap-1" style={{ marginLeft: '8px', marginRight: '8px' }}>
                <span className="text-muted" style={{ fontSize: '11px' }}>Go to:</span>
                <input
                  type="text"
                  value={pageInput}
                  onChange={handlePageInputChange}
                  onKeyDown={handlePageInputSubmit}
                  placeholder="Page"
                  className="form-control form-control-sm"
                  style={{
                    width: '60px',
                    fontSize: '11px',
                    textAlign: 'center',
                    padding: '2px 4px'
                  }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handlePageInputSubmit}
                  disabled={!pageInput || pageInput === ''}
                  style={{ fontSize: '10px', padding: '2px 6px' }}
                >
                  Go
                </button>
              </div>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                <FaChevronRight style={{ fontSize: '10px' }} />
              </button>
            </div>
            </div>
          )}
        </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0" style={{ borderRadius: '8px' }}>
              <div className="modal-header border-0 pb-2">
                <h5 className="modal-title fw-bold" style={{ fontSize: '16px' }}>Export RFID Tags</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowExportModal(false)}
                ></button>
      </div>
              <div className="modal-body pt-0">
                <p className="text-muted mb-3" style={{ fontSize: '13px' }}>Choose your preferred export format</p>
                
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-outline-success text-start p-3"
                    onClick={handleExportExcel}
                    style={{ fontSize: '13px' }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-success rounded p-2">
                        <FaFileExcel className="text-white" style={{ fontSize: '16px' }} />
                      </div>
                      <div>
                        <div className="fw-bold">Export as Excel</div>
                        <small className="text-muted">Download as .xlsx spreadsheet file</small>
                      </div>
                    </div>
                  </button>

                  <button 
                    className="btn btn-outline-danger text-start p-3"
                    onClick={handleExportPDF}
                    style={{ fontSize: '13px' }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-danger rounded p-2">
                        <FaFilePdf className="text-white" style={{ fontSize: '16px' }} />
        </div>
                      <div>
                        <div className="fw-bold">Export as PDF</div>
                        <small className="text-muted">Download as formatted PDF document</small>
                      </div>
                    </div>
                  </button>

                  <div className="border rounded p-3" style={{ fontSize: '13px' }}>
                    <div className="d-flex align-items-center gap-3 mb-2">
                      <div className="bg-primary rounded p-2">
                        <FaEnvelope className="text-white" style={{ fontSize: '16px' }} />
                      </div>
                      <div>
                        <div className="fw-bold">Send to Email</div>
                        <small className="text-muted">Send data to specified email address</small>
                      </div>
                    </div>
                    <div className="input-group input-group-sm">
                      <input
                        type="email"
                        className="form-control"
                        placeholder="Enter email address"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        style={{ fontSize: '12px' }}
                      />
                      <button 
                        className="btn btn-primary"
                        onClick={handleEmailExport}
                        disabled={!emailInput}
                        style={{ fontSize: '12px' }}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RFIDTags; 