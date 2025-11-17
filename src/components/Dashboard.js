import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import Header from './Header';
import { rfidService } from '../services/rfidService';
import * as XLSX from 'xlsx';
import { FaFileExcel, FaCloudUploadAlt, FaCheckCircle } from 'react-icons/fa';
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

  return (
    <>
    <div style={{
      minHeight: '100vh',
      background: '#f5f6fa',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <Header userInfo={userInfo} />
      <div className="container" style={{ maxWidth: '1400px', marginTop: 12, marginBottom: 0 }}>
        <div className="row">
          {/* Removed RFID API Dashboard heading and icon as per request */}
        </div>
      </div>
      <div className="container py-4 flex-grow-1" style={{ maxWidth: '1400px' }}>
        <div className="row h-100 g-4">
          <div className="col-md-4">
            <div className="card border-0" style={{ 
              borderRadius: '15px',
              background: '#fff',
              fontFamily: 'Inter, system-ui, sans-serif',
              border: '1.5px solid #ececec',
            }}>
              <div className="card-body p-4">
                <h5 className="mb-4 fw-bold" style={{ color: '#2563eb', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, letterSpacing: 0.1 }}>API Endpoints</h5>
                <div className="list-group">
                  {API_ENDPOINTS.map((endpoint, idx) => (
                    <button
                      key={endpoint.id}
                      className={`list-group-item list-group-item-action border-0 mb-3 ${selectedEndpoint?.id === endpoint.id ? 'active' : ''}`}
                      onClick={() => handleEndpointClick(endpoint)}
                      style={{
                        borderRadius: '10px',
                        background: selectedEndpoint?.id === endpoint.id ? endpoint.gradient : '#fff',
                        transition: 'all 0.3s ease',
                        transform: selectedEndpoint?.id === endpoint.id ? 'scale(1.02)' : 'scale(1)',
                        boxShadow: selectedEndpoint?.id === endpoint.id ? '0 8px 16px rgba(0,0,0,0.1)' : '0 4px 6px rgba(0,0,0,0.05)',
                        fontSize: '0.9rem',
                        fontFamily: 'Inter, system-ui, sans-serif',
                      }}
                    >
                      <div className="d-flex align-items-center">
                        <span className="me-3" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {/* Functionally relevant Zoho-style outlined SVG icons */}
                          {idx === 0 && (
                            // Add Stock: Plus (green)
                            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                              <circle cx="13" cy="13" r="10" stroke="#22c55e" strokeWidth="2.2" fill="none"/>
                              <line x1="13" y1="8" x2="13" y2="18" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round"/>
                              <line x1="8" y1="13" x2="18" y2="13" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round"/>
                            </svg>
                          )}
                          {idx === 1 && (
                            // Update Stock: Pencil/Edit (blue)
                            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                              <path d="M17.13 6.87l2 2a2 2 0 010 2.83l-7.5 7.5a2 2 0 01-1.41.59H6v-4.22a2 2 0 01.59-1.41l7.5-7.5a2 2 0 012.83 0z" stroke="#2563eb" strokeWidth="2.2" fill="none"/>
                              <path d="M15 8l3 3" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round"/>
                            </svg>
                          )}
                          {idx === 2 && (
                            // View Stock: Magnifier/Search (teal)
                            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                              <circle cx="12" cy="12" r="7" stroke="#06beb6" strokeWidth="2.2" fill="none"/>
                              <line x1="18.5" y1="18.5" x2="23" y2="23" stroke="#06beb6" strokeWidth="2.2" strokeLinecap="round"/>
                            </svg>
                          )}
                          {idx === 3 && (
                            // Get All RFID Device Details: Chip/Device (blue)
                            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                              <rect x="5" y="7" width="16" height="12" rx="3" stroke="#0ea5e9" strokeWidth="2.2" fill="none"/>
                              <rect x="10" y="12" width="6" height="4" rx="1.5" stroke="#0ea5e9" strokeWidth="2" fill="none"/>
                              <circle cx="8" cy="10" r="1" fill="#0ea5e9" />
                              <circle cx="18" cy="10" r="1" fill="#0ea5e9" />
                            </svg>
                          )}
                          {idx === 4 && (
                            // Delete Specific Stock Items: Trash (red)
                            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                              <rect x="7" y="10" width="12" height="10" rx="2" stroke="#ef4444" strokeWidth="2.2" fill="none"/>
                              <path d="M10 13v4M14 13v4" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round"/>
                              <rect x="9" y="6" width="6" height="2" rx="1" stroke="#ef4444" strokeWidth="2.2" fill="none"/>
                            </svg>
                          )}
                          {idx === 5 && (
                            // Delete RFID By Client And Device: Trash (gray)
                            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                              <rect x="7" y="10" width="12" height="10" rx="2" stroke="#64748b" strokeWidth="2.2" fill="none"/>
                              <path d="M10 13v4M14 13v4" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round"/>
                              <rect x="9" y="6" width="6" height="2" rx="1" stroke="#64748b" strokeWidth="2.2" fill="none"/>
                            </svg>
                          )}
                        </span>
                        <div>
                          <h6 className={`mb-1 ${selectedEndpoint?.id === endpoint.id ? 'text-white' : 'text-dark'}`} style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: 0.05 }}>
                            {endpoint.name}
                          </h6>
                          <small className={selectedEndpoint?.id === endpoint.id ? 'text-white-50' : 'text-muted'} style={{ fontSize: '0.8rem', fontFamily: 'Inter, system-ui, sans-serif', color: selectedEndpoint?.id === endpoint.id ? '#e0e7ff' : '#64748b' }}>
                            {endpoint.method} {endpoint.endpoint}
                          </small>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-8">
            {selectedEndpoint ? (
              <div className="card border-0" style={{ 
                borderRadius: '15px',
                background: '#fff',
                fontFamily: 'Inter, system-ui, sans-serif',
                border: '1.5px solid #ececec',
              }}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-4 justify-content-between">
                    <div className="d-flex align-items-center">
                      <h5 className="fw-bold mb-0" style={{ color: '#22223b', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, letterSpacing: 0.1 }}>
                        {selectedEndpoint.name}
                      </h5>
                      <span className="badge ms-2" style={{ fontSize: '0.8rem', background: '#2563eb', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500 }}>{selectedEndpoint.method}</span>
                    </div>
                    {selectedEndpoint.id === 'save-transaction' && (
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button
                          className="btn btn-outline-success"
                          style={{ borderRadius: 8, fontWeight: 600, fontSize: '0.95rem', boxShadow: '0 2px 8px #b3d8ff33', display: 'flex', alignItems: 'center', border: '2px solid #1aaf5d', color: '#1aaf5d', background: '#fff', transition: 'background 0.2s, color 0.2s, border 0.2s', fontFamily: 'Inter, system-ui, sans-serif' }}
                          onClick={() => {
                            // Download all fields except client_code
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
                          }}
                          onMouseOver={e => {
                            e.currentTarget.style.background = '#e6f9ed';
                            e.currentTarget.style.color = '#178a46';
                            e.currentTarget.style.border = '2px solid #178a46';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.color = '#1aaf5d';
                            e.currentTarget.style.border = '2px solid #1aaf5d';
                          }}
                        >
                          <FaFileExcel style={{ marginRight: 6, fontSize: 18 }} /> Download Format
                        </button>
                        <button
                          className="btn btn-outline-success"
                          style={{ borderRadius: 8, fontWeight: 600, fontSize: '0.95rem', boxShadow: '0 2px 8px #b3d8ff33', display: 'flex', alignItems: 'center', border: '2px solid #0078d4', color: '#0078d4', background: '#fff', transition: 'background 0.2s, color 0.2s, border 0.2s', fontFamily: 'Inter, system-ui, sans-serif' }}
                          onClick={() => setShowImportModal(true)}
                          onMouseOver={e => {
                            e.currentTarget.style.background = '#e3f0ff';
                            e.currentTarget.style.color = '#4A00E0';
                            e.currentTarget.style.border = '2px solid #4A00E0';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.color = '#0078d4';
                            e.currentTarget.style.border = '2px solid #0078d4';
                          }}
                        >
                          <FaCloudUploadAlt style={{ marginRight: 6, fontSize: 18 }} /> Add Bulk Stock
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <h6 className="fw-bold mb-2" style={{ fontSize: '0.9rem' }}>Description</h6>
                    <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>{selectedEndpoint.description}</p>
                  </div>

                  <div className="mb-4">
                    <h6 className="fw-bold mb-3" style={{ fontSize: '0.9rem' }}>Request Body</h6>
                    <div className="position-relative" style={{ 
                      maxHeight: '400px', 
                      overflowY: 'auto',
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '10px',
                      border: '1px solid #dee2e6'
                    }}>
                      {renderRequestBodyFields()}
                      {clientError && (
                        <div className="alert alert-danger mt-3" style={{ fontSize: '0.85rem' }}>
                          {clientError}
                        </div>
                      )}
                      <div className="alert alert-info mt-3" style={{ fontSize: '0.85rem' }}>
                        <i className="fas fa-info-circle me-2"></i>
                        Client code is locked to your account for security
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary px-4 py-2"
                    onClick={handleTestEndpoint}
                    disabled={loading}
                    style={{
                      background: selectedEndpoint.gradient,
                      border: 'none',
                      borderRadius: '10px',
                      transition: 'all 0.3s ease',
                      fontSize: '0.9rem',
                      fontFamily: 'Inter, system-ui, sans-serif'
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>
                        Send Request
                      </>
                    )}
                  </button>

                  <div className={`mt-4`}>
                    <h6 className="fw-bold mb-3" style={{ fontSize: '0.9rem' }}>Response</h6>
                    <div className="response-container" style={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '10px',
                      border: '1px solid #dee2e6',
                      overflow: 'hidden'
                    }}>
                      {loading ? (
                        <div style={{ 
                          padding: '2rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: '1rem'
                        }}>
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.9rem' }}>Processing request...</div>
                        </div>
                      ) : response ? (
                        <>
                          <div className="d-flex align-items-center justify-content-between p-3 border-bottom" style={{
                            background: response.error ? 'rgba(220, 53, 69, 0.1)' : 'linear-gradient(90deg, #f8f9fa 0%, #ffffff 100%)'
                          }}>
                            <div className="d-flex align-items-center gap-2">
                              <span className={`badge ${response.error ? 'bg-danger' : 'bg-success'}`} style={{ 
                                padding: '0.5rem 1rem', 
                                fontSize: '0.8rem' 
                              }}>
                                {response.error ? 'ERROR' : 'SUCCESS'}
                              </span>
                              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                                {response.error ? 'Request failed' : 'Response received'}
                              </span>
                            </div>
                            <button 
                              className="btn btn-sm btn-light" 
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(response, null, 2));
                                toast.success('Response copied to clipboard', {
                                  toastId: 'copy-response'
                                });
                              }}
                              style={{
                                fontSize: '0.8rem',
                                borderRadius: '6px',
                                padding: '0.4rem 0.8rem'
                              }}
                            >
                              <i className="fas fa-copy me-1"></i> Copy
                            </button>
                          </div>
                          <div className="p-3" style={{ 
                            maxHeight: '400px',
                            overflowY: 'auto',
                            background: '#ffffff' 
                          }}>
                            {response.error ? (
                              <div className="alert alert-danger mb-0" style={{ fontSize: '0.85rem' }}>
                                <h6 className="alert-heading fw-bold mb-2">Error Details</h6>
                                <p className="mb-1">{response.error}</p>
                                {response.details && (
                                  <pre className="mt-2 mb-0" style={{ fontSize: '0.8rem' }}>
                                    {JSON.stringify(response.details, null, 2)}
                                  </pre>
                                )}
                              </div>
                            ) : Array.isArray(response) ? (
                              <div className="table-responsive">
                                <table className="table table-hover" style={{ fontSize: '0.85rem' }}>
                                  <thead>
                                    <tr>
                                      {Object.keys(response[0] || {}).map(key => (
                                        <th key={key} style={{ 
                                          position: 'sticky',
                                          top: 0,
                                          background: '#f8f9fa',
                                          whiteSpace: 'nowrap',
                                          padding: '0.75rem'
                                        }}>{key}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {response.map((item, i) => (
                                      <tr key={i}>
                                        {Object.values(item).map((value, j) => (
                                          <td key={j} style={{ 
                                            padding: '0.75rem',
                                            whiteSpace: 'nowrap',
                                            maxWidth: '200px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }}>
                                            {value?.toString() || '-'}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                <div className="p-3 bg-light border-top">
                                  <small className="text-muted">Total items: {response.length}</small>
                                </div>
                              </div>
                            ) : (
                              <pre style={{ 
                                margin: 0,
                                fontSize: '0.85rem',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}>
                                {JSON.stringify(response, null, 2)}
                              </pre>
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{ 
                          padding: '2rem', 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: '1rem',
                          color: '#666'
                        }}>
                          <div style={{ fontSize: '2rem' }}>📡</div>
                          <div style={{ fontSize: '0.9rem' }}>Send a request to see the response here</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card border-0" style={{ 
                borderRadius: '15px', 
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                height: '100%'
              }}>
                <div className="card-body p-4">
                  <div className="text-center mb-4">
                    <div style={{
                      width: '80px',
                      height: '80px',
                      margin: '0 auto',
                      background: 'linear-gradient(135deg, #0078d4 0%, #5470FF 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px'
                    }}>
                      <i className="fas fa-shield-alt text-white" style={{ fontSize: '2rem' }}></i>
                    </div>
                    <h4 className="fw-bold mb-3">Secure RFID Integration</h4>
                    <p className="text-muted mb-4">Select an endpoint from the left to start making secure API requests for your RFID operations.</p>
                  </div>

                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="p-3 h-100" style={{ 
                        background: '#f8f9fa', 
                        borderRadius: '10px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        height: '100%'
                      }} onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#4A00E0';
                      }} onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}>
                        <div className="d-flex align-items-center mb-2">
                          <i className="fas fa-save text-primary me-2"></i>
                          <h6 className="mb-0">Save Transactions</h6>
                        </div>
                        <p className="text-muted small mb-0">Securely save new RFID transaction details with complete product information.</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 h-100" style={{ 
                        background: '#f8f9fa', 
                        borderRadius: '10px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        height: '100%'
                      }} onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#4A00E0';
                      }} onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}>
                        <div className="d-flex align-items-center mb-2">
                          <i className="fas fa-edit text-info me-2"></i>
                          <h6 className="mb-0">Update Status</h6>
                        </div>
                        <p className="text-muted small mb-0">Update transaction status and manage your RFID inventory efficiently.</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 h-100" style={{ 
                        background: '#f8f9fa', 
                        borderRadius: '10px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        height: '100%'
                      }} onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#4A00E0';
                      }} onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}>
                        <div className="d-flex align-items-center mb-2">
                          <i className="fas fa-search text-success me-2"></i>
                          <h6 className="mb-0">Get Details</h6>
                        </div>
                        <p className="text-muted small mb-0">Retrieve and view all active RFID transactions with detailed information.</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 h-100" style={{ 
                        background: '#f8f9fa', 
                        borderRadius: '10px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        height: '100%'
                      }} onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#4A00E0';
                      }} onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}>
                        <div className="d-flex align-items-center mb-2">
                          <i className="fas fa-mobile-alt text-info me-2"></i>
                          <h6 className="mb-0">Device Management</h6>
                        </div>
                        <p className="text-muted small mb-0">Get and manage RFID device details for specific devices.</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 h-100" style={{ 
                        background: '#f8f9fa', 
                        borderRadius: '10px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        height: '100%'
                      }} onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#4A00E0';
                      }} onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}>
                        <div className="d-flex align-items-center mb-2">
                          <i className="fas fa-trash text-danger me-2"></i>
                          <h6 className="mb-0">Stock Management</h6>
                        </div>
                        <p className="text-muted small mb-0">Delete specific or all items from your labelled stock inventory.</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 h-100" style={{ 
                        background: '#f8f9fa', 
                        borderRadius: '10px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        height: '100%'
                      }} onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#4A00E0';
                      }} onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}>
                        <div className="d-flex align-items-center mb-2">
                          <i className="fas fa-trash-alt text-warning me-2"></i>
                          <h6 className="mb-0">Device Cleanup</h6>
                        </div>
                        <p className="text-muted small mb-0">Remove RFID data for specific client and device combinations.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4" style={{ 
                    background: 'linear-gradient(135deg, #0078d4 0%, #5470FF 100%)',
                    borderRadius: '10px',
                    color: 'white',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }} onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(74, 0, 224, 0.2)';
                  }} onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                    <div className="d-flex align-items-center">
                      <i className="fas fa-lock me-3" style={{ fontSize: '1.5rem' }}></i>
                      <div>
                        <h6 className="mb-1">Secure Client Code Integration</h6>
                        <p className="mb-0 small">All endpoints are secured with your client code for maximum security and data protection.</p>
                      </div>
                    </div>
                  </div>
                </div>
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
    </div>
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
