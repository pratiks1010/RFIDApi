import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { rfidService } from '../services/rfidService';
import * as XLSX from 'xlsx';
import { 
  FaFileExcel, 
  FaCloudUploadAlt, 
  FaCheckCircle, 
  FaPaperPlane,
  FaSave,
  FaEdit,
  FaSearch,
  FaMobileAlt,
  FaTrashAlt,
  FaClipboardCheck,
  FaTags,
  FaInfoCircle,
  FaCopy,
  FaShieldAlt,
  FaLock
} from 'react-icons/fa';
import RFIDUploadPrompt from './common/RFIDUploadPrompt';
import rfidTagsService from '../services/rfidTagsService';

const API_ENDPOINTS = [
  {
    id: 'save-transaction',
    name: 'Add Stock',
    endpoint: 'SaveRFIDTransactionDetails',
    method: 'POST',
    description: 'Save new RFID transaction details with complete product information including weights, pricing, and status.',
    baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
    authRequired: true,
    icon: 'fas fa-save text-white',
    highlight: 'primary',
    gradient: 'linear-gradient(135deg, #8E2DE2, #4A00E0)',
    sampleBody: {
      client_code: "LS000123",
      branch_id: "string",
      counter_id: "string",
      RFIDNumber: "CZ3506",
      Itemcode: "SAU124",
      category_id: "Gold",
      product_id: "Tops",
      design_id: "Fancy Top",
      purity_id: "22CT",
      grosswt: "20.800",
      stonewt: "0.500",
      diamondheight: "0.250",
      diamondweight: "0.250",
      netwt: "19.250",
      box_details: "Box A",
      size: 0,
      stoneamount: "20",
      diamondAmount: "20",
      HallmarkAmount: "35",
      MakingPerGram: "10",
      MakingPercentage: "5",
      MakingFixedAmt: "37",
      MRP: "5000",
      imageurl: "",
      status: "ApiActive"
    }
  },
  {
    id: 'update-transaction',
    name: 'Update Stock',
    endpoint: 'UpdateRFIDTransactionDetails',
    method: 'POST',
    description: 'Update the status of RFID items (e.g., mark as Sold).',
    baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
    authRequired: true,
    icon: 'fas fa-edit text-white',
    highlight: 'info',
    gradient: 'linear-gradient(135deg, #4A00E0, #8E2DE2)',
    sampleBody: {
      client_code: "LS000186",
      RFIDNumber: "CZ3581",
      Itemcode: "SAU124",
      status: "Sold"
    }
  },
  {
    id: 'get-transaction',
    name: 'View Stock',
    endpoint: 'GetRFIDTransactionDetails',
    method: 'POST',
    description: 'Retrieve all active RFID transactions for a client.',
    baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
    authRequired: true,
    icon: 'fas fa-search text-white',
    highlight: 'primary',
    gradient: 'linear-gradient(135deg, #06beb6, #48b1bf)',
    sampleBody: {
      client_code: "LS000186",
      status: "ApiActive"
    }
  },
  {
    id: 'get-all-device',
    name: 'Get All RFID Device Details',
    endpoint: 'GetAllRFIDDetails',
    method: 'POST',
    description: 'Retrieve all RFID device details for the specified device.',
    baseUrl: 'https://soni.loyalstring.co.in/api/RFIDDevice',
    authRequired: true,
    icon: 'fas fa-mobile-alt text-white',
    highlight: 'info',
    gradient: 'linear-gradient(135deg, #2193b0, #6dd5ed)',
    sampleBody: {
      ClientCode: "LS000186",
      DeviceId: "Sai"
    }
  },
  {
    id: 'delete-specific',
    name: 'Delete Specific Stock Items',
    endpoint: 'DeleteLabelledStockItems',
    method: 'POST',
    description: 'Remove specific items from labelled stock inventory.',
    baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
    authRequired: true,
    icon: 'fas fa-trash-alt text-white',
    highlight: 'danger',
    gradient: 'linear-gradient(135deg, #d60000, #ff0000)',
    sampleBody: {
      ClientCode: "LS000186",
      ItemCodes: ["ITEM001", "ITEM002"]
    }
  },
  {
    id: 'delete-by-client-device',
    name: 'Delete RFID By Client And Device',
    endpoint: 'DeleteRFIDByClientAndDevice',
    method: 'POST',
    description: 'Delete RFID data for a specific client and device combination.',
    baseUrl: 'https://soni.loyalstring.co.in/api/RFIDDevice',
    authRequired: true,
    icon: 'fas fa-trash-alt text-white',
    highlight: 'warning',
    gradient: 'linear-gradient(135deg, #f7b733, #fc4a1a)',
    sampleBody: {
      ClientCode: "LS000186",
      DeviceId: "Sai"
    }
  },
  {
    id: 'stock-verification',
    name: 'Stock Verification',
    endpoint: 'GetAllStockVerificationBySession',
    method: 'POST',
    description: 'Get all stock verification sessions and details for a client.',
    baseUrl: 'https://rrgold.loyalstring.co.in/api/ProductMaster',
    authRequired: true,
    icon: 'fas fa-clipboard-check text-white',
    highlight: 'success',
    gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
    sampleBody: {
      ClientCode: "LS000186",
      ScanBatchId: "optional_batch_id"
    }
  },
  {
    id: 'tag-usage',
    name: 'Get Used/Unused RFID Tags',
    endpoint: 'GetAllUsedAndUnusedTag',
    method: 'POST',
    description: 'Retrieve all used and unused RFID tags for a client with counts.',
    baseUrl: 'https://rrgold.loyalstring.co.in/api/ProductMaster',
    authRequired: true,
    icon: 'fas fa-tags text-white',
    highlight: 'info',
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    sampleBody: {
      ClientCode: "LS000186"
    }
  }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({});
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestBody, setRequestBody] = useState({});
  const [clientError, setClientError] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [showRFIDPrompt, setShowRFIDPrompt] = useState(false);
  
  // Field mapping states
  const [showFieldMappingModal, setShowFieldMappingModal] = useState(false);
  const [excelColumns, setExcelColumns] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({});
  const [mappedFile, setMappedFile] = useState(null);

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
    setUserInfo(userInfo);
    
    // Check for authentication
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }

    // Check if RFID upload prompt should be shown
    checkRFIDPrompt(userInfo);
  }, [navigate]);

  const checkRFIDPrompt = async (userInfo) => {
    try {
      const shouldShow = await rfidTagsService.shouldDisplayPromptOnLogin(userInfo.ClientCode);
      if (shouldShow) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
          setShowRFIDPrompt(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking RFID prompt:', error);
    }
  };

  const handleRFIDPromptClose = () => {
    setShowRFIDPrompt(false);
    rfidTagsService.markPromptAsShown(userInfo.ClientCode);
  };

  const handleRFIDUploadClick = () => {
    setShowRFIDPrompt(false);
    rfidTagsService.markPromptAsShown(userInfo.ClientCode);
    // Navigate to Upload RFID page
    navigate('/upload-rfid');
  };

  const handleEndpointClick = (endpoint) => {
    setSelectedEndpoint(endpoint);
    setResponse(null);
    const newRequestBody = { ...endpoint.sampleBody };
    // Handle both client_code and ClientCode formats
    if (newRequestBody.client_code) {
      newRequestBody.client_code = userInfo.ClientCode;
    }
    if (newRequestBody.ClientCode) {
      newRequestBody.ClientCode = userInfo.ClientCode;
    }
    setRequestBody(newRequestBody);
    setClientError('');
  };

  const validateClientCode = (body) => {
    const clientCode = body.client_code || body.ClientCode;
    if (clientCode !== userInfo.ClientCode) {
      setClientError('You can only make requests with your own client code');
      return false;
    }
    setClientError('');
    return true;
  };

  const handleFieldChange = (field, value) => {
    setRequestBody(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestEndpoint = async () => {
    if (!selectedEndpoint) return;
    if (!validateClientCode(requestBody)) return;

    setLoading(true);
    try {
      let response;
      const clientCode = userInfo.ClientCode;
      
      switch (selectedEndpoint.endpoint) {
        case 'SaveRFIDTransactionDetails':
        case 'UpdateRFIDTransactionDetails':
          response = await axios.post(
            `${selectedEndpoint.baseUrl}/${selectedEndpoint.endpoint}`,
            [requestBody]
          );
          break;

        case 'GetRFIDTransactionDetails':
          const transactionData = await rfidService.getRFIDTransactions(clientCode);
          response = { data: transactionData };
          break;

        case 'DeleteLabelledStockItems':
          const deleteResponse = await rfidService.deleteLabelledStock(clientCode, requestBody.ItemCodes);
          response = { data: deleteResponse };
          break;

        case 'GetAllRFIDDetails':
        case 'DeleteRFIDByClientAndDevice':
        case 'GetAllStockVerificationBySession':
        case 'GetAllUsedAndUnusedTag':
          response = await axios.post(
            `${selectedEndpoint.baseUrl}/${selectedEndpoint.endpoint}`,
            requestBody
          );
          break;

        default:
          throw new Error('Unknown endpoint');
      }

      setResponse(response.data);
      toast.success('API call successful!', {
        toastId: 'api-success',
        position: "top-right",
        autoClose: 2000
      });
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error.response?.data?.Message || error.message;
      setResponse({ error: errorMessage, details: error.response?.data });
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        navigate('/login?session_expired=true');
        return;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Field mapping functions
  const handleFieldMappingChange = (systemField, excelColumn) => {
    setFieldMappings(prev => ({
      ...prev,
      [systemField]: excelColumn
    }));
  };

  const handleMappingComplete = () => {
    setShowFieldMappingModal(false);
    setShowImportModal(true);
    setImportFile(mappedFile);
  };

  // Excel import handler
  const handleImportFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setImportFile(file);
      setImportError('');
      setImportSuccess('');
      
      // Read Excel file to get column names
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });
          
          if (rows.length > 0) {
            const columns = rows[0].filter(col => col && col.trim() !== '');
            setExcelColumns(columns);
            setMappedFile(file);
            setShowImportModal(false);
            setShowFieldMappingModal(true);
            
            // Initialize field mappings with auto-detected matches
            const initialMappings = {};
            // Remove auto-mapping - let users manually select all fields
            // const requiredFields = ['RFIDNumber', 'Itemcode', 'product_id', 'category_id'];
            // const allFields = [
            //   'branch_id', 'counter_id', 'RFIDNumber', 'Itemcode', 'category_id', 'product_id', 
            //   'design_id', 'purity_id', 'grosswt', 'stonewt', 'diamondheight', 'netwt', 'box_details', 'size',
            //   'stoneamount', 'diamondAmount', 'HallmarkAmount', 'MakingPerGram', 'MakingPercentage', 'MakingFixedAmt',
            //   'MRP', 'imageurl', 'status'
            // ];
            
            // allFields.forEach(field => {
            //   const matchingColumn = columns.find(col => {
            //     const colLower = col.toLowerCase();
            //     const fieldLower = field.toLowerCase();
            //     return colLower.includes(fieldLower) || 
            //            (field === 'RFIDNumber' && (colLower.includes('rfid') || colLower.includes('tag'))) ||
            //            (field === 'Itemcode' && (colLower.includes('item') || colLower.includes('code'))) ||
            //            (field === 'product_id' && colLower.includes('product')) ||
            //            (field === 'category_id' && colLower.includes('category')) ||
            //            (field === 'design_id' && colLower.includes('design')) ||
            //            (field === 'purity_id' && colLower.includes('purity')) ||
            //            (field === 'grosswt' && (colLower.includes('gross') || colLower.includes('weight'))) ||
            //            (field === 'stonewt' && (colLower.includes('stone') && colLower.includes('weight'))) ||
            //            (field === 'netwt' && (colLower.includes('net') && colLower.includes('weight'))) ||
            //            (field === 'diamondheight' && (colLower.includes('diamond') && colLower.includes('height'))) ||
            //            (field === 'box_details' && colLower.includes('box')) ||
            //            (field === 'size' && colLower.includes('size')) ||
            //            (field === 'stoneamount' && (colLower.includes('stone') && colLower.includes('amount'))) ||
            //            (field === 'diamondAmount' && (colLower.includes('diamond') && colLower.includes('amount'))) ||
            //            (field === 'HallmarkAmount' && (colLower.includes('hallmark') || colLower.includes('hall'))) ||
            //            (field === 'MakingPerGram' && (colLower.includes('making') && colLower.includes('gram'))) ||
            //            (field === 'MakingPercentage' && (colLower.includes('making') && colLower.includes('percentage'))) ||
            //            (field === 'MakingFixedAmt' && (colLower.includes('making') && colLower.includes('fixed'))) ||
            //            (field === 'MRP' && colLower.includes('mrp')) ||
            //            (field === 'imageurl' && (colLower.includes('image') || colLower.includes('url'))) ||
            //            (field === 'status' && colLower.includes('status'));
            //   });
            //   if (matchingColumn) {
            //     initialMappings[field] = matchingColumn;
            //   }
            // });
            
            setFieldMappings(initialMappings);
          }
        } catch (error) {
          setImportError('Error reading Excel file: ' + error.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setImportError('Please select a valid Excel file (.xlsx or .xls)');
      setImportFile(null);
    }
  };

  const handleImportExcel = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportProgress(0);
    setImportError('');
    setImportSuccess('');
    setUploadResult(null);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          if (!rows.length) {
            setImportError('No data found in the Excel sheet.');
            setImporting(false);
            return;
          }
          const user = JSON.parse(localStorage.getItem('userInfo'));
          const clientCode = user?.ClientCode;
          // Get all fields from sampleBody
          const sampleBody = API_ENDPOINTS.find(e => e.id === 'save-transaction').sampleBody;
          // Map each row to a complete payload
          const items = rows.map((row, rowIndex) => {
            const item = {};
            const rowErrors = [];
            
            Object.entries(sampleBody).forEach(([key, defaultValue]) => {
              let value = defaultValue;
              let isMapped = false;
              
              // Use field mappings if available
              if (fieldMappings[key]) {
                const mappedColumn = fieldMappings[key];
                if (row[mappedColumn] !== undefined && row[mappedColumn] !== null && row[mappedColumn] !== '') {
                  value = row[mappedColumn];
                  isMapped = true;
                } else {
                  value = defaultValue;
                }
              } else {
                // Fallback to old mapping logic for backward compatibility
                let fallbackKey = key;
                // Map common field variations
                if (key === 'RFIDNumber') fallbackKey = 'RFID';
                else if (key === 'Itemcode') fallbackKey = 'Item Code';
                else if (key === 'product_id') fallbackKey = 'Product';
                else if (key === 'category_id') fallbackKey = 'Category';
                else if (key === 'design_id') fallbackKey = 'Design';
                else if (key === 'purity_id') fallbackKey = 'Purity';
                else if (key === 'grosswt') fallbackKey = 'Gross Weight';
                else if (key === 'stonewt') fallbackKey = 'Stone Weight';
                else if (key === 'diamondheight') fallbackKey = 'Diamond Height';
                else if (key === 'diamondweight') fallbackKey = 'Diamond Weight';
                else if (key === 'netwt') fallbackKey = 'Net Weight';
                else if (key === 'box_details') fallbackKey = 'Box Details';
                else if (key === 'stoneamount') fallbackKey = 'Stone Amount';
                else if (key === 'diamondAmount') fallbackKey = 'Diamond Amount';
                else if (key === 'HallmarkAmount') fallbackKey = 'Hallmark Amount';
                else if (key === 'MakingPerGram') fallbackKey = 'Making Per Gram';
                else if (key === 'MakingPercentage') fallbackKey = 'Making Percentage';
                else if (key === 'MakingFixedAmt') fallbackKey = 'Making Fixed Amount';
                else if (key === 'branch_id') fallbackKey = 'Branch ID';
                else if (key === 'counter_id') fallbackKey = 'Counter ID';
                else if (key === 'imageurl') fallbackKey = 'Image URL';
                
                // Try multiple variations for diamond and stone fields
                const fieldVariations = [fallbackKey, key];
                
                // Add common variations for diamond fields
                if (key === 'diamondAmount' || key === 'diamondamount') {
                  fieldVariations.push('Diamond Amount', 'DiamondAmount', 'Diamond_Amount', 'diamount', 'Diamount');
                }
                if (key === 'diamondweight' || key === 'diamondWeight') {
                  fieldVariations.push('Diamond Weight', 'DiamondWeight', 'Diamond_Weight', 'diamond_weight');
                }
                if (key === 'diamondheight' || key === 'diamondHeight') {
                  fieldVariations.push('Diamond Height', 'DiamondHeight', 'Diamond_Height', 'diamond_height');
                }
                if (key === 'stoneamount' || key === 'stoneAmount') {
                  fieldVariations.push('Stone Amount', 'StoneAmount', 'Stone_Amount', 'stone_amount');
                }
                if (key === 'stonewt' || key === 'stoneWt') {
                  fieldVariations.push('Stone Weight', 'StoneWeight', 'Stone_Weight', 'stone_weight');
                }
                
                // Try each variation
                let found = false;
                for (const variation of fieldVariations) {
                  if (row[variation] !== undefined && row[variation] !== null && row[variation] !== '') {
                    value = row[variation];
                    isMapped = true;
                    found = true;
                    break;
                  }
                }
                
                // If still not found, try case-insensitive search
                if (!found) {
                  const rowKeys = Object.keys(row);
                  const matchingKey = rowKeys.find(rk => 
                    rk && rk.toString().toLowerCase().trim() === key.toLowerCase().trim() ||
                    rk && rk.toString().toLowerCase().trim() === fallbackKey.toLowerCase().trim()
                  );
                  if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null && row[matchingKey] !== '') {
                    value = row[matchingKey];
                    isMapped = true;
                  } else {
                    value = defaultValue;
                  }
                }
              }
              
              // Handle client_code specially
              if (key === 'client_code') {
                value = clientCode || '';
                isMapped = true;
              }
              
              // Data type conversion and validation
              if (key === 'size') {
                // For size, if empty, set to 0, else parse as number
                value = value === undefined || value === null || value === '' ? 0 : Number(value);
                if (isNaN(value)) value = 0;
              } else {
                // Convert all other values to string, but handle null/undefined properly
                if (value === undefined || value === null) {
                  value = '';
                } else {
                  value = value.toString().trim();
                }
              }
              
              // Validate required fields - check if mapped value is empty
              const requiredFields = ['RFIDNumber', 'Itemcode', 'category_id', 'product_id'];
              if (requiredFields.includes(key)) {
                if (!value || value === '' || value === null || (fieldMappings[key] && !isMapped)) {
                  const mappedColumn = fieldMappings[key] || key;
                  rowErrors.push(`Missing "${key}" (mapped from "${mappedColumn}")`);
                }
              }
              
              item[key] = value;
            });
            
            // Handle diamond field fallbacks and conversions
            // If diamondheight is present but diamondweight is not, set diamondweight to diamondheight
            if (item.diamondheight && (!item.diamondweight || item.diamondweight === '' || item.diamondweight === 'string')) {
              item.diamondweight = item.diamondheight;
            }
            
            // Ensure diamondAmount is properly set (check for variations)
            if (!item.diamondAmount || item.diamondAmount === '' || item.diamondAmount === 'string') {
              // Try to find diamond amount in row with variations
              const diamondAmountVariations = ['Diamond Amount', 'DiamondAmount', 'diamount', 'Diamount', 'diamond_amount'];
              for (const variation of diamondAmountVariations) {
                if (row[variation] !== undefined && row[variation] !== null && row[variation] !== '') {
                  item.diamondAmount = row[variation].toString().trim();
                  break;
                }
              }
            }
            
            // Ensure diamondweight is properly set (check for variations)
            if (!item.diamondweight || item.diamondweight === '' || item.diamondweight === 'string') {
              // Try to find diamond weight in row with variations
              const diamondWeightVariations = ['Diamond Weight', 'DiamondWeight', 'diamond_weight', 'Diamond_Weight'];
              for (const variation of diamondWeightVariations) {
                if (row[variation] !== undefined && row[variation] !== null && row[variation] !== '') {
                  item.diamondweight = row[variation].toString().trim();
                  break;
                }
              }
            }
            
            // Ensure numeric fields are properly converted
            const numericFields = ['grosswt', 'stonewt', 'diamondheight', 'diamondweight', 'netwt', 'stoneamount', 'diamondAmount', 
                                   'HallmarkAmount', 'MakingPerGram', 'MakingPercentage', 'MakingFixedAmt', 'MRP', 'size'];
            numericFields.forEach(field => {
              if (item[field] && item[field] !== '' && item[field] !== 'string') {
                // Convert to string but ensure it's a valid number format
                const numValue = parseFloat(item[field]);
                if (!isNaN(numValue)) {
                  item[field] = numValue.toString();
                }
              }
            });
            
            return { ...item, _rowIndex: rowIndex + 1, _errors: rowErrors };
          });
          
          // Validate mapped data before sending to API
          const validationErrors = [];
          const failedRows = [];
          
          items.forEach((item, index) => {
            const requiredFields = ['RFIDNumber', 'Itemcode', 'category_id', 'product_id'];
            const rowErrors = [];
            
            requiredFields.forEach(field => {
              if (!item[field] || item[field] === '' || item[field] === null) {
                const mappedColumn = fieldMappings[field] || field;
                rowErrors.push(`${field} (from "${mappedColumn}")`);
              }
            });
            
            // Also check for other important fields that might be empty
            if (!item.branch_id || item.branch_id === '') {
              rowErrors.push(`branch_id (from "${fieldMappings.branch_id || 'branch_id'}")`);
            }
            
            if (rowErrors.length > 0) {
              failedRows.push({
                row: index + 1,
                errors: rowErrors,
                data: {
                  RFIDNumber: item.RFIDNumber || '(empty)',
                  Itemcode: item.Itemcode || '(empty)',
                  category_id: item.category_id || '(empty)',
                  product_id: item.product_id || '(empty)',
                  branch_id: item.branch_id || '(empty)'
                }
              });
              validationErrors.push(`Row ${index + 1}: Missing ${rowErrors.join(', ')}`);
            }
          });
          
          if (validationErrors.length > 0) {
            let errorMessage = `Validation failed - ${validationErrors.length} row(s) have errors:\n\n`;
            // Show first 10 failed rows with details
            failedRows.slice(0, 10).forEach(failed => {
              errorMessage += `Row ${failed.row}:\n`;
              errorMessage += `  - Missing: ${failed.errors.join(', ')}\n`;
              errorMessage += `  - Data: RFID=${failed.data.RFIDNumber}, ItemCode=${failed.data.Itemcode}, Category=${failed.data.category_id}, Product=${failed.data.product_id}, Branch=${failed.data.branch_id}\n\n`;
            });
            if (failedRows.length > 10) {
              errorMessage += `... and ${failedRows.length - 10} more rows with errors.\n\n`;
            }
            errorMessage += `Please check your Excel file and ensure all required fields are mapped and have values.`;
            setImportError(errorMessage);
            setImporting(false);
            return;
          }
          
          // Remove internal tracking fields before sending to API
          const cleanItems = items.map(({ _rowIndex, _errors, ...item }) => item);
          
          // Debug logging for field mapping
          console.log('Field mappings used:', fieldMappings);
          console.log('Sample mapped data (first 2 items):', cleanItems.slice(0, 2));
          console.log('Total items to import:', cleanItems.length);
          
          // Validate diamond fields are properly mapped
          const sampleItem = cleanItems[0];
          if (sampleItem) {
            console.log('Sample item field check:', {
              diamondAmount: sampleItem.diamondAmount,
              diamondweight: sampleItem.diamondweight,
              diamondheight: sampleItem.diamondheight,
              stoneamount: sampleItem.stoneamount,
              stonewt: sampleItem.stonewt,
              grosswt: sampleItem.grosswt,
              netwt: sampleItem.netwt
            });
          }
          
          let progress = 0;
          setImportProgress(progress);
          const chunkSize = 100;
          let lastMessage = '';
          let successCount = 0;
          let errorCount = 0;
          const batchFailures = [];
          
          for (let i = 0; i < cleanItems.length; i += chunkSize) {
            const chunk = cleanItems.slice(i, i + chunkSize);
            const chunkStartRow = i + 1;
            const chunkEndRow = Math.min(i + chunk.length, cleanItems.length);
            
            try {
              const response = await axios.post('https://soni.loyalstring.co.in/api/ProductMaster/SaveRFIDTransactionDetails', chunk);
              if (response.data && response.data.message) {
                lastMessage = response.data.message;
              }
              successCount += chunk.length;
            } catch (chunkError) {
              console.error(`Chunk ${chunkStartRow}-${chunkEndRow} failed:`, chunkError);
              
              // Try to process individual items if batch fails
              let chunkSuccessCount = 0;
              let chunkErrorCount = 0;
              const chunkErrors = [];
              
              // If API supports single item upload, try individually
              // Otherwise, mark entire chunk as failed
              for (let j = 0; j < chunk.length; j++) {
                const singleItem = chunk[j];
                const rowNumber = i + j + 1;
                try {
                  const singleResponse = await axios.post('https://soni.loyalstring.co.in/api/ProductMaster/SaveRFIDTransactionDetails', [singleItem]);
                  chunkSuccessCount++;
                  successCount++;
                } catch (singleError) {
                  chunkErrorCount++;
                  errorCount++;
                  const errorMsg = singleError.response?.data?.Message || singleError.message || 'Unknown error';
                  chunkErrors.push({
                    row: rowNumber,
                    error: errorMsg,
                    data: {
                      RFIDNumber: singleItem.RFIDNumber || '(empty)',
                      Itemcode: singleItem.Itemcode || '(empty)',
                      category_id: singleItem.category_id || '(empty)',
                      product_id: singleItem.product_id || '(empty)',
                      branch_id: singleItem.branch_id || '(empty)'
                    }
                  });
                }
              }
              
              if (chunkError.response?.data?.Message) {
                lastMessage = `Error: ${chunkError.response.data.Message}`;
              }
              
              if (chunkErrors.length > 0) {
                batchFailures.push({
                  chunk: `Rows ${chunkStartRow}-${chunkEndRow}`,
                  errors: chunkErrors,
                  successCount: chunkSuccessCount,
                  errorCount: chunkErrorCount
                });
              } else {
                // If individual processing also failed, mark entire chunk as failed
                batchFailures.push({
                  chunk: `Rows ${chunkStartRow}-${chunkEndRow}`,
                  errors: [{
                    row: chunkStartRow,
                    error: chunkError.response?.data?.Message || chunkError.message || 'Batch upload failed',
                    data: { info: 'Entire batch failed' }
                  }],
                  successCount: 0,
                  errorCount: chunk.length
                });
              }
            }
            progress = Math.round(((i + chunk.length) / cleanItems.length) * 100);
            setImportProgress(progress);
            setUploadResult({ 
              total: cleanItems.length, 
              success: successCount, 
              errors: errorCount, 
              message: lastMessage,
              batchFailures: batchFailures 
            });
          }
          
          // Show detailed success/error message
          if (errorCount > 0) {
            let errorDetails = `Import completed: ${successCount} successful, ${errorCount} failed\n\n`;
            if (batchFailures.length > 0) {
              errorDetails += `Failed Batches:\n`;
              batchFailures.forEach((batch, idx) => {
                errorDetails += `\nBatch ${idx + 1} (${batch.chunk}):\n`;
                batch.errors.slice(0, 5).forEach(err => {
                  errorDetails += `  Row ${err.row}: ${err.error}\n`;
                  if (err.data.RFIDNumber || err.data.Itemcode) {
                    errorDetails += `    - RFID: ${err.data.RFIDNumber}, ItemCode: ${err.data.Itemcode}\n`;
                  }
                });
                if (batch.errors.length > 5) {
                  errorDetails += `  ... and ${batch.errors.length - 5} more errors in this batch\n`;
                }
              });
            }
            setImportError(errorDetails);
            setImportSuccess(`Import completed with ${errorCount} failure(s). See details below.`);
          } else {
            setImportSuccess(`All ${successCount} items imported successfully!`);
          }
          setImporting(false);
          setImportFile(null);
          
          // Update RFID tags count after successful upload
          if (cleanItems.length > 0 && successCount > 0) {
            rfidTagsService.updateTagsCount(successCount);
          }
          
          setTimeout(() => {
            setShowImportModal(false);
            setShowSuccessModal(true);
          }, 800);
        } catch (err) {
          setImportError('Failed to process file: ' + err.message);
          setImporting(false);
        }
      };
      reader.readAsArrayBuffer(importFile);
    } catch (err) {
      setImportError('Failed to import: ' + err.message);
      setImporting(false);
    }
  };

  // Add download sample Excel function
  const handleDownloadSampleExcel = () => {
    const sampleBody = API_ENDPOINTS.find(e => e.id === 'save-transaction').sampleBody;
    const sampleData = [
      Object.fromEntries(
        Object.entries(sampleBody)
          .filter(([key]) => key !== 'client_code')
          .map(([key]) => [
            // Use human-friendly column names for a few fields
            key === 'RFIDNumber' ? 'RFID' :
            key === 'Itemcode' ? 'Item Code' :
            key === 'product_id' ? 'Product' :
            key === 'category_id' ? 'Category' :
            key === 'design_id' ? 'Design' :
            key,
            ''
          ])
      )
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample');
    XLSX.writeFile(wb, 'RFID_Bulk_Upload_Format.xlsx');
  };

  const renderRequestBodyFields = () => {
    if (!selectedEndpoint) return null;

    // For Delete All Stock Items, only show ClientCode
    if (selectedEndpoint.name === 'Delete All Stock Items') {
      return (
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label fw-medium">ClientCode</label>
            <input
              type="text"
              className="form-control"
              value={requestBody.ClientCode}
              disabled
              style={{ 
                borderRadius: '8px', 
                fontSize: '0.9rem',
                backgroundColor: '#f8f9fa' 
              }}
            />
          </div>
        </div>
      );
    }

    const fields = Object.entries(requestBody);
    return (
      <div className="row g-3">
        {fields.map(([key, value]) => {
          // Special handling for ItemCodes array
          if (key === 'ItemCodes' && Array.isArray(value)) {
            return (
              <div className="col-12" key={key}>
                <label className="form-label fw-medium">{key}</label>
                <input
                  type="text"
                  className="form-control"
                  value={value.join(', ')}
                  onChange={(e) => handleFieldChange(key, e.target.value.split(',').map(item => item.trim()))}
                  placeholder="Enter item codes separated by commas"
                  style={{ borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>
            );
          }

          // Client code field (disabled)
          if (key === 'client_code' || key === 'ClientCode') {
            return (
              <div className="col-md-6" key={key}>
                <label className="form-label fw-medium">{key}</label>
                <input
                  type="text"
                  className="form-control"
                  value={value}
                  disabled
                  style={{ 
                    borderRadius: '8px', 
                    fontSize: '0.9rem',
                    backgroundColor: '#f8f9fa' 
                  }}
                />
              </div>
            );
          }

          // Regular fields
          return (
            <div className="col-md-6" key={key}>
              <label className="form-label fw-medium">{key}</label>
              <input
                type={typeof value === 'number' ? 'number' : 'text'}
                className="form-control"
                value={value}
                onChange={(e) => handleFieldChange(key, e.target.value)}
                style={{ borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
          );
        })}
      </div>
    );
  };

  // Colorful icon components without solid backgrounds
  const getEndpointIcon = (idx, isSelected) => {
    const iconSize = 44;
    const colors = ['#22c55e', '#2563eb', '#06beb6', '#0ea5e9', '#ef4444', '#64748b', '#22c55e', '#06b6d4'];
    const iconColor = colors[idx] || '#2563eb';
    const baseStyle = { 
      width: iconSize, 
      height: iconSize, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      borderRadius: '12px', 
      flexShrink: 0,
      background: 'transparent'
    };
    
    const iconComponents = [
      // Add Stock - Plus icon
      <FaSave key="save" style={{ fontSize: '24px', color: iconColor }} />,
      // Update Stock - Edit icon
      <FaEdit key="edit" style={{ fontSize: '24px', color: iconColor }} />,
      // View Stock - Search icon
      <FaSearch key="search" style={{ fontSize: '24px', color: iconColor }} />,
      // Device Details - Mobile icon
      <FaMobileAlt key="mobile" style={{ fontSize: '24px', color: iconColor }} />,
      // Delete Stock - Trash icon
      <FaTrashAlt key="trash1" style={{ fontSize: '24px', color: iconColor }} />,
      // Delete by Device - Trash icon
      <FaTrashAlt key="trash2" style={{ fontSize: '24px', color: iconColor }} />,
      // Stock Verification - Clipboard icon
      <FaClipboardCheck key="clipboard" style={{ fontSize: '24px', color: iconColor }} />,
      // Tag Usage - Tags icon
      <FaTags key="tags" style={{ fontSize: '24px', color: iconColor }} />
    ];
    
    return (
      <div className="endpoint-icon" style={baseStyle}>
        {iconComponents[idx] || iconComponents[0]}
      </div>
    );
  };

  return (
    <>
    <style>{`
      @media (max-width: 768px) {
        .dashboard-container {
          flex-direction: column !important;
          height: auto !important;
          padding: 8px !important;
          gap: 8px !important;
          overflow-x: hidden !important;
          overflow-y: visible !important;
        }
        .sidebar-endpoints {
          width: 100% !important;
          max-height: none !important;
          padding: 12px !important;
          overflow-y: visible !important;
          overflow-x: hidden !important;
          height: auto !important;
        }
        .sidebar-endpoints .endpoint-list {
          max-height: none !important;
          overflow: visible !important;
        }
        .sidebar-endpoints h5 {
          font-size: 14px !important;
          margin-bottom: 12px !important;
        }
        .endpoint-button {
          padding: 10px !important;
          gap: 10px !important;
        }
        .main-content {
          width: 100% !important;
          height: auto !important;
          min-height: auto !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        .main-content > div {
          padding: 16px !important;
          overflow: visible !important;
        }
        .endpoint-title {
          font-size: 13px !important;
        }
        .endpoint-method {
          font-size: 10px !important;
        }
        .welcome-title {
          font-size: 18px !important;
          margin-bottom: 8px !important;
        }
        .welcome-text {
          font-size: 12px !important;
          margin-bottom: 20px !important;
        }
        .card-title {
          font-size: 12px !important;
        }
        .card-desc {
          font-size: 11px !important;
        }
        .grid-cards {
          grid-template-columns: 1fr !important;
          gap: 8px !important;
        }
        .grid-cards > div {
          padding: 12px !important;
        }
        .icon-size {
          width: 32px !important;
          height: 32px !important;
        }
        .icon-size svg {
          font-size: 16px !important;
        }
        .icon-size-large {
          width: 60px !important;
          height: 60px !important;
        }
        .icon-size-large svg {
          font-size: 1.5rem !important;
        }
        .endpoint-icon {
          width: 32px !important;
          height: 32px !important;
        }
        .endpoint-icon svg {
          font-size: 16px !important;
        }
        .endpoint-list {
          gap: 8px !important;
        }
      }
      @media (max-width: 480px) {
        .dashboard-container {
          padding: 6px !important;
          gap: 6px !important;
          overflow-x: hidden !important;
          overflow-y: visible !important;
        }
        .sidebar-endpoints {
          padding: 10px !important;
          overflow-y: visible !important;
          height: auto !important;
        }
        .sidebar-endpoints .endpoint-list {
          max-height: none !important;
          overflow: visible !important;
        }
        .sidebar-endpoints h5 {
          font-size: 13px !important;
          margin-bottom: 10px !important;
        }
        .endpoint-button {
          padding: 8px !important;
          gap: 8px !important;
        }
        .main-content > div {
          padding: 12px !important;
        }
        .endpoint-title {
          font-size: 12px !important;
        }
        .endpoint-method {
          font-size: 9px !important;
        }
        .welcome-title {
          font-size: 16px !important;
          margin-bottom: 6px !important;
        }
        .welcome-text {
          font-size: 11px !important;
          margin-bottom: 16px !important;
        }
        .card-title {
          font-size: 11px !important;
        }
        .card-desc {
          font-size: 10px !important;
        }
        .grid-cards {
          gap: 6px !important;
        }
        .grid-cards > div {
          padding: 10px !important;
        }
        .icon-size {
          width: 28px !important;
          height: 28px !important;
        }
        .icon-size svg {
          font-size: 14px !important;
        }
        .icon-size-large {
          width: 50px !important;
          height: 50px !important;
        }
        .icon-size-large svg {
          font-size: 1.2rem !important;
        }
        .endpoint-icon {
          width: 28px !important;
          height: 28px !important;
        }
        .endpoint-icon svg {
          font-size: 14px !important;
        }
        .endpoint-list {
          gap: 6px !important;
        }
      }
      
      /* Hide all scrollbars */
      * {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      *::-webkit-scrollbar {
        display: none;
      }
      
      /* Ensure no horizontal scroll */
      body, html {
        overflow-x: hidden !important;
        max-width: 100vw !important;
      }
    `}</style>
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif',
      width: '100%',
      padding: 0,
      margin: 0,
      overflowX: 'hidden'
    }}>
      <div className="dashboard-container" style={{ 
        width: '100%', 
        padding: '24px',
        display: 'flex',
        gap: '24px',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        {/* Left Sidebar - API Endpoints */}
        <div className="sidebar-endpoints" style={{ 
          width: '380px',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #f1f5f9',
          overflowY: 'auto',
          flexShrink: 0,
          boxSizing: 'border-box',
          maxWidth: '100%'
        }}>
          <h5 style={{ 
            color: '#0f172a', 
            fontFamily: 'Inter, system-ui, sans-serif', 
            fontWeight: 800, 
            fontSize: '20px',
            marginBottom: '24px',
            letterSpacing: '-0.03em',
            lineHeight: '1.2'
          }}>API Endpoints</h5>
          <div className="endpoint-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {API_ENDPOINTS.map((endpoint, idx) => {
              const isSelected = selectedEndpoint?.id === endpoint.id;
              return (
                <button
                  key={endpoint.id}
                  className="endpoint-button"
                  onClick={() => handleEndpointClick(endpoint)}
                  style={{
                    width: '100%',
                    padding: '18px',
                    borderRadius: '14px',
                    background: isSelected ? endpoint.gradient : '#ffffff',
                    border: isSelected ? 'none' : '1.5px solid #e2e8f0',
                    transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: isSelected ? '0 6px 20px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
                    transform: isSelected ? 'translateY(-2px) scale(1.01)' : 'translateY(0) scale(1)',
                    willChange: 'transform, background-color, box-shadow',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      const target = e.currentTarget;
                      target.style.transition = 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease';
                      target.style.background = '#f8fafc';
                      target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      target.style.borderColor = '#cbd5e1';
                      target.style.transform = 'translateY(-1px) scale(1.005)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      const target = e.currentTarget;
                      target.style.transition = 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease';
                      target.style.background = '#ffffff';
                      target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                      target.style.borderColor = '#e2e8f0';
                      target.style.transform = 'translateY(0) scale(1)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {getEndpointIcon(idx, isSelected)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h6 className="endpoint-title" style={{ 
                        fontSize: '16px', 
                        fontWeight: 700, 
                        fontFamily: 'Inter, system-ui, sans-serif',
                        color: isSelected ? '#ffffff' : '#0f172a',
                        margin: 0,
                        marginBottom: '6px',
                        letterSpacing: '-0.02em',
                        lineHeight: '1.3'
                      }}>
                        {endpoint.name}
                      </h6>
                      <small className="endpoint-method" style={{ 
                        fontSize: '12px', 
                        fontFamily: 'Monaco, Menlo, "Courier New", monospace', 
                        color: isSelected ? 'rgba(255,255,255,0.9)' : '#64748b',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                        letterSpacing: '0.01em'
                      }}>
                        {endpoint.method} {endpoint.endpoint}
                      </small>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="main-content" style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          minWidth: 0,
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          {selectedEndpoint ? (
            <div style={{ 
              background: '#ffffff',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid #f1f5f9',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                paddingBottom: '20px',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h5 style={{ 
                    color: '#0f172a', 
                    fontFamily: 'Inter, system-ui, sans-serif', 
                    fontWeight: 800, 
                    fontSize: '24px',
                    margin: 0,
                    letterSpacing: '-0.03em',
                    lineHeight: '1.2'
                  }}>
                    {selectedEndpoint.name}
                  </h5>
                  <span style={{ 
                    fontSize: '12px', 
                    background: '#2563eb', 
                    color: '#fff', 
                    fontFamily: 'Inter, system-ui, sans-serif', 
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: '6px',
                    letterSpacing: '0.02em'
                  }}>{selectedEndpoint.method}</span>
                </div>
                {selectedEndpoint.id === 'save-transaction' && (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => {
                        const sampleBody = API_ENDPOINTS.find(e => e.id === 'save-transaction').sampleBody;
                        const sampleData = [
                          Object.fromEntries(
                            Object.entries(sampleBody)
                              .filter(([key]) => key !== 'client_code')
                              .map(([key]) => [
                                key === 'RFIDNumber' ? 'RFID' :
                                key === 'Itemcode' ? 'Item Code' :
                                key === 'product_id' ? 'Product' :
                                key === 'category_id' ? 'Category' :
                                key === 'design_id' ? 'Design' :
                                key,
                                ''
                              ])
                          )
                        ];
                        const ws = XLSX.utils.json_to_sheet(sampleData);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'Sample');
                        XLSX.writeFile(wb, 'RFID_Bulk_Upload_Format.xlsx');
                      }}
                      style={{ 
                        borderRadius: '8px', 
                        fontWeight: 600, 
                        fontSize: '14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        border: '2px solid #22c55e', 
                        color: '#22c55e', 
                        background: '#fff', 
                        transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease', 
                        fontFamily: 'Inter, system-ui, sans-serif',
                        padding: '8px 16px',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => {
                        const target = e.currentTarget;
                        target.style.transition = 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease';
                        target.style.background = '#dcfce7';
                        target.style.color = '#16a34a';
                        target.style.borderColor = '#16a34a';
                      }}
                      onMouseLeave={e => {
                        const target = e.currentTarget;
                        target.style.transition = 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease';
                        target.style.background = '#fff';
                        target.style.color = '#22c55e';
                        target.style.borderColor = '#22c55e';
                      }}
                    >
                      <FaFileExcel style={{ marginRight: 8, fontSize: 16 }} /> Download Format
                    </button>
                    <button
                      onClick={() => setShowImportModal(true)}
                      style={{ 
                        borderRadius: '8px', 
                        fontWeight: 600, 
                        fontSize: '14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        border: '2px solid #2563eb', 
                        color: '#2563eb', 
                        background: '#fff', 
                        transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease', 
                        fontFamily: 'Inter, system-ui, sans-serif',
                        padding: '8px 16px',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => {
                        const target = e.currentTarget;
                        target.style.transition = 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease';
                        target.style.background = '#dbeafe';
                        target.style.color = '#1d4ed8';
                        target.style.borderColor = '#1d4ed8';
                      }}
                      onMouseLeave={e => {
                        const target = e.currentTarget;
                        target.style.transition = 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease';
                        target.style.background = '#fff';
                        target.style.color = '#2563eb';
                        target.style.borderColor = '#2563eb';
                      }}
                    >
                      <FaCloudUploadAlt style={{ marginRight: 8, fontSize: 16 }} /> Add Bulk Stock
                    </button>
                  </div>
                )}
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <h6 style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#1e293b',
                    marginBottom: '8px'
                  }}>Description</h6>
                  <p style={{ 
                    fontSize: '14px', 
                    color: '#64748b',
                    margin: 0,
                    lineHeight: '1.6'
                  }}>{selectedEndpoint.description}</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h6 style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#1e293b',
                    marginBottom: '12px'
                  }}>Request Body</h6>
                  <div style={{ 
                    maxHeight: '300px', 
                    overflowY: 'auto',
                    padding: '20px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {renderRequestBodyFields()}
                    {clientError && (
                      <div style={{ 
                        marginTop: '16px',
                        padding: '12px',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        borderRadius: '8px',
                        fontSize: '13px',
                        border: '1px solid #fecaca'
                      }}>
                        {clientError}
                      </div>
                    )}
                    <div style={{ 
                      marginTop: '16px',
                      padding: '12px',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '8px',
                      fontSize: '13px',
                      border: '1px solid #bfdbfe',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <FaInfoCircle />
                      Client code is locked to your account for security
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleTestEndpoint}
                  disabled={loading}
                  style={{
                    background: selectedEndpoint.gradient,
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 24px',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '14px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
                    opacity: loading ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '24px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={e => {
                    if (!loading) {
                      const target = e.currentTarget;
                      target.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
                      target.style.transform = 'translateY(-1px)';
                      target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!loading) {
                      const target = e.currentTarget;
                      target.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
                      target.style.transform = 'translateY(0)';
                      target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane style={{ fontSize: '14px' }} />
                      Send Request
                    </>
                  )}
                </button>

                <div>
                  <h6 style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#1e293b',
                    marginBottom: '12px'
                  }}>Response</h6>
                  <div style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    minHeight: '200px'
                  }}>
                      {loading ? (
                        <div style={{ 
                          padding: '3rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: '16px'
                        }}>
                          <div className="spinner-border text-primary" role="status" style={{ width: '32px', height: '32px', borderWidth: '3px' }}>
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <div style={{ fontSize: '14px', color: '#64748b' }}>Processing request...</div>
                        </div>
                      ) : response ? (
                        <>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            borderBottom: '1px solid #e2e8f0',
                            background: response.error ? '#fee2e2' : '#f0fdf4'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ 
                                padding: '6px 14px', 
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                background: response.error ? '#dc2626' : '#22c55e',
                                color: '#ffffff',
                                letterSpacing: '0.05em'
                              }}>
                                {response.error ? 'ERROR' : 'SUCCESS'}
                              </span>
                              <span style={{ fontSize: '13px', color: '#64748b' }}>
                                {response.error ? 'Request failed' : 'Response received'}
                              </span>
                            </div>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(response, null, 2));
                                toast.success('Response copied to clipboard', {
                                  toastId: 'copy-response'
                                });
                              }}
                              style={{
                                fontSize: '13px',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                color: '#64748b',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              onMouseEnter={e => {
                                const target = e.currentTarget;
                                target.style.transition = 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease';
                                target.style.background = '#f8fafc';
                                target.style.borderColor = '#cbd5e1';
                              }}
                              onMouseLeave={e => {
                                const target = e.currentTarget;
                                target.style.transition = 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease';
                                target.style.background = '#ffffff';
                                target.style.borderColor = '#e2e8f0';
                              }}
                            >
                              <FaCopy /> Copy
                            </button>
                          </div>
                          <div style={{ 
                            maxHeight: '400px',
                            overflowY: 'auto',
                            background: '#ffffff',
                            padding: '20px'
                          }}>
                            {response.error ? (
                              <div style={{ 
                                padding: '16px',
                                backgroundColor: '#fee2e2',
                                borderRadius: '8px',
                                border: '1px solid #fecaca'
                              }}>
                                <h6 style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', marginBottom: '8px', marginTop: 0 }}>Error Details</h6>
                                <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px', marginTop: 0 }}>{response.error}</p>
                                {response.details && (
                                  <pre style={{ 
                                    margin: 0,
                                    fontSize: '12px',
                                    color: '#991b1b',
                                    background: '#ffffff',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    overflow: 'auto'
                                  }}>
                                    {JSON.stringify(response.details, null, 2)}
                                  </pre>
                                )}
                              </div>
                            ) : Array.isArray(response) ? (
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ 
                                  width: '100%',
                                  fontSize: '13px',
                                  borderCollapse: 'collapse'
                                }}>
                                  <thead>
                                    <tr>
                                      {Object.keys(response[0] || {}).map(key => (
                                        <th key={key} style={{ 
                                          position: 'sticky',
                                          top: 0,
                                          background: '#f8fafc',
                                          whiteSpace: 'nowrap',
                                          padding: '12px',
                                          textAlign: 'left',
                                          fontWeight: 600,
                                          color: '#1e293b',
                                          borderBottom: '2px solid #e2e8f0'
                                        }}>{key}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {response.map((item, i) => (
                                      <tr key={i} style={{ 
                                        borderBottom: '1px solid #f1f5f9',
                                        transition: 'background 0.2s'
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        {Object.values(item).map((value, j) => (
                                          <td key={j} style={{ 
                                            padding: '12px',
                                            whiteSpace: 'nowrap',
                                            maxWidth: '200px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            color: '#475569'
                                          }}>
                                            {value?.toString() || '-'}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                <div style={{ 
                                  padding: '12px 16px',
                                  background: '#f8fafc',
                                  borderTop: '1px solid #e2e8f0',
                                  fontSize: '12px',
                                  color: '#64748b'
                                }}>
                                  Total items: {response.length}
                                </div>
                              </div>
                            ) : (
                              <pre style={{ 
                                margin: 0,
                                fontSize: '13px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                color: '#475569',
                                lineHeight: '1.6'
                              }}>
                                {JSON.stringify(response, null, 2)}
                              </pre>
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{ 
                          padding: '3rem', 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: '16px',
                          color: '#94a3b8'
                        }}>
                          <div style={{ fontSize: '48px' }}>📡</div>
                          <div style={{ fontSize: '14px', color: '#64748b' }}>Send a request to see the response here</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ 
                background: '#ffffff',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #f1f5f9',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                textAlign: 'center',
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 88px)'
              }}>
                <div className="icon-size-large" style={{
                  width: '60px',
                  height: '60px',
                  background: 'transparent',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <FaShieldAlt style={{ fontSize: '28px', color: '#2563eb' }} />
                </div>
                <h4 className="welcome-title" style={{ 
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginBottom: '12px',
                  letterSpacing: '-0.03em',
                  lineHeight: '1.2'
                }}>Secure RFID Integration</h4>
                <p className="welcome-text" style={{ 
                  fontSize: '14px',
                  color: '#64748b',
                  marginBottom: '32px',
                  maxWidth: '500px',
                  lineHeight: '1.6',
                  fontWeight: 400
                }}>Select an endpoint from the left to start making secure API requests for your RFID operations.</p>

                <div className="grid-cards" style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  width: '100%',
                  maxWidth: '700px',
                  marginBottom: '20px'
                }}>
                  {[
                    { icon: FaSave, color: '#2563eb', title: 'Save Transactions', desc: 'Securely save new RFID transaction details with complete product information.' },
                    { icon: FaEdit, color: '#06b6d4', title: 'Update Status', desc: 'Update transaction status and manage your RFID inventory efficiently.' },
                    { icon: FaSearch, color: '#22c55e', title: 'Get Details', desc: 'Retrieve and view all active RFID transactions with detailed information.' },
                    { icon: FaMobileAlt, color: '#0ea5e9', title: 'Device Management', desc: 'Get and manage RFID device details for specific devices.' },
                    { icon: FaTrashAlt, color: '#ef4444', title: 'Stock Management', desc: 'Delete specific or all items from your labelled stock inventory.' },
                    { icon: FaTrashAlt, color: '#f59e0b', title: 'Device Cleanup', desc: 'Remove RFID data for specific client and device combinations.' }
                  ].map((item, idx) => {
                    const IconComponent = item.icon;
                    return (
                    <div key={idx} style={{ 
                      padding: '14px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      border: '1px solid #e2e8f0',
                      textAlign: 'left'
                    }} 
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                      e.currentTarget.style.borderColor = item.color;
                      e.currentTarget.style.background = '#ffffff';
                    }} 
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                        <div className="icon-size" style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '10px',
                          flexShrink: 0
                        }}>
                          <IconComponent style={{ fontSize: '18px', color: item.color }} />
                        </div>
                        <h6 className="card-title" style={{ 
                          margin: 0,
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1e293b',
                          lineHeight: '1.3'
                        }}>{item.title}</h6>
                      </div>
                      <p className="card-desc" style={{ 
                        margin: 0,
                        fontSize: '11px',
                        color: '#64748b',
                        lineHeight: '1.4',
                        paddingLeft: '46px'
                      }}>{item.desc}</p>
                    </div>
                    );
                  })}
                </div>

                <div style={{ 
                  marginTop: '20px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  borderRadius: '10px',
                  color: 'white',
                  transition: 'all 0.2s ease',
                  width: '100%',
                  maxWidth: '700px'
                }} 
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.01)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.25)';
                }} 
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FaLock style={{ fontSize: '18px' }} />
                    </div>
                    <div>
                      <h6 style={{ margin: 0, marginBottom: '3px', fontSize: '14px', fontWeight: 600 }}>Secure Client Code Integration</h6>
                      <p style={{ margin: 0, fontSize: '12px', opacity: 0.9, lineHeight: '1.4' }}>All endpoints are secured with your client code for maximum security and data protection.</p>
                    </div>
                  </div>
                </div>
                <style>{`
                  @media (max-width: 768px) {
                    .grid-cards {
                      grid-template-columns: 1fr !important;
                      gap: 10px !important;
                    }
                    .welcome-title {
                      font-size: 18px !important;
                    }
                    .welcome-text {
                      font-size: 12px !important;
                      margin-bottom: 20px !important;
                    }
                    .icon-size-large {
                      width: 50px !important;
                      height: 50px !important;
                      margin-bottom: 12px !important;
                    }
                    .icon-size-large svg {
                      font-size: 24px !important;
                    }
                  }
                `}</style>
              </div>
            )}
          </div>
        </div>
      </div>

      <ToastContainer 
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        draggable
        theme="light"
        limit={1}
        toastStyle={{
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif'
        }}
      />
      {/* Import Excel Modal */}
      {showImportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
          <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', padding: '24px', minWidth: 480, maxWidth: 520, width: '100%', textAlign: 'center', position: 'relative', border: '1px solid #e5e7eb' }}>
            <button onClick={() => setShowImportModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 24, color: '#6b7280', cursor: 'pointer', fontWeight: 400, zIndex: 2, lineHeight: 1, transition: 'color 0.2s', padding: '4px' }}
              onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
              onMouseOut={e => e.currentTarget.style.color = '#6b7280'}
            >
              &times;
            </button>
            <div style={{ marginBottom: 4 }}>
              <FaCloudUploadAlt style={{ fontSize: 40, color: '#3b82f6', marginBottom: 8, opacity: 0.9 }} />
            </div>
            <h2 style={{
              fontWeight: 600,
              fontSize: 20,
              color: '#111827',
              letterSpacing: '-0.01em',
              marginBottom: 8,
              textAlign: 'center',
              lineHeight: 1.2
            }}>
              Upload Bulk Stock in RFID
            </h2>
            <div style={{ margin: '0 0 4px 0', textAlign: 'center', fontWeight: 400, color: '#6b7280', fontSize: 13 }}>
              <span style={{ color: '#dc2626', fontWeight: 500 }}>*</span> The following fields are <span style={{ color: '#dc2626', fontWeight: 500 }}>mandatory</span> in your Excel sheet:
            </div>
            <div style={{ margin: '0 0 16px 0', textAlign: 'center' }}>
              <span style={{
                display: 'inline-block',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                fontFamily: 'SF Mono, Monaco, monospace',
                fontWeight: 500,
                fontSize: 12,
                color: '#3b82f6',
                padding: '4px 8px',
                letterSpacing: 0.1,
              }}>
                Product, Category, RFID
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: 16, width: '100%' }}>
              <div
                style={{
                  background: '#fafbfc',
                  border: '2px dashed #cbd5e1',
                  borderRadius: 12,
                  padding: '32px 16px',
                  textAlign: 'center',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  width: '100%',
                  maxWidth: 380,
                  minHeight: 140,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => !importing && document.getElementById('rfid-excel-input').click()}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.background = '#f1f5f9';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.background = '#fafbfc';
                }}
              >
                <FaCloudUploadAlt style={{ fontSize: 36, color: '#3b82f6', marginBottom: 8, opacity: 0.7 }} />
                <div style={{ margin: '0 0 3px 0', fontWeight: 500, color: '#374151', fontSize: 14 }}>Drag and drop your files here</div>
                <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 12 }}>OR</div>
                <button
                  type="button"
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 20px',
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: importing ? 'not-allowed' : 'pointer',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    transition: 'all 0.2s ease',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginBottom: 8
                  }}
                  onClick={e => { e.stopPropagation(); document.getElementById('rfid-excel-input').click(); }}
                  disabled={importing}
                  onMouseEnter={e => !importing && (e.currentTarget.style.background = '#2563eb')}
                  onMouseLeave={e => !importing && (e.currentTarget.style.background = '#3b82f6')}
                >
                  <FaFileExcel style={{ marginRight: 6, fontSize: 14 }} /> Browse files
                </button>
                <input
                  id="rfid-excel-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportFileChange}
                  disabled={importing}
                  style={{ display: 'none' }}
                />
                <div style={{ color: '#6b7280', fontWeight: 400, fontSize: 11, textAlign: 'center' }}>
                  Only .xlsx or .xls files are supported.
                </div>
              </div>
            </div>
            {/* File preview and progress */}
            {importFile && (
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, position: 'relative', flexDirection: 'column', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 500, fontSize: 15, color: '#374151', marginBottom: 4 }}>{importFile.name}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{(importFile.size / 1024).toFixed(0)} KB</div>
                {importing && (
                  <div style={{ width: '100%', marginTop: 8, marginBottom: 0, position: 'relative' }}>
                    <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ width: `${importProgress}%`, height: '100%', background: '#3b82f6', borderRadius: 4, transition: 'width 0.3s ease' }}>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', fontWeight: 500 }}>
                      {`Uploading ${Math.round((importProgress/100)*uploadResult?.total || 0)} of ${uploadResult?.total || 0} items`}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Success/Error messages */}
            {importError && (
              <div style={{ 
                color: '#dc2626', 
                fontWeight: 500, 
                marginTop: 12, 
                fontSize: 13, 
                background: '#fef2f2', 
                padding: '16px 20px', 
                borderRadius: 8, 
                border: '1px solid #fecaca',
                whiteSpace: 'pre-wrap',
                maxHeight: '400px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                lineHeight: '1.6'
              }}>
                {importError}
              </div>
            )}
            {importSuccess && (
              <div style={{ 
                color: '#059669', 
                fontWeight: 500, 
                marginTop: 12, 
                fontSize: 14, 
                background: '#ecfdf5', 
                padding: '12px 16px', 
                borderRadius: 8, 
                border: '1px solid #a7f3d0' 
              }}>
                {importSuccess}
              </div>
            )}
            <button
              style={{ 
                borderRadius: 8, 
                fontWeight: 500, 
                fontSize: 16, 
                width: '100%', 
                padding: '14px 0', 
                marginTop: 20, 
                background: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                transition: 'all 0.2s ease', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: importing || !importFile ? 'not-allowed' : 'pointer',
                opacity: importing || !importFile ? 0.6 : 1
              }}
              onClick={handleImportExcel}
              disabled={importing || !importFile}
              onMouseEnter={e => !importing && !e.currentTarget.disabled && (e.currentTarget.style.background = '#2563eb')}
              onMouseLeave={e => !importing && !e.currentTarget.disabled && (e.currentTarget.style.background = '#3b82f6')}
            >
              <FaCloudUploadAlt style={{ marginRight: 8, fontSize: 16 }} /> Add Bulk Stock
            </button>
          </div>
        </div>
      )}

      {/* Field Mapping Modal */}
      {showFieldMappingModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', paddingTop: '120px' }}>
          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', padding: '16px', minWidth: 900, maxWidth: 1000, width: '95%', textAlign: 'left', position: 'relative', border: '1px solid #e5e7eb', maxHeight: 'calc(100vh - 160px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => setShowFieldMappingModal(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 18, color: '#6b7280', cursor: 'pointer', fontWeight: 400, zIndex: 2, lineHeight: 1, transition: 'color 0.2s', padding: '4px' }}
              onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
              onMouseOut={e => e.currentTarget.style.color = '#6b7280'}
            >
              &times;
            </button>
            
            <div style={{ textAlign: 'center', marginBottom: 12, flexShrink: 0 }}>
              <div style={{ marginBottom: 2 }}>
                <FaFileExcel style={{ fontSize: 24, color: '#059669', marginBottom: 2, opacity: 0.9 }} />
              </div>
              <h2 style={{
                fontWeight: 600,
                fontSize: 16,
                color: '#111827',
                letterSpacing: '-0.01em',
                marginBottom: 2,
                lineHeight: 1.2
              }}>
                Map Excel Fields to System Fields
              </h2>
              <p style={{ color: '#6b7280', fontSize: 11, marginBottom: 0 }}>
                Match your Excel columns with our system fields to ensure accurate data import
              </p>
            </div>

            {/* Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: 6, flexShrink: 0 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: '#111827', margin: 0, paddingBottom: 3, borderBottom: '1px solid #e5e7eb' }}>
                System Fields <span style={{ color: '#dc2626', fontSize: 9 }}>*Required</span>
              </h3>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: '#111827', margin: 0, paddingBottom: 3, borderBottom: '1px solid #e5e7eb' }}>
                Excel Columns Mapping
              </h3>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflow: 'auto', paddingRight: 4 }}>
              {[
                { key: 'branch_id', label: 'Branch ID', required: false },
                { key: 'counter_id', label: 'Counter ID', required: false },
                { key: 'RFIDNumber', label: 'RFID Number', required: true },
                { key: 'Itemcode', label: 'Item Code', required: true },
                { key: 'category_id', label: 'Category', required: true },
                { key: 'product_id', label: 'Product', required: true },
                { key: 'design_id', label: 'Design', required: false },
                { key: 'purity_id', label: 'Purity', required: false },
                { key: 'grosswt', label: 'Gross Weight', required: false },
                { key: 'stonewt', label: 'Stone Weight', required: false },
                { key: 'diamondheight', label: 'Diamond Height', required: false },
                { key: 'diamondweight', label: 'Diamond Weight', required: false },
                { key: 'netwt', label: 'Net Weight', required: false },
                { key: 'box_details', label: 'Box Details', required: false },
                { key: 'size', label: 'Size', required: false },
                { key: 'stoneamount', label: 'Stone Amount', required: false },
                { key: 'diamondAmount', label: 'Diamond Amount', required: false },
                { key: 'HallmarkAmount', label: 'Hallmark Amount', required: false },
                { key: 'MakingPerGram', label: 'Making Per Gram', required: false },
                { key: 'MakingPercentage', label: 'Making Percentage', required: false },
                { key: 'MakingFixedAmt', label: 'Making Fixed Amount', required: false },
                { key: 'MRP', label: 'MRP', required: false },
                { key: 'imageurl', label: 'Image URL', required: false },
                { key: 'status', label: 'Status', required: false }
              ].map(field => (
                <div key={field.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: 3, alignItems: 'center' }}>
                  {/* Left side - System Field */}
                  <div style={{ 
                    background: field.required ? '#fef3f2' : '#f8fafc', 
                    border: `1px solid ${field.required ? '#fecaca' : '#e2e8f0'}`,
                    borderRadius: 4,
                    padding: '6px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '32px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 11, color: '#374151' }}>
                        {field.label}
                        {field.required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
                      </div>
                    </div>
                    <div style={{ 
                      width: 5, 
                      height: 5, 
                      borderRadius: '50%', 
                      background: fieldMappings[field.key] ? '#10b981' : '#d1d5db',
                      flexShrink: 0,
                      marginLeft: 6
                    }}></div>
                  </div>

                  {/* Right side - Excel Column Dropdown */}
                  <div>
                    <select
                      value={fieldMappings[field.key] || ''}
                      onChange={(e) => handleFieldMappingChange(field.key, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: `1px solid ${field.required && !fieldMappings[field.key] ? '#dc2626' : '#d1d5db'}`,
                        borderRadius: 4,
                        fontSize: 11,
                        color: '#374151',
                        background: 'white',
                        cursor: 'pointer',
                        minHeight: '32px'
                      }}
                    >
                      <option value="">Select Excel Column...</option>
                      {excelColumns.filter(column => {
                        // Show column if it's not selected by any other field, or if it's selected by this current field
                        const selectedValues = Object.values(fieldMappings);
                        const isSelectedByOther = selectedValues.includes(column) && fieldMappings[field.key] !== column;
                        return !isSelectedByOther;
                      }).map(column => {
                        const isCurrentlySelected = fieldMappings[field.key] === column;
                        return (
                          <option key={column} value={column} style={{ 
                            backgroundColor: isCurrentlySelected ? '#e3f2fd' : 'white',
                            color: isCurrentlySelected ? '#1976d2' : '#374151'
                          }}>
                            {column} {isCurrentlySelected ? '✓' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: 4, 
              padding: '6px 10px', 
              marginTop: 8,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: 7, fontWeight: 600 }}>!</span>
              </div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>
                <strong>Note:</strong> Required fields (RFID Number, Item Code, Category, Product) must be mapped to proceed.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button 
                onClick={() => setShowFieldMappingModal(false)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  background: 'white',
                  color: '#374151',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleMappingComplete}
                disabled={!fieldMappings['RFIDNumber'] || !fieldMappings['Itemcode'] || !fieldMappings['product_id'] || !fieldMappings['category_id']}
                style={{
                  padding: '6px 16px',
                  border: 'none',
                  borderRadius: 4,
                  background: (!fieldMappings['RFIDNumber'] || !fieldMappings['Itemcode'] || !fieldMappings['product_id'] || !fieldMappings['category_id']) ? '#d1d5db' : '#3b82f6',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: (!fieldMappings['RFIDNumber'] || !fieldMappings['Itemcode'] || !fieldMappings['product_id'] || !fieldMappings['category_id']) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3
                }}
                onMouseEnter={e => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = '#2563eb';
                  }
                }}
                onMouseLeave={e => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = '#3b82f6';
                  }
                }}
              >
                <FaCloudUploadAlt style={{ fontSize: 10 }} />
                Continue Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
          <div className="rfid-success-animate" style={{ 
            background: 'white', 
            borderRadius: 16, 
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)', 
            padding: '32px 28px 28px 28px', 
            minWidth: 420, 
            maxWidth: 480, 
            width: '100%', 
            textAlign: 'center', 
            position: 'relative', 
            border: '1px solid #e5e7eb',
            animation: 'rfidSuccessPop 0.6s cubic-bezier(.4,2,.6,1)' 
          }}>
            
            {/* Success Icon */}
            <div style={{ 
              width: 64, 
              height: 64, 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)'
            }}>
              <FaCheckCircle style={{ fontSize: 32, color: 'white' }} />
            </div>

            {/* Title */}
            <h2 style={{
              fontWeight: 600,
              fontSize: 24,
              color: '#111827',
              letterSpacing: '-0.01em',
              marginBottom: 8,
              lineHeight: 1.2
            }}>
              Bulk Stock Upload Complete
            </h2>

            {/* Subtitle */}
            <p style={{ 
              color: '#6b7280', 
              fontSize: 14, 
              marginBottom: 20,
              lineHeight: 1.5
            }}>
              Your inventory has been successfully updated
            </p>

            {/* Stats Card */}
            <div style={{ 
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', 
              border: '1px solid #bbf7d0',
              borderRadius: 12, 
              padding: '16px 20px', 
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12
            }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                background: '#10b981', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <span style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>
                  {uploadResult?.total || 0}
                </span>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#059669', marginBottom: 2 }}>
                  Items Processed
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {uploadResult?.message || 'Successfully imported to inventory'}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              style={{ 
                borderRadius: 8, 
                fontWeight: 500, 
                fontSize: 14, 
                width: '100%', 
                padding: '12px 0', 
                background: '#10b981', 
                color: 'white', 
                border: 'none', 
                transition: 'all 0.2s ease', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer',
                gap: 8
              }}
              onClick={() => setShowSuccessModal(false)}
              onMouseEnter={e => e.currentTarget.style.background = '#059669'}
              onMouseLeave={e => e.currentTarget.style.background = '#10b981'}
            >
              <FaCheckCircle style={{ fontSize: 14 }} />
              Continue
            </button>
          </div>
        </div>
      )}

      {/* RFID Upload Prompt */}
      <RFIDUploadPrompt
        isOpen={showRFIDPrompt}
        onClose={handleRFIDPromptClose}
        onNavigateToUpload={handleRFIDUploadClick}
        userInfo={userInfo}
      />
      <style>{`
    @keyframes rfidSuccessPop {
      0% { 
        opacity: 0; 
        transform: scale(0.8) translateY(20px); 
      }
      50% { 
        opacity: 1; 
        transform: scale(1.02) translateY(-4px); 
      }
      100% { 
        opacity: 1; 
        transform: scale(1) translateY(0); 
      }
    }
    `}</style>
    </>
  );
};

export default Dashboard;
