import { createSlice } from '@reduxjs/toolkit';

// Initial state
const initialState = {
  user: null,
  token: null,
  permissions: {
    CanViewStock: false,
    CanAddStock: false,
    CanEditStock: false,
    CanDeleteStock: false,
    CanManageUsers: false,
    CanViewReports: false,
    CanExportData: false,
    CanViewAllBranches: false,
    CanManageBranches: false,
  },
  isAuthenticated: false,
  isSuperAdmin: false,
  isSubUser: false,
  roleType: null,
  allowedBranchIds: null,
  hasAllBranchAccess: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token, permissions, roleType, isSuperAdmin, isSubUser, allowedBranchIds, hasAllBranchAccess } = action.payload;
      state.user = user;
      state.token = token;
      state.permissions = permissions || initialState.permissions;
      state.roleType = roleType || null;
      state.isSuperAdmin = isSuperAdmin || false;
      state.isSubUser = isSubUser || false;
      state.allowedBranchIds = allowedBranchIds || null;
      state.hasAllBranchAccess = hasAllBranchAccess || false;
      state.isAuthenticated = true;
    },
    updatePermissions: (state, action) => {
      state.permissions = { ...state.permissions, ...action.payload };
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.permissions = initialState.permissions;
      state.roleType = null;
      state.isSuperAdmin = false;
      state.isSubUser = false;
      state.allowedBranchIds = null;
      state.hasAllBranchAccess = false;
      state.isAuthenticated = false;
    },
    clearAuth: (state) => {
      return initialState;
    },
  },
});

export const { setCredentials, updatePermissions, logout, clearAuth } = authSlice.actions;
export default authSlice.reducer;
