import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  FaLock,
  FaSync,
  FaSpinner,
  FaCheckCircle,
  FaExclamationCircle,
  FaClipboardList,
  FaFileExport,
  FaFilePdf,
} from 'react-icons/fa';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toRrgoldApiUrl } from '../../../../services/apiBaseConfig';
import {
  postVarakrupaClientOrder,
  isVarakrupaSuccessResponse,
} from './varakrupaService';

const VRAKRUPA_ALLOWED_CLIENT = 'LS000563';
const TEAL = '#0d9488';
const TEAL_DARK = '#0f766e';
const GET_ALL_ORDERS_URL = toRrgoldApiUrl('/api/Order/GetAllOrders');
const PAGE_SIZE = 25;

const parseNumeric = (value) => {
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
};

const formatWeightTotal = (value) => {
  const n = parseNumeric(value);
  if (!n) return '-';
  return n.toFixed(3);
};

const formatQtyTotal = (value) => {
  const n = parseNumeric(value);
  if (!n) return '-';
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
};

const sumDetailField = (detailItems, field) =>
  detailItems.reduce((sum, item) => sum + parseNumeric(item[field]), 0);

const ORDER_COLUMNS = [
  { key: 'orderNo', label: 'Order No', width: 120 },
  { key: 'userId', label: 'User ID', width: 100 },
  { key: 'customerName', label: 'Customer Name', width: 180 },
  { key: 'ItemCode', label: 'Item Code', width: 160 },
  { key: 'RFIDCode', label: 'RFID Code', width: 150 },
  { key: 'GrossWt', label: 'Gross Wt', width: 110 },
  { key: 'NetWt', label: 'Net Wt', width: 110 },
  { key: 'Qty', label: 'Qty', width: 80 },
];

const pageShellStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  minHeight: 0,
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  padding: 0,
  background: 'transparent',
  overflow: 'hidden',
};

const cardStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  background: '#fff',
  borderRadius: 10,
  border: '1px solid #dfe7f1',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
};

const toolbarBtnStyle = {
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  height: 34,
  whiteSpace: 'nowrap',
};

const getClientCodeFromAuth = () => {
  try {
    const stored = localStorage.getItem('userInfo');
    if (!stored) return '';
    const parsed = JSON.parse(stored);
    return (parsed.ClientCode || parsed.clientCode || parsed.clientcode || '')
      .trim()
      .toUpperCase();
  } catch {
    return '';
  }
};

const normalizeOrdersResponse = (data) => {
  if (!data) return [];
  if (Array.isArray(data.Data)) return data.Data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.result)) return data.result;
  if (Array.isArray(data.Result)) return data.Result;
  return [];
};

const formatOrderDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1) return '-';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const parseFilterBoundaryDate = (value, endOfDay = false) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
};

const getRowSortableDate = (row) => {
  const raw = row?._dateRaw;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1) return null;
  return d;
};

const isRowWithinDateRange = (row, dateFrom, dateTo) => {
  const from = parseFilterBoundaryDate(dateFrom);
  const to = parseFilterBoundaryDate(dateTo, true);
  if (!from && !to) return true;

  const rowDate = getRowSortableDate(row);
  if (!rowDate) return false;
  if (from && rowDate < from) return false;
  if (to && rowDate > to) return false;
  return true;
};

/** Map GetAllOrders row → table display. Customer.LastName = Varakrupa user_id. */
const mapOrderToDisplay = (order, index) => {
  const items = Array.isArray(order?.CustomOrderItem) ? order.CustomOrderItem : [];

  const detailItems = items.map((d, i) => ({
    itemCode: String(d?.ItemCode ?? d?.itemCode ?? '').trim(),
    rfid: String(
      d?.RFIDCode ?? d?.RFIDNumber ?? d?.TIDNumber ?? d?.rfid ?? ''
    ).trim(),
    grossWt: String(d?.GrossWt ?? d?.TotalWt ?? '').trim(),
    netWt: String(d?.NetWt ?? '').trim(),
    qty: String(d?.Quantity ?? d?.Pieces ?? d?.Qty ?? '1').trim(),
    key: `detail-${order?.Id ?? index}-${i}`,
  }));

  const itemCodes = detailItems.map((d) => d.itemCode).filter(Boolean);
  const rfids = detailItems.map((d) => d.rfid).filter(Boolean);
  const totalGrossWt = sumDetailField(detailItems, 'grossWt');
  const totalNetWt = sumDetailField(detailItems, 'netWt');
  const totalQty = sumDetailField(detailItems, 'qty');

  const customer = order?.Customer || {};
  const customerName = String(
    customer.FirstName || order?.CustomerName || ''
  ).trim();
  const userId = String(customer.LastName ?? '').trim();

  return {
    ...order,
    orderNo: String(order?.OrderNo ?? order?.OrderId ?? '').trim(),
    userId: userId || '-',
    customerName: customerName || '-',
    ItemCode: itemCodes.length ? itemCodes.join(', ') : '',
    RFIDCode: rfids.length ? rfids.join(', ') : '',
    GrossWt: formatWeightTotal(totalGrossWt),
    NetWt: formatWeightTotal(totalNetWt),
    Qty: formatQtyTotal(totalQty),
    _totalGrossWt: totalGrossWt,
    _totalNetWt: totalNetWt,
    _totalQty: totalQty,
    Date: formatOrderDate(order?.OrderDate || order?.CreatedDate),
    _dateRaw: order?.OrderDate || order?.CreatedDate || null,
    _detailItems: detailItems,
    _rfids: rfids,
    _userId: userId,
    _customerName: customerName,
    _rowKey: `order-${order?.Id ?? index}-${order?.OrderNo ?? ''}`,
  };
};

const thStyle = {
  padding: '9px 8px',
  textAlign: 'left',
  fontWeight: 700,
  color: '#475569',
  borderBottom: '1px solid #dfe7f1',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '7px 8px',
  color: '#0f172a',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const VarakrupaSyncOrder = () => {
  const [clientCode, setClientCode] = useState('');
  const [allowed, setAllowed] = useState(false);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [syncResult, setSyncResult] = useState(null);
  const [syncingKey, setSyncingKey] = useState('');
  const [listPopup, setListPopup] = useState(null);
  const isFetchingRef = useRef(false);
  const skipSearchDebounceRef = useRef(true);

  useEffect(() => {
    const code = getClientCodeFromAuth();
    setClientCode(code);
    setAllowed(code === VRAKRUPA_ALLOWED_CLIENT);
  }, []);

  const mapOrdersFromResponse = useCallback((data) => {
    return normalizeOrdersResponse(data)
      .map((row, index) => mapOrderToDisplay(row, index))
      .sort((a, b) => {
        const dateA = new Date(a._dateRaw || 0).getTime();
        const dateB = new Date(b._dateRaw || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return String(b.orderNo).localeCompare(String(a.orderNo), undefined, {
          numeric: true,
        });
      });
  }, []);

  const fetchOrders = useCallback(
    async (pageNum = 1, search = '') => {
      if (!clientCode || isFetchingRef.current) return;
      isFetchingRef.current = true;
      setOrdersLoading(true);
      setOrdersError('');
      setSyncResult(null);

      try {
        const res = await axios.post(
          GET_ALL_ORDERS_URL,
          {
            ClientCode: clientCode,
            PageNumber: pageNum,
            PageSize: PAGE_SIZE,
            SearchQuery: search && search.trim() !== '' ? search.trim() : '',
          },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const rows = mapOrdersFromResponse(res?.data);
        const apiTotalRecords =
          res?.data?.TotalRecords ??
          res?.data?.totalRecords ??
          rows.length;
        const calculatedPages = Math.max(
          1,
          Math.ceil(Number(apiTotalRecords || 0) / PAGE_SIZE) || 1
        );

        setOrders(rows);
        setPage(pageNum);
        setTotalRecords(Number(apiTotalRecords) || rows.length);
        setTotalPages(calculatedPages);
      } catch (err) {
        setOrders([]);
        setTotalRecords(0);
        setTotalPages(1);
        setOrdersError(
          err?.response?.data?.message ||
            err?.response?.data?.Message ||
            err?.message ||
            'Failed to load orders.'
        );
      } finally {
        setOrdersLoading(false);
        isFetchingRef.current = false;
      }
    },
    [clientCode, mapOrdersFromResponse]
  );

  useEffect(() => {
    if (!allowed || !clientCode) return;
    fetchOrders(1, '');
  }, [allowed, clientCode, fetchOrders]);

  useEffect(() => {
    if (!allowed || !clientCode) return;
    if (skipSearchDebounceRef.current) {
      skipSearchDebounceRef.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchOrders(1, searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, allowed, clientCode, fetchOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((row) => isRowWithinDateRange(row, dateFrom, dateTo));
  }, [orders, dateFrom, dateTo]);

  const pageTotals = useMemo(
    () =>
      filteredOrders.reduce(
        (acc, row) => {
          acc.grossWt += row._totalGrossWt || 0;
          acc.netWt += row._totalNetWt || 0;
          acc.qty += row._totalQty || 0;
          return acc;
        },
        { grossWt: 0, netWt: 0, qty: 0 }
      ),
    [filteredOrders]
  );

  const handleClearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  const handleRefresh = () => {
    isFetchingRef.current = false;
    fetchOrders(page, searchQuery);
  };

  const handlePreviousPage = () => {
    if (page <= 1 || ordersLoading) return;
    fetchOrders(page - 1, searchQuery);
  };

  const handleNextPage = () => {
    if (page >= totalPages || ordersLoading) return;
    fetchOrders(page + 1, searchQuery);
  };

  const fetchOrdersForExport = async () => {
    const exportPageSize = Math.max(totalRecords || PAGE_SIZE, PAGE_SIZE);
    const res = await axios.post(
      GET_ALL_ORDERS_URL,
      {
        ClientCode: clientCode,
        PageNumber: 1,
        PageSize: exportPageSize,
        SearchQuery: searchQuery && searchQuery.trim() !== '' ? searchQuery.trim() : '',
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    return mapOrdersFromResponse(res?.data).filter((row) =>
      isRowWithinDateRange(row, dateFrom, dateTo)
    );
  };

  const buildExportRows = (rows) =>
    rows.map((row, index) => ({
      'S.No': index + 1,
      'Order No': row.orderNo ?? '',
      'User ID': row.userId ?? '',
      'Customer Name': row.customerName ?? '',
      'Item Code': row.ItemCode ?? '',
      'RFID Code': row.RFIDCode ?? '',
      'Gross Wt': row.GrossWt ?? '',
      'Net Wt': row.NetWt ?? '',
      Qty: row.Qty ?? '',
      Date: row.Date ?? '',
    }));

  const handleExportToExcel = async () => {
    if (ordersLoading) return;

    try {
      const exportRows = await fetchOrdersForExport();
      if (exportRows.length === 0) {
        setSyncResult({
          success: false,
          message: 'No data to export for the current filters.',
        });
        return;
      }

      const exportData = buildExportRows(exportRows);
      const fileName = `SyncOrders_${new Date().toISOString().split('T')[0]}`;
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      setSyncResult({
        success: true,
        message: `Exported ${exportRows.length} row(s) to ${fileName}.xlsx.`,
      });
    } catch (err) {
      setSyncResult({
        success: false,
        message: err?.message || 'Failed to export Excel file.',
      });
    }
  };

  const handleExportToPDF = async () => {
    if (ordersLoading) return;

    try {
      const exportRows = await fetchOrdersForExport();
      if (exportRows.length === 0) {
        setSyncResult({
          success: false,
          message: 'No data to export for the current filters.',
        });
        return;
      }

      const exportData = buildExportRows(exportRows);
      const headers = Object.keys(exportData[0] || {});
      const tableData = exportData.map((row) =>
        headers.map((key) => String(row[key] ?? ''))
      );
      const fileName = `SyncOrders_${new Date().toISOString().split('T')[0]}`;

      const doc = new jsPDF('landscape');
      doc.setFontSize(14);
      doc.text('Sync Order', 14, 16);
      doc.setFontSize(10);
      doc.text(`Exported: ${new Date().toLocaleString('en-GB')}`, 14, 23);
      doc.text(`Total rows: ${exportData.length}`, 14, 29);
      if (dateFrom || dateTo) {
        doc.text(`Date range: ${dateFrom || '...'} to ${dateTo || '...'}`, 14, 35);
      }

      doc.autoTable({
        head: [headers],
        body: tableData,
        startY: dateFrom || dateTo ? 40 : 34,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: {
          fillColor: [13, 148, 136],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 8, right: 8 },
      });

      doc.save(`${fileName}.pdf`);
      setSyncResult({
        success: true,
        message: `Exported ${exportRows.length} row(s) to ${fileName}.pdf.`,
      });
    } catch (err) {
      setSyncResult({
        success: false,
        message: err?.message || 'Failed to export PDF file.',
      });
    }
  };

  const openListPopup = (title, detailItems) => {
    setListPopup({
      title,
      items: Array.isArray(detailItems) ? detailItems : [],
    });
  };

  const handleSyncRow = async (row) => {
    setSyncResult(null);

    const rfids = (row._rfids || []).filter(Boolean);
    const orderId = String(row.orderNo || '').trim();
    const userId = String(row._userId || row.userId || '')
      .trim()
      .replace(/^-$/, '');
    const rfidValue = rfids.join(',');

    if (!rfids.length) {
      setSyncResult({
        success: false,
        message: `Order ${orderId || row.Id}: no RFID values to sync.`,
      });
      return;
    }
    if (!orderId) {
      setSyncResult({
        success: false,
        message: 'Order No is missing for this row.',
      });
      return;
    }
    if (!userId) {
      setSyncResult({
        success: false,
        message: 'User ID is missing for this row.',
      });
      return;
    }

    setSyncingKey(row._rowKey);
    try {
      const data = await postVarakrupaClientOrder({
        rfidValue,
        orderId,
        userId,
      });

      const ok = isVarakrupaSuccessResponse(data) || String(data?.ack) === '1';
      setSyncResult({
        success: ok,
        message:
          data?.msg ||
          (ok
            ? `Synced order ${orderId} (${rfids.length} RFID) for user ${userId}.`
            : `ClientOrder sync failed for order ${orderId}.`),
      });
    } catch (err) {
      setSyncResult({
        success: false,
        message:
          err?.response?.data?.msg ||
          err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          'Sync failed.',
      });
    } finally {
      setSyncingKey('');
    }
  };

  if (!allowed) {
    return (
      <div style={{ ...pageShellStyle, alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #dfe7f1',
            padding: 32,
            textAlign: 'center',
            maxWidth: 480,
            width: '100%',
          }}
        >
          <FaLock size={32} color="#94a3b8" style={{ marginBottom: 12 }} />
          <h2 style={{ margin: '0 0 8px', color: '#1e293b' }}>Access restricted</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Sync Order is available only for authorized clients ({VRAKRUPA_ALLOWED_CLIENT}).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageShellStyle}>
      <style>{`
        @keyframes syncOrderSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sync-order-row:hover {
          background: #f8fafc;
        }
        .sync-order-table-wrap {
          flex: 1;
          min-height: 0;
          overflow: auto;
          width: 100%;
        }
        .sync-order-table-wrap table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          table-layout: fixed;
        }
      `}</style>

      <section style={cardStyle}>
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #dfe7f1',
            background: 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: TEAL,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.28)',
              }}
            >
              <FaClipboardList size={17} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Sync Order
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: '#64748b',
                  margin: '2px 0 0 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Varakrupa order sync · {VRAKRUPA_ALLOWED_CLIENT}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={ordersLoading}
              style={{
                ...toolbarBtnStyle,
                color: '#fff',
                background: ordersLoading ? '#94a3b8' : TEAL,
                cursor: ordersLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {ordersLoading ? (
                <FaSpinner size={14} style={{ animation: 'syncOrderSpin 1s linear infinite' }} />
              ) : (
                <FaSync size={14} />
              )}
              Refresh
            </button>

            <button
              type="button"
              onClick={handleExportToExcel}
              disabled={ordersLoading || totalRecords === 0}
              style={{
                ...toolbarBtnStyle,
                color: '#fff',
                background: ordersLoading || totalRecords === 0 ? '#94a3b8' : '#059669',
                cursor: ordersLoading || totalRecords === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <FaFileExport size={14} />
              Excel
            </button>

            <button
              type="button"
              onClick={handleExportToPDF}
              disabled={ordersLoading || totalRecords === 0}
              style={{
                ...toolbarBtnStyle,
                color: '#fff',
                background: ordersLoading || totalRecords === 0 ? '#94a3b8' : '#dc2626',
                cursor: ordersLoading || totalRecords === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <FaFilePdf size={14} />
              PDF
            </button>
          </div>
        </div>

        {syncResult && (
          <div
            style={{
              padding: '10px 14px',
              margin: '8px 12px 0',
              background: syncResult.success ? '#f0fdf4' : '#fef2f2',
              borderRadius: 8,
              border: `1px solid ${syncResult.success ? '#86efac' : '#fca5a5'}`,
              fontSize: 13,
              color: syncResult.success ? '#166534' : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
            }}
          >
            {syncResult.success ? <FaCheckCircle /> : <FaExclamationCircle />}
            {syncResult.message}
          </div>
        )}

        {ordersError && (
          <div
            style={{
              padding: '10px 14px',
              margin: '8px 12px 0',
              background: '#fef2f2',
              borderRadius: 8,
              fontSize: 13,
              color: '#dc2626',
              flexShrink: 0,
            }}
          >
            {ordersError}
          </div>
        )}

        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid #dfe7f1',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            flexShrink: 0,
            background: '#fff',
          }}
        >
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            style={{
              padding: '8px 12px',
              fontSize: 13,
              border: '1px solid #dfe7f1',
              borderRadius: 6,
              flex: '1 1 220px',
              minWidth: 180,
              maxWidth: 320,
              height: 34,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
            From
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                setDateFrom(e.target.value);
              }}
              style={{
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #dfe7f1',
                borderRadius: 6,
                height: 34,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
            To
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                setDateTo(e.target.value);
              }}
              style={{
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #dfe7f1',
                borderRadius: 6,
                height: 34,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </label>

          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={handleClearDateFilter}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: TEAL_DARK,
                background: '#ecfdf5',
                border: '1px solid #99f6e4',
                borderRadius: 6,
                cursor: 'pointer',
                height: 34,
                boxSizing: 'border-box',
              }}
            >
              Clear dates
            </button>
          )}

          <span
            style={{
              fontSize: 13,
              color: '#475569',
              marginLeft: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            Page {page} of {totalPages} · {filteredOrders.length} rows · {totalRecords} total
            {filteredOrders.length > 0
              ? ` · Gross ${formatWeightTotal(pageTotals.grossWt)} · Qty ${formatQtyTotal(pageTotals.qty)}`
              : ''}
            {dateFrom || dateTo
              ? ` · ${dateFrom || '...'} to ${dateTo || '...'}`
              : ''}
          </span>
        </div>

        <div className="sync-order-table-wrap">
          <table>
            <thead
              style={{
                position: 'sticky',
                top: 0,
                background: '#f1f5f9',
                zIndex: 2,
                boxShadow: '0 1px 0 #dfe7f1',
              }}
            >
              <tr>
                {ORDER_COLUMNS.map((col) => (
                  <th key={col.key} style={{ ...thStyle, width: col.width }}>
                    {col.label}
                  </th>
                ))}
                <th style={{ ...thStyle, width: 110 }}>Date</th>
                <th style={{ ...thStyle, width: 90 }}>Sync</th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                <tr>
                  <td
                    colSpan={ORDER_COLUMNS.length + 2}
                    style={{ padding: 24, textAlign: 'center', color: '#64748b' }}
                  >
                    <FaSpinner
                      style={{ animation: 'syncOrderSpin 1s linear infinite', marginRight: 8 }}
                    />
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={ORDER_COLUMNS.length + 2}
                    style={{ padding: 24, textAlign: 'center', color: '#64748b' }}
                  >
                    {orders.length === 0
                      ? 'No orders found.'
                      : 'No rows match the date filter on this page.'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((row) => {
                  const detailItems = row._detailItems || [];
                  const itemCount = detailItems.filter((d) => d.itemCode).length;
                  const rfidCount = detailItems.filter((d) => d.rfid).length;
                  const isSyncing = syncingKey === row._rowKey;

                  return (
                    <tr
                      key={row._rowKey}
                      className="sync-order-row"
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      {ORDER_COLUMNS.map((col) => {
                        const value = row[col.key];

                        if (col.key === 'ItemCode') {
                          const firstCode =
                            detailItems.find((d) => d.itemCode)?.itemCode || '';
                          return (
                            <td key={col.key} style={{ ...tdStyle, maxWidth: col.width }}>
                              {itemCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openListPopup('Order Item Details', detailItems)
                                  }
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: TEAL_DARK,
                                    fontWeight: 700,
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    padding: 0,
                                    textDecoration: 'underline',
                                  }}
                                >
                                  {firstCode}
                                </button>
                              ) : (
                                '-'
                              )}
                            </td>
                          );
                        }

                        if (col.key === 'RFIDCode') {
                          const firstRfid =
                            detailItems.find((d) => d.rfid)?.rfid || '';
                          return (
                            <td key={col.key} style={{ ...tdStyle, maxWidth: col.width }}>
                              {rfidCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openListPopup('Order Item Details', detailItems)
                                  }
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: TEAL_DARK,
                                    fontWeight: 700,
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    padding: 0,
                                    textDecoration: 'underline',
                                  }}
                                >
                                  {firstRfid}
                                </button>
                              ) : (
                                '-'
                              )}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={col.key}
                            style={{ ...tdStyle, maxWidth: col.width }}
                            title={value != null ? String(value) : ''}
                          >
                            {value != null && value !== '' ? String(value) : '-'}
                          </td>
                        );
                      })}
                      <td style={{ ...tdStyle, color: '#475569' }}>{row.Date || '-'}</td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => handleSyncRow(row)}
                          disabled={isSyncing || ordersLoading}
                          title="Sync this order"
                          style={{
                            padding: '5px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#fff',
                            background: isSyncing ? '#94a3b8' : '#6366f1',
                            border: 'none',
                            borderRadius: 5,
                            cursor: isSyncing || ordersLoading ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {isSyncing ? (
                            <FaSpinner
                              size={11}
                              style={{ animation: 'syncOrderSpin 1s linear infinite' }}
                            />
                          ) : (
                            <FaSync size={11} />
                          )}
                          Sync
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredOrders.length > 0 && (
              <tfoot
                style={{
                  position: 'sticky',
                  bottom: 0,
                  background: '#ecfdf5',
                  zIndex: 1,
                  boxShadow: '0 -1px 0 #dfe7f1',
                }}
              >
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      ...tdStyle,
                      fontWeight: 700,
                      color: TEAL_DARK,
                    }}
                  >
                    Page Total
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{formatWeightTotal(pageTotals.grossWt)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{formatWeightTotal(pageTotals.netWt)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{formatQtyTotal(pageTotals.qty)}</td>
                  <td colSpan={2} style={tdStyle} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {listPopup && (
          <div
            onClick={() => setListPopup(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 640,
                maxHeight: '75vh',
                background: '#fff',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
              }}
            >
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid #dfe7f1',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>
                  {listPopup.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setListPopup(null)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: 20,
                    cursor: 'pointer',
                    color: '#94a3b8',
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ overflow: 'auto', maxHeight: 'calc(75vh - 56px)' }}>
                {listPopup.items.length === 0 ? (
                  <div style={{ padding: 20, color: '#64748b' }}>No items.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={thStyle}>Item Code</th>
                        <th style={thStyle}>RFID Code</th>
                        <th style={thStyle}>Gross Wt</th>
                        <th style={thStyle}>Net Wt</th>
                        <th style={thStyle}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listPopup.items.map((item) => (
                        <tr key={item.key}>
                          <td style={tdStyle}>{item.itemCode || '-'}</td>
                          <td style={tdStyle}>{item.rfid || '-'}</td>
                          <td style={tdStyle}>{item.grossWt || '-'}</td>
                          <td style={tdStyle}>{item.netWt || '-'}</td>
                          <td style={tdStyle}>{item.qty || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {(totalRecords > 0 || page > 1) && (
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #dfe7f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              background: '#f8fafc',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Showing {(page - 1) * PAGE_SIZE + 1}-
              {Math.min(page * PAGE_SIZE, totalRecords)} of {totalRecords} · Page {page} of{' '}
              {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                disabled={page <= 1 || ordersLoading}
                onClick={handlePreviousPage}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid #dfe7f1',
                  background: '#fff',
                  color: TEAL_DARK,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: page <= 1 || ordersLoading ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 || ordersLoading ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || ordersLoading}
                onClick={handleNextPage}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid #dfe7f1',
                  background: '#fff',
                  color: TEAL_DARK,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: page >= totalPages || ordersLoading ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages || ordersLoading ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default VarakrupaSyncOrder;
