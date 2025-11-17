import axios from 'axios';

const ADMIN_BASE_URL = 'https://rrgold.loyalstring.co.in/api/Admin';

// Request interceptor for API calls
axios.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken && config.url?.includes('/api/Admin/')) {
      config.headers['Authorization'] = `Bearer ${adminToken}`;
    }
    config.headers['Content-Type'] = 'application/json';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url?.includes('/api/Admin/')) {
      originalRequest._retry = true;
      // Clear admin auth data
      localStorage.removeItem('adminToken');
      // Redirect to admin login
      window.location.href = '/admin-login';
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export const adminService = {
  // Admin Login (first step - returns success/failure)
  login: async (credentials) => {
    try {
      const response = await axios.post(
        `${ADMIN_BASE_URL}/Login`,
        {
          Username: credentials.username,
          Password: credentials.password
        }
      );
      return {
        success: true,
        data: response.data,
        token: response.data?.Token
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message || 'Login failed'
      };
    }
  },

  // Send OTP to admin
  sendOtp: async (identifier) => {
    try {
      const response = await axios.post(
        `${ADMIN_BASE_URL}/SendOtp`,
        {
          Identifier: identifier
        }
      );
      return {
        success: true,
        message: response.data || 'OTP sent successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message || 'Failed to send OTP'
      };
    }
  },

  // Verify OTP
  verifyOtp: async (identifier, otp) => {
    try {
      const response = await axios.post(
        `${ADMIN_BASE_URL}/VerifyOtp`,
        {
          Identifier: identifier,
          Otp: otp
        }
      );
      return {
        success: true,
        data: response.data,
        token: response.data?.Token
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message || 'Invalid or expired OTP'
      };
    }
  },

  // Admin Register
  register: async (adminData) => {
    try {
      const response = await axios.post(
        `${ADMIN_BASE_URL}/Register`,
        adminData
      );
      return {
        success: true,
        message: response.data || 'Admin registration successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message || 'Registration failed'
      };
    }
  },

  // Get All Users
  getAllUsers: async () => {
    try {
      const response = await axios.get(`${ADMIN_BASE_URL}/GetAllUsers`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message || 'Failed to fetch users'
      };
    }
  },

  // Get User by Client Code
  getUserByClientCode: async (clientCode) => {
    try {
      const response = await axios.get(`${ADMIN_BASE_URL}/GetUserByClientCode/${clientCode}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message || 'User not found'
      };
    }
  },

  // Update User
  updateUser: async (userData) => {
    try {
      const response = await axios.put(`${ADMIN_BASE_URL}/UpdateUser`, userData);
      return {
        success: true,
        message: response.data || 'User updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message || 'Failed to update user'
      };
    }
  },

  // Delete User
  deleteUser: async (clientCode) => {
    try {
      const response = await axios.delete(`${ADMIN_BASE_URL}/DeleteUser/${clientCode}`);
      return {
        success: true,
        message: response.data || 'User deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message || 'Failed to delete user'
      };
    }
  },

  // Get All Client Onboarding
  getAllClientOnboarding: async () => {
    try {
      const response = await axios.get(`${ADMIN_BASE_URL}/GetAllSparkleClientOnboarding`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message || 'Failed to fetch client onboarding records'
      };
    }
  },

  // Get Sparkle User by Client Code
  getSparkleUserByClientCode: async (clientCode) => {
    try {
      const response = await axios.get(`${ADMIN_BASE_URL}/GetSparkleUserByClientCode/${clientCode}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message || 'User not found'
      };
    }
  }
}; 