import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaPrint, FaChevronLeft, FaChevronRight, FaSpinner, FaSearch } from 'react-icons/fa';
import { useNotifications } from '../../context/NotificationContext';
import { useLoading } from '../../App';

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

const QuotationList = () => {
  const { loading, setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState([]);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [totalRecords, setTotalRecords] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [userInfo, setUserInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isSmallScreen = windowWidth <= 768;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsed = JSON.parse(storedUserInfo);
        setUserInfo(parsed);
      } catch (err) {
        console.error('Error parsing userInfo:', err);
      }
    }
  }, []);

  // Fetch quotations from API
  useEffect(() => {
    const fetchQuotations = async () => {
      if (!userInfo?.ClientCode) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const headers = {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        };

        const payload = {
          ClientCode: userInfo.ClientCode
        };

        const response = await axios.post(
          'https://rrgold.loyalstring.co.in/api/Order/GetAllQuotation',
          payload,
          { headers }
        );

        // Normalize response data
        const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        setQuotations(data);
        setTotalRecords(data.length);
        
        // Update total records in header
        setCurrentPage(1);
      } catch (error) {
        console.error('Error fetching quotations:', error);
        setError(error.response?.data?.message || 'Failed to fetch quotations. Please try again.');
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to fetch quotations. Please try again.'
        });
      } finally {
        setLoading(false);
      }
    };

    if (userInfo?.ClientCode) {
      fetchQuotations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString || dateString === '0001-01-01T00:00:00') return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  // Format number
  const formatNumber = (value, decimals = 3) => {
    if (value === null || value === undefined || value === '') return '0.000';
    const num = parseFloat(value);
    if (isNaN(num)) return '0.000';
    return num.toFixed(decimals);
  };

  // Calculate F+W Wt (Fine + Wastage Weight)
  const calculateFWWeight = (quotation) => {
    // This might need to be calculated based on business logic
    // For now, returning 0.000 as shown in the image
    return '0.000';
  };

  // Get customer name
  const getCustomerName = (quotation) => {
    if (quotation.Customer) {
      const firstName = quotation.Customer.FirstName || '';
      const lastName = quotation.Customer.LastName || '';
      return `${firstName} ${lastName}`.trim() || '-';
    }
    return quotation.CustomerName || '-';
  };

  // Handle print
  const handlePrint = (quotation) => {
    // TODO: Implement print functionality
    addNotification({
      type: 'info',
      title: 'Print',
      message: `Print functionality for Quotation #${quotation.QuotationNo} will be implemented.`
    });
  };

  // Search functionality
  const filteredQuotations = useMemo(() => {
    let filtered = quotations;
    
    if (searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(quotation =>
        Object.values(quotation).some(val => {
          if (val === null || val === undefined) return false;
          const str = val.toString().toLowerCase();
          if (quotation.QuotationNo && quotation.QuotationNo.toString().toLowerCase().includes(q)) return true;
          if (quotation.Customer && (
            quotation.Customer.FirstName?.toLowerCase().includes(q) ||
            quotation.Customer.LastName?.toLowerCase().includes(q)
          )) return true;
          return str.includes(q);
        })
      );
    }
    
    return filtered;
  }, [quotations, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredQuotations.length);
  const currentQuotations = filteredQuotations.slice(startIndex, endIndex);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  // Generate pagination numbers
  const generatePagination = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= maxVisible; i++) {
          pages.push(i);
        }
        if (totalPages > maxVisible) {
          pages.push('...');
          pages.push(totalPages);
        }
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleItemsPerPageChange = (newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
  };

  return (
    <div className="container-fluid p-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
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
          {/* Left: Title */}
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: '#1e293b',
              lineHeight: '1.2'
            }}>Quotation List</h2>
          </div>

          {/* Right: Total Count */}
          <div style={{
            fontSize: '12px',
            color: '#64748b',
            fontWeight: 600
          }}>
            Total: {filteredQuotations.length} records
          </div>
        </div>

        {/* Search Row */}
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
              placeholder="Search by Quotation No, Customer Name..."
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
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '16px',
          color: '#991b1b',
          fontSize: '14px'
        }}>
          {error}
        </div>
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
            minWidth: '1200px',
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
                }}>S No</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Quotation No</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Customer Name</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'right',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Gross Wt</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'right',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Net Wt</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'right',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>F+W Wt</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'right',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Taxable Amount</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'right',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>GST Amount</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'right',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Quotation Amount</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && quotations.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '12px'
                  }}>
                    <FaSpinner style={{
                      fontSize: '24px',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '8px',
                      display: 'inline-block'
                    }} />
                    <div style={{ marginTop: '8px' }}>Loading quotations...</div>
                  </td>
                </tr>
              ) : currentQuotations.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '12px'
                  }}>
                    {searchQuery.trim() ? 'No quotations found matching your search.' : 'No quotations found'}
                  </td>
                </tr>
              ) : (
                currentQuotations.map((quotation, index) => {
                  const rowIndex = startIndex + index + 1;
                  const isEven = index % 2 === 0;
                  
                  return (
                    <tr
                      key={quotation.Id || index}
                      style={{
                        borderBottom: '1px solid #e5e7eb',
                        background: isEven ? '#ffffff' : '#f8fafc',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f1f5f9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isEven ? '#ffffff' : '#f8fafc';
                      }}
                    >
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: '#475569',
                        whiteSpace: 'nowrap'
                      }}>{rowIndex}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: '#1e293b',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>{quotation.QuotationNo || '-'}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>{getCustomerName(quotation)}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        textAlign: 'right',
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>{formatNumber(quotation.GrossWt)}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        textAlign: 'right',
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>{formatNumber(quotation.NetWt)}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        textAlign: 'right',
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>{formatNumber(calculateFWWeight(quotation))}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        textAlign: 'right',
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>{formatNumber(quotation.TotalNetAmount || quotation.TotalAmount, 3)}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        textAlign: 'right',
                        color: '#1e293b',
                        whiteSpace: 'nowrap'
                      }}>{formatNumber(quotation.TotalGSTAmount || quotation.GST, 3)}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        textAlign: 'right',
                        color: '#1e293b',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>{formatNumber(quotation.TotalPurchaseAmount || quotation.TotalAmount, 3)}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '12px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }}>
                        <button
                          onClick={() => handlePrint(quotation)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            background: '#ffffff',
                            color: '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '14px'
                          }}
                          title="Print Quotation"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#3b82f6';
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.color = '#475569';
                          }}
                        >
                          <FaPrint />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
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
              Showing {filteredQuotations.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredQuotations.length)} of {filteredQuotations.length} entries
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
                  cursor: 'pointer',
                  background: '#ffffff'
                }}
              >
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span>per page</span>
            </div>
          </div>

          {filteredQuotations.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap'
            }}>
              {totalPages > 1 && (
                <>
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
                  {generatePagination().map((page, index) =>
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} style={{
                        padding: '6px 8px',
                        fontSize: '12px',
                        color: '#94a3b8'
                      }}>...</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
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
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          /* Table responsive */
          table {
            font-size: 10px !important;
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
          
          table {
            font-size: 10px !important;
          }
          
          th, td {
            padding: 6px 4px !important;
            font-size: 10px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QuotationList;

