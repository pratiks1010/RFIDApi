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
// import { toRrgoldApiUrl } from './apiBaseConfig'; // enable when wiring the API

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

  // 1) Local customization / offline cache.
  try {
    const cached = localStorage.getItem(storageKey(id));
    if (cached) return normalizeLayout(JSON.parse(cached));
  } catch {
    /* ignore corrupted cache */
  }

  // 2) TODO: backend fetch (uncomment when the API exists).
  // try {
  //   const res = await fetch(toRrgoldApiUrl(`/api/dashboard-layout?clientId=${encodeURIComponent(id)}`), {
  //     headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  //   });
  //   if (res.ok) {
  //     const data = await res.json(); // expected: { success, layout: { version, clientId, sections } }
  //     return normalizeLayout(data.layout || data);
  //   }
  // } catch (err) {
  //   console.warn('dashboard-layout fetch failed, using default:', err?.message);
  // }

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

  // TODO: backend persist (uncomment when the API exists).
  // Request body: { clientId, layout: normalized }
  // Response body: { success: true, layout: normalized }
  // try {
  //   await fetch(toRrgoldApiUrl('/api/dashboard-layout'), {
  //     method: 'PUT',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       Authorization: `Bearer ${localStorage.getItem('token')}`,
  //     },
  //     body: JSON.stringify({ clientId: id, layout: normalized }),
  //   });
  // } catch (err) {
  //   console.warn('dashboard-layout save failed (kept locally):', err?.message);
  // }

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
