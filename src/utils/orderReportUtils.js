const num = (v) => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};

const customerDisplayName = (order) => {
  const c = order?.Customer;
  if (!c) return 'Unknown Customer';
  const parts = [c.FirstName, c.MiddleName, c.LastName, c.FirmName].filter(Boolean);
  const name = parts.join(' ').trim();
  return name || c.Mobile || c.Email || 'Unknown Customer';
};

/** Flatten CustomOrderItem rows from all orders. */
export const flattenOrderItems = (orders = []) => {
  const rows = [];
  (orders || []).forEach((order) => {
    const items = Array.isArray(order.CustomOrderItem) ? order.CustomOrderItem : [];
    items.forEach((item) => {
      rows.push({
        order,
        item,
        customerId: order.CustomerId ?? order.Customer?.Id ?? item.CustomerId,
        customerName: customerDisplayName(order),
        orderNo: order.OrderNo || order.OrderId || '',
        sku: String(item.SKU || item.sku || '').trim(),
        itemCode: String(item.ItemCode || item.itemCode || '').trim(),
        productName: String(item.ProductName || item.DesignName || '').trim(),
        purity: String(item.PurityName || item.Purity || '').trim(),
        qty: num(item.Quantity || item.Pieces || 1),
        grossWt: num(item.GrossWt || item.TotalWt),
        stoneWt: num(item.StoneWt || item.TotalStoneWeight),
        netWt: num(item.NetWt),
        stoneAmt: num(item.StoneAmount || item.TotalStoneAmount),
        diamondAmt: num(item.DiamondAmount || item.TotalDiamondAmount),
        amount: num(item.Amount || item.finalPrice),
        remark: String(item.Remark || order.Remark || '').trim(),
        branchName: String(item.BranchName || '').trim(),
        orderDate: order.OrderDate || item.OrderDate || '',
        deliverDate: item.DeliverDate || item.DeliveryDate || '',
      });
    });
  });
  return rows;
};

const skuKey = (row) => {
  const sku = row.sku;
  if (sku) return sku;
  if (row.productName) return row.productName;
  return 'Unassigned SKU';
};

/** SKU-wise summary — matches SKU Wise Order Summary table. */
export const buildSkuWiseReport = (orders = []) => {
  const map = new Map();
  flattenOrderItems(orders).forEach((row) => {
    const key = skuKey(row);
    if (!map.has(key)) {
      map.set(key, {
        sku: key,
        referenceItemCode: row.itemCode || '-',
        qty: 0,
        purities: new Set(),
        grossWt: 0,
        stoneWt: 0,
        netWt: 0,
        remarks: new Set(),
      });
    }
    const entry = map.get(key);
    entry.qty += row.qty;
    if (row.purity) entry.purities.add(row.purity);
    entry.grossWt += row.grossWt;
    entry.stoneWt += row.stoneWt;
    entry.netWt += row.netWt;
    if (row.remark) entry.remarks.add(row.remark);
    if (row.itemCode && entry.referenceItemCode === '-') {
      entry.referenceItemCode = row.itemCode;
    }
  });

  return [...map.values()]
    .map((row) => ({
      ...row,
      purity: [...row.purities].join(', ') || '-',
      remark: [...row.remarks].join('; ') || '-',
    }))
    .sort((a, b) => String(a.sku).localeCompare(String(b.sku), undefined, { numeric: true }));
};

/** Customer-wise summary — matches Customer Wise Order Summary table. */
export const buildCustomerWiseReport = (orders = []) => {
  const map = new Map();
  (orders || []).forEach((order) => {
    const customerId = order.CustomerId ?? order.Customer?.Id ?? 'unknown';
    const key = String(customerId);
    if (!map.has(key)) {
      map.set(key, {
        customerId: key,
        customerName: customerDisplayName(order),
        totalOrder: 0,
        qty: 0,
        grossWt: 0,
        netWt: 0,
        stoneAmt: 0,
        diamondAmt: 0,
        totalAmt: 0,
        orderIds: new Set(),
      });
    }
    const entry = map.get(key);
    const orderKey = String(order.Id ?? order.OrderId ?? order.OrderNo ?? '');
    if (orderKey && !entry.orderIds.has(orderKey)) {
      entry.orderIds.add(orderKey);
      entry.totalOrder += 1;
    }
    entry.totalAmt += num(order.TotalAmount || order.TotalNetAmount);
    const items = Array.isArray(order.CustomOrderItem) ? order.CustomOrderItem : [];
    items.forEach((item) => {
      entry.qty += num(item.Quantity || item.Pieces || 1);
      entry.grossWt += num(item.GrossWt || item.TotalWt);
      entry.netWt += num(item.NetWt);
      entry.stoneAmt += num(item.StoneAmount || item.TotalStoneAmount);
      entry.diamondAmt += num(item.DiamondAmount || item.TotalDiamondAmount);
    });
  });

  return [...map.values()]
    .sort((a, b) => String(a.customerName).localeCompare(String(b.customerName)));
};

const dateOnly = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

export const filterOrdersForReport = (orders = [], { branch = '', search = '', fromDate = '', toDate = '', deliveryDate = '' } = {}) => {
  const q = String(search || '').trim().toLowerCase();
  const branchQ = String(branch || '').trim().toLowerCase();
  const from = fromDate ? new Date(fromDate) : null;
  const to = toDate ? new Date(toDate) : null;
  if (to) to.setHours(23, 59, 59, 999);
  const deliveryQ = String(deliveryDate || '').trim();

  return (orders || []).filter((order) => {
    const items = Array.isArray(order.CustomOrderItem) ? order.CustomOrderItem : [];
    const branchNames = items.map((i) => String(i.BranchName || '').toLowerCase()).filter(Boolean);
    if (branchQ && branchQ !== 'all branches') {
      const branchMatch = branchNames.some((name) => name === branchQ || name.includes(branchQ));
      if (!branchMatch) return false;
    }

    const orderDate = order.OrderDate ? new Date(order.OrderDate) : null;
    if (from && orderDate && orderDate < from) return false;
    if (to && orderDate && orderDate > to) return false;

    if (deliveryQ) {
      const hasDelivery = items.some((item) => dateOnly(item.DeliverDate || item.DeliveryDate) === deliveryQ);
      if (!hasDelivery) return false;
    }

    if (!q) return true;
    const customer = customerDisplayName(order).toLowerCase();
    const orderNo = String(order.OrderNo || order.OrderId || '').toLowerCase();
    const productHit = items.some(
      (i) =>
        String(i.ProductName || '').toLowerCase().includes(q) ||
        String(i.SKU || '').toLowerCase().includes(q) ||
        String(i.DesignName || '').toLowerCase().includes(q)
    );
    return customer.includes(q) || orderNo.includes(q) || productHit;
  });
};

export const collectReportBranches = (orders = []) => {
  const set = new Set();
  flattenOrderItems(orders).forEach((row) => {
    if (row.branchName) set.add(row.branchName);
  });
  return ['All branches', ...[...set].sort()];
};
