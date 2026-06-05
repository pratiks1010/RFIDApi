import { getRfidApiBaseUrl } from './authApiConfig';

const base = () => getRfidApiBaseUrl();

export const rfidUserUrls = {
  getAllSubUsers: () => `${base()}/api/RFIDUserManagement/GetAllSubUsers`,
  createDashboardUser: () => `${base()}/api/RFIDUserManagement/CreateDashboardUser`,
  updateSubUser: () => `${base()}/api/RFIDUserManagement/UpdateSubUser`,
  deleteSubUser: () => `${base()}/api/RFIDUserManagement/DeleteSubUser`,
  getAvailableModules: () => `${base()}/api/RFIDUserManagement/GetAvailableModules`,
  updateModulePermissions: () => `${base()}/api/RFIDUserManagement/UpdateModulePermissions`,
  toggleUserStatus: () => `${base()}/api/RFIDUserManagement/ToggleUserStatus`,
  forceLogout: () => `${base()}/api/RFIDUserManagement/ForceLogout`,
  getUserBranchAccess: (userId) =>
    `${base()}/api/RFIDUserManagement/GetUserBranchAccess?userId=${encodeURIComponent(userId)}`,
  assignBranches: () => `${base()}/api/RFIDUserManagement/AssignBranches`,
  getEmployeesForSubUser: () => `${base()}/api/RFIDUserManagement/GetEmployeesForSubUser`,
  convertEmployeeToSubUser: () => `${base()}/api/RFIDUserManagement/ConvertEmployeeToSubUser`,
  linkSubUserToEmployee: () => `${base()}/api/RFIDUserManagement/LinkSubUserToEmployee`,
  getMyRFIDPlan: () => `${base()}/api/ProductMaster/GetMyRFIDPlan`,
};

export const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

export const normalizeList = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.Data)) return data.Data;
  if (Array.isArray(data.result)) return data.result;
  if (Array.isArray(data.Employees)) return data.Employees;
  if (Array.isArray(data.employees)) return data.employees;
  return [];
};

/** GUID from ConvertEmployeeToSubUser — use as Sample Out AssignedToUserId */
export const extractConvertUserId = (data) =>
  data?.userId ??
  data?.UserId ??
  data?.data?.userId ??
  data?.data?.UserId ??
  data?.Data?.userId ??
  data?.Data?.UserId ??
  null;

export const extractApiMessage = (err) =>
  err?.response?.data?.Message ||
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  'Request failed';
