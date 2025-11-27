import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  FaSearch, 
  FaSpinner, 
  FaExclamationTriangle,
  FaEdit,
  FaTrash,
  FaEye,
  FaPrint
} from 'react-icons/fa';
import { useLoading } from '../../App';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

const SampleOutList = () => {
  const { loading, setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  // State variables
  const [sampleOutData, setSampleOutData] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [userInfo, setUserInfo] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Normalize response data helper
  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      return data.data || data.items || data.results || data.list || [];
    }
    return [];
  };

  // Fetch user info
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsed = JSON.parse(storedUserInfo);
        setUserInfo(parsed);
      } catch (err) {
        console.error('Error parsing user info:', err);
      }
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch sample out list
  const fetchSampleOutList = async () => {
    if (!userInfo?.ClientCode) return;

    setLoading(true);
    setError(null);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/Transaction/GetAllCustomerIssue',
        { ClientCode: userInfo.ClientCode },
        { headers }
      );

      const data = normalizeArray(response.data);
      setSampleOutData(data);
    } catch (error) {
      console.error('Error fetching sample out list:', error);
      setError(error.response?.data?.Message || error.response?.data?.message || error.message || 'Failed to fetch sample out list');
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load sample out list. Please refresh the page.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo?.ClientCode) {
      fetchSampleOutList();
    }
  }, [userInfo]);

  // Handle search
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on search
  };

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return sampleOutData;

    const query = searchQuery.toLowerCase().trim();
    return sampleOutData.filter(item => {
      const sampleOutNo = (item.SampleOutNo || item.SampleOutNumber || '').toString().toLowerCase();
      
      // Safely get customer name for search
      let customerNameStr = '';
      if (item.CustomerName && typeof item.CustomerName === 'string') {
        customerNameStr = item.CustomerName;
      } else if (item.Customer && typeof item.Customer === 'object') {
        const customer = item.Customer;
        if (customer.FirstName) {
          customerNameStr = `${customer.FirstName}${customer.LastName ? ' ' + customer.LastName : ''}`.trim();
        } else if (customer.Name) {
          customerNameStr = customer.Name;
        } else if (customer.CustomerName) {
          customerNameStr = customer.CustomerName;
        }
      } else if (item.Customer && typeof item.Customer === 'string') {
        customerNameStr = item.Customer;
      } else if (item.FirstName) {
        customerNameStr = `${item.FirstName}${item.LastName ? ' ' + item.LastName : ''}`.trim();
      }
      const customerName = customerNameStr.toLowerCase();
      
      const description = (item.Description || '').toString().toLowerCase();
      const productName = (item.ProductName || item.Product || '').toString().toLowerCase();
      const date = (item.Date || item.SampleOutDate || item.CreatedDate || '').toString().toLowerCase();
      const returnDate = (item.ReturnDate || item.Return_Date || '').toString().toLowerCase();

      return sampleOutNo.includes(query) ||
             customerName.includes(query) ||
             description.includes(query) ||
             productName.includes(query) ||
             date.includes(query) ||
             returnDate.includes(query);
    });
  }, [sampleOutData, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredData.slice(startIndex, endIndex);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Format weight
  const formatWeight = (weight) => {
    if (!weight && weight !== 0) return '-';
    const num = parseFloat(weight);
    return isNaN(num) ? '-' : num.toFixed(3);
  };

  // Get customer name
  const getCustomerName = (item) => {
    // Check if CustomerName is a string
    if (item.CustomerName && typeof item.CustomerName === 'string') {
      return item.CustomerName;
    }
    
    // Check if Customer is an object (customer details)
    if (item.Customer && typeof item.Customer === 'object') {
      const customer = item.Customer;
      if (customer.FirstName) {
        return `${customer.FirstName}${customer.LastName ? ' ' + customer.LastName : ''}`.trim();
      }
      if (customer.Name) return customer.Name;
      if (customer.CustomerName) return customer.CustomerName;
    }
    
    // Check if Customer is a string
    if (item.Customer && typeof item.Customer === 'string') {
      return item.Customer;
    }
    
    // Check if FirstName exists directly on item
    if (item.FirstName) {
      return `${item.FirstName}${item.LastName ? ' ' + item.LastName : ''}`.trim();
    }
    
    return '-';
  };

  // Get product name - might be in IssueItems array
  const getProductName = (item) => {
    if (item.ProductName) return item.ProductName;
    if (item.Product) return item.Product;
    if (item.IssueItems && Array.isArray(item.IssueItems) && item.IssueItems.length > 0) {
      const firstItem = item.IssueItems[0];
      return firstItem.ProductName || firstItem.Product || '-';
    }
    return '-';
  };

  if (!userInfo) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        color: '#64748b'
      }}>
        <FaExclamationTriangle style={{ fontSize: '48px', marginBottom: '16px', color: '#f59e0b' }} />
        <p>Please login to view sample out list</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        color: '#64748b'
      }}>
        <FaExclamationTriangle style={{ fontSize: '48px', marginBottom: '16px', color: '#ef4444' }} />
        <p>Error: {error}</p>
        <button
          onClick={fetchSampleOutList}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            background: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const isSmallScreen = windowWidth <= 768;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '16px' }}>
      {/* Header Section */}
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
          {/* Title */}
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: '#1e293b',
              lineHeight: '1.2'
            }}>Sample Out List</h2>
          </div>

          {/* Total Count */}
          <div style={{
            fontSize: '12px',
            color: '#64748b',
            fontWeight: 600
          }}>
            Total: {filteredData.length} records
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
            minWidth: isSmallScreen ? '100%' : '250px',
            maxWidth: isSmallScreen ? '100%' : '350px'
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
              placeholder="Search by Sample Out No, Customer Name..."
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
            borderCollapse: 'collapse',
            fontSize: '12px',
            tableLayout: 'fixed'
          }}>
            <thead>
              <tr style={{
                background: '#f8fafc',
                borderBottom: '2px solid #e5e7eb'
              }}>
                <th style={{
                  padding: '10px 6px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  width: '4%'
                }}>S No</th>
                <th style={{
                  padding: '10px 6px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  width: '8%'
                }}>Sample Out No</th>
                <th style={{
                  padding: '10px 6px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  width: '12%'
                }}>Customer Name</th>
                <th style={{
                  padding: '10px 6px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  width: '7%'
                }}>Date</th>
                <th style={{
                  padding: '10px 6px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  width: '8%'
                }}>Return Date</th>
                <th style={{
                  padding: '10px 6px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  width: '10%'
                }}>Description</th>
                <th style={{
                  padding: '10px 6px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  width: '12%'
                }}>Product Name</th>
                <th style={{
                  padding: '10px 6px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  width: '7%'
                }}>Total Wt</th>
                <th style={{
                  padding: '10px 6px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  width: '8%'
                }}>Total Gross Wt</th>
                <th style={{
                  padding: '10px 6px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  width: '8%'
                }}>Total Stone Wt</th>
                <th style={{
                  padding: '10px 6px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  width: '8%'
                }}>Total Diamond Wt</th>
                <th style={{
                  padding: '10px 6px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  width: '6%'
                }}>Total Qty</th>
                <th style={{
                  padding: '10px 6px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  width: '6%'
                }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && sampleOutData.length === 0 ? (
                <tr>
                  <td colSpan="12" style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '12px'
                  }}>
                    <FaSpinner style={{
                      fontSize: '24px',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '8px',
                      display: 'inline-block',
                      color: '#3b82f6'
                    }} />
                    <div style={{ marginTop: '8px' }}>Loading sample out records...</div>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="12" style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '12px'
                  }}>
                    {searchQuery.trim() ? 'No sample out records found matching your search.' : 'No sample out records found'}
                  </td>
                </tr>
              ) : (
                currentItems.map((item, index) => {
                  const rowIndex = startIndex + index + 1;
                  const isEven = index % 2 === 0;
                  
                  return (
                    <tr
                      key={item.Id || item.id || index}
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
                        padding: '10px 6px',
                        fontSize: '11px',
                        color: '#475569',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{rowIndex}</td>
                      <td style={{
                        padding: '10px 6px',
                        fontSize: '11px',
                        color: '#1e293b',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{item.SampleOutNo || item.SampleOutNumber || '-'}</td>
                      <td style={{
                        padding: '10px 6px',
                        fontSize: '11px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{getCustomerName(item)}</td>
                      <td style={{
                        padding: '10px 6px',
                        fontSize: '11px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{formatDate(item.Date || item.SampleOutDate || item.CreatedDate)}</td>
                      <td style={{
                        padding: '10px 6px',
                        fontSize: '11px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{formatDate(item.ReturnDate || item.Return_Date)}</td>
                      <td style={{
                        padding: '10px 6px',
                        fontSize: '11px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{item.Description || '-'}</td>
                      <td style={{
                        padding: '10px 6px',
                        fontSize: '11px',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{getProductName(item)}</td>
                      <td style={{
                        padding: '10px 6px',
                        fontSize: '11px',
                        textAlign: 'right',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{formatWeight(item.TotalWt || item.TotalWeight)}</td>
                      <td style={{
                        padding: '10px 6px',
                        fontSize: '11px',
                        textAlign: 'right',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{formatWeight(item.TotalGrossWt || item.TotalGrossWeight)}</td>
                      <td style={{
                        padding: '10px 6px',
                        fontSize: '11px',
                        textAlign: 'right',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{formatWeight(item.TotalStoneWeight || item.TotalStoneWt)}</td>
                      <td style={{
                        padding: '10px 6px',
                        fontSize: '11px',
                        textAlign: 'right',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{formatWeight(item.TotalDiamondWeight || item.TotalDiamondWt)}</td>
                      <td style={{
                        padding: '10px 6px',
                        fontSize: '11px',
                        textAlign: 'right',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{item.Quantity || item.TotalQty || item.Qty || '-'}</td>
                      <td style={{
                        padding: '10px 6px',
                        fontSize: '11px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }}>
                        <button
                          onClick={() => {
                            addNotification({
                              type: 'info',
                              title: 'Print',
                              message: `Print functionality for Sample Out #${item.SampleOutNo || item.SampleOutNumber} will be implemented.`
                            });
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px 8px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            background: '#ffffff',
                            color: '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '12px'
                          }}
                          title="Print Sample Out"
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
              Showing {filteredData.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} entries
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
            >
              Previous
            </button>
            <span style={{
              fontSize: '12px',
              color: '#475569',
              fontWeight: 500,
              padding: '0 8px'
            }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
            >
              Next
            </button>
          </div>
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

export default SampleOutList;

