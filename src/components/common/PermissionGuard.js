import { useAppSelector } from '../store/hooks';

/**
 * Higher Order Component to protect routes based on permissions
 * @param {React.Component} Component - Component to protect
 * @param {string|string[]} requiredPermission - Permission(s) required to access
 * @param {React.Component} FallbackComponent - Component to show if permission denied
 * @returns {React.Component} - Protected component
 */
export const withPermission = (Component, requiredPermission, FallbackComponent = null) => {
  return (props) => {
    const { permissions, isSuperAdmin } = useAppSelector((state) => state.auth);
    
    // Super Admin has all permissions
    if (isSuperAdmin) {
      return <Component {...props} />;
    }
    
    // Check if single permission or array of permissions
    const hasPermission = Array.isArray(requiredPermission)
      ? requiredPermission.some(perm => permissions?.[perm] === true)
      : permissions?.[requiredPermission] === true;
    
    if (hasPermission) {
      return <Component {...props} />;
    }
    
    // Show fallback component or access denied message
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  };
};

/**
 * Component to conditionally render based on permissions
 * @param {Object} props
 * @param {string|string[]} props.permission - Permission(s) required
 * @param {boolean} props.requireAll - If true, requires all permissions (default: false, requires any)
 * @param {React.ReactNode} props.children - Content to render if permission granted
 * @param {React.ReactNode} props.fallback - Content to render if permission denied
 * @returns {React.ReactNode}
 */
export const PermissionGuard = ({ 
  permission, 
  requireAll = false, 
  children, 
  fallback = null 
}) => {
  const { permissions, isSuperAdmin } = useAppSelector((state) => state.auth);
  
  // Super Admin has all permissions
  if (isSuperAdmin) {
    return <>{children}</>;
  }
  
  let hasPermission = false;
  
  if (Array.isArray(permission)) {
    hasPermission = requireAll
      ? permission.every(perm => permissions?.[perm] === true)
      : permission.some(perm => permissions?.[perm] === true);
  } else {
    hasPermission = permissions?.[permission] === true;
  }
  
  return hasPermission ? <>{children}</> : <>{fallback}</>;
};
