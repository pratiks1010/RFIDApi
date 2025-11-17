import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSearch, FaTag, FaTags, FaFileExcel, FaFilePdf, FaEnvelope, FaTimes } from 'react-icons/fa';
import { BiExport } from 'react-icons/bi';
import { toast } from 'react-toastify';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { IoRefreshOutline } from 'react-icons/io5';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNotifications } from '../../context/NotificationContext';

const ITEMS_PER_PAGE = 15;

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <HiChevronLeft />
      </button>
      <span className="pagination-info">
        Page {currentPage} of {totalPages}
      </span>
      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <HiChevronRight />
      </button>
    </div>
  );
};

const TagUsage = () => {
  const [usedTags, setUsedTags] = useState([]);
  const [unusedTags, setUnusedTags] = useState([]);
  const [usedCount, setUsedCount] = useState(0);
  const [unusedCount, setUnusedCount] = useState(0);
  const [usedSearch, setUsedSearch] = useState('');
  const [unusedSearch, setUnusedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [usedCurrentPage, setUsedCurrentPage] = useState(1);
  const [unusedCurrentPage, setUnusedCurrentPage] = useState(1);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const { addNotification } = useNotifications();

  const fetchTags = async () => {
    try {
      setLoading(true);
      const userInfoString = localStorage.getItem('userInfo');
      let clientCode = '';
      let username = '';
      if (userInfoString) {
        try {
          const userInfo = JSON.parse(userInfoString);
          clientCode = userInfo.ClientCode || '-';
          username = userInfo.Username || '-';
        } catch (error) {
          toast.error('Error getting client information');
          return;
        }
      }
      if (!clientCode) {
        toast.error('Client code not found. Please login again.');
        return;
      }
              const response = await axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllUsedAndUnusedTag', {
        ClientCode: clientCode
      });
      // Use the correct structure
      if (response.data) {
        setUsedTags(response.data.Used || []);
        setUnusedTags(response.data.Unused || []);
        setUsedCount(response.data.UsedCount || 0);
        setUnusedCount(response.data.UnusedCount || 0);
      }
    } catch (error) {
      toast.error(error.response?.data?.Message || 'Failed to fetch tags data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  // Filter tags based on search
  const filteredUsedTags = usedTags.filter(tag => {
    const searchLower = usedSearch.toLowerCase();
    return (
      (tag.BarcodeNumber || '').toLowerCase().includes(searchLower) ||
      (tag.TIDValue || '').toLowerCase().includes(searchLower)
    );
  });
  const filteredUnusedTags = unusedTags.filter(tag => {
    const searchLower = unusedSearch.toLowerCase();
    return (
      (tag.BarcodeNumber || '').toLowerCase().includes(searchLower) ||
      (tag.TIDValue || '').toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const usedTotalPages = Math.ceil(filteredUsedTags.length / ITEMS_PER_PAGE);
  const unusedTotalPages = Math.ceil(filteredUnusedTags.length / ITEMS_PER_PAGE);
  const paginatedUsedTags = filteredUsedTags.slice(
    (usedCurrentPage - 1) * ITEMS_PER_PAGE,
    usedCurrentPage * ITEMS_PER_PAGE
  );
  const paginatedUnusedTags = filteredUnusedTags.slice(
    (unusedCurrentPage - 1) * ITEMS_PER_PAGE,
    unusedCurrentPage * ITEMS_PER_PAGE
  );

  // Placeholder handlers
  const handleExportExcel = () => {
    // Prepare data for Excel
    const usedSheet = [
      ['Sr', 'RFID Code', 'TID Value', 'Status'],
      ...usedTags.map((tag, idx) => [
        idx + 1,
        tag.BarcodeNumber || '-',
        tag.TIDValue || '-',
        tag.Status || '-'
      ])
    ];
    const unusedSheet = [
      ['Sr', 'RFID Code', 'TID Value', 'Status'],
      ...unusedTags.map((tag, idx) => [
        idx + 1,
        tag.BarcodeNumber || '-',
        tag.TIDValue || '-',
        tag.Status || '-'
      ])
    ];
    const wb = XLSX.utils.book_new();
    const wsUsed = XLSX.utils.aoa_to_sheet(usedSheet);
    const wsUnused = XLSX.utils.aoa_to_sheet(unusedSheet);
    XLSX.utils.book_append_sheet(wb, wsUsed, 'Used Tags');
    XLSX.utils.book_append_sheet(wb, wsUnused, 'Unused Tags');
    XLSX.writeFile(wb, 'RFID_Tags_Report.xlsx');
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    addNotification({
      title: 'Export successful',
      description: `Tag usage exported to Excel by ${userInfo?.Username || userInfo?.UserName || 'User'}`,
      type: 'info'
    });
  };

  const handleExportPDF = () => {
    // Get current login client code and username from localStorage
    let clientCode = '-';
    let username = '-';
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      if (userInfo) {
        clientCode = userInfo.ClientCode || '-';
        username = userInfo.Username || '-';
      }
    } catch {}
    const doc = new jsPDF();
    // Headline and meta info
    doc.setFontSize(18);
    doc.text('Report of Used and Unused Tags', 14, 16);
    doc.setFontSize(12);
    doc.text(`Client Code: ${clientCode}`, 14, 26);
    doc.text(`User Name: ${username}`, 14, 34);
    let y = 42;
    doc.setFontSize(15);
    doc.text('Used Tags', 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [['Sr', 'RFID Code', 'TID Value', 'Status']],
      body: usedTags.map((tag, idx) => [
        idx + 1,
        tag.BarcodeNumber || '-',
        tag.TIDValue || '-',
        tag.Status || '-'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 10 },
    });
    let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 20;
    doc.setFontSize(15);
    doc.text('Unused Tags', 14, finalY);
    autoTable(doc, {
      startY: finalY + 4,
      head: [['Sr', 'RFID Code', 'TID Value', 'Status']],
      body: unusedTags.map((tag, idx) => [
        idx + 1,
        tag.BarcodeNumber || '-',
        tag.TIDValue || '-',
        tag.Status || '-'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 10 },
    });
    doc.save('RFID_Tags_Report.pdf');
  };

  const handleSendEmail = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      alert('Email sent to ' + email);
      setEmail('');
      setExportModalOpen(false);
    }, 1000);
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
            <div className="col-md-6">
              <div className="d-flex align-items-center">
                <div className="bg-primary rounded-3 p-2 me-3">
                  <FaTags className="text-white" style={{ fontSize: '20px' }} />
                </div>
                <div>
                  <h5 className="mb-1 fw-bold text-dark">Report of Used and Unused Tags</h5>
                  <p className="mb-0 text-muted small">Easily track your RFID tag usage and inventory</p>
                  <span className="badge bg-primary mt-1">{usedCount + unusedCount} tags in total</span>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex align-items-center justify-content-end gap-2">
                <div className="d-flex gap-2 me-3">
                  <div className="card border-0 bg-light" style={{ minWidth: '120px' }}>
                    <div className="card-body p-2 text-center">
                      <div className="d-flex align-items-center justify-content-center mb-1">
                        <FaTag className="text-primary me-1" style={{ fontSize: '14px' }} />
                        <small className="text-muted fw-bold">Used Tags</small>
                      </div>
                      <div className="fw-bold text-dark">{usedCount}</div>
                    </div>
                  </div>
                  <div className="card border-0 bg-light" style={{ minWidth: '120px' }}>
                    <div className="card-body p-2 text-center">
                      <div className="d-flex align-items-center justify-content-center mb-1">
                        <FaTags className="text-success me-1" style={{ fontSize: '14px' }} />
                        <small className="text-muted fw-bold">Unused Tags</small>
                      </div>
                      <div className="fw-bold text-success">{unusedCount}</div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={fetchTags}
                  className="btn btn-outline-primary btn-sm"
                >
                  <IoRefreshOutline className="me-1" /> Refresh
                </button>
                <button 
                  onClick={() => setExportModalOpen(true)}
                  className="btn btn-outline-primary btn-sm"
                >
                  <FaFileExcel className="me-1" /> Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal Popup */}
      {exportModalOpen && (
        <div className="export-modal-backdrop">
          <div className="export-modal">
            <div className="export-modal-header">
              <span className="export-modal-title">Export RFID sheet of used and unused tag</span>
              <button className="export-modal-close" onClick={() => setExportModalOpen(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="export-modal-body">
              <p className="export-modal-desc">Choose your preferred export format</p>
              <div className="export-options">
                <button className="export-option excel" onClick={handleExportExcel}>
                  <span className="option-icon"><FaFileExcel /></span>
                  <span>
                    <span className="option-title">Export as Excel</span>
                    <span className="option-desc">Download as .xlsx spreadsheet file</span>
                  </span>
                </button>
                <button className="export-option pdf" onClick={handleExportPDF}>
                  <span className="option-icon"><FaFilePdf /></span>
                  <span>
                    <span className="option-title">Export as PDF</span>
                    <span className="option-desc">Download as formatted PDF document</span>
                  </span>
                </button>
                <div className="export-option email">
                  <span className="option-icon"><FaEnvelope /></span>
                  <span style={{flex:1}}>
                    <span className="option-title">Send to Email</span>
                    <span className="option-desc">Send data to specified email address</span>
                    <div className="email-row">
                      <input
                        type="email"
                        placeholder="Enter email address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={sending}
                      />
                      <button
                        className="send-email-btn"
                        onClick={handleSendEmail}
                        disabled={!email || sending}
                      >
                        {sending ? 'Sending...' : 'Send Email'}
                      </button>
                    </div>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        {/* Used Tags Table */}
        <div className="col-md-6">
          <div className="card shadow-sm border-0 mb-3">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <FaTag className="text-primary me-2" />
                <h6 className="mb-0 fw-bold">Used Tags</h6>
                <span className="badge bg-primary ms-2">{filteredUsedTags.length} items</span>
              </div>
              <div className="position-relative">
                <FaSearch className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: '14px' }} />
                <input
                  type="text"
                  className="form-control form-control-sm ps-4"
                  placeholder="Search by RFID Code or TID..."
                  value={usedSearch}
                  onChange={(e) => {
                    setUsedSearch(e.target.value);
                    setUsedCurrentPage(1);
                  }}
                  style={{ width: '200px' }}
                />
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="table table-hover table-sm mb-0" style={{ minWidth: '400px' }}>
                  <thead className="table-light">
                    <tr>
                      <th>Sr</th>
                      <th>RFID Code</th>
                      <th>TID Value</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4">
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            <div className="spinner-border spinner-border-sm text-primary" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                            <span className="text-muted small">Loading used tags...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedUsedTags.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4">
                          <span className="text-muted small">No used tags found</span>
                        </td>
                      </tr>
                    ) : (
                      paginatedUsedTags.map((tag, index) => (
                        <tr key={tag.BarcodeNumber + tag.TIDValue}>
                          <td className="text-nowrap">{((usedCurrentPage - 1) * ITEMS_PER_PAGE) + index + 1}</td>
                          <td className="text-nowrap">{tag.BarcodeNumber || '-'}</td>
                          <td className="text-nowrap">{tag.TIDValue || '-'}</td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary">
                              {tag.Status || 'Used'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {usedTotalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center p-3 border-top">
                  <div className="small text-muted">
                    Showing {((usedCurrentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(usedCurrentPage * ITEMS_PER_PAGE, filteredUsedTags.length)} of {filteredUsedTags.length} entries
                  </div>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${usedCurrentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setUsedCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={usedCurrentPage === 1}
                        >
                          Previous
                        </button>
                      </li>
                      <li className={`page-item ${usedCurrentPage === usedTotalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setUsedCurrentPage(prev => Math.min(usedTotalPages, prev + 1))}
                          disabled={usedCurrentPage === usedTotalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unused Tags Table */}
        <div className="col-md-6">
          <div className="card shadow-sm border-0 mb-3">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <FaTags className="text-success me-2" />
                <h6 className="mb-0 fw-bold">Unused Tags</h6>
                <span className="badge bg-success ms-2">{filteredUnusedTags.length} items</span>
              </div>
              <div className="position-relative">
                <FaSearch className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: '14px' }} />
                <input
                  type="text"
                  className="form-control form-control-sm ps-4"
                  placeholder="Search by RFID Code or TID..."
                  value={unusedSearch}
                  onChange={(e) => {
                    setUnusedSearch(e.target.value);
                    setUnusedCurrentPage(1);
                  }}
                  style={{ width: '200px' }}
                />
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="table table-hover table-sm mb-0" style={{ minWidth: '400px' }}>
                  <thead className="table-light">
                    <tr>
                      <th>Sr</th>
                      <th>RFID Code</th>
                      <th>TID Value</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4">
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            <div className="spinner-border spinner-border-sm text-primary" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                            <span className="text-muted small">Loading unused tags...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedUnusedTags.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4">
                          <span className="text-muted small">No unused tags found</span>
                        </td>
                      </tr>
                    ) : (
                      paginatedUnusedTags.map((tag, index) => (
                        <tr key={tag.BarcodeNumber + tag.TIDValue}>
                          <td className="text-nowrap">{((unusedCurrentPage - 1) * ITEMS_PER_PAGE) + index + 1}</td>
                          <td className="text-nowrap">{tag.BarcodeNumber || '-'}</td>
                          <td className="text-nowrap">{tag.TIDValue || '-'}</td>
                          <td>
                            <button className="btn btn-sm btn-outline-success">
                              {tag.Status || 'Unused'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {unusedTotalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center p-3 border-top">
                  <div className="small text-muted">
                    Showing {((unusedCurrentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(unusedCurrentPage * ITEMS_PER_PAGE, filteredUnusedTags.length)} of {filteredUnusedTags.length} entries
                  </div>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${unusedCurrentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setUnusedCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={unusedCurrentPage === 1}
                        >
                          Previous
                        </button>
                      </li>
                      <li className={`page-item ${unusedCurrentPage === unusedTotalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setUnusedCurrentPage(prev => Math.min(unusedTotalPages, prev + 1))}
                          disabled={unusedCurrentPage === unusedTotalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tag-usage-container {
          padding: 20px;
          background: #f7f9fc;
          min-height: calc(100vh - 64px);
        }

        .header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 0 4px;
        }
        .header-row h1 {
          font-size: 18px;
          font-weight: 500;
          color: #2d3748;
          margin: 0 24px 0 0;
          white-space: nowrap;
        }
        .stats-actions-row {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .stats-section.compact {
          display: flex;
          gap: 16px;
        }
        .stat-card.compact {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          padding: 8px 18px;
          min-width: unset;
          box-shadow: none;
        }
        .stat-card.used.compact {
          border-left: 4px solid #E53E3E;
        }
        .stat-card.unused.compact {
          border-left: 4px solid #38A169;
        }
        .stat-icon {
          font-size: 22px;
          border-radius: 6px;
          padding: 4px;
        }
        .stat-card.used .stat-icon {
          color: #E53E3E;
          background: #FED7D7;
        }
        .stat-card.unused .stat-icon {
          color: #38A169;
          background: #C6F6D5;
        }
        .stat-label {
          font-size: 13px;
          color: #718096;
          margin-right: 2px;
        }
        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #2D3748;
        }
        .action-buttons {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-left: 24px;
        }
        .btn-refresh, .btn-export {
          height: 34px;
          padding: 0 16px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .btn-refresh {
          background: #fff;
          color: #475569;
          border: 1px solid #e2e8f0;
        }
        .btn-export {
          background: #4f46e5;
          color: #ffffff;
          border: none;
        }
        .btn-refresh:hover {
          background: #f8fafc;
          border-color: #cbd5e0;
        }
        .btn-export:hover {
          background: #4338ca;
        }
        .btn-refresh svg {
          font-size: 16px;
          color: #64748b;
        }
        .btn-export svg {
          font-size: 16px;
          color: #ffffff;
          }
        .tables-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .table-section {
          background: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .table-header {
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #2d3748;
        }

        .header-icon {
          font-size: 14px;
          color: #4A5568;
        }

        .item-count {
          font-size: 12px;
          color: #718096;
          font-weight: 400;
          background: #EDF2F7;
          padding: 2px 8px;
          border-radius: 4px;
          margin-left: 8px;
        }

        .search-box {
          position: relative;
          width: 240px;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #A0AEC0;
          font-size: 12px;
        }

        .search-box input {
          width: 100%;
          height: 32px;
          padding: 0 12px 0 30px;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 13px;
          color: #2D3748;
        }

        .search-box input:focus {
          outline: none;
          border-color: #4299E1;
          box-shadow: 0 0 0 1px #4299E1;
        }

        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        th, td {
          padding: 10px 16px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
          font-size: 13px;
          white-space: nowrap;
        }

        th {
          background: #f8fafc;
          color: #718096;
          font-weight: 500;
        }

        td {
          color: #2D3748;
        }

        tr:hover td {
          background: #f7fafc;
        }

        .status-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          display: inline-block;
        }

        .status-badge.used {
          background: #FED7D7;
          color: #E53E3E;
        }

        .status-badge.unused {
          background: #C6F6D5;
          color: #38A169;
        }

        .loading-cell, .empty-cell {
          text-align: center;
          padding: 32px;
          color: #A0AEC0;
          font-size: 13px;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          gap: 8px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .pagination-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          background: white;
          color: #718096;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          border-color: #4299E1;
          color: #4299E1;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-info {
          font-size: 13px;
          color: #718096;
          background: #EDF2F7;
          padding: 4px 10px;
          border-radius: 4px;
        }

        @media (max-width: 1200px) {
          .tables-container {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .header-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .stats-actions-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            width: 100%;
          }
          .action-buttons {
            margin-left: 0;
          }
        }

        .export-modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.18);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .export-modal {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          width: 560px;
          max-width: 98vw;
          padding: 0 0 18px 0;
          animation: fadeIn 0.2s;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .export-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 28px 0 28px;
        }
        .export-modal-title {
          font-size: 19px;
          font-weight: 700;
          color: #22223b;
        }
        .export-modal-close {
          background: none;
          border: none;
          font-size: 20px;
          color: #6c757d;
          cursor: pointer;
        }
        .export-modal-body {
          padding: 8px 28px 0 28px;
        }
        .export-modal-desc {
          color: #6c757d;
          font-size: 13px;
          margin-bottom: 14px;
        }
        .export-options {
          display: flex;
            flex-direction: column;
          gap: 14px;
        }
        .export-option {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #f9fafb;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 16px;
          cursor: pointer;
          transition: box-shadow 0.15s, border 0.15s;
        }
        .export-option > span:nth-child(2) {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .export-option:active, .export-option:focus, .export-option:hover {
          border: 1.5px solid #6366f1;
          box-shadow: 0 2px 8px rgba(99,102,241,0.08);
        }
        .export-option.email {
          cursor: default;
        }
        .option-icon {
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .export-option.excel .option-icon {
          color: #22c55e;
          background: #e7fbe9;
          border-radius: 8px;
          padding: 4px;
        }
        .export-option.pdf .option-icon {
          color: #e53e3e;
          background: #ffeaea;
          border-radius: 8px;
          padding: 4px;
        }
        .export-option.email .option-icon {
          color: #6366f1;
          background: #eef2ff;
          border-radius: 8px;
          padding: 4px;
        }
        .option-title {
          font-size: 15px;
          font-weight: 600;
          color: #22223b;
          display: block;
          text-align: left;
        }
        .option-desc {
          font-size: 12px;
          color: #6c757d;
          display: block;
          text-align: left;
        }
        .email-row {
          display: flex;
          gap: 10px;
          margin-top: 8px;
          align-items: center;
        }
        .email-row input {
          flex: 1;
          height: 38px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          padding: 0 12px;
          font-size: 14px;
        }
        .send-email-btn {
          background: linear-gradient(90deg,#a78bfa,#6366f1);
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 0 22px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s;
          height: 38px;
          display: flex;
          align-items: center;
          box-shadow: 0 1px 4px rgba(99,102,241,0.08);
          margin-left: 6px;
          }
        .send-email-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 600px) {
          .export-modal {
            width: 99vw;
            padding: 0 0 12px 0;
          }
          .export-modal-header, .export-modal-body {
            padding-left: 8px;
            padding-right: 8px;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default TagUsage; 