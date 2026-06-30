// Sidebar Layout Service
// -------------------------------------------------------------------------
// Provides the per-client sidebar layout configuration (which menu items are
// shown, their order, and which section they belong to).
//
// CURRENT BEHAVIOUR (no backend yet):
//   - Reads the bundled default layout from src/data/sidebarLayout.json
//   - Any per-client customizations are persisted in localStorage so the
//     sidebar remembers them across reloads.
//
// FUTURE BEHAVIOUR (when the API is ready):
//   - getSidebarLayout()  -> GET  /api/sidebar-layout?clientId=...
//   - saveSidebarLayout() -> PUT  /api/sidebar-layout
//   The localStorage fallback can then act purely as an offline cache.
// -------------------------------------------------------------------------

import defaultLayout from '../data/sidebarLayout.json';
import { toRrgoldApiUrl } from './apiBaseConfig';

const STORAGE_PREFIX = 'sidebarLayout:';

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

const dynamicSidebarUrl = (clientId) => toRrgoldApiUrl(`/api/${encodeURIComponent(clientId)}/dynamicSidebar`);

/** Deep clone so callers can mutate freely without touching the imported JSON. */
const clone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Validate/normalize a layout object so the UI can always rely on its shape.
 * Ensures sections + items exist, each item has visible/order/section, and any
 * brand-new items added in code (and present in the default) are merged in so
 * older saved layouts don't permanently hide newly shipped menu entries.
 */
export const normalizeSidebarLayout = (layout) => {
  const base = clone(defaultLayout);

  const src = layout && typeof layout === 'object' ? layout : base;

  // Sections: keep saved order/titles, fall back to defaults.
  let sections = Array.isArray(src.sections) && src.sections.length ? src.sections : base.sections;
  sections = sections
    .map((s, i) => ({
      id: String(s.id),
      title: s.title || s.id,
      order: Number.isFinite(Number(s.order)) ? Number(s.order) : i + 1,
    }))
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({ ...s, order: i + 1 }));

  // Always guarantee the dedicated "Custom" folders zone exists (so master
  // folders have a home even on layouts saved before this feature shipped).
  if (!sections.some((s) => s.id === 'custom')) {
    const customDef = (base.sections || []).find((s) => s.id === 'custom') || { id: 'custom', title: 'Custom' };
    sections.push({ id: 'custom', title: customDef.title || 'Custom', order: sections.length + 1 });
  }

  const validSectionIds = new Set(sections.map((s) => s.id));
  const fallbackSection = sections[0]?.id || 'mainMenu';

  // Items: start from saved items, then append any default items not present
  // (so newly shipped pages still appear after an update).
  const savedItems = Array.isArray(src.items) ? src.items : [];
  const savedById = new Map(savedItems.map((it) => [it.id || it.path, it]));

  const merged = [...savedItems];
  base.items.forEach((di) => {
    if (!savedById.has(di.id || di.path)) merged.push(di);
  });

  // Build a lookup of default items to backfill gate/label metadata.
  const defaultById = new Map(base.items.map((it) => [it.id || it.path, it]));

  let items = merged
    .map((it, i) => {
      const id = it.id || it.path;
      const def = defaultById.get(id) || {};
      const type = it.type === 'group' ? 'group' : 'link';
      return {
        id,
        type,
        path: type === 'group' ? (it.path || '') : (it.path || def.path || id),
        label: it.label || def.label || id,
        section: validSectionIds.has(it.section) ? it.section : (def.section || fallbackSection),
        parentId: it.parentId || null,
        iconKey: it.iconKey || def.iconKey || undefined,
        color: it.color || def.color || undefined,
        gate: it.gate || def.gate || undefined,
        visible: it.visible !== false,
        order: Number.isFinite(Number(it.order)) ? Number(it.order) : i + 1,
      };
    });

  // Validate parent references: a parent must exist, be a "group", and not
  // create a cycle. Children inherit their parent's section.
  const byId = new Map(items.map((it) => [it.id, it]));
  const isGroup = (id) => byId.get(id)?.type === 'group';
  const hasAncestor = (startId, ancestorId) => {
    let cur = byId.get(startId)?.parentId;
    const seen = new Set();
    while (cur && !seen.has(cur)) {
      if (cur === ancestorId) return true;
      seen.add(cur);
      cur = byId.get(cur)?.parentId;
    }
    return false;
  };
  items = items.map((it) => {
    let parentId = it.parentId;
    if (parentId) {
      const parent = byId.get(parentId);
      if (!parent || !isGroup(parentId) || parentId === it.id || hasAncestor(parentId, it.id)) {
        parentId = null;
      }
    }
    const section = parentId ? (byId.get(parentId)?.section || it.section) : it.section;
    return { ...it, parentId, section };
  });

  items = items
    .sort((a, b) => a.order - b.order)
    .map((it, i) => ({ ...it, order: i + 1 }));

  return {
    ...base,
    ...(layout && typeof layout === 'object' ? layout : {}),
    sections,
    items,
  };
};

/**
 * Get the sidebar layout for a client.
 * @param {string} [clientId] - optional explicit client id; auto-resolved if omitted.
 * @returns {Promise<object>} normalized layout config
 */
export const getSidebarLayout = async (clientId) => {
  const id = clientId || resolveClientId();

  // 1) Local customization / offline cache.
  try {
    const cached = localStorage.getItem(storageKey(id));
    if (cached) return normalizeSidebarLayout(JSON.parse(cached));
  } catch {
    /* ignore corrupted cache */
  }

  // 2) TODO: backend fetch (uncomment when the API exists).
  // try {
  //   const res = await fetch(toRrgoldApiUrl(`/api/sidebar-layout?clientId=${encodeURIComponent(id)}`), {
  //     headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  //   });
  //   if (res.ok) {
  //     const data = await res.json(); // expected: { success, layout: { sections, items } }
  //     return normalizeSidebarLayout(data.layout || data);
  //   }
  // } catch (err) {
  //   console.warn('sidebar-layout fetch failed, using default:', err?.message);
  // }

  // 3) Bundled default.
  const def = normalizeSidebarLayout(defaultLayout);
  def.clientId = id;
  return def;
};

/**
 * Persist the sidebar layout for a client.
 * @param {object} layout - the full layout config to save.
 * @param {string} [clientId]
 * @returns {Promise<object>} the saved (normalized) layout
 */
export const saveSidebarLayout = async (layout, clientId) => {
  const id = clientId || resolveClientId();
  const normalized = normalizeSidebarLayout(layout);
  normalized.clientId = id;
  normalized.updatedAt = new Date().toISOString();

  try {
    localStorage.setItem(storageKey(id), JSON.stringify(normalized));
  } catch {
    /* storage full / unavailable */
  }

  try {
    const response = await fetch(dynamicSidebarUrl(id), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ClientCode: id, layout: normalized }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn('dynamicSidebar save failed:', response.status, body);
    }
  } catch (err) {
    console.warn('dynamicSidebar save failed (kept locally):', err?.message);
  }

  return normalized;
};

/** Reset a client's layout back to the bundled default. */
export const resetSidebarLayout = async (clientId) => {
  const id = clientId || resolveClientId();
  try {
    localStorage.removeItem(storageKey(id));
  } catch {
    /* ignore */
  }
  const def = normalizeSidebarLayout(defaultLayout);
  def.clientId = id;
  return def;
};

export const defaultSidebarLayout = defaultLayout;

export default {
  resolveClientId,
  normalizeSidebarLayout,
  getSidebarLayout,
  saveSidebarLayout,
  resetSidebarLayout,
  defaultSidebarLayout,
};
