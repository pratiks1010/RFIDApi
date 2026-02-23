/**
 * Token Utility Functions
 * Best practices for JWT token management and user identification
 */

/**
 * Decode JWT token and extract payload
 * @param {string} token - JWT token string
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
export const decodeToken = (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Extract UserId from token
 * @param {string} token - JWT token string
 * @returns {string|null} - UserId or null if not found
 */
export const getUserIdFromToken = (token) => {
  const payload = decodeToken(token);
  if (!payload) {
    return null;
  }

  // Try multiple possible claim names for UserId
  return (
    payload.UserId ||
    payload.userId ||
    payload.UserID ||
    payload.user_id ||
    payload.sub ||
    payload.nameid ||
    payload.unique_name ||
    null
  );
};

/**
 * Extract SecurityStamp from token
 * @param {string} token - JWT token string
 * @returns {string|null} - SecurityStamp or null if not found
 */
export const getSecurityStampFromToken = (token) => {
  const payload = decodeToken(token);
  if (!payload) {
    return null;
  }

  return (
    payload.SecurityStamp ||
    payload.securityStamp ||
    payload.security_stamp ||
    payload.Security_Stamp ||
    null
  );
};

/**
 * Check if token is expired
 * @param {string} token - JWT token string
 * @returns {boolean} - True if expired, false otherwise
 */
export const isTokenExpired = (token) => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return false; // If no expiry claim, consider valid
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp <= currentTime;
};

/**
 * Get current user's token from localStorage
 * @returns {string|null} - Token or null if not found
 */
export const getCurrentToken = () => {
  return localStorage.getItem('token');
};

/**
 * Get current user's UserId from localStorage token
 * @returns {string|null} - UserId or null if not found
 */
export const getCurrentUserId = () => {
  const token = getCurrentToken();
  if (!token) {
    return null;
  }
  return getUserIdFromToken(token);
};

/**
 * Clear all authentication data from localStorage and sessionStorage
 * Best practice: Clear all auth-related items
 */
export const clearAuthData = () => {
  // Clear localStorage items
  const authKeys = [
    'token',
    'userInfo',
    'permissions',
    'roleType',
    'isSubUser',
    'allowedBranchIds',
    'hasAllBranchAccess',
    'lastLoginTime',
    'showWelcomeToast',
    'adminToken', // Also clear admin token if exists
  ];

  authKeys.forEach((key) => {
    localStorage.removeItem(key);
  });

  // Clear sessionStorage
  sessionStorage.clear();
};

/**
 * Check if current user is a subuser
 * @returns {boolean} - True if subuser, false otherwise
 */
export const isCurrentUserSubUser = () => {
  const isSubUserStr = localStorage.getItem('isSubUser');
  if (isSubUserStr === null) {
    return false;
  }
  try {
    return JSON.parse(isSubUserStr) === true;
  } catch {
    return false;
  }
};

/**
 * Check if current user is a super admin
 * @returns {boolean} - True if super admin, false otherwise
 */
export const isCurrentUserSuperAdmin = () => {
  return !isCurrentUserSubUser();
};

/**
 * Logout current user and redirect to login
 * @param {string} reason - Reason for logout (optional)
 */
export const logoutCurrentUser = (reason = 'session_expired') => {
  console.log(`Logging out current user. Reason: ${reason}`);
  
  // Clear all auth data
  clearAuthData();
  
  // Redirect to login with reason
  const params = new URLSearchParams({ [reason]: 'true' });
  window.location.href = `/login?${params.toString()}`;
};
