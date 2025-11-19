import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { useLoading } from '../../App';

const ITEMS_PER_PAGE = 25;

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
  const { setLoading } = useLoading();
  const [usedTags, setUsedTags] = useState([]);
  const [unusedTags, setUnusedTags] = useState([]);
  const [usedCount, setUsedCount] = useState(0);
  const [unusedCount, setUnusedCount] = useState(0);
  const [usedSearch, setUsedSearch] = useState('');
  const [unusedSearch, setUnusedSearch] = useState('');
  const [usedCurrentPage, setUsedCurrentPage] = useState(1);
  const [unusedCurrentPage, setUnusedCurrentPage] = useState(1);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [usedItemsPerPage, setUsedItemsPerPage] = useState(25);
  const [unusedItemsPerPage, setUnusedItemsPerPage] = useState(25);
  const [usedPageInput, setUsedPageInput] = useState('');
  const [unusedPageInput, setUnusedPageInput] = useState('');
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
    
    // Handle window resize for responsive design
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter tags based on search
  const filteredUsedTags = useMemo(() => {
    if (!usedSearch.trim()) {
      return usedTags;
    }
    const searchLower = usedSearch.toLowerCase();
    return usedTags.filter(tag => {
      return (
        (tag.BarcodeNumber || '').toLowerCase().includes(searchLower) ||
        (tag.TIDValue || '').toLowerCase().includes(searchLower)
      );
    });
  }, [usedTags, usedSearch]);

  const filteredUnusedTags = useMemo(() => {
    if (!unusedSearch.trim()) {
      return unusedTags;
    }
    const searchLower = unusedSearch.toLowerCase();
    return unusedTags.filter(tag => {
      return (
        (tag.BarcodeNumber || '').toLowerCase().includes(searchLower) ||
        (tag.TIDValue || '').toLowerCase().includes(searchLower)
      );
    });
  }, [unusedTags, unusedSearch]);

  // Pagination
  const usedTotalPages = Math.ceil(filteredUsedTags.length / usedItemsPerPage);
  const unusedTotalPages = Math.ceil(filteredUnusedTags.length / unusedItemsPerPage);
  const usedTotalRecords = filteredUsedTags.length;
  const unusedTotalRecords = filteredUnusedTags.length;

  const paginatedUsedTags = useMemo(() => {
    const startIndex = (usedCurrentPage - 1) * usedItemsPerPage;
    return filteredUsedTags.slice(startIndex, startIndex + usedItemsPerPage);
  }, [filteredUsedTags, usedCurrentPage, usedItemsPerPage]);

  const paginatedUnusedTags = useMemo(() => {
    const startIndex = (unusedCurrentPage - 1) * unusedItemsPerPage;
    return filteredUnusedTags.slice(startIndex, startIndex + unusedItemsPerPage);
  }, [filteredUnusedTags, unusedCurrentPage, unusedItemsPerPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setUsedCurrentPage(1);
  }, [usedSearch]);

  useEffect(() => {
    setUnusedCurrentPage(1);
  }, [unusedSearch]);

  // Handle page input for used tags
  const handleUsedPageInputChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setUsedPageInput(value);
    }
  };

  const handleUsedPageInputSubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      const pageNum = parseInt(usedPageInput);
      if (pageNum >= 1 && pageNum <= usedTotalPages) {
        setUsedCurrentPage(pageNum);
        setUsedPageInput('');
      } else {
        toast.error(`Please enter a page number between 1 and ${usedTotalPages}`);
        setUsedPageInput('');
      }
    }
  };

  // Handle page input for unused tags
  const handleUnusedPageInputChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setUnusedPageInput(value);
    }
  };

  const handleUnusedPageInputSubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      const pageNum = parseInt(unusedPageInput);
      if (pageNum >= 1 && pageNum <= unusedTotalPages) {
        setUnusedCurrentPage(pageNum);
        setUnusedPageInput('');
      } else {
        toast.error(`Please enter a page number between 1 and ${unusedTotalPages}`);
        setUnusedPageInput('');
      }
    }
  };

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
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '16px' }}>
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
            }}>Report of Used and Unused Tags</h2>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #dbeafe'
            }}>
              <FaTag style={{ color: '#3b82f6', fontSize: '14px' }} />
              <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>Used: {usedCount}</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #dcfce7'
            }}>
              <FaTags style={{ color: '#10b981', fontSize: '14px' }} />
              <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>Unused: {unusedCount}</span>
            </div>
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              fontWeight: 600
            }}>
              Total: {usedCount + unusedCount} records
            </div>
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
          {/* Search Inputs */}
          <div style={{
            position: 'relative',
            flex: '1',
            minWidth: windowWidth <= 768 ? '100%' : '200px',
            maxWidth: windowWidth <= 768 ? '100%' : '300px'
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
              placeholder="Search Used Tags..."
              value={usedSearch}
              onChange={(e) => {
                setUsedSearch(e.target.value);
                setUsedCurrentPage(1);
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
          <div style={{
            position: 'relative',
            flex: '1',
            minWidth: windowWidth <= 768 ? '100%' : '200px',
            maxWidth: windowWidth <= 768 ? '100%' : '300px'
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
              placeholder="Search Unused Tags..."
              value={unusedSearch}
              onChange={(e) => {
                setUnusedSearch(e.target.value);
                setUnusedCurrentPage(1);
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
              onFocus={(e) => e.target.style.borderColor = '#10b981'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          {/* Action Buttons */}
          <button
            onClick={fetchTags}
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
            <IoRefreshOutline /> Refresh
          </button>
          <button
            onClick={() => setExportModalOpen(true)}
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
            <FaFileExcel /> Export
          </button>
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: windowWidth <= 768 ? '1fr' : '1fr 1fr',
        gap: '16px'
      }}>
        {/* Used Tags Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FaTag style={{ color: '#3b82f6', fontSize: '14px' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Used Tags</span>
            <span style={{
              fontSize: '10px',
              color: '#64748b',
              background: '#e0e7ff',
              padding: '2px 8px',
              borderRadius: '12px',
              marginLeft: 'auto'
            }}>{usedTotalRecords} items</span>
          </div>
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
                  }}>RFID Code</th>
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
                    textAlign: 'center',
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
                {paginatedUsedTags.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                      No used tags found
                    </td>
                  </tr>
                ) : (
                  paginatedUsedTags.map((tag, index) => {
                    const globalIndex = (usedCurrentPage - 1) * usedItemsPerPage + index;
                    return (
                      <tr
                        key={tag.BarcodeNumber + tag.TIDValue}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          background: globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
                        }}
                      >
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
                          whiteSpace: 'nowrap',
                          fontWeight: 600
                        }}>{tag.BarcodeNumber || '-'}</td>
                        <td style={{
                          padding: '12px',
                          fontSize: '12px',
                          color: '#1e293b',
                          whiteSpace: 'nowrap',
                          fontFamily: 'monospace'
                        }}>{tag.TIDValue || '-'}</td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'center',
                          fontSize: '12px',
                          position: 'sticky',
                          right: 0,
                          background: globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                          zIndex: 5,
                          borderLeft: '2px solid #e5e7eb'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
                        }}
                        >
                          <span style={{
                            padding: '4px 10px',
                            fontSize: '10px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #3b82f6',
                            background: '#eff6ff',
                            color: '#3b82f6'
                          }}>{tag.Status || 'Used'}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {usedTotalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              background: '#ffffff',
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
                  Showing {((usedCurrentPage - 1) * usedItemsPerPage) + 1} to {Math.min(usedCurrentPage * usedItemsPerPage, usedTotalRecords)} of {usedTotalRecords} entries
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Show:</span>
                  <select
                    value={usedItemsPerPage}
                    onChange={(e) => {
                      setUsedItemsPerPage(Number(e.target.value));
                      setUsedCurrentPage(1);
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
                  onClick={() => setUsedCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={usedCurrentPage === 1}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: usedCurrentPage === 1 ? '#f1f5f9' : '#ffffff',
                    color: usedCurrentPage === 1 ? '#94a3b8' : '#475569',
                    cursor: usedCurrentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (usedCurrentPage !== 1) {
                      e.target.style.background = '#f8fafc';
                      e.target.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (usedCurrentPage !== 1) {
                      e.target.style.background = '#ffffff';
                      e.target.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, usedTotalPages) }, (_, i) => {
                  let page;
                  if (usedTotalPages <= 5) {
                    page = i + 1;
                  } else if (usedCurrentPage <= 3) {
                    page = i + 1;
                  } else if (usedCurrentPage >= usedTotalPages - 2) {
                    page = usedTotalPages - 4 + i;
                  } else {
                    page = usedCurrentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setUsedCurrentPage(page)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        background: usedCurrentPage === page ? '#3b82f6' : '#ffffff',
                        color: usedCurrentPage === page ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (usedCurrentPage !== page) {
                          e.target.style.background = '#f8fafc';
                          e.target.style.borderColor = '#cbd5e1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (usedCurrentPage !== page) {
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
                  onClick={() => setUsedCurrentPage(prev => Math.min(usedTotalPages, prev + 1))}
                  disabled={usedCurrentPage === usedTotalPages}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: usedCurrentPage === usedTotalPages ? '#f1f5f9' : '#ffffff',
                    color: usedCurrentPage === usedTotalPages ? '#94a3b8' : '#475569',
                    cursor: usedCurrentPage === usedTotalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (usedCurrentPage !== usedTotalPages) {
                      e.target.style.background = '#f8fafc';
                      e.target.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (usedCurrentPage !== usedTotalPages) {
                      e.target.style.background = '#ffffff';
                      e.target.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  Next
                </button>
                {/* Go to Page */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginLeft: '8px',
                  paddingLeft: '8px',
                  borderLeft: '1px solid #e2e8f0'
                }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Go to:</span>
                  <input
                    type="text"
                    value={usedPageInput}
                    onChange={handleUsedPageInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUsedPageInputSubmit(e);
                      }
                    }}
                    placeholder="Page"
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                      textAlign: 'center',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <button
                    onClick={handleUsedPageInputSubmit}
                    disabled={!usedPageInput || usedPageInput === ''}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #3b82f6',
                      background: (!usedPageInput || usedPageInput === '') ? '#f1f5f9' : '#ffffff',
                      color: (!usedPageInput || usedPageInput === '') ? '#94a3b8' : '#3b82f6',
                      cursor: (!usedPageInput || usedPageInput === '') ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (usedPageInput && usedPageInput !== '') {
                        e.target.style.background = '#3b82f6';
                        e.target.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (usedPageInput && usedPageInput !== '') {
                        e.target.style.background = '#ffffff';
                        e.target.style.color = '#3b82f6';
                      }
                    }}
                  >
                    Go
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Unused Tags Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FaTags style={{ color: '#10b981', fontSize: '14px' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Unused Tags</span>
            <span style={{
              fontSize: '10px',
              color: '#64748b',
              background: '#d1fae5',
              padding: '2px 8px',
              borderRadius: '12px',
              marginLeft: 'auto'
            }}>{unusedTotalRecords} items</span>
          </div>
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
                  }}>RFID Code</th>
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
                    textAlign: 'center',
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
                {paginatedUnusedTags.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                      No unused tags found
                    </td>
                  </tr>
                ) : (
                  paginatedUnusedTags.map((tag, index) => {
                    const globalIndex = (unusedCurrentPage - 1) * unusedItemsPerPage + index;
                    return (
                      <tr
                        key={tag.BarcodeNumber + tag.TIDValue}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          background: globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
                        }}
                      >
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
                          whiteSpace: 'nowrap',
                          fontWeight: 600
                        }}>{tag.BarcodeNumber || '-'}</td>
                        <td style={{
                          padding: '12px',
                          fontSize: '12px',
                          color: '#1e293b',
                          whiteSpace: 'nowrap',
                          fontFamily: 'monospace'
                        }}>{tag.TIDValue || '-'}</td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'center',
                          fontSize: '12px',
                          position: 'sticky',
                          right: 0,
                          background: globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                          zIndex: 5,
                          borderLeft: '2px solid #e5e7eb'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
                        }}
                        >
                          <span style={{
                            padding: '4px 10px',
                            fontSize: '10px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #10b981',
                            background: '#f0fdf4',
                            color: '#10b981'
                          }}>{tag.Status || 'Unused'}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {unusedTotalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              background: '#ffffff',
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
                  Showing {((unusedCurrentPage - 1) * unusedItemsPerPage) + 1} to {Math.min(unusedCurrentPage * unusedItemsPerPage, unusedTotalRecords)} of {unusedTotalRecords} entries
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Show:</span>
                  <select
                    value={unusedItemsPerPage}
                    onChange={(e) => {
                      setUnusedItemsPerPage(Number(e.target.value));
                      setUnusedCurrentPage(1);
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
                  onClick={() => setUnusedCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={unusedCurrentPage === 1}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: unusedCurrentPage === 1 ? '#f1f5f9' : '#ffffff',
                    color: unusedCurrentPage === 1 ? '#94a3b8' : '#475569',
                    cursor: unusedCurrentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (unusedCurrentPage !== 1) {
                      e.target.style.background = '#f8fafc';
                      e.target.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (unusedCurrentPage !== 1) {
                      e.target.style.background = '#ffffff';
                      e.target.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, unusedTotalPages) }, (_, i) => {
                  let page;
                  if (unusedTotalPages <= 5) {
                    page = i + 1;
                  } else if (unusedCurrentPage <= 3) {
                    page = i + 1;
                  } else if (unusedCurrentPage >= unusedTotalPages - 2) {
                    page = unusedTotalPages - 4 + i;
                  } else {
                    page = unusedCurrentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setUnusedCurrentPage(page)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        background: unusedCurrentPage === page ? '#10b981' : '#ffffff',
                        color: unusedCurrentPage === page ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (unusedCurrentPage !== page) {
                          e.target.style.background = '#f8fafc';
                          e.target.style.borderColor = '#cbd5e1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (unusedCurrentPage !== page) {
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
                  onClick={() => setUnusedCurrentPage(prev => Math.min(unusedTotalPages, prev + 1))}
                  disabled={unusedCurrentPage === unusedTotalPages}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: unusedCurrentPage === unusedTotalPages ? '#f1f5f9' : '#ffffff',
                    color: unusedCurrentPage === unusedTotalPages ? '#94a3b8' : '#475569',
                    cursor: unusedCurrentPage === unusedTotalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (unusedCurrentPage !== unusedTotalPages) {
                      e.target.style.background = '#f8fafc';
                      e.target.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (unusedCurrentPage !== unusedTotalPages) {
                      e.target.style.background = '#ffffff';
                      e.target.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  Next
                </button>
                {/* Go to Page */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginLeft: '8px',
                  paddingLeft: '8px',
                  borderLeft: '1px solid #e2e8f0'
                }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Go to:</span>
                  <input
                    type="text"
                    value={unusedPageInput}
                    onChange={handleUnusedPageInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUnusedPageInputSubmit(e);
                      }
                    }}
                    placeholder="Page"
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                      textAlign: 'center',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <button
                    onClick={handleUnusedPageInputSubmit}
                    disabled={!unusedPageInput || unusedPageInput === ''}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #10b981',
                      background: (!unusedPageInput || unusedPageInput === '') ? '#f1f5f9' : '#ffffff',
                      color: (!unusedPageInput || unusedPageInput === '') ? '#94a3b8' : '#10b981',
                      cursor: (!unusedPageInput || unusedPageInput === '') ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (unusedPageInput && unusedPageInput !== '') {
                        e.target.style.background = '#10b981';
                        e.target.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (unusedPageInput && unusedPageInput !== '') {
                        e.target.style.background = '#ffffff';
                        e.target.style.color = '#10b981';
                      }
                    }}
                  >
                    Go
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
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
      `}</style>
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