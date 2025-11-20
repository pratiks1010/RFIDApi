import axios from 'axios';

const BASE_URL = 'https://rrgold.loyalstring.co.in/api/LabelTemplates';

// Create axios instance for label template API calls
const labelTemplateApi = axios.create({
  baseURL: BASE_URL
});

// Request interceptor for API calls
labelTemplateApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // For FormData requests, let axios set Content-Type automatically with boundary
    if (config.data instanceof FormData) {
      // Remove Content-Type header to let axios set it with boundary
      delete config.headers['Content-Type'];
    } else {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const labelTemplateService = {
  // Get All Label Templates
  getAllTemplates: async (clientCode) => {
    try {
      const response = await labelTemplateApi.post('/GetAllLabelTemplates', {
        ClientCode: clientCode
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get Label Templates By Category
  getTemplatesByCategory: async (clientCode, categoryId) => {
    try {
      const response = await labelTemplateApi.post('/GetLabelTemplatesByCategory', {
        ClientCode: clientCode,
        CategoryId: categoryId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get Label Templates By Product
  getTemplatesByProduct: async (clientCode, categoryId, productId) => {
    try {
      const response = await labelTemplateApi.post('/GetLabelTemplatesByProduct', {
        ClientCode: clientCode,
        CategoryId: categoryId,
        ProductId: productId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get Label Templates By Save Option
  getTemplatesBySaveOption: async (clientCode, saveOption) => {
    try {
      const response = await labelTemplateApi.post('/GetLabelTemplatesBySaveOption', {
        ClientCode: clientCode,
        SaveOption: saveOption
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get Template By ID
  getTemplateById: async (templateId, clientCode) => {
    try {
      const response = await labelTemplateApi.post('/GetLabelTemplateById', {
        ClientCode: clientCode,
        LabelTemplateId: templateId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add Label Template (multipart/form-data)
  addTemplate: async (formData) => {
    try {
      // Do NOT set Content-Type header - axios will set it automatically with boundary for FormData
      const response = await labelTemplateApi.post('/AddLabelTemplate', formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update Label Template (multipart/form-data)
  updateTemplate: async (formData) => {
    try {
      // Do NOT set Content-Type header - axios will set it automatically with boundary for FormData
      const response = await labelTemplateApi.post('/UpdateLabelTemplate', formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete Label Template
  deleteTemplate: async (templateId, clientCode) => {
    try {
      const response = await labelTemplateApi.post('/DeleteLabelTemplate', {
        ClientCode: clientCode,
        LabelTemplateId: templateId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

