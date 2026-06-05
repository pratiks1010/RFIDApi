import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { FaCheckCircle, FaInbox, FaSpinner, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useLoading } from '../../App';
import { useNotifications } from '../../context/NotificationContext';
import {
  getAcceptLotUrl,
  getLotByIdUrl,
  getMyAssignedLotsUrl,
  sampleAuthHeaders,
} from '../../services/rfidSampleApi';
import { getClientCode } from '../../utils/authState';
import { normalizeList } from '../../services/rfidUserManagementApi';

const pick = (row, ...keys) => {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/** GetLotById returns `{ success, data: { Items, ActivityLog, ... } }`. */
const parseLotDetailResponse = (data) => {
  if (!data || typeof data !== 'object') {
    return { lot: null, items: [], activityLog: [] };
  }
  const lot =
    data.data ??
    data.Data ??
    data.lot ??
    data.Lot ??
    data.header ??
    data.Header ??
    data;
  const items = normalizeList(lot?.Items ?? lot?.items ?? data?.Items ?? data?.items ?? []);
  const activityLog = normalizeList(
    lot?.ActivityLog ?? lot?.activityLog ?? data?.ActivityLog ?? data?.activityLog ?? []
  );
  return { lot: lot && typeof lot === 'object' ? lot : null, items, activityLog };
};

const buildItemDetailRows = (item) => {
  if (!item || typeof item !== 'object') return [];
  const fields = [
    ['ItemCode', 'Item code'],
    ['RFIDCode', 'RFID code'],
    ['TIDNumber', 'TID number'],
    ['ItemStatus', 'Line status'],
    ['ProductName', 'Product'],
    ['CategoryName', 'Category'],
    ['DesignName', 'Design'],
    ['PurityName', 'Purity'],
    ['GrossWt', 'Gross wt'],
    ['NetWt', 'Net wt'],
    ['MRP', 'MRP'],
    ['Size', 'Size'],
    ['LabelledStockId', 'Stock id'],
    ['SampleOutOn', 'Sample out on'],
    ['SampleInOn', 'Sample in on'],
    ['ReturnRemark', 'Return remark'],
  ];
  const rows = [];
  const seen = new Set();
  fields.forEach(([key, label]) => {
    const v = item[key] ?? item[key.charAt(0).toLowerCase() + key.slice(1)];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      rows.push({ label, value: String(v) });
      seen.add(key);
    }
  });
  return rows;
};

const lotStatusStyle = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('pending')) return { bg: '#fef3c7', fg: '#b45309' };
  if (s.includes('open')) return { bg: '#ecfdf5', fg: '#047857' };
  return { bg: '#f1f5f9', fg: '#475569' };
};

const MyAssignedSamples = () => {
  const { setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const clientCode = getClientCode();
  const [lots, setLots] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PendingAcceptance');
  const [detailLot, setDetailLot] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [detailActivityLog, setDetailActivityLog] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acceptRemark, setAcceptRemark] = useState('OK');
  const [accepting, setAccepting] = useState(false);

  const loadLots = useCallback(async () => {
    if (!clientCode) {
      setLots([]);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    try {
      const { data } = await axios.get(getMyAssignedLotsUrl(clientCode, statusFilter), {
        headers: sampleAuthHeaders(),
      });
      if (data?.success === false) {
        throw new Error(data?.message || data?.Message || 'Failed to load assigned lots');
      }
      const rows = normalizeList(data?.lots ?? data?.Lots ?? data?.data ?? data);
      setLots(rows);
      const total = data?.totalRecords ?? data?.TotalRecords ?? rows.length;
      if (total > 0) {
        toast.success(
          statusFilter
            ? `${total} lot(s) waiting for you`
            : `${total} assigned lot(s) loaded`,
          { position: 'top-right', autoClose: 3000, theme: 'colored' }
        );
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        err?.message ||
        'Could not load assigned samples';
      toast.error(msg, { position: 'top-right', autoClose: 6000, theme: 'colored' });
      setLots([]);
    } finally {
      setListLoading(false);
    }
  }, [clientCode, statusFilter]);

  useEffect(() => {
    loadLots();
  }, [loadLots]);

  const closeDetail = () => {
    if (accepting) return;
    setDetailLot(null);
    setDetailItems([]);
    setDetailActivityLog([]);
    setSelectedItem(null);
  };

  const openDetail = async (lot) => {
    const lotId = pick(lot, 'LotId', 'lotId', 'Id', 'id');
    if (!lotId || !clientCode) return;
    setDetailLot(lot);
    setDetailItems([]);
    setDetailActivityLog([]);
    setSelectedItem(null);
    setDetailLoading(true);
    try {
      const { data } = await axios.get(getLotByIdUrl(clientCode, lotId), {
        headers: sampleAuthHeaders(),
      });
      if (data?.success === false) {
        throw new Error(data?.message || data?.Message || 'Could not load lot detail');
      }
      const { lot: body, items, activityLog } = parseLotDetailResponse(data);
      setDetailLot(body || lot);
      setDetailItems(items);
      setDetailActivityLog(activityLog);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Could not load lot detail');
      closeDetail();
    } finally {
      setDetailLoading(false);
    }
  };

  const acceptLot = async () => {
    const lotId = pick(detailLot, 'LotId', 'lotId', 'Id', 'id');
    if (!lotId || !clientCode) return;
    setAccepting(true);
    setLoading(true);
    try {
      const { data } = await axios.post(
        getAcceptLotUrl(),
        {
          ClientCode: clientCode,
          LotId: Number(lotId),
          AcceptedRemark: String(acceptRemark || '').trim() || 'OK',
        },
        { headers: sampleAuthHeaders() }
      );
      if (data?.success === false) {
        throw new Error(data?.message || data?.Message || 'Accept failed');
      }
      addNotification({
        type: 'success',
        title: 'Lot accepted',
        message: data?.message || data?.Message || 'You now have custody of this sample lot.',
      });
      closeDetail();
      setAcceptRemark('OK');
      await loadLots();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Accept failed',
        message: err?.response?.data?.message || err?.message || 'Could not accept lot',
      });
    } finally {
      setAccepting(false);
      setLoading(false);
    }
  };

  const lotNo = (lot) =>
    pick(lot, 'SampleLotNo', 'sampleLotNo', 'LotNumber', 'lotNumber', 'SampleOutNo') || '—';

  return (
    <div style={{ padding: '16px 20px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div
        style={{
          marginBottom: 20,
          padding: '20px 22px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #0f4c81 0%, #1e40af 100%)',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FaInbox size={22} />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>My assigned samples</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.9 }}>
              Lots assigned by admin — accept to take custody, then use Sample In to return items.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            fontSize: 13,
          }}
        >
          <option value="PendingAcceptance">Pending acceptance</option>
          <option value="Open">Open</option>
          <option value="">All</option>
        </select>
        <button
          type="button"
          onClick={loadLots}
          disabled={listLoading}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#fff',
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {listLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <FaSpinner style={{ animation: 'spin 0.9s linear infinite' }} /> Loading…
          </div>
        ) : lots.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', maxWidth: 420, margin: '0 auto' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#334155' }}>No lots found</p>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
              {statusFilter === 'PendingAcceptance'
                ? 'Nothing pending acceptance for your login. Try status “All”, or ask admin to assign Sample Out to this employee login (not only the name).'
                : 'No sample lots match this filter for your account.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px' }}>Lot no.</th>
                <th style={{ padding: '10px 14px' }}>Party</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px' }}>Out date</th>
                <th style={{ padding: '10px 14px' }}>Items</th>
                <th style={{ padding: '10px 14px' }} />
              </tr>
            </thead>
            <tbody>
              {lots.map((lot, idx) => {
                const id = pick(lot, 'LotId', 'lotId', 'Id', 'id') || idx;
                const status = pick(lot, 'LotStatus', 'lotStatus', 'Status', 'status');
                const canAccept = status === 'PendingAcceptance' || status === 'pendingAcceptance';
                return (
                  <tr key={id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{lotNo(lot)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {pick(lot, 'PartyName', 'partyName') || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: canAccept ? '#fef3c7' : '#ecfdf5',
                          color: canAccept ? '#b45309' : '#047857',
                        }}
                      >
                        {status || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {formatDate(pick(lot, 'SampleOutDate', 'sampleOutDate', 'OutDate'))}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {pick(lot, 'ItemCount', 'itemCount', 'TotalItems') || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        type="button"
                        onClick={() => openDetail(lot)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#0f4c81',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {canAccept ? 'Review & accept' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {detailLot && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 12000,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={closeDetail}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              maxWidth: 780,
              width: '100%',
              maxHeight: '92vh',
              overflow: 'auto',
              padding: '20px 22px 24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Sample lot details
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  {lotNo(detailLot)}
                </div>
                {!detailLoading && (
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 6,
                      ...(() => {
                        const st = lotStatusStyle(pick(detailLot, 'LotStatus', 'lotStatus', 'Status'));
                        return { background: st.bg, color: st.fg };
                      })(),
                    }}
                  >
                    {pick(detailLot, 'LotStatus', 'lotStatus', 'Status') || '—'}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={closeDetail}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
              >
                <FaTimes size={18} />
              </button>
            </div>

            {detailLoading ? (
              <p style={{ color: '#64748b', marginTop: 24, textAlign: 'center' }}>
                <FaSpinner style={{ animation: 'spin 0.9s linear infinite', marginRight: 8 }} />
                Loading lot details…
              </p>
            ) : (
              <>
                {pick(detailLot, 'IsOverdue', 'isOverdue') === true ||
                pick(detailLot, 'IsOverdue', 'isOverdue') === 'true' ? (
                  <div
                    style={{
                      marginTop: 14,
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    This lot is overdue — expected return was{' '}
                    {formatDate(pick(detailLot, 'ExpectedReturnDate', 'expectedReturnDate'))}.
                  </div>
                ) : null}

                <section style={{ marginTop: 16 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: '#334155' }}>
                    Lot summary
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: '8px 16px',
                      fontSize: 12,
                      color: '#475569',
                      padding: 14,
                      background: '#f8fafc',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {[
                      ['Party type', pick(detailLot, 'PartyType', 'partyType')],
                      ['Party / assignee', pick(detailLot, 'PartyName', 'partyName')],
                      ['Assigned to', pick(detailLot, 'AssignedToUserName', 'assignedToUserName')],
                      ['Sample out', formatDate(pick(detailLot, 'SampleOutDate', 'sampleOutDate'))],
                      ['Expected return', formatDate(pick(detailLot, 'ExpectedReturnDate', 'expectedReturnDate'))],
                      ['Actual return', formatDate(pick(detailLot, 'ActualReturnDate', 'actualReturnDate'))],
                      ['Accepted on', formatDate(pick(detailLot, 'AcceptedOn', 'acceptedOn'))],
                      ['Total items', pick(detailLot, 'TotalItems', 'totalItems')],
                      ['Pending items', pick(detailLot, 'PendingItems', 'pendingItems')],
                      ['Returned items', pick(detailLot, 'ReturnedItems', 'returnedItems')],
                      ['Admin remark', pick(detailLot, 'AdminRemark', 'adminRemark') || '—'],
                      ['Accepted remark', pick(detailLot, 'AcceptedRemark', 'acceptedRemark') || '—'],
                      ['Created', formatDate(pick(detailLot, 'CreatedOn', 'createdOn'))],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                          {label}
                        </div>
                        <div style={{ marginTop: 2, color: '#0f172a', fontWeight: 600 }}>{value || '—'}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section style={{ marginTop: 20 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: '#334155' }}>
                    Items ({detailItems.length})
                  </h3>
                  {detailItems.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>No line items in this lot.</p>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                            <th style={{ padding: '8px 10px' }}>Code</th>
                            <th style={{ padding: '8px 10px' }}>RFID</th>
                            <th style={{ padding: '8px 10px' }}>Product</th>
                            <th style={{ padding: '8px 10px' }}>Category</th>
                            <th style={{ padding: '8px 10px' }}>Design</th>
                            <th style={{ padding: '8px 10px' }}>Purity</th>
                            <th style={{ padding: '8px 10px' }}>Gross</th>
                            <th style={{ padding: '8px 10px' }}>Net</th>
                            <th style={{ padding: '8px 10px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailItems.map((line, i) => {
                            const code = pick(line, 'ItemCode', 'itemCode') || '—';
                            const lineId = pick(line, 'Id', 'id') || i;
                            return (
                              <tr
                                key={lineId}
                                style={{
                                  borderTop: '1px solid #f1f5f9',
                                  background: selectedItem === line ? '#eff6ff' : '#fff',
                                  cursor: 'pointer',
                                }}
                                onClick={() => setSelectedItem(selectedItem === line ? null : line)}
                              >
                                <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f4c81' }}>{code}</td>
                                <td style={{ padding: '8px 10px' }}>{pick(line, 'RFIDCode', 'rfidCode') || '—'}</td>
                                <td style={{ padding: '8px 10px' }}>{pick(line, 'ProductName', 'productName') || '—'}</td>
                                <td style={{ padding: '8px 10px' }}>{pick(line, 'CategoryName', 'categoryName') || '—'}</td>
                                <td style={{ padding: '8px 10px' }}>{pick(line, 'DesignName', 'designName') || '—'}</td>
                                <td style={{ padding: '8px 10px' }}>{pick(line, 'PurityName', 'purityName') || '—'}</td>
                                <td style={{ padding: '8px 10px' }}>{pick(line, 'GrossWt', 'grossWt') || '—'}</td>
                                <td style={{ padding: '8px 10px' }}>{pick(line, 'NetWt', 'netWt') || '—'}</td>
                                <td style={{ padding: '8px 10px' }}>{pick(line, 'ItemStatus', 'itemStatus') || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {selectedItem && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 14,
                        borderRadius: 10,
                        border: '1px solid #bfdbfe',
                        background: '#f8fafc',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                        Item {pick(selectedItem, 'ItemCode', 'itemCode')} — full details
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(120px, 34%) 1fr',
                          gap: '6px 12px',
                          fontSize: 12,
                        }}
                      >
                        {buildItemDetailRows(selectedItem).map((row) => (
                          <React.Fragment key={row.label}>
                            <div style={{ color: '#64748b', fontWeight: 600 }}>{row.label}</div>
                            <div style={{ color: '#0f172a', wordBreak: 'break-word' }}>{row.value}</div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {detailActivityLog.length > 0 && (
                  <section style={{ marginTop: 20 }}>
                    <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: '#334155' }}>
                      Activity log
                    </h3>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {detailActivityLog.map((log, i) => (
                        <li
                          key={i}
                          style={{
                            padding: '10px 12px',
                            marginBottom: 8,
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            background: '#fff',
                            fontSize: 12,
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {pick(log, 'ActionType', 'actionType') || 'Action'}
                          </div>
                          <div style={{ color: '#64748b', marginTop: 4 }}>
                            {pick(log, 'ActionRemark', 'actionRemark') || '—'}
                          </div>
                          <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                            {pick(log, 'OldStatus', 'oldStatus') || '—'} →{' '}
                            {pick(log, 'NewStatus', 'newStatus') || '—'} ·{' '}
                            {formatDate(pick(log, 'CreatedOn', 'createdOn'))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {(pick(detailLot, 'LotStatus', 'lotStatus', 'Status') === 'PendingAcceptance' ||
                  pick(detailLot, 'LotStatus', 'lotStatus', 'Status') === 'pendingAcceptance') && (
                  <div
                    style={{
                      marginTop: 20,
                      paddingTop: 16,
                      borderTop: '1px solid #e2e8f0',
                    }}
                  >
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155' }}>
                      Acceptance remark
                    </label>
                    <input
                      value={acceptRemark}
                      onChange={(e) => setAcceptRemark(e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: 6,
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      disabled={accepting}
                      onClick={acceptLot}
                      style={{
                        marginTop: 14,
                        width: '100%',
                        padding: '12px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#059669',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: accepting ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <FaCheckCircle />
                      {accepting ? 'Accepting…' : 'Accept lot (take custody)'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default MyAssignedSamples;
