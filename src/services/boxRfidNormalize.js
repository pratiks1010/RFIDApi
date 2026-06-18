const asArray = (value) => (Array.isArray(value) ? value : []);

export const pickVal = (obj, ...keys) => {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && (typeof v !== 'string' || String(v).trim() !== '')) return v;
  }
  return undefined;
};

const unwrapRoot = (raw) => {
  if (!raw || typeof raw !== 'object') return {};
  if (
    raw.box ||
    raw.Box ||
    raw.products ||
    raw.Products ||
    raw.summary ||
    raw.Summary ||
    raw.boxes ||
    raw.Boxes
  ) {
    return raw;
  }
  const inner = raw.data ?? raw.Data ?? raw.result ?? raw.Result;
  if (inner && typeof inner === 'object') {
    if (
      inner.box ||
      inner.Box ||
      inner.products ||
      inner.Products ||
      inner.summary ||
      inner.Summary ||
      inner.boxes ||
      inner.Boxes
    ) {
      return inner;
    }
    const inner2 = inner.data ?? inner.Data;
    if (inner2 && typeof inner2 === 'object') return inner2;
    return inner;
  }
  return raw;
};

export const normalizeBoxInfo = (box = {}) => ({
  boxId: pickVal(box, 'boxId', 'BoxId', 'id', 'Id'),
  boxName: pickVal(box, 'boxName', 'BoxName', 'name', 'Name') || '',
  emptyWeight: pickVal(box, 'emptyWeight', 'EmptyWeight') ?? '',
  rfidCode: pickVal(box, 'rfidCode', 'RfidCode', 'RFIDCode') ?? '',
  hexCode: pickVal(box, 'hexCode', 'HexCode') ?? '',
  tidNumber: pickVal(box, 'tidNumber', 'TidNumber', 'TIDNumber') ?? '',
  isRfidTagged: Boolean(box.isRfidTagged ?? box.IsRfidTagged),
  taggedOn: pickVal(box, 'taggedOn', 'TaggedOn') ?? null,
  lastPackedOn: pickVal(box, 'lastPackedOn', 'LastPackedOn') ?? null,
  lastScannedOn: pickVal(box, 'lastScannedOn', 'LastScannedOn') ?? null,
  categoryName: pickVal(box, 'categoryName', 'CategoryName') ?? '',
  productName: pickVal(box, 'productName', 'ProductName') ?? '',
  status: pickVal(box, 'status', 'Status') ?? '',
  totalProducts: pickVal(box, 'totalProducts', 'TotalProducts'),
  totalGrossWt: pickVal(box, 'totalGrossWt', 'TotalGrossWt'),
  totalNetWt: pickVal(box, 'totalNetWt', 'TotalNetWt'),
  grandTotalWeight: pickVal(box, 'grandTotalWeight', 'GrandTotalWeight'),
});

export const normalizeBoxSummary = (summary = {}, products = [], box = {}) => {
  const normalized = {
    totalProducts: pickVal(summary, 'totalProducts', 'TotalProducts'),
    totalGrossWt: pickVal(summary, 'totalGrossWt', 'TotalGrossWt'),
    totalNetWt: pickVal(summary, 'totalNetWt', 'TotalNetWt'),
    totalPieces: pickVal(summary, 'totalPieces', 'TotalPieces'),
    boxEmptyWeight: pickVal(summary, 'boxEmptyWeight', 'BoxEmptyWeight'),
    grandTotalWeight: pickVal(summary, 'grandTotalWeight', 'GrandTotalWeight'),
  };
  if (normalized.totalProducts == null) {
    normalized.totalProducts = pickVal(box, 'totalProducts', 'TotalProducts') ?? products.length;
  }
  if (normalized.totalGrossWt == null) {
    normalized.totalGrossWt = pickVal(box, 'totalGrossWt', 'TotalGrossWt');
  }
  if (normalized.totalNetWt == null) {
    normalized.totalNetWt = pickVal(box, 'totalNetWt', 'TotalNetWt');
  }
  if (normalized.grandTotalWeight == null) {
    normalized.grandTotalWeight = pickVal(box, 'grandTotalWeight', 'GrandTotalWeight');
  }
  if (normalized.boxEmptyWeight == null) {
    normalized.boxEmptyWeight = pickVal(box, 'emptyWeight', 'EmptyWeight');
  }
  return normalized;
};

export const normalizeBoxProduct = (product = {}) => ({
  labelledStockId: pickVal(product, 'labelledStockId', 'LabelledStockId', 'id', 'Id'),
  itemCode: pickVal(product, 'itemCode', 'ItemCode') ?? '',
  productTitle: pickVal(product, 'productTitle', 'ProductTitle') ?? '',
  hexCode: pickVal(product, 'hexCode', 'HexCode') ?? '',
  tidNumber: pickVal(product, 'tidNumber', 'TidNumber', 'TIDNumber') ?? '',
  rfidCode: pickVal(product, 'rfidCode', 'RfidCode', 'RFIDCode') ?? '',
  grossWt: pickVal(product, 'grossWt', 'GrossWt') ?? '',
  netWt: pickVal(product, 'netWt', 'NetWt') ?? '',
  pieces: pickVal(product, 'pieces', 'Pieces', 'qty', 'Qty') ?? '',
  mrp: pickVal(product, 'mrp', 'MRP', 'Mrp') ?? '',
  categoryName: pickVal(product, 'categoryName', 'CategoryName') ?? '',
  productName: pickVal(product, 'productName', 'ProductName') ?? '',
  designName: pickVal(product, 'designName', 'DesignName') ?? '',
  purityName: pickVal(product, 'purityName', 'PurityName') ?? '',
  vendorName: pickVal(product, 'vendorName', 'VendorName') ?? '',
  sku: pickVal(product, 'sku', 'SKU', 'Sku') ?? '',
  status: pickVal(product, 'status', 'Status') ?? '',
  addedToBoxOn: pickVal(product, 'addedToBoxOn', 'AddedToBoxOn') ?? null,
  addedBy: pickVal(product, 'addedBy', 'AddedBy') ?? '',
  scanMatched: Boolean(product.scanMatched ?? product.ScanMatched),
});

export const normalizeBoxDetailsResponse = (raw) => {
  const root = unwrapRoot(raw);
  const box = normalizeBoxInfo(root.box ?? root.Box ?? {});
  const products = asArray(root.products ?? root.Products).map(normalizeBoxProduct);
  const summary = normalizeBoxSummary(root.summary ?? root.Summary ?? {}, products, box);

  return {
    success: root.success ?? root.Success ?? true,
    message: String(root.message ?? root.Message ?? '').trim(),
    box,
    summary,
    products,
  };
};

export const normalizeBoxListResponse = (raw) => {
  const root = unwrapRoot(raw);
  let boxes = asArray(root.boxes ?? root.Boxes);
  if (!boxes.length) {
    boxes = asArray(root.data ?? root.Data).filter((row) => row && typeof row === 'object');
  }
  return {
    success: root.success ?? root.Success ?? true,
    message: String(root.message ?? root.Message ?? '').trim(),
    totalBoxes: pickVal(root, 'totalBoxes', 'TotalBoxes') ?? boxes.length,
    boxes: boxes.map(normalizeBoxInfo),
  };
};

/** Transfer / Unbox / Delete box operation response */
export const normalizeBoxOperationResponse = (raw) => {
  const root = unwrapRoot(raw);
  const sourceBoxRaw = root.sourceBox ?? root.SourceBox ?? {};
  const destinationBoxRaw = root.destinationBox ?? root.DestinationBox ?? {};
  const products = asArray(root.products ?? root.Products).map(normalizeBoxProduct);
  let itemCodes = asArray(root.itemCodes ?? root.ItemCodes).map((c) => String(c || '').trim()).filter(Boolean);
  if (!itemCodes.length && products.length) {
    itemCodes = products.map((p) => p.itemCode).filter(Boolean);
  }
  return {
    success: root.success ?? root.Success ?? true,
    message: String(root.message ?? root.Message ?? '').trim(),
    sourceBox: normalizeBoxInfo(sourceBoxRaw),
    destinationBox: normalizeBoxInfo(destinationBoxRaw),
    sourceSummary: normalizeBoxSummary(
      root.sourceSummary ?? root.SourceSummary ?? {},
      [],
      sourceBoxRaw
    ),
    destinationSummary: normalizeBoxSummary(
      root.destinationSummary ?? root.DestinationSummary ?? {},
      products,
      destinationBoxRaw
    ),
    products,
    itemCodes,
    sourceBoxDeleted: Boolean(root.sourceBoxDeleted ?? root.SourceBoxDeleted),
  };
};
