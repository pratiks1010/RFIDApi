import React, { useMemo, useState } from 'react';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaChartBar,
  FaSearch,
  FaSpinner,
  FaUserFriends,
} from 'react-icons/fa';
import {
  buildCustomerWiseReport,
  buildSkuWiseReport,
  collectReportBranches,
  filterOrdersForReport,
} from '../../utils/orderReportUtils';

const num = (v) => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};
const fmtWt = (v) => num(v).toFixed(3);
const fmtAmt = (v) => num(v).toFixed(2);

const todayIso = () => new Date().toISOString().split('T')[0];

const OrderListReport = ({ orders = [], loading = false, onClose }) => {
  const [reportType, setReportType] = useState('sku');
  const [branch, setBranch] = useState('All branches');
  const [search, setSearch] = useState('');
  const [reportDate, setReportDate] = useState(todayIso());
  const [deliveryDate, setDeliveryDate] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [page, setPage] = useState(1);

  const branches = useMemo(() => collectReportBranches(orders), [orders]);

  const filteredOrders = useMemo(
    () =>
      filterOrdersForReport(orders, {
        branch,
        search,
        fromDate: '',
        toDate: reportDate,
        deliveryDate,
      }),
    [orders, branch, search, reportDate, deliveryDate]
  );

  const skuRows = useMemo(() => buildSkuWiseReport(filteredOrders), [filteredOrders]);
  const customerRows = useMemo(() => buildCustomerWiseReport(filteredOrders), [filteredOrders]);

  const activeRows = reportType === 'sku' ? skuRows : customerRows;

  const skuTotals = useMemo(
    () =>
      skuRows.reduce(
        (acc, r) => ({
          qty: acc.qty + r.qty,
          grossWt: acc.grossWt + r.grossWt,
          stoneWt: acc.stoneWt + r.stoneWt,
          netWt: acc.netWt + r.netWt,
        }),
        { qty: 0, grossWt: 0, stoneWt: 0, netWt: 0 }
      ),
    [skuRows]
  );

  const customerTotals = useMemo(
    () =>
      customerRows.reduce(
        (acc, r) => ({
          totalOrder: acc.totalOrder + r.totalOrder,
          qty: acc.qty + r.qty,
          grossWt: acc.grossWt + r.grossWt,
          netWt: acc.netWt + r.netWt,
          stoneAmt: acc.stoneAmt + r.stoneAmt,
          diamondAmt: acc.diamondAmt + r.diamondAmt,
          totalAmt: acc.totalAmt + r.totalAmt,
        }),
        { totalOrder: 0, qty: 0, grossWt: 0, netWt: 0, stoneAmt: 0, diamondAmt: 0, totalAmt: 0 }
      ),
    [customerRows]
  );

  const totalPages = Math.max(1, Math.ceil(activeRows.length / rowsPerPage));
  const pageRows = activeRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const thStyle = {
    padding: '10px 12px',
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
    whiteSpace: 'nowrap',
  };

  const tdStyle = {
    padding: '10px 12px',
    fontSize: 12,
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '12px',
        boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)',
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          height: '3px',
          background: 'linear-gradient(90deg, #5b21b6 0%, #6d28d9 50%, #7c3aed 100%)',
        }}
      />
      <div style={{ padding: '12px 14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            paddingBottom: 12,
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #d4d4d8',
                background: '#fafafa',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 11,
                color: '#475569',
              }}
            >
              <FaArrowLeft />
              Back to Order list
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {reportType === 'sku' ? 'SKU Wise Order Summary' : 'Customer Wise Order Summary'}
              </h2>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#6d28d9',
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  borderRadius: 999,
                  padding: '2px 8px',
                }}
              >
                {activeRows.length}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 10,
            background: '#ffffff',
            border: '1px solid #e5e5e5',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'flex-end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Report type</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => { setReportType('sku'); setPage(1); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: reportType === 'sku' ? '1px solid #c4b5fd' : '1px solid #e2e8f0',
                  background: reportType === 'sku' ? '#f5f3ff' : '#fff',
                  color: reportType === 'sku' ? '#6d28d9' : '#475569',
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                <FaChartBar />
                SKU report
              </button>
              <button
                type="button"
                onClick={() => { setReportType('customer'); setPage(1); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: reportType === 'customer' ? '1px solid #c4b5fd' : '1px solid #e2e8f0',
                  background: reportType === 'customer' ? '#f5f3ff' : '#fff',
                  color: reportType === 'customer' ? '#6d28d9' : '#475569',
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                <FaUserFriends />
                Customer wise report
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Branch</label>
            <select
              value={branch}
              onChange={(e) => { setBranch(e.target.value); setPage(1); }}
              style={{ height: 34, minWidth: 160, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 10px', fontSize: 12 }}
            >
              {branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 220px', minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Search orders</label>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 11 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search orders..."
                style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 10px 0 28px', fontSize: 12, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Order date up to</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => { setReportDate(e.target.value); setPage(1); }}
              style={{ height: 34, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 10px', fontSize: 12 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Filter delivery</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FaCalendarAlt style={{ color: '#64748b', fontSize: 12 }} />
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                style={{ height: 34, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 10px', fontSize: 12 }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              <FaSpinner style={{ animation: 'orderListSpin 1s linear infinite', marginRight: 8 }} />
              Loading report data...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: reportType === 'sku' ? 900 : 980 }}>
                <thead>
                  <tr>
                    {reportType === 'sku' ? (
                      <>
                        <th style={thStyle}>SKU</th>
                        <th style={thStyle}>Reference Item Code</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>QTY</th>
                        <th style={thStyle}>Purity</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>GR WT</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>STN WT</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>NET WT</th>
                        <th style={thStyle}>Remark</th>
                      </>
                    ) : (
                      <>
                        <th style={thStyle}>Customer Name</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>Total Order</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>QTY</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Gross Wt</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Net Wt</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Stone Amt</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Dia Amt</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Total Amt</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={reportType === 'sku' ? 8 : 8} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: 32 }}>
                        No report data found
                      </td>
                    </tr>
                  ) : reportType === 'sku' ? (
                    pageRows.map((row) => (
                      <tr key={row.sku}>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{row.sku}</td>
                        <td style={tdStyle}>{row.referenceItemCode || '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{row.qty}</td>
                        <td style={tdStyle}>{row.purity}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtWt(row.grossWt)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtWt(row.stoneWt)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtWt(row.netWt)}</td>
                        <td style={{ ...tdStyle, maxWidth: 240, whiteSpace: 'normal' }}>{row.remark}</td>
                      </tr>
                    ))
                  ) : (
                    pageRows.map((row) => (
                      <tr key={row.customerId}>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{row.customerName}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', minWidth: 28, padding: '2px 8px', borderRadius: 999, background: '#f5f3ff', color: '#6d28d9', fontWeight: 800, fontSize: 11 }}>
                            {row.totalOrder}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{row.qty}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtWt(row.grossWt)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtWt(row.netWt)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtAmt(row.stoneAmt)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtAmt(row.diamondAmt)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmtAmt(row.totalAmt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {activeRows.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#f8fafc' }}>
                      {reportType === 'sku' ? (
                        <>
                          <td style={{ ...tdStyle, fontWeight: 800 }} colSpan={2}>Total</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{skuTotals.qty}</td>
                          <td style={tdStyle} />
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fmtWt(skuTotals.grossWt)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fmtWt(skuTotals.stoneWt)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fmtWt(skuTotals.netWt)}</td>
                          <td style={tdStyle} />
                        </>
                      ) : (
                        <>
                          <td style={{ ...tdStyle, fontWeight: 800 }}>Total</td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800 }}>{customerTotals.totalOrder}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{customerTotals.qty}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fmtWt(customerTotals.grossWt)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fmtWt(customerTotals.netWt)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fmtAmt(customerTotals.stoneAmt)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fmtAmt(customerTotals.diamondAmt)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fmtAmt(customerTotals.totalAmt)}</td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Rows per page</span>
          <select
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
            style={{ height: 30, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>Prev</button>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{page}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default OrderListReport;
