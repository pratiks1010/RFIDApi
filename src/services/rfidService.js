import axios from 'axios';
import { userManagementService } from './userManagementService';
import { 
  getCurrentUserId, 
  getUserIdFromToken, 
  clearAuthData, 
  logoutCurrentUser,
  decodeToken 
} from '../utils/tokenUtils';

const BASE_URL = 'https://soni.loyalstring.co.in/api/ProductMaster';
const RRGOLD_PRODUCT_URL = 'https://rrgold.loyalstring.co.in/api/ProductMaster';
const DEVICE_URL = 'https://rrgold.loyalstring.co.in/api/RFIDDevice';

/**
 * Handle Security Stamp updated - logout only the affected user
 * Best practice: Only logout the user whose SecurityStamp was updated
 * @param {Object} responseData - Response data from API
 * @param {Object} requestConfig - Request configuration
 */
const handleSecurityStampUpdated = async (responseData = null, requestConfig = null) => {
  try {
    // Step 1: Check if this is a ForceLogout request
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
    if (targetUserId && targetUserId !== currentUserId) {
      console.log(`[SecurityStamp] Update is for user ${targetUserId}, current user is ${currentUserId} - NOT logging out current user`);
      return; // Don't logout current user if message is about a different user
    }
    
    // Step 5: Logout current user
    console.log(`[SecurityStamp] Update is for current user (${currentUserId}) - logging out`);
    logoutCurrentUser('security_stamp_updated');
    
  } catch (error) {
    console.error('[SecurityStamp] Error handling security stamp update:', error);
    logoutCurrentUser('security_stamp_error');
  }
};

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
    const originalRequest = error.config;
    
    // Check for 401 Unauthorized - this could be due to SecurityStamp mismatch
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const errorMessage = error.response?.data?.Message || error.response?.data?.message || '';
      const errorString = typeof errorMessage === 'string' ? errorMessage.toLowerCase() : '';
      
      // Check if it's a Security Stamp related error
      const isSecurityStampError = errorString.includes('security stamp') || 
                                  errorString.includes('forced to logout') ||
                                  (errorString.includes('token') && errorString.includes('invalid'));
      
      if (isSecurityStampError) {
        // Handle security stamp update
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

  // Get TID by Barcode (rrgold) - returns TID value(s) for the given RFID/barcode
  getTidByBarcode: async (clientCode, barcodeNumber) => {
    try {
      const response = await axios.post(
        `${RRGOLD_PRODUCT_URL}/GetTidByBarcode`,
        {
          ClientCode: clientCode || '',
          BarcodeNumber: barcodeNumber || ''
        }
      );
      return response.data;
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

  // Public helper: get Stones and Diamonds in API format (for bulk submit from AddStock)
  getStonesAndDiamondsForApi(stoneList, diamondList) {
    return {
      Stones: this._mapStonesForApi(stoneList),
      Diamonds: this._mapDiamondsForApi(diamondList)
    };
  },

  // Map stone list from form to API "Stones" array format
  _mapStonesForApi(stoneList) {
    if (!Array.isArray(stoneList) || stoneList.length === 0) return [];
    return stoneList.map(entry => ({
      StoneName: entry.StoneName ?? '',
      StoneSize: entry.StoneSize ?? '',
      StoneWeight: String(entry.StoneWeight ?? ''),
      StonePieces: String(entry.StonePieces ?? ''),
      StoneRatePiece: String(entry.StoneRatePerPiece ?? entry.StoneRate ?? '0.00'),
      StoneRateKarate: String(entry.StoneRateKarate ?? '0.00'),
      StoneAmount: String(entry.StoneAmount ?? '0.00'),
      Description: entry.StoneDescription ?? '',
      StoneDeduct: String(entry.StoneLessPercent ?? ''),
      StoneColour: entry.StoneColour ?? '',
      StoneShape: entry.StoneShape ?? entry.StoneSettingType ?? '',
      StoneStatusType: entry.StoneStatusType ?? null,
      StoneWeightType: entry.StoneWeightType ?? 'Gram'
    }));
  },

  // Map diamond list from form to API "Diamonds" array format
  _mapDiamondsForApi(diamondList) {
    if (!Array.isArray(diamondList) || diamondList.length === 0) return [];
    return diamondList.map(entry => ({
      DiamondName: entry.DiamondName ?? '',
      DiamondSieve: entry.DiamondSieve ?? '',
      DiamondWeight: String(entry.DiamondWeight ?? entry.TotalDiamondWeight ?? ''),
      DiamondPieces: String(entry.DiamondPieces ?? ''),
      DiamondClarity: entry.DiamondClarity ?? '',
      DiamondColour: entry.DiamondColour ?? '',
      DiamondCut: entry.DiamondCut ?? '',
      DiamondShape: entry.DiamondShape ?? '',
      DiamondSize: String(entry.DiamondSize ?? ''),
      DiamondSellRate: String(entry.DiamondSellRate ?? ''),
      DiamondSellAmount: String(entry.DiamondSellAmount ?? ''),
      DiamondPurchaseAmount: String(entry.DiamondPurchaseAmount ?? ''),
      Description: entry.DiamondDescription ?? '',
      DiamondCertificate: entry.DiamondCertificate ?? '',
      DiamondSettingType: entry.DiamondSettingType ?? '',
      DiamondMargin: String(entry.DiamondMargin ?? ''),
      TotalDiamondWeight: String(entry.TotalDiamondWeight ?? entry.DiamondWeight ?? '')
    }));
  },

  // Save RFID Transaction Details
  saveRFIDTransaction: async (data) => {
    try {
      const payload = {
        client_code: data.clientCode,
        branch_id: data.branchId || "",
        counter_id: data.counterId || "",
        RFIDNumber: data.rfidNumber,
        Itemcode: data.itemCode,
        category_id: data.categoryId,
        product_id: data.productId,
        design_id: data.designId,
        purity_id: data.purityId,
        grosswt: data.grossWeight,
        stonewt: data.stoneWeight,
        diamondheight: data.diamondHeight,
        diamondweight: data.diamondWeight || data.diamondHeight,
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
      };
      payload.Stones = this._mapStonesForApi(data.stoneList);
      payload.Diamonds = this._mapDiamondsForApi(data.diamondList);
      const response = await axios.post(
        `${BASE_URL}/SaveRFIDTransactionDetails`, 
        [payload]
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};