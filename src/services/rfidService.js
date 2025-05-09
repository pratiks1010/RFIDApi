import axios from 'axios';

const BASE_URL = 'https://soni.loyalstring.co.in/api/ProductMaster';
const DEVICE_URL = 'https://rrgold.loyalstring.co.in/api/RFIDDevice';

// Request interceptor for API calls
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    config.headers['Content-Type'] = 'application/json';
    // Add any other custom headers here
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

export const rfidService = {
  // Get RFID Transaction Details
  getRFIDTransactions: async (clientCode, status = "ApiActive") => {
    try {
      const response = await axios.post(
        `${BASE_URL}/GetRFIDTransactionDetails`, 
        {
          client_code: clientCode,
          status: status
        }
      );
      // Return the data in a consistent format
      return Array.isArray(response.data) ? response.data : response.data?.data || [];
    } catch (error) {
      throw error;
    }
  },

  // Update RFID Transaction Details
  updateRFIDTransaction: async (data) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/UpdateRFIDTransactionDetails`, 
        [{
          client_code: data.clientCode,
          RFIDNumber: data.rfidNumber,
          status: data.status
        }]
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete Labelled Stock Items
  deleteLabelledStock: async (clientCode, itemCodes) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/DeleteLabelledStockItems`, 
        {
          ClientCode: clientCode,
          ItemCodes: itemCodes
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get RFID Device Details
  getRFIDDeviceDetails: async (clientCode, deviceId) => {
    try {
      const response = await axios.post(
        `${DEVICE_URL}/GetAllRFIDDetails`,
        {
          ClientCode: clientCode,
          DeviceId: deviceId
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete RFID by Client and Device
  deleteRFIDByClientAndDevice: async (clientCode, deviceId) => {
    try {
      const response = await axios.post(
        `${DEVICE_URL}/DeleteRFIDByClientAndDevice`,
        {
          ClientCode: clientCode,
          DeviceId: deviceId
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Save RFID Transaction Details
  saveRFIDTransaction: async (data) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/SaveRFIDTransactionDetails`, 
        [{
          client_code: data.clientCode,
          RFIDNumber: data.rfidNumber,
          Itemcode: data.itemCode,
          category_id: data.categoryId,
          product_id: data.productId,
          design_id: data.designId,
          purity_id: data.purityId,
          grosswt: data.grossWeight,
          stonewt: data.stoneWeight,
          diamondheight: data.diamondHeight,
          netwt: data.netWeight,
          box_details: data.boxDetails,
          size: data.size || 0,
          stoneamount: data.stoneAmount,
          diamondAmount: data.diamondAmount,
          HallmarkAmount: data.hallmarkAmount,
          MakingPerGram: data.makingPerGram,
          MakingPercentage: data.makingPercentage,
          MakingFixedAmt: data.makingFixedAmount,
          MRP: data.mrp,
          imageurl: data.imageUrl || "",
          status: data.status || "ApiActive"
        }]
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};