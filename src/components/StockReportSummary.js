import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaSpinner, 
  FaExclamationTriangle,
  FaSync,
  FaArrowLeft
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useLoading } from '../App';
import { useNotifications } from '../context/NotificationContext';

const StockReportSummary = () => {
  const { loading, setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  
  const [summaryData, setSummaryData] = useState({
    LabeledStock: [],
    HallMarkCompleted: []
  });
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [filterValues, setFilterValues] = useState({
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(storedUserInfo);
        setUserInfo(parsedUserInfo);
        
        // Get dates from URL params or use current date
        const urlParams = new URLSearchParams(window.location.search);
        const dateFrom = urlParams.get('dateFrom') || getCurrentDate();
        const dateTo = urlParams.get('dateTo') || getCurrentDate();
        
        setFilterValues({
          dateFrom,
          dateTo
        });
      } catch (err) {
        console.error('Error parsing user info:', err);
        setError('Error loading user information');
      }
    }
  }, []);

  useEffect(() => {
    if (userInfo && userInfo.ClientCode && filterValues.dateFrom && filterValues.dateTo) {
      fetchSummaryData();
    }
  }, [userInfo, filterValues]);

  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);

      let clientCode = null;
      if (userInfo && userInfo.ClientCode) {
        clientCode = userInfo.ClientCode;
      } else {
        try {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            const parsedUserInfo = JSON.parse(storedUserInfo);
            if (parsedUserInfo && parsedUserInfo.ClientCode) {
              clientCode = parsedUserInfo.ClientCode;
            }
          }
        } catch (err) {
          console.error('Error in fallback userInfo retrieval:', err);
        }
      }

      if (!clientCode) {
        setError('Client code not found. Please login again.');
        setLoading(false);
        return;
      }

      const payload = {
        ClientCode: clientCode || '',
        FromDate: filterValues.dateFrom && filterValues.dateFrom.trim() !== '' 
          ? filterValues.dateFrom.trim() 
          : '',
        ToDate: filterValues.dateTo && filterValues.dateTo.trim() !== '' 
          ? filterValues.dateTo.trim() 
          : '',
        StockType: 'All',
        PurityId: 0,
        CategoryId: 0,
        ProductId: 0,
        DesignId: 0,
        CounterId: 0,
        BranchId: 0
      };

      console.log('Stock Report Summary API Payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/Reports/GetStockReportSummary',
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data) {
        setSummaryData({
          LabeledStock: response.data.LabeledStock || [],
          HallMarkCompleted: response.data.HallMarkCompleted || []
        });
      } else {
        setSummaryData({
          LabeledStock: [],
          HallMarkCompleted: []
        });
      }
    } catch (err) {
      console.error('Error fetching summary data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch summary data');
      setSummaryData({
        LabeledStock: [],
        HallMarkCompleted: []
      });
      addNotification({
        type: 'error',
        message: 'Failed to fetch summary data. Please try again.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchSummaryData();
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return '0.00';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
  };

  // Get all unique purities from data
  const getAllPurities = (data) => {
    const puritiesSet = new Set();
    data.forEach(category => {
      if (category.Purities && Array.isArray(category.Purities)) {
        category.Purities.forEach(purity => {
          if (purity.Purity) {
            puritiesSet.add(purity.Purity);
          }
        });
      }
    });
    return Array.from(puritiesSet).sort();
  };

  // Get purity value for a category
  const getPurityValue = (category, purityName, type) => {
    if (!category.Purities || !Array.isArray(category.Purities)) return null;
    const purity = category.Purities.find(p => p.Purity === purityName);
    if (!purity) return null;
    return type === 'GrossWt' ? purity.GrossWt : purity.NetWt;
  };

  // Calculate category total
  const calculateCategoryTotal = (category) => {
    if (!category.Purities || !Array.isArray(category.Purities)) return 0;
    return category.Purities.reduce((sum, purity) => {
      return sum + parseFloat(purity.GrossWt || 0);
    }, 0);
  };

  // Calculate purity column totals
  const calculatePurityTotals = (data, purityName) => {
    return data.reduce((acc, category) => {
      const grossWt = parseFloat(getPurityValue(category, purityName, 'GrossWt') || 0);
      const netWt = parseFloat(getPurityValue(category, purityName, 'NetWt') || 0);
      acc.GrossWt += grossWt;
      acc.NetWt += netWt;
      return acc;
    }, { GrossWt: 0, NetWt: 0 });
  };

  // Calculate grand total
  const calculateGrandTotal = (data) => {
    return data.reduce((sum, category) => {
      return sum + calculateCategoryTotal(category);
    }, 0);
  };

  const renderSummaryTable = (title, data) => {
    if (!data || data.length === 0) {
      return (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: '#1e293b',
            marginBottom: '16px'
          }}>{title}</h2>
          <p style={{
            color: '#94a3b8',
            fontSize: '14px',
            textAlign: 'center',
            padding: '20px'
          }}>No data available</p>
        </div>
      );
    }

    const allPurities = getAllPurities(data);
    const grandTotal = calculateGrandTotal(data);

    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 600,
          color: '#1e293b',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '2px solid #e5e7eb'
        }}>{title}</h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px',
            minWidth: '600px',
            tableLayout: 'fixed'
          }}>
            <colgroup>
              <col style={{ width: '120px' }} /> {/* Metal column */}
              {allPurities.map(() => (
                <React.Fragment key={`col-${Math.random()}`}>
                  <col style={{ width: '100px' }} /> {/* Gr Wt */}
                  <col style={{ width: '100px' }} /> {/* Net Wt */}
                </React.Fragment>
              ))}
              <col style={{ width: '100px' }} /> {/* Total column */}
            </colgroup>
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
                  whiteSpace: 'nowrap',
                  borderRight: '1px solid #e5e7eb',
                  position: 'sticky',
                  left: 0,
                  background: '#f8fafc',
                  zIndex: 10
                }}>Metal</th>
                {allPurities.map((purity) => (
                  <th
                    key={purity}
                    colSpan={2}
                    style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#475569',
                      whiteSpace: 'nowrap',
                      borderRight: '1px solid #e5e7eb'
                    }}
                  >
                    {purity}
                  </th>
                ))}
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  whiteSpace: 'nowrap'
                }}>Total</th>
              </tr>
              <tr style={{
                background: '#f8fafc',
                borderBottom: '2px solid #e5e7eb'
              }}>
                <th style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#64748b',
                  borderRight: '1px solid #e5e7eb',
                  position: 'sticky',
                  left: 0,
                  background: '#f8fafc',
                  zIndex: 10
                }}></th>
                {allPurities.map((purity) => (
                  <React.Fragment key={purity}>
                    <th style={{
                      padding: '8px',
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748b',
                      borderRight: '1px solid #e5e7eb'
                    }}>Gr Wt</th>
                    <th style={{
                      padding: '8px',
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748b',
                      borderRight: '1px solid #e5e7eb'
                    }}>Net Wt</th>
                  </React.Fragment>
                ))}
                <th style={{
                  padding: '8px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#64748b'
                }}></th>
              </tr>
            </thead>
            <tbody>
              {data.map((category, categoryIndex) => {
                const categoryTotal = calculateCategoryTotal(category);
                return (
                  <tr
                    key={categoryIndex}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      background: categoryIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = categoryIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
                    }}
                  >
                    <td style={{
                      padding: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#1e293b',
                      whiteSpace: 'nowrap',
                      borderRight: '1px solid #e5e7eb',
                      position: 'sticky',
                      left: 0,
                      background: categoryIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                      zIndex: 5
                    }}>{category.Category || 'N/A'}</td>
                    {allPurities.map((purity) => {
                      const grossWt = getPurityValue(category, purity, 'GrossWt');
                      const netWt = getPurityValue(category, purity, 'NetWt');
                      return (
                        <React.Fragment key={purity}>
                          <td style={{
                            padding: '10px 8px',
                            fontSize: '12px',
                            color: '#1e293b',
                            textAlign: 'right',
                            borderRight: '1px solid #e5e7eb',
                            whiteSpace: 'nowrap'
                          }}>{grossWt ? formatNumber(grossWt) : '-'}</td>
                          <td style={{
                            padding: '10px 8px',
                            fontSize: '12px',
                            color: '#1e293b',
                            textAlign: 'right',
                            borderRight: '1px solid #e5e7eb',
                            whiteSpace: 'nowrap'
                          }}>{netWt ? formatNumber(netWt) : '-'}</td>
                        </React.Fragment>
                      );
                    })}
                    <td style={{
                      padding: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#1e293b',
                      textAlign: 'right',
                      whiteSpace: 'nowrap'
                    }}>{formatNumber(categoryTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{
                background: '#f1f5f9',
                borderTop: '2px solid #e5e7eb',
                fontWeight: 700
              }}>
                <td style={{
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1e293b',
                  borderRight: '1px solid #e5e7eb',
                  position: 'sticky',
                  left: 0,
                  background: '#f1f5f9',
                  zIndex: 5
                }}>Total</td>
                {allPurities.map((purity) => {
                  const purityTotals = calculatePurityTotals(data, purity);
                  return (
                    <React.Fragment key={purity}>
                      <td style={{
                        padding: '12px 8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#1e293b',
                        textAlign: 'right',
                        borderRight: '1px solid #e5e7eb',
                        whiteSpace: 'nowrap'
                      }}>{formatNumber(purityTotals.GrossWt)}</td>
                      <td style={{
                        padding: '12px 8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#1e293b',
                        textAlign: 'right',
                        borderRight: '1px solid #e5e7eb',
                        whiteSpace: 'nowrap'
                      }}>{formatNumber(purityTotals.NetWt)}</td>
                    </React.Fragment>
                  );
                })}
                <td style={{
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1e293b',
                  textAlign: 'right',
                  whiteSpace: 'nowrap'
                }}>{formatNumber(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      padding: '20px',
      background: '#ffffff',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <button
                onClick={() => navigate('/reports')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f1f5f9';
                  e.target.style.borderColor = '#94a3b8';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ffffff';
                  e.target.style.borderColor = '#cbd5e1';
                }}
              >
                <FaArrowLeft />
                Back
              </button>
              <h1 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 600,
                color: '#1e293b'
              }}>
                Stock Report Summary
              </h1>
            </div>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#64748b'
            }}>
              Summary of labeled stock and hallmark completed items by category and purity
              {filterValues.dateFrom && filterValues.dateTo && (
                <span style={{ marginLeft: '8px', fontWeight: 600 }}>
                  (From: {filterValues.dateFrom} To: {filterValues.dateTo})
                </span>
              )}
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <button
              onClick={handleRefresh}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid #3b82f6',
                background: '#ffffff',
                color: '#3b82f6',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = '#3b82f6';
                  e.target.style.color = '#ffffff';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = '#ffffff';
                  e.target.style.color = '#3b82f6';
                }
              }}
            >
              {loading ? (
                <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <FaSync />
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#dc2626'
        }}>
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      )}

      {/* Label Stock Section */}
      {renderSummaryTable('Label Stock', summaryData.LabeledStock)}

      {/* HallMark Completed Section */}
      {renderSummaryTable('Hallmark Completed', summaryData.HallMarkCompleted)}
    </div>
  );
};

export default StockReportSummary;

