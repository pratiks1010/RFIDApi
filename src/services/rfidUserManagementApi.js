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
  getMyRFIDPlan: () => toSoniApiUrl('/api/RFIDUserManagement/GetMyRFIDPlan'),
  /** Legacy read endpoint — same data shape */
  getMyRFIDPlanLegacy: () => toSoniApiUrl('/api/ProductMaster/GetMyRFIDPlan'),
  changeRFIDPlan: () => toSoniApiUrl('/api/RFIDUserManagement/ChangeRFIDPlan'),
};

/** Unwrap { success, data } or raw plan object; normalize camel + Pascal keys */
export const normalizePlan = (raw) => {
  const src = raw?.data ?? raw?.Data ?? raw;
  if (!src || typeof src !== 'object') return null;
  const planName = src.planName ?? src.PlanName ?? '';
  const maxSubUsers = src.maxSubUsers ?? src.MaxSubUsers ?? 0;
  const currentSubUsers = src.currentSubUsers ?? src.CurrentSubUsers ?? 0;
  const remainingSubUsers =
    src.remainingSubUsers ??
    src.RemainingSubUsers ??
    Math.max(0, maxSubUsers - currentSubUsers);
  const planStartDate = src.planStartDate ?? src.PlanStartDate ?? null;
  const planExpiryDate = src.planExpiryDate ?? src.PlanExpiryDate ?? null;
  const isExpired = Boolean(src.isExpired ?? src.IsExpired);
  const clientCode = src.clientCode ?? src.ClientCode ?? '';
  return {
    planName,
    maxSubUsers,
    currentSubUsers,
    remainingSubUsers,
    planStartDate,
    planExpiryDate,
    isExpired,
    clientCode,
    PlanName: planName,
    MaxSubUsers: maxSubUsers,
    CurrentSubUsers: currentSubUsers,
    RemainingSubUsers: remainingSubUsers,
    PlanStartDate: planStartDate,
    PlanExpiryDate: planExpiryDate,
    IsExpired: isExpired,
    ClientCode: clientCode,
  };
};

export const fetchMyRFIDPlan = async () => {
  const headers = authHeaders();
  try {
    const res = await fetch(rfidUserUrls.getMyRFIDPlan(), { headers });
    if (!res.ok) throw new Error('plan fetch failed');
    const json = await res.json();
    const plan = normalizePlan(json);
    if (plan) return plan;
  } catch (_) {
    /* try legacy */
  }
  const legacy = await fetch(rfidUserUrls.getMyRFIDPlanLegacy(), { headers });
  if (!legacy.ok) throw new Error('Plan details unavailable');
  const json = await legacy.json();
  const plan = normalizePlan(json);
  if (!plan) throw new Error('Plan details unavailable');
  return plan;
};

export const postChangeRFIDPlan = async (payload) => {
  const res = await fetch(rfidUserUrls.changeRFIDPlan(), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      json?.message || json?.Message || json?.error || 'Failed to update plan'
    );
    err.response = { data: json };
    throw err;
  }
  return {
    message: json?.message || json?.Message || 'RFID plan updated successfully.',
    plan: normalizePlan(json?.data ?? json?.Data ?? json),
  };
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
