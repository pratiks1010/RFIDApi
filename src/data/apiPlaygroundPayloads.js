/**
 * Canonical API request bodies — must match real pages (Login, Register, Add Stock, etc.)
 * and rfidService helpers. Dashboard API Playground / Postman export use these samples.
 */

/** Login.js → POST …/AuthLogin */
export const PLAYGROUND_AUTH_LOGIN_BODY = {
  LoginName: 'your_username',
  Password: 'your_password',
};

/** Register.js → rfidService.registerAuthUser → POST …/AuthRegister */
export const PLAYGROUND_AUTH_REGISTER_BODY = {
  Username: 'your_username',
  Password: 'your_password',
  ClientCode: 'LS000123',
  SelectedPlan: 'Basic',
};

/** Login.js forgot-password modal → POST …/AuthForgotPassword */
export const PLAYGROUND_AUTH_FORGOT_PASSWORD_BODY = {
  loginName: 'your_username',
  clientCode: 'LS000123',
  currentPassword: 'current_password',
  newPassword: 'new_password',
  confirmPassword: 'new_password',
};

/** rfidService.buildPayloadFromData / Add Stock / Auto Push — POST …/SaveRFIDTransactionDetails (array) */
export const PLAYGROUND_SAVE_RFID_TRANSACTION_ITEM = {
  client_code: 'LS000123',
  branch_id: 'Main Branch',
  counter_id: 'Counter 1',
  RFIDNumber: 'RFID123456',
  Itemcode: 'ITEM001',
  itemcode: 'ITEM001',
  description: 'itemsize:2.12, HUIDCode:45857KIKL',
  category_id: 'Gold',
  product_id: 'Ring',
  design_id: 'Plain',
  purity_id: '22CT',
  vendor_id: '',
  box: 'Box A',
  packet: 'Packet 1',
  box_details: 'Box A',
  grosswt: '10.500',
  stonewt: '0.200',
  diamondweight: '0.100',
  diamondWeight: '0.100',
  netwt: '10.200',
  size: 0,
  stoneamount: '500',
  diamondAmount: '1000',
  HallmarkAmount: '35',
  MakingPerGram: '10',
  MakingPercentage: '5',
  MakingFixedAmt: '0',
  MRP: '50000',
  imageurl: '',
  status: 'ApiActive',
  Stones: [],
  Diamonds: [],
};

export const PLAYGROUND_SAVE_RFID_TRANSACTION_BODY = [PLAYGROUND_SAVE_RFID_TRANSACTION_ITEM];

/** GetSavedRFIDProductDetails — used with clientCode camelCase in app */
export const PLAYGROUND_GET_SAVED_RFID_PRODUCT_BODY = {
  clientCode: 'LS000123',
  itemCode: 'ITEM001',
  rfidNo: 'RFID123456',
  status: 'ApiActive',
};

export const PLAYGROUND_UPDATE_RFID_TRANSACTION_BODY = [
  { client_code: 'LS000123', itemcode: 'ITEM002' },
  { client_code: 'LS000123', itemcode: 'ITEM003', RFIDNumber: 'RFID999' },
];

export const PLAYGROUND_UPDATE_EXISTING_PRODUCTS_BODY = [
  {
    client_code: 'LS000123',
    itemcode: 'ITEM001',
    RFIDNumber: 'RFID123456',
    description: 'Updated description',
    category_id: 'Gold',
    product_id: 'Ring',
    design_id: 'Plain',
    purity_id: '22CT',
    branch_id: 'Main Branch',
    counter_id: 'Counter 1',
    vendor_id: '',
    box_details: 'Box A',
    box: 'Box A',
    packet: 'Packet 1',
    grosswt: '10.500',
    stonewt: '0',
    stoneamount: '0.00',
    diamondWeight: '0',
    diamondAmount: '0.00',
    netwt: '10.200',
    status: 'ApiActive',
    imageurl: '',
    HallmarkAmount: '0.00',
    MakingPerGram: '125.00',
    MakingPercentage: '0.00',
    MakingFixedAmt: '0.00',
    MRP: '0.000',
  },
];

export const PLAYGROUND_GET_RFID_TRANSACTION_BODY = {
  client_code: 'LS000123',
  status: 'ApiActive',
};

export const PLAYGROUND_DELETE_LABELLED_STOCK_BODY = {
  ClientCode: 'LS000123',
  ItemCodes: ['ITEM001', 'ITEM002'],
};

export const PLAYGROUND_CLIENT_CODE_ONLY = {
  ClientCode: 'LS000123',
};
