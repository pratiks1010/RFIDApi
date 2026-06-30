// Dashboard Layout Service
// -------------------------------------------------------------------------
// Provides the per-client dashboard layout configuration (which widgets are
// shown, their order, and their size/column-span).
//
// CURRENT BEHAVIOUR (no backend yet):
//   - Reads the bundled default layout from src/data/dashboardLayout.json
//   - Any per-client customizations are persisted in localStorage so the
//     dashboard remembers them across reloads.
//
// FUTURE BEHAVIOUR (when the API is ready):
//   - getDashboardLayout()  -> GET  /api/dashboard-layout?clientId=...
//   - saveDashboardLayout() -> PUT  /api/dashboard-layout
//   The localStorage fallback can then act purely as an offline cache.
// -------------------------------------------------------------------------

import defaultLayout from '../data/dashboardLayout.json';
import { toRrgoldApiUrl } from './apiBaseConfig';

const STORAGE_PREFIX = 'dashboardLayout:';

/** Decode a base64url JWT payload without verifying the signature. */
const decodeToken = (token) => {
  try {
    const payload = String(token || '').split('.')[1];
    if (!payload) return null;
    const json = decodeURIComponent(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

/** Resolve the active client identifier (falls back to "default"). */
export const resolveClientId = () => {
  const decoded = decodeToken(localStorage.getItem('token'));
  const id =
    decoded?.clientCode ||
    decoded?.ClientCode ||
    decoded?.clientId ||
    decoded?.ClientId ||
    decoded?.CompanyId ||
    decoded?.companyId;
  return String(id || 'default').trim() || 'default';
};

const storageKey = (clientId) => `${STORAGE_PREFIX}${clientId}`;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

// const dynamicDashboardUrl = (clientId) =>(`https://localhost:7095/api/${encodeURIComponent(clientId)}/dynamicDashboard`);
const dynamicDashboardUrl = (clientId) => toRrgoldApiUrl(`/api/${encodeURIComponent(clientId)}/dynamicDashboard`);

/** Deep clone so callers can mutate freely without touching the imported JSON. */
const clone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Validate/normalize a layout object so the UI can always rely on its shape.
 * - Flat schema (v2): { grid: { columns }, widgets: [...] }
 * - Migrates the old sectioned schema (v1): { sections: { charts, tables } }
 * Unknown/extra keys are preserved.
 */
export const normalizeLayout = (layout) => {
  const base = clone(defaultLayout);
  if (!layout || typeof layout !== 'object') return base;

  let widgets = layout.widgets;

  // Migrate the legacy sectioned schema into a single flat ordered list.
  if (!Array.isArray(widgets) && layout.sections && typeof layout.sections === 'object') {
    widgets = Object.values(layout.sections).flatMap((s) => (s && Array.isArray(s.widgets) ? s.widgets : []));
  }

  if (!Array.isArray(widgets) || widgets.length === 0) {
    widgets = base.widgets;
  }

  const columns = Number(layout.grid?.columns) || base.grid?.columns || 12;
  // Minimum widget width is a "quarter" of the grid (e.g. 3 of 12 columns).
  const minSpan = Math.max(1, Math.round(columns / 4));

  const normalizedWidgets = widgets
    .map((w, i) => ({
      ...w,
      visible: w.visible !== false,
      order: Number.isFinite(Number(w.order)) ? Number(w.order) : i + 1,
      size: { colSpan: Math.min(columns, Math.max(minSpan, Number(w?.size?.colSpan) || minSpan)) },
    }))
    .sort((a, b) => a.order - b.order)
    .map((w, i) => ({ ...w, order: i + 1 }));

  const merged = { ...base, ...layout };
  delete merged.sections; // drop legacy key after migration
  merged.grid = { columns };
  merged.widgets = normalizedWidgets;
  return merged;
};

/**
 * Get the dashboard layout for a client.
 * @param {string} [clientId] - optional explicit client id; auto-resolved if omitted.
 * @returns {Promise<object>} normalized layout config
 */
export const getDashboardLayout = async (clientId) => {
  const id = clientId || resolveClientId();

  // 1) Backend fetch first, then fall back to local cache or default.
  try {
    const response = await fetch(dynamicDashboardUrl(id), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      const normalized = normalizeLayout(data);
      try {
        localStorage.setItem(storageKey(id), JSON.stringify(normalized));
      } catch {
        /* ignore storage issues */
      }
      return normalized;
    }
    console.warn('dynamicDashboard load failed:', response.status, response.statusText);
  } catch (err) {
    console.warn('dynamicDashboard load failed, using cache/default:', err?.message);
  }

  // 2) Local customization / offline cache.
  try {
    const cached = localStorage.getItem(storageKey(id));
    if (cached) return normalizeLayout(JSON.parse(cached));
  } catch {
    /* ignore corrupted cache */
  }

  // 3) Bundled default.
  const def = normalizeLayout(defaultLayout);
  def.clientId = id;
  return def;
};

/**
 * Persist the dashboard layout for a client.
 * @param {object} layout - the full layout config to save.
 * @param {string} [clientId]
 * @returns {Promise<object>} the saved (normalized) layout
 */
export const saveDashboardLayout = async (layout, clientId) => {
  const id = clientId || resolveClientId();
  const normalized = normalizeLayout(layout);
  normalized.clientId = id;
  normalized.updatedAt = new Date().toISOString();

  try {
    localStorage.setItem(storageKey(id), JSON.stringify(normalized));
  } catch {
    /* storage full / unavailable */
  }

  try {
    const response = await fetch(dynamicDashboardUrl(id), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(normalized),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn('dynamicDashboard save failed:', response.status, body);
    }
  } catch (err) {
    console.warn('dynamicDashboard save failed (kept locally):', err?.message);
  }

  return normalized;
};

/** Reset a client's layout back to the bundled default. */
export const resetDashboardLayout = async (clientId) => {
  const id = clientId || resolveClientId();
  try {
    localStorage.removeItem(storageKey(id));
  } catch {
    /* ignore */
  }
  const def = normalizeLayout(defaultLayout);
  def.clientId = id;
  return def;
};

export default {
  resolveClientId,
  normalizeLayout,
  getDashboardLayout,
  saveDashboardLayout,
  resetDashboardLayout,
};
