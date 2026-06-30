import React, { useState, useEffect, useMemo } from 'react';
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
  FaChevronRight,
  FaSearch
} from 'react-icons/fa';
import { useNotifications } from '../../context/NotificationContext';
import { useLoading } from '../../App';
import GridItemImage from '../common/GridItemImage';

const svCardPageBtn = (disabled) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: 700,
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  background: disabled ? '#f1f5f9' : '#ffffff',
  color: disabled ? '#94a3b8' : '#475569',
  cursor: disabled ? 'not-allowed' : 'pointer',
});

const SDField = ({ label, value, valueColor = '#1e293b', span2 = false }) => (
  <div style={{ gridColumn: span2 ? '1 / -1' : 'auto', minWidth: 0 }}>
    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.2 }}>
      {label}
    </div>
    <div
      style={{
        fontSize: '11px',
        fontWeight: 600,
        color: valueColor,
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      title={String(value)}
    >
      {value}
    </div>
  </div>
);

const SessionDetails = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { setLoading: setGlobalLoading } = useLoading();
  const { addNotification } = useNotifications();
  
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState({});
  const [clientCode, setClientCode] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Card view state
  const [activeTab, setActiveTab] = useState('matched'); // 'matched' | 'unmatched'
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [designFilter, setDesignFilter] = useState('');
  const [counterFilter, setCounterFilter] = useState('');
  const [purityFilter, setPurityFilter] = useState('');
  const [cardPage, setCardPage] = useState(1);
  const [previewItem, setPreviewItem] = useState(null);
  const CARDS_PER_PAGE = 6;

  const designOf = (item) =>
    String(
      item?.DesignName ?? item?.DesignNo ?? item?.Design ?? item?.DesignCode ?? item?.designName ?? ''
    ).trim();

  const counterOf = (item) =>
    String(
      item?.CounterName ?? item?.Counter ?? item?.counterName ?? item?.counter ?? ''
    ).trim();

  const purityOf = (item) =>
    String(
      item?.PurityName ?? item?.Purity ?? item?.purityName ?? item?.purity ?? ''
    ).trim();

  const piecesOf = (item) => {
    const v = item?.Pieces ?? item?.Quantity ?? item?.Qty ?? item?.PieceCount ?? 0;
    const n = parseFloat(v);
    return Number.isNaN(n) ? 0 : n;
  };

  const matchedCount = sessionDetails?.MatchedList?.length || 0;
  const unmatchedCount = sessionDetails?.UnmatchedList?.length || 0;

  // Summary derived from the actual batch records returned by the API
  // (MatchedList / UnmatchedList) so the counts always match what's listed
  // below — not the server-wide Totals which can differ.
  const summaryStats = useMemo(() => {
    const matched = sessionDetails?.MatchedList || [];
    const unmatched = sessionDetails?.UnmatchedList || [];
    const all = [...matched, ...unmatched];
    const num = (v) => {
      const n = parseFloat(v);
      return Number.isNaN(n) ? 0 : n;
    };
    const round = (n) => (Number.isInteger(n) ? n : Number(n.toFixed(2)));
    const sumKey = (list, key) => list.reduce((acc, i) => acc + num(i[key]), 0);
    return {
      total: all.length,
      matched: matched.length,
      unmatched: unmatched.length,
      pieces: round(all.reduce((acc, i) => acc + piecesOf(i), 0)),
      grossWt: round(sumKey(all, 'GrossWeight')),
      netWt: round(sumKey(all, 'NetWeight')),
      matchWt: round(sumKey(matched, 'GrossWeight')),
    };
  }, [sessionDetails]);

  const activeListRaw = useMemo(() => {
    if (!sessionDetails) return [];
    return activeTab === 'matched'
      ? sessionDetails.MatchedList || []
      : sessionDetails.UnmatchedList || [];
  }, [sessionDetails, activeTab]);

  // Distinct dropdown options derived from the active list
  const distinct = (list, getValue) => {
    const seen = new Set();
    const out = [];
    list.forEach((item) => {
      const value = String(getValue(item) || '').trim();
      if (!value || seen.has(value.toLowerCase())) return;
      seen.add(value.toLowerCase());
      out.push(value);
    });
    return out.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  };

  const categoryOptions = useMemo(() => distinct(activeListRaw, (i) => i.CategoryName), [activeListRaw]);
  const productOptions = useMemo(() => distinct(activeListRaw, (i) => i.ProductName), [activeListRaw]);
  const designOptions = useMemo(() => distinct(activeListRaw, designOf), [activeListRaw]);
  const counterOptions = useMemo(() => distinct(activeListRaw, counterOf), [activeListRaw]);
  const purityOptions = useMemo(() => distinct(activeListRaw, purityOf), [activeListRaw]);

  // Filtered + design-sorted cards for the active tab
  const filteredCards = useMemo(() => {
    let list = activeListRaw;
    if (categoryFilter) list = list.filter((i) => String(i.CategoryName || '').trim() === categoryFilter);
    if (productFilter) list = list.filter((i) => String(i.ProductName || '').trim() === productFilter);
    if (designFilter) list = list.filter((i) => designOf(i) === designFilter);
    if (counterFilter) list = list.filter((i) => counterOf(i) === counterFilter);
    if (purityFilter) list = list.filter((i) => purityOf(i) === purityFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((i) =>
        (i.ItemCode && String(i.ItemCode).toLowerCase().includes(q)) ||
        (i.ProductName && String(i.ProductName).toLowerCase().includes(q)) ||
        (i.CategoryName && String(i.CategoryName).toLowerCase().includes(q)) ||
        (i.RFIDCode && String(i.RFIDCode).toLowerCase().includes(q)) ||
        (designOf(i) && designOf(i).toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) =>
      designOf(a).localeCompare(designOf(b), undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [activeListRaw, categoryFilter, productFilter, designFilter, counterFilter, purityFilter, searchQuery]);

  const cardTotalPages = Math.max(1, Math.ceil(filteredCards.length / CARDS_PER_PAGE));
  const currentCards = useMemo(() => {
    const start = (cardPage - 1) * CARDS_PER_PAGE;
    return filteredCards.slice(start, start + CARDS_PER_PAGE);
  }, [filteredCards, cardPage]);

  // Image lookup keys — design-wise first, then item code / RFID fallback
  const imageLookupKeys = (item) => {
    const candidates = [
      item?.DesignName, item?.designName, item?.Design, item?.DesignNo,
      item?.DesignCode, item?.DesignId, item?.design_id,
      item?.ItemCode, item?.Itemcode, item?.RFIDCode, item?.rfidCode,
    ];
    const seen = new Set();
    const keys = [];
    candidates.forEach((value) => {
      const trimmed = String(value || '').trim();
      if (!trimmed) return;
      const norm = trimmed.toLowerCase();
      if (seen.has(norm)) return;
      seen.add(norm);
      keys.push(trimmed);
    });
    return keys;
  };

  // Reset to first page when tab / filters / search change
  useEffect(() => {
    setCardPage(1);
  }, [activeTab, searchQuery, categoryFilter, productFilter, designFilter, counterFilter, purityFilter]);

  // Close the image preview with the Escape key
  useEffect(() => {
    if (!previewItem) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setPreviewItem(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewItem]);

  // Clear filters when switching tab so stale selections don't hide everything
  useEffect(() => {
    setCategoryFilter('');
    setProductFilter('');
    setDesignFilter('');
    setCounterFilter('');
    setPurityFilter('');
    setSearchQuery('');
  }, [activeTab]);

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
          clientCode,
          scanBatchId,
          pageNumber: 1,
          pageSize: 1000000,
          returnAllData: true,
          status: null,
          counterName: null,
          categoryName: null,
          productName: null,
          designName: null,
          purityName: null,
          companyName: null,
          branchName: null,
          fromDate: null,
          toDate: null
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Session Details Response:', response.data);
      setSessionDetails({
        ...response.data,
        MatchedList: response.data.MatchedList ?? response.data.matchedList ?? [],
        UnmatchedList: response.data.UnmatchedList ?? response.data.unmatchedList ?? [],
        Totals: response.data.Totals ?? response.data.totals ?? {}
      });
      
    } catch (err) {
      console.error('Error fetching session details:', err);
      setError(err.message || 'Failed to load session details');
      toast.error('Failed to load session details');
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
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
          'Item Code', 'Product Name', 'Branch Name', 'Category', 'RFIDCode', 'Gross Weight (g)', 'Net Weight (g)', 'Pieces', 'Status'
        ];
        const matchedData = sessionDetails.MatchedList.map(item => [
          item.ItemCode || 'N/A',
          item.ProductName || 'N/A',
          item.BranchName?.trim() || sessionDetails.BranchName?.trim() || 'N/A',
          item.CategoryName || 'N/A',
          item.RFIDCode || 'RFID Tag not Attached',
          item.GrossWeight || 0,
          item.NetWeight || 0,
          item.Quantity || 0,
          'MATCHED'
        ]);
        const matchedWS = XLSX.utils.aoa_to_sheet([matchedHeaders, ...matchedData]);
        matchedWS['!cols'] = [
          { width: 15 }, { width: 25 }, { width: 18 }, { width: 15 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 10 }, { width: 12 }
        ];
        XLSX.utils.book_append_sheet(wb, matchedWS, 'Matched Items');
      }

      // Unmatched Items Sheet
      if (sessionDetails.UnmatchedList && sessionDetails.UnmatchedList.length > 0) {
        const unmatchedHeaders = [
          'Item Code', 'Product Name', 'Branch Name', 'Category', 'RFIDCode', 'Gross Weight (g)', 'Net Weight (g)', 'Pieces', 'Status'
        ];
        const unmatchedData = sessionDetails.UnmatchedList.map(item => [
          item.ItemCode || 'N/A',
          item.ProductName || 'N/A',
          item.BranchName?.trim() || sessionDetails.BranchName?.trim() || 'N/A',
          item.CategoryName || 'N/A',
          item.RFIDCode || 'RFID Tag not Attached',
          item.GrossWeight || 0,
          item.NetWeight || 0,
          item.Quantity || 0,
          'UNMATCHED'
        ]);
        const unmatchedWS = XLSX.utils.aoa_to_sheet([unmatchedHeaders, ...unmatchedData]);
        unmatchedWS['!cols'] = [
          { width: 15 }, { width: 25 }, { width: 18 }, { width: 15 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 10 }, { width: 12 }
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
      padding: '16px',
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#ffffff',
      minHeight: '100vh'
    }}>
      {/* Header — compact, one line */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        padding: '7px 14px',
        borderRadius: '10px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <button
            onClick={() => navigate('/stock-verification')}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              flexShrink: 0,
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
            <FaArrowLeft style={{ color: '#475569', fontSize: '14px' }} />
          </button>
          <FaClipboardCheck style={{ color: '#3b82f6', fontSize: '18px', flexShrink: 0 }} />
          <h2 style={{
            margin: 0,
            fontSize: '17px',
            fontWeight: 700,
            color: '#1e293b',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            Stock Verification {sessionDetails.BranchName ? `- ${sessionDetails.BranchName.trim()}` : ''}
          </h2>
        </div>
        <button
          onClick={exportSessionDetails}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '8px',
            border: '1px solid #3b82f6',
            background: '#3b82f6',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
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

      {/* Summary strip — one line */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        marginBottom: '12px',
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
      }}>
        {[
          { label: 'Total', value: summaryStats.total, color: '#2563eb' },
          { label: 'Matched', value: summaryStats.matched, color: '#047857' },
          { label: 'Unmatched', value: summaryStats.unmatched, color: '#b91c1c' },
          { label: 'Pieces', value: summaryStats.pieces, color: '#7c3aed' },
          { label: 'Gross Wt', value: `${summaryStats.grossWt}g`, color: '#334155' },
          { label: 'Net Wt', value: `${summaryStats.netWt}g`, color: '#334155' },
          { label: 'Match Wt', value: `${summaryStats.matchWt}g`, color: '#334155' },
        ].map((stat, idx) => (
          <div key={stat.label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            paddingLeft: idx === 0 ? 0 : '14px',
            borderLeft: idx === 0 ? 'none' : '1px solid #e5e7eb',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{stat.label}</span>
            <span style={{ fontSize: '19px', fontWeight: 800, color: stat.color, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Tabs + Filters + Cards */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        overflow: 'hidden'
      }}>
        {/* Match / Unmatch tabs */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 14px', borderBottom: '1px solid #eef2f7', flexWrap: 'wrap' }}>
          {[
            { id: 'matched', label: 'Matched', count: matchedCount, color: '#10b981', dark: '#047857' },
            { id: 'unmatched', label: 'Unmatched', count: unmatchedCount, color: '#ef4444', dark: '#b91c1c' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: `1px solid ${active ? tab.color : '#e2e8f0'}`,
                  background: active ? tab.color : '#ffffff',
                  color: active ? '#ffffff' : '#475569',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                  boxShadow: active ? `0 2px 8px ${tab.color}33` : 'none',
                }}
              >
                {tab.id === 'matched' ? <FaCheckCircle /> : <FaTimesCircle />}
                {tab.label}
                <span style={{
                  padding: '1px 8px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  background: active ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: active ? '#ffffff' : tab.dark,
                }}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* Filters: category / product / design + search */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '12px 14px',
          borderBottom: '1px solid #eef2f7',
          background: '#fafcff',
        }}>
          {[
            { value: categoryFilter, set: setCategoryFilter, options: categoryOptions, label: 'All Categories' },
            { value: productFilter, set: setProductFilter, options: productOptions, label: 'All Products' },
            { value: designFilter, set: setDesignFilter, options: designOptions, label: 'All Designs' },
            { value: counterFilter, set: setCounterFilter, options: counterOptions, label: 'All Counters' },
            { value: purityFilter, set: setPurityFilter, options: purityOptions, label: 'All Purities' },
          ].map((f, idx) => (
            <select
              key={idx}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              style={{
                flex: '1 1 160px',
                minWidth: '140px',
                padding: '9px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                outline: 'none',
                background: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <option value="">{f.label}</option>
              {f.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ))}
          <div style={{ position: 'relative', flex: '2 1 220px', minWidth: '180px' }}>
            <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '12px', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search item, product, design, RFID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                fontSize: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Top pagination bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '12px 14px',
        }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            {filteredCards.length} {activeTab} {filteredCards.length === 1 ? 'item' : 'items'}
            {filteredCards.length > 0 && (
              <> · {((cardPage - 1) * CARDS_PER_PAGE) + 1}–{Math.min(cardPage * CARDS_PER_PAGE, filteredCards.length)} of {filteredCards.length} · 6 cards/page</>
            )}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setCardPage((p) => Math.max(1, p - 1))}
              disabled={cardPage === 1}
              style={svCardPageBtn(cardPage === 1)}
            >
              <FaChevronLeft size={11} /> Previous
            </button>
            {Array.from({ length: Math.min(5, cardTotalPages) }, (_, i) => {
              let page;
              if (cardTotalPages <= 5) page = i + 1;
              else if (cardPage <= 3) page = i + 1;
              else if (cardPage >= cardTotalPages - 2) page = cardTotalPages - 4 + i;
              else page = cardPage - 2 + i;
              const active = cardPage === page;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCardPage(page)}
                  style={{
                    minWidth: '32px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: `1px solid ${active ? '#3b82f6' : '#e2e8f0'}`,
                    background: active ? '#3b82f6' : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {page}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCardPage((p) => Math.min(cardTotalPages, p + 1))}
              disabled={cardPage === cardTotalPages}
              style={svCardPageBtn(cardPage === cardTotalPages)}
            >
              Next <FaChevronRight size={11} />
            </button>
          </div>
        </div>

        {/* Card grid */}
        <div style={{ padding: '4px 14px 18px' }}>
          {currentCards.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>
              {activeTab === 'matched' ? 'No matched items found' : 'No unmatched items found'}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: windowWidth <= 640
                ? '1fr'
                : windowWidth <= 1024
                  ? 'repeat(2, minmax(0, 1fr))'
                  : 'repeat(3, minmax(0, 1fr))',
              gap: '16px',
            }}>
              {currentCards.map((item, index) => {
                const isMatched = activeTab === 'matched';
                const design = designOf(item) || '—';
                const itemCode = item.ItemCode || 'N/A';
                const rfid = item.RFIDCode || 'RFID not attached';
                return (
                  <article
                    key={item.Id || `${itemCode}-${index}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'box-shadow 0.18s, transform 0.18s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(59,130,246,0.14)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Image (design-wise) — click to enlarge */}
                    <div
                      onClick={() => setPreviewItem(item)}
                      title="Click to view image"
                      style={{ position: 'relative', width: '100%', background: '#f1f5f9', cursor: 'zoom-in' }}
                    >
                      <GridItemImage
                        lookupKeys={imageLookupKeys(item)}
                        itemCode={itemCode}
                        alt={design}
                        eagerLoad
                        wrapperStyle={{
                          width: '100%',
                          height: '300px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#f1f5f9',
                          overflow: 'hidden',
                        }}
                        imgStyle={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        color: '#ffffff',
                        background: isMatched ? '#10b981' : '#ef4444',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}>
                        {isMatched ? 'Matched' : 'Unmatched'}
                      </span>
                    </div>

                    {/* Card body — compact */}
                    <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }} title={design}>
                        {design}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 10px' }}>
                        <SDField label="Item" value={itemCode} valueColor="#2563eb" />
                        <SDField label="Category" value={item.CategoryName || 'N/A'} />
                        <SDField label="Product" value={item.ProductName || 'N/A'} />
                        <SDField label="Branch" value={item.BranchName || 'N/A'} />
                        <SDField label="RFID" value={rfid} />
                        <SDField label="Pieces" value={item.Quantity || 0} />
                        <SDField label="Gross Wt" value={`${item.GrossWeight || 0}g`} />
                        <SDField label="Net Wt" value={`${item.NetWeight || 0}g`} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Image preview popup */}
      {previewItem && (
        <div
          onClick={() => setPreviewItem(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(15, 23, 42, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.18s ease-in-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              background: '#ffffff',
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <button
              type="button"
              onClick={() => setPreviewItem(null)}
              title="Close"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 2,
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(15, 23, 42, 0.55)',
                color: '#ffffff',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FaTimesCircle />
            </button>
            <div style={{
              flex: 1,
              minHeight: 0,
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <GridItemImage
                lookupKeys={imageLookupKeys(previewItem)}
                itemCode={previewItem.ItemCode || ''}
                alt={designOf(previewItem) || 'Item image'}
                eagerLoad
                placeholder={(
                  <div style={{ padding: '60px', color: '#cbd5e1', fontSize: '14px', fontWeight: 700 }}>
                    No image available
                  </div>
                )}
                wrapperStyle={{
                  width: '100%',
                  maxWidth: '80vw',
                  maxHeight: '74vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                imgStyle={{
                  maxWidth: '80vw',
                  maxHeight: '74vh',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px 16px',
              background: '#ffffff',
            }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                {designOf(previewItem) || '—'}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                Item: <strong style={{ color: '#2563eb' }}>{previewItem.ItemCode || 'N/A'}</strong>
              </span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                RFID: <strong style={{ color: '#334155' }}>{previewItem.RFIDCode || 'N/A'}</strong>
              </span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                Category: <strong style={{ color: '#334155' }}>{previewItem.CategoryName || 'N/A'}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
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

