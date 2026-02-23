import { useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, logout } from '../../store/slices/authSlice';

/**
 * Component to initialize Redux auth state from localStorage on app load
 * This ensures permissions are available immediately after page refresh
 */
const AuthInitializer = ({ children }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Initialize auth state from localStorage
    const token = localStorage.getItem('token');
    const userInfoStr = localStorage.getItem('userInfo');
    const permissionsStr = localStorage.getItem('permissions');
    const roleTypeStr = localStorage.getItem('roleType');
    const isSubUserStr = localStorage.getItem('isSubUser');
    const allowedBranchIdsStr = localStorage.getItem('allowedBranchIds');
    const hasAllBranchAccessStr = localStorage.getItem('hasAllBranchAccess');

    if (token && userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr);
        
        // Check token expiration
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const tokenPayload = JSON.parse(window.atob(base64));

          // Check if token is expired
          if (tokenPayload.exp) {
            const currentTime = Math.floor(Date.now() / 1000);
            if (tokenPayload.exp <= currentTime) {
              // Token expired, clear everything
              dispatch(logout());
              localStorage.removeItem('token');
              localStorage.removeItem('userInfo');
              localStorage.removeItem('permissions');
              localStorage.removeItem('roleType');
              localStorage.removeItem('isSubUser');
              localStorage.removeItem('allowedBranchIds');
              localStorage.removeItem('hasAllBranchAccess');
              return;
            }
          }
        } catch (tokenError) {
          console.error('Error decoding token:', tokenError);
          // If token is invalid, clear auth
          dispatch(logout());
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
          localStorage.removeItem('permissions');
          localStorage.removeItem('roleType');
          localStorage.removeItem('isSubUser');
          localStorage.removeItem('allowedBranchIds');
          localStorage.removeItem('hasAllBranchAccess');
          return;
        }

        // Load permissions from localStorage (stored from API response)
        let permissions = {
          CanViewStock: false,
          CanAddStock: false,
          CanEditStock: false,
          CanDeleteStock: false,
          CanManageUsers: false,
          CanViewReports: false,
          CanExportData: false,
          CanViewAllBranches: false,
          CanManageBranches: false,
        };
        
        if (permissionsStr) {
          try {
            const storedPermissions = JSON.parse(permissionsStr);
            permissions = {
              CanViewStock: storedPermissions.CanViewStock || false,
              CanAddStock: storedPermissions.CanAddStock || false,
              CanEditStock: storedPermissions.CanEditStock || false,
              CanDeleteStock: storedPermissions.CanDeleteStock || false,
              CanManageUsers: storedPermissions.CanManageUsers || false,
              CanViewReports: storedPermissions.CanViewReports || false,
              CanExportData: storedPermissions.CanExportData || false,
              CanViewAllBranches: storedPermissions.CanViewAllBranches || false,
              CanManageBranches: storedPermissions.CanManageBranches || false,
            };
          } catch (e) {
            console.error('Error parsing permissions:', e);
          }
        }

        // Load other fields from localStorage
        const roleType = roleTypeStr ? JSON.parse(roleTypeStr) : null;
        const isSubUser = isSubUserStr ? JSON.parse(isSubUserStr) : false;
        const isSuperAdmin = !isSubUser;
        const allowedBranchIds = allowedBranchIdsStr ? JSON.parse(allowedBranchIdsStr) : null;
        const hasAllBranchAccess = hasAllBranchAccessStr ? JSON.parse(hasAllBranchAccessStr) : false;

        // Set credentials in Redux with all stored data
        dispatch(setCredentials({
          user: userInfo,
          token: token,
          permissions: permissions,
          roleType: roleType,
          isSuperAdmin: isSuperAdmin,
          isSubUser: isSubUser,
          allowedBranchIds: allowedBranchIds,
          hasAllBranchAccess: hasAllBranchAccess,
        }));
      } catch (error) {
        console.error('Error initializing auth:', error);
        dispatch(logout());
      }
    }
  }, [dispatch]);

  return <>{children}</>;
};

export default AuthInitializer;
