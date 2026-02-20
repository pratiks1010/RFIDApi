import axios from 'axios';

const BASE_URL = 'https://soni.loyalstring.co.in/api/ProductMaster';
const RRGOLD_PRODUCT_URL = 'https://rrgold.loyalstring.co.in/api/ProductMaster';
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