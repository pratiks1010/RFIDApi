/** Design number from labelled-stock / scan row (e.g. 124g-5, 245D245-1). Never returns item code. */
const lineItemCodeFromItem = (item) => {
  if (!item) return '';
  const pick = (...keys) => {
    for (const key of keys) {
      const value = item[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return '';
  };
  return pick('ItemCode', 'Itemcode', 'itemCode', 'ITEMCODE', 'Item_Code', 'ITMCode');
};

const isSameAsItemCode = (value, itemCode) => {
  if (!value || !itemCode) return false;
  return String(value).trim().toLowerCase() === String(itemCode).trim().toLowerCase();
};

/** Design column / card title — design code or name only, never item code. */
export const lineDesignFieldValue = (item) => {
  if (!item || typeof item !== 'object') return '—';
  const merged = { ...(item.fullItemData || {}), ...item };
  const itemCode = lineItemCodeFromItem(merged);
  const pick = (...keys) => {
    for (const key of keys) {
      const value = merged[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return '';
  };
  const designNo = pick(
    'DesignNo',
    'DesignNO',
    'design_no',
    'DesignCode',
    'designCode',
    'DesignNumber',
    'designNumber'
  );
  const designName = pick('DesignName', 'Design', 'designName', 'design_id');
  if (designNo && !isSameAsItemCode(designNo, itemCode)) return designNo;
  if (designName && !isSameAsItemCode(designName, itemCode)) return designName;
  return '—';
};

/** Normalize design fields when building scan / tray rows. */
export const normalizeProductDesignFields = (item = {}) => {
  const merged = { ...(item.fullItemData || {}), ...item };
  const display = lineDesignFieldValue(merged);
  if (display === '—') {
    return { DesignNo: '', DesignName: '', design_id: '' };
  }
  const itemCode = lineItemCodeFromItem(merged);
  const pick = (...keys) => {
    for (const key of keys) {
      const value = merged[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return '';
  };
  const designNo = pick(
    'DesignNo',
    'DesignNO',
    'design_no',
    'DesignCode',
    'designCode',
    'DesignNumber',
    'designNumber'
  );
  const designName = pick('DesignName', 'Design', 'designName', 'design_id');
  const resolvedNo =
    designNo && !isSameAsItemCode(designNo, itemCode) ? designNo : '';
  const resolvedName =
    designName && !isSameAsItemCode(designName, itemCode) ? designName : '';
  const primary = resolvedNo || resolvedName;
  return {
    DesignNo: resolvedNo,
    DesignName: resolvedName || resolvedNo,
    design_id: primary,
  };
};

export const designNoFromItem = (item) => {
  const design = lineDesignFieldValue(item);
  return design === '—' ? '' : design;
};

/** Card/list title: design only (no item code). */
export const lineDesignDisplayTitle = (item) => lineDesignFieldValue(item);
/**
 * Splits a design number into a base "family" and a numeric "variant" so that
 * variants of the same design stay adjacent regardless of how the scan source
 * formats the separator. All of these resolve to family "SG1234":
 *   SG1234-1, SG1234/2, SG1234_3, "SG1234 4"  (tray / barcode / RFID may differ)
 * e.g. 124g-5 → family 124g, variant 5 (keeps 124g-5 next to 124g-6).
 * e.g. 245D245-1 → family 245D245, variant 1.
 */
export const parseDesignSortKey = (designNo) => {
  const full = String(designNo || '').trim();
  if (!full) return { family: '', variant: 0, full: '' };
  // Accept -, /, _, or whitespace as the variant separator so the same base
  // design groups together even when scan modes format the suffix differently.
  const variantMatch = full.match(/^(.+?)[\s\-_/]+(\d+)$/i);
  if (variantMatch) {
    return {
      // Normalize the family so trailing separators / case never split a group.
      family: variantMatch[1].trim(),
      variant: parseInt(variantMatch[2], 10) || 0,
      full,
    };
  }
  return { family: full, variant: 0, full };
};

const localeDesign = (a, b) =>
  String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });

const familyGroupKey = (family) => String(family || '\uffff').toLowerCase();

/** Sample out / scan mode (RFID, Tray, Barcode, etc.) for grouping. */
export const outModeFromItem = (item) => {
  if (!item) return '';
  const keys = [
    'SampleOutMode',
    'sampleOutMode',
    'LastActionMode',
    'lastActionMode',
    'ScanMode',
    'scanMode',
    'LastActionType',
    'lastActionType',
  ];
  for (let i = 0; i < keys.length; i += 1) {
    const v = item[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

const modeGroupKey = (mode) => String(mode || '\uffff').toLowerCase();

export const compareItemsByDesign = (a, b) => {
  const ka = parseDesignSortKey(designNoFromItem(a));
  const kb = parseDesignSortKey(designNoFromItem(b));
  const byFamily = localeDesign(familyGroupKey(ka.family), familyGroupKey(kb.family));
  if (byFamily !== 0) return byFamily;
  if (ka.variant !== kb.variant) return ka.variant - kb.variant;
  return localeDesign(ka.full, kb.full);
};

/**
 * Pure design-name ordering: every item sorted by design (family → variant → full),
 * with no scan-mode bucketing. Same design names stay adjacent and the whole list
 * follows one continuous design-name order.
 */
export const sortProductsByDesignName = (items) => {
  if (!items?.length) return [];
  return [...items].sort(compareItemsByDesign);
};

/** Scan timestamp (ms) from a scanned row; 0 when missing/invalid. */
const scannedAtMs = (item) => {
  const raw = item?.__scannedAt ?? item?.scannedAt ?? item?.ScannedAt;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
};

/**
 * Live-scan ordering: newest-scanned items first (so the latest scan is always on
 * top / page 1, no paging needed), and within the same scan moment keep the same
 * design together (design-wise). Re-scanning an item bumps it to the top.
 */
export const sortProductsByRecencyThenDesign = (items) => {
  if (!items?.length) return [];
  return items
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => {
      const byTime = scannedAtMs(b.item) - scannedAtMs(a.item);
      if (byTime !== 0) return byTime;
      const byDesign = compareItemsByDesign(a.item, b.item);
      if (byDesign !== 0) return byDesign;
      return a.idx - b.idx;
    })
    .map((entry) => entry.item);
};

/** Group by design family, sort families and numeric variants (124g-5 before 124g-6). */
export const sortProductsByDesign = (items) => {
  if (!items?.length) return [];
  const groups = new Map();
  items.forEach((item) => {
    const { family } = parseDesignSortKey(designNoFromItem(item));
    const key = familyGroupKey(family);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  const sortedFamilies = [...groups.keys()].sort(localeDesign);
  const out = [];
  sortedFamilies.forEach((key) => {
    const batch = groups.get(key).slice().sort(compareItemsByDesign);
    out.push(...batch);
  });
  return out;
};

/** Group by out mode, then design family within each mode. */
export const sortProductsByModeThenDesign = (items) => {
  if (!items?.length) return [];
  const modeGroups = new Map();
  items.forEach((item) => {
    const key = modeGroupKey(outModeFromItem(item));
    if (!modeGroups.has(key)) modeGroups.set(key, []);
    modeGroups.get(key).push(item);
  });
  const sortedModes = [...modeGroups.keys()].sort(localeDesign);
  const out = [];
  sortedModes.forEach((key) => {
    out.push(...sortProductsByDesign(modeGroups.get(key)));
  });
  return out;
};

/** Paginate without splitting mode groups; within each mode keep design families together. */
export const buildModeAndDesignAwarePages = (items, pageSize) => {
  const sorted = sortProductsByModeThenDesign(items);
  if (!sorted.length) return [];

  const pages = [];
  let current = [];
  const flush = () => {
    if (current.length) {
      pages.push(current);
      current = [];
    }
  };

  let idx = 0;
  while (idx < sorted.length) {
    const startMode = modeGroupKey(outModeFromItem(sorted[idx]));
    let modeEnd = idx + 1;
    while (modeEnd < sorted.length) {
      if (modeGroupKey(outModeFromItem(sorted[modeEnd])) !== startMode) break;
      modeEnd += 1;
    }
    const modeSlice = sorted.slice(idx, modeEnd);
    const designPages = buildDesignAwarePages(modeSlice, pageSize);
    designPages.forEach((page) => {
      if (current.length > 0 && current.length + page.length > pageSize) flush();
      if (page.length > pageSize) {
        flush();
        for (let g = 0; g < page.length; g += pageSize) {
          pages.push(page.slice(g, g + pageSize));
        }
      } else {
        current.push(...page);
        if (current.length >= pageSize) flush();
      }
    });
    idx = modeEnd;
  }
  flush();
  return pages;
};

/** Paginate without splitting a design family when it fits on one page. */
export const buildDesignAwarePages = (items, pageSize) => {
  if (!items?.length) return [];
  const pages = [];
  let current = [];
  const flush = () => {
    if (current.length) {
      pages.push(current);
      current = [];
    }
  };
  let idx = 0;
  while (idx < items.length) {
    const startFamily = familyGroupKey(
      parseDesignSortKey(designNoFromItem(items[idx])).family
    );
    let end = idx + 1;
    while (end < items.length) {
      const fam = familyGroupKey(parseDesignSortKey(designNoFromItem(items[end])).family);
      if (fam !== startFamily) break;
      end += 1;
    }
    const group = items.slice(idx, end);
    if (current.length > 0 && current.length + group.length > pageSize) flush();
    if (group.length > pageSize) {
      flush();
      for (let g = 0; g < group.length; g += pageSize) {
        pages.push(group.slice(g, g + pageSize));
      }
    } else {
      current.push(...group);
      if (current.length >= pageSize) flush();
    }
    idx = end;
  }
  flush();
  return pages;
};
