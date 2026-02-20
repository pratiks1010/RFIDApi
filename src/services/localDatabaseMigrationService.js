import axios from 'axios';

const BASE_URL = 'https://rrgold.loyalstring.co.in/api/LocalDatabaseMigration';

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
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const localDatabaseMigrationService = {
  // 1. Connect to Local Database
  connectLocalDatabase: async (connectionData) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/ConnectLocalDatabase`,
        connectionData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // 2. Get Table Details
  getTableDetails: async (tableDetailsData) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/GetTableDetails`,
        tableDetailsData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // 3. Map and Store Local Data
  mapAndStoreLocalData: async (mappingData) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/MapAndStoreLocalData`,
        mappingData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // 4. Get Migration Configurations
  getMigrationConfigurations: async (clientCode) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/GetMigrationConfigurations/${clientCode}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // 5. Update Migration Configuration
  updateMigrationConfiguration: async (configurationData) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/UpdateMigrationConfiguration`,
        configurationData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // 6. Delete Migration Configuration
  deleteMigrationConfiguration: async (configurationId) => {
    try {
      const response = await axios.delete(
        `${BASE_URL}/DeleteMigrationConfiguration/${configurationId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // 7. Get Available Field Mappings
  getAvailableFieldMappings: async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/GetAvailableFieldMappings`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};
