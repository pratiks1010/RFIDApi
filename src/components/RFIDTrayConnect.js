import React, { useEffect, useMemo, useState } from 'react';
import { FaBroadcastTower, FaLink, FaListUl, FaMicrochip, FaPlug, FaPowerOff, FaSearch, FaSyncAlt, FaTerminal, FaWaveSquare } from 'react-icons/fa';
import { toast } from 'react-toastify';
import '../styles/RFIDTrayConnect.css';

const RFIDTrayConnect = () => {
  const [comPrimary, setComPrimary] = useState('7');
  const [comSecondary, setComSecondary] = useState('8');
  const [baudRate, setBaudRate] = useState('115200');
  const [isScanning, setIsScanning] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [logs, setLogs] = useState([]);
  const [tagMap, setTagMap] = useState({});
  const [deviceRows, setDeviceRows] = useState([]);
  const [activeAction, setActiveAction] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const hasBridge = typeof window !== 'undefined' && window.electronAPI?.rfidBridgeCommand;

  useEffect(() => {
    if (!hasBridge) return undefined;

    const unsubLine = window.electronAPI.onRfidBridgeLine((line) => {
      setLogs((prev) => [line, ...prev].slice(0, 200));
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
    });

    const unsubTag = window.electronAPI.onRfidBridgeTag((tag) => {
      const key = `${tag.deviceId}|${tag.tid || tag.epc}`;
      setTagMap((prev) => {
        const current = prev[key] || { ...tag, count: 0, firstSeen: new Date().toISOString() };
        return {
          ...prev,
          [key]: {
            ...current,
            ...tag,
            count: current.count + 1,
            lastSeen: new Date().toISOString()
          }
        };
      });
    });

    const unsubError = window.electronAPI.onRfidBridgeError((line) => {
      setLogs((prev) => [`ERROR: ${line}`, ...prev].slice(0, 200));
      toast.error(line || 'Bridge error occurred.');
    });

    window.electronAPI.rfidBridgeEnsure().catch(() => {
      setLogs((prev) => ['ERROR: Failed to start RFID bridge service.', ...prev].slice(0, 200));
      toast.error('Failed to start RFID service.');
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
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const runCommand = async (command) => {
    if (!hasBridge) return;
    try {
      await window.electronAPI.rfidBridgeCommand(command);
    } catch (error) {
      const message = error?.message || 'Failed to run command.';
      setLogs((prev) => [`ERROR: ${message}`, ...prev].slice(0, 200));
      toast.error(message);
      throw error;
    }
  };

  const connectReaders = async () => {
    setActiveAction('connect');
    setIsBusy(true);
    setDeviceRows([]);
    try {
      await runCommand('disconnect');
      await runCommand(`connect-serial ${comPrimary} ${baudRate}`);
      await runCommand(`connect-serial ${comSecondary} ${baudRate}`);
      await runCommand('devices');
      await runCommand('status');
      toast.success('Readers connected and device list refreshed.');
    } finally {
      setIsBusy(false);
      setActiveAction('');
    }
  };

  const startScan = async () => {
    setActiveAction('scan');
    setIsBusy(true);
    try {
      setTagMap({});
      setCurrentPage(1);
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
    setCurrentPage(1);
    setTimeout(() => setActiveAction((prev) => (prev === 'clear' ? '' : prev)), 300);
  };

  const clearLogs = () => {
    setLogs([]);
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
          <div className="tray-compact-row">
            <div className="tray-field tray-field-com">
              <label className="tray-field-label">Reader 1 Port</label>
              <input className="form-control tray-input" value={comPrimary} onChange={(e) => setComPrimary(e.target.value)} />
            </div>
            <div className="tray-field tray-field-com">
              <label className="tray-field-label">Reader 2 Port</label>
              <input className="form-control tray-input" value={comSecondary} onChange={(e) => setComSecondary(e.target.value)} />
            </div>
            <div className="tray-field tray-field-baud">
              <label className="tray-field-label">Port Speed (Baud)</label>
              <input className="form-control tray-input" value={baudRate} onChange={(e) => setBaudRate(e.target.value)} />
            </div>
            <div className="tray-action-row">
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
              className={`tray-btn tray-btn-warning ${activeAction === 'stop' ? 'tray-btn-active' : ''}`}
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
              Clear Tags
            </button>
            </div>
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
                    <th>TID</th>
                    <th>RSSI</th>
                    <th>Ant</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTagRows.map((tag) => (
                    <tr key={`${tag.deviceId}|${tag.tid || tag.epc}`}>
                      <td>{tag.deviceId}</td>
                      <td className="tray-mono tray-epc">{tag.epc}</td>
                      <td className="tray-mono">{tag.tid || '-'}</td>
                      <td>{tag.rssi || '-'}</td>
                      <td>{tag.antenna || '-'}</td>
                      <td>{tag.count}</td>
                    </tr>
                  ))}
                  {paginatedTagRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-3">No tags received yet.</td>
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
