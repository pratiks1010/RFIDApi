import { allPermissionsTrue } from '../constants/rfidPermissions';

const AUTH_STATE_KEY = 'rfidAuthState';

export const parseJwtPayload = (token) => {
  const parts = String(token || '').split('.');
  if (parts.length < 2) return null;
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(window.atob(base64));
};

const normalizePermissionsFromApi = (raw = {}) => {
  const merged = { ...raw };
  Object.keys(raw).forEach((key) => {
    if (key.startsWith('can') && key.length > 3) {
      const pascal = `Can${key.slice(3)}`;
      if (merged[pascal] === undefined) merged[pascal] = raw[key];
    } else if (key.startsWith('Can')) {
      const camel = key.charAt(0).toLowerCase() + key.slice(1);
      if (merged[camel] === undefined) merged[camel] = raw[key];
    }
  });
  return merged;
};

export const buildAuthStateFromLogin = (loginResponse = {}, token) => {
  const payload = parseJwtPayload(token) || {};
  const permissions = loginResponse.IsSubUser === false
    ? allPermissionsTrue()
    : normalizePermissionsFromApi(loginResponse.Permissions || loginResponse.permissions || {});

  return {
    token,
    isSubUser: Boolean(loginResponse.IsSubUser),
    roleType: loginResponse.RoleType || payload.role || 'User',
    clientCode:
      payload.ClientCode ||
      payload.clientcode ||
      loginResponse.ClientCode ||
      '',
    permissions,
    allowedBranchIds: loginResponse.AllowedBranchIds ?? null,
    hasAllBranchAccess: Boolean(loginResponse.HasAllBranchAccess),
    userName:
      payload.unique_name ||
      payload.sub ||
      loginResponse.UserName ||
      '',
    userId:
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      payload.nameid ||
      loginResponse.UserId ||
      '',
  };
};

export const persistAuthState = (authState) => {
  if (authState) {
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authState));
  } else {
    localStorage.removeItem(AUTH_STATE_KEY);
  }
};

export const getAuthState = () => {
  try {
    const raw = localStorage.getItem(AUTH_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {
    /* ignore */
  }
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return buildAuthStateFromLogin(
      {
        IsSubUser: userInfo.IsSubUser,
        RoleType: userInfo.RoleType,
        Permissions: userInfo.Permissions,
        AllowedBranchIds: userInfo.AllowedBranchIds,
        HasAllBranchAccess: userInfo.HasAllBranchAccess,
      },
      token
    );
  } catch (_) {
    return null;
  }
};

export const isSuperAdmin = () => {
  const state = getAuthState();
  if (state) return state.isSubUser === false;
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (userInfo.IsSubUser === true) return false;
    if (userInfo.IsSubUser === false) return true;
    return Boolean(localStorage.getItem('token'));
  } catch (_) {
    return false;
  }
};

export const hasPermission = (key) => {
  const state = getAuthState();
  if (!state) return false;
  if (!state.isSubUser) return true;
  const camel =
    key.startsWith('Can') && key.length > 3
      ? key.charAt(0).toLowerCase() + key.slice(1)
      : null;
  const pascal =
    key.startsWith('can') && key.length > 3
      ? `Can${key.slice(3)}`
      : key.startsWith('Can')
        ? key
        : null;
  if (state.permissions?.[key] === true) return true;
  if (camel && state.permissions?.[camel] === true) return true;
  if (pascal && state.permissions?.[pascal] === true) return true;
  return false;
};

export const getDefaultHomePath = () => {
  const state = getAuthState();
  return state?.isSubUser ? '/my-samples' : '/analytics';
};

/** API expects camelCase permission keys */
export const permissionsToApiPayload = (permissions = {}) => {
  const out = {};
  Object.entries(permissions).forEach(([key, value]) => {
    const camel = key.startsWith('Can')
      ? key.charAt(0).toLowerCase() + key.slice(1)
      : key;
    out[camel] = Boolean(value);
  });
  return out;
};

export const clearAuthState = () => {
  localStorage.removeItem(AUTH_STATE_KEY);
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('lastLoginTime');
  localStorage.removeItem('showWelcomeToast');
};

export const getClientCode = () => {
  const state = getAuthState();
  if (state?.clientCode) return state.clientCode;
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return userInfo.ClientCode || userInfo.clientCode || userInfo.clientcode || '';
  } catch (_) {
    return '';
  }
};
