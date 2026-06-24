/** Design number from labelled-stock / scan row (e.g. 124g-5, 245D245-1). */
export const designNoFromItem = (item) => {
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
  return (
    pick('DesignNo', 'DesignNO', 'design_no', 'DesignCode') ||
    pick('DesignId', 'design_id', 'DesignName', 'Design', 'designName') ||
    ''
  );
};

/**
 * e.g. 124g-5 → family 124g, variant 5 (keeps 124g-5 next to 124g-6).
 * e.g. 245D245-1 → family 245D245, variant 1.
 */
export const parseDesignSortKey = (designNo) => {
  const full = String(designNo || '').trim();
  if (!full) return { family: '', variant: 0, full: '' };
  const variantMatch = full.match(/^(.+)-(\d+)$/i);
  if (variantMatch) {
    return {
      family: variantMatch[1],
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
