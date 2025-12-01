import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { 
  FaClipboardCheck, 
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaFileExcel,
  FaArrowLeft,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { useNotifications } from '../../context/NotificationContext';
import { useLoading } from '../../App';

const SessionDetails = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { setLoading: setGlobalLoading } = useLoading();
  const { addNotification } = useNotifications();
  
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matchedPage, setMatchedPage] = useState(1);
  const [unmatchedPage, setUnmatchedPage] = useState(1);
  const [tableItemsPerPage] = useState(10);
  const [userInfo, setUserInfo] = useState({});
  const [clientCode, setClientCode] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Get user info and client code
  useEffect(() => {
    try {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserInfo(parsed);
        setClientCode(parsed.ClientCode || parsed.clientCode || '');
      }
    } catch (err) {
      console.error('Error parsing userInfo:', err);
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch session details
  useEffect(() => {
    if (sessionId && clientCode) {
      fetchSessionDetails(sessionId);
    }
  }, [sessionId, clientCode]);

  const fetchSessionDetails = async (scanBatchId) => {
    try {
      setLoading(true);
      setGlobalLoading(true);
      setError(null);
      
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllStockVerificationBySession',
        {
          ClientCode: clientCode,
          ScanBatchId: scanBatchId
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Session Details Response:', response.data);
      setSessionDetails(response.data);
      
    } catch (err) {
      console.error('Error fetching session details:', err);
      setError(err.message || 'Failed to load session details');
      toast.error('Failed to load session details');
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  // Pagination helper functions
  const getPaginatedData = (data, page, itemsPerPage) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data, itemsPerPage) => {
    return Math.ceil(data.length / itemsPerPage);
  };

  // Export session details to Excel
  const exportSessionDetails = () => {
    if (!sessionDetails) {
      toast.error('No session data available for export');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Session Summary Sheet
      const summaryData = [
        ['Stock Verification Export'],
        ['Generated on:', new Date().toLocaleString('en-IN')],
        [''],
        ['Branch Information'],
        ['Branch Name:', sessionDetails.BranchName?.trim() || 'N/A'],
        [''],
        ['Summary Statistics'],
        ['Total Items:', sessionDetails.Totals?.TotalQty || 0],
        ['Matched Items:', sessionDetails.Totals?.TotalMatchQty || 0],
        ['Unmatched Items:', sessionDetails.Totals?.TotalUnmatchQty || 0],
        ['Total Gross Weight:', `${sessionDetails.Totals?.TotalGrossWeight || 0}g`],
        ['Total Net Weight:', `${sessionDetails.Totals?.TotalNetWeight || 0}g`],
        ['Match Weight:', `${sessionDetails.Totals?.TotalMatchGrossWeight || 0}g`],
        [''],
        ['Export Details'],
        ['Matched Items Count:', sessionDetails.MatchedList?.length || 0],
        ['Unmatched Items Count:', sessionDetails.UnmatchedList?.length || 0]
      ];

      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWS['!cols'] = [{ width: 25 }, { width: 30 }];
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Session Summary');

      // Matched Items Sheet
      if (sessionDetails.MatchedList && sessionDetails.MatchedList.length > 0) {
        const matchedHeaders = [
          'Item Code', 'Product Name', 'Branch Name', 'Category', 'Gross Weight (g)', 'Net Weight (g)', 'Pieces', 'Status'
        ];
        const matchedData = sessionDetails.MatchedList.map(item => [
          item.ItemCode || 'N/A',
          item.ProductName || 'N/A',
          item.BranchName?.trim() || sessionDetails.BranchName?.trim() || 'N/A',
          item.CategoryName || 'N/A',
          item.GrossWeight || 0,
          item.NetWeight || 0,
          item.Quantity || 0,
          'MATCHED'
        ]);
        const matchedWS = XLSX.utils.aoa_to_sheet([matchedHeaders, ...matchedData]);
        matchedWS['!cols'] = [
          { width: 15 }, { width: 25 }, { width: 18 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 10 }, { width: 12 }
        ];
        XLSX.utils.book_append_sheet(wb, matchedWS, 'Matched Items');
      }

      // Unmatched Items Sheet
      if (sessionDetails.UnmatchedList && sessionDetails.UnmatchedList.length > 0) {
        const unmatchedHeaders = [
          'Item Code', 'Product Name', 'Branch Name', 'Category', 'Gross Weight (g)', 'Net Weight (g)', 'Pieces', 'Status'
        ];
        const unmatchedData = sessionDetails.UnmatchedList.map(item => [
          item.ItemCode || 'N/A',
          item.ProductName || 'N/A',
          item.BranchName?.trim() || sessionDetails.BranchName?.trim() || 'N/A',
          item.CategoryName || 'N/A',
          item.GrossWeight || 0,
          item.NetWeight || 0,
          item.Quantity || 0,
          'UNMATCHED'
        ]);
        const unmatchedWS = XLSX.utils.aoa_to_sheet([unmatchedHeaders, ...unmatchedData]);
        unmatchedWS['!cols'] = [
          { width: 15 }, { width: 25 }, { width: 18 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 10 }, { width: 12 }
        ];
        XLSX.utils.book_append_sheet(wb, unmatchedWS, 'Unmatched Items');
      }

      const branchName = sessionDetails.BranchName?.trim() || 'Unknown';
      const filename = `Stock_Verification_${branchName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast.success(`Session details exported successfully as ${filename}`);
      addNotification({
        title: 'Export Successful',
        description: `Session details exported to ${filename}`,
        type: 'info'
      });
    } catch (error) {
      console.error('Error exporting session details:', error);
      toast.error('Failed to export session details. Please try again.');
      addNotification({
        title: 'Export Failed',
        description: 'Failed to export session details. Please try again.',
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '16px',
        background: '#ffffff'
      }}>
        <FaSpinner className="fa-spin" style={{ color: '#3b82f6', fontSize: '48px' }} />
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Loading session details...</p>
      </div>
    );
  }

  if (error || !sessionDetails) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '16px',
        background: '#ffffff',
        padding: '24px'
      }}>
        <FaExclamationTriangle style={{ color: '#f59e0b', fontSize: '48px' }} />
        <h5 style={{ fontSize: '16px', color: '#64748b', margin: 0 }}>No Data Available</h5>
        <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>Unable to load session details.</p>
        <button
          onClick={() => navigate('/stock-verification')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '8px',
            border: '1px solid #3b82f6',
            background: '#ffffff',
            color: '#3b82f6',
            cursor: 'pointer',
            marginTop: '16px'
          }}
        >
          <FaArrowLeft style={{ marginRight: '8px' }} /> Back to Stock Verification
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#ffffff',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        padding: '20px 24px',
        borderRadius: '12px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/stock-verification')}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#f8fafc';
              e.target.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#ffffff';
              e.target.style.borderColor = '#e5e7eb';
            }}
          >
            <FaArrowLeft style={{ color: '#475569', fontSize: '16px' }} />
          </button>
          <FaClipboardCheck style={{ color: '#3b82f6', fontSize: '20px' }} />
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 700,
            color: '#1e293b'
          }}>
            Stock Verification {sessionDetails.BranchName ? `- ${sessionDetails.BranchName.trim()}` : ''}
          </h2>
        </div>
        <button
          onClick={exportSessionDetails}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '8px',
            border: '1px solid #3b82f6',
            background: '#3b82f6',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: '0 1px 2px rgba(59, 130, 246, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#2563eb';
            e.target.style.borderColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#3b82f6';
            e.target.style.borderColor = '#3b82f6';
          }}
        >
          <FaFileExcel /> Export
        </button>
      </div>

      {/* Summary Statistics Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        marginBottom: '24px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 700,
            color: '#1e293b'
          }}>Summary Statistics</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ 
                  padding: '16px', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  color: '#475569', 
                  textAlign: 'left',
                  borderRight: '1px solid #e5e7eb'
                }}>Metric</th>
                <th style={{ 
                  padding: '16px', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  color: '#475569', 
                  textAlign: 'center',
                  borderRight: '1px solid #e5e7eb'
                }}>Total Items</th>
                <th style={{ 
                  padding: '16px', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  color: '#475569', 
                  textAlign: 'center',
                  borderRight: '1px solid #e5e7eb'
                }}>Matched</th>
                <th style={{ 
                  padding: '16px', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  color: '#475569', 
                  textAlign: 'center',
                  borderRight: '1px solid #e5e7eb'
                }}>Unmatched</th>
                <th style={{ 
                  padding: '16px', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  color: '#475569', 
                  textAlign: 'center',
                  borderRight: '1px solid #e5e7eb'
                }}>Total Gross Weight</th>
                <th style={{ 
                  padding: '16px', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  color: '#475569', 
                  textAlign: 'center',
                  borderRight: '1px solid #e5e7eb'
                }}>Total Net Weight</th>
                <th style={{ 
                  padding: '16px', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  color: '#475569', 
                  textAlign: 'center'
                }}>Match Weight</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ 
                  padding: '16px', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#1e293b',
                  background: '#ffffff',
                  borderRight: '1px solid #e5e7eb'
                }}>Quantity</td>
                <td style={{ 
                  padding: '16px', 
                  fontSize: '16px', 
                  fontWeight: 700,
                  color: '#3b82f6',
                  textAlign: 'center',
                  borderRight: '1px solid #e5e7eb'
                }}>{sessionDetails.Totals?.TotalQty || 0}</td>
                <td style={{ 
                  padding: '16px', 
                  fontSize: '16px', 
                  fontWeight: 700,
                  color: '#10b981',
                  textAlign: 'center',
                  borderRight: '1px solid #e5e7eb'
                }}>{sessionDetails.Totals?.TotalMatchQty || 0}</td>
                <td style={{ 
                  padding: '16px', 
                  fontSize: '16px', 
                  fontWeight: 700,
                  color: '#ef4444',
                  textAlign: 'center',
                  borderRight: '1px solid #e5e7eb'
                }}>{sessionDetails.Totals?.TotalUnmatchQty || 0}</td>
                <td style={{ 
                  padding: '16px', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#1e293b',
                  textAlign: 'center',
                  borderRight: '1px solid #e5e7eb'
                }}>{sessionDetails.Totals?.TotalGrossWeight || 0}g</td>
                <td style={{ 
                  padding: '16px', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#1e293b',
                  textAlign: 'center',
                  borderRight: '1px solid #e5e7eb'
                }}>{sessionDetails.Totals?.TotalNetWeight || 0}g</td>
                <td style={{ 
                  padding: '16px', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#1e293b',
                  textAlign: 'center'
                }}>{sessionDetails.Totals?.TotalMatchGrossWeight || 0}g</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tables Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: windowWidth <= 768 ? '1fr' : '1fr 1fr',
        gap: '24px'
      }}>
        {/* Matched Items Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            padding: '16px',
            background: '#f0fdf4',
            borderBottom: '2px solid #10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <FaCheckCircle style={{ color: '#10b981', fontSize: '18px' }} />
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#475569' }}>Matched Items</span>
            <span style={{
              fontSize: '12px',
              color: '#64748b',
              background: '#d1fae5',
              padding: '4px 12px',
              borderRadius: '12px',
              marginLeft: 'auto',
              fontWeight: 600
            }}>{sessionDetails.MatchedList?.length || 0} items</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              minWidth: windowWidth <= 768 ? '800px' : 'auto'
            }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#475569', 
                    textAlign: 'left',
                    whiteSpace: 'nowrap'
                  }}>Item Code</th>
                  <th style={{ 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#475569', 
                    textAlign: 'left',
                    whiteSpace: 'nowrap'
                  }}>Product Name</th>
                  <th style={{ 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#475569', 
                    textAlign: 'left',
                    whiteSpace: 'nowrap'
                  }}>Branch Name</th>
                  <th style={{ 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#475569', 
                    textAlign: 'left',
                    whiteSpace: 'nowrap'
                  }}>Category</th>
                  <th style={{ 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#475569', 
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>Gross Wt</th>
                  <th style={{ 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#475569', 
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>Net Wt</th>
                  <th style={{ 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#475569', 
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>Pieces</th>
                </tr>
              </thead>
              <tbody>
                {sessionDetails.MatchedList?.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                      No matched items
                    </td>
                  </tr>
                ) : (
                  getPaginatedData(sessionDetails.MatchedList || [], matchedPage, tableItemsPerPage).map((item, index) => {
                    const globalIndex = (matchedPage - 1) * tableItemsPerPage + index;
                    return (
                      <tr
                        key={item.Id || index}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          background: globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc'}
                      >
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px', 
                          color: '#1e293b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{item.ItemCode || 'N/A'}</td>
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px', 
                          color: '#1e293b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{item.ProductName || 'N/A'}</td>
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px', 
                          color: '#1e293b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{item.BranchName || 'N/A'}</td>
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px', 
                          color: '#1e293b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{item.CategoryName || 'N/A'}</td>
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px', 
                          color: '#1e293b', 
                          textAlign: 'center',
                          whiteSpace: 'nowrap'
                        }}>{item.GrossWeight || 0}g</td>
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px', 
                          color: '#1e293b', 
                          textAlign: 'center',
                          whiteSpace: 'nowrap'
                        }}>{item.NetWeight || 0}g</td>
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px', 
                          color: '#1e293b', 
                          textAlign: 'center',
                          whiteSpace: 'nowrap'
                        }}>{item.Quantity || 0}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Matched Items Pagination */}
          {sessionDetails.MatchedList && sessionDetails.MatchedList.length > tableItemsPerPage && (
            <div style={{
              padding: '16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              background: '#f8fafc'
            }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Showing {((matchedPage - 1) * tableItemsPerPage) + 1} to {Math.min(matchedPage * tableItemsPerPage, sessionDetails.MatchedList.length)} of {sessionDetails.MatchedList.length} items
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={() => setMatchedPage(prev => Math.max(1, prev - 1))}
                  disabled={matchedPage === 1}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #10b981',
                    background: matchedPage === 1 ? '#f1f5f9' : '#ffffff',
                    color: matchedPage === 1 ? '#94a3b8' : '#10b981',
                    cursor: matchedPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => {
                    if (matchedPage !== 1) {
                      e.target.style.background = '#10b981';
                      e.target.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (matchedPage !== 1) {
                      e.target.style.background = '#ffffff';
                      e.target.style.color = '#10b981';
                    }
                  }}
                >
                  <FaChevronLeft size={12} /> Previous
                </button>
                <span style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  background: '#ffffff',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}>
                  {matchedPage} / {getTotalPages(sessionDetails.MatchedList, tableItemsPerPage)}
                </span>
                <button 
                  onClick={() => setMatchedPage(prev => Math.min(getTotalPages(sessionDetails.MatchedList, tableItemsPerPage), prev + 1))}
                  disabled={matchedPage === getTotalPages(sessionDetails.MatchedList, tableItemsPerPage)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #10b981',
                    background: matchedPage === getTotalPages(sessionDetails.MatchedList, tableItemsPerPage) ? '#f1f5f9' : '#ffffff',
                    color: matchedPage === getTotalPages(sessionDetails.MatchedList, tableItemsPerPage) ? '#94a3b8' : '#10b981',
                    cursor: matchedPage === getTotalPages(sessionDetails.MatchedList, tableItemsPerPage) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => {
                    if (matchedPage !== getTotalPages(sessionDetails.MatchedList, tableItemsPerPage)) {
                      e.target.style.background = '#10b981';
                      e.target.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (matchedPage !== getTotalPages(sessionDetails.MatchedList, tableItemsPerPage)) {
                      e.target.style.background = '#ffffff';
                      e.target.style.color = '#10b981';
                    }
                  }}
                >
                  Next <FaChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Unmatched Items Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            padding: '16px',
            background: '#fef2f2',
            borderBottom: '2px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <FaTimesCircle style={{ color: '#ef4444', fontSize: '18px' }} />
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#475569' }}>Unmatched Items</span>
            <span style={{
              fontSize: '12px',
              color: '#64748b',
              background: '#fee2e2',
              padding: '4px 12px',
              borderRadius: '12px',
              marginLeft: 'auto',
              fontWeight: 600
            }}>{sessionDetails.UnmatchedList?.length || 0} items</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              minWidth: windowWidth <= 768 ? '800px' : 'auto'
            }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#475569', 
                    textAlign: 'left',
                    whiteSpace: 'nowrap'
                  }}>Item Code</th>
                  <th style={{ 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#475569', 
                    textAlign: 'left',
                    whiteSpace: 'nowrap'
                  }}>Product Name</th>
                  <th style={{ 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#475569', 
                    textAlign: 'left',
                    whiteSpace: 'nowrap'
                  }}>Branch Name</th>
                  <th style={{ 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#475569', 
                    textAlign: 'left',
                    whiteSpace: 'nowrap'
                  }}>Category</th>
                  <th style={{ 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#475569', 
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>Gross Wt</th>
                  <th style={{ 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#475569', 
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>Net Wt</th>
                  <th style={{ 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#475569', 
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>Pieces</th>
                </tr>
              </thead>
              <tbody>
                {sessionDetails.UnmatchedList?.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                      No unmatched items
                    </td>
                  </tr>
                ) : (
                  getPaginatedData(sessionDetails.UnmatchedList || [], unmatchedPage, tableItemsPerPage).map((item, index) => {
                    const globalIndex = (unmatchedPage - 1) * tableItemsPerPage + index;
                    return (
                      <tr
                        key={item.Id || index}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          background: globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc'}
                      >
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px', 
                          color: '#1e293b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{item.ItemCode || 'N/A'}</td>
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px', 
                          color: '#1e293b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{item.ProductName || 'N/A'}</td>
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px', 
                          color: '#1e293b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{item.BranchName || 'N/A'}</td>
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px', 
                          color: '#1e293b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{item.CategoryName || 'N/A'}</td>
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px', 
                          color: '#1e293b', 
                          textAlign: 'center',
                          whiteSpace: 'nowrap'
                        }}>{item.GrossWeight || 0}g</td>
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px', 
                          color: '#1e293b', 
                          textAlign: 'center',
                          whiteSpace: 'nowrap'
                        }}>{item.NetWeight || 0}g</td>
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px', 
                          color: '#1e293b', 
                          textAlign: 'center',
                          whiteSpace: 'nowrap'
                        }}>{item.Quantity || 0}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Unmatched Items Pagination */}
          {sessionDetails.UnmatchedList && sessionDetails.UnmatchedList.length > tableItemsPerPage && (
            <div style={{
              padding: '16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              background: '#f8fafc'
            }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Showing {((unmatchedPage - 1) * tableItemsPerPage) + 1} to {Math.min(unmatchedPage * tableItemsPerPage, sessionDetails.UnmatchedList.length)} of {sessionDetails.UnmatchedList.length} items
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={() => setUnmatchedPage(prev => Math.max(1, prev - 1))}
                  disabled={unmatchedPage === 1}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #ef4444',
                    background: unmatchedPage === 1 ? '#f1f5f9' : '#ffffff',
                    color: unmatchedPage === 1 ? '#94a3b8' : '#ef4444',
                    cursor: unmatchedPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => {
                    if (unmatchedPage !== 1) {
                      e.target.style.background = '#ef4444';
                      e.target.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (unmatchedPage !== 1) {
                      e.target.style.background = '#ffffff';
                      e.target.style.color = '#ef4444';
                    }
                  }}
                >
                  <FaChevronLeft size={12} /> Previous
                </button>
                <span style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  background: '#ffffff',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}>
                  {unmatchedPage} / {getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage)}
                </span>
                <button 
                  onClick={() => setUnmatchedPage(prev => Math.min(getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage), prev + 1))}
                  disabled={unmatchedPage === getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #ef4444',
                    background: unmatchedPage === getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage) ? '#f1f5f9' : '#ffffff',
                    color: unmatchedPage === getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage) ? '#94a3b8' : '#ef4444',
                    cursor: unmatchedPage === getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => {
                    if (unmatchedPage !== getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage)) {
                      e.target.style.background = '#ef4444';
                      e.target.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (unmatchedPage !== getTotalPages(sessionDetails.UnmatchedList, tableItemsPerPage)) {
                      e.target.style.background = '#ffffff';
                      e.target.style.color = '#ef4444';
                    }
                  }}
                >
                  Next <FaChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .fa-spin {
          animation: spin 1s linear infinite;
        }
        @media (max-width: 768px) {
          table {
            font-size: 12px;
          }
          th, td {
            padding: 8px;
            font-size: 12px;
          }
        }
        @media (max-width: 480px) {
          table {
            font-size: 11px;
          }
          th, td {
            padding: 6px;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};

export default SessionDetails;

