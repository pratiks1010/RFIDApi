import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { FaPlay, FaPlug, FaSearch, FaStop } from 'react-icons/fa';
import { toSoniApiUrl } from '../../services/apiBaseConfig';
import {
  buildTrayConnectCommands,
  connectTrayReaders,
  TRAY_CONNECTION_MODE_OPTIONS,
  TRAY_CONNECTION_MODES,
} from '../../services/trayBridgeConnect';
import { getTrayTagIdentity, parseTrayTagLine } from '../../utils/trayTagParse';
import {
  getTrayReaderConfig,
  saveTrayReaderConfig,
  parsePowerAttDb10,
  snapPowerAttDb10ToPreset,
  attToDisplayPower,
  displayPowerToAtt,
  TRAY_POWER_ATT_MAX,
  TRAY_POWER_DISPLAY_MAX,
  TRAY_POWER_PRESET_OPTIONS
} from '../../services/trayReaderConfig';

const TRAY_IDLE_TIMEOUT_WITH_TAGS_MS = 2200;
const TRAY_IDLE_TIMEOUT_WITHOUT_TAGS_MS = 3500;
/** Matches `SidebarLayout` sidebar-glass gradient + accent */
const SIDEBAR_GRADIENT = 'linear-gradient(180deg, #042954 0%, #032547 45%, #021f3d 100%)';
const ACCENT_AMBER = '#fbbf24';
const ACCENT_TEAL = '#0d9488';
const PANEL_MUTED = 'rgba(255, 255, 255, 0.06)';
const TEXT_ON_NAVY = '#f8fafc';
const TEXT_ON_NAVY_MUTED = 'rgba(248, 250, 252, 0.72)';

const RFID_CODE_LOOKUP_URL = process.env.REACT_APP_RFID_EPC_LOOKUP_URL
  || toSoniApiUrl('/api/RFIDDashboard/GetRFIDCodesByEPCValues');

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

const TrayScanModal = ({
  open,
  onClose,
  onFetchData,
  onScanStart,
  title = 'Tray scan',
  subtitle = 'Use the RFID tray reader in the desktop app: connect COM ports, start scanning, then load tags into this screen.',
  loadButtonLabel = 'Load data',
  compactLayout = false,
}) => {
  const initialReaderConfig = useMemo(() => getTrayReaderConfig(), []);
  const [connectionMode, setConnectionMode] = useState(initialReaderConfig.connectionMode);
  const [comPrimary, setComPrimary] = useState(initialReaderConfig.comPrimary);
  const [comSecondary, setComSecondary] = useState(initialReaderConfig.comSecondary);
  const [baudRate, setBaudRate] = useState(initialReaderConfig.baudRate);
  const [powerAttDb10, setPowerAttDb10] = useState(initialReaderConfig.powerAttDb10);
  const isUsbMode = connectionMode === TRAY_CONNECTION_MODES.usb;
  const [busy, setBusy] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [fetchMessage, setFetchMessage] = useState('');
  const [tags, setTags] = useState([]);
  const [rfidCodeMap, setRfidCodeMap] = useState({});
  const [resolvingCodes, setResolvingCodes] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [connectedDeviceCount, setConnectedDeviceCount] = useState(0);

  const bridgeLineHistoryRef = useRef([]);
  const deviceRowsRef = useRef([]);
  const sdkConnectedCountRef = useRef(0);
  const tagsRef = useRef([]);
  const autoFetchPendingRef = useRef(false);

  const hasBridge = typeof window !== 'undefined' && !!window.electronAPI?.rfidBridgeCommand;
  const pageSize = compactLayout ? 20 : 10;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(tags.length / pageSize)), [tags.length, pageSize]);
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
  const compactDualTables = useMemo(() => {
    if (!compactLayout) return { leftRows: [], rightRows: [] };
    const half = Math.ceil(pageSize / 2);
    const leftRows = pageRows.slice(0, half);
    const rightRows = pageRows.slice(half, pageSize);
    while (leftRows.length < half) leftRows.push(null);
    while (rightRows.length < half) rightRows.push(null);
    return { leftRows, rightRows };
  }, [compactLayout, pageRows, pageSize]);

  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);

  useEffect(() => {
    if (!open || !hasBridge) return undefined;

    const ingestTagIdentity = (tag) => {
      const identity = getTrayTagIdentity(tag);
      if (!identity) return;
      setTags((prev) => (prev.includes(identity) ? prev : [...prev, identity]));
    };

    const pushBridgeLine = (line) => {
      bridgeLineHistoryRef.current.push(String(line || ''));
      if (bridgeLineHistoryRef.current.length > 600) {
        bridgeLineHistoryRef.current = bridgeLineHistoryRef.current.slice(-600);
      }
    };

    const unsubTag = window.electronAPI.onRfidBridgeTag((tag) => {
      ingestTagIdentity(tag);
    });
    const unsubLine = window.electronAPI.onRfidBridgeLine((line) => {
      const raw = String(line || '');
      pushBridgeLine(raw);
      const lower = raw.toLowerCase();
      if (lower.includes('inventory started')) setIsScanning(true);
      if (lower.includes('inventory stopped') || /scan finished/i.test(raw)) {
        setIsScanning(false);
        if (/scan finished/i.test(raw) && tagsRef.current.length > 0) {
          autoFetchPendingRef.current = true;
        }
      }
      if (lower.includes('start inventory failed')) {
        setFetchMessage('Scan could not start on connected readers. Check power/antenna and retry.');
      }
      const powerMatch = raw.match(/\bPOWER\s+attDb10\s*=\s*(\d+)/i);
      if (powerMatch) setPowerAttDb10(String(snapPowerAttDb10ToPreset(powerMatch[1])));
      const normalizedLine = raw.replace(/^rfid>\s*/i, '').trim();
      if (normalizedLine.toLowerCase().startsWith('device id=')) {
        const parsed = normalizedLine.match(/^device id=([^\s]+)\s+type=(.*?)\s+ip=(.*?)\s+port=([^\s]+)$/i);
        if (parsed) {
          const key = `${parsed[1]}|${parsed[4]}`;
          const existing = deviceRowsRef.current.filter((item) => `${item.id}|${item.port}` !== key);
          existing.push({
            id: parsed[1],
            type: parsed[2]?.trim() || '',
            ip: parsed[3]?.trim() || '',
            port: parsed[4],
          });
          deviceRowsRef.current = existing.sort((a, b) => Number(a.id) - Number(b.id));
          setConnectedDeviceCount(Math.max(existing.length, sdkConnectedCountRef.current));
        }
      }
      const connectedSummary = normalizedLine.match(/^connected devices detected by sdk:\s*(\d+)/i);
      if (connectedSummary) {
        sdkConnectedCountRef.current = Number.parseInt(connectedSummary[1], 10) || 0;
        setConnectedDeviceCount(Math.max(deviceRowsRef.current.length, sdkConnectedCountRef.current));
      }
      const parsedTag = parseTrayTagLine(raw);
      if (parsedTag) ingestTagIdentity(parsedTag);
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
    const saved = getTrayReaderConfig();
    setConnectionMode(saved.connectionMode);
    setComPrimary(saved.comPrimary);
    setComSecondary(saved.comSecondary);
    setBaudRate(saved.baudRate);
    setPowerAttDb10(saved.powerAttDb10);
    setTags([]);
    setRfidCodeMap({});
    setResolveError('');
    setFetchMessage('');
    setCurrentPage(1);
    setIsScanning(false);
    setConnectedDeviceCount(0);
    deviceRowsRef.current = [];
    sdkConnectedCountRef.current = 0;
    bridgeLineHistoryRef.current = [];
    autoFetchPendingRef.current = false;
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
    setFetchMessage('');
    setAutoLoading(true);
    try {
      const scanRows = tags.map((epc) => ({
        epc: String(epc || '').trim().toUpperCase(),
        rfidCode: String(rfidCodeMap[epc] || '').trim(),
      }));
      const result = await onFetchData(scanRows);
      const normalizedResult = typeof result === 'object' && result !== null
        ? result
        : { success: result !== false };
      const isSuccess = normalizedResult.success !== false;
      if (!isSuccess) {
        setFetchMessage(normalizedResult.message || 'No product data found for scanned tray tags.');
      }
      const shouldClose = isSuccess;
      if (shouldClose) {
        await closeModal();
      }
    } finally {
      setAutoLoading(false);
    }
  };

  const connectAndStart = async () => {
    setBusy(true);
    setFetchMessage('');
    try {
      setTags([]);
      setRfidCodeMap({});
      setCurrentPage(1);
      deviceRowsRef.current = [];
      sdkConnectedCountRef.current = 0;
      setConnectedDeviceCount(0);
      autoFetchPendingRef.current = false;

      const { errors } = buildTrayConnectCommands({
        connectionMode,
        comPrimary,
        comSecondary,
        baudRate,
      });
      if (errors.length) {
        setFetchMessage(errors.join(' '));
        return;
      }

      const connectResult = await connectTrayReaders({
        runCommand: run,
        lineHistory: bridgeLineHistoryRef.current,
        connectionMode,
        comPrimary,
        comSecondary,
        baudRate,
        powerAttDb10,
        parsePowerAttDb10,
        getDeviceCount: () => Math.max(deviceRowsRef.current.length, sdkConnectedCountRef.current),
      });

      setConnectedDeviceCount(connectResult.effectiveDeviceCount);
      if (connectResult.effectiveDeviceCount === 0) {
        setFetchMessage(connectResult.message);
        return;
      }

      await run('start');
      setIsScanning(true);
      setFetchMessage(
        connectResult.effectiveDeviceCount > 1
          ? `Scanning on ${connectResult.effectiveDeviceCount} connected device(s). Place tray on antenna.`
          : ''
      );
      if (onScanStart) {
        try {
          await onScanStart();
        } catch (scanStartErr) {
          setFetchMessage(scanStartErr?.message || 'Could not reset previous scan list.');
        }
      }
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

  const savePorts = () => {
    if (parsePowerAttDb10(powerAttDb10) === null) {
      setFetchMessage('Select a transmit power level from the list.');
      return;
    }
    const saved = saveTrayReaderConfig({ connectionMode, comPrimary, comSecondary, baudRate, powerAttDb10 });
    setConnectionMode(saved.connectionMode);
    setComPrimary(saved.comPrimary);
    setComSecondary(saved.comSecondary);
    setBaudRate(saved.baudRate);
    setPowerAttDb10(saved.powerAttDb10);
    setFetchMessage('Reader settings saved. All tray scan popups use this.');
  };

  useEffect(() => {
    if (!open || autoLoading) return undefined;

    if (autoFetchPendingRef.current && !isScanning) {
      autoFetchPendingRef.current = false;
      const timer = setTimeout(() => {
        if (tagsRef.current.length > 0) {
          runFetch();
        }
      }, 280);
      return () => clearTimeout(timer);
    }

    if (!isScanning) return undefined;

    const timeoutMs = tags.length > 0 ? TRAY_IDLE_TIMEOUT_WITH_TAGS_MS : TRAY_IDLE_TIMEOUT_WITHOUT_TAGS_MS;
    const idleTimer = setTimeout(async () => {
      try {
        if (hasBridge) await run('stop');
      } catch (_) {}
      setIsScanning(false);

      if (tagsRef.current.length > 0) {
        await runFetch();
      } else {
        setFetchMessage('No tags detected. Adjust tray position and connect & start scan again.');
      }
    }, timeoutMs);

    return () => clearTimeout(idleTimer);
  }, [open, isScanning, tags, autoLoading]);
  if (!open) return null;

  const btnBase = { borderRadius: 10, fontWeight: 700, border: 'none', padding: '8px 13px' };
  const inputStyle = { borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13 };

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tray-scan-modal-title"
      style={{
        background: 'linear-gradient(145deg, rgba(2, 31, 61, 0.72) 0%, rgba(4, 41, 84, 0.55) 50%, rgba(2, 31, 61, 0.78) 100%)',
        backdropFilter: 'blur(10px)',
        zIndex: 10001,
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-xl" style={{ maxWidth: compactLayout ? 1040 : 1120 }}>
        <div
          className="modal-content border-0"
          style={{
            borderRadius: 20,
            background: '#f1f5f9',
            boxShadow: '0 28px 70px rgba(2, 31, 61, 0.45), 0 0 0 1px rgba(251, 191, 36, 0.12)',
            overflow: 'hidden',
          }}
        >
          <div
            className="modal-header border-0 flex-column align-items-stretch"
            style={{
              background: SIDEBAR_GRADIENT,
              color: TEXT_ON_NAVY,
              padding: compactLayout ? '14px 18px 14px' : '18px 22px 20px',
              borderBottom: `1px solid ${PANEL_MUTED}`,
            }}
          >
            <div className="d-flex align-items-start justify-content-between gap-3">
              <div className="d-flex gap-3 min-w-0">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'rgba(251, 191, 36, 0.15)',
                    border: '1px solid rgba(251, 191, 36, 0.35)',
                    color: ACCENT_AMBER,
                  }}
                >
                  <FaPlug size={20} aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2 id="tray-scan-modal-title" className="modal-title mb-1" style={{ fontWeight: 700, fontSize: compactLayout ? '1.12rem' : '1.25rem', letterSpacing: '-0.02em', color: TEXT_ON_NAVY }}>
                    {title}
                  </h2>
                  <p className="mb-0" style={{ fontSize: 13, lineHeight: 1.45, color: TEXT_ON_NAVY_MUTED, maxWidth: 640 }}>
                    {subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white flex-shrink-0"
                onClick={closeModal}
                style={{ opacity: 0.85 }}
                aria-label="Close tray scan"
              />
            </div>
          </div>
          <div className="modal-body" style={{ padding: compactLayout ? '10px 14px' : '18px 22px', background: '#f8fafc', maxHeight: compactLayout ? '68vh' : 'none', overflowY: compactLayout ? 'auto' : 'visible' }}>
            {!hasBridge && (
              <div className="alert alert-warning mb-3 py-2 px-3" style={{ fontSize: 13, borderRadius: 12, border: 'none' }}>
                Tray scanning runs in the <strong>Sparkle RFID desktop app</strong> only. Open this screen from Electron to use the reader bridge.
              </div>
            )}
            <div
              style={{
                borderRadius: 14,
                padding: compactLayout ? '10px 12px' : '14px 16px',
                marginBottom: compactLayout ? 10 : 16,
                background: '#fff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 0 rgba(4, 41, 84, 0.04)',
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#475569' }}>
                <FaPlug style={{ color: ACCENT_TEAL }} aria-hidden />
                Reader setup
              </div>
              <div className="row g-2 g-md-3 align-items-end">
                <div className="col-12 col-md-auto">
                  <label className="form-label small mb-1" style={{ color: '#64748b', fontWeight: 600 }} htmlFor="tray-connection-mode">Connection</label>
                  <select
                    id="tray-connection-mode"
                    className="form-select"
                    value={connectionMode}
                    onChange={(e) => setConnectionMode(e.target.value)}
                    disabled={busy || !hasBridge}
                    style={{ ...inputStyle, minWidth: 200, maxWidth: 260, fontSize: 12 }}
                  >
                    {TRAY_CONNECTION_MODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {!isUsbMode ? (
                  <>
                    <div className="col-6 col-md-auto">
                      <label className="form-label small mb-1" style={{ color: '#64748b', fontWeight: 600 }} htmlFor="tray-com-primary">Primary COM</label>
                      <input id="tray-com-primary" className="form-control" value={comPrimary} onChange={(e) => setComPrimary(e.target.value)} placeholder="e.g. 7" style={{ ...inputStyle, minWidth: 120, maxWidth: 160 }} autoComplete="off" />
                    </div>
                    <div className="col-6 col-md-auto">
                      <label className="form-label small mb-1" style={{ color: '#64748b', fontWeight: 600 }} htmlFor="tray-com-secondary">Secondary COM</label>
                      <input id="tray-com-secondary" className="form-control" value={comSecondary} onChange={(e) => setComSecondary(e.target.value)} placeholder="e.g. 8" style={{ ...inputStyle, minWidth: 120, maxWidth: 160 }} autoComplete="off" />
                    </div>
                    <div className="col-12 col-md-auto">
                      <label className="form-label small mb-1" style={{ color: '#64748b', fontWeight: 600 }} htmlFor="tray-baud">Baud rate</label>
                      <input id="tray-baud" className="form-control" value={baudRate} onChange={(e) => setBaudRate(e.target.value)} placeholder="e.g. 115200" style={{ ...inputStyle, minWidth: 130, maxWidth: 180 }} autoComplete="off" />
                    </div>
                  </>
                ) : (
                  <div className="col-12 col-md">
                    <div className="small" style={{ color: '#64748b', padding: '6px 0' }}>
                      USB mode uses <code>connect-usb</code> via UHFAPI.dll — no COM ports. Ensure <strong>libusb-1.0.dll</strong> is next to the bridge.
                    </div>
                  </div>
                )}
                <div className="col-12 col-md">
                  <label className="form-label small mb-1" style={{ color: '#64748b', fontWeight: 600 }} htmlFor="tray-power-select-modal">
                    Transmit power ({TRAY_POWER_DISPLAY_MAX} = strongest / fastest, 0 = weakest)
                  </label>
                  <select
                    id="tray-power-select-modal"
                    className="form-select"
                    value={powerAttDb10}
                    onChange={(e) => setPowerAttDb10(e.target.value)}
                    disabled={busy || !hasBridge}
                    style={{ ...inputStyle, width: 160, maxWidth: 'min(160px, 100%)', minWidth: 120, fontSize: 11 }}
                    aria-label="Transmit power preset"
                  >
                    {TRAY_POWER_PRESET_OPTIONS.map((opt) => (
                      <option key={opt.value} value={String(opt.value)}>
                        {opt.label} (slider {attToDisplayPower(opt.value)})
                      </option>
                    ))}
                  </select>
                  <div className="small mt-1" style={{ color: '#94a3b8', fontSize: 11 }}>
                    Same preset as RFID Tray Connect; saving stores it for every tray popup.
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex flex-wrap gap-2 pt-1">
                    <button type="button" className="btn d-flex align-items-center gap-2" onClick={connectAndStart} disabled={busy || !hasBridge} style={{ ...btnBase, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#082f49' }}>
                      <FaPlug aria-hidden />
                      <FaPlay aria-hidden />
                      Connect &amp; start scan
                    </button>
                    <button type="button" className="btn d-flex align-items-center gap-2" onClick={savePorts} disabled={busy} style={{ ...btnBase, background: '#ffffff', color: '#0b3a67', border: '1px solid #93c5fd' }}>
                      <FaPlug aria-hidden />
                      Save reader settings
                    </button>
                    <button type="button" className="btn d-flex align-items-center gap-2" onClick={stopScan} disabled={busy || !isScanning || !hasBridge} style={{ ...btnBase, background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)', color: '#fff' }}>
                      <FaStop aria-hidden />
                      Stop reader
                    </button>
                    <button type="button" className="btn d-flex align-items-center gap-2" onClick={() => { setTags([]); setCurrentPage(1); }} style={{ ...btnBase, background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1' }}>
                      Clear tag list
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: isScanning ? 'rgba(13, 148, 136, 0.12)' : 'rgba(100, 116, 139, 0.12)', color: isScanning ? '#0f766e' : '#475569', border: `1px solid ${isScanning ? 'rgba(13, 148, 136, 0.25)' : 'rgba(148, 163, 184, 0.35)'}` }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isScanning ? ACCENT_TEAL : '#94a3b8' }} aria-hidden />
                {isScanning ? 'Scanning — place tray on antenna' : 'Reader idle — connect & start when ready'}
              </span>
              <span style={{ color: '#64748b' }}>Tags in list: <strong style={{ color: '#0f172a' }}>{tags.length}</strong></span>
              {connectedDeviceCount > 0 ? (
                <span style={{ color: '#0f766e' }}>
                  Readers: <strong>{connectedDeviceCount}</strong> active
                </span>
              ) : null}              <span style={{ color: resolvingCodes ? ACCENT_TEAL : '#64748b' }}>
                Item codes: {resolvingCodes ? 'looking up…' : 'ready'}
              </span>
            </div>
            {!!resolveError && (
              <div className="alert alert-warning py-2 px-3 mb-2" style={{ fontSize: 12, borderRadius: 12, border: 'none' }}>
                Could not resolve RFID codes: {resolveError}
              </div>
            )}
            {!!fetchMessage && (
              <div className="alert alert-info py-2 px-3 mb-2" style={{ fontSize: 12, borderRadius: 12, border: 'none' }}>
                {fetchMessage}
              </div>
            )}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', overflow: 'hidden', boxShadow: '0 1px 0 rgba(4, 41, 84, 0.04)', marginBottom: 12 }}>
              <div className="px-3 py-2" style={{ background: 'rgba(4, 41, 84, 0.06)', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#042954' }}>
                Scanned tags
              </div>
              <div style={{ minHeight: compactLayout ? 360 : 'auto', maxHeight: compactLayout ? 360 : 340, overflowY: 'auto', padding: compactLayout ? 8 : 0 }}>
                {compactLayout ? (
                  pageRows.length === 0 ? (
                    <div style={{ padding: '22px 16px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                      No tags yet. After you <strong>start the scan</strong>, EPCs from the tray appear here and item codes load automatically when online.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                      {[compactDualTables.leftRows, compactDualTables.rightRows].map((chunk, tableIdx) => (
                        <table key={`tray-compact-table-${tableIdx}`} style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              <th scope="col" style={{ width: '62%', padding: '7px 9px', fontSize: 10, textAlign: 'left', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>EPC</th>
                              <th scope="col" style={{ width: '38%', padding: '7px 9px', fontSize: 10, textAlign: 'left', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>RFID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chunk.map((row, idx) => (
                              <tr key={`tray-compact-${tableIdx}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '7px 9px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#0f172a', fontWeight: 600 }}>
                                  {row?.epc || '—'}
                                </td>
                                <td style={{ padding: '7px 9px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#0f172a', fontWeight: 600 }}>
                                  {row?.rfidCode || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ))}
                    </div>
                  )
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th scope="col" style={{ width: 56, padding: '10px 12px', fontSize: 11, textAlign: 'left', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>#</th>
                        <th scope="col" style={{ width: '58%', padding: '10px 12px', fontSize: 11, textAlign: 'left', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>EPC</th>
                        <th scope="col" style={{ width: '42%', padding: '10px 12px', fontSize: 11, textAlign: 'left', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>RFID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ padding: '22px 16px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                            No tags yet. After you <strong>start the scan</strong>, EPCs from the tray appear here and item codes load automatically when online.
                          </td>
                        </tr>
                      ) : (
                        pageRows.map((row) => (
                          <tr key={`tray-row-${row.epc}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{row.srNo}</td>
                            <td style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace', fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{row.epc || '—'}</td>
                            <td style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace', fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{row.rfidCode || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Page {currentPage} of {totalPages}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} style={{ borderRadius: 8, border: '1px solid #93c5fd', background: '#ffffff', color: '#0b3a67', fontWeight: 600 }}>Previous</button>
                <button type="button" className="btn btn-sm" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} style={{ borderRadius: 8, border: '1px solid #93c5fd', background: '#ffffff', color: '#0b3a67', fontWeight: 600 }}>Next</button>
              </div>
            </div>
            </div>
          <div className="modal-footer border-0 flex-wrap" style={{ background: '#f1f5f9', padding: '10px 16px', gap: 8, borderTop: '1px solid #e2e8f0' }}>
            <span className="me-auto small text-muted d-none d-md-inline" style={{ maxWidth: 360 }}>
              When tags are listed, use the button below to pull stock lines into your document. Scanning stops briefly while data loads.
            </span>
            <button type="button" className="btn d-flex align-items-center gap-2" onClick={runFetch} style={{ ...btnBase, background: 'linear-gradient(135deg, #0ea5a4 0%, #0f766e 100%)', color: '#ffffff', fontWeight: 700 }} disabled={tags.length === 0 || autoLoading}>
              <FaSearch aria-hidden />
              {autoLoading ? 'Loading…' : loadButtonLabel}
            </button>
            <button type="button" className="btn" onClick={closeModal} style={{ ...btnBase, background: '#ffffff', color: '#0b3a67', border: '1px solid #93c5fd' }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrayScanModal;
