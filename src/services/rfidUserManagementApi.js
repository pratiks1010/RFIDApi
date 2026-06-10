import { toSoniApiUrl } from './apiBaseConfig';

export const rfidUserUrls = {
  getAllSubUsers: () => toSoniApiUrl('/api/RFIDUserManagement/GetAllSubUsers'),
  createDashboardUser: () => toSoniApiUrl('/api/RFIDUserManagement/CreateDashboardUser'),
  updateSubUser: () => toSoniApiUrl('/api/RFIDUserManagement/UpdateSubUser'),
  deleteSubUser: () => toSoniApiUrl('/api/RFIDUserManagement/DeleteSubUser'),
  getAvailableModules: () => toSoniApiUrl('/api/RFIDUserManagement/GetAvailableModules'),
  updateModulePermissions: () => toSoniApiUrl('/api/RFIDUserManagement/UpdateModulePermissions'),
  toggleUserStatus: () => toSoniApiUrl('/api/RFIDUserManagement/ToggleUserStatus'),
  forceLogout: () => toSoniApiUrl('/api/RFIDUserManagement/ForceLogout'),
  getUserBranchAccess: (userId) =>
    toSoniApiUrl(`/api/RFIDUserManagement/GetUserBranchAccess?userId=${encodeURIComponent(userId)}`),
  assignBranches: () => toSoniApiUrl('/api/RFIDUserManagement/AssignBranches'),
  getEmployeesForSubUser: () => toSoniApiUrl('/api/RFIDUserManagement/GetEmployeesForSubUser'),
  convertEmployeeToSubUser: () => toSoniApiUrl('/api/RFIDUserManagement/ConvertEmployeeToSubUser'),
  linkSubUserToEmployee: () => toSoniApiUrl('/api/RFIDUserManagement/LinkSubUserToEmployee'),
  getMyRFIDPlan: () => toSoniApiUrl('/api/ProductMaster/GetMyRFIDPlan'),
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
