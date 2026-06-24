import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AutoPushStockUtility.css";
import { toRrgoldApiUrl } from "../services/apiBaseConfig";
import ExeApiModeBanner from "./common/ExeApiModeBanner";
import {
  extractAutoPushUsername as extractUserName,
  extractClientCodeFromToken as extractClientCode,
  getTemplateRowId,
  defaultTemplateStorageKey,
  mapExcelDataToSystemFields,
  sendAutoPushMappedData,
  parseTemplatesFromApiResponse,
} from "../services/autoPushStockSyncService";

function AutoPushStockUtility() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  const username = useMemo(() => extractUserName(token) || "default", [token]);
  const clientCode = useMemo(() => extractClientCode(token), [token]);

  const [sourceFolder, setSourceFolder] = useState("");
  const [destinationFolder, setDestinationFolder] = useState("");
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [excelFiles, setExcelFiles] = useState([]);
  const [processedFiles, setProcessedFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [defaultTemplateHint, setDefaultTemplateHint] = useState("");
  const [lastScanTime, setLastScanTime] = useState(null);
  const [lastScanAgo, setLastScanAgo] = useState(null);

  const monitoringIntervalRef = useRef(null);
  const isCheckingFilesRef = useRef(false);
  const loadingFileNamesRef = useRef(new Set());
  const readRetryCountRef = useRef(new Map());
  const autoProcessTriggeredRef = useRef(new Set());
  const processedFilesRef = useRef([]);
  const excelFilesRef = useRef([]);
  const excelDataRef = useRef([]);
  const currentFileRef = useRef(null);
  const sourceFolderRef = useRef("");

  processedFilesRef.current = processedFiles;
  excelFilesRef.current = excelFiles;
  excelDataRef.current = excelData;
  currentFileRef.current = currentFile;
  sourceFolderRef.current = sourceFolder;

  useEffect(() => {
    if (!isMonitoring || lastScanTime == null) {
      setLastScanAgo(null);
      return undefined;
    }
    const update = () => setLastScanAgo(Math.floor((Date.now() - lastScanTime) / 1000));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [isMonitoring, lastScanTime]);

  useEffect(() => {
    loadConfig();
    if (clientCode) {
      fetchTemplates();
    }
  }, [clientCode, username]);

  useEffect(() => {
    if (!clientCode) {
      setDefaultTemplateHint("");
      return;
    }
    try {
      const raw = localStorage.getItem(defaultTemplateStorageKey(clientCode, username));
      if (!raw) {
        setDefaultTemplateHint("");
        return;
      }
      const o = JSON.parse(raw);
      const name = String(o.templateName || "").trim();
      const id = String(o.templateId || "").trim();
      if (name) setDefaultTemplateHint(`Saved default: ${name}`);
      else if (id) setDefaultTemplateHint(`Saved default (id): ${id}`);
      else setDefaultTemplateHint("");
    } catch {
      setDefaultTemplateHint("");
    }
  }, [clientCode, username]);

  useEffect(() => {
    if (templates.length === 0) {
      setSelectedTemplate(null);
      return;
    }
    setSelectedTemplate((prev) => {
      const matchPrevInList = (p) => {
        if (!p) return null;
        const pid = String(p.TemplateID || p.TemplateId || p.id || "").trim();
        const pname = String(p.TemplateName || "").trim();
        return (
          templates.find((template) => {
            const tid = String(template.TemplateID || template.TemplateId || template.id || "").trim();
            if (pid && tid && pid === tid) return true;
            const tname = String(template.TemplateName || "").trim();
            return pname && tname && tname === pname;
          }) || null
        );
      };

      if (prev) {
        const still = matchPrevInList(prev);
        if (still) return still;
      }

      let pref = null;
      try {
        const raw = localStorage.getItem(defaultTemplateStorageKey(clientCode, username));
        pref = raw ? JSON.parse(raw) : null;
      } catch {
        pref = null;
      }
      const prefId = String(pref?.templateId || "").trim();
      const prefName = String(pref?.templateName || "").trim();

      if (prefId) {
        const byId = templates.find(
          (template, idx) => getTemplateRowId(template, idx) === prefId
        );
        if (byId) return byId;
      }
      if (prefName) {
        const byName = templates.find(
          (template) =>
            String(template.TemplateName || "").trim().toLowerCase() === prefName.toLowerCase()
        );
        if (byName) return byName;
      }
      return templates[0];
    });
  }, [templates, clientCode, username]);

  useEffect(() => {
    if (!selectedTemplate?.parsedData) return;
    excelData.forEach((entry) => {
      if (entry.processed || !entry.filePath || !entry.data?.length) return;
      if (autoProcessTriggeredRef.current.has(entry.fileName)) return;
      autoProcessTriggeredRef.current.add(entry.fileName);
      processExcelFile(entry).catch((err) => {
        setError(`Error auto-processing ${entry.fileName}: ${err.message}`);
        autoProcessTriggeredRef.current.delete(entry.fileName);
      });
    });
  }, [excelData, selectedTemplate]);

  useEffect(() => {
    if (sourceFolder && window.electronAPI && !isMonitoring) {
      const timer = setTimeout(() => startMonitoring(), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [sourceFolder]);

  useEffect(() => () => {
    if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoadingConfig(true);
      if (window.electronAPI?.getConfig && username) {
        const config = await window.electronAPI.getConfig(username);
        if (config?.sourceFolder) setSourceFolder(config.sourceFolder);
        if (config?.destinationFolder) setDestinationFolder(config.destinationFolder);
      }
    } catch {
      // Ignore config load failure and continue with defaults.
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const fetchTemplates = async () => {
    if (!clientCode) return;
    setLoadingTemplates(true);
    setError("");
    try {
      const authToken = localStorage.getItem("authToken") || localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const response = await fetch(toRrgoldApiUrl("/api/Invoice/alltemplate"), {
        method: "POST",
        headers,
        body: JSON.stringify({ ClientCode: clientCode }),
        mode: "cors",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setTemplates(parseTemplatesFromApiResponse(data));
    } catch (err) {
      setError(`Failed to fetch templates: ${err.message}`);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const saveConfig = async (nextSourceFolder = sourceFolder, nextDestinationFolder = destinationFolder) => {
    try {
      if (window.electronAPI?.saveConfig && username) {
        await window.electronAPI.saveConfig(username, {
          sourceFolder: nextSourceFolder,
          destinationFolder: nextDestinationFolder,
        });
      }
    } catch {
      // Silent save failure.
    }
  };

  const handleFolderPathChange = async (type, value) => {
    if (type === "source") {
      const wasMonitoring = isMonitoring;
      if (wasMonitoring) stopMonitoring();
      setSourceFolder(value);
      await saveConfig(value, destinationFolder);
      if (wasMonitoring && value) setTimeout(() => startMonitoring(), 500);
    } else {
      setDestinationFolder(value);
      await saveConfig(sourceFolder, value);
    }
  };

  const selectFolder = async (type) => {
    try {
      if (!window.electronAPI?.selectFolder) {
        setError("Folder selection is available only in Electron app mode.");
        return;
      }
      const folderPath = await window.electronAPI.selectFolder();
      if (!folderPath) return;
      if (type === "source") {
        setSourceFolder(folderPath);
        await saveConfig(folderPath, destinationFolder);
      } else {
        setDestinationFolder(folderPath);
        await saveConfig(sourceFolder, folderPath);
      }
      setStatus(`${type === "source" ? "Source" : "Destination"} folder selected`);
      setTimeout(() => setStatus(""), 2000);
    } catch (err) {
      setError(`Error selecting folder: ${err.message}`);
    }
  };

  const readExcelFile = async (filePath) => {
    try {
      if (!window.electronAPI?.readExcel) return null;
      return await window.electronAPI.readExcel(filePath);
    } catch {
      return null;
    }
  };

  const isTransientReadError = (message = "") => {
    const msg = String(message).toLowerCase();
    return msg.includes("ebusy") || msg.includes("eacces") || msg.includes("eperm") || msg.includes("locked");
  };

  const scheduleReadRetry = (filePath, fileName, reason) => {
    const current = readRetryCountRef.current.get(fileName) || 0;
    const next = current + 1;
    const maxRetries = 3;
    if (next > maxRetries) {
      readRetryCountRef.current.delete(fileName);
      setError(`Could not read ${fileName} after ${maxRetries} retries. ${reason}`);
      return;
    }
    readRetryCountRef.current.set(fileName, next);
    const delayMs = 700 * next;
    setStatus(`Waiting for ${fileName} copy completion... retry ${next}/${maxRetries}`);
    setTimeout(() => {
      readAndDisplayExcel(filePath, fileName);
    }, delayMs);
  };

  const moveFile = async (sourcePath, destinationPath) => {
    try {
      if (!window.electronAPI?.moveFile) return false;
      const result = await window.electronAPI.moveFile(sourcePath, destinationPath);
      return result === true || result === undefined || result === null;
    } catch {
      return false;
    }
  };

  const getExcelFiles = async (folderPath) => {
    try {
      if (!window.electronAPI?.getExcelFiles) return [];
      return await window.electronAPI.getExcelFiles(folderPath);
    } catch {
      return [];
    }
  };

  const readAndDisplayExcel = async (filePath, fileName) => {
    if (loadingFileNamesRef.current.has(fileName)) return;
    if (excelData.some((entry) => entry.fileName === fileName && !entry.processed)) return;
    if (processedFiles.some((entry) => entry.fileName === fileName && entry.moved)) return;
    loadingFileNamesRef.current.add(fileName);
    setCurrentFile(fileName);
    setStatus(`Reading ${fileName}...`);
    setError("");
    try {
      const result = await readExcelFile(filePath);
      if (!result) {
        scheduleReadRetry(filePath, fileName, "File may be incomplete or locked");
        return;
      }
      let excelRows = [];
      let headers = [];
      if (result.rows?.length > 0) {
        excelRows = result.rows;
        headers = result.headers || [];
      } else if (result.data?.length > 0) {
        excelRows = result.data;
        headers = result.data[0] ? Object.keys(result.data[0]) : [];
      } else {
        scheduleReadRetry(filePath, fileName, "No data found");
        return;
      }
      const fileData = {
        fileName,
        data: excelRows,
        headers,
        totalRows: excelRows.length,
        timestamp: new Date(),
        filePath,
        processed: false,
      };
      setExcelData((prev) => {
        if (prev.some((entry) => entry.fileName === fileName && !entry.processed)) return prev;
        return [...prev, fileData];
      });
      readRetryCountRef.current.delete(fileName);
      setStatus(`Loaded ${excelRows.length} rows from ${fileName}`);
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      if (isTransientReadError(err.message)) {
        scheduleReadRetry(filePath, fileName, err.message);
      } else {
        setError(`Error reading ${fileName}: ${err.message}`);
      }
    } finally {
      loadingFileNamesRef.current.delete(fileName);
      setCurrentFile(null);
    }
  };

  const processExcelFile = async (fileData) => {
    if (!fileData) return;
    const { fileName, filePath, data: excelRows, headers } = fileData;
    setCurrentFile(fileName);
    setStatus(`Processing ${fileName}...`);
    setError("");
    try {
      if (!selectedTemplate?.parsedData) {
        setError("Please select a template first");
        return;
      }
      const mappedData = mapExcelDataToSystemFields(clientCode, excelRows, selectedTemplate.parsedData);
      if (!mappedData.length) {
        setError(`No data mapped from ${fileName}`);
        return;
      }
      await sendAutoPushMappedData(mappedData);
      let fileMoved = false;
      let moveError = null;
      if (destinationFolder && filePath) {
        const separator = destinationFolder.includes("\\") ? "\\" : "/";
        const destPath = `${destinationFolder}${separator}${fileName}`;
        fileMoved = await moveFile(filePath, destPath);
        if (fileMoved) {
          setProcessedFiles((prev) => [...prev, { fileName, timestamp: new Date(), moved: true, filePath: destPath }]);
          setExcelFiles((prev) => prev.filter((file) => file.name !== fileName));
        } else {
          moveError = "Failed to move file to destination folder";
        }
      } else {
        moveError = "Destination folder or source file path missing";
      }
      setExcelData((prev) =>
        fileMoved
          ? prev.filter((item) => item.fileName !== fileName)
          : prev.map((item) =>
              item.fileName === fileName
                ? {
                    ...item,
                    mappedCount: mappedData.length,
                    templateName: selectedTemplate.TemplateName,
                    processed: true,
                    processedAt: new Date(),
                    moved: false,
                    moveError,
                  }
                : item
            )
      );
      setStatus(
        fileMoved
          ? `Successfully sent and moved ${fileName}`
          : `Sent ${fileName} to API. File move pending or failed.`
      );
      setTimeout(() => setStatus(""), 5000);
    } catch (err) {
      setError(`Error processing ${fileName}: ${err.message}`);
    } finally {
      setCurrentFile(null);
    }
  };

  const startMonitoring = async () => {
    if (!sourceFolder) {
      setError("Please select source folder first");
      return;
    }
    if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);
    setIsMonitoring(true);
    setStatus("Monitoring started");
    setError("");
    const checkForNewFiles = async () => {
      if (isCheckingFilesRef.current) return;
      const folder = sourceFolderRef.current;
      if (!folder) return;
      isCheckingFilesRef.current = true;
      setLastScanTime(Date.now());
      try {
        const files = await getExcelFiles(folder);
        const processed = processedFilesRef.current;
        const inFolder = excelFilesRef.current;
        const data = excelDataRef.current;
        const current = currentFileRef.current;
        const newFiles = files.filter((file) => {
          const isProcessed = processed.some((entry) => entry.fileName === file.name && entry.moved);
          const isListed = inFolder.some((entry) => entry.name === file.name);
          const isCurrent = current === file.name;
          const inData = data.some((entry) => entry.fileName === file.name && !entry.processed);
          const loading = loadingFileNamesRef.current.has(file.name);
          return !isProcessed && !isListed && !isCurrent && !inData && !loading;
        });
        if (newFiles.length > 0) {
          for (const file of newFiles) {
            // eslint-disable-next-line no-await-in-loop
            await readAndDisplayExcel(file.path, file.name);
          }
          setExcelFiles((prev) => {
            const existing = prev.map((file) => file.name);
            const add = newFiles.filter((file) => !existing.includes(file.name));
            return [...prev, ...add];
          });
        }
      } catch (err) {
        setError(`Monitoring error: ${err.message}`);
      } finally {
        isCheckingFilesRef.current = false;
      }
    };
    await checkForNewFiles();
    monitoringIntervalRef.current = setInterval(checkForNewFiles, 2000);
  };

  const stopMonitoring = () => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
    setIsMonitoring(false);
    setLastScanTime(null);
    setStatus("Monitoring stopped");
  };

  const loadExistingFiles = async () => {
    if (!sourceFolder) return;
    const files = await getExcelFiles(sourceFolder);
    setExcelFiles(files);
    for (const file of files) {
      if (loadingFileNamesRef.current.has(file.name)) continue;
      if (processedFiles.some((entry) => entry.fileName === file.name)) continue;
      if (excelData.some((entry) => entry.fileName === file.name && !entry.processed)) continue;
      // eslint-disable-next-line no-await-in-loop
      await readAndDisplayExcel(file.path, file.name);
    }
  };

  const saveCurrentTemplateAsDefault = () => {
    if (!selectedTemplate || !clientCode) return;
    const rowIndex = templates.findIndex((t) => t === selectedTemplate);
    let templateId = "";
    const templateName = String(selectedTemplate.TemplateName || "").trim();
    if (rowIndex >= 0) {
      templateId = getTemplateRowId(templates[rowIndex], rowIndex);
    } else {
      const byKeys = templates.findIndex(
        (t) =>
          String(t.TemplateID || t.TemplateId || t.id || "") ===
          String(selectedTemplate.TemplateID || selectedTemplate.TemplateId || selectedTemplate.id || "")
      );
      if (byKeys >= 0) templateId = getTemplateRowId(templates[byKeys], byKeys);
    }
    if (!templateId && !templateName) return;
    try {
      localStorage.setItem(
        defaultTemplateStorageKey(clientCode, username),
        JSON.stringify({ templateId, templateName, savedAt: new Date().toISOString() })
      );
    } catch {
      return;
    }
    if (templateName) setDefaultTemplateHint(`Saved default: ${templateName}`);
    else setDefaultTemplateHint(`Saved default (id): ${templateId}`);
    setStatus("Default template saved for Auto Push.");
    setTimeout(() => setStatus(""), 2500);
  };

  const selectedTemplateId = selectedTemplate
    ? (() => {
        for (let idx = 0; idx < templates.length; idx += 1) {
          const template = templates[idx];
          const templateId = String(template.TemplateID || template.TemplateId || template.id || `temp_${idx}`);
          const selectedId = String(
            selectedTemplate.TemplateID || selectedTemplate.TemplateId || selectedTemplate.id || ""
          );
          if (
            templateId === selectedId ||
            template.TemplateName === selectedTemplate.TemplateName ||
            template === selectedTemplate
          ) {
            return templateId;
          }
        }
        return String(selectedTemplate.TemplateID || selectedTemplate.TemplateId || selectedTemplate.id || "");
      })()
    : "";
  const selectedTemplateFieldCount = selectedTemplate?.parsedData
    ? Object.keys(selectedTemplate.parsedData).length
    : 0;

  if (isLoadingConfig) {
    return (
      <div className="autopush-loading-wrap">
        <div className="autopush-spinner" />
      </div>
    );
  }

  return (
    <div className="autopush-page">
      <div className="autopush-topbar">
        <button
          type="button"
          className="autopush-back-btn"
          onClick={() => navigate("/rfid-utility")}
        >
          <span aria-hidden="true">←</span>
          Back to All Utilities
        </button>
      </div>

      <div className="autopush-header-card">
        <div className="autopush-header">
          <h2>Auto Push Stock Utility</h2>
          <p>Monitor source folder, auto-map template fields, push records to API, and archive processed files.</p>
          <ExeApiModeBanner />
        </div>
        <div className="autopush-kpi">
          <div className="autopush-kpi-item autopush-kpi-purple">
            <span>Templates : {templates.length}</span>
          </div>
          <div className="autopush-kpi-item autopush-kpi-cyan">
            <span>Queued : {excelData.length}</span>
          </div>
          <div className="autopush-kpi-item autopush-kpi-green">
            <span>Processed : {processedFiles.length}</span>
          </div>
        </div>
      </div>

      <div className="autopush-config">
        <div className="autopush-row">
          <label>Template</label>
          <select
            value={selectedTemplateId}
            onChange={(event) => {
              const id = event.target.value;
              if (!id) {
                setSelectedTemplate(null);
                return;
              }
              const found = templates.find(
                (template, idx) =>
                  String(template.TemplateID || template.TemplateId || template.id || `temp_${idx}`) === id
              );
              if (found) setSelectedTemplate(found);
            }}
          >
            <option value="">Select template</option>
            {templates.map((template, idx) => (
              <option
                key={template.TemplateID || idx}
                value={String(template.TemplateID || template.TemplateId || template.id || `temp_${idx}`)}
              >
                {template.TemplateName || `Template ${idx + 1}`}
              </option>
            ))}
          </select>
          <button type="button" onClick={fetchTemplates} disabled={loadingTemplates || !clientCode}>
            {loadingTemplates ? "Loading..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={saveCurrentTemplateAsDefault}
            disabled={!selectedTemplate || !clientCode}
            title="Remember this template for next visit (saved on this device)"
          >
            Set as default
          </button>
          {defaultTemplateHint ? (
            <p
              className="autopush-default-hint"
              style={{ gridColumn: "1 / -1", margin: "2px 0 0", fontSize: 12, color: "#475569" }}
            >
              {defaultTemplateHint}
            </p>
          ) : null}
        </div>

        <div className="autopush-row">
          <label>Source</label>
          <input
            value={sourceFolder}
            onChange={(event) => handleFolderPathChange("source", event.target.value)}
            placeholder="Source folder path"
          />
          <button type="button" onClick={() => selectFolder("source")}>
            Browse
          </button>
        </div>

        <div className="autopush-row">
          <label>Destination</label>
          <input
            value={destinationFolder}
            onChange={(event) => handleFolderPathChange("destination", event.target.value)}
            placeholder="Destination folder path"
          />
          <button type="button" onClick={() => selectFolder("destination")}>
            Browse
          </button>
        </div>

        <div className="autopush-actions autopush-actions-bar">
          <button type="button" onClick={loadExistingFiles} disabled={!sourceFolder}>
            Load Files
          </button>
          {isMonitoring ? (
            <button type="button" onClick={stopMonitoring} className="danger">
              Stop Monitor
            </button>
          ) : (
            <button type="button" onClick={startMonitoring} disabled={!sourceFolder}>
              Start Monitor
            </button>
          )}
        </div>
      </div>

      {!window.electronAPI && (
        <div className="autopush-warning">
          Run this page inside Electron to use folder selection, Excel monitoring, and file moving.
        </div>
      )}

      <div className="autopush-panels">
        <section className="autopush-panel autopush-panel-files">
          <div className="autopush-panel-head">
            <h3>Files in Folder</h3>
            <span>{excelFiles.length}</span>
          </div>
          <div className="autopush-panel-body">
            {excelFiles.length === 0 ? (
              <p className="empty">No files found.</p>
            ) : (
              excelFiles.map((file) => (
                <div key={file.path || file.name} className="file-row">
                  <span title={file.name}>{file.name}</span>
                  {currentFile === file.name ? <em>Reading...</em> : null}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="autopush-panel autopush-panel-loaded">
          <div className="autopush-panel-head">
            <h3>Loaded Data</h3>
            <span>{excelData.length}</span>
          </div>
          <div className="autopush-panel-body">
            {excelData.length === 0 ? (
              <p className="empty">No loaded files.</p>
            ) : (
              excelData.map((item) => (
                <div key={item.fileName} className="data-card">
                  <div className="data-card-head">
                    <strong>{item.fileName}</strong>
                    <span>{item.totalRows || item.data?.length || 0} rows</span>
                  </div>
                  {!item.processed ? (
                    <button
                      type="button"
                      onClick={() => processExcelFile(item)}
                      disabled={!selectedTemplate || currentFile === item.fileName}
                    >
                      {currentFile === item.fileName ? "Processing..." : "Process"}
                    </button>
                  ) : (
                    <p className="processed-note">
                      Processed ({item.mappedCount || item.totalRows || 0} rows){item.moveError ? ` - ${item.moveError}` : ""}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="autopush-panel autopush-panel-processed">
          <div className="autopush-panel-head">
            <h3>Processed</h3>
            <span>{processedFiles.length}</span>
          </div>
          <div className="autopush-panel-body">
            {processedFiles.length === 0 ? (
              <p className="empty">No processed files.</p>
            ) : (
              processedFiles.map((file) => (
                <div key={`${file.fileName}-${file.timestamp}`} className="file-row success">
                  <span title={file.fileName}>{file.fileName}</span>
                  <em>{new Date(file.timestamp).toLocaleTimeString()}</em>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="autopush-statusbar">
        {isMonitoring ? <span className="watching">Watching folder</span> : null}
        {lastScanAgo != null ? <span>Last scan: {lastScanAgo === 0 ? "just now" : `${lastScanAgo}s ago`}</span> : null}
        {selectedTemplate ? (
          <span className="template-inline">
            Template: {selectedTemplate.TemplateName} | Fields: {selectedTemplateFieldCount}
          </span>
        ) : null}
        {status ? <span>{status}</span> : null}
        {error ? <span className="error">{error}</span> : null}
      </div>
    </div>
  );
}

export default AutoPushStockUtility;
