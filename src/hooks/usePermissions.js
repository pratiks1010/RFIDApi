import { useAppSelector } from './hooks';

/**
 * Hook to check if user has a specific permission
 * @param {string} permission - Permission name (e.g., 'CanViewStock')
 * @returns {boolean} - True if user has the permission
 */
export const useHasPermission = (permission) => {
  const { permissions, isSuperAdmin } = useAppSelector((state) => state.auth);
  
  // Super Admin has all permissions
  if (isSuperAdmin) {
    return true;
  }
  
  return permissions?.[permission] === true;
};

/**
 * Hook to check if user has any of the specified permissions
 * @param {string[]} permissionList - Array of permission names
 * @returns {boolean} - True if user has at least one permission
 */
export const useHasAnyPermission = (permissionList) => {
  const { permissions, isSuperAdmin } = useAppSelector((state) => state.auth);
  
  if (isSuperAdmin) {
    return true;
  }
  
  return permissionList.some(permission => permissions?.[permission] === true);
};

/**
 * Hook to check if user has all of the specified permissions
 * @param {string[]} permissionList - Array of permission names
 * @returns {boolean} - True if user has all permissions
 */
export const useHasAllPermissions = (permissionList) => {
  const { permissions, isSuperAdmin } = useAppSelector((state) => state.auth);
  
  if (isSuperAdmin) {
    return true;
  }
  
  return permissionList.every(permission => permissions?.[permission] === true);
};

/**
 * Hook to get all user permissions
 * @returns {Object} - All permissions object
 */
export const usePermissions = () => {
  return useAppSelector((state) => state.auth.permissions);
};

/**
 * Hook to check if user is Super Admin
 * @returns {boolean} - True if user is Super Admin
 */
export const useIsSuperAdmin = () => {
  return useAppSelector((state) => state.auth.isSuperAdmin);
};

/**
 * Hook to get current user info
 * @returns {Object} - User object
 */
export const useAuth = () => {
  return useAppSelector((state) => state.auth);
};
