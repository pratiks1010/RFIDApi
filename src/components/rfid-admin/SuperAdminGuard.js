import React from 'react';
import { Navigate } from 'react-router-dom';
import { isSuperAdmin } from '../../utils/authState';

const SuperAdminGuard = ({ children }) => {
  if (!isSuperAdmin()) {
    return <Navigate to="/analytics" replace />;
  }
  return children;
};

export default SuperAdminGuard;
