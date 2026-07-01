import axios from 'axios';

export const STOCK_VERIFICATION_SESSION_URL =
  'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllStockVerificationBySession';

const pickField = (obj, keys, fallback = undefined) => {
  if (!obj) return fallback;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return fallback;
};

/** Item quantity — API totals count pieces/qty, not always one row per piece. */
export const getSessionItemQty = (item) => {
  const qty = Number(
    item?.Quantity ?? item?.quantity ?? item?.Pieces ?? item?.pieces ?? item?.Qty ?? item?.qty ?? 1
  );
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
};

export const sumSessionListQty = (items = []) =>
  (items || []).reduce((sum, item) => sum + getSessionItemQty(item), 0);

export const sumSessionListWeight = (items = [], field) =>
  (items || []).reduce((sum, item) => sum + (parseFloat(item?.[field]) || 0), 0);

export const normalizeSessionDetails = (data = {}) => ({
  ...data,
  ScanBatchId: data.ScanBatchId ?? data.scanBatchId,
  SessionId: data.SessionId ?? data.sessionId,
  SessionNumber: data.SessionNumber ?? data.sessionNumber,
  BatchName: data.BatchName ?? data.batchName,
  BranchId: data.BranchId ?? data.branchId,
  BranchName: data.BranchName ?? data.branchName,
  ClientCode: data.ClientCode ?? data.clientCode,
  MatchedList: data.MatchedList ?? data.matchedList ?? [],
  UnmatchedList: data.UnmatchedList ?? data.unmatchedList ?? [],
  Totals: data.Totals ?? data.totals ?? {},
});

const mergeSessionItems = (existing, incoming) => {
  const seen = new Set();
  const merged = [];
  [...existing, ...incoming].forEach((item) => {
    const key =
      item?.Id ??
      item?.id ??
      `${item?.RFIDCode ?? item?.rfidCode ?? ''}|${item?.ItemCode ?? item?.itemCode ?? ''}|${item?.ProductName ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });
  return merged;
};

const buildSessionRequestPayload = (clientCode, scanBatchId, overrides = {}) => ({
  ClientCode: clientCode,
  clientCode,
  ScanBatchId: scanBatchId,
  pageNumber: 1,
  pageSize: 50000,
  returnAllData: true,
  status: null,
  counterName: null,
  categoryName: null,
  productName: null,
  designName: null,
  purityName: null,
  companyName: null,
  branchName: null,
  fromDate: null,
  toDate: null,
  ...overrides,
});

/** Fetch session with all matched/unmatched rows (paginate if API caps page size). */
export const fetchFullStockVerificationSession = async (clientCode, scanBatchId, headers = {}) => {
  const request = (overrides) =>
    axios
      .post(STOCK_VERIFICATION_SESSION_URL, buildSessionRequestPayload(clientCode, scanBatchId, overrides), {
        headers: { 'Content-Type': 'application/json', ...headers },
      })
      .then((res) => normalizeSessionDetails(res.data));

  let session = await request({ pageNumber: 1, pageSize: 50000, returnAllData: true });
  let matchedList = [...(session.MatchedList || [])];
  let unmatchedList = [...(session.UnmatchedList || [])];

  const expectedMatchQty = Number(pickField(session.Totals, ['TotalMatchQty', 'MatchedQty', 'matchedQty'], 0)) || 0;
  const expectedUnmatchQty =
    Number(pickField(session.Totals, ['TotalUnmatchQty', 'UnmatchQty', 'unmatchQty'], 0)) || 0;

  let page = 2;
  const maxPages = 50;
  while (
    page <= maxPages &&
    ((expectedMatchQty > 0 && sumSessionListQty(matchedList) < expectedMatchQty) ||
      (expectedUnmatchQty > 0 && sumSessionListQty(unmatchedList) < expectedUnmatchQty))
  ) {
    const next = await request({ pageNumber: page, pageSize: 5000, returnAllData: true });
    const nextMatched = next.MatchedList || [];
    const nextUnmatched = next.UnmatchedList || [];
    if (!nextMatched.length && !nextUnmatched.length) break;
    const prevMatchedQty = sumSessionListQty(matchedList);
    const prevUnmatchedQty = sumSessionListQty(unmatchedList);
    matchedList = mergeSessionItems(matchedList, nextMatched);
    unmatchedList = mergeSessionItems(unmatchedList, nextUnmatched);
    if (
      sumSessionListQty(matchedList) === prevMatchedQty &&
      sumSessionListQty(unmatchedList) === prevUnmatchedQty
    ) {
      break;
    }
    if (nextMatched.length < 5000 && nextUnmatched.length < 5000) break;
    page += 1;
  }

  return reconcileSessionDetails(session, matchedList, unmatchedList);
};

/** Align summary totals with loaded lists (qty + weight). Prefer list sums when data is loaded. */
export const reconcileSessionDetails = (session, matchedList, unmatchedList) => {
  const apiTotals = session.Totals || {};
  const matchedQty = sumSessionListQty(matchedList);
  const unmatchQty = sumSessionListQty(unmatchedList);
  const totalQty = matchedQty + unmatchQty;

  const apiMatchQty = Number(pickField(apiTotals, ['TotalMatchQty', 'MatchedQty', 'matchedQty'], 0)) || 0;
  const apiUnmatchQty = Number(pickField(apiTotals, ['TotalUnmatchQty', 'UnmatchQty', 'unmatchQty'], 0)) || 0;
  const apiTotalQty = Number(pickField(apiTotals, ['TotalQty', 'totalQty'], 0)) || 0;

  const listsLookComplete =
    (apiMatchQty > 0 && matchedQty >= apiMatchQty && unmatchQty >= apiUnmatchQty) ||
    (apiTotalQty > 0 && totalQty >= apiTotalQty) ||
    (matchedList.length + unmatchedList.length > 0 && apiTotalQty === 0 && apiMatchQty === 0);

  const useListTotals = listsLookComplete || (matchedQty + unmatchQty > 0 && apiTotalQty === 0);

  const Totals = useListTotals
    ? {
        ...apiTotals,
        TotalQty: totalQty,
        TotalMatchQty: matchedQty,
        TotalUnmatchQty: unmatchQty,
        TotalGrossWeight: sumSessionListWeight([...matchedList, ...unmatchedList], 'GrossWeight'),
        TotalNetWeight: sumSessionListWeight([...matchedList, ...unmatchedList], 'NetWeight'),
        TotalMatchGrossWeight: sumSessionListWeight(matchedList, 'GrossWeight'),
        TotalMatchNetWeight: sumSessionListWeight(matchedList, 'NetWeight'),
      }
    : {
        ...apiTotals,
        TotalQty: apiTotalQty || totalQty,
        TotalMatchQty: apiMatchQty || matchedQty,
        TotalUnmatchQty: apiUnmatchQty || unmatchQty,
      };

  return {
    ...session,
    MatchedList: matchedList,
    UnmatchedList: unmatchedList,
    Totals,
  };
};

/** Badge / footer count for a filtered list — uses qty sum to match summary. */
export const getSessionListDisplayQty = (items = []) => sumSessionListQty(items);
