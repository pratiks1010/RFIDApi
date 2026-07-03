import axios from 'axios';
import { toSoniApiUrl } from '../../../../services/apiBaseConfig';

export const STOCK_VERIFICATION_RECONCILE_URL = toSoniApiUrl(
  '/api/RFIDStock/StockVerificationReconcile'
);

export const SAVE_RFID_TRANSACTION_URL = toSoniApiUrl(
  '/api/ProductMaster/SaveRFIDTransactionDetails'
);

const asStringList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((x) => (typeof x === 'object' && x != null ? x.itemCode ?? x.ItemCode ?? x.code ?? x.Code : x))
      .map((x) => String(x || '').trim())
      .filter(Boolean);
  }
  return [];
};

/** Normalize reconcile API response — sold / not-found item codes */
export const parseReconcileResponse = (data) => {
  const root = data?.data ?? data?.Data ?? data ?? {};
  const sold = asStringList(
    root.soldItemCodes ??
      root.SoldItemCodes ??
      root.itemsMarkedSold ??
      root.ItemsMarkedSold ??
      root.sold ??
      root.Sold
  );
  const notFound = asStringList(
    root.notFoundItemCodes ??
      root.NotFoundItemCodes ??
      root.notFoundInInventory ??
      root.NotFoundInInventory ??
      root.notFound ??
      root.NotFound
  );
  const presentCount =
    root.presentCount ??
    root.PresentCount ??
    root.presentItemCodesCount ??
    root.receivedCount ??
    null;
  const markedSoldCount =
    root.markedSoldCount ??
    root.MarkedSoldCount ??
    root.soldCount ??
    root.SoldCount ??
    (sold.length || null);
  const activeBefore =
    root.activeCountBefore ??
    root.ActiveCountBefore ??
    root.totalActiveBefore ??
    null;

  return {
    success: data?.success !== false && data?.Success !== false,
    message: data?.message ?? data?.Message ?? root?.message ?? root?.Message ?? '',
    sold,
    notFound,
    presentCount,
    markedSoldCount,
    activeBefore,
    raw: root,
  };
};

export const postStockVerificationReconcile = async (payload, token) => {
  const res = await axios.post(STOCK_VERIFICATION_RECONCILE_URL, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return parseReconcileResponse(res.data);
};

export default postStockVerificationReconcile;
