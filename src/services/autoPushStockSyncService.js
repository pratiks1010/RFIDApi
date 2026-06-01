import { toRrgoldApiUrl, toSoniApiUrl } from './apiBaseConfig';
import { normalizeProductWeights } from '../utils/weightFormat';

/** Same field list as Auto Push Stock Utility (Excel → API mapping). */
export const AUTO_PUSH_SYSTEM_FIELDS = [
  'RFIDNumber',
  'Itemcode',
  'category_id',
  'product_id',
  'design_id',
  'purity_id',
  'vendor_id',
  'grosswt',
  'stonewt',
  'diamondheight',
  'diamondweight',
  'netwt',
  'box_details',
  'size',
  'stoneamount',
  'diamondAmount',
  'HallmarkAmount',
  'MakingPerGram',
  'MakingPercentage',
  'MakingFixedAmt',
  'MRP',
  'imageurl',
  'status',
];

const decodeToken = (token) => {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/** Username key used by Electron `getConfig` / Auto Push (must match AutoPushStockUtility). */
export const extractAutoPushUsername = (token) => {
  const decoded = decodeToken(token);
  if (!decoded) return '';
  return (
    decoded.username ||
    decoded.Username ||
    decoded.userName ||
    decoded.loginName ||
    decoded.LoginName ||
    decoded.sub ||
    ''
  );
};

export const extractClientCodeFromToken = (token) => {
  const decoded = decodeToken(token);
  if (!decoded) return '';
  return (
    decoded.clientCode ||
    decoded.ClientCode ||
    decoded.client_code ||
    decoded.clientId ||
    decoded.ClientId ||
    ''
  );
};

export const getTemplateRowId = (template, idx) =>
  String(template?.TemplateID ?? template?.TemplateId ?? template?.id ?? `temp_${idx}`);

/** Must match AutoPushStockUtility `defaultTemplateStorageKey`. */
export const defaultTemplateStorageKey = (clientCode, username) =>
  `rfidAutoPushDefaultTemplate:${String(clientCode || '').trim()}:${String(username || 'default').trim()}`;

export const parseTemplatesFromApiResponse = (data) =>
  (Array.isArray(data) ? data : []).map((template) => {
    let parsedData = {};
    try {
      let templateDataStr = template.TemplateData || template.Template || '';
      if (typeof templateDataStr === 'string') {
        let cleaned = templateDataStr;
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
        cleaned = cleaned.replace(/\\u0022/g, '"').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        if (cleaned.trim()) parsedData = JSON.parse(cleaned);
      }
    } catch {
      parsedData = {};
    }
    return { ...template, parsedData };
  });

export const fetchParsedTemplates = async (clientCode) => {
  if (!clientCode) return [];
  const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const response = await fetch(toRrgoldApiUrl('/api/Invoice/alltemplate'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ ClientCode: clientCode }),
    mode: 'cors',
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  return parseTemplatesFromApiResponse(data);
};

export const resolveTemplateForAutoPush = (templates, clientCode, username) => {
  if (!templates?.length) return null;
  let pref = null;
  try {
    const raw = localStorage.getItem(defaultTemplateStorageKey(clientCode, username));
    pref = raw ? JSON.parse(raw) : null;
  } catch {
    pref = null;
  }
  const prefId = String(pref?.templateId || '').trim();
  const prefName = String(pref?.templateName || '').trim();
  if (prefId) {
    const byId = templates.find((template, idx) => getTemplateRowId(template, idx) === prefId);
    if (byId) return byId;
  }
  if (prefName) {
    const byName = templates.find(
      (template) => String(template.TemplateName || '').trim().toLowerCase() === prefName.toLowerCase()
    );
    if (byName) return byName;
  }
  return templates[0];
};

/** Optional check only — mapping does not require every template column in the file. */
export const validateExcelFields = (excelHeaders, templateMapping) => {
  const headerSet = new Set((excelHeaders || []).map((h) => String(h).trim()));
  const missingFields = [];
  const mappedFields = Object.values(templateMapping).filter((value) => value && String(value).trim());
  mappedFields.forEach((excelField) => {
    if (!headerSet.has(String(excelField).trim())) missingFields.push(excelField);
  });
  return { isValid: missingFields.length === 0, missingFields };
};

const getExcelCellValue = (excelRow, excelColumn) => {
  if (!excelRow || !excelColumn) return undefined;
  const col = String(excelColumn).trim();
  if (excelRow[excelColumn] !== undefined && excelRow[excelColumn] !== null) return excelRow[excelColumn];
  if (excelRow[col] !== undefined && excelRow[col] !== null) return excelRow[col];
  const matchedKey = Object.keys(excelRow).find((key) => String(key).trim() === col);
  return matchedKey != null ? excelRow[matchedKey] : undefined;
};

const hasExcelCellValue = (value) => value !== undefined && value !== null && value !== '';

/** Template keys may use API names (counter_id) or UI names (CounterId). */
const TEMPLATE_FIELD_ALIASES = {
  CounterId: 'counter_id',
  counterId: 'counter_id',
  BranchId: 'branch_id',
  branchId: 'branch_id',
  ClientCode: 'client_code',
  ItemCode: 'Itemcode',
  itemCode: 'Itemcode',
  RFIDCode: 'RFIDNumber',
  rfidCode: 'RFIDNumber',
};

export const normalizeTemplateSystemField = (fieldKey) =>
  TEMPLATE_FIELD_ALIASES[fieldKey] || fieldKey;

const getMappedNetFromExcel = (excelRow, templateMapping) => {
  if (!excelRow || !templateMapping) return undefined;
  for (const [rawKey, excelField] of Object.entries(templateMapping)) {
    if (!excelField || !String(excelField).trim()) continue;
    if (normalizeTemplateSystemField(rawKey) !== 'netwt') continue;
    return getExcelCellValue(excelRow, excelField);
  }
  return undefined;
};

const coerceMappedValue = (systemField, value) =>
  systemField === 'size' ? Number(value) : String(value);

const normalizeRfidValue = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return raw;
  // If RFID starts with letters, force first two leading letters to uppercase (e.g. mj1247 -> MJ1247).
  const match = raw.match(/^([A-Za-z]{1,2})(.*)$/);
  if (!match) return raw;
  const [, lead, rest] = match;
  return `${lead.toUpperCase()}${rest}`;
};

/** Map only template-linked Excel columns that have a value — no mandatory columns, no empty defaults. */
export const mapExcelDataToSystemFields = (clientCode, excelRows, templateMapping) => {
  if (!templateMapping || Object.keys(templateMapping).length === 0) return [];
  return excelRows
    .map((excelRow) => {
      const mappedData = { client_code: clientCode || '' };

      Object.entries(templateMapping).forEach(([rawKey, excelField]) => {
        if (!excelField || !String(excelField).trim()) return;
        const value = getExcelCellValue(excelRow, excelField);
        if (!hasExcelCellValue(value)) return;
        const systemField = normalizeTemplateSystemField(rawKey);
        const coercedValue = coerceMappedValue(systemField, value);
        mappedData[systemField] =
          systemField === 'RFIDNumber' ? normalizeRfidValue(coercedValue) : coercedValue;
      });

      return normalizeProductWeights(mappedData, {
        netExcelValue: getMappedNetFromExcel(excelRow, templateMapping),
      });
    })
    .filter((row) => Object.keys(row).some((key) => key !== 'client_code'));
};

export const parseReadExcelResult = (result) => {
  if (!result) return { rows: [], headers: [] };
  if (result.rows?.length > 0) {
    return { rows: result.rows, headers: result.headers || [] };
  }
  if (result.data?.length > 0) {
    const headers = result.data[0] ? Object.keys(result.data[0]) : [];
    return { rows: result.data, headers };
  }
  return { rows: [], headers: [] };
};

export const sendAutoPushMappedData = async (mappedData) => {
  const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const response = await fetch(toSoniApiUrl('/api/ProductMaster/SaveRFIDTransactionDetails'), {
    method: 'POST',
    headers,
    body: JSON.stringify(mappedData),
    mode: 'cors',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.Message || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

/**
 * One-shot: read all Excel files from Auto Push source folder, map with default (or first) template,
 * POST to SaveRFIDTransactionDetails, move files to destination when configured (Electron only).
 */
export async function runAutoPushFolderSyncOnce({ clientCode, username, onProgress }) {
  const emitProgress = (payload) => {
    if (!onProgress) return;
    try {
      onProgress(payload);
    } catch {
      // UI progress callbacks should never break sync flow.
    }
  };

  emitProgress({ phase: 'init', message: 'Starting folder sync…', totalFiles: 0, processedFiles: 0 });
  if (typeof window === 'undefined' || !window.electronAPI?.getConfig) {
    return {
      ok: false,
      error: 'Folder sync runs in the desktop app only. Open the EXE and use Sync there.',
    };
  }
  if (!clientCode) {
    return { ok: false, error: 'Client code missing. Please log in again.' };
  }

  const uname = String(username || 'default').trim() || 'default';
  let config;
  try {
    config = await window.electronAPI.getConfig(uname);
  } catch (e) {
    return { ok: false, error: e?.message || 'Could not read Auto Push folder settings.' };
  }

  const sourceFolder = String(config?.sourceFolder || '').trim();
  const destinationFolder = String(config?.destinationFolder || '').trim();
  if (!sourceFolder) {
    return {
      ok: false,
      error: 'No source folder set. Open Auto Push Stock Utility and choose Source (and optional Destination).',
    };
  }

  let templates;
  try {
    emitProgress({ phase: 'template', message: 'Loading templates…', totalFiles: 0, processedFiles: 0 });
    templates = await fetchParsedTemplates(clientCode);
  } catch (e) {
    return { ok: false, error: e?.message || 'Failed to load templates.' };
  }
  if (!templates.length) {
    return { ok: false, error: 'No templates from server. Check API / client code.' };
  }

  const selectedTemplate = resolveTemplateForAutoPush(templates, clientCode, uname);
  if (!selectedTemplate?.parsedData || Object.keys(selectedTemplate.parsedData).length === 0) {
    return {
      ok: false,
      error: `Template "${selectedTemplate?.TemplateName || '?'}" has no column mapping. Set a default in Auto Push (Set as default) or fix the template.`,
    };
  }

  let files = [];
  try {
    emitProgress({ phase: 'scan', message: 'Scanning source folder…', totalFiles: 0, processedFiles: 0 });
    files = await window.electronAPI.getExcelFiles(sourceFolder);
  } catch (e) {
    return { ok: false, error: e?.message || 'Could not list Excel files in source folder.' };
  }
  if (!files?.length) {
    emitProgress({ phase: 'done', message: 'No Excel files found.', totalFiles: 0, processedFiles: 0 });
    return {
      ok: true,
      empty: true,
      templateName: selectedTemplate.TemplateName,
      message: 'No Excel files in the Auto Push source folder.',
      results: [],
    };
  }

  const results = [];
  const totalFiles = files.length;
  emitProgress({
    phase: 'process',
    message: `Found ${totalFiles} file(s). Starting sync…`,
    totalFiles,
    processedFiles: 0,
    okCount: 0,
    failCount: 0,
  });
  for (const file of files) {
    const currentIndex = results.length + 1;
    const filePath = file.path || file;
    const fileName = file.name || (typeof filePath === 'string' ? filePath.split(/[/\\]/).pop() : 'file.xlsx');
    emitProgress({
      phase: 'process',
      message: `Processing ${fileName} (${currentIndex}/${totalFiles})…`,
      fileName,
      currentFile: currentIndex,
      totalFiles,
      processedFiles: results.length,
      okCount: results.filter((r) => r.ok).length,
      failCount: results.filter((r) => !r.ok).length,
    });
    try {
      const readRes = await window.electronAPI.readExcel(filePath);
      const { rows, headers } = parseReadExcelResult(readRes);
      if (!rows?.length) {
        results.push({ fileName, ok: false, message: 'No data rows in file.' });
        continue;
      }
      const mappedData = mapExcelDataToSystemFields(clientCode, rows, selectedTemplate.parsedData);
      if (!mappedData.length) {
        results.push({ fileName, ok: false, message: 'Nothing mapped from rows.' });
        continue;
      }
      await sendAutoPushMappedData(mappedData);
      let moved = false;
      if (destinationFolder && filePath) {
        const separator = destinationFolder.includes('\\') ? '\\' : '/';
        const destPath = `${destinationFolder}${separator}${fileName}`;
        try {
          const moveResult = await window.electronAPI.moveFile(filePath, destPath);
          moved = moveResult === true || moveResult === undefined || moveResult === null;
        } catch {
          moved = false;
        }
      }
      results.push({ fileName, ok: true, moved, rows: mappedData.length });
    } catch (e) {
      results.push({ fileName, ok: false, message: e?.message || String(e) });
    }
    emitProgress({
      phase: 'process',
      message: `Processed ${currentIndex}/${totalFiles}`,
      fileName,
      currentFile: currentIndex,
      totalFiles,
      processedFiles: currentIndex,
      okCount: results.filter((r) => r.ok).length,
      failCount: results.filter((r) => !r.ok).length,
    });
  }

  const okCount = results.filter((r) => r.ok).length;
  emitProgress({
    phase: 'done',
    message: `Sync completed: ${okCount} success, ${results.length - okCount} failed.`,
    totalFiles: results.length,
    processedFiles: results.length,
    okCount,
    failCount: results.length - okCount,
  });
  return {
    ok: true,
    empty: false,
    templateName: selectedTemplate.TemplateName,
    results,
    okCount,
    failCount: results.length - okCount,
  };
}
