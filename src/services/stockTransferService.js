import axios from 'axios';

// API Base URLs
const PRODUCT_MASTER_BASE_URL = 'https://rrgold.loyalstring.co.in/api/ProductMaster';
const CLIENT_ONBOARDING_BASE_URL = 'https://rrgold.loyalstring.co.in/api/ClientOnboarding';
const STOCK_TRANSFER_BASE_URL = 'https://rrgold.loyalstring.co.in/api/LabelledStockTransfer';

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
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      window.location.href = '/login?session_expired=true';
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

// Helper function to normalize array responses
const normalizeArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.result && Array.isArray(data.result)) return data.result;
  if (data.items && Array.isArray(data.items)) return data.items;
  return [];
};

export const stockTransferService = {
  // ==================== STOCK DATA APIs ====================
  
  /**
   * Get all labelled stock
   * @param {Object} payload - { ClientCode, CategoryId?, ProductId?, DesignId?, PurityId?, BranchId?, CounterId?, BoxId?, PacketId?, EmployeeId?, ItemCode?, RFIDCode?, Status?, FromDate?, ToDate? }
   * @returns {Promise<Array>} Array of labelled stock items
   */
  getAllLabeledStock: async (payload) => {
    try {
      const response = await axios.post(
        `${PRODUCT_MASTER_BASE_URL}/GetAllLabeledStock`,
        payload
      );
      return normalizeArray(response.data);
    } catch (error) {
      console.error('Get all labelled stock error:', error);
      throw error;
    }
  },

  /**
   * Get all unlabelled stock
   * @param {Object} payload - { ClientCode, CategoryId?, ProductId?, DesignId?, PurityId? }
   * @returns {Promise<Array>} Array of unlabelled stock items
   */
  getAllUnlabeledStock: async (payload) => {
    try {
      const response = await axios.post(
        `${PRODUCT_MASTER_BASE_URL}/GetAllUnlabeledStock`,
        payload
      );
      return normalizeArray(response.data);
    } catch (error) {
      console.error('Get all unlabelled stock error:', error);
      throw error;
    }
  },

  // ==================== MASTER DATA APIs ====================

  /**
   * Get all branches
   * @param {string} clientCode - Client code
   * @returns {Promise<Array>} Array of branches
   */
  getAllBranches: async (clientCode) => {
    try {
      const response = await axios.post(
        `${CLIENT_ONBOARDING_BASE_URL}/GetAllBranchMaster`,
        { ClientCode: clientCode }
      );
      return normalizeArray(response.data);
    } catch (error) {
      console.error('Get all branches error:', error);
      throw error;
    }
  },

  /**
   * Get all counters
   * @param {string} clientCode - Client code
   * @returns {Promise<Array>} Array of counters
   */
  getAllCounters: async (clientCode) => {
    try {
      const response = await axios.post(
        `${CLIENT_ONBOARDING_BASE_URL}/GetAllCounters`,
        { ClientCode: clientCode }
      );
      return normalizeArray(response.data);
    } catch (error) {
      console.error('Get all counters error:', error);
      throw error;
    }
  },

  /**
   * Get all packets
   * @param {string} clientCode - Client code
   * @returns {Promise<Array>} Array of packets
   */
  getAllPackets: async (clientCode) => {
    try {
      const response = await axios.post(
        `${PRODUCT_MASTER_BASE_URL}/GetAllPacketMaster`,
        { ClientCode: clientCode }
      );
      return normalizeArray(response.data);
    } catch (error) {
      console.error('Get all packets error:', error);
      throw error;
    }
  },

  /**
   * Get all boxes
   * @param {string} clientCode - Client code
   * @returns {Promise<Array>} Array of boxes
   */
  getAllBoxes: async (clientCode) => {
    try {
      const response = await axios.post(
        `${PRODUCT_MASTER_BASE_URL}/GetAllBoxMaster`,
        { ClientCode: clientCode }
      );
      return normalizeArray(response.data);
    } catch (error) {
      console.error('Get all boxes error:', error);
      throw error;
    }
  },

  /**
   * Get all categories
   * @param {string} clientCode - Client code
   * @returns {Promise<Array>} Array of categories
   */
  getAllCategories: async (clientCode) => {
    try {
      const response = await axios.post(
        `${PRODUCT_MASTER_BASE_URL}/GetAllCategoryMaster`,
        { ClientCode: clientCode }
      );
      return normalizeArray(response.data);
    } catch (error) {
      console.error('Get all categories error:', error);
      throw error;
    }
  },

  /**
   * Get all products
   * @param {string} clientCode - Client code
   * @returns {Promise<Array>} Array of products
   */
  getAllProducts: async (clientCode) => {
    try {
      const response = await axios.post(
        `${PRODUCT_MASTER_BASE_URL}/GetAllProductMaster`,
        { ClientCode: clientCode }
      );
      return normalizeArray(response.data);
    } catch (error) {
      console.error('Get all products error:', error);
      throw error;
    }
  },

  /**
   * Get all designs
   * @param {string} clientCode - Client code
   * @returns {Promise<Array>} Array of designs
   */
  getAllDesigns: async (clientCode) => {
    try {
      const response = await axios.post(
        `${PRODUCT_MASTER_BASE_URL}/GetAllDesignMaster`,
        { ClientCode: clientCode }
      );
      return normalizeArray(response.data);
    } catch (error) {
      console.error('Get all designs error:', error);
      throw error;
    }
  },

  /**
   * Get all purities
   * @param {string} clientCode - Client code
   * @returns {Promise<Array>} Array of purities
   */
  getAllPurities: async (clientCode) => {
    try {
      const response = await axios.post(
        `${PRODUCT_MASTER_BASE_URL}/GetAllPurityMaster`,
        { ClientCode: clientCode }
      );
      return normalizeArray(response.data);
    } catch (error) {
      console.error('Get all purities error:', error);
      throw error;
    }
  },

  /**
   * Get all employees
   * @param {string} clientCode - Client code
   * @returns {Promise<Array>} Array of employees
   */
  getAllEmployees: async (clientCode) => {
    try {
      const response = await axios.post(
        `${CLIENT_ONBOARDING_BASE_URL}/GetAllEmployee`,
        { ClientCode: clientCode }
      );
      return normalizeArray(response.data);
    } catch (error) {
      console.error('Get all employees error:', error);
      throw error;
    }
  },

  // ==================== STOCK TRANSFER APIs ====================

  /**
   * Get all locations (counters and branches)
   * @param {string} clientCode - Client code
   * @returns {Promise<Array>} Array of locations
   */
  getAllLocations: async (clientCode) => {
    try {
      const response = await axios.get(
        `${STOCK_TRANSFER_BASE_URL}/GetAllLocations?clientCode=${clientCode}`
      );
      return normalizeArray(response.data);
    } catch (error) {
      console.error('Get locations error:', error);
      throw error;
    }
  },

  /**
   * Create stock transfer
   * @param {Object} transferData - Transfer data object
   * @param {string} transferData.ClientCode - Client code
   * @param {string} transferData.StockType - 'labelled' or 'unlabelled'
   * @param {string} transferData.StockTransferTypeName - Transfer type name
   * @param {number} transferData.TransferTypeId - Transfer type ID
   * @param {string} transferData.TransferByEmployee - Employee ID who transfers
   * @param {string} transferData.TransferedToBranch - Branch ID (optional)
   * @param {string} transferData.TransferToEmployee - Employee ID (optional)
   * @param {number} transferData.Source - Source ID
   * @param {number} transferData.Destination - Destination ID
   * @param {string} transferData.Remarks - Remarks
   * @param {string} transferData.StockTransferDate - Transfer date (DD-MM-YYYY)
   * @param {string} transferData.ReceivedByEmployee - Employee ID who receives
   * @param {Array} transferData.StockTransferItems - Array of { stockId: number }
   * @returns {Promise<Object>} Response data
   */
  createStockTransfer: async (transferData) => {
    try {
      const response = await axios.post(
        `${STOCK_TRANSFER_BASE_URL}/CreateStockTransfer`,
        transferData
      );
      return response.data;
    } catch (error) {
      console.error('Create stock transfer error:', error);
      throw error;
    }
  },

  /**
   * Transfer stock between locations
   * @param {Object} transferData - Transfer data
   * @param {string} transferData.clientCode - Client code
   * @param {string} transferData.fromType - From type
   * @param {string} transferData.fromName - From name
   * @param {string} transferData.toName - To name
   * @param {Array<string>} transferData.itemCodes - Item codes array
   * @param {Array<string>} transferData.rfidCodes - RFID codes array
   * @returns {Promise<Object>} Response data
   */
  transferStock: async (transferData) => {
    try {
      const response = await axios.post(
        `${STOCK_TRANSFER_BASE_URL}/transfer`,
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

  /**
   * Transfer unassigned stock to counter
   * @param {Object} transferData - Transfer data
   * @param {string} transferData.clientCode - Client code
   * @param {string} transferData.toName - To name (counter)
   * @param {Array<string>} transferData.itemCodes - Item codes array
   * @param {Array<string>} transferData.rfidCodes - RFID codes array
   * @returns {Promise<Object>} Response data
   */
  transferUnassignedToCounter: async (transferData) => {
    try {
      const response = await axios.post(
        `${STOCK_TRANSFER_BASE_URL}/transfer-unassigned-to-counter`,
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
  },

  /**
   * Get stock transfer by ID
   * @param {string|number} transferId - Transfer ID
   * @param {string} clientCode - Client code
   * @returns {Promise<Object>} Transfer data
   */
  getStockTransferById: async (transferId, clientCode) => {
    try {
      const response = await axios.post(
        `${STOCK_TRANSFER_BASE_URL}/GetStockTransferById`,
        {
          TransferId: transferId,
          ClientCode: clientCode
        }
      );
      return response.data;
    } catch (error) {
      console.error('Get stock transfer by ID error:', error);
      throw error;
    }
  },

  /**
   * Update stock transfer
   * @param {string|number} transferId - Transfer ID
   * @param {Object} updateData - Update data
   * @param {string} updateData.ClientCode - Client code
   * @param {number} updateData.Destination - Destination ID
   * @param {string} updateData.TransferedToBranch - Branch ID
   * @param {string} updateData.TransferToEmployee - Employee ID
   * @param {string} updateData.Remarks - Remarks
   * @param {string} updateData.StockTransferDate - Transfer date
   * @returns {Promise<Object>} Response data
   */
  updateStockTransfer: async (transferId, updateData) => {
    try {
      const response = await axios.post(
        `${STOCK_TRANSFER_BASE_URL}/UpdateStockTransfer`,
        {
          TransferId: transferId,
          ...updateData
        }
      );
      return response.data;
    } catch (error) {
      console.error('Update stock transfer error:', error);
      throw error;
    }
  },

  /**
   * Get all stock transfers
   * @param {Object} filters - Filter parameters
   * @param {string} filters.ClientCode - Client code
   * @param {string} filters.Status? - Transfer status
   * @param {string} filters.FromDate? - From date
   * @param {string} filters.ToDate? - To date
   * @returns {Promise<Array>} Array of stock transfers
   */
  getAllStockTransfers: async (filters) => {
    try {
      const response = await axios.post(
        `${STOCK_TRANSFER_BASE_URL}/GetAllStockTransfers`,
        filters
      );
      return normalizeArray(response.data);
    } catch (error) {
      console.error('Get all stock transfers error:', error);
      throw error;
    }
  }
};
