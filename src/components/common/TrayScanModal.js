import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FaBroadcastTower, FaPlay, FaPlug, FaSearch, FaStop } from 'react-icons/fa';

const TRAY_IDLE_TIMEOUT_WITH_TAGS_MS = 1000;
const TRAY_IDLE_TIMEOUT_WITHOUT_TAGS_MS = 1000;

const RFID_CODE_LOOKUP_URL = process.env.REACT_APP_RFID_EPC_LOOKUP_URL
  || 'https://soni.loyalstring.co.in/api/RFIDDashboard/GetRFIDCodesByEPCValues';

const getClientCode = () => {
  const direct = String(localStorage.getItem('ClientCode') || '').trim();
  if (direct) return direct;
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return String(userInfo?.ClientCode || userInfo?.clientCode || '').trim();
  } catch {
    return '';
  }
};

const extractRfidMapping = (raw) => {
  const normalizeRows = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.items)) return value.items;
    if (Array.isArray(value?.Items)) return value.Items;
    if (value && typeof value === 'object') {
      return Object.entries(value).map(([epc, rfid]) => ({ EPCValue: epc, RFIDCode: rfid }));
    }
    return [];
  };

  const rowSources = [
    raw?.items,
    raw?.Items,
    raw?.Data?.items,
    raw?.Data?.Items,
    raw?.data?.items,
    raw?.data?.Items,
    raw?.Result?.items,
    raw?.Result?.Items,
    raw?.result?.items,
    raw?.result?.Items,
    raw?.Data,
    raw?.data,
    raw?.Result,
    raw?.result,
    raw
  ];
  const rows = rowSources
    .map(normalizeRows)
    .find((sourceRows) => sourceRows.length > 0) || [];

  const map = {};
  rows.forEach((item) => {
    const epc = String(
      item?.EPCValue
      || item?.EpcValue
      || item?.epcValue
      || item?.EPC
      || item?.epc
      || item?.TIDNumber
      || item?.TidNumber
      || item?.tidNumber
      || item?.RequestedIdentifier
      || ''
    ).trim().toUpperCase();
    const rfid = String(
      item?.RFIDCode
      || item?.RfidCode
      || item?.rfidCode
      || item?.RFIDNumber
      || item?.RfidNumber
      || item?.rfidNumber
      || item?.RFID
      || item?.rfid
      || item?.Barcode
      || item?.BarCode
      || item?.barcode
      || item?.TagCode
      || ''
    ).trim();
    if (epc && rfid) {
      map[epc] = rfid;
    }
  });
  return map;
};

const TrayScanModal = ({ open, onClose, onFetchData, title = 'Tray Scan' }) => {
  const [comPrimary, setComPrimary] = useState('7');
  const [comSecondary, setComSecondary] = useState('8');
  const [baudRate, setBaudRate] = useState('115200');
  const [busy, setBusy] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [rfidCodeMap, setRfidCodeMap] = useState({});
  const [resolvingCodes, setResolvingCodes] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const hasBridge = typeof window !== 'undefined' && !!window.electronAPI?.rfidBridgeCommand;
  const pageSize = 16;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(tags.length / pageSize)), [tags.length]);
  const pageTags = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return tags.slice(start, start + pageSize);
  }, [tags, currentPage]);
  const pageRows = useMemo(() => (
    pageTags.map((epc, idx) => ({
      srNo: (currentPage - 1) * pageSize + idx + 1,
      epc,
      rfidCode: rfidCodeMap[epc] || '-'
    }))
  ), [pageTags, currentPage, rfidCodeMap]);

  useEffect(() => {
    if (!open || !hasBridge) return undefined;
    const unsubTag = window.electronAPI.onRfidBridgeTag((tag) => {
      const epc = String(tag?.epc || '').trim().toUpperCase();
      if (!epc) return;
      setTags((prev) => (prev.includes(epc) ? prev : [...prev, epc]));
    });
    const unsubLine = window.electronAPI.onRfidBridgeLine((line) => {
      const lower = String(line || '').toLowerCase();
      if (lower.includes('inventory started')) setIsScanning(true);
      if (lower.includes('inventory stopped')) setIsScanning(false);
    });
    return () => {
      unsubTag?.();
      unsubLine?.();
    };
  }, [open, hasBridge]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!open) return;
    setTags([]);
    setRfidCodeMap({});
    setResolveError('');
    setCurrentPage(1);
    setIsScanning(false);
    if (hasBridge) {
      window.electronAPI.rfidBridgeEnsure().catch(() => {});
    }
  }, [open, hasBridge]);

  const fetchRfidCodesByEpc = async (epcValues) => {
    const normalized = Array.from(new Set(
      (epcValues || []).map((item) => String(item || '').trim().toUpperCase()).filter(Boolean)
    ));
    if (!normalized.length) {
      setRfidCodeMap({});
      setResolveError('');
      return;
    }

    setResolvingCodes(true);
    setResolveError('');
    try {
      const response = await axios.post(
        RFID_CODE_LOOKUP_URL,
        {
          ClientCode: getClientCode() || undefined,
          EPCValues: normalized
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000
        }
      );
      const mapping = extractRfidMapping(response?.data);
      setRfidCodeMap(mapping);
    } catch (error) {
      setResolveError(
        error?.response?.data?.message
        || error?.response?.data?.error
        || error?.message
        || 'Failed to resolve RFID codes.'
      );
    } finally {
      setResolvingCodes(false);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      fetchRfidCodesByEpc(tags);
    }, 180);
    return () => clearTimeout(timer);
  }, [open, tags]);

  const run = async (command) => {
    if (!hasBridge) throw new Error('RFID tray bridge works only in Electron app.');
    await window.electronAPI.rfidBridgeCommand(command);
  };

  const runFetch = async () => {
    if (!onFetchData || tags.length === 0) return;
    setAutoLoading(true);
    try {
      const result = await onFetchData(tags);
      const shouldClose = result !== false;
      if (shouldClose) {
        await closeModal();
      }
    } finally {
      setAutoLoading(false);
    }
  };

  const connectAndStart = async () => {
    setBusy(true);
    try {
      await run('disconnect');
      await run(`connect-serial ${comPrimary} ${baudRate}`);
      await run(`connect-serial ${comSecondary} ${baudRate}`);
      await run('start');
      setIsScanning(true);
    } finally {
      setBusy(false);
    }
  };

  const stopScan = async () => {
    setBusy(true);
    try {
      await run('stop');
      setIsScanning(false);
    } finally {
      setBusy(false);
    }
  };

  const closeModal = async () => {
    try {
      if (hasBridge) await run('stop');
    } catch (_) {}
    setIsScanning(false);
    onClose?.();
  };

  useEffect(() => {
    if (!open || !isScanning || autoLoading) return undefined;

    const timeoutMs = tags.length > 0 ? TRAY_IDLE_TIMEOUT_WITH_TAGS_MS : TRAY_IDLE_TIMEOUT_WITHOUT_TAGS_MS;
    const idleTimer = setTimeout(async () => {
      try {
        if (hasBridge) await run('stop');
      } catch (_) {}
      setIsScanning(false);

      if (tags.length > 0) {
        await runFetch();
      } else {
        await closeModal();
      }
    }, timeoutMs);

    return () => clearTimeout(idleTimer);
  }, [open, isScanning, tags, autoLoading]);

  if (!open) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.20) 0%, rgba(15, 23, 42, 0.42) 45%, rgba(15, 23, 42, 0.65) 100%)', backdropFilter: 'blur(9px)', zIndex: 10001 }}>
      <div className="modal-dialog modal-dialog-centered modal-xl" style={{ maxWidth: 1120 }}>
        <div className="modal-content border-0" style={{ borderRadius: 18, background: 'rgba(255, 255, 255, 0.88)', boxShadow: '0 26px 65px rgba(15, 23, 42, 0.32)', overflow: 'hidden' }}>
          <div className="modal-header border-0" style={{ background: 'linear-gradient(120deg, rgba(239, 246, 255, 0.95) 0%, rgba(245, 243, 255, 0.96) 55%, rgba(236, 253, 245, 0.95) 100%)', color: '#0f172a', padding: '14px 18px', borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
            <h5 className="modal-title d-flex align-items-center gap-2" style={{ fontWeight: 700 }}>
              <FaBroadcastTower /> {title}
            </h5>
            <button type="button" className="btn-close" onClick={closeModal} style={{ opacity: 0.8 }}></button>
          </div>
          <div className="modal-body" style={{ padding: 16 }}>
            {!hasBridge && <div className="alert alert-warning mb-3">Tray scan works only in Electron app.</div>}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <input className="form-control" value={comPrimary} onChange={(e) => setComPrimary(e.target.value)} placeholder="Primary COM" style={{ minWidth: 110, maxWidth: 150 }} />
              <input className="form-control" value={comSecondary} onChange={(e) => setComSecondary(e.target.value)} placeholder="Secondary COM" style={{ minWidth: 110, maxWidth: 150 }} />
              <input className="form-control" value={baudRate} onChange={(e) => setBaudRate(e.target.value)} placeholder="Baud rate" style={{ minWidth: 130, maxWidth: 170 }} />
              <button className="btn d-flex align-items-center gap-2" onClick={connectAndStart} disabled={busy || !hasBridge} style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', border: 'none', fontWeight: 600 }}>
                <FaPlug />
                <FaPlay />
                Connect + Start
              </button>
              <button className="btn d-flex align-items-center gap-2" onClick={stopScan} disabled={busy || !isScanning || !hasBridge} style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', fontWeight: 600 }}>
                <FaStop />
                Stop
              </button>
              <button className="btn d-flex align-items-center gap-2" onClick={() => { setTags([]); setCurrentPage(1); }} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 600 }}>
                Clear EPCs
              </button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, background: isScanning ? 'rgba(16, 185, 129, 0.14)' : 'rgba(148, 163, 184, 0.2)', color: isScanning ? '#047857' : '#475569' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isScanning ? '#10b981' : '#94a3b8' }}></span>
                {isScanning ? 'Scanning in progress' : 'Scanner idle'}
              </span>
              <span>EPC scanned: {tags.length}</span>
              <span style={{ color: resolvingCodes ? '#1d4ed8' : '#334155' }}>
                RFID codes: {resolvingCodes ? 'resolving...' : 'updated'}
              </span>
            </div>
            {!!resolveError && (
              <div className="alert alert-warning py-2 px-3 mb-2" style={{ fontSize: 12 }}>
                RFID code lookup failed: {resolveError}
              </div>
            )}
            <div style={{ border: '1px solid rgba(148, 163, 184, 0.35)', borderRadius: 12, background: 'rgba(255, 255, 255, 0.78)', overflow: 'hidden' }}>
              <div style={{ maxHeight: 355, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(241, 245, 249, 0.9)' }}>
                      <th style={{ width: 56, padding: '10px 10px', fontSize: 12, textAlign: 'left', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>#</th>
                      <th style={{ width: '58%', padding: '10px 10px', fontSize: 12, textAlign: 'left', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>EPC Value</th>
                      <th style={{ width: '42%', padding: '10px 10px', fontSize: 12, textAlign: 'left', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>RFID Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr><td colSpan={3} style={{ padding: '18px 12px', fontSize: 12, color: '#64748b' }}>Scan tags from tray. EPC values will appear here.</td></tr>
                    ) : (
                      pageRows.map((row) => (
                        <tr key={`tray-row-${row.epc}`} style={{ borderBottom: '1px dashed #e2e8f0' }}>
                          <td style={{ padding: '8px 10px', fontSize: 11, color: '#64748b' }}>{row.srNo}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{row.epc || '-'}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{row.rfidCode || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(248, 250, 252, 0.9)', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Page {currentPage} of {totalPages}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>Prev</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Next</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer border-0" style={{ background: 'rgba(248, 250, 252, 0.75)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn btn-success d-flex align-items-center gap-2" onClick={runFetch} style={{ fontWeight: 700 }} disabled={tags.length === 0 || autoLoading}>
              <FaSearch />
              {autoLoading ? 'Loading...' : 'Load Data'}
            </button>
            <button className="btn btn-secondary" onClick={closeModal}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrayScanModal;
