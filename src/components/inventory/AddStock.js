import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { 
  FaPlus, 
  FaTrash, 
  FaFileExcel, 
  FaUpload, 
  FaDownload,
  FaSave,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaMap,
  FaColumns,
  FaChevronDown,
  FaTimes
} from 'react-icons/fa';
import { useLoading } from '../../App';
import { useNotifications } from '../../context/NotificationContext';

// Searchable Dropdown Component
const SearchableDropdown = ({ 
  options = [], 
  value = '', 
  onChange, 
  placeholder = 'Select...', 
  disabled = false,
  required = false,
  label = '',
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get display value
  const displayValue = value || '';

  // Handle option selection
  const handleSelect = (option) => {
    onChange(option);
    setSearchTerm('');
    setIsOpen(false);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    // If user clears the input, clear the selection
    if (!newValue && value) {
      onChange('');
    }
  };

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
    setSearchTerm(value || '');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Reset search term when value changes externally
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [value, isOpen]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', ...style }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={!value ? placeholder : ''}
          disabled={disabled}
          required={required}
          style={{
            width: '100%',
            padding: '5px 30px 5px 8px',
            fontSize: '12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            outline: 'none',
            transition: 'all 0.2s',
            boxSizing: 'border-box',
            background: disabled ? '#f1f5f9' : '#ffffff',
            cursor: disabled ? 'not-allowed' : 'text',
            color: disabled ? '#64748b' : '#1e293b',
            height: '28px',
            minHeight: '28px'
          }}
          onFocus={(e) => {
            handleFocus();
            e.target.style.borderColor = '#3b82f6';
            if (!isOpen) {
              e.target.select();
            }
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e2e8f0';
            // Reset search term when closing if no selection was made
            if (!value) {
              setSearchTerm('');
            }
          }}
        />
        <div style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {value && !disabled && (
            <FaTimes
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearchTerm('');
              }}
              style={{
                cursor: 'pointer',
                fontSize: '10px',
                color: '#94a3b8',
                pointerEvents: 'auto'
              }}
            />
          )}
          <FaChevronDown
            style={{
              fontSize: '10px',
              color: '#94a3b8',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          />
        </div>
      </div>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          zIndex: 1000,
          maxHeight: '200px',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={index}
                onClick={() => handleSelect(option)}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  color: '#1e293b',
                  transition: 'background-color 0.15s',
                  backgroundColor: value === option ? '#eff6ff' : 'transparent',
                  borderBottom: index < filteredOptions.length - 1 ? '1px solid #f1f5f9' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (value !== option) {
                    e.target.style.backgroundColor = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== option) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {option}
              </div>
            ))
          ) : (
            <div style={{
              padding: '12px',
              fontSize: '12px',
              color: '#94a3b8',
              textAlign: 'center'
            }}>
              No options found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AddStock = () => {
  const { loading, setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const fileInputRef = useRef(null);
  const [activeSection, setActiveSection] = useState(1); // 1: Single, 2: Multiple, 3: Bulk Upload
  const [userInfo, setUserInfo] = useState(null);

  // Single Product Form State
  const [singleProduct, setSingleProduct] = useState({
    client_code: '',
    RFIDNumber: '',
    Itemcode: '',
    category_id: '',
    product_id: '',
    design_id: '',
    purity_id: '',
    grosswt: '',
    stonewt: '',
    diamondweight: '',
    netwt: '',
    box_details: '',
    size: 0,
    stoneamount: '',
    diamondAmount: '',
    HallmarkAmount: '',
    MakingPerGram: '',
    MakingPercentage: '',
    MakingFixedAmt: '',
    MRP: '',
    imageurl: '',
    status: 'ApiActive'
  });

  // Multiple Products Form State
  const [multipleProducts, setMultipleProducts] = useState([]);

  // Template form for adding products (hidden after adding)
  const [productTemplate, setProductTemplate] = useState({
    RFIDNumber: '',
    Itemcode: '',
    quantity: 1, // Quantity for this product
    category_id: '',
    product_id: '',
    design_id: '',
    purity_id: '',
    grosswt: '',
    stonewt: '',
    diamondweight: '',
    netwt: '',
    box_details: '',
    size: 0,
    stoneamount: '',
    diamondAmount: '',
    HallmarkAmount: '',
    MakingPerGram: '',
    MakingPercentage: '',
    MakingFixedAmt: '',
    MRP: '',
    imageurl: '',
    status: 'ApiActive' // Always ApiActive, non-editable
  });

  const [quantity, setQuantity] = useState(1);
  const [showTemplateForm, setShowTemplateForm] = useState(true);
  
  // Pagination and search for multiple products
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProducts, setExpandedProducts] = useState(new Set());

  // Bulk Upload State
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [excelColumns, setExcelColumns] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({});
  const [showMappingSidebar, setShowMappingSidebar] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [rawExcelData, setRawExcelData] = useState([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, percentage: 0, successCount: 0, errorCount: 0 });
  const [uploading, setUploading] = useState(false);
  const [batchErrors, setBatchErrors] = useState([]);
  const [serverMessages, setServerMessages] = useState([]);

  // Common shared state
  const [sharedData, setSharedData] = useState({
    branch_name: '',
    counter_name: '',
    RFIDNumber: '',
    Itemcode: ''
  });

  // Branches and Counters data
  const [branches, setBranches] = useState([]);
  const [counters, setCounters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [purities, setPurities] = useState([]);
  const [loadingBranchesCounters, setLoadingBranchesCounters] = useState(false);
  const [loadingMasterData, setLoadingMasterData] = useState(false);

  // Normalize response data helper
  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      return data.data || data.items || data.results || data.list || [];
    }
    return [];
  };

  // Fetch branches and counters
  const fetchBranchesAndCounters = async () => {
    if (!userInfo?.ClientCode) return;
    
    setLoadingBranchesCounters(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const requestBody = { ClientCode: userInfo.ClientCode };

      const [branchesResponse, countersResponse] = await Promise.all([
        axios.post('https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllBranchMaster', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllCounters', requestBody, { headers })
      ]);

      setBranches(normalizeArray(branchesResponse.data));
      setCounters(normalizeArray(countersResponse.data));
    } catch (error) {
      console.error('Error fetching branches and counters:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load branches and counters. Please refresh the page.'
      });
    } finally {
      setLoadingBranchesCounters(false);
    }
  };

  // Fetch master data (Category, Product, Design, Purity)
  const fetchMasterData = async () => {
    if (!userInfo?.ClientCode) return;
    
    setLoadingMasterData(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const requestBody = { ClientCode: userInfo.ClientCode };

      const [
        categoriesResponse,
        productsResponse,
        designsResponse,
        puritiesResponse
      ] = await Promise.all([
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllCategory', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllProductMaster', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllDesign', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllPurity', requestBody, { headers })
      ]);

      setCategories(normalizeArray(categoriesResponse.data));
      setProducts(normalizeArray(productsResponse.data));
      setDesigns(normalizeArray(designsResponse.data));
      setPurities(normalizeArray(puritiesResponse.data));
    } catch (error) {
      console.error('Error fetching master data:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load master data. Please refresh the page.'
      });
    } finally {
      setLoadingMasterData(false);
    }
  };

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsed = JSON.parse(storedUserInfo);
        setUserInfo(parsed);
        setSingleProduct(prev => ({
          ...prev,
          client_code: parsed.ClientCode || ''
        }));
      } catch (err) {
        console.error('Error parsing user info:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (userInfo?.ClientCode) {
      fetchBranchesAndCounters();
      fetchMasterData();
      fetchTemplates();
    }
  }, [userInfo?.ClientCode]);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch templates
  const fetchTemplates = async () => {
    if (!userInfo?.ClientCode) return;
    
    setLoadingTemplates(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const requestBody = { ClientCode: userInfo.ClientCode };

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/Invoice/alltemplate',
        requestBody,
        { headers }
      );

      const normalizeArray = (data) => {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
          return data.data || data.items || data.results || data.list || [];
        }
        return [];
      };

      setTemplates(normalizeArray(response.data));
    } catch (error) {
      console.error('Error fetching templates:', error);
      // Don't show error notification as templates are optional
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Save template
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please enter a template name'
      });
      return;
    }

    if (Object.keys(fieldMappings).length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please map at least one field before saving'
      });
      return;
    }

    setSavingTemplate(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };

      const payload = {
        TemplateName: templateName.trim(),
        Template: JSON.stringify(fieldMappings),
        ClientCode: userInfo?.ClientCode
      };

      await axios.post(
        'https://rrgold.loyalstring.co.in/api/Invoice/CreateTemplate',
        payload,
        { headers }
      );

      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Template saved successfully!'
      });

      setTemplateName('');
      await fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to save template'
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  // Apply template
  const applyTemplate = () => {
    if (!selectedTemplate) return;

    const template = templates.find(t => 
      (t.Id || t.id || t.TemplateId || t.templateId) === selectedTemplate
    );

    if (template) {
      try {
        let templateData = {};
        
        // Handle double-encoded JSON string
        if (typeof template.TemplateData === 'string') {
          try {
            // First parse to get the string
            const firstParse = JSON.parse(template.TemplateData);
            // If it's still a string, parse again
            if (typeof firstParse === 'string') {
              templateData = JSON.parse(firstParse);
            } else {
              templateData = firstParse;
            }
          } catch (e) {
            // If single parse fails, try direct parse
            templateData = JSON.parse(template.TemplateData);
          }
        } else {
          templateData = template.TemplateData || template.Template || {};
        }
        
        setFieldMappings(templateData);
        addNotification({
          type: 'success',
          title: 'Template Applied',
          message: 'Template mappings applied successfully!'
        });
      } catch (error) {
        console.error('Error parsing template:', error);
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to apply template'
        });
      }
    }
  };

  // Process Excel data with mappings
  const processExcelDataWithMappings = (jsonData, mappings) => {
    const preview = [];
    const errors = [];

    jsonData.forEach((row, index) => {
      const product = {
        client_code: userInfo?.ClientCode || '',
        branch_id: '',
        counter_id: '',
        RFIDNumber: '',
        Itemcode: '',
        category_id: '',
        product_id: '',
        design_id: '',
        purity_id: '',
        grosswt: '0',
        stonewt: '0',
        diamondweight: '0',
        netwt: '0',
        box_details: '',
        size: 0,
        stoneamount: '0',
        diamondAmount: '0',
        HallmarkAmount: '0',
        MakingPerGram: '0',
        MakingPercentage: '0',
        MakingFixedAmt: '0',
        MRP: '0',
        imageurl: '',
        status: 'ApiActive'
      };

      // Apply mappings
      Object.keys(mappings).forEach(fieldKey => {
        const excelColumn = mappings[fieldKey];
        if (excelColumn && row[excelColumn] !== undefined && row[excelColumn] !== null) {
          const value = row[excelColumn];
          // Handle numeric fields
          if (['grosswt', 'stonewt', 'diamondweight', 'netwt', 'stoneamount', 'diamondAmount', 'HallmarkAmount', 'MakingPerGram', 'MakingPercentage', 'MakingFixedAmt', 'MRP'].includes(fieldKey)) {
            product[fieldKey] = value !== '' && value !== null && value !== undefined ? String(value) : '0';
          } else if (fieldKey === 'size') {
            product[fieldKey] = value !== '' && value !== null && value !== undefined ? Number(value) : 0;
          } else {
            // Ensure all string fields are properly converted to string
            // Handle null, undefined, numbers, and empty values
            let stringValue = '';
            if (value !== null && value !== undefined && value !== '') {
              if (typeof value === 'number') {
                stringValue = String(value);
              } else {
                stringValue = String(value).trim();
              }
            }
            product[fieldKey] = stringValue;
          }
        }
      });

      // Use shared data for branch and counter if not mapped
      if (!product.branch_id && sharedData.branch_name) {
        product.branch_id = sharedData.branch_name;
      }
      if (!product.counter_id && sharedData.counter_name) {
        product.counter_id = sharedData.counter_name;
      }

      // Validate product
      const rowErrors = validateProduct(product, true);
      if (rowErrors.length > 0) {
        errors.push(`Row ${index + 2}: ${rowErrors.join(', ')}`);
      }

      preview.push(product);
    });

    return { preview, errors };
  };

  // Get branch ID from branch name
  const getBranchId = (branchName) => {
    if (!branchName) return '';
    const branch = branches.find(b => 
      b.BranchName === branchName || 
      b.Name === branchName || 
      b.branchName === branchName ||
      b.name === branchName
    );
    return branch ? (branch.Id || branch.id || branch.BranchId || '') : '';
  };

  // Get counter ID from counter name
  const getCounterId = (counterName) => {
    if (!counterName) return '';
    const counter = counters.find(c => 
      c.CounterName === counterName || 
      c.Name === counterName || 
      c.counterName === counterName ||
      c.name === counterName
    );
    return counter ? (counter.Id || counter.id || counter.CounterId || '') : '';
  };

  // Get category ID from category name
  const getCategoryId = (categoryName) => {
    if (!categoryName) return '';
    const category = categories.find(c => 
      c.CategoryName === categoryName || 
      c.Name === categoryName || 
      c.Category === categoryName ||
      c.categoryName === categoryName ||
      c.name === categoryName ||
      c.category === categoryName
    );
    return category ? (category.Id || category.id || category.CategoryId || categoryName) : categoryName;
  };

  // Get product ID from product name
  const getProductId = (productName) => {
    if (!productName) return '';
    // Check ProductName first to match API response
    const product = products.find(p => 
      p.ProductName === productName || 
      p.productName === productName ||
      p.Name === productName || 
      p.Product === productName ||
      p.name === productName ||
      p.product === productName
    );
    return product ? (product.Id || product.id || product.ProductId || productName) : productName;
  };

  // Get design ID from design name
  const getDesignId = (designName) => {
    if (!designName) return '';
    // Check DesignName first to match API response
    const design = designs.find(d => 
      d.DesignName === designName || 
      d.designName === designName ||
      d.Name === designName || 
      d.Design === designName ||
      d.name === designName ||
      d.design === designName
    );
    return design ? (design.Id || design.id || design.DesignId || designName) : designName;
  };

  // Get purity ID from purity name
  const getPurityId = (purityName) => {
    if (!purityName) return '';
    // Check PurityName first to match API response
    const purity = purities.find(p => 
      p.PurityName === purityName || 
      p.purityName === purityName ||
      p.Name === purityName || 
      p.Purity === purityName ||
      p.name === purityName ||
      p.purity === purityName
    );
    return purity ? (purity.Id || purity.id || purity.PurityId || purityName) : purityName;
  };

  // Reset single product form
  const resetSingleForm = () => {
    setSingleProduct({
      client_code: userInfo?.ClientCode || '',
      RFIDNumber: '',
      Itemcode: '',
      category_id: '',
      product_id: '',
      design_id: '',
      purity_id: '',
      grosswt: '',
      stonewt: '',
      diamondweight: '',
      netwt: '',
      box_details: '',
      size: 0,
      stoneamount: '',
      diamondAmount: '',
      HallmarkAmount: '',
      MakingPerGram: '',
      MakingPercentage: '',
      MakingFixedAmt: '',
      MRP: '',
      imageurl: '',
      status: 'ApiActive'
    });
  };

  // Add products based on quantity
  const handleAddProducts = () => {
    // Validate required fields in product template
    if (!productTemplate.RFIDNumber || !productTemplate.Itemcode) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill RFID Number and Item Code for this product'
      });
      return;
    }

    // Check for duplicate RFID or Item Code
    const existingRFIDs = multipleProducts.map(p => p.RFIDNumber);
    const existingItemCodes = multipleProducts.map(p => p.Itemcode);
    
    if (existingRFIDs.includes(productTemplate.RFIDNumber)) {
      addNotification({
        type: 'error',
        title: 'Duplicate RFID',
        message: 'This RFID Number already exists. Please use a unique RFID Number.'
      });
      return;
    }
    
    if (existingItemCodes.includes(productTemplate.Itemcode)) {
      addNotification({
        type: 'error',
        title: 'Duplicate Item Code',
        message: 'This Item Code already exists. Please use a unique Item Code.'
      });
      return;
    }

    // Validate required fields in product template
    const errors = validateProduct(productTemplate, false, []);
    if (errors.length > 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: `Please fill required fields: ${errors.join(', ')}`
      });
      return;
    }

    const productQuantity = productTemplate.quantity || 1;
    if (productQuantity < 1 || productQuantity > 100) {
      addNotification({
        type: 'error',
        title: 'Invalid Quantity',
        message: 'Quantity must be between 1 and 100'
      });
      return;
    }

    // Create products based on quantity - each with same RFID and ItemCode but can be edited
    const newProduct = {
        ...productTemplate,
      quantity: productQuantity
      };

    setMultipleProducts(prev => [...prev, newProduct]);
    
    // Reset template form
    setProductTemplate({
      RFIDNumber: '',
      Itemcode: '',
      quantity: 1,
      category_id: '',
      product_id: '',
      design_id: '',
      purity_id: '',
      grosswt: '',
      stonewt: '',
      diamondweight: '',
      netwt: '',
      box_details: '',
      size: 0,
      stoneamount: '',
      diamondAmount: '',
      HallmarkAmount: '',
      MakingPerGram: '',
      MakingPercentage: '',
      MakingFixedAmt: '',
      MRP: '',
      imageurl: '',
      status: 'ApiActive'
    });
    setQuantity(1);
    setShowTemplateForm(false);

    addNotification({
      type: 'success',
      title: 'Product Added',
      message: 'Product added successfully! You can now edit it or add more products.'
    });
  };

  // Show template form again
  const showAddProductForm = () => {
    setShowTemplateForm(true);
  };

  // Clear all products
  const clearAllProducts = () => {
    setMultipleProducts([]);
    setSearchTerm('');
    setCurrentPage(1);
    setExpandedProducts(new Set());
    setShowTemplateForm(true);
    addNotification({
      type: 'info',
      title: 'Cleared',
      message: 'All products cleared. You can start adding new products.'
    });
  };

  // Remove product row
  const removeProductRow = (index) => {
    setMultipleProducts(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate net weight: grosswt - stonewt - diamondweight
  const calculateNetWeight = (grosswt, stonewt, diamondweight) => {
    const gross = parseFloat(grosswt) || 0;
    const stone = parseFloat(stonewt) || 0;
    const diamond = parseFloat(diamondweight) || 0;
    const net = gross - stone - diamond;
    return net >= 0 ? net.toFixed(3) : '0';
  };

  // Update single product field
  const updateSingleField = (field, value) => {
    // Prevent status from being changed - always keep it as 'ApiActive'
    if (field === 'status') {
      return; // Don't allow status changes
    }
    
    setSingleProduct(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate net weight when grosswt, stonewt, or diamondweight changes
      if (field === 'grosswt' || field === 'stonewt' || field === 'diamondweight') {
        updated.netwt = calculateNetWeight(updated.grosswt, updated.stonewt, updated.diamondweight);
      }
      
      return updated;
    });
  };

  // Update multiple product field
  const updateMultipleField = (index, field, value) => {
    // Prevent status from being changed - always keep it as 'ApiActive'
    if (field === 'status') {
      return; // Don't allow status changes
    }
    
    setMultipleProducts(prev => prev.map((product, i) => {
      if (i !== index) return product;
      
      const updated = { ...product, [field]: value };
      
      // Auto-calculate net weight when grosswt, stonewt, or diamondweight changes
      if (field === 'grosswt' || field === 'stonewt' || field === 'diamondweight') {
        updated.netwt = calculateNetWeight(updated.grosswt, updated.stonewt, updated.diamondweight);
      }
      
      return updated;
    }));
  };

  // Update template form field
  const updateTemplateField = (field, value) => {
    // Prevent status from being changed - always keep it as 'ApiActive'
    if (field === 'status') {
      return; // Don't allow status changes
    }
    
    setProductTemplate(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate net weight when grosswt, stonewt, or diamondweight changes
      if (field === 'grosswt' || field === 'stonewt' || field === 'diamondweight') {
        updated.netwt = calculateNetWeight(updated.grosswt, updated.stonewt, updated.diamondweight);
      }
      
      return updated;
    });
  };

  // Validate required fields
  const validateProduct = (product, isBulk = false, allProducts = []) => {
    const errors = [];
    const requiredFields = ['RFIDNumber', 'Itemcode', 'category_id', 'product_id'];
    
    requiredFields.forEach(field => {
      if (!product[field] || product[field].toString().trim() === '') {
        const fieldName = field === 'RFIDNumber' ? 'RFID Number' :
                         field === 'Itemcode' ? 'Item Code' :
                         field === 'category_id' ? 'Category' :
                         field === 'product_id' ? 'Product' : field;
        errors.push(`${fieldName} is required`);
      }
    });

    // Check for unique ItemCode
    if (product.Itemcode && allProducts.length > 0) {
      const duplicateCount = allProducts.filter(p => 
        p.Itemcode && p.Itemcode.toString().trim().toLowerCase() === product.Itemcode.toString().trim().toLowerCase()
      ).length;
      if (duplicateCount > 1) {
        errors.push('Item Code must be unique');
      }
    }

    // Validate net weight: netwt should not be greater than grosswt
    const grosswt = parseFloat(product.grosswt) || 0;
    const netwt = parseFloat(product.netwt) || 0;
    if (grosswt > 0 && netwt > grosswt) {
      errors.push('Net Weight cannot be greater than Gross Weight');
    }

    return errors;
  };

  // Submit single product
  const handleSubmitSingle = async () => {
    const errors = validateProduct(singleProduct, false, [singleProduct]);
    if (errors.length > 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: errors.join(', ')
      });
      return;
    }

    setLoading(true);
    try {
      // Match exact API payload structure from documentation
      // Send names directly (not IDs) for branch, counter, category, product, design, and purity
      const payload = [{
        client_code: String(singleProduct.client_code || userInfo?.ClientCode || ''),
        branch_id: String(sharedData.branch_name || ''),
        counter_id: String(sharedData.counter_name || ''),
        RFIDNumber: String(singleProduct.RFIDNumber || ''),
        Itemcode: String(singleProduct.Itemcode || ''),
        category_id: String(singleProduct.category_id || ''),
        product_id: String(singleProduct.product_id || ''),
        design_id: String(singleProduct.design_id || ''),
        purity_id: String(singleProduct.purity_id || ''),
        grosswt: String(singleProduct.grosswt || '0'),
        stonewt: String(singleProduct.stonewt || '0'),
        diamondweight: String(singleProduct.diamondweight || '0'),
        netwt: String(singleProduct.netwt || '0'),
        box_details: String(singleProduct.box_details || ''),
        size: Number(singleProduct.size || 0),
        stoneamount: String(singleProduct.stoneamount || '0'),
        diamondAmount: String(singleProduct.diamondAmount || '0'),
        HallmarkAmount: String(singleProduct.HallmarkAmount || '0'),
        MakingPerGram: String(singleProduct.MakingPerGram || '0'),
        MakingPercentage: String(singleProduct.MakingPercentage || '0'),
        MakingFixedAmt: String(singleProduct.MakingFixedAmt || '0'),
        MRP: String(singleProduct.MRP || '0'),
        imageurl: String(singleProduct.imageurl || ''),
        status: String(singleProduct.status || 'ApiActive')
      }];

      const response = await axios.post(
        'https://soni.loyalstring.co.in/api/ProductMaster/SaveRFIDTransactionDetails',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Stock item added successfully!'
      });
      resetSingleForm();
    } catch (error) {
      console.error('Error adding stock:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to add stock item. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit multiple products
  const handleSubmitMultiple = async () => {
    const allErrors = [];
    const validProducts = [];

    multipleProducts.forEach((product, index) => {
      const errors = validateProduct(product, false, multipleProducts);
      if (errors.length > 0) {
        allErrors.push(`Product ${index + 1}: ${errors.join(', ')}`);
      } else {
        const quantity = product.quantity || 1;
        
        // If quantity > 1, create multiple entries with unique ItemCodes
        for (let qtyIndex = 0; qtyIndex < quantity; qtyIndex++) {
          let itemCode = product.Itemcode || '';
          let rfidNumber = product.RFIDNumber || '';
          
          // If quantity > 1, append suffix to ItemCode to make it unique
          if (quantity > 1 && qtyIndex > 0) {
            itemCode = `${product.Itemcode}-${qtyIndex + 1}`;
            // Optionally append suffix to RFID as well
            rfidNumber = `${product.RFIDNumber}-${qtyIndex + 1}`;
          }
          
          // Match exact API payload structure - same as single product
          // Send names directly (not IDs) for branch, counter, category, product, design, and purity
        validProducts.push({
          client_code: String(userInfo?.ClientCode || ''),
            branch_id: String(sharedData.branch_name || ''), // Shared branch name
            counter_id: String(sharedData.counter_name || ''), // Shared counter name
            RFIDNumber: String(rfidNumber),
            Itemcode: String(itemCode),
          category_id: String(product.category_id || ''),
          product_id: String(product.product_id || ''),
          design_id: String(product.design_id || ''),
          purity_id: String(product.purity_id || ''),
          grosswt: String(product.grosswt || '0'),
          stonewt: String(product.stonewt || '0'),
          diamondweight: String(product.diamondweight || '0'),
          netwt: String(product.netwt || '0'),
          box_details: String(product.box_details || ''),
          size: Number(product.size || 0),
          stoneamount: String(product.stoneamount || '0'),
          diamondAmount: String(product.diamondAmount || '0'),
          HallmarkAmount: String(product.HallmarkAmount || '0'),
          MakingPerGram: String(product.MakingPerGram || '0'),
          MakingPercentage: String(product.MakingPercentage || '0'),
          MakingFixedAmt: String(product.MakingFixedAmt || '0'),
          MRP: String(product.MRP || '0'),
          imageurl: String(product.imageurl || ''),
          status: String(product.status || 'ApiActive')
        });
        }
      }
    });

    if (allErrors.length > 0) {
      addNotification({
        type: 'error',
        title: 'Validation Errors',
        message: allErrors.join('\n')
      });
      return;
    }

    if (validProducts.length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No valid products to add'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        'https://soni.loyalstring.co.in/api/ProductMaster/SaveRFIDTransactionDetails',
        validProducts,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      addNotification({
        type: 'success',
        title: 'Success',
        message: `${validProducts.length} stock item(s) added successfully!`
      });
      setMultipleProducts([{
        RFIDNumber: '',
        Itemcode: '',
        category_id: '',
        product_id: '',
        design_id: '',
        purity_id: '',
        grosswt: '',
        stonewt: '',
        diamondweight: '',
        netwt: '',
        box_details: '',
        size: 0,
        stoneamount: '',
        diamondAmount: '',
        HallmarkAmount: '',
        MakingPerGram: '',
        MakingPercentage: '',
        MakingFixedAmt: '',
        MRP: '',
        imageurl: '',
        status: 'ApiActive'
      }]);
    } catch (error) {
      console.error('Error adding multiple stock:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to add stock items. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Download Excel template
  const downloadExcelTemplate = () => {
    const templateData = [{
      'client_code': userInfo?.ClientCode || 'LS000123',
      'branch_id': '',
      'counter_id': '',
      'RFIDNumber': 'CZ3506',
      'Itemcode': 'SAU124',
      'category_id': 'Gold',
      'product_id': 'Tops',
      'design_id': 'Fancy Top',
      'purity_id': '22CT',
      'grosswt': '20.800',
      'stonewt': '0.500',
      'diamondweight': '0.250',
      'netwt': '19.250',
      'box_details': 'Box A',
      'size': '0',
      'stoneamount': '20',
      'diamondAmount': '20',
      'HallmarkAmount': '35',
      'MakingPerGram': '10',
      'MakingPercentage': '5',
      'MakingFixedAmt': '37',
      'MRP': '5000',
      'imageurl': '',
      'status': 'ApiActive'
    }];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Template');
    XLSX.writeFile(wb, 'Stock_Upload_Template.xlsx');
    
    addNotification({
      type: 'success',
      title: 'Download Started',
      message: 'Excel template downloaded successfully!'
    });
  };

  // Handle Excel file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setBulkUploadFile(file);
    setUploadPreview([]);
    setUploadErrors([]);
    setFieldMappings({});
    setSelectedTemplate('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          setUploadErrors(['No data found in Excel file']);
          return;
        }

        // Extract Excel column names
        const columns = Object.keys(jsonData[0] || {});
        setExcelColumns(columns);
        setRawExcelData(jsonData);

        // Show mapping sidebar
        setShowMappingSidebar(true);

      } catch (error) {
        console.error('Error reading Excel file:', error);
        setUploadErrors(['Error reading Excel file. Please check the format.']);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Apply mappings and process data
  const applyMappings = () => {
    if (Object.keys(fieldMappings).length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please map at least one field before proceeding'
      });
      return;
    }

    const { preview, errors } = processExcelDataWithMappings(rawExcelData, fieldMappings);
    setUploadPreview(preview);
    setUploadErrors(errors);
    
    addNotification({
      type: 'success',
      title: 'Mappings Applied',
      message: `Processed ${preview.length} row(s) with ${errors.length} error(s)`
    });
  };

  // Handle bulk stock upload with progress
  const handleBulkStockUpload = async () => {
    if (Object.keys(fieldMappings).length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please map at least one field before uploading'
      });
      return;
    }

    // Process data with mappings
    const { preview, errors } = processExcelDataWithMappings(rawExcelData, fieldMappings);
    
    if (errors.length > 0) {
      addNotification({
        type: 'error',
        title: 'Validation Errors',
        message: `Please fix ${errors.length} error(s) before uploading`
      });
      setUploadErrors(errors);
      setUploadPreview(preview);
      return;
    }

    if (preview.length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No valid products to upload'
      });
      return;
    }

    // Close sidebar and show progress in main section
    setShowMappingSidebar(false);
    setUploading(true);
    setUploadProgress({ current: 0, total: preview.length, percentage: 0, successCount: 0, errorCount: 0 });
    setBatchErrors([]);
    setServerMessages([]);
    setUploadPreview(preview);
    setUploadErrors([]);

    try {
      // Send in chunks of 50
      const chunkSize = 50;
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < preview.length; i += chunkSize) {
        const chunk = preview.slice(i, i + chunkSize).map(product => {
          // Get branch and counter names (send names as strings, not IDs)
          const branchValue = product.branch_id || sharedData.branch_name || '';
          const counterValue = product.counter_id || sharedData.counter_name || '';

          // Ensure product_id is always a valid string (not null, undefined, or number)
          let productIdValue = product.product_id;
          if (productIdValue === null || productIdValue === undefined) {
            productIdValue = '';
          } else if (typeof productIdValue === 'number') {
            productIdValue = String(productIdValue);
          } else {
            productIdValue = String(productIdValue);
          }

          return {
            client_code: String(product.client_code || userInfo?.ClientCode || ''),
            branch_id: String(branchValue || ''), // Send branch name as string, not ID
            counter_id: String(counterValue || ''), // Send counter name as string, not ID
            RFIDNumber: String(product.RFIDNumber || ''),
            Itemcode: String(product.Itemcode || ''),
            category_id: String(product.category_id || ''), // Send category name as string, not ID
            product_id: productIdValue, // Send product name as string, not ID
            design_id: String(product.design_id || ''), // Send design name as string, not ID
            purity_id: String(product.purity_id || ''), // Send purity name as string, not ID
            grosswt: String(product.grosswt || '0'),
            stonewt: String(product.stonewt || '0'),
            diamondweight: String(product.diamondweight || '0'),
            netwt: String(product.netwt || '0'),
            box_details: String(product.box_details || ''),
            size: Number(product.size) || 0,
            stoneamount: String(product.stoneamount || '0'),
            diamondAmount: String(product.diamondAmount || '0'),
            HallmarkAmount: String(product.HallmarkAmount || '0'),
            MakingPerGram: String(product.MakingPerGram || '0'),
            MakingPercentage: String(product.MakingPercentage || '0'),
            MakingFixedAmt: String(product.MakingFixedAmt || '0'),
            MRP: String(product.MRP || '0'),
            imageurl: String(product.imageurl || ''),
            status: String(product.status || 'ApiActive')
          };
        });

        try {
          const response = await axios.post(
            'https://soni.loyalstring.co.in/api/ProductMaster/SaveRFIDTransactionDetails',
            chunk,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            }
          );

          const batchNumber = Math.floor(i / chunkSize) + 1;
          
          // Check if response contains error message (even on 200 status)
          const responseData = response.data || {};
          let hasError = false;
          let errorMessage = '';
          let errorDetails = {};
          
          // Check for error indicators in response
          if (responseData.message) {
            const msg = String(responseData.message).toLowerCase();
            // Check for error keywords
            if (msg.includes('duplicate') || 
                msg.includes('error') || 
                msg.includes('failed') || 
                msg.includes('invalid') ||
                msg.includes('not found') ||
                msg.includes('already exists')) {
              hasError = true;
              errorMessage = responseData.message;
              errorDetails = responseData;
            }
          }
          
          // Check for error field
          if (responseData.error) {
            hasError = true;
            errorMessage = responseData.error;
            errorDetails = responseData;
          }
          
          // Check for errors object
          if (responseData.errors && Object.keys(responseData.errors).length > 0) {
            hasError = true;
            const errorsObj = responseData.errors;
            const errorMessages = [];
            Object.keys(errorsObj).forEach(key => {
              if (Array.isArray(errorsObj[key])) {
                errorMessages.push(`${key}: ${errorsObj[key].join(', ')}`);
              } else {
                errorMessages.push(`${key}: ${errorsObj[key]}`);
              }
            });
            errorMessage = errorMessages.length > 0 ? errorMessages.join(' | ') : 'Validation errors occurred';
            errorDetails = responseData;
          }
          
          if (hasError) {
            // This is an error, not a success
            errorCount += chunk.length;
            
            // Capture server error message
            setServerMessages(prev => [...prev, {
              type: 'error',
              batch: batchNumber,
              message: errorMessage,
              details: errorDetails,
              timestamp: new Date().toLocaleTimeString()
            }]);
            
            errors.push({
              batch: batchNumber,
              range: `${i + 1}-${Math.min(i + chunk.length, preview.length)}`,
              message: errorMessage,
              details: errorDetails
            });
          } else {
            // This is a success
            successCount += chunk.length;
            
            // Capture server success message
            if (responseData.message) {
              setServerMessages(prev => [...prev, {
                type: 'success',
                batch: batchNumber,
                message: responseData.message,
                timestamp: new Date().toLocaleTimeString()
              }]);
            }
          }
          
          // Update progress
          const current = Math.min(i + chunk.length, preview.length);
          const percentage = Math.round((current / preview.length) * 100);
          setUploadProgress({ 
            current, 
            total: preview.length, 
            percentage, 
            successCount, 
            errorCount 
          });
        } catch (error) {
          errorCount += chunk.length;
          const batchNumber = Math.floor(i / chunkSize) + 1;
          
          // Extract error message from various possible locations
          let errorMessage = '';
          let errorDetails = {};
          
          if (error.response?.data) {
            errorDetails = error.response.data;
            
            // Check for message field
            if (error.response.data.message) {
              errorMessage = error.response.data.message;
            }
            // Check for error field
            else if (error.response.data.error) {
              errorMessage = error.response.data.error;
            }
            // Check for errors object (validation errors)
            else if (error.response.data.errors) {
              const errorsObj = error.response.data.errors;
              const errorMessages = [];
              Object.keys(errorsObj).forEach(key => {
                if (Array.isArray(errorsObj[key])) {
                  errorMessages.push(`${key}: ${errorsObj[key].join(', ')}`);
                } else {
                  errorMessages.push(`${key}: ${errorsObj[key]}`);
                }
              });
              errorMessage = errorMessages.length > 0 ? errorMessages.join(' | ') : 'Validation errors occurred';
            }
            // Check for title field
            else if (error.response.data.title) {
              errorMessage = error.response.data.title;
            }
          }
          
          // Fallback to generic error message
          if (!errorMessage) {
            errorMessage = error.message || 'Unknown error occurred';
          }
          
          // Capture server error message
          setServerMessages(prev => [...prev, {
            type: 'error',
            batch: batchNumber,
            message: errorMessage,
            details: errorDetails,
            timestamp: new Date().toLocaleTimeString()
          }]);
          
          errors.push({
            batch: batchNumber,
            range: `${i + 1}-${Math.min(i + chunk.length, preview.length)}`,
            message: errorMessage,
            details: error.response?.data || {}
          });

          // Update progress even on error
          const current = Math.min(i + chunk.length, preview.length);
          const percentage = Math.round((current / preview.length) * 100);
          setUploadProgress({ 
            current, 
            total: preview.length, 
            percentage, 
            successCount, 
            errorCount 
          });
        }
      }

      setBatchErrors(errors);

      // Final progress update
      setUploadProgress(prev => ({
        ...prev,
        current: preview.length,
        percentage: 100,
        successCount,
        errorCount
      }));

      // Don't auto-close - keep progress section visible
      if (errorCount === 0) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: `${successCount} stock item(s) uploaded successfully!`
        });
        // Keep progress section visible - user can manually clear
        setUploading(false); // Stop uploading state but keep messages visible
      } else if (successCount > 0) {
        addNotification({
          type: 'warning',
          title: 'Partial Success',
          message: `${successCount} items uploaded successfully, ${errorCount} failed. Check server messages for details.`
        });
        setUploading(false); // Stop uploading state but keep messages visible
      } else {
        addNotification({
          type: 'error',
          title: 'Upload Failed',
          message: `All ${errorCount} items failed to upload. Check server messages for details.`
        });
        setUploading(false); // Stop uploading state but keep messages visible
      }
    } catch (error) {
      console.error('Error uploading bulk stock:', error);
      
      // Extract error message
      let errorMessage = 'Failed to upload stock items. Please try again.';
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      // Add error to server messages
      setServerMessages(prev => [...prev, {
        type: 'error',
        batch: 'General',
        message: errorMessage,
        details: error.response?.data || {},
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
      
      // Don't hide uploading state immediately - let user see the error
      // Only hide if it's a network error or critical failure
      if (!error.response) {
        setUploading(false);
      }
    }
  };

  // Submit bulk upload
  const handleSubmitBulk = async () => {
    if (uploadPreview.length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please upload an Excel file first'
      });
      return;
    }

    if (uploadErrors.length > 0) {
      addNotification({
        type: 'error',
        title: 'Validation Errors',
        message: `Please fix ${uploadErrors.length} error(s) before uploading`
      });
      return;
    }

    // Filter out invalid products
    const validProducts = uploadPreview.filter((product, index) => {
      const errors = validateProduct(product, true);
      return errors.length === 0;
    });

    if (validProducts.length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No valid products to upload'
      });
      return;
    }

    setLoading(true);
    try {
      // Send in chunks of 50 to avoid overwhelming the server
      const chunkSize = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < validProducts.length; i += chunkSize) {
        // Match exact API payload structure from documentation
        // Send names directly (not IDs) for branch, counter, category, product, design, and purity
        const chunk = validProducts.slice(i, i + chunkSize).map(product => ({
          client_code: String(product.client_code || userInfo?.ClientCode || ''),
          branch_id: String(product.branch_id || sharedData.branch_name || ''), // Send branch name as string, not ID
          counter_id: String(product.counter_id || sharedData.counter_name || ''), // Send counter name as string, not ID
          RFIDNumber: String(product.RFIDNumber || ''),
          Itemcode: String(product.Itemcode || ''),
          category_id: String(product.category_id || ''),
          product_id: String(product.product_id || ''),
          design_id: String(product.design_id || ''), // Send design name as string, not ID
          purity_id: String(product.purity_id || ''),
          grosswt: String(product.grosswt || '0'),
          stonewt: String(product.stonewt || '0'),
          diamondweight: String(product.diamondweight || '0'),
          netwt: String(product.netwt || '0'),
          box_details: String(product.box_details || ''),
          size: Number(product.size || 0),
          stoneamount: String(product.stoneamount || '0'),
          diamondAmount: String(product.diamondAmount || '0'),
          HallmarkAmount: String(product.HallmarkAmount || '0'),
          MakingPerGram: String(product.MakingPerGram || '0'),
          MakingPercentage: String(product.MakingPercentage || '0'),
          MakingFixedAmt: String(product.MakingFixedAmt || '0'),
          MRP: String(product.MRP || '0'),
          imageurl: String(product.imageurl || ''),
          status: String(product.status || 'ApiActive')
        }));
        try {
          const response = await axios.post(
            'https://soni.loyalstring.co.in/api/ProductMaster/SaveRFIDTransactionDetails',
            chunk,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            }
          );
          successCount += chunk.length;
        } catch (error) {
          console.error(`Error uploading chunk ${i / chunkSize + 1}:`, error);
          errorCount += chunk.length;
        }
      }

      if (errorCount === 0) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: `${successCount} stock item(s) uploaded successfully!`
        });
        setBulkUploadFile(null);
        setUploadPreview([]);
        setUploadErrors([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        addNotification({
          type: 'warning',
          title: 'Partial Success',
          message: `${successCount} items uploaded successfully, ${errorCount} failed`
        });
      }
    } catch (error) {
      console.error('Error uploading bulk stock:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to upload stock items. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Form field configuration
  // Note: RFID Number and Item Code are in Common Information for single product, but in formFields for multiple products
  const formFields = [
    { key: 'RFIDNumber', label: 'RFID Number', type: 'text', required: true, placeholder: 'e.g., CZ3506' },
    { key: 'Itemcode', label: 'Item Code (Must be Unique)', type: 'text', required: true, placeholder: 'e.g., SAU124' },
    { key: 'category_id', label: 'Category', type: 'select', required: true, options: 'categories' },
    { key: 'product_id', label: 'Product', type: 'select', required: true, options: 'products' },
    { key: 'design_id', label: 'Design', type: 'select', required: false, options: 'designs' },
    { key: 'purity_id', label: 'Purity', type: 'select', required: false, options: 'purities' },
    { key: 'grosswt', label: 'Gross Weight', type: 'number', required: false, placeholder: 'e.g., 20.800', step: '0.001' },
    { key: 'stonewt', label: 'Stone Weight', type: 'number', required: false, placeholder: 'e.g., 0.500', step: '0.001' },
    { key: 'diamondweight', label: 'Diamond Weight', type: 'number', required: false, placeholder: 'e.g., 0.250', step: '0.001' },
    { key: 'netwt', label: 'Net Weight', type: 'number', required: false, placeholder: 'Auto-calculated', step: '0.001', readOnly: true },
    { key: 'box_details', label: 'Box Details', type: 'text', required: false, placeholder: 'e.g., Box A' },
    { key: 'size', label: 'Size', type: 'number', required: false, placeholder: 'e.g., 0', step: '1' },
    { key: 'stoneamount', label: 'Stone Amount', type: 'number', required: false, placeholder: 'e.g., 20', step: '0.01' },
    { key: 'diamondAmount', label: 'Diamond Amount', type: 'number', required: false, placeholder: 'e.g., 20', step: '0.01' },
    { key: 'HallmarkAmount', label: 'Hallmark Amount', type: 'number', required: false, placeholder: 'e.g., 35', step: '0.01' },
    { key: 'MakingPerGram', label: 'Making Per Gram', type: 'number', required: false, placeholder: 'e.g., 10', step: '0.01' },
    { key: 'MakingPercentage', label: 'Making Percentage', type: 'number', required: false, placeholder: 'e.g., 5', step: '0.01' },
    { key: 'MakingFixedAmt', label: 'Making Fixed Amount', type: 'number', required: false, placeholder: 'e.g., 37', step: '0.01' },
    { key: 'MRP', label: 'MRP', type: 'number', required: false, placeholder: 'e.g., 5000', step: '0.01' },
    { key: 'imageurl', label: 'Image URL', type: 'text', required: false, placeholder: 'Image URL' },
    { key: 'status', label: 'Status', type: 'select', required: false, options: ['ApiActive'], disabled: true }
  ];

  const renderField = (field, value, onChange, isMultiple = false, index = null) => {
    const fieldId = isMultiple ? `${field.key}_${index}` : field.key;
    
    // Get options for dropdown fields
    let dropdownOptions = [];
    if (field.type === 'select' && typeof field.options === 'string') {
      // Dynamic options from master data
      let dataArray = [];
      if (field.options === 'categories') {
        dataArray = categories;
      } else if (field.options === 'products') {
        dataArray = products;
      } else if (field.options === 'designs') {
        dataArray = designs;
      } else if (field.options === 'purities') {
        dataArray = purities;
      }
      
      // Extract names from data array - specific to each type
      dropdownOptions = dataArray.map(item => {
        if (field.options === 'categories') {
          return item.CategoryName || item.Name || item.Category || item.categoryName || item.name || item.category || '';
        } else if (field.options === 'products') {
          return item.ProductName || item.Name || item.Product || item.productName || item.name || item.product || '';
        } else if (field.options === 'designs') {
          return item.DesignName || item.Name || item.Design || item.designName || item.name || item.design || '';
        } else if (field.options === 'purities') {
          return item.PurityName || item.Name || item.Purity || item.purityName || item.name || item.purity || '';
        }
        return '';
      }).filter(Boolean).sort();
    } else if (Array.isArray(field.options)) {
      dropdownOptions = field.options;
    }
    
    return (
      <div key={field.key} style={{ marginBottom: '8px' }}>
        <label 
          htmlFor={fieldId}
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '3px'
          }}
        >
          {field.label}
          {field.required && <span style={{ color: '#ef4444' }}> *</span>}
        </label>
        {field.type === 'select' ? (
          <SearchableDropdown
            options={dropdownOptions}
            value={field.disabled ? (field.options && field.options[0]) : (value || '')}
            onChange={(val) => !field.disabled && onChange(field.key, val)}
            placeholder={`Select ${field.label}`}
            disabled={field.disabled || (loadingMasterData && typeof field.options === 'string')}
            required={field.required}
          />
        ) : (
          <input
            id={fieldId}
            type={field.type}
            value={value || ''}
            onChange={(e) => !field.readOnly && onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            step={field.step}
            required={field.required}
            readOnly={field.readOnly}
            style={{
              width: '100%',
              padding: '5px 8px',
              fontSize: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              outline: 'none',
              transition: 'all 0.2s',
              boxSizing: 'border-box',
              background: field.readOnly ? '#f1f5f9' : '#ffffff',
              cursor: field.readOnly ? 'not-allowed' : 'text',
              color: field.readOnly ? '#64748b' : '#1e293b',
              height: '28px',
              minHeight: '28px'
            }}
            onFocus={(e) => !field.readOnly && (e.target.style.borderColor = '#3b82f6')}
            onBlur={(e) => !field.readOnly && (e.target.style.borderColor = '#e2e8f0')}
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '16px', fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .product-details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        @media (max-width: 1200px) {
          .product-details-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .product-details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      {/* Header with Toggle Buttons */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Left Side - Title */}
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>Add Stock</h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
            Add new RFID transaction details with complete product information
          </p>
        </div>

        {/* Right Side - Toggle Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveSection(1)}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              background: activeSection === 1 ? '#3b82f6' : '#f1f5f9',
              color: activeSection === 1 ? '#ffffff' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (activeSection !== 1) {
                e.target.style.background = '#e2e8f0';
              }
            }}
            onMouseLeave={(e) => {
              if (activeSection !== 1) {
                e.target.style.background = '#f1f5f9';
              }
            }}
          >
            Add Single Product
          </button>
          <button
            onClick={() => setActiveSection(2)}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              background: activeSection === 2 ? '#3b82f6' : '#f1f5f9',
              color: activeSection === 2 ? '#ffffff' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (activeSection !== 2) {
                e.target.style.background = '#e2e8f0';
              }
            }}
            onMouseLeave={(e) => {
              if (activeSection !== 2) {
                e.target.style.background = '#f1f5f9';
              }
            }}
          >
            Add Multiple Products
          </button>
          <button
            onClick={() => setActiveSection(3)}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              background: activeSection === 3 ? '#3b82f6' : '#f1f5f9',
              color: activeSection === 3 ? '#ffffff' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (activeSection !== 3) {
                e.target.style.background = '#e2e8f0';
              }
            }}
            onMouseLeave={(e) => {
              if (activeSection !== 3) {
                e.target.style.background = '#f1f5f9';
              }
            }}
          >
            Upload Bulk Products (Excel)
          </button>
          {activeSection === 3 && (
            <button
              onClick={downloadExcelTemplate}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid #10b981',
                background: '#ffffff',
                color: '#10b981',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                marginLeft: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#10b981';
                e.target.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#ffffff';
                e.target.style.color = '#10b981';
              }}
            >
              <FaFileExcel /> Download Format
            </button>
          )}
        </div>
      </div>

      {/* Section 1: Add Single Product */}
      {activeSection === 1 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
            Add Single Product
          </h3>

          {/* Shared Fields - Compact */}
          <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
            <h4 style={{ marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
              Common Information
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '6px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  RFID Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={singleProduct.RFIDNumber}
                  onChange={(e) => updateSingleField('RFIDNumber', e.target.value)}
                  placeholder="e.g., CZ3506"
                  required
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Item Code (Must be Unique) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={singleProduct.Itemcode}
                  onChange={(e) => updateSingleField('Itemcode', e.target.value)}
                  placeholder="e.g., SAU124"
                  required
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Branch Name
                </label>
                <SearchableDropdown
                  options={branches.map(branch => branch.BranchName || branch.Name || branch.branchName || branch.name || '').filter(Boolean)}
                  value={sharedData.branch_name}
                  onChange={(value) => setSharedData(prev => ({ ...prev, branch_name: value }))}
                  placeholder="Select Branch"
                  disabled={loadingBranchesCounters}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Counter Name
                </label>
                <SearchableDropdown
                  options={counters.map(counter => counter.CounterName || counter.Name || counter.counterName || counter.name || '').filter(Boolean)}
                  value={sharedData.counter_name}
                  onChange={(value) => setSharedData(prev => ({ ...prev, counter_name: value }))}
                  placeholder="Select Counter"
                  disabled={loadingBranchesCounters}
                />
              </div>
            </div>
          </div>

          {/* Product Details Section */}
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Product Details</h3>
            <div className="product-details-grid">
              {/* Category Field */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Category <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <SearchableDropdown
                  options={categories.map(category => category.CategoryName || category.Name || category.Category || category.categoryName || category.name || category.category || '').filter(Boolean)}
                  value={singleProduct.category_id}
                  onChange={(value) => updateSingleField('category_id', value)}
                  placeholder="Select Category"
                  disabled={loadingMasterData}
                  required={true}
                />
              </div>

              {/* Product Field */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Product <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <SearchableDropdown
                  options={products.map(product => product.ProductName || product.Name || product.Product || product.productName || product.name || product.product || '').filter(Boolean)}
                  value={singleProduct.product_id}
                  onChange={(value) => updateSingleField('product_id', value)}
                  placeholder="Select Product"
                  disabled={loadingMasterData}
                  required={true}
                />
              </div>

              {/* Design Field */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Design
                </label>
                <SearchableDropdown
                  options={designs.map(design => design.DesignName || design.Name || design.Design || design.designName || design.name || design.design || '').filter(Boolean)}
                  value={singleProduct.design_id}
                  onChange={(value) => updateSingleField('design_id', value)}
                  placeholder="Select Design"
                  disabled={loadingMasterData}
                />
              </div>

              {/* Purity Field */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Purity
                </label>
                <SearchableDropdown
                  options={purities.map(purity => purity.PurityName || purity.Name || purity.Purity || purity.purityName || purity.name || purity.purity || '').filter(Boolean)}
                  value={singleProduct.purity_id}
                  onChange={(value) => updateSingleField('purity_id', value)}
                  placeholder="Select Purity"
                  disabled={loadingMasterData}
                />
              </div>
            </div>
          </div>

          {/* Other Product Fields (excluding RFID Number, Item Code, Category, Product, Design, Purity) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '6px', marginBottom: '12px' }}>
            {formFields.filter(field => 
              field.key !== 'RFIDNumber' && 
              field.key !== 'Itemcode' && 
              field.key !== 'category_id' && 
              field.key !== 'product_id' && 
              field.key !== 'design_id' && 
              field.key !== 'purity_id'
            ).map(field => renderField(field, singleProduct[field.key], updateSingleField))}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #e5e7eb' }}>
            <button
              onClick={resetSingleForm}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Reset
            </button>
            <button
              onClick={handleSubmitSingle}
              disabled={loading}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                background: loading ? '#94a3b8' : '#3b82f6',
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <FaSave /> Add Stock
            </button>
          </div>
        </div>
      )}

      {/* Section 2: Add Multiple Products */}
      {activeSection === 2 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
              Add Multiple Products ({multipleProducts.length} {multipleProducts.length === 1 ? 'item' : 'items'})
            </h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {multipleProducts.length > 0 && (
                <button
                  onClick={clearAllProducts}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #ef4444',
                    background: '#ffffff',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#ef4444';
                    e.target.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#ffffff';
                    e.target.style.color = '#ef4444';
                  }}
                >
                  <FaTrash /> Clear All
                </button>
              )}
              {!showTemplateForm && (
                <button
                  onClick={showAddProductForm}
                  style={{
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #3b82f6',
                    background: '#ffffff',
                    color: '#3b82f6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#3b82f6';
                    e.target.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#ffffff';
                    e.target.style.color = '#3b82f6';
                  }}
                >
                  <FaPlus /> Add More Products
                </button>
              )}
            </div>
          </div>

          {/* Common Branch and Counter Selection - At the top */}
            <div style={{
            marginBottom: '12px',
            padding: '12px',
              background: '#f8fafc',
              borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
              Common Information (Applied to All Products)
                </h4>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: '200px', maxWidth: '300px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Branch Name
                    </label>
                <SearchableDropdown
                  options={branches.map(branch => branch.BranchName || branch.Name || branch.branchName || branch.name || '').filter(Boolean)}
                  value={sharedData.branch_name}
                  onChange={(value) => setSharedData(prev => ({ ...prev, branch_name: value }))}
                  placeholder="Select Branch"
                  disabled={loadingBranchesCounters}
                />
                  </div>
              <div style={{ minWidth: '200px', maxWidth: '300px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Counter Name
                </label>
                <SearchableDropdown
                  options={counters.map(counter => counter.CounterName || counter.Name || counter.counterName || counter.name || '').filter(Boolean)}
                  value={sharedData.counter_name}
                  onChange={(value) => setSharedData(prev => ({ ...prev, counter_name: value }))}
                  placeholder="Select Counter"
                  disabled={loadingBranchesCounters}
                />
              </div>
            </div>
          </div>

          {/* Template Form - Show when adding new products */}
          {showTemplateForm && (
            <div style={{
              marginBottom: '16px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '2px dashed #cbd5e1'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                  Add New Product
                </h4>
                  <button
                    onClick={handleAddProducts}
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      background: '#10b981',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#059669';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#10b981';
                    }}
                  >
                  <FaPlus /> Add Product
                  </button>
              </div>

              {/* Product Identification - RFID, Item Code, Quantity */}
              <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #e5e7eb' }}>
                <h5 style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  Product Identification
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                      RFID Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={productTemplate.RFIDNumber}
                      onChange={(e) => updateTemplateField('RFIDNumber', e.target.value)}
                      placeholder="e.g., CZ3506"
                      required
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                        height: '28px',
                        minHeight: '28px'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                      Item Code (Must be Unique) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={productTemplate.Itemcode}
                      onChange={(e) => updateTemplateField('Itemcode', e.target.value)}
                      placeholder="e.g., SAU124"
                      required
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                        height: '28px',
                        minHeight: '28px'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                      Quantity <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={productTemplate.quantity || 1}
                      onChange={(e) => updateTemplateField('quantity', Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                      placeholder="1"
                      required
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                </div>
              </div>

              {/* Product Details Section */}
              <div style={{ marginBottom: '12px' }}>
                <h5 style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  Product Details
                </h5>
                <div className="product-details-grid">
                  {/* Category Field */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                      Category <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <SearchableDropdown
                      options={categories.map(category => category.CategoryName || category.Name || category.Category || category.categoryName || category.name || category.category || '').filter(Boolean)}
                      value={productTemplate.category_id}
                      onChange={(value) => updateTemplateField('category_id', value)}
                      placeholder="Select Category"
                      disabled={loadingMasterData}
                      required={true}
                    />
                  </div>

                  {/* Product Field */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                      Product <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <SearchableDropdown
                      options={products.map(product => product.ProductName || product.Name || product.Product || product.productName || product.name || product.product || '').filter(Boolean)}
                      value={productTemplate.product_id}
                      onChange={(value) => updateTemplateField('product_id', value)}
                      placeholder="Select Product"
                      disabled={loadingMasterData}
                      required={true}
                    />
                  </div>

                  {/* Design Field */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                      Design
                    </label>
                    <SearchableDropdown
                      options={designs.map(design => design.DesignName || design.Name || design.Design || design.designName || design.name || design.design || '').filter(Boolean)}
                      value={productTemplate.design_id}
                      onChange={(value) => updateTemplateField('design_id', value)}
                      placeholder="Select Design"
                      disabled={loadingMasterData}
                    />
                  </div>

                  {/* Purity Field */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                      Purity
                    </label>
                    <SearchableDropdown
                      options={purities.map(purity => purity.PurityName || purity.Name || purity.Purity || purity.purityName || purity.name || purity.purity || '').filter(Boolean)}
                      value={productTemplate.purity_id}
                      onChange={(value) => updateTemplateField('purity_id', value)}
                      placeholder="Select Purity"
                      disabled={loadingMasterData}
                    />
                  </div>
                </div>
              </div>

              {/* Other Product Fields Template (excluding RFID Number, Item Code, Category, Product, Design, Purity) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '6px', marginBottom: '12px' }}>
                {formFields.filter(field => 
                  field.key !== 'RFIDNumber' && 
                  field.key !== 'Itemcode' && 
                  field.key !== 'category_id' && 
                  field.key !== 'product_id' && 
                  field.key !== 'design_id' && 
                  field.key !== 'purity_id'
                ).map(field => renderField(field, productTemplate[field.key], updateTemplateField))}
              </div>
            </div>
          )}

          {/* Product Rows - Show added products */}
          {multipleProducts.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                Added Products ({multipleProducts.length} {multipleProducts.length === 1 ? 'item' : 'items'})
              </h4>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Search Input */}
                  <input
                    type="text"
                    placeholder="Search by RFID, Item Code..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      outline: 'none',
                      width: '250px',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <button
                    onClick={clearAllProducts}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: '1px solid #ef4444',
                      background: '#ffffff',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#ef4444';
                      e.target.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#ffffff';
                      e.target.style.color = '#ef4444';
                    }}
                  >
                    <FaTrash /> Clear All
                  </button>
                </div>
              </div>

              {/* Filtered and Paginated Products */}
              {(() => {
                // Filter products based on search term
                const filteredProducts = multipleProducts.filter(product => {
                  if (!searchTerm) return true;
                  const search = searchTerm.toLowerCase();
                  return (
                    (product.RFIDNumber || '').toLowerCase().includes(search) ||
                    (product.Itemcode || '').toLowerCase().includes(search) ||
                    (product.category_id || '').toLowerCase().includes(search) ||
                    (product.product_id || '').toLowerCase().includes(search)
                  );
                });

                // Calculate pagination
                const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
                const startIndex = (currentPage - 1) * productsPerPage;
                const endIndex = startIndex + productsPerPage;
                const currentProducts = filteredProducts.slice(startIndex, endIndex);

                return (
                  <>
                    {filteredProducts.length === 0 ? (
                      <div style={{
                        padding: '40px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px dashed #cbd5e1'
                      }}>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                          No products found matching "{searchTerm}"
                        </p>
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom: '16px' }}>
                          {currentProducts.map((product, displayIndex) => {
                            const actualIndex = multipleProducts.indexOf(product);
                            const isExpanded = expandedProducts.has(actualIndex);
                            
                            return (
                              <div
                                key={actualIndex}
                style={{
                                  marginBottom: '16px',
                                  padding: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                                  background: actualIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                                  position: 'relative',
                                  transition: 'all 0.2s'
                }}
              >
                                {/* Compact Header - Always Visible */}
                                <div 
                                  style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    const newExpanded = new Set(expandedProducts);
                                    if (isExpanded) {
                                      newExpanded.delete(actualIndex);
                                    } else {
                                      newExpanded.add(actualIndex);
                                    }
                                    setExpandedProducts(newExpanded);
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                                      Product {actualIndex + 1}
                  </h4>
                                    <div style={{ 
                                      display: 'flex', 
                                      gap: '12px', 
                                      flexWrap: 'wrap',
                                      padding: '6px 12px',
                                      background: '#f1f5f9',
                                      borderRadius: '6px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>RFID:</span>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{product.RFIDNumber || 'N/A'}</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Item:</span>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{product.Itemcode || 'N/A'}</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Qty:</span>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>{product.quantity || 1}</span>
                                      </div>
                                      {(product.category_id || product.product_id) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>
                                            {product.category_id || ''} / {product.product_id || ''}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ 
                                      fontSize: '12px', 
                                      color: '#64748b',
                                      marginRight: '8px'
                                    }}>
                                      {isExpanded ? '▼' : '▶'}
                                    </span>
                  {multipleProducts.length > 1 && (
                    <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeProductRow(actualIndex);
                                        }}
                      style={{
                                          padding: '4px 8px',
                                          fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid #ef4444',
                        background: '#ffffff',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                                          gap: '4px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#ef4444';
                        e.target.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#ffffff';
                        e.target.style.color = '#ef4444';
                      }}
                    >
                                        <FaTrash style={{ fontSize: '10px' }} /> Remove
                    </button>
                  )}
                </div>
                </div>

                                {/* Expanded Content - Show when clicked */}
                                {isExpanded && (
                                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                    {/* Product Identification */}
                                    <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                      <h5 style={{ marginBottom: '10px', fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                                        Product Identification
                                      </h5>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                                        <div>
                                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                            RFID Number <span style={{ color: '#ef4444' }}>*</span>
                                          </label>
                                          <input
                                            type="text"
                                            value={product.RFIDNumber || ''}
                                            onChange={(e) => updateMultipleField(actualIndex, 'RFIDNumber', e.target.value)}
                                            placeholder="e.g., CZ3506"
                                            required
                                            style={{
                                              width: '100%',
                                              padding: '6px 8px',
                                              fontSize: '12px',
                                              border: '1px solid #e2e8f0',
                                              borderRadius: '6px',
                                              outline: 'none',
                                              transition: 'all 0.2s',
                                              boxSizing: 'border-box'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                          />
              </div>
                                        <div>
                                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                            Item Code <span style={{ color: '#ef4444' }}>*</span>
                                          </label>
                                          <input
                                            type="text"
                                            value={product.Itemcode || ''}
                                            onChange={(e) => updateMultipleField(actualIndex, 'Itemcode', e.target.value)}
                                            placeholder="e.g., SAU124"
                                            required
                                            style={{
                                              width: '100%',
                                              padding: '6px 8px',
                                              fontSize: '12px',
                                              border: '1px solid #e2e8f0',
                                              borderRadius: '6px',
                                              outline: 'none',
                                              transition: 'all 0.2s',
                                              boxSizing: 'border-box'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                          />
                                        </div>
                                        <div>
                                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                            Quantity <span style={{ color: '#ef4444' }}>*</span>
                                          </label>
                                          <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={product.quantity || 1}
                                            onChange={(e) => updateMultipleField(actualIndex, 'quantity', Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                            placeholder="1"
                                            required
                                            style={{
                                              width: '100%',
                                              padding: '6px 8px',
                                              fontSize: '12px',
                                              border: '1px solid #e2e8f0',
                                              borderRadius: '6px',
                                              outline: 'none',
                                              transition: 'all 0.2s',
                                              boxSizing: 'border-box'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Product Details Section */}
                                    <div style={{ marginBottom: '16px' }}>
                                      <h5 style={{ marginBottom: '10px', fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                                        Product Details
                                      </h5>
                                      <div className="product-details-grid">
                                        {/* Category Field */}
                                        <div>
                                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                            Category <span style={{ color: '#ef4444' }}>*</span>
                                          </label>
                                          <SearchableDropdown
                                            options={categories.map(category => category.CategoryName || category.Name || category.Category || category.categoryName || category.name || category.category || '').filter(Boolean)}
                                            value={product.category_id || ''}
                                            onChange={(value) => updateMultipleField(actualIndex, 'category_id', value)}
                                            placeholder="Select Category"
                                            disabled={loadingMasterData}
                                            required={true}
                                          />
                                        </div>

                                        {/* Product Field */}
                                        <div>
                                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                            Product <span style={{ color: '#ef4444' }}>*</span>
                                          </label>
                                          <SearchableDropdown
                                            options={products.map(product => product.ProductName || product.Name || product.Product || product.productName || product.name || product.product || '').filter(Boolean)}
                                            value={product.product_id || ''}
                                            onChange={(value) => updateMultipleField(actualIndex, 'product_id', value)}
                                            placeholder="Select Product"
                                            disabled={loadingMasterData}
                                            required={true}
                                          />
                                        </div>

                                        {/* Design Field */}
                                        <div>
                                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                            Design
                                          </label>
                                          <SearchableDropdown
                                            options={designs.map(design => design.DesignName || design.Name || design.Design || design.designName || design.name || design.design || '').filter(Boolean)}
                                            value={product.design_id || ''}
                                            onChange={(value) => updateMultipleField(actualIndex, 'design_id', value)}
                                            placeholder="Select Design"
                                            disabled={loadingMasterData}
                                          />
                                        </div>

                                        {/* Purity Field */}
                                        <div>
                                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                            Purity
                                          </label>
                                          <SearchableDropdown
                                            options={purities.map(purity => purity.PurityName || purity.Name || purity.Purity || purity.purityName || purity.name || purity.purity || '').filter(Boolean)}
                                            value={product.purity_id || ''}
                                            onChange={(value) => updateMultipleField(actualIndex, 'purity_id', value)}
                                            placeholder="Select Purity"
                                            disabled={loadingMasterData}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Other Product Fields */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                      {formFields.filter(field => 
                                        field.key !== 'category_id' && 
                                        field.key !== 'product_id' && 
                                        field.key !== 'design_id' && 
                                        field.key !== 'purity_id'
                                      ).map(field => renderField(field, product[field.key], (fieldKey, value) => updateMultipleField(actualIndex, fieldKey, value), true, actualIndex))}
              </div>
            </div>
          )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '20px',
                            padding: '12px',
                            background: '#f8fafc',
                            borderRadius: '8px'
                          }}>
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                background: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                                color: currentPage === 1 ? '#94a3b8' : '#1e293b',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Previous
                            </button>
                            <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                              Page {currentPage} of {totalPages} ({filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'})
                            </span>
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                background: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                                color: currentPage === totalPages ? '#94a3b8' : '#1e293b',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}
                

          {/* Submit Button */}
          {multipleProducts.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #e5e7eb' }}>
              <button
                onClick={handleSubmitMultiple}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  background: loading ? '#94a3b8' : '#3b82f6',
                  color: '#ffffff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <FaSave /> Add All Products ({multipleProducts.length})
              </button>
            </div>
          )}

          {/* Empty State */}
          {multipleProducts.length === 0 && !showTemplateForm && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#64748b'
            }}>
              <FaPlus style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No products added yet</p>
              <p style={{ fontSize: '14px', marginBottom: '24px' }}>Fill the form above and click "Add Product" to create product entries</p>
              <button
                onClick={showAddProductForm}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  background: '#3b82f6',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#3b82f6';
                }}
              >
                <FaPlus /> Add Products
              </button>
            </div>
          )}
        </div>
      )}

      {/* Section 3: Bulk Upload with Excel */}
      {activeSection === 3 && (
        <div style={{ position: 'relative' }}>
          {/* Main Content */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            marginRight: showMappingSidebar && windowWidth > 768 ? '500px' : '0',
            transition: 'margin-right 0.3s ease'
          }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
            Upload Bulk Products with Excel
          </h3>

          <div style={{ marginBottom: '32px', padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              Instructions:
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#64748b', lineHeight: '1.8' }}>
              <li>Download the Excel template using the "Download Format" button above</li>
              <li>Fill in all required fields (marked with *): RFID Number, Item Code, Category, Product</li>
              <li>Ensure data matches the template format exactly</li>
              <li>Upload the completed Excel file below</li>
              <li>Review the preview and fix any errors before submitting</li>
            </ul>
          </div>

          {/* File Upload */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                Select Excel File
              </label>
              <button
                onClick={() => {
                  if (excelColumns.length > 0 || bulkUploadFile) {
                    setShowMappingSidebar(true);
                  } else {
                    addNotification({
                      type: 'info',
                      title: 'Info',
                      message: 'Please upload an Excel file first to map columns'
                    });
                  }
                }}
                disabled={!bulkUploadFile && excelColumns.length === 0}
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #10b981',
                  background: (!bulkUploadFile && excelColumns.length === 0) ? '#f1f5f9' : '#ffffff',
                  color: (!bulkUploadFile && excelColumns.length === 0) ? '#94a3b8' : '#10b981',
                  cursor: (!bulkUploadFile && excelColumns.length === 0) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (bulkUploadFile || excelColumns.length > 0) {
                    e.target.style.background = '#10b981';
                    e.target.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (bulkUploadFile || excelColumns.length > 0) {
                    e.target.style.background = '#ffffff';
                    e.target.style.color = '#10b981';
                  }
                }}
              >
                <FaMap /> Map Columns
              </button>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #3b82f6',
                  background: '#ffffff',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#3b82f6';
                  e.target.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ffffff';
                  e.target.style.color = '#3b82f6';
                }}
              >
                <FaUpload /> Choose File
              </button>
              {bulkUploadFile && (
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {bulkUploadFile.name}
                </span>
              )}
            </div>
          </div>

          {/* Errors */}
          {uploadErrors.length > 0 && (
            <div style={{ marginBottom: '24px', padding: '16px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <FaExclamationTriangle style={{ color: '#ef4444' }} />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#991b1b' }}>
                  Validation Errors ({uploadErrors.length})
                </h4>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#991b1b' }}>
                {uploadErrors.map((error, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Upload Progress - Main Section - Show when uploading OR when there are messages */}
          {(uploading || serverMessages.length > 0) && (
            <div style={{
              marginBottom: '24px',
              padding: '24px',
              background: '#ffffff',
              borderRadius: '12px',
              border: uploadProgress.errorCount > 0 ? '2px solid #ef4444' : uploadProgress.successCount > 0 && uploadProgress.errorCount === 0 ? '2px solid #10b981' : '2px solid #e5e7eb',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: '16px', 
                    fontWeight: 600, 
                    color: uploadProgress.errorCount > 0 ? '#dc2626' : uploadProgress.successCount > 0 && uploadProgress.errorCount === 0 ? '#059669' : '#1e293b'
                  }}>
                    {uploading ? 'Uploading Products...' : uploadProgress.errorCount > 0 ? 'Upload Completed with Errors' : 'Upload Completed Successfully'}
                  </h4>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {uploadProgress.successCount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaCheckCircle style={{ color: '#10b981', fontSize: '16px' }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                          {uploadProgress.successCount} Success
                        </span>
                      </div>
                    )}
                    {uploadProgress.errorCount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaTimesCircle style={{ color: '#ef4444', fontSize: '16px' }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>
                          {uploadProgress.errorCount} Failed
                        </span>
                      </div>
                    )}
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      color: uploadProgress.errorCount > 0 ? '#ef4444' : '#3b82f6'
                    }}>
                      {uploadProgress.current} / {uploadProgress.total} ({uploadProgress.percentage}%)
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  height: '32px',
                  background: '#e2e8f0',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: `${uploadProgress.percentage}%`,
                    height: '100%',
                    background: uploadProgress.errorCount > 0 
                      ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)' 
                      : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                    borderRadius: '16px',
                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {uploadProgress.percentage > 20 && (
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                        {uploadProgress.percentage}%
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Progress Stats */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '12px',
                  color: '#64748b'
                }}>
                  <span>Processing: {uploadProgress.current} of {uploadProgress.total} products</span>
                  <span>Remaining: {uploadProgress.total - uploadProgress.current} products</span>
                </div>
              </div>

              {/* Server Messages - Always show if there are messages */}
              {serverMessages.length > 0 && (
                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                        Server Messages ({serverMessages.length})
                      </span>
                      {serverMessages.filter(m => m.type === 'error').length > 0 && (
                        <span style={{ 
                          fontSize: '12px', 
                          padding: '2px 8px',
                          background: '#fef2f2',
                          color: '#dc2626',
                          borderRadius: '12px',
                          fontWeight: 600
                        }}>
                          {serverMessages.filter(m => m.type === 'error').length} Error(s)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setServerMessages([]);
                        setBatchErrors([]);
                        setUploading(false);
                        setUploadProgress({ current: 0, total: 0, percentage: 0, successCount: 0, errorCount: 0 });
                      }}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        background: '#e5e7eb',
                        color: '#475569',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#cbd5e1';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#e5e7eb';
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {serverMessages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        style={{
                          padding: '12px',
                          background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4',
                          borderRadius: '8px',
                          border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
                          borderLeft: `4px solid ${msg.type === 'error' ? '#ef4444' : '#10b981'}`
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          marginBottom: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {msg.type === 'error' ? (
                              <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '14px' }} />
                            ) : (
                              <FaCheckCircle style={{ color: '#10b981', fontSize: '14px' }} />
                            )}
                            <span style={{ 
                              fontSize: '12px', 
                              fontWeight: 600, 
                              color: msg.type === 'error' ? '#991b1b' : '#166534'
                            }}>
                              Batch {msg.batch}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {msg.timestamp}
                          </span>
                        </div>
                        <div style={{ 
                          fontSize: '13px', 
                          color: msg.type === 'error' ? '#dc2626' : '#166534',
                          paddingLeft: '22px',
                          lineHeight: '1.6',
                          wordBreak: 'break-word'
                        }}>
                          {msg.message}
                        </div>
                        {msg.details && msg.details.errors && Object.keys(msg.details.errors).length > 0 && (
                          <div style={{ 
                            marginTop: '8px',
                            padding: '10px',
                            background: '#ffffff',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#991b1b',
                            paddingLeft: '22px',
                            maxHeight: '120px',
                            overflowY: 'auto',
                            border: '1px solid #fecaca'
                          }}>
                            <div style={{ fontWeight: 600, marginBottom: '6px', color: '#dc2626' }}>Error Details:</div>
                            {Object.entries(msg.details.errors).map(([key, value], errIdx) => (
                              <div key={errIdx} style={{ marginBottom: '6px', lineHeight: '1.5' }}>
                                <strong style={{ color: '#991b1b' }}>{key}:</strong> {Array.isArray(value) ? value.join(', ') : String(value)}
                              </div>
                            ))}
                          </div>
                        )}
                        {msg.details && msg.details.status && (
                          <div style={{ 
                            marginTop: '6px',
                            fontSize: '11px',
                            color: '#64748b',
                            paddingLeft: '22px',
                            fontStyle: 'italic'
                          }}>
                            Status: {msg.details.status}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #e5e7eb' }}>
            <button
              onClick={handleSubmitBulk}
              disabled={loading || uploadPreview.length === 0 || uploadErrors.length > 0 || uploading}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: (loading || uploadPreview.length === 0 || uploadErrors.length > 0 || uploading) ? '#94a3b8' : '#3b82f6',
                color: '#ffffff',
                cursor: (loading || uploadPreview.length === 0 || uploadErrors.length > 0 || uploading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <FaUpload /> Upload Products ({uploadPreview.length > 0 ? uploadPreview.length - uploadErrors.length : 0} valid)
            </button>
          </div>
          </div>

          {/* Mapping Sidebar */}
          {showMappingSidebar && (
            <div style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: windowWidth <= 768 ? '100%' : windowWidth <= 1024 ? '450px' : '500px',
              maxWidth: '90vw',
              height: '100vh',
              background: '#ffffff',
              boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* Sidebar Header */}
              <div style={{
                padding: windowWidth <= 768 ? '16px' : '20px',
                borderBottom: '1px solid #e5e7eb',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                  Map Excel Columns
                </h3>
                <button
                  onClick={() => setShowMappingSidebar(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e2e8f0';
                    e.target.style.color = '#1e293b';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'none';
                    e.target.style.color = '#64748b';
                  }}
                >
                  ×
                </button>
              </div>

              {/* Sidebar Content */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: windowWidth <= 768 ? '16px' : '20px',
                paddingBottom: '20px'
              }}>
                {/* Template Selection - At Top */}
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    Select Template (Optional)
                  </h4>
                  {templates.length > 0 ? (
                    <div style={{ marginBottom: '16px' }}>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => {
                          const templateId = e.target.value;
                          setSelectedTemplate(templateId);
                          if (templateId) {
                            // Auto-apply template when selected
                            const template = templates.find(t => 
                              (t.Id || t.id || t.TemplateId || t.templateId) == templateId
                            );
                            if (template) {
                              try {
                                let templateData = {};
                                
                                // Handle double-encoded JSON string
                                if (typeof template.TemplateData === 'string') {
                                  try {
                                    // First parse to get the string
                                    const firstParse = JSON.parse(template.TemplateData);
                                    // If it's still a string, parse again
                                    if (typeof firstParse === 'string') {
                                      templateData = JSON.parse(firstParse);
                                    } else {
                                      templateData = firstParse;
                                    }
                                  } catch (e) {
                                    // If single parse fails, try direct parse
                                    templateData = JSON.parse(template.TemplateData);
                                  }
                                } else {
                                  templateData = template.TemplateData || template.Template || {};
                                }
                                
                                setFieldMappings(templateData);
                                addNotification({
                                  type: 'success',
                                  title: 'Template Applied',
                                  message: 'Template mappings applied successfully!'
                                });
                              } catch (error) {
                                console.error('Error parsing template:', error);
                                addNotification({
                                  type: 'error',
                                  title: 'Error',
                                  message: 'Failed to apply template'
                                });
                              }
                            }
                          } else {
                            // Clear mappings if no template selected
                            setFieldMappings({});
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '13px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          outline: 'none',
                          background: '#ffffff',
                          cursor: 'pointer',
                          marginBottom: '12px'
                        }}
                      >
                        <option value="">Select Template</option>
                        {templates.map((template, idx) => {
                          const templateId = template.Id || template.id || template.TemplateId || template.templateId || idx;
                          const templateName = template.TemplateName || template.templateName || template.Name || template.name || `Template ${idx + 1}`;
                          return (
                            <option key={idx} value={templateId}>{templateName}</option>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                      No templates saved yet
                    </p>
                  )}

                  {/* Save Template */}
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      Save Current Mapping as Template
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Enter template name"
                        style={{
                          flex: 1,
                          minWidth: '120px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                      <button
                        onClick={saveTemplate}
                        disabled={savingTemplate || !templateName.trim()}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          border: 'none',
                          background: (savingTemplate || !templateName.trim()) ? '#94a3b8' : '#3b82f6',
                          color: '#ffffff',
                          cursor: (savingTemplate || !templateName.trim()) ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {savingTemplate ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Field Mappings - 3 fields per row */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    Map Fields (Excluding Status)
                  </h4>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: windowWidth <= 480 ? 'repeat(1, 1fr)' : windowWidth <= 768 ? 'repeat(2, 1fr)' : windowWidth <= 1024 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
                    gap: '12px'
                  }}>
                    {formFields.filter(field => field.key !== 'status').map(field => {
                      const selectedValue = fieldMappings[field.key] || '';
                      const usedColumns = Object.values(fieldMappings).filter(Boolean);
                      const isMapped = !!selectedValue;
                      
                      return (
                        <div key={field.key} style={{
                          padding: '10px',
                          background: isMapped ? '#dbeafe' : '#f8fafc',
                          borderRadius: '8px',
                          border: isMapped ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                          transition: 'all 0.2s ease'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#475569',
                            marginBottom: '6px'
                          }}>
                            {field.label}
                            {field.required && <span style={{ color: '#ef4444' }}> *</span>}
                          </label>
                          <select
                            value={selectedValue}
                            onChange={(e) => {
                              const newValue = e.target.value || undefined;
                              setFieldMappings(prev => {
                                const updated = { ...prev };
                                if (newValue) {
                                  updated[field.key] = newValue;
                                } else {
                                  delete updated[field.key];
                                }
                                return updated;
                              });
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              fontSize: '12px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              outline: 'none',
                              background: '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                          >
                            <option value="">-- Select --</option>
                            {excelColumns.map((column, idx) => {
                              const isSelected = selectedValue === column;
                              const isUsedByOther = usedColumns.includes(column) && !isSelected;
                              
                              return (
                                <option
                                  key={idx}
                                  value={column}
                                  disabled={isUsedByOther}
                                  style={{
                                    backgroundColor: isSelected ? '#e3f2fd' : 'white',
                                    color: isUsedByOther ? '#94a3b8' : '#1e293b'
                                  }}
                                >
                                  {column} {isSelected ? '✓' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>


              {/* Sidebar Footer */}
              <div style={{
                padding: windowWidth <= 768 ? '16px' : '20px',
                borderTop: '1px solid #e5e7eb',
                background: '#f8fafc',
                display: 'flex',
                gap: '12px',
                flexShrink: 0
              }}>
                <button
                  onClick={() => {
                    if (!uploading) {
                      setShowMappingSidebar(false);
                      setFieldMappings({});
                      setSelectedTemplate('');
                      setBatchErrors([]);
                      setUploadProgress({ current: 0, total: 0, percentage: 0 });
                    }
                  }}
                  disabled={uploading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: uploading ? '#f1f5f9' : '#ffffff',
                    color: uploading ? '#94a3b8' : '#64748b',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading) {
                      e.target.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!uploading) {
                      e.target.style.background = '#ffffff';
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkStockUpload}
                  disabled={uploading || Object.keys(fieldMappings).length === 0}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: 'none',
                    background: (uploading || Object.keys(fieldMappings).length === 0) ? '#94a3b8' : '#10b981',
                    color: '#ffffff',
                    cursor: (uploading || Object.keys(fieldMappings).length === 0) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading && Object.keys(fieldMappings).length > 0) {
                      e.target.style.background = '#059669';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!uploading && Object.keys(fieldMappings).length > 0) {
                      e.target.style.background = '#10b981';
                    }
                  }}
                >
                  {uploading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #ffffff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaUpload /> Add Bulk Stock
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Overlay for mobile */}
          {showMappingSidebar && windowWidth <= 768 && (
            <div
              onClick={() => setShowMappingSidebar(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 999
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default AddStock;

