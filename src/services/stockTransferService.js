import axios from 'axios';

const BASE_URL = 'https://rrgold.loyalstring.co.in/api/LabelledStockTransfer';

// Request interceptor for API calls
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
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
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      // Redirect to login with session expired flag
      window.location.href = '/login?session_expired=true';
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export const stockTransferService = {
  // Get all locations (counters and branches)
  getAllLocations: async (clientCode) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/GetAllLocations?clientCode=${clientCode}`
      );
      return response.data;
    } catch (error) {
      console.error('Get locations error:', error);
      throw error;
    }
  },

  // Transfer stock between locations
  transferStock: async (transferData) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/transfer`,
        {
          ClientCode: transferData.clientCode,
          FromType: transferData.fromType,
          FromName: transferData.fromName,
          ToName: transferData.toName,
          ItemCodes: transferData.itemCodes,
          RFIDCodes: transferData.rfidCodes
        }
      );
      return response.data;
    } catch (error) {
      console.error('Stock transfer error:', error);
      throw error;
    }
  },

  // Transfer unassigned stock to counter
  transferUnassignedToCounter: async (transferData) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/transfer-unassigned-to-counter`,
        {
          ClientCode: transferData.clientCode,
          ToName: transferData.toName,
          ItemCodes: transferData.itemCodes,
          RFIDCodes: transferData.rfidCodes
        }
      );
      return response.data;
    } catch (error) {
      console.error('Transfer unassigned stock error:', error);
      throw error;
    }
  }
}; 