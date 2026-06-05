import React from 'react';
import { Navigate } from 'react-router-dom';
import { getAuthState, hasPermission, getDefaultHomePath } from '../../utils/authState';

/**
 * Route guard: sub-user permissions + optional admin-only / sub-user-only routes.
 */
const PermissionGuard = ({
  permission,
  adminOnly = false,
  subUserOnly = false,
  fallback,
  children,
}) => {
  const state = getAuthState();
  const redirectTo = fallback || getDefaultHomePath();

  if (!state) {
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && state.isSubUser) {
    return <Navigate to={redirectTo} replace />;
  }
  if (subUserOnly && !state.isSubUser) {
    return <Navigate to="/analytics" replace />;
  }
  if (permission && !hasPermission(permission)) {
    return <Navigate to={redirectTo} replace />;
  }
  return children;
};

export default PermissionGuard;
