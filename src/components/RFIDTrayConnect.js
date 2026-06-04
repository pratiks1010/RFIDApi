import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { FaBolt, FaDownload, FaEraser, FaLink, FaListUl, FaMicrochip, FaPlug, FaPowerOff, FaSearch, FaSyncAlt, FaTerminal, FaWaveSquare } from 'react-icons/fa';
import { toast } from 'react-toastify';
import '../styles/RFIDTrayConnect.css';
import { toSoniApiUrl } from '../services/apiBaseConfig';
import {
  getTrayReaderConfig,
  saveTrayReaderConfig,
  parsePowerAttDb10,
  snapPowerAttDb10ToPreset,
  TRAY_POWER_ATT_MAX,
  TRAY_POWER_PRESET_OPTIONS
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
  const [comPrimary, setComPrimary] = useState(initialReaderConfig.comPrimary);
  const [comSecondary, setComSecondary] = useState(initialReaderConfig.comSecondary);
  const [baudRate, setBaudRate] = useState(initialReaderConfig.baudRate);
  const [powerAttDb10, setPowerAttDb10] = useState(initialReaderConfig.powerAttDb10);
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

  const appendLog = (line) => {
    const text = String(line || '').trim();
    if (!text) return;
    setLogs((prev) => [text, ...prev].slice(0, 200));
  };

  const normalizeComNumber = (value) => String(value || '').trim().replace(/^COM/i, '');
  const parseComNumber = (value) => {
    const normalized = normalizeComNumber(value);
    const parsed = Number.parseInt(normalized, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };
  const parseBaudRate = (value) => {
    const parsed = Number.parseInt(String(value || '').trim(), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  const getBridgeErrorMessage = (rawMessage) => {
    const message = String(rawMessage || '').trim();
    const lower = message.toLowerCase();
    if (!message) return 'RFID bridge failed.';
    if (lower.includes('unable to load dll') && lower.includes('uhfapi.dll')) {
      return 'RFID reader SDK could not load (UHFAPI.dll). Reinstall the desktop app from the latest Setup.exe, then restart the PC. If it persists, plug the tray USB in and check Device Manager for a COM port.';
    }
    if (lower.includes('rfid bridge bundle is incomplete') || lower.includes('sdk files are missing')) {
      return message;
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

  const evaluateSerialConnectAttempt = (lines, comNumber) => {
    const text = lines.join('\n').toLowerCase();
    const successNeedle = `connected via serial com${comNumber}`.toLowerCase();
    if (text.includes(successNeedle)) {
      return { ok: true, message: `COM${comNumber} connected.` };
    }
    if (text.includes('invalid com number')) {
      return { ok: false, message: `COM${comNumber} invalid. Use number only (example: ${comNumber}).` };
    }
    if (text.includes('serial connect failed')) {
      return { ok: false, message: `COM${comNumber} connection failed. Check cable, driver, and port ownership.` };
    }
    if (text.includes('unable to load dll') && text.includes('uhfapi.dll')) {
      return { ok: false, message: 'RFID SDK DLL missing (UHFAPI.dll).' };
    }
    return {
      ok: null,
      message: `No explicit response for COM${comNumber} yet.`
    };
  };

  useEffect(() => {
    deviceRowsRef.current = deviceRows;
  }, [deviceRows]);

  useEffect(() => {
    if (!hasBridge) return undefined;

    const unsubLine = window.electronAPI.onRfidBridgeLine((line) => {
      setLogs((prev) => [line, ...prev].slice(0, 200));
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
      setLogs((prev) => [`ERROR: ${mapped}`, ...prev].slice(0, 200));
      bridgeLineHistoryRef.current.push(`ERROR: ${mapped}`);
      if (bridgeLineHistoryRef.current.length > 600) {
        bridgeLineHistoryRef.current = bridgeLineHistoryRef.current.slice(-600);
      }
      notifyError(mapped);
    });

    window.electronAPI.rfidBridgeEnsure().catch(() => {
      const message = 'Failed to start RFID bridge service. Reopen app and verify tray bridge files.';
      setLogs((prev) => [`ERROR: ${message}`, ...prev].slice(0, 200));
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
    const primaryCom = parseComNumber(comPrimary);
    const secondaryCom = parseComNumber(comSecondary);
    const parsedBaudRate = parseBaudRate(baudRate);
    if (!primaryCom || !secondaryCom) {
      notifyError('Invalid COM port. Enter port numbers only (example: 7 and 8).');
      return;
    }
    if (!parsedBaudRate) {
      notifyError('Invalid baud rate. Enter a numeric value (example: 115200).');
      return;
    }

    setActiveAction('connect');
    setIsBusy(true);
    setDeviceRows([]);
    sdkConnectedCountRef.current = 0;
    appendLog(`INFO: Connect requested for COM${primaryCom}, COM${secondaryCom} @ ${parsedBaudRate}`);
    try {
      await runCommand('disconnect');

      const primaryStart = bridgeLineHistoryRef.current.length;
      await runCommand(`connect-serial ${primaryCom} ${parsedBaudRate}`);
      const primaryAttempt = evaluateSerialConnectAttempt(
        await waitForBridgeResponse(primaryStart),
        primaryCom
      );

      const secondaryStart = bridgeLineHistoryRef.current.length;
      await runCommand(`connect-serial ${secondaryCom} ${parsedBaudRate}`);
      const secondaryAttempt = evaluateSerialConnectAttempt(
        await waitForBridgeResponse(secondaryStart),
        secondaryCom
      );

      await runCommand('devices');
      await runCommand('status');
      await waitMs(260);

      const okCount = Number(primaryAttempt.ok === true) + Number(secondaryAttempt.ok === true);
      const failedAttempts = [primaryAttempt, secondaryAttempt].filter((item) => item.ok === false);
      const unknownAttempts = [primaryAttempt, secondaryAttempt].filter((item) => item.ok === null);
      const parsedDeviceCount = deviceRowsRef.current.length;
      const sdkDeviceCount = sdkConnectedCountRef.current;
      const effectiveDeviceCount = Math.max(parsedDeviceCount, sdkDeviceCount);

      const parsedPower = parsePowerAttDb10(powerAttDb10);
      if (parsedPower !== null && (okCount > 0 || effectiveDeviceCount > 0)) {
        try {
          await runCommand(`set-power ${parsedPower}`);
        } catch (_) {
          /* runCommand already surfaced */
        }
      }

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

  const applyTrayPowerNow = async () => {
    const n = parsePowerAttDb10(powerAttDb10);
    if (n === null) {
      notifyError('Choose a transmit power level from the list.');
      return;
    }
    setIsBusy(true);
    try {
      await runCommand(`set-power ${n}`);
    } finally {
      setIsBusy(false);
    }
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
    if (!primaryCom || !secondaryCom) {
      notifyError('Invalid COM port. Enter numbers only before saving (example: 7 and 8).');
      return;
    }
    if (!parsedBaudRate) {
      notifyError('Invalid baud rate. Enter numeric value before saving (example: 115200).');
      return;
    }
    if (parsedPower === null) {
      notifyError('Choose a transmit power level from the list.');
      return;
    }
    const saved = saveTrayReaderConfig({
      comPrimary: String(primaryCom),
      comSecondary: String(secondaryCom),
      baudRate: String(parsedBaudRate),
      powerAttDb10: String(parsedPower)
    });
    setComPrimary(saved.comPrimary);
    setComSecondary(saved.comSecondary);
    setBaudRate(saved.baudRate);
    setPowerAttDb10(saved.powerAttDb10);
    toast.success('Reader settings saved. Tray scan popup will use these values.');
  };

  return (
    <div className="tray-connect-page">
      <div className="tray-connect-header">
        <div>
         
          <h1>RFID Tray Connect</h1>

        </div>
        <div className={`tray-live-chip ${isScanning ? 'tray-live-chip-active' : ''}`}>
          <span className="tray-live-dot" />
          {isScanning ? 'Scanning Live' : 'Idle'}
        </div>
      </div>

      <div className="tray-connect-shell">
        <div className="tray-control-panel">
          
          {!hasBridge && (
            <div className="alert alert-warning mb-3">
              Electron bridge API not available. Open this page from the packaged/desktop app.
            </div>
          )}
          <div className="tray-settings-split">
            <div className="tray-settings-col tray-settings-col-ports">
              <div className="tray-panel-section">
                <div className="tray-panel-section-title">Serial ports</div>
                <div className="tray-form-grid-ports">
                  <div className="tray-field">
                    <label className="tray-field-label tray-field-label-compact" htmlFor="tray-com-primary">Reader 1</label>
                    <input id="tray-com-primary" className="form-control tray-input tray-input-port" value={comPrimary} onChange={(e) => setComPrimary(e.target.value)} placeholder="7" autoComplete="off" />
                  </div>
                  <div className="tray-field">
                    <label className="tray-field-label tray-field-label-compact" htmlFor="tray-com-secondary">Reader 2</label>
                    <input id="tray-com-secondary" className="form-control tray-input tray-input-port" value={comSecondary} onChange={(e) => setComSecondary(e.target.value)} placeholder="8" autoComplete="off" />
                  </div>
                  <div className="tray-field">
                    <label className="tray-field-label tray-field-label-compact" htmlFor="tray-baud">Baud</label>
                    <input id="tray-baud" className="form-control tray-input tray-input-baud" value={baudRate} onChange={(e) => setBaudRate(e.target.value)} placeholder="115200" autoComplete="off" />
                  </div>
                </div>
              </div>
            </div>

            <div className="tray-settings-col tray-settings-col-power">
              <div className="tray-panel-section tray-panel-section-power">
                <div className="tray-power-block">
                  <div className="tray-power-head">
                    <span className="tray-panel-title-text tray-panel-title-text--block">Transmit power</span>
                    <p className="tray-power-desc">
                      Presets 0–{TRAY_POWER_ATT_MAX} (0 = strongest · {TRAY_POWER_ATT_MAX} = weakest). Saved for all tray scans.
                    </p>
                  </div>
                  <div className="tray-power-inline-row">
                    <select
                      id="tray-power-select"
                      className="form-select tray-input tray-power-select tray-power-select-compact"
                      value={powerAttDb10}
                      onChange={(e) => setPowerAttDb10(e.target.value)}
                      disabled={!hasBridge || isBusy}
                      aria-label="Transmit power preset"
                    >
                      {TRAY_POWER_PRESET_OPTIONS.map((opt) => (
                        <option key={opt.value} value={String(opt.value)}>
                          {opt.label} ({opt.value})
                        </option>
                      ))}
                    </select>
                    <div className="tray-power-commands tray-power-commands-inline">
                      <button
                        type="button"
                        className="tray-btn tray-btn-power-apply"
                        onClick={applyTrayPowerNow}
                        disabled={!hasBridge || isBusy}
                        title="Apply selected power to the reader"
                      >
                        <FaBolt aria-hidden className="tray-power-btn-icon" />
                        Apply
                      </button>
                      <button
                        type="button"
                        className="tray-btn tray-btn-power-read"
                        onClick={readTrayPowerFromReader}
                        disabled={!hasBridge || isBusy}
                        title="Read current power level from the reader"
                      >
                        <FaDownload aria-hidden className="tray-power-btn-icon" />
                        Read
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="tray-panel-divider" aria-hidden />

          <div className="tray-actions-toolbar">
            <button
              type="button"
              className="tray-btn tray-btn-ghost"
              onClick={saveReaderPorts}
              disabled={isBusy}
            >
              <FaPlug />
              Save settings
            </button>
            <button
              type="button"
              className={`tray-btn tray-btn-primary ${activeAction === 'connect' ? 'tray-btn-active' : ''}`}
              onClick={connectReaders}
              disabled={!hasBridge || isBusy}
            >
              <FaLink />
              Connect
            </button>
            <button
              type="button"
              className={`tray-btn tray-btn-success ${isScanning || activeAction === 'scan' ? 'tray-btn-active' : ''}`}
              onClick={startScan}
              disabled={!hasBridge || isBusy || isScanning}
            >
              <FaSearch />
              Scan
            </button>
            <button
              type="button"
              className={`tray-btn tray-btn-slate ${activeAction === 'stop' ? 'tray-btn-active' : ''}`}
              onClick={stopScan}
              disabled={!hasBridge || isBusy || !isScanning}
            >
              <FaPowerOff />
              Stop
            </button>
            <button
              type="button"
              className={`tray-btn tray-btn-danger ${activeAction === 'disconnect' ? 'tray-btn-active' : ''}`}
              onClick={disconnectReaders}
              disabled={!hasBridge || isBusy}
            >
              <FaPowerOff />
              Disconnect
            </button>
            <button
              type="button"
              className={`tray-btn tray-btn-ghost ${activeAction === 'devices' ? 'tray-btn-active' : ''}`}
              onClick={refreshDevices}
              disabled={!hasBridge || isBusy}
            >
              <FaSyncAlt />
              Devices
            </button>
            <button
              type="button"
              className={`tray-btn tray-btn-clear ${activeAction === 'clear' ? 'tray-btn-active' : ''}`}
              onClick={clearScannedData}
              disabled={isBusy || tagRows.length === 0}
            >
              <FaEraser />
              Clear tags
            </button>
          </div>
        </div>

        <div className="tray-metrics-grid">
          <div className="tray-metric-card tray-metric-card-devices">
            <div className="tray-metric-top">
              <span className="tray-metric-icon">
                <FaMicrochip />
              </span>
              <span>Connected Devices: <strong>{deviceRows.length}</strong></span>
            </div>
          </div>
          <div className="tray-metric-card tray-metric-card-unique">
            <div className="tray-metric-top">
              <span className="tray-metric-icon">
                <FaListUl />
              </span>
              <span>Unique Tags: <strong>{tagRows.length}</strong></span>
            </div>
          </div>
          <div className="tray-metric-card tray-metric-card-total">
            <div className="tray-metric-top">
              <span className="tray-metric-icon">
                <FaWaveSquare />
              </span>
              <span>Total Reads: <strong>{totalReadCount}</strong></span>
            </div>
          </div>
        </div>

        <div className="tray-content-grid">
          <div className="tray-card tray-card-large">
            <div className="tray-card-header">
              <h5>
                <FaListUl />
                Tag Reads
              </h5>
              <div className="d-flex align-items-center gap-2">
                <span className="tray-muted">{tagRows.length} unique</span>
                <span className="tray-muted" style={{ color: resolvingCodes ? '#1d4ed8' : '#475569' }}>
                  {resolvingCodes ? 'RFID resolving...' : 'RFID synced'}
                </span>
                {!!rfidLookupError && (
                  <span className="tray-muted" style={{ color: '#dc2626' }}>
                    RFID API error: {rfidLookupError}
                  </span>
                )}
                <button type="button" className="tray-inline-btn" onClick={clearScannedData} disabled={isBusy || tagRows.length === 0}>
                  Clear
                </button>
              </div>
            </div>
            <div className="table-responsive tray-table-wrap">
              <table className="table table-sm tray-table tray-table-compact">
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
                  {paginatedTagRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-3">No tags received yet.</td>
                    </tr>
                  )}
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
          </div>

          <div className="tray-side-stack">
            <div className="tray-card">
              <div className="tray-card-header">
                <h5>
                  <FaListUl />
                  Connected Devices
                </h5>
                <span className="tray-header-pill">{deviceRows.length} Active</span>
              </div>
              <div className="table-responsive tray-table-wrap">
                <table className="table table-sm tray-table tray-table-compact">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Port</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deviceRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-3">
                          No connected devices detected.
                        </td>
                      </tr>
                    )}
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
            </div>

            <div className="tray-card">
              <div className="tray-card-header">
                <h5>
                  <FaTerminal />
                  Activity Logs
                </h5>
                <button type="button" className="tray-inline-btn" onClick={clearLogs} disabled={isBusy || logs.length === 0}>
                  Clear
                </button>
              </div>
              <pre className="tray-log-view">
                {logs.length ? logs.join('\n') : 'No logs yet.'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RFIDTrayConnect;
