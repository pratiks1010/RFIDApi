import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaBox,
  FaBoxOpen,
  FaCheckCircle,
  FaExchangeAlt,
  FaEye,
  FaSearch,
  FaSpinner,
  FaSync,
  FaTag,
  FaTimes,
  FaTrashAlt,
} from 'react-icons/fa';
import { useNotifications } from '../../context/NotificationContext';
import {
  deleteBoxAndUnbox,
  getBoxList,
  transferBoxProducts,
  unboxAllProducts,
} from '../../services/boxRfidApi';
import { formatWeight3 } from '../../utils/weightFormat';

const getClientCode = () => {
  try {
    const u = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return u.ClientCode || u.clientCode || u.clientcode || '';
  } catch {
    return '';
  }
};

const getEmployeeCode = () => {
  try {
    const u = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return u.EmployeeCode || u.employeeCode || u.UserName || u.userName || '';
  } catch {
    return '';
  }
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
};

const actionBtnStyle = (variant = 'default') => {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '5px 8px',
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 6,
    border: '1px solid',
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
  };
  if (variant === 'view') return { ...base, background: '#f0fdfa', borderColor: '#99f6e4', color: '#0f766e' };
  if (variant === 'transfer') return { ...base, background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' };
  if (variant === 'unbox') return { ...base, background: '#fffbeb', borderColor: '#fcd34d', color: '#b45309' };
  if (variant === 'delete') return { ...base, background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' };
  return base;
};

const BoxListWall = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const clientCode = getClientCode();

  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  const [actionModal, setActionModal] = useState(null);
  const [actionStep, setActionStep] = useState('form');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [toBoxId, setToBoxId] = useState('');
  const [performedBy, setPerformedBy] = useState(getEmployeeCode());
  const [deleteSourceBox, setDeleteSourceBox] = useState(false);

  const isSmallScreen = windowWidth <= 768;

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchBoxes = useCallback(async () => {
    if (!clientCode) return;
    setLoading(true);
    try {
      const res = await getBoxList({
        ClientCode: clientCode,
        ...(showActiveOnly ? { Status: 'Active' } : {}),
      });
      setBoxes(Array.isArray(res?.boxes) ? res.boxes : []);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Box list',
        message: err?.response?.data?.message || err?.response?.data?.Message || err?.message || 'Could not load boxes.',
      });
      setBoxes([]);
    } finally {
      setLoading(false);
    }
  }, [clientCode, showActiveOnly, addNotification]);

  useEffect(() => {
    fetchBoxes();
  }, [fetchBoxes]);

  const filteredBoxes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return boxes;
    return boxes.filter((box) => {
      const haystack = [
        box.boxName,
        box.rfidCode,
        box.categoryName,
        box.productName,
        box.status,
        String(box.boxId ?? ''),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [boxes, searchQuery]);

  const gridCols = isSmallScreen ? 'repeat(1, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(260px, 1fr))';

  const openAction = (type, box) => {
    setActionModal({ type, box });
    setActionStep('form');
    setActionResult(null);
    setToBoxId('');
    setDeleteSourceBox(false);
    setPerformedBy(getEmployeeCode());
  };

  const closeAction = () => {
    if (actionLoading) return;
    setActionModal(null);
    setActionStep('form');
    setActionResult(null);
  };

  const destinationOptions = useMemo(() => {
    if (!actionModal?.box) return [];
    return boxes.filter((b) => String(b.boxId) !== String(actionModal.box.boxId));
  }, [boxes, actionModal]);

  const runAction = async () => {
    if (!clientCode || !actionModal?.box) return;
    const sourceId = Number(actionModal.box.boxId);
    if (!sourceId) return;

    setActionLoading(true);
    try {
      let result;
      const by = performedBy.trim();

      if (actionModal.type === 'transfer') {
        const destId = Number(toBoxId);
        if (!destId) {
          addNotification({ type: 'warning', title: 'Transfer', message: 'Select a destination box.' });
          return;
        }
        if (destId === sourceId) {
          addNotification({ type: 'warning', title: 'Transfer', message: 'Source and destination must be different.' });
          return;
        }
        result = await transferBoxProducts({
          ClientCode: clientCode,
          FromBoxId: sourceId,
          ToBoxId: destId,
          ...(by ? { TransferredBy: by } : {}),
          DeleteSourceBox: deleteSourceBox,
        });
      } else if (actionModal.type === 'unbox') {
        result = await unboxAllProducts({
          ClientCode: clientCode,
          BoxId: sourceId,
          ...(by ? { UnboxedBy: by } : {}),
        });
      } else if (actionModal.type === 'delete') {
        result = await deleteBoxAndUnbox({
          ClientCode: clientCode,
          BoxId: sourceId,
          ...(by ? { DeletedBy: by } : {}),
        });
      }

      setActionResult(result);
      setActionStep('result');

      if (result?.success === false) {
        addNotification({
          type: 'error',
          title: 'Box operation',
          message: result?.message || 'Operation failed.',
        });
      } else {
        addNotification({
          type: 'success',
          title: 'Box operation',
          message: result?.message || 'Operation completed.',
        });
        fetchBoxes();
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.Message || err?.message || 'Operation failed.';
      addNotification({ type: 'error', title: 'Box operation', message: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const modalTitle =
    actionModal?.type === 'transfer'
      ? 'Transfer all products'
      : actionModal?.type === 'unbox'
        ? 'Unbox all products'
        : actionModal?.type === 'delete'
          ? 'Delete box & unbox'
          : '';

  const modalHint =
    actionModal?.type === 'transfer'
      ? 'Moves every product from the source box to another box.'
      : actionModal?.type === 'unbox'
        ? 'Removes all products from the box but keeps the box in the system.'
        : actionModal?.type === 'delete'
          ? 'Unboxes every product and deletes the box. Use returned item codes to re-pack elsewhere.'
          : '';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 12,
        fontSize: 11,
        background: '#ffffff',
        fontFamily: 'var(--font-family)',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          marginBottom: 12,
          boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ height: 3, background: 'linear-gradient(90deg, #0f766e 0%, #14b8a6 50%, #0d9488 100%)' }} />
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
                onClick={() => navigate('/box-rfid')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#475569',
                  cursor: 'pointer',
                  height: 34,
                }}
              >
                <FaArrowLeft style={{ fontSize: 12 }} /> Back
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <FaBox style={{ fontSize: 16 }} />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Box List</h1>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>
                    {filteredBoxes.length} box{filteredBoxes.length !== 1 ? 'es' : ''} · Transfer, unbox, or delete
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchBoxes}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#0f172a',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <FaSync style={{ fontSize: 11 }} /> Refresh
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12 }}>
            <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 360 }}>
              <FaSearch
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: 11,
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Search box name, RFID, category…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0 8px 0 30px',
                  fontSize: 11,
                  border: '1px solid #e5e5e5',
                  borderRadius: 8,
                  height: 30,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: showActiveOnly ? '#059669' : '#f8fafc',
                borderRadius: 8,
                border: '1px solid',
                borderColor: showActiveOnly ? '#059669' : '#e2e8f0',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setShowActiveOnly((prev) => !prev)}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: showActiveOnly ? '#fff' : '#64748b' }}>
                {showActiveOnly ? 'Active only' : 'All boxes'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
          <FaSpinner style={{ animation: 'boxListSpin 0.9s linear infinite', fontSize: 24 }} />
          <div style={{ marginTop: 12 }}>Loading boxes…</div>
        </div>
      ) : filteredBoxes.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            color: '#64748b',
            border: '1px dashed #e2e8f0',
            borderRadius: 12,
            background: '#fafafa',
          }}
        >
          {searchQuery ? 'No boxes match your search.' : 'No boxes found.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 12 }}>
          {filteredBoxes.map((box) => {
            const boxId = box.boxId;
            const boxName = box.boxName || '—';
            const totalProducts = box.totalProducts ?? 0;
            const totalGrossWt = box.totalGrossWt;
            const totalNetWt = box.totalNetWt;
            const grandTotal = box.grandTotalWeight;
            const isRfidTagged = box.isRfidTagged;
            const lastPackedOn = box.lastPackedOn;
            const rfidCode = box.rfidCode;
            const categoryName = box.categoryName;
            const status = box.status;
            const hasProducts = Number(totalProducts) > 0;

            return (
              <div
                key={boxId}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  background: '#fff',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
                }}
              >
                <div style={{ height: 3, background: 'linear-gradient(90deg, #0f766e 0%, #14b8a6 100%)' }} />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/box-rfid/box-list/${boxId}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(`/box-rfid/box-list/${boxId}`);
                  }}
                  style={{ padding: 14, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {boxName}
                      </div>
                      {categoryName ? (
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{categoryName}</div>
                      ) : null}
                    </div>
                    {isRfidTagged ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 9,
                          fontWeight: 700,
                          color: '#047857',
                          background: '#ecfdf5',
                          border: '1px solid #6ee7b7',
                          borderRadius: 999,
                          padding: '2px 8px',
                          flexShrink: 0,
                        }}
                      >
                        <FaCheckCircle style={{ fontSize: 9 }} /> RFID
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: '#94a3b8',
                          background: '#f1f5f9',
                          borderRadius: 999,
                          padding: '2px 8px',
                          flexShrink: 0,
                        }}
                      >
                        No tag
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      marginTop: 12,
                      padding: '10px 0',
                      borderTop: '1px solid #f1f5f9',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                        Products
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0f766e' }}>{totalProducts}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                        Gross wt
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                        {totalGrossWt != null && totalGrossWt !== '' ? `${formatWeight3(totalGrossWt)}g` : '—'}
                      </div>
                      {totalNetWt != null && totalNetWt !== '' ? (
                        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                          Net {formatWeight3(totalNetWt)}g
                          {grandTotal != null && grandTotal !== '' ? ` · Total ${formatWeight3(grandTotal)}g` : ''}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 10, color: '#64748b' }}>
                    {rfidCode ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        <FaTag style={{ fontSize: 9, color: '#0f766e' }} />
                        <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>{rfidCode}</span>
                      </div>
                    ) : null}
                    <div>Last packed: {formatDateTime(lastPackedOn)}</div>
                    {status ? (
                      <div style={{ marginTop: 2 }}>
                        Status: <strong>{status}</strong>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    padding: '8px 10px',
                    borderTop: '1px solid #f1f5f9',
                    background: '#fafafa',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button type="button" style={actionBtnStyle('view')} onClick={() => navigate(`/box-rfid/box-list/${boxId}`)}>
                    <FaEye /> View
                  </button>
                  <button
                    type="button"
                    style={{ ...actionBtnStyle('transfer'), opacity: hasProducts ? 1 : 0.45 }}
                    disabled={!hasProducts}
                    title={hasProducts ? 'Transfer all products to another box' : 'Box is empty'}
                    onClick={() => openAction('transfer', box)}
                  >
                    <FaExchangeAlt /> Transfer
                  </button>
                  <button
                    type="button"
                    style={{ ...actionBtnStyle('unbox'), opacity: hasProducts ? 1 : 0.45 }}
                    disabled={!hasProducts}
                    title={hasProducts ? 'Unbox all products' : 'Box is empty'}
                    onClick={() => openAction('unbox', box)}
                  >
                    <FaBoxOpen /> Unbox
                  </button>
                  <button
                    type="button"
                    style={actionBtnStyle('delete')}
                    title="Delete box and unbox all products"
                    onClick={() => openAction('delete', box)}
                  >
                    <FaTrashAlt /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {actionModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={closeAction}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 520,
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
            }}
          >
            <div style={{ height: 3, background: 'linear-gradient(90deg, #0f766e 0%, #14b8a6 100%)' }} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{modalTitle}</h2>
              <button
                type="button"
                onClick={closeAction}
                disabled={actionLoading}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ padding: '14px 16px', overflowY: 'auto', flex: 1 }}>
              {actionStep === 'form' ? (
                <>
                  <p style={{ margin: '0 0 14px', fontSize: 11, color: '#64748b', lineHeight: 1.45 }}>{modalHint}</p>
                  <div
                    style={{
                      marginBottom: 14,
                      padding: '10px 12px',
                      background: '#f0fdfa',
                      border: '1px solid #99f6e4',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  >
                    <strong>{actionModal.box.boxName}</strong>
                    <span style={{ color: '#64748b' }}>
                      {' '}
                      · #{actionModal.box.boxId} · {actionModal.box.totalProducts ?? 0} product(s)
                    </span>
                  </div>

                  {actionModal.type === 'transfer' ? (
                    <>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                        Destination box
                      </label>
                      <select
                        value={toBoxId}
                        onChange={(e) => setToBoxId(e.target.value)}
                        style={{
                          width: '100%',
                          height: 36,
                          marginBottom: 12,
                          padding: '0 10px',
                          fontSize: 12,
                          border: '1px solid #e5e5e5',
                          borderRadius: 8,
                        }}
                      >
                        <option value="">Choose destination box…</option>
                        {destinationOptions.map((b) => (
                          <option key={b.boxId} value={b.boxId}>
                            {b.boxName} (#{b.boxId}) · {b.totalProducts ?? 0} items
                          </option>
                        ))}
                      </select>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 12,
                          fontSize: 11,
                          color: '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={deleteSourceBox}
                          onChange={(e) => setDeleteSourceBox(e.target.checked)}
                        />
                        Delete source box after transfer
                      </label>
                    </>
                  ) : null}

                  {actionModal.type === 'delete' ? (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: '10px 12px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: 8,
                        fontSize: 11,
                        color: '#991b1b',
                      }}
                    >
                      This will unbox all products and permanently delete this box. Products become free for re-packing.
                    </div>
                  ) : null}

                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    {actionModal.type === 'transfer'
                      ? 'Transferred by (optional)'
                      : actionModal.type === 'unbox'
                        ? 'Unboxed by (optional)'
                        : 'Deleted by (optional)'}
                  </label>
                  <input
                    type="text"
                    value={performedBy}
                    onChange={(e) => setPerformedBy(e.target.value)}
                    placeholder="e.g. admin or EMP01"
                    style={{
                      width: '100%',
                      height: 34,
                      padding: '0 10px',
                      fontSize: 12,
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      boxSizing: 'border-box',
                    }}
                  />
                </>
              ) : (
                (() => {
                  const r = actionResult || {};
                  const ok = r.success !== false;
                  return (
                    <>
                      <div
                        style={{
                          padding: '10px 12px',
                          marginBottom: 12,
                          borderRadius: 8,
                          background: ok ? '#ecfdf5' : '#fef2f2',
                          border: `1px solid ${ok ? '#6ee7b7' : '#fecaca'}`,
                          fontSize: 12,
                          fontWeight: 700,
                          color: ok ? '#047857' : '#b91c1c',
                        }}
                      >
                        {r.message || (ok ? 'Operation completed.' : 'Operation failed.')}
                      </div>

                      {r.sourceBox?.boxName ? (
                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>
                          Source: <strong>{r.sourceBox.boxName}</strong>
                          {r.sourceSummary?.totalProducts != null ? ` · ${r.sourceSummary.totalProducts} products` : ''}
                          {r.sourceBoxDeleted ? (
                            <span style={{ color: '#b91c1c', fontWeight: 700 }}> · Box deleted</span>
                          ) : null}
                        </div>
                      ) : null}

                      {r.destinationBox?.boxName ? (
                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>
                          Destination: <strong>{r.destinationBox.boxName}</strong>
                          {r.destinationSummary?.totalProducts != null
                            ? ` · ${r.destinationSummary.totalProducts} products`
                            : ''}
                          {r.destinationSummary?.totalGrossWt != null
                            ? ` · ${formatWeight3(r.destinationSummary.totalGrossWt)}g gross`
                            : ''}
                        </div>
                      ) : null}

                      {r.itemCodes?.length > 0 ? (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', marginBottom: 6 }}>
                            ITEM CODES ({r.itemCodes.length})
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {r.itemCodes.map((code) => (
                              <span
                                key={code}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  fontFamily: 'ui-monospace, monospace',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  background: '#fff7ed',
                                  border: '1px solid #fed7aa',
                                  color: '#9a3412',
                                }}
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                          <p style={{ margin: '8px 0 0', fontSize: 10, color: '#64748b' }}>
                            Use Box RFID Pack → Add to box with these item codes.
                          </p>
                        </div>
                      ) : null}
                    </>
                  );
                })()
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                padding: '12px 16px',
                borderTop: '1px solid #f1f5f9',
                background: '#fafafa',
              }}
            >
              {actionStep === 'form' ? (
                <>
                  <button
                    type="button"
                    onClick={closeAction}
                    disabled={actionLoading}
                    style={{
                      padding: '8px 14px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={runAction}
                    disabled={actionLoading || (actionModal.type === 'transfer' && !toBoxId)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: '1px solid #0f766e',
                      background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                      color: '#fff',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      opacity: actionLoading ? 0.6 : 1,
                    }}
                  >
                    {actionLoading ? <FaSpinner style={{ animation: 'boxListSpin 0.8s linear infinite' }} /> : null}
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeAction}
                  style={{
                    padding: '8px 16px',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 8,
                    border: '1px solid #0f766e',
                    background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes boxListSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BoxListWall;
