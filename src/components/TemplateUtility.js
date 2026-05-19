import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/TemplateUtility.css";
import { toRrgoldApiUrl } from "../services/apiBaseConfig";

const SYSTEM_FIELDS = [
  "RFIDNumber",
  "Itemcode",
  "category_id",
  "product_id",
  "design_id",
  "purity_id",
  "vendor_id",
  "grosswt",
  "stonewt",
  "diamondheight",
  "diamondweight",
  "netwt",
  "box_details",
  "size",
  "stoneamount",
  "diamondAmount",
  "HallmarkAmount",
  "MakingPerGram",
  "MakingPercentage",
  "MakingFixedAmt",
  "MRP",
  "imageurl",
  "status",
];

const decodeToken = (token) => {
  try {
    if (!token) return null;
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const extractClientCode = (token) => {
  const decoded = decodeToken(token);
  if (!decoded) return "";
  return (
    decoded.clientCode ||
    decoded.ClientCode ||
    decoded.client_code ||
    decoded.clientId ||
    decoded.ClientId ||
    ""
  );
};

function TemplateUtility() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  const username = useMemo(() => {
    const decoded = decodeToken(token);
    return (
      decoded?.username ||
      decoded?.Username ||
      decoded?.userName ||
      decoded?.loginName ||
      decoded?.LoginName ||
      decoded?.sub ||
      "default"
    );
  }, [token]);

  const clientCode = useMemo(() => extractClientCode(token), [token]);

  const [sourceFolder, setSourceFolder] = useState("");
  const [excelFiles, setExcelFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [templateName, setTemplateName] = useState("");

  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const mappedCount = Object.values(fieldMapping).filter((v) => v?.trim()).length;

  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const loadConfig = async () => {
    try {
      setIsLoadingConfig(true);
      if (window.electronAPI?.getConfig && username) {
        const config = await window.electronAPI.getConfig(username);
        if (config?.sourceFolder) {
          setSourceFolder(config.sourceFolder);
          await loadExistingFiles(config.sourceFolder);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const getExcelFiles = async (folderPath) => {
    try {
      if (!window.electronAPI?.getExcelFiles) return [];
      return await window.electronAPI.getExcelFiles(folderPath);
    } catch (err) {
      setError(`Error reading folder: ${err.message}`);
      return [];
    }
  };

  const loadExistingFiles = async (folderPath) => {
    if (!folderPath) return;
    const files = await getExcelFiles(folderPath);
    setExcelFiles(files);
  };

  const readExcelFile = async (filePath) => {
    try {
      if (!window.electronAPI?.readExcel) {
        setError("Excel reading not available.");
        return null;
      }
      return await window.electronAPI.readExcel(filePath);
    } catch (err) {
      setError(`Error reading Excel: ${err.message}`);
      return null;
    }
  };

  const selectExcelFile = async () => {
    try {
      if (!window.electronAPI?.selectFile) {
        setError("File selection not available in this environment.");
        return;
      }

      setError("");
      setStatus("Opening file dialog...");

      const filePath = await window.electronAPI.selectFile({
        filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }],
      });

      if (!filePath) {
        setStatus("File selection cancelled");
        setTimeout(() => setStatus(""), 1500);
        return;
      }

      const fileName = filePath.split(/[/\\]/).pop();
      const file = { name: fileName, path: filePath };
      setSelectedFile(file);
      setExcelFiles([file]);
      await handleFileSelect(file);
      setStatus(`File selected: ${fileName}`);
      setTimeout(() => setStatus(""), 2000);
    } catch (err) {
      setError(err.message || "Error selecting file");
      setStatus("");
    }
  };

  const handleFileSelect = async (file) => {
    setExcelHeaders([]);
    setFieldMapping({});
    setError("");

    setStatus("Loading Excel file...");
    const result = await readExcelFile(file.path);
    if (!result) {
      setStatus("");
      return;
    }

    const headers = result.headers?.length
      ? result.headers
      : result.data?.length
        ? Object.keys(result.data[0] || {})
        : [];

    if (headers.length === 0) {
      setError("No headers found in Excel file");
      setStatus("");
      return;
    }

    setExcelHeaders(headers);
    setStatus(`Loaded ${headers.length} columns from ${file.name}`);
    setTimeout(() => setStatus(""), 2500);
  };

  const handleMappingChange = (systemField, excelField) => {
    setFieldMapping((prev) => ({ ...prev, [systemField]: excelField || "" }));
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setError("Please enter a template name");
      return;
    }
    if (!clientCode) {
      setError("Client code not found. Please login again.");
      return;
    }

    const mappingEntries = Object.entries(fieldMapping).filter(([, v]) => v?.trim());
    if (mappingEntries.length === 0) {
      setError("Please map at least one field");
      return;
    }

    setSaving(true);
    setError("");
    setStatus("Saving template...");

    try {
      const templateObject = {};
      mappingEntries.forEach(([k, v]) => {
        templateObject[k] = v;
      });

      const authToken = localStorage.getItem("authToken") || localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const response = await fetch(toRrgoldApiUrl("/api/Invoice/CreateTemplate"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          TemplateName: templateName.trim(),
          Template: JSON.stringify(templateObject),
          ClientCode: clientCode,
        }),
        mode: "cors",
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${response.status}`);
      }

      setStatus("Template saved successfully!");
      setTemplateName("");
      setFieldMapping({});
      setSelectedFile(null);
      setExcelHeaders([]);
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to save template");
      setStatus("");
    } finally {
      setSaving(false);
    }
  };

  if (isLoadingConfig) {
    return (
      <div className="templateutil-loading">
        <div className="templateutil-spinner" />
      </div>
    );
  }

  return (
    <div className="templateutil-page">
      <div className="templateutil-header">
        <button type="button" className="templateutil-back" onClick={() => navigate("/rfid-utility")}>
          ← Back to Utilities
        </button>
        <div className="templateutil-title">
          <h2>Template Builder</h2>
          <p>Create mapping: Excel columns -> System fields, then save template.</p>
        </div>
      </div>

      {!window.electronAPI && (
        <div className="templateutil-alert templateutil-alert-warn">
          Electron required for file selection and Excel reading.
        </div>
      )}

      {error ? <div className="templateutil-alert templateutil-alert-error">{error}</div> : null}
      {status ? <div className="templateutil-alert templateutil-alert-info">{status}</div> : null}

      <div className="templateutil-grid">
        <section className="templateutil-card">
          <div className="templateutil-card-head">
            <span className="templateutil-step templateutil-step-1">1</span>
            <span>Select Excel file (and/or from source folder)</span>
          </div>

          <div className="templateutil-card-body">
            <div className="templateutil-actions">
              <button type="button" className="templateutil-btn templateutil-btn-indigo" onClick={selectExcelFile}>
                Browse Excel file
              </button>

              {sourceFolder ? (
                <button
                  type="button"
                  className="templateutil-btn templateutil-btn-ghost"
                  onClick={() => loadExistingFiles(sourceFolder)}
                >
                  Load from source folder
                </button>
              ) : null}
            </div>

            {sourceFolder ? <p className="templateutil-subtle">Source folder: {sourceFolder}</p> : null}

            {excelFiles.length > 0 ? (
              <div className="templateutil-filelist">
                <div className="templateutil-filelist-title">Available Excel files</div>
                <div className="templateutil-filelist-items">
                  {excelFiles.map((file) => (
                    <button
                      key={file.path || file.name}
                      type="button"
                      className={`templateutil-filebtn ${selectedFile?.name === file.name ? "is-active" : ""}`}
                      onClick={() => handleFileSelect(file)}
                    >
                      {file.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="templateutil-empty">No Excel files loaded yet. Choose a file to continue.</div>
            )}
          </div>
        </section>

        <section className="templateutil-card">
          <div className="templateutil-card-head templateutil-card-head-green">
            <span className="templateutil-step templateutil-step-2">2</span>
            <span>Template name & field mapping</span>
          </div>

          <div className="templateutil-card-body">
            {excelHeaders.length === 0 ? (
              <div className="templateutil-empty">
                Load an Excel file first. Then map system fields below.
              </div>
            ) : (
              <>
                <div className="templateutil-name-row">
                  <label className="templateutil-label">Template name</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Gold Stock Template"
                    className="templateutil-input"
                  />
                  <span className="templateutil-pill">Mapped: {mappedCount}/{SYSTEM_FIELDS.length}</span>
                </div>

                <div className="templateutil-table-wrap">
                  <div className="templateutil-table-head">
                    <div>System field</div>
                    <div />
                    <div>Excel column</div>
                  </div>
                  <div className="templateutil-table-body">
                    {SYSTEM_FIELDS.map((systemField, idx) => (
                      <div key={systemField} className="templateutil-maprow">
                        <div className="templateutil-mapindex">{idx + 1}</div>
                        <div className="templateutil-mapfield" title={systemField}>
                          {systemField}
                        </div>
                        <div className="templateutil-maparrow">→</div>
                        <select
                          className="templateutil-mapselect"
                          value={fieldMapping[systemField] || ""}
                          onChange={(e) => handleMappingChange(systemField, e.target.value)}
                        >
                          <option value="">— Select column —</option>
                          {excelHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="templateutil-savebar">
                  <button
                    type="button"
                    className="templateutil-btn templateutil-btn-emerald"
                    onClick={handleSaveTemplate}
                    disabled={saving || !templateName.trim() || mappedCount === 0}
                  >
                    {saving ? "Saving..." : "Save template"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default TemplateUtility;

