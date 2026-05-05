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

const SUMMARY_PAGE_SIZE = 15;

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
  const [pageLabeled, setPageLabeled] = useState(1);
  const [pageHallmark, setPageHallmark] = useState(1);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  useEffect(() => {
    setPageLabeled(1);
    setPageHallmark(1);
  }, [summaryData.LabeledStock, summaryData.HallMarkCompleted]);

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

  const buildSummaryPagination = (totalPages, currentPage) => {
    const maxPagesToShow = 7;
    if (totalPages <= maxPagesToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [1];
    if (currentPage > 5) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const renderSummaryTable = (title, data, currentPage, setPage) => {
    const isSmall = windowWidth <= 768;
    const thBase = {
      padding: isSmall ? '6px 6px' : '7px 8px',
      fontWeight: 700,
      fontSize: isSmall ? 10 : 11,
      color: '#18181b',
      borderRight: '1px solid #e4e4e7',
      borderBottom: '2px solid #d4d4d8',
      background: '#f4f4f5',
    };
    const tdBase = {
      padding: isSmall ? '5px 6px' : '6px 8px',
      fontSize: isSmall ? 10 : 11,
      lineHeight: 1.35,
      color: '#404040',
      borderRight: '1px solid #ececec',
      borderBottom: '1px solid #e5e5e5',
    };
    const pageBtn = (disabled) => ({
      padding: '5px 11px',
      fontSize: 12,
      fontWeight: 600,
      borderRadius: 8,
      border: '1px solid #e5e5e5',
      background: '#ffffff',
      color: disabled ? '#a3a3a3' : '#525252',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    });
    const pageNum = (active) => ({
      padding: '5px 10px',
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 8,
      border: `1px solid ${active ? '#0d9488' : '#e5e5e5'}`,
      background: active ? '#0d9488' : '#ffffff',
      color: active ? '#ffffff' : '#525252',
      cursor: 'pointer',
      minWidth: 32,
    });

    if (!data || data.length === 0) {
      return (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            marginBottom: 12,
            boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div style={{ height: 3, background: 'linear-gradient(90deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)' }} />
          <div style={{ padding: '14px 16px' }}>
            <h2 style={{ margin: 0, fontSize: isSmall ? '1rem' : '1.05rem', fontWeight: 800, color: '#0f172a' }}>{title}</h2>
            <p style={{ margin: '10px 0 0', color: '#94a3b8', fontSize: 11, fontWeight: 600, textAlign: 'center', padding: '18px 8px' }}>
              No data for this range
            </p>
          </div>
        </div>
      );
    }

    const allPurities = getAllPurities(data);
    const grandTotal = calculateGrandTotal(data);
    const totalRecords = data.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / SUMMARY_PAGE_SIZE));

    const sliceStart = (currentPage - 1) * SUMMARY_PAGE_SIZE;
    const pageSlice = data.slice(sliceStart, sliceStart + SUMMARY_PAGE_SIZE);
    const paddedSlots = [];
    pageSlice.forEach((row) => paddedSlots.push({ kind: 'row', row }));
    const padCount = Math.max(0, SUMMARY_PAGE_SIZE - paddedSlots.length);
    for (let i = 0; i < padCount; i += 1) {
      paddedSlots.push({ kind: 'pad', key: `sum-pad-${currentPage}-${i}` });
    }

    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          marginBottom: 12,
          boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 3, background: 'linear-gradient(90deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)' }} />
        <div style={{ padding: '12px 14px 10px' }}>
          <h2 style={{ margin: 0, fontSize: isSmall ? '1rem' : '1.05rem', fontWeight: 800, color: '#0f172a' }}>{title}</h2>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748b', fontWeight: 600 }}>
            <strong style={{ color: '#0f766e' }}>{SUMMARY_PAGE_SIZE}</strong> category rows per page · {totalRecords} categories
          </p>
        </div>

        <div style={{ overflowX: 'auto', padding: '0 12px 12px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              minWidth: 600,
              tableLayout: 'fixed',
            }}
          >
            <colgroup>
              <col style={{ width: '120px' }} />
              {allPurities.flatMap((purity) => [
                <col key={`${purity}-gr`} style={{ width: '100px' }} />,
                <col key={`${purity}-nt`} style={{ width: '100px' }} />,
              ])}
              <col style={{ width: '100px' }} />
            </colgroup>
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  style={{
                    ...thBase,
                    textAlign: 'left',
                    verticalAlign: 'middle',
                    position: 'sticky',
                    left: 0,
                    zIndex: 12,
                  }}
                >
                  Metal
                </th>
                {allPurities.map((purity) => (
                  <th key={purity} colSpan={2} style={{ ...thBase, textAlign: 'center' }}>
                    {purity}
                  </th>
                ))}
                <th rowSpan={2} style={{ ...thBase, textAlign: 'center', borderRight: 'none' }}>
                  Total
                </th>
              </tr>
              <tr>
                {allPurities.map((purity) => (
                  <React.Fragment key={`${purity}-sub`}>
                    <th style={{ ...thBase, textAlign: 'center', fontSize: isSmall ? 9 : 10, color: '#52525b' }}>Gr Wt</th>
                    <th style={{ ...thBase, textAlign: 'center', fontSize: isSmall ? 9 : 10, color: '#52525b' }}>Net Wt</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                let idx = 0;
                return paddedSlots.map((slot, slotIndex) => {
                  if (slot.kind === 'pad') {
                    const zebra = slotIndex % 2 === 0 ? '#fafafa' : '#f4f4f5';
                    return (
                      <tr key={slot.key} style={{ background: zebra, height: 34 }}>
                        <td
                          style={{
                            ...tdBase,
                            position: 'sticky',
                            left: 0,
                            background: zebra,
                            zIndex: 4,
                            color: '#e7e5e4',
                          }}
                        >
                          {'\u00a0'}
                        </td>
                        {allPurities.map((purity) => (
                          <React.Fragment key={`${slot.key}-${purity}`}>
                            <td style={{ ...tdBase, textAlign: 'right', color: '#e7e5e4' }}>{'\u00a0'}</td>
                            <td style={{ ...tdBase, textAlign: 'right', color: '#e7e5e4' }}>{'\u00a0'}</td>
                          </React.Fragment>
                        ))}
                        <td style={{ ...tdBase, textAlign: 'right', borderRight: 'none', color: '#e7e5e4' }}>{'\u00a0'}</td>
                      </tr>
                    );
                  }
                  const category = slot.row;
                  const categoryIndex = idx;
                  idx += 1;
                  const categoryTotal = calculateCategoryTotal(category);
                  const zebra = slotIndex % 2 === 0 ? '#ffffff' : '#fafafa';
                  const stickyBg = zebra;
                  return (
                    <tr
                      key={`cat-${sliceStart + categoryIndex}`}
                      style={{ background: zebra, height: 34 }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f0fdfa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = zebra;
                      }}
                    >
                      <td
                        style={{
                          ...tdBase,
                          fontWeight: 700,
                          color: '#27272a',
                          whiteSpace: 'nowrap',
                          position: 'sticky',
                          left: 0,
                          background: stickyBg,
                          zIndex: 4,
                          boxShadow: '1px 0 0 #ececec',
                        }}
                      >
                        {category.Category || 'N/A'}
                      </td>
                      {allPurities.map((purity) => {
                        const grossWt = getPurityValue(category, purity, 'GrossWt');
                        const netWt = getPurityValue(category, purity, 'NetWt');
                        return (
                          <React.Fragment key={purity}>
                            <td style={{ ...tdBase, textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {grossWt ? formatNumber(grossWt) : '-'}
                            </td>
                            <td style={{ ...tdBase, textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {netWt ? formatNumber(netWt) : '-'}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td style={{ ...tdBase, textAlign: 'right', fontWeight: 700, borderRight: 'none', whiteSpace: 'nowrap' }}>
                        {formatNumber(categoryTotal)}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot>
              <tr
                style={{
                  background: 'linear-gradient(180deg, #ecfdf5 0%, #f0fdfa 100%)',
                  boxShadow: 'inset 0 2px 0 #99f6e4',
                }}
              >
                <td
                  style={{
                    ...tdBase,
                    fontWeight: 800,
                    color: '#0f766e',
                    borderTop: '2px solid #5eead4',
                    position: 'sticky',
                    left: 0,
                    background: '#ecfdf5',
                    zIndex: 4,
                    boxShadow: '1px 0 0 #cce8e4',
                  }}
                >
                  Total
                </td>
                {allPurities.map((purity) => {
                  const purityTotals = calculatePurityTotals(data, purity);
                  return (
                    <React.Fragment key={purity}>
                      <td
                        style={{
                          ...tdBase,
                          textAlign: 'right',
                          fontWeight: 800,
                          color: '#0f766e',
                          borderTop: '2px solid #5eead4',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatNumber(purityTotals.GrossWt)}
                      </td>
                      <td
                        style={{
                          ...tdBase,
                          textAlign: 'right',
                          fontWeight: 800,
                          color: '#0f766e',
                          borderTop: '2px solid #5eead4',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatNumber(purityTotals.NetWt)}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td
                  style={{
                    ...tdBase,
                    textAlign: 'right',
                    fontWeight: 800,
                    color: '#0f766e',
                    borderTop: '2px solid #5eead4',
                    borderRight: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatNumber(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            borderTop: '1px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: 10,
            background: '#f8fafc',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
            Showing{' '}
            <strong style={{ color: '#0f172a' }}>{(currentPage - 1) * SUMMARY_PAGE_SIZE + 1}</strong>–
            <strong style={{ color: '#0f172a' }}>{Math.min(currentPage * SUMMARY_PAGE_SIZE, totalRecords)}</strong> of{' '}
            <strong style={{ color: '#0f172a' }}>{totalRecords}</strong> · {SUMMARY_PAGE_SIZE} / page
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={pageBtn(currentPage === 1)}
            >
              Prev
            </button>
            {buildSummaryPagination(totalPages, currentPage).map((page, i) =>
              page === '...' ? (
                <span key={`e-${i}`} style={{ padding: '4px 6px', fontSize: 11, color: '#a3a3a3' }}>
                  …
                </span>
              ) : (
                <button type="button" key={page} onClick={() => setPage(page)} style={pageNum(currentPage === page)}>
                  {page}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={pageBtn(currentPage === totalPages)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  const isSmallScreen = windowWidth <= 768;

  return (
    <div
      className="stock-report-summary-page"
      style={{
        fontFamily: 'var(--font-family)',
        padding: '12px',
        fontSize: 11,
        minHeight: '100%',
        background: '#fafafa',
      }}
    >
      <style>{`
        @keyframes stockSummarySpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 12,
          boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ height: 3, background: 'linear-gradient(90deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)' }} />
        <div style={{ padding: '14px 16px' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 14,
            }}
          >
            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <button
                  type="button"
                  onClick={() => navigate('/reports')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    background: '#fafafa',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  <FaArrowLeft />
                  Back
                </button>
                <h1
                  style={{
                    margin: 0,
                    fontSize: isSmallScreen ? '1.05rem' : '1.2rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    lineHeight: 1.2,
                  }}
                >
                  Stock report summary
                </h1>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600, lineHeight: 1.45 }}>
                Labeled stock and hallmark completed — by category and purity
                {filterValues.dateFrom && filterValues.dateTo && (
                  <span style={{ display: 'block', marginTop: 4, color: '#0f766e' }}>
                    {filterValues.dateFrom} → {filterValues.dateTo}
                  </span>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 32,
                  padding: '0 14px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 10,
                  border: '1px solid #d4d4d8',
                  background: '#fafafa',
                  color: '#262626',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.55 : 1,
                }}
              >
                {loading ? (
                  <FaSpinner style={{ animation: 'stockSummarySpin 1s linear infinite' }} />
                ) : (
                  <FaSync />
                )}
                Refresh
              </button>
            </div>
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

      {renderSummaryTable('Label stock', summaryData.LabeledStock, pageLabeled, setPageLabeled)}

      {renderSummaryTable('Hallmark completed', summaryData.HallMarkCompleted, pageHallmark, setPageHallmark)}
    </div>
  );
};

export default StockReportSummary;

