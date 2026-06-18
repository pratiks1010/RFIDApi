import axios from 'axios';
import { toRrgoldApiUrl } from './apiBaseConfig';
import {
  normalizeBoxDetailsResponse,
  normalizeBoxListResponse,
  normalizeBoxOperationResponse,
} from './boxRfidNormalize';

const boxRfidUrl = (path) => toRrgoldApiUrl(`/api/BoxRfid${path.startsWith('/') ? path : `/${path}`}`);
const productMasterUrl = (path) =>
  toRrgoldApiUrl(`/api/ProductMaster${path.startsWith('/') ? path : `/${path}`}`);

export const boxRfidAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const normalizeArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  return [];
};

/** Existing — paginated labelled stock (same as Label Stock List) */
export const getAllLabeledStock = async (payload) => {
  const { data } = await axios.post(productMasterUrl('/GetAllLabeledStock'), payload, {
    headers: boxRfidAuthHeaders(),
    timeout: 60000,
  });
  return data;
};

/** Existing — list all boxes for client */
export const getAllBoxMaster = async (clientCode) => {
  const { data } = await axios.post(
    productMasterUrl('/GetAllBoxMaster'),
    { ClientCode: clientCode },
    { headers: boxRfidAuthHeaders() }
  );
  return normalizeArray(data?.data ?? data?.Data ?? data);
};

/** Single box by id (includes RFID fields) */
export const getBoxMasterById = async ({ ClientCode, Id }) => {
  const { data } = await axios.post(
    productMasterUrl('/GetBoxMasterById'),
    { ClientCode, Id },
    { headers: boxRfidAuthHeaders() }
  );
  return data?.data ?? data?.Data ?? data;
};

/** Create box with optional RFID in one request */
export const addBoxMaster = async (payload) => {
  const { data } = await axios.post(productMasterUrl('/AddBoxMaster'), payload, {
    headers: boxRfidAuthHeaders(),
    timeout: 60000,
  });
  return data;
};

/** Update box including RFID fields */
export const updateBoxMaster = async (payload) => {
  const { data } = await axios.post(productMasterUrl('/UpdateBoxMaster'), payload, {
    headers: boxRfidAuthHeaders(),
    timeout: 60000,
  });
  return data;
};

/** NEW — attach RFID tag to box */
export const assignBoxRfidTag = async (payload) => {
  const { data } = await axios.post(boxRfidUrl('/AssignBoxRfidTag'), payload, {
    headers: boxRfidAuthHeaders(),
    timeout: 60000,
  });
  return data;
};

/** NEW — pack item codes into box */
export const addProductsToBox = async (payload) => {
  const { data } = await axios.post(boxRfidUrl('/AddProductsToBox'), payload, {
    headers: boxRfidAuthHeaders(),
    timeout: 120000,
  });
  return data;
};

/** NEW — remove items from box */
export const removeProductFromBox = async (payload) => {
  const { data } = await axios.post(boxRfidUrl('/RemoveProductFromBox'), payload, {
    headers: boxRfidAuthHeaders(),
    timeout: 60000,
  });
  return data;
};

/** NEW — tray scan: box tag + all product tags */
export const scanRfidTray = async (payload) => {
  const { data } = await axios.post(boxRfidUrl('/ScanRfidTray'), payload, {
    headers: boxRfidAuthHeaders(),
    timeout: 90000,
  });
  return data;
};

/** NEW — lookup box by box tag only */
export const getBoxByRfidTag = async (payload) => {
  const { data } = await axios.post(boxRfidUrl('/GetBoxByRfidTag'), payload, {
    headers: boxRfidAuthHeaders(),
    timeout: 60000,
  });
  return data;
};

/** NEW — list what's in a box */
export const getBoxContents = async (payload) => {
  const { data } = await axios.post(boxRfidUrl('/GetBoxContents'), payload, {
    headers: boxRfidAuthHeaders(),
    timeout: 60000,
  });
  return normalizeBoxDetailsResponse(data);
};

/** Wall screen — all boxes with summary */
export const getBoxList = async (payload) => {
  const { data } = await axios.post(boxRfidUrl('/GetBoxList'), payload, {
    headers: boxRfidAuthHeaders(),
    timeout: 60000,
  });
  return normalizeBoxListResponse(data);
};

/** Box details + products inside (same as GetBoxContents) */
export const getBoxDetails = async (payload) => {
  const { data } = await axios.post(boxRfidUrl('/GetBoxDetails'), payload, {
    headers: boxRfidAuthHeaders(),
    timeout: 60000,
  });
  return normalizeBoxDetailsResponse(data);
};

/** Move all products from one box to another */
export const transferBoxProducts = async (payload) => {
  const { data } = await axios.post(boxRfidUrl('/TransferBoxProducts'), payload, {
    headers: boxRfidAuthHeaders(),
    timeout: 120000,
  });
  return normalizeBoxOperationResponse(data);
};

/** Remove all products from box but keep the box */
export const unboxAllProducts = async (payload) => {
  const { data } = await axios.post(boxRfidUrl('/UnboxAllProducts'), payload, {
    headers: boxRfidAuthHeaders(),
    timeout: 120000,
  });
  return normalizeBoxOperationResponse(data);
};

/** Unbox all products and delete the box */
export const deleteBoxAndUnbox = async (payload) => {
  const { data } = await axios.post(boxRfidUrl('/DeleteBoxAndUnbox'), payload, {
    headers: boxRfidAuthHeaders(),
    timeout: 120000,
  });
  return normalizeBoxOperationResponse(data);
};
