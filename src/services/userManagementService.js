import axios from 'axios';
import { 
  getCurrentUserId, 
  getUserIdFromToken, 
  clearAuthData, 
  logoutCurrentUser,
  decodeToken 
} from '../utils/tokenUtils';

// Base URL configuration - easy to switch between environments
const API_BASE_URL = 'https://localhost:7095'; // Development URL
// const API_BASE_URL = 'https://rrgold.loyalstring.co.in'; // Production URL (commented out)

// API Endpoint for User Management
// IMPORTANT: Ensure this matches the Controller Route in the Backend
// The backend controller is [Route("api/[controller]")] where controller is RFIDUserManagementController
// So the URL should be /api/RFIDUserManagement
const USER_MANAGEMENT_URL = `${API_BASE_URL}/api/RFIDUserManagement`;

// Create a separate axios instance for user management service
// This prevents conflicts with global interceptors in other services
const apiClient = axios.create({
  baseURL: USER_MANAGEMENT_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': '*/*'
  }
  // Note: withCredentials is NOT set because:
  // 1. Backend doesn't support Access-Control-Allow-Credentials: true
  // 2. We're using Bearer token authentication, not cookies
  // 3. The curl command works without credentials
});

// Add request interceptor to attach token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Ensure token is properly formatted
      const cleanToken = token.trim();
      if (cleanToken) {
        config.headers['Authorization'] = `Bearer ${cleanToken}`;
        console.log('Request with auth token to:', config.baseURL + config.url);
      } else {
        console.warn('Token exists but is empty, making request without auth');
      }
    } else {
      console.warn('No token found in localStorage, making request without auth header');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper function to get subusers (bypasses the service to avoid circular dependency)
const getAllSubUsersForLogout = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${USER_MANAGEMENT_URL}/GetAllSubUsers`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': '*/*'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching subusers:', error);
    return [];
  }
};

// Helper function to force logout a user (bypasses the service to avoid circular dependency)
const forceLogoutUser = async (userId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${USER_MANAGEMENT_URL}/ForceLogout`, 
      { UserId: userId },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*',
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error force logging out user ${userId}:`, error);
    throw error;
  }
};

/**
 * Handle Security Stamp updated - logout only the affected user
 * Best practice: Only logout the user whose SecurityStamp was updated
 * @param {Object} responseData - Response data from API
 * @param {Object} requestConfig - Request configuration
 */
const handleSecurityStampUpdated = async (responseData = null, requestConfig = null) => {
  try {
    // Step 1: Check if this is a ForceLogout request
    // If super admin calls ForceLogout, the response may contain Security Stamp message
    // but we should NOT logout the super admin - only the target user
    const requestUrl = requestConfig?.url || requestConfig?.baseURL || '';
    const fullUrl = typeof requestUrl === 'string' ? requestUrl : (requestConfig?.url || '');
    const isForceLogoutRequest = fullUrl.includes('/ForceLogout') || 
                                 fullUrl.toLowerCase().includes('forcelogout');
    
    if (isForceLogoutRequest) {
      console.log('[SecurityStamp] Message from ForceLogout request - ignoring (expected behavior)');
      return; // Don't logout anyone - the ForceLogout API already handled the target user
    }
    
    // Step 2: Get current user's UserId from token
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      console.warn('[SecurityStamp] No current user ID found in token');
      // If we can't identify current user, logout for safety
      logoutCurrentUser('security_stamp_unknown_user');
      return;
    }
    
    // Step 3: Extract target UserId from response if available
    let targetUserId = null;
    if (responseData) {
      targetUserId = responseData.UserId || 
                    responseData.userId || 
                    responseData.UserID ||
                    responseData.user_id;
    }
    
    // Step 4: Compare UserIds
    // If targetUserId is provided and different from current user, 
    // this message is about a different user - don't logout current user
    if (targetUserId && targetUserId !== currentUserId) {
      console.log(`[SecurityStamp] Update is for user ${targetUserId}, current user is ${currentUserId} - NOT logging out current user`);
      return; // Don't logout current user if message is about a different user
    }
    
    // Step 5: If no targetUserId or it matches current user, logout current user
    // This means the Security Stamp update is about the current user
    console.log(`[SecurityStamp] Update is for current user (${currentUserId}) - logging out`);
    logoutCurrentUser('security_stamp_updated');
    
  } catch (error) {
    console.error('[SecurityStamp] Error handling security stamp update:', error);
    // On error, logout for safety
    logoutCurrentUser('security_stamp_error');
  }
};

// Add response interceptor to handle redirects and auth errors
apiClient.interceptors.response.use(
  (response) => {
    // Check response message for Security Stamp updated
    const message = response.data?.Message || response.data?.message;
    if (message && typeof message === 'string' && 
        message.toLowerCase().includes('security stamp') && 
        message.toLowerCase().includes('forced to logout')) {
      // Handle security stamp update asynchronously (don't block response)
      // Pass response data and request config to extract UserId and check if it's a ForceLogout request
      handleSecurityStampUpdated(response.data, response.config);
    }
    return response;
  },
  async (error) => {
    // Check for 401 Unauthorized - this could be due to SecurityStamp mismatch
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.Message || error.response?.data?.message || '';
      const errorString = typeof errorMessage === 'string' ? errorMessage.toLowerCase() : '';
      
      // Check if it's a Security Stamp related error
      const isSecurityStampError = errorString.includes('security stamp') || 
                                  errorString.includes('forced to logout') ||
                                  errorString.includes('token') && errorString.includes('invalid');
      
      if (isSecurityStampError) {
        // Handle security stamp update
        // Pass error response data and request config
        await handleSecurityStampUpdated(error.response?.data, error.config);
        return Promise.reject(error);
      }
      
      // Regular 401 - token expired or invalid
      // Only logout if it's not a ForceLogout request
      const requestUrl = error.config?.url || '';
      const isForceLogoutRequest = requestUrl.includes('/ForceLogout') || 
                                   requestUrl.toLowerCase().includes('forcelogout');
      
      if (!isForceLogoutRequest) {
        console.log('[Auth] 401 Unauthorized - logging out current user');
        logoutCurrentUser('unauthorized');
      }
      
      return Promise.reject(error);
    }
    
    // Check error message for Security Stamp updated (non-401 errors)
    const errorMessage = error.response?.data?.Message || error.response?.data?.message;
    if (errorMessage && typeof errorMessage === 'string' && 
        errorMessage.toLowerCase().includes('security stamp') && 
        errorMessage.toLowerCase().includes('forced to logout')) {
      // Handle security stamp update
      await handleSecurityStampUpdated(error.response?.data, error.config);
      return Promise.reject(error);
    }
    
    // Check if the error is due to authentication redirect
    const requestUrl = error.config?.url || error.config?.baseURL;
    if (error.response) {
      // If we get redirected to login page (302/301), it means auth failed
      const location = error.response.headers?.location;
      if (location && location.includes('/Account/Login')) {
        console.error('Authentication failed - backend redirected to login page');
        return Promise.reject({
          response: {
            status: 401,
            data: { Message: 'Authentication required. Your session may have expired. Please login again.' },
            headers: error.response.headers
          },
          config: error.config
        });
      }
      
      // If we get 404 on login page, it means the endpoint doesn't exist or auth is misconfigured
      if (error.response.status === 404 && requestUrl?.includes('/Account/Login')) {
        console.error('404 on login redirect - authentication may be misconfigured');
        return Promise.reject({
          response: {
            status: 401,
            data: { Message: 'Authentication failed. Please check your login credentials and try again.' }
          },
          config: error.config
        });
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Service for managing dashboard users under the authenticated Super Admin.
 */
export const userManagementService = {
  
  /**
   * Creates a new dashboard user under the current admin's hierarchy.
   * @param {Object} userData - { UserName, Password, Email, RoleType, Permissions }
   * @returns {Promise<Object>} - Response data
   */
  createDashboardUser: async (userData) => {
    try {
      const response = await apiClient.post('/CreateDashboardUser', userData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Retrieves all sub-users created by the current admin.
   * @returns {Promise<Array>} - List of users [{ UserId, UserName, Permissions, IsActive, IsOnline }]
   */
  getAllSubUsers: async () => {
    try {
      // Trying absolute URL in case base URL stacking is the issue
      // Also ensuring no double slashes
      const response = await apiClient.get('/GetAllSubUsers');
      return response.data;
    } catch (error) {
      // Fallback: try raw axios if the instance is misconfigured
      if (error.response?.status === 404) {
        console.warn('Endpoint 404 with instance, trying raw axios...');
        try {
          const token = localStorage.getItem('token');
          const fallbackResponse = await axios.get(`${USER_MANAGEMENT_URL}/GetAllSubUsers`, {
             headers: {
               'Authorization': `Bearer ${token}`,
               'Accept': '*/*'
             }
          });
          return fallbackResponse.data;
        } catch (fallbackError) {
          throw handleApiError(fallbackError);
        }
      }
      throw handleApiError(error);
    }
  },

  /**
   * Updates permissions for an existing user.
   * @param {string} userId - The unique ID of the user.
   * @param {Object} permissions - The updated permissions object.
   * @returns {Promise<Object>} - Response data
   */
  updatePermissions: async (userId, permissions) => {
    try {
      const response = await apiClient.post('/UpdatePermissions', 
        { UserId: userId, Permissions: permissions }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Toggles a user's active status (block/unblock).
   * @param {string} userId - The unique ID of the user.
   * @param {boolean} isActive - The new status (true for active, false for blocked).
   * @returns {Promise<Object>} - Response data
   */
  toggleUserStatus: async (userId, isActive) => {
    try {
      const response = await apiClient.post('/ToggleUserStatus', 
        { UserId: userId, IsActive: isActive }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Forces a user to logout immediately by invalidating their session.
   * @param {string} userId - The unique ID of the user.
   * @returns {Promise<Object>} - Response data
   */
  forceLogout: async (userId) => {
    try {
      const response = await apiClient.post('/ForceLogout', 
        { UserId: userId }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Deletes a sub-user from the system.
   * @param {string} userId - The unique ID of the user to delete.
   * @returns {Promise<Object>} - Response data
   */
  deleteSubUser: async (userId) => {
    try {
      const response = await apiClient.post('/DeleteSubUser', 
        { UserId: userId }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Updates a sub-user's information including permissions and branch access.
   * @param {Object} userData - { UserId, UserName, Email, Password, RoleType, Permissions, AllowedBranchIds }
   * @returns {Promise<Object>} - Response data
   */
  updateSubUser: async (userData) => {
    try {
      const response = await apiClient.post('/UpdateSubUser', userData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Assigns branches to a user.
   * @param {string} userId - The unique ID of the user.
   * @param {number[]} branchIds - Array of branch IDs to assign.
   * @returns {Promise<Object>} - Response data
   */
  assignBranches: async (userId, branchIds) => {
    try {
      const response = await apiClient.post('/AssignBranches', 
        { UserId: userId, BranchIds: branchIds }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Gets the branch access information for a specific user.
   * @param {string} userId - The unique ID of the user.
   * @returns {Promise<Object>} - Response data with branch access information
   */
  getUserBranchAccess: async (userId) => {
    try {
      const response = await apiClient.get('/GetUserBranchAccess', {
        params: { userId: userId }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

// Helper function to handle API errors consistently
const handleApiError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('API Error Response:', error.response.data);
    
    // Detailed 404 logging
    if (error.response.status === 404) {
      console.error(`404 Not Found: The requested endpoint was not found on the server.
      URL: ${error.config?.url}
      BaseURL: ${error.config?.baseURL}
      Full URL: ${error.config?.baseURL}${error.config?.url}
      Method: ${error.config?.method}`);
    }

    // API returns errors with "Message" (capital M) property as per documentation
    const errorMessage = error.response.data?.Message || 
                        error.response.data?.message || 
                        (typeof error.response.data === 'string' ? error.response.data : null) ||
                        `Server error (${error.response.status})`;

    return {
      success: false,
      message: errorMessage,
      status: error.response.status
    };
  } else if (error.request) {
    // The request was made but no response was received
    console.error('API No Response:', error.request);
    return {
      success: false,
      message: 'No response from server. Please check your connection and ensure the backend is running.',
      status: 0
    };
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('API Request Error:', error.message);
    return {
      success: false,
      message: error.message || 'Request configuration error',
      status: -1
    };
  }
};
