import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/MapFieldsUtility.css";

const TEMPLATE_API_BASE_URL = "https://rrgold.loyalstring.co.in/api";

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

function MapFieldsUtility() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  const clientCode = useMemo(() => extractClientCode(token), [token]);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchTemplate, setSearchTemplate] = useState("");

  useEffect(() => {
    if (clientCode) fetchTemplates();
  }, [clientCode]);

  const fetchTemplates = async () => {
    if (!clientCode) {
      setError("Client code not found. Please login again.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const authToken = localStorage.getItem("authToken") || localStorage.getItem("token");
      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const response = await fetch(`${TEMPLATE_API_BASE_URL}/Invoice/alltemplate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ClientCode: clientCode }),
        mode: "cors",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const data = await response.json();
      const parsedTemplates = (Array.isArray(data) ? data : []).map((template) => {
        let parsedData = {};
        try {
          let templateDataStr = template.TemplateData || template.Template || "";
          if (typeof templateDataStr === "string") {
            let cleaned = templateDataStr;
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
            cleaned = cleaned.replace(/\\u0022/g, '"').replace(/\\"/g, '"').replace(/\\\\/g, "\\");
            if (cleaned.trim()) parsedData = JSON.parse(cleaned);
          }
        } catch {
          parsedData = {};
        }
        return { ...template, parsedData };
      });

      setTemplates(parsedTemplates);
      if (parsedTemplates.length > 0) setSelectedTemplate((prev) => prev || parsedTemplates[0]);
    } catch (err) {
      setError(err.message || "Failed to fetch templates");
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = searchTemplate.trim()
    ? templates.filter((template) =>
        (template.TemplateName || "").toLowerCase().includes(searchTemplate.trim().toLowerCase())
      )
    : templates;

  const mappingEntries = Object.entries(selectedTemplate?.parsedData || {});

  return (
    <div className="mapfields-page">
      <div className="mapfields-header">
        <button type="button" className="mapfields-back" onClick={() => navigate("/rfid-utility")}>
          ← Back to All Utilities
        </button>
        <div className="mapfields-title">
          <h2>Map Fields Utility</h2>
          <p>Analyze template mappings and validate which Excel columns map to system fields.</p>
        </div>
        <button type="button" className="mapfields-refresh" onClick={fetchTemplates} disabled={loading || !clientCode}>
          {loading ? "Loading..." : "Refresh Templates"}
        </button>
      </div>

      {error ? <div className="mapfields-error">{error}</div> : null}

      <div className="mapfields-body">
        <aside className="mapfields-list">
          <div className="mapfields-search-wrap">
            <input
              type="text"
              value={searchTemplate}
              onChange={(event) => setSearchTemplate(event.target.value)}
              placeholder="Search templates..."
            />
          </div>
          <div className="mapfields-items">
            {filteredTemplates.length === 0 ? (
              <p className="mapfields-empty">{loading ? "Loading templates..." : "No templates found."}</p>
            ) : (
              filteredTemplates.map((template, index) => {
                const templateId = String(template.Id || template.TemplateID || template.TemplateId || `temp_${index}`);
                const selectedId = String(
                  selectedTemplate?.Id || selectedTemplate?.TemplateID || selectedTemplate?.TemplateId || ""
                );
                const isSelected = templateId === selectedId || template.TemplateName === selectedTemplate?.TemplateName;
                return (
                  <button
                    key={templateId}
                    type="button"
                    className={`mapfields-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <strong>{template.TemplateName || `Template ${index + 1}`}</strong>
                    <span>{Object.keys(template.parsedData || {}).length} mappings</span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="mapfields-detail">
          {!selectedTemplate ? (
            <div className="mapfields-empty-detail">Select a template to view mapping details.</div>
          ) : (
            <>
              <div className="mapfields-detail-head">
                <h3>{selectedTemplate.TemplateName}</h3>
                <span>{mappingEntries.length} fields mapped</span>
              </div>
              <div className="mapfields-mapping-list">
                {mappingEntries.length === 0 ? (
                  <p className="mapfields-empty">No field mappings present in this template.</p>
                ) : (
                  mappingEntries.map(([dbField, excelColumn], index) => (
                    <div key={`${dbField}-${index}`} className="mapping-row">
                      <span className="mapping-index">{index + 1}</span>
                      <span className="mapping-db" title={dbField}>
                        {dbField}
                      </span>
                      <span className="mapping-arrow">→</span>
                      <span className="mapping-excel" title={excelColumn}>
                        {excelColumn}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default MapFieldsUtility;
