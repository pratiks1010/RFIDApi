import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  FaBoxOpen,
  FaChartLine,
  FaChevronDown,
  FaHdd,
  FaLink,
  FaListUl,
  FaNetworkWired,
  FaPowerOff,
  FaSave,
  FaSearch,
  FaServer,
  FaSignal,
  FaStop,
  FaSyncAlt,
  FaTag,
  FaTerminal,
  FaTrash,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import '../styles/RFIDTrayConnect.css';
import { toSoniApiUrl } from '../services/apiBaseConfig';
import {
  buildTrayConnectCommands,
  evaluateSerialConnectAttempt,
  evaluateUsbConnectAttempt,
  parseBaudRate,
  parseComNumber,
  TRAY_CONNECTION_MODE_OPTIONS,
  TRAY_CONNECTION_MODES,
} from '../services/trayBridgeConnect';
import {
  getTrayReaderConfig,
  saveTrayReaderConfig,
  parsePowerAttDb10,
  snapPowerAttDb10ToPreset,
  TRAY_POWER_ATT_MAX,
} from '../services/trayReaderConfig';

const RFID_CODE_LOOKUP_URL = process.env.REACT_APP_RFID_EPC_LOOKUP_URL
  || toSoniApiUrl('/api/RFIDDashboard/GetRFIDCodesByEPCValues');

const getClientCode = () => {
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
    if (epc && rfid) map[epc] = rfid;
  });
  return map;
};

const RFIDTrayConnect = () => {
  const initialReaderConfig = useMemo(() => getTrayReaderConfig(), []);
  const [connectionMode, setConnectionMode] = useState(initialReaderConfig.connectionMode);
  const [comPrimary, setComPrimary] = useState(initialReaderConfig.comPrimary);
  const [comSecondary, setComSecondary] = useState(initialReaderConfig.comSecondary);
  const [baudRate, setBaudRate] = useState(initialReaderConfig.baudRate);
  const [powerAttDb10, setPowerAttDb10] = useState(initialReaderConfig.powerAttDb10);
  const isUsbMode = connectionMode === TRAY_CONNECTION_MODES.usb;
  const [isScanning, setIsScanning] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [logs, setLogs] = useState([]);
  const [tagMap, setTagMap] = useState({});
  const [rfidCodeMap, setRfidCodeMap] = useState({});
  const [resolvingCodes, setResolvingCodes] = useState(false);
  const [rfidLookupError, setRfidLookupError] = useState('');
  const [deviceRows, setDeviceRows] = useState([]);
  const [activeAction, setActiveAction] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const lastErrorToastRef = useRef('');
  const bridgeLineHistoryRef = useRef([]);
  const deviceRowsRef = useRef([]);
  const sdkConnectedCountRef = useRef(0);

  const hasBridge = typeof window !== 'undefined' && window.electronAPI?.rfidBridgeCommand;

  const notifyError = (message) => {
    const text = String(message || '').trim();
    if (!text) return;
    if (lastErrorToastRef.current === text) return;
    lastErrorToastRef.current = text;
    toast.error(text);
    setTimeout(() => {
      if (lastErrorToastRef.current === text) lastErrorToastRef.current = '';
    }, 1200);
  };

  const makeLogEntry = (line) => {
    const text = String(line || '').trim();
    if (!text) return null;
    return { ts: Date.now(), text };
  };

  const appendLog = (line) => {
    const entry = makeLogEntry(line);
    if (!entry) return;
    setLogs((prev) => [entry, ...prev].slice(0, 200));
  };

  const logDotClass = (text) => {
    const lower = String(text || '').toLowerCase();
    if (lower.startsWith('error')) return 'tray-log-dot--error';
    if (lower.startsWith('warn')) return 'tray-log-dot--warn';
    if (lower.startsWith('cmd>') || lower.startsWith('ack>')) return 'tray-log-dot--info';
    return '';
  };

  const formatLogTime = (ts) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '—';
    }
  };

  const getBridgeErrorMessage = (rawMessage) => {
    const message = String(rawMessage || '').trim();
    const lower = message.toLowerCase();
    if (!message) return 'RFID bridge failed.';
    if (lower.includes('unable to load dll') && lower.includes('uhfapi.dll')) {
      return 'RFID SDK DLL missing on this laptop (UHFAPI.dll). Install/copy reader SDK files.';
    }
    if (lower.includes('rfid bridge executable not found')) {
      return 'RFID bridge service is missing in this app build. Reinstall the desktop app.';
    }
    if (lower.includes('invalid com number')) {
      return 'Invalid COM port. Use only number (example: 7), not COM7.';
    }
    if (lower.includes('serial connect failed')) {
      return 'Reader serial connection failed. Verify COM port, baud rate, and driver.';
    }
    if (lower.includes('usb connect failed')) {
      return 'USB connection failed. Check USB cable, reader driver, and libusb-1.0.dll next to UHFAPI.dll.';
    }
    if (lower.includes('uhfapi_set_powercontrol') || lower.includes('uhfapi_get_powercontrol')) {
      return 'This UHFAPI.dll build does not export TX power control (UHFAPI_SET_PowerControl / GET).';
    }
    if (lower.includes('start inventory failed')) {
      return 'Scan could not start on connected readers. Check reader power/antenna and retry.';
    }
    if (lower.includes('not connected')) {
      return 'Reader is not connected. Click Connect first, then start scan.';
    }
    return message;
  };

  const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const getLinesSince = (startIndex) => bridgeLineHistoryRef.current.slice(startIndex);

  const waitForBridgeResponse = async (startIndex, timeoutMs = 1400) => {
    const startedAt = Date.now();
    let lastCount = startIndex;
    while (Date.now() - startedAt < timeoutMs) {
      const currentCount = bridgeLineHistoryRef.current.length;
      if (currentCount > lastCount) {
        await waitMs(60);
        return getLinesSince(startIndex);
      }
      lastCount = currentCount;
      await waitMs(80);
    }
    return getLinesSince(startIndex);
  };

  useEffect(() => {
    deviceRowsRef.current = deviceRows;
  }, [deviceRows]);

  useEffect(() => {
    if (!hasBridge) return undefined;

    const unsubLine = window.electronAPI.onRfidBridgeLine((line) => {
      const entry = makeLogEntry(line);
      if (entry) setLogs((prev) => [entry, ...prev].slice(0, 200));
      bridgeLineHistoryRef.current.push(String(line || ''));
      if (bridgeLineHistoryRef.current.length > 600) {
        bridgeLineHistoryRef.current = bridgeLineHistoryRef.current.slice(-600);
      }
      const lowerLine = String(line || '').toLowerCase();
      if (lowerLine.includes('invalid com number')) {
        notifyError('Invalid COM port. Use only number (example: 7), not COM7.');
      } else if (lowerLine.includes('serial connect failed')) {
        notifyError('Reader serial connection failed. Verify COM port, baud rate, and driver.');
      } else if (lowerLine.includes('start inventory failed')) {
        notifyError('Scan could not start on connected readers. Check reader power/antenna and retry.');
      } else if (lowerLine.includes('not connected')) {
        notifyError('Reader is not connected. Click Connect first, then start scan.');
      }
      if (line.toLowerCase().includes('inventory started')) {
        setIsScanning(true);
        toast.success('Scan started successfully.');
      }
      if (line.toLowerCase().includes('inventory stopped')) {
        setIsScanning(false);
        toast.info('Scan stopped.');
      }
      const normalizedLine = line.replace(/^rfid>\s*/i, '').trim();
      if (normalizedLine.toLowerCase().startsWith('device id=')) {
        const parsed = normalizedLine.match(/^device id=([^\s]+)\s+type=(.*?)\s+ip=(.*?)\s+port=([^\s]+)$/i);
        if (parsed) {
          setDeviceRows((prev) => {
            const key = `${parsed[1]}|${parsed[4]}`;
            const next = prev.filter((item) => `${item.id}|${item.port}` !== key);
            next.push({
              id: parsed[1],
              type: parsed[2]?.trim() || '',
              ip: parsed[3]?.trim() || '',
              port: parsed[4]
            });
            return next.sort((a, b) => Number(a.id) - Number(b.id));
          });
        }
      }

      const connectedSummary = normalizedLine.match(/^connected devices detected by sdk:\s*(\d+)/i);
      if (connectedSummary) {
        sdkConnectedCountRef.current = Number.parseInt(connectedSummary[1], 10) || 0;
        if (sdkConnectedCountRef.current === 0) {
          notifyError('SDK reports 0 connected devices. Verify COM ports, power, and reader driver.');
        }
      }

      const powerMatch = String(line || '').match(/\bPOWER\s+attDb10\s*=\s*(\d+)/i);
      if (powerMatch) {
        setPowerAttDb10(String(snapPowerAttDb10ToPreset(powerMatch[1])));
      }
    });

    const unsubTag = window.electronAPI.onRfidBridgeTag((tag) => {
      const normalizedTid = String(tag?.tid || '').trim().toUpperCase();
      const normalizedEpc = String(tag?.epc || '').trim().toUpperCase();
      const identity = normalizedTid || normalizedEpc;
      if (!identity) return;
      const key = identity;
      setTagMap((prev) => {
        const current = prev[key] || {
          ...tag,
          epc: normalizedEpc || tag?.epc || '',
          tid: normalizedTid || tag?.tid || '',
          count: 0,
          firstSeen: new Date().toISOString(),
          deviceIds: []
        };
        const nextDeviceId = String(tag?.deviceId || '').trim();
        const mergedDeviceIds = Array.from(
          new Set([...(Array.isArray(current.deviceIds) ? current.deviceIds : []), nextDeviceId].filter(Boolean))
        );
        return {
          ...prev,
          [key]: {
            ...current,
            ...tag,
            epc: normalizedEpc || current.epc || '',
            tid: normalizedTid || current.tid || '',
            deviceIds: mergedDeviceIds,
            deviceId: mergedDeviceIds[0] || nextDeviceId || current.deviceId || '',
            count: current.count + 1,
            lastSeen: new Date().toISOString()
          }
        };
      });
    });

    const unsubError = window.electronAPI.onRfidBridgeError((line) => {
      const mapped = getBridgeErrorMessage(line);
      const entry = makeLogEntry(`ERROR: ${mapped}`);
      if (entry) setLogs((prev) => [entry, ...prev].slice(0, 200));
      bridgeLineHistoryRef.current.push(`ERROR: ${mapped}`);
      if (bridgeLineHistoryRef.current.length > 600) {
        bridgeLineHistoryRef.current = bridgeLineHistoryRef.current.slice(-600);
      }
      notifyError(mapped);
    });

    window.electronAPI.rfidBridgeEnsure().catch(() => {
      const message = 'Failed to start RFID bridge service. Reopen app and verify tray bridge files.';
      const entry = makeLogEntry(`ERROR: ${message}`);
      if (entry) setLogs((prev) => [entry, ...prev].slice(0, 200));
      notifyError(message);
    });

    return () => {
      unsubLine?.();
      unsubTag?.();
      unsubError?.();
    };
  }, [hasBridge]);

  const tagRows = useMemo(() => Object.values(tagMap), [tagMap]);
  const sortedTagRows = useMemo(
    () => [...tagRows].sort((a, b) => new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0)),
    [tagRows]
  );
  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedTagRows.length / pageSize)), [sortedTagRows.length]);
  const paginatedTagRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTagRows.slice(start, start + pageSize);
  }, [sortedTagRows, currentPage]);
  const totalReadCount = useMemo(
    () => tagRows.reduce((sum, tag) => sum + (Number(tag.count) || 0), 0),
    [tagRows]
  );

  useEffect(() => {
    const epcs = Array.from(new Set(
      sortedTagRows.map((tag) => String(tag?.epc || '').trim().toUpperCase()).filter(Boolean)
    ));
    const missingEpcs = epcs.filter((epc) => !rfidCodeMap[epc]);
    if (!missingEpcs.length) return undefined;

    const timer = setTimeout(async () => {
      setResolvingCodes(true);
      try {
        const response = await axios.post(
          RFID_CODE_LOOKUP_URL,
          {
            ClientCode: getClientCode() || undefined,
            EPCValues: missingEpcs
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
        setRfidCodeMap((prev) => ({ ...prev, ...mapping }));
        setRfidLookupError('');
      } catch (error) {
        const message = error?.response?.data?.message
          || error?.response?.data?.error
          || error?.message
          || 'RFID code API failed.';
        setRfidLookupError(message);
        toast.error(`RFID code lookup failed: ${message}`);
      } finally {
        setResolvingCodes(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [sortedTagRows, rfidCodeMap]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const runCommand = async (command) => {
    if (!hasBridge) {
      const message = 'RFID tray bridge is unavailable. Open this page from desktop app.';
      appendLog(`ERROR: ${message}`);
      notifyError(message);
      return;
    }
    try {
      appendLog(`CMD> ${command}`);
      const response = await window.electronAPI.rfidBridgeCommand(command);
      if (response?.ok === false) {
        const message = getBridgeErrorMessage(response?.error || 'Bridge command failed.');
        appendLog(`ERROR: ${message}`);
        notifyError(message);
        throw new Error(message);
      }
      appendLog(`ACK> ${command}`);
      if (typeof response?.bridgePid === 'number') {
        appendLog(`BRIDGE PID> ${response.bridgePid} running=${response?.bridgeRunning ? 'yes' : 'no'}`);
      }
    } catch (error) {
      const message = getBridgeErrorMessage(error?.message || 'Failed to run command.');
      appendLog(`ERROR: ${message}`);
      notifyError(message);
      throw error;
    }
  };

  const connectReaders = async () => {
    const { commands, errors, mode } = buildTrayConnectCommands({
      connectionMode,
      comPrimary,
      comSecondary,
      baudRate,
    });
    if (errors.length) {
      notifyError(errors.join(' '));
      return;
    }

    setActiveAction('connect');
    setIsBusy(true);
    setDeviceRows([]);
    sdkConnectedCountRef.current = 0;
    appendLog(
      mode === TRAY_CONNECTION_MODES.usb
        ? 'INFO: Connect requested via USB'
        : `INFO: Connect requested for COM${parseComNumber(comPrimary)}, COM${parseComNumber(comSecondary)} @ ${parseBaudRate(baudRate)}`
    );
    try {
      let primaryAttempt = { ok: null, message: '' };
      let secondaryAttempt = { ok: null, message: '' };
      let usbAttempt = { ok: null, message: '' };

      for (let i = 0; i < commands.length; i += 1) {
        const cmd = commands[i];
        const start = bridgeLineHistoryRef.current.length;
        await runCommand(cmd);
        const lines = await waitForBridgeResponse(start, mode === TRAY_CONNECTION_MODES.usb ? 2200 : 1400);

        if (cmd === 'connect-usb') {
          usbAttempt = evaluateUsbConnectAttempt(lines);
        } else if (cmd.startsWith('connect-serial')) {
          const comNum = parseComNumber(cmd.split(' ')[1]);
          const attempt = evaluateSerialConnectAttempt(lines, comNum);
          if (!primaryAttempt.ok && primaryAttempt.message === '') {
            primaryAttempt = attempt;
          } else {
            secondaryAttempt = attempt;
          }
        }
      }

      await runCommand('devices');
      await runCommand('status');
      await waitMs(260);

      const parsedDeviceCount = deviceRowsRef.current.length;
      const sdkDeviceCount = sdkConnectedCountRef.current;
      const effectiveDeviceCount = Math.max(parsedDeviceCount, sdkDeviceCount);

      const parsedPower = parsePowerAttDb10(powerAttDb10);
      if (parsedPower !== null && effectiveDeviceCount > 0) {
        try {
          await runCommand(`set-power ${parsedPower}`);
        } catch (_) {
          /* runCommand already surfaced */
        }
      }

      if (mode === TRAY_CONNECTION_MODES.usb) {
        if (usbAttempt.ok === true || effectiveDeviceCount > 0) {
          toast.success(
            effectiveDeviceCount > 0
              ? `USB connected. ${effectiveDeviceCount} device(s) detected.`
              : 'USB connected.'
          );
        } else if (usbAttempt.ok === false) {
          notifyError(usbAttempt.message);
        } else {
          notifyError('USB connect response unclear. Check bridge logs and click Devices.');
        }
        return;
      }

      const okCount = Number(primaryAttempt.ok === true) + Number(secondaryAttempt.ok === true);
      const failedAttempts = [primaryAttempt, secondaryAttempt].filter((item) => item.ok === false);
      const unknownAttempts = [primaryAttempt, secondaryAttempt].filter((item) => item.ok === null);
      const primaryCom = parseComNumber(comPrimary);
      const secondaryCom = parseComNumber(comSecondary);

      if (effectiveDeviceCount > 0) {
        if (okCount === 2) {
          toast.success(`Both readers connected (COM${primaryCom}, COM${secondaryCom}).`);
        } else if (okCount === 1) {
          const okPort = primaryAttempt.ok ? primaryCom : secondaryCom;
          const failedMessage = primaryAttempt.ok ? secondaryAttempt.message : primaryAttempt.message;
          toast.success(`At least one reader connected. COM${okPort} is active.`);
          if (failedMessage) notifyError(failedMessage);
        } else {
          toast.success(`Reader link active. Detected ${effectiveDeviceCount} connected device(s) from bridge.`);
          if (unknownAttempts.length) {
            notifyError('Connect command response was delayed; using device-list confirmation instead.');
          }
        }
      } else if (okCount === 2) {
        toast.success(`Both readers connected (COM${primaryCom}, COM${secondaryCom}).`);
        notifyError('COM ports opened, but SDK returned no active device rows. Check cable/reader power/driver and click Devices again.');
        appendLog('WARN: COM opened but no active devices from SDK.');
      } else if (failedAttempts.length > 0) {
        notifyError(`Reader connection failed. ${failedAttempts.map((item) => item.message).join(' ')}`);
        appendLog(`WARN: ${failedAttempts.map((item) => item.message).join(' ')}`);
      } else {
        notifyError('No bridge response and no connected device found. Check driver, reader power, and bridge logs.');
        appendLog('WARN: No bridge output received after connect commands.');
      }
    } finally {
      setIsBusy(false);
      setActiveAction('');
    }
  };

  const startScan = async () => {
    const effectiveDeviceCount = Math.max(deviceRowsRef.current.length, sdkConnectedCountRef.current);
    if (effectiveDeviceCount === 0) {
      toast.warning('No device row reported yet. Trying scan anyway; check logs for TAG lines.');
    }
    setActiveAction('scan');
    setIsBusy(true);
    try {
      setTagMap({});
      setCurrentPage(1);
      const pScan = parsePowerAttDb10(powerAttDb10);
      if (pScan !== null) {
        try {
          await runCommand(`set-power ${pScan}`);
        } catch (_) {
          /* optional; reader may not support API */
        }
      }
      await runCommand('start');
    } finally {
      setIsBusy(false);
      setActiveAction('');
    }
  };

  const stopScan = async () => {
    setActiveAction('stop');
    setIsBusy(true);
    try {
      await runCommand('stop');
      setIsScanning(false);
    } finally {
      setIsBusy(false);
      setActiveAction('');
    }
  };

  const disconnectReaders = async () => {
    setActiveAction('disconnect');
    setIsBusy(true);
    try {
      await runCommand('disconnect');
      setIsScanning(false);
      setDeviceRows([]);
      toast.info('Readers disconnected.');
    } finally {
      setIsBusy(false);
      setActiveAction('');
    }
  };

  const refreshDevices = async () => {
    setActiveAction('devices');
    setDeviceRows([]);
    setIsBusy(true);
    try {
      await runCommand('devices');
      toast.success('Device list updated.');
    } finally {
      setIsBusy(false);
      setActiveAction('');
    }
  };

  const clearScannedData = () => {
    setActiveAction('clear');
    setTagMap({});
    setRfidCodeMap({});
    setRfidLookupError('');
    setCurrentPage(1);
    setTimeout(() => setActiveAction((prev) => (prev === 'clear' ? '' : prev)), 300);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const readTrayPowerFromReader = async () => {
    setIsBusy(true);
    try {
      await runCommand('get-power');
      await waitMs(400);
    } finally {
      setIsBusy(false);
    }
  };

  const saveReaderPorts = () => {
    const primaryCom = parseComNumber(comPrimary);
    const secondaryCom = parseComNumber(comSecondary);
    const parsedBaudRate = parseBaudRate(baudRate);
    const parsedPower = parsePowerAttDb10(powerAttDb10);
    if (!isUsbMode) {
      if (!primaryCom || !secondaryCom) {
        notifyError('Invalid COM port. Enter numbers only before saving (example: 7 and 8).');
        return;
      }
      if (!parsedBaudRate) {
        notifyError('Invalid baud rate. Enter numeric value before saving (example: 115200).');
        return;
      }
    }
    if (parsedPower === null) {
      notifyError('Choose a transmit power level from the list.');
      return;
    }
    const saved = saveTrayReaderConfig({
      connectionMode,
      comPrimary: String(primaryCom || comPrimary),
      comSecondary: String(secondaryCom || comSecondary),
      baudRate: String(parsedBaudRate || baudRate),
      powerAttDb10: String(parsedPower)
    });
    setConnectionMode(saved.connectionMode);
    setComPrimary(saved.comPrimary);
    setComSecondary(saved.comSecondary);
    setBaudRate(saved.baudRate);
    setPowerAttDb10(saved.powerAttDb10);
    toast.success('Reader settings saved. Tray scan popup will use these values.');
  };

  return (
    <div className="tray-connect-page">
      {/* Header */}
      <div className="tray-connect-header">
        <div className="tray-header-brand">
          <div className="tray-header-icon">
            <FaSignal />
          </div>
          <div>
            <h1>RFID Tray Connect</h1>
            <p>Monitor and manage your RFID scanning system</p>
          </div>
        </div>
        <div className={`tray-live-chip ${isScanning ? 'tray-live-chip-active' : ''}`}>
          <span className="tray-live-dot" />
          {isScanning ? 'Scanning Live' : 'Idle'}
          <FaChevronDown className="tray-live-chevron" />
        </div>
      </div>

      {!hasBridge && (
        <div className="tray-bridge-warning">
          Electron bridge API not available. Open this page from the packaged/desktop app.
        </div>
      )}

      {/* Config cards */}
      <div className="tray-config-grid">
        <div className="tray-config-card">
          <div className="tray-config-card-head">
            <div className="tray-config-card-icon tray-config-card-icon--serial">
              <FaHdd />
            </div>
            <div>
              <h3 className="tray-config-card-title">Serial Ports</h3>
              <p className="tray-config-card-desc">Configure serial connection for RFID reader</p>
            </div>
          </div>
          <div className={`tray-serial-fields ${!isUsbMode ? 'tray-serial-fields--with-mode' : ''}`}>
            <div>
              <label className="tray-field-label" htmlFor="tray-connection-mode-page">Mode</label>
              <select
                id="tray-connection-mode-page"
                className="tray-input"
                value={connectionMode}
                onChange={(e) => setConnectionMode(e.target.value)}
                disabled={!hasBridge || isBusy}
              >
                {TRAY_CONNECTION_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {!isUsbMode ? (
              <div className="tray-serial-row">
                <div>
                  <label className="tray-field-label" htmlFor="tray-com-primary">Reader 1</label>
                  <input
                    id="tray-com-primary"
                    className="tray-input"
                    value={comPrimary}
                    onChange={(e) => setComPrimary(e.target.value)}
                    placeholder="7"
                    autoComplete="off"
                    disabled={!hasBridge || isBusy}
                  />
                </div>
                <div>
                  <label className="tray-field-label" htmlFor="tray-com-secondary">Reader 2</label>
                  <input
                    id="tray-com-secondary"
                    className="tray-input"
                    value={comSecondary}
                    onChange={(e) => setComSecondary(e.target.value)}
                    placeholder="9"
                    autoComplete="off"
                    disabled={!hasBridge || isBusy}
                  />
                </div>
                <div>
                  <label className="tray-field-label" htmlFor="tray-baud">Baud Rate</label>
                  <select
                    id="tray-baud"
                    className="tray-input"
                    value={baudRate}
                    onChange={(e) => setBaudRate(e.target.value)}
                    disabled={!hasBridge || isBusy}
                  >
                    {['9600', '19200', '38400', '57600', '115200', '230400'].map((rate) => (
                      <option key={rate} value={rate}>{rate}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="tray-config-card-desc" style={{ margin: 0 }}>
                USB tray — uses <code>connect-usb</code>. Place <strong>libusb-1.0.dll</strong> beside UHFAPI.dll in rfid-bridge folder.
              </p>
            )}
          </div>
        </div>

        <div className="tray-config-card">
          <div className="tray-config-card-head">
            <div className="tray-config-card-icon tray-config-card-icon--power">
              <FaSignal />
            </div>
            <div>
              <h3 className="tray-config-card-title">Transmit Power</h3>
              <p className="tray-config-card-desc">Adjust transmit power for optimal scanning</p>
            </div>
          </div>
          <div className="tray-power-slider-wrap">
            <div className="tray-power-slider-row">
              <input
                type="range"
                className="tray-power-slider"
                min={0}
                max={TRAY_POWER_ATT_MAX}
                step={50}
                value={powerAttDb10}
                onChange={(e) => setPowerAttDb10(String(snapPowerAttDb10ToPreset(e.target.value)))}
                onMouseUp={async (e) => {
                  const n = parsePowerAttDb10(snapPowerAttDb10ToPreset(e.target.value));
                  if (n !== null && hasBridge && !isBusy) {
                    try { await runCommand(`set-power ${n}`); } catch (_) { /* surfaced in runCommand */ }
                  }
                }}
                disabled={!hasBridge || isBusy}
                aria-label="Transmit power"
              />
              <span className="tray-power-slider-value">{powerAttDb10}</span>
              <button
                type="button"
                className="tray-power-read-btn"
                onClick={readTrayPowerFromReader}
                disabled={!hasBridge || isBusy}
                title="Read current power from reader"
              >
                <FaSyncAlt /> Read Current
              </button>
            </div>
            <p className="tray-power-hint">0 = strongest &bull; {TRAY_POWER_ATT_MAX} = weakest</p>
          </div>
        </div>
      </div>

      {/* Action toolbar */}
      <div className="tray-actions-toolbar">
        <button type="button" className="tray-btn tray-btn-save" onClick={saveReaderPorts} disabled={isBusy}>
          <FaSave /> Save Settings
        </button>
        <button
          type="button"
          className={`tray-btn tray-btn-primary ${activeAction === 'connect' ? 'tray-btn-active' : ''}`}
          onClick={connectReaders}
          disabled={!hasBridge || isBusy}
        >
          <FaLink /> Connect
        </button>
        <button
          type="button"
          className={`tray-btn tray-btn-success ${isScanning || activeAction === 'scan' ? 'tray-btn-active' : ''}`}
          onClick={startScan}
          disabled={!hasBridge || isBusy || isScanning}
        >
          <FaSearch /> Scan
        </button>
        <button
          type="button"
          className={`tray-btn tray-btn-slate ${activeAction === 'stop' ? 'tray-btn-active' : ''}`}
          onClick={stopScan}
          disabled={!hasBridge || isBusy || !isScanning}
        >
          <FaStop /> Stop
        </button>
        <button
          type="button"
          className={`tray-btn tray-btn-danger ${activeAction === 'disconnect' ? 'tray-btn-active' : ''}`}
          onClick={disconnectReaders}
          disabled={!hasBridge || isBusy}
        >
          <FaPowerOff /> Disconnect
        </button>
        <button
          type="button"
          className={`tray-btn tray-btn-devices ${activeAction === 'devices' ? 'tray-btn-active' : ''}`}
          onClick={refreshDevices}
          disabled={!hasBridge || isBusy}
        >
          <FaHdd /> Devices
        </button>
        <button
          type="button"
          className={`tray-btn tray-btn-outline ${activeAction === 'clear' ? 'tray-btn-active' : ''}`}
          onClick={clearScannedData}
          disabled={isBusy || tagRows.length === 0}
        >
          <FaTrash /> Clear Tags
        </button>
      </div>

      {/* Stats cards */}
      <div className="tray-metrics-grid">
        <div className="tray-stat-card">
          <FaServer className="tray-stat-card-watermark" />
          <div className="tray-stat-card-icon tray-stat-card-icon--blue">
            <FaServer />
          </div>
          <div className="tray-stat-value">{deviceRows.length}</div>
          <div className="tray-stat-label">Active connections</div>
        </div>
        <div className="tray-stat-card">
          <FaTag className="tray-stat-card-watermark" />
          <div className="tray-stat-card-icon tray-stat-card-icon--green">
            <FaTag />
          </div>
          <div className="tray-stat-value">{tagRows.length}</div>
          <div className="tray-stat-label">Unique tags detected</div>
        </div>
        <div className="tray-stat-card">
          <FaChartLine className="tray-stat-card-watermark" />
          <div className="tray-stat-card-icon tray-stat-card-icon--purple">
            <FaChartLine />
          </div>
          <div className="tray-stat-value">{totalReadCount}</div>
          <div className="tray-stat-label">Total tag reads</div>
        </div>
      </div>

      {/* Data tables */}
      <div className="tray-content-grid">
        <div className="tray-card">
          <div className="tray-card-header">
            <div className="tray-card-header-left">
              <FaListUl className="tray-card-header-icon" />
              <h5>Tag Reads</h5>
            </div>
            <div className="tray-card-header-right">
              <span className="tray-muted">{tagRows.length} unique</span>
              {resolvingCodes && <span className="tray-muted" style={{ color: '#2563eb' }}>Resolving…</span>}
              {!!rfidLookupError && (
                <span className="tray-muted" style={{ color: '#dc2626' }} title={rfidLookupError}>API error</span>
              )}
              <button type="button" className="tray-inline-btn" onClick={clearScannedData} disabled={isBusy || tagRows.length === 0}>
                Clear
              </button>
            </div>
          </div>
          {paginatedTagRows.length === 0 ? (
            <div className="tray-empty-state">
              <div className="tray-empty-icon">
                <FaBoxOpen />
              </div>
              <p className="tray-empty-title">No tags received yet</p>
              <p className="tray-empty-desc">Start scanning to see tag reads here.</p>
            </div>
          ) : (
            <>
              <div className="tray-table-wrap">
                <table className="tray-table">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>EPC</th>
                      <th>RFID Code</th>
                      <th>TID</th>
                      <th>RSSI</th>
                      <th>Ant</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTagRows.map((tag) => (
                      <tr key={`${String(tag.tid || '').trim().toUpperCase() || String(tag.epc || '').trim().toUpperCase()}`}>
                        <td>{tag.deviceId}</td>
                        <td className="tray-mono tray-epc">{tag.epc}</td>
                        <td className="tray-mono">{rfidCodeMap[String(tag.epc || '').trim().toUpperCase()] || '-'}</td>
                        <td className="tray-mono">{tag.tid || '-'}</td>
                        <td>{tag.rssi || '-'}</td>
                        <td>{tag.antenna || '-'}</td>
                        <td>{tag.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="tray-pagination">
                <button
                  type="button"
                  className="tray-inline-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  Prev
                </button>
                <span className="tray-muted">Page {currentPage} / {totalPages}</span>
                <button
                  type="button"
                  className="tray-inline-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        <div className="tray-card">
          <div className="tray-card-header">
            <div className="tray-card-header-left">
              <FaNetworkWired className="tray-card-header-icon" />
              <h5>Connected Devices</h5>
            </div>
            <span className="tray-header-pill">{deviceRows.length} Active</span>
          </div>
          {deviceRows.length === 0 ? (
            <div className="tray-empty-state">
              <div className="tray-empty-icon tray-empty-icon--devices">
                <FaNetworkWired />
              </div>
              <p className="tray-empty-title">No connected devices detected</p>
              <p className="tray-empty-desc">Connect a device to see it here.</p>
            </div>
          ) : (
            <div className="tray-table-wrap">
              <table className="tray-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Port</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceRows.map((row) => (
                    <tr key={`${row.id}|${row.port}`}>
                      <td>{row.id}</td>
                      <td>{row.type || '-'}</td>
                      <td>{row.port}</td>
                      <td>{row.ip || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Activity logs — full width footer */}
      <div className="tray-logs-card">
        <div className="tray-card-header">
          <div className="tray-card-header-left">
            <FaTerminal className="tray-card-header-icon" />
            <h5>Activity Logs</h5>
          </div>
          <button type="button" className="tray-inline-btn" onClick={clearLogs} disabled={isBusy || logs.length === 0}>
            Clear
          </button>
        </div>
        <div className="tray-logs-body">
          {logs.length === 0 ? (
            <div className="tray-log-placeholder">
              <span className="tray-log-dot" />
              <span className="tray-log-time">{formatLogTime(Date.now())}</span>
              <span className="tray-log-text">System ready. Waiting for activity…</span>
            </div>
          ) : (
            logs.map((entry, idx) => {
              const text = typeof entry === 'string' ? entry : entry.text;
              const ts = typeof entry === 'string' ? Date.now() : entry.ts;
              return (
                <div key={`${ts}-${idx}`} className="tray-log-entry">
                  <span className={`tray-log-dot ${logDotClass(text)}`} />
                  <span className="tray-log-time">{formatLogTime(ts)}</span>
                  <span className="tray-log-text">{text}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default RFIDTrayConnect;
