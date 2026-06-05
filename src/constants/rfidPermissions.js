/** All dashboard permission flags from RFID User Management API */
export const PERMISSION_KEYS = [
  'CanAddStock',
  'CanViewStock',
  'CanEditStock',
  'CanDeleteStock',
  'CanStockVerification',
  'CanDesignLabel',
  'CanCreatePRNLabel',
  'CanQuotation',
  'CanInvoice',
  'CanSampleIn',
  'CanSampleOut',
  'CanStockTransfer',
  'CanOrderList',
  'CanViewReports',
  'CanScanToDesktop',
  'CanRFIDTagsSheetUpload',
  'CanRFIDTagList',
  'CanRFIDTagsUsage',
  'CanManageUsers',
  'CanExportData',
  'CanViewAllBranches',
  'CanManageBranches',
];

export const PERMISSION_LABELS = {
  CanAddStock: 'Add Inventory',
  CanViewStock: 'Inventory List',
  CanEditStock: 'Edit Stock',
  CanDeleteStock: 'Delete Stock',
  CanStockVerification: 'Stock Verification',
  CanDesignLabel: 'Design Label',
  CanCreatePRNLabel: 'Create PRN Label',
  CanQuotation: 'Quotation',
  CanInvoice: 'Invoice',
  CanSampleIn: 'Sample In',
  CanSampleOut: 'Sample Out',
  CanStockTransfer: 'Stock Transfer',
  CanOrderList: 'Order List',
  CanViewReports: 'Reports',
  CanScanToDesktop: 'Scan to Desktop',
  CanRFIDTagsSheetUpload: 'RFID Tags Upload',
  CanRFIDTagList: 'RFID Tag List',
  CanRFIDTagsUsage: 'RFID Tags Usage',
  CanManageUsers: 'Manage Users',
  CanExportData: 'Export Data',
  CanViewAllBranches: 'View All Branches',
  CanManageBranches: 'Manage Branches',
};

export const ROLE_OPTIONS = ['User', 'Admin', 'Manager', 'Viewer'];

export const emptyPermissions = () =>
  PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {});

export const allPermissionsTrue = () =>
  PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});
