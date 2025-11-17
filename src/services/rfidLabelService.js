import axios from 'axios';

const BASE_URL = 'https://rrgold.loyalstring.co.in/api/RFIDLabelTemplate';

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

export const rfidLabelService = {
  // Add/Save Template
  addTemplate: async (templateData) => {
    try {
      const response = await axios.post(`${BASE_URL}/AddTemplate`, templateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get All Templates
  getAllTemplates: async (clientCode) => {
    try {
      const response = await axios.post(`${BASE_URL}/GetAllTemplates`, {
        ClientCode: clientCode
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get Template By ID
  getTemplateById: async (id, clientCode) => {
    try {
      const response = await axios.post(`${BASE_URL}/GetTemplateById`, {
        Id: id,
        ClientCode: clientCode
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update Template
  updateTemplate: async (templateData) => {
    try {
      const response = await axios.post(`${BASE_URL}/UpdateTemplate`, templateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete Template
  deleteTemplate: async (id, clientCode) => {
    try {
      const response = await axios.post(`${BASE_URL}/DeleteTemplate`, {
        Id: id,
        ClientCode: clientCode
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generate Labels
  generateLabels: async (generateData) => {
    try {
      const response = await axios.post(`${BASE_URL}/GenerateLabels`, generateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get Labelled Stock (for product selection)
  getLabelledStock: async (clientCode, status = "ApiActive") => {
    try {
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllLabeledStock',
        {
          ClientCode: clientCode,
          Status: status,
          PageNumber: 1,
          PageSize: 10000 // Get all items for selection
        }
      );
      // Handle different response structures
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      throw error;
    }
  }
};
