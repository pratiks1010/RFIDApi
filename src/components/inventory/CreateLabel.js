import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { 
  FaSave, 
  FaPrint, 
  FaTrash, 
  FaPlus,
  FaSearch,
  FaTimes,
  FaEdit,
  FaUndo,
  FaRedo,
  FaExpand,
  FaCompress
} from 'react-icons/fa';
import { useLoading } from '../../App';
import { useNotifications } from '../../context/NotificationContext';
import LabelToolbox from './label/LabelToolbox';
import LabelCanvasArea from './label/LabelCanvasArea';
import LabelPropertiesPanel from './label/LabelPropertiesPanel';

// Create a separate axios instance for FormData requests to avoid global interceptor conflicts
const formDataAxios = axios.create();
formDataAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // For FormData, let axios set Content-Type automatically with boundary
    if (config.data instanceof FormData) {
      // Explicitly delete Content-Type to let axios set it with boundary
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const CreateLabel = () => {
  const { loading, setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const [userInfo, setUserInfo] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Label Layout State
  const [labelLayout, setLabelLayout] = useState({
    page: {
      width: 270, // 27mm = 270px (1mm = 10px for canvas display)
      height: 140, // 14mm = 140px
    },
    elements: [],
  });

  // Template Management
  const [showSavePopup, setShowSavePopup] = useState(false);
  const [saveOption, setSaveOption] = useState('single'); // 'single', 'category', 'categoryProduct'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateNameInput, setTemplateNameInput] = useState('');

  // Master Data
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingMasterData, setLoadingMasterData] = useState(false);

  // Sample Label Data for Preview
  const [labelData, setLabelData] = useState({
    Id: 1,
    ItemCode: 'STFM1',
    ProductTitle: 'FANCY MALA',
    GrossWt: '13.66',
    NetWt: '7.460',
    TotalStoneWeight: '6.2',
    Size: '18',
    RFIDCode: 'MJ0010',
    ProductName: 'Fancy Mala',
    CategoryName: 'GOLD',
    PurityName: '22CT',
    DesignName: 'Stone Fancymala',
    BranchName: 'MUNDLIK JEWELLERS',
    MRP: '50000.00'
  });

  // Initialize user info
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsed = JSON.parse(storedUserInfo);
        setUserInfo(parsed);
      } catch (err) {
        console.error('Error parsing user info:', err);
      }
    }
  }, []);

  // Fetch master data
  useEffect(() => {
    if (userInfo?.ClientCode) {
      fetchMasterData();
      fetchSavedTemplates();
      initializeDefaultElements();
    }
  }, [userInfo?.ClientCode]);

  // Fetch Categories and Products
  const fetchMasterData = async () => {
    if (!userInfo?.ClientCode) return;
    
    setLoadingMasterData(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const requestBody = { ClientCode: userInfo.ClientCode };

      const [categoriesResponse, productsResponse] = await Promise.all([
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllCategory', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllProductMaster', requestBody, { headers })
      ]);

      const normalizeArray = (data) => {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
          return data.data || data.items || data.results || data.list || [];
        }
        return [];
      };

      setCategories(normalizeArray(categoriesResponse.data));
      setProducts(normalizeArray(productsResponse.data));
    } catch (error) {
      console.error('Error fetching master data:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load categories and products. Please refresh the page.'
      });
    } finally {
      setLoadingMasterData(false);
    }
  };

  // Format categories and products for dropdowns
  const categoryList = useMemo(() => {
    return categories.map((item) => ({
      value: item.Id || item.id || item.CategoryId,
      label: item.CategoryName || item.Name || item.Category || item.categoryName || item.name || item.category || ''
    })).filter(item => item.value && item.label);
  }, [categories]);

  const productList = useMemo(() => {
    return products.map((item) => ({
      value: item.Id || item.id || item.ProductId,
      label: item.ProductName || item.Name || item.Product || item.productName || item.name || item.product || ''
    })).filter(item => item.value && item.label);
  }, [products]);

  // Fetch saved label templates
  const fetchSavedTemplates = async () => {
    if (!userInfo?.ClientCode) return;
    
    try {
      setTemplatesLoading(true);
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const requestBody = { ClientCode: userInfo.ClientCode };

      // Use LabelTemplates API (matching backend)
      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/LabelTemplates/GetAllLabelTemplates',
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

      setSavedTemplates(normalizeArray(response.data));
    } catch (error) {
      console.error('Error fetching saved templates:', error);
      setSavedTemplates([]);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to load saved templates.'
      });
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (templateId, templateName) => {
    if (!window.confirm(`Are you sure you want to delete template "${templateName}"?`)) {
      return;
    }

    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const requestBody = {
        ClientCode: userInfo.ClientCode,
        LabelTemplateId: templateId
      };

      // Use LabelTemplates API (matching backend)
      await axios.post(
        'https://rrgold.loyalstring.co.in/api/LabelTemplates/DeleteLabelTemplate',
        requestBody,
        { headers }
      );

      // If we're currently editing this template, reset the form
      if (editingTemplateId === templateId) {
        handleNewTemplate();
      }

      // Refresh templates list
      await fetchSavedTemplates();

      addNotification({
        type: 'success',
        title: 'Success',
        message: `Template "${templateName}" deleted successfully!`
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.Message || 
                          'Failed to delete template.';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  };

  // Reset to new template mode
  const handleNewTemplate = () => {
    setIsEditingTemplate(false);
    setEditingTemplateId(null);
    setSelectedTemplate(null);
    setSaveOption('single');
    setSelectedCategory(null);
    setSelectedProduct(null);
    setSelectedElement(null);
    setZoomLevel(1);
    setTemplateNameInput('');
    initializeDefaultElements();
  };

  // Template options for dropdown
  const templateOptions = useMemo(() => {
    const options = savedTemplates.map((template) => ({
      value: template.Id || template.id || template.LabelTemplateId,
      label: template.TemplateName || template.Name || 'Unnamed Template',
      template: template,
    }));
    console.log('Template options:', options);
    return options;
  }, [savedTemplates]);

  // Load selected template
  const handleTemplateSelect = (selectedOption) => {
    setSelectedTemplate(selectedOption);

    if (selectedOption && selectedOption.template) {
      const template = selectedOption.template;

      // Load template layout - handle different formats from backend
      let layout = null;
      try {
        // Try Layout first (most common)
        if (template.Layout) {
          if (typeof template.Layout === 'string') {
            layout = JSON.parse(template.Layout);
          } else if (typeof template.Layout === 'object') {
            // Check if it's a JsonDocument structure
            if (template.Layout.root) {
              layout = template.Layout.root;
            } else if (template.Layout.RootElement) {
              layout = template.Layout.RootElement;
            } else {
              // Direct object
              layout = template.Layout;
            }
          }
        } 
        // Fallback to LayoutJson
        else if (template.LayoutJson) {
          if (typeof template.LayoutJson === 'string') {
            layout = JSON.parse(template.LayoutJson);
          } else {
            layout = template.LayoutJson;
          }
        } 
        // Fallback to TemplateData
        else if (template.TemplateData) {
          if (typeof template.TemplateData === 'string') {
            layout = JSON.parse(template.TemplateData);
          } else {
            layout = template.TemplateData;
          }
        }

        // Validate and set layout
        if (layout && typeof layout === 'object') {
          // Ensure layout has required structure
          if (!layout.page) {
            layout.page = { width: 270, height: 140 };
          }
          if (!layout.elements || !Array.isArray(layout.elements)) {
            layout.elements = [];
          }
          
          // Validate and normalize elements
          layout.elements = layout.elements.map((element, index) => {
            // Ensure each element has required properties
            if (!element.id) {
              element.id = `${element.type || 'element'}_${Date.now()}_${index}`;
            }
            if (!element.type) {
              element.type = 'text';
            }
            if (typeof element.x !== 'number') element.x = element.x || 10;
            if (typeof element.y !== 'number') element.y = element.y || 10;
            if (typeof element.width !== 'number') element.width = element.width || 100;
            if (typeof element.height !== 'number') element.height = element.height || 30;
            if (!element.zIndex) element.zIndex = 10;
            
            return element;
          });
          
          // Set the layout to display in canvas
          setLabelLayout(layout);
          
          // Clear selected element to avoid confusion
          setSelectedElement(null);
          
          // Show success notification
          addNotification({
            type: 'success',
            title: 'Template Loaded',
            message: `Template "${template.TemplateName || 'Unnamed'}" loaded successfully! ${layout.elements.length} elements loaded.`
          });
        } else {
          throw new Error('Invalid layout structure');
        }
      } catch (error) {
        console.error('Error parsing template layout:', error, template);
        addNotification({
          type: 'error',
          title: 'Error',
          message: `Failed to load template layout: ${error.message}. Using default layout.`
        });
        initializeDefaultElements();
      }

      // Set editing mode
      setIsEditingTemplate(true);
      setEditingTemplateId(template.Id || template.id || template.LabelTemplateId);
      
      // Set template name input
      setTemplateNameInput(template.TemplateName || '');

      // Update save option and selections to match template
      setSaveOption(template.SaveOption || 'single');
      if (template.CategoryId) {
        const category = categoryList.find(cat => cat.value === template.CategoryId);
        setSelectedCategory(category || null);
      } else {
        setSelectedCategory(null);
      }
      if (template.ProductId) {
        const product = productList.find(prod => prod.value === template.ProductId);
        setSelectedProduct(product || null);
      } else {
        setSelectedProduct(null);
      }
    } else {
      // Reset editing mode when no template selected
      setIsEditingTemplate(false);
      setEditingTemplateId(null);
      setTemplateNameInput('');
    }
  };

  // Element Management
  const handleAddElement = (element) => {
    const newElement = {
      ...element,
      id: `${element.type}_${Date.now()}`,
      x: element.x || 10,
      y: element.y || 10,
      width: element.width || 100,
      height: element.height || 30,
      zIndex: element.zIndex || 10,
    };

    setLabelLayout((prev) => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));
  };

  const handleUpdateElement = (id, updates) => {
    setLabelLayout((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));

    // Update selectedElement if it's the one being updated
    if (selectedElement && selectedElement.id === id) {
      setSelectedElement((prev) => ({ ...prev, ...updates }));
    }
  };

  const handleRemoveElement = (id) => {
    setLabelLayout((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id),
    }));
    if (selectedElement?.id === id) {
      setSelectedElement(null);
    }
  };

  const handleLayoutChange = (newLayout) => {
    setLabelLayout(newLayout);
  };

  // Initialize default label elements
  const initializeDefaultElements = () => {
    const currentWidth = labelLayout.page.width;
    const centerX = currentWidth / 2;

    const defaultElements = [
      // Left side elements
      {
        type: 'text',
        id: 'gw_text',
        x: 5,
        y: 5,
        width: 100,
        height: 20,
        label: 'GW',
        binding: 'GrossWt',
        fontSize: 17,
        fontWeight: 'bold',
        color: '#000000',
        zIndex: 10,
      },
      {
        type: 'text',
        id: 'nw_text',
        x: 5,
        y: 30,
        width: 100,
        height: 20,
        label: 'NW',
        binding: 'NetWt',
        fontSize: 17,
        fontWeight: 'bold',
        color: '#000000',
        zIndex: 10,
      },
      {
        type: 'text',
        id: 'sw_text',
        x: 5,
        y: 55,
        width: 100,
        height: 20,
        label: 'SW',
        binding: 'TotalStoneWeight',
        fontSize: 17,
        fontWeight: 'bold',
        color: '#000000',
        zIndex: 10,
      },
      {
        type: 'text',
        id: 'ic_text',
        x: 5,
        y: 80,
        width: 100,
        height: 20,
        label: 'IC',
        binding: 'ItemCode',
        fontSize: 17,
        fontWeight: 'bold',
        color: '#000000',
        zIndex: 10,
      },
      // Right side elements
      {
        type: 'qrcode',
        id: 'qr_code',
        x: currentWidth - 70,
        y: 5,
        width: 60,
        height: 60,
        binding: 'ItemCode',
        qrSize: 60,
        zIndex: 10,
      },
      {
        type: 'text',
        id: 'size_text',
        x: currentWidth - 70,
        y: 70,
        width: 100,
        height: 20,
        label: 'S',
        binding: 'Size',
        fontSize: 17,
        fontWeight: 'bold',
        color: '#000000',
        zIndex: 10,
      },
      {
        type: 'text',
        id: 'rfid_text',
        x: currentWidth - 110,
        y: 95,
        width: 100,
        height: 20,
        label: 'RC',
        binding: 'RFIDCode',
        fontSize: 17,
        fontWeight: 'bold',
        color: '#000000',
        zIndex: 10,
      },
      // Vertical dotted line for reference
      {
        type: 'shape',
        id: 'vertical_line',
        shapeType: 'line',
        x: centerX - 1,
        y: 0,
        width: 2,
        height: labelLayout.page.height,
        borderColor: '#cccccc',
        borderWidth: 1,
        lineDirection: 'vertical',
        zIndex: 5,
      },
    ];

    setLabelLayout((prev) => ({
      ...prev,
      elements: defaultElements,
    }));
  };

  // Handle dimension changes
  const handleDimensionChange = (dimension, value) => {
    const mmToPx = 10; // 1mm = 10px for canvas display
    const newValue = Math.max(10, value * mmToPx);

    setLabelLayout((prev) => {
      const newLayout = {
        ...prev,
        page: {
          ...prev.page,
          [dimension]: newValue,
        },
      };

      // If width changed, update vertical line position and right-side elements
      if (dimension === 'width') {
        const centerX = newValue / 2;
        newLayout.elements = prev.elements.map((element) => {
          if (element.id === 'vertical_line') {
            return {
              ...element,
              x: centerX - 1,
              height: newLayout.page.height,
            };
          } else if (element.id === 'qr_code' || element.id === 'size_text') {
            return {
              ...element,
              x: newValue - 70,
            };
          } else if (element.id === 'rfid_text') {
            return {
              ...element,
              x: newValue - 110,
            };
          }
          return element;
        });
      }

      return newLayout;
    });
  };

  // Get current dimensions in mm for display
  const getDimensionsInMm = () => {
    const pxToMm = 0.1; // 1px = 0.1mm for canvas display
    return {
      width: Math.round(labelLayout.page.width * pxToMm),
      height: Math.round(labelLayout.page.height * pxToMm),
    };
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.25));
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
  };

  const handleZoomFit = () => {
    const canvasContainer = document.querySelector('.labelCanvasArea');
    if (canvasContainer) {
      const containerWidth = canvasContainer.clientWidth - 48;
      const containerHeight = canvasContainer.clientHeight - 48;
      const labelWidth = labelLayout.page.width;
      const labelHeight = labelLayout.page.height;

      const scaleX = containerWidth / labelWidth;
      const scaleY = containerHeight / labelHeight;
      const fitScale = Math.min(scaleX, scaleY, 2);

      setZoomLevel(Math.max(fitScale, 0.25));
    }
  };

  // Print function
  const handlePrint = async () => {
    try {
      setLoading(true);
      
      // Import required libraries
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      const QRCode = (await import('qrcode')).default;

      // Find the canvas element using the class we added
      const canvasElement = document.querySelector('.label-canvas-print-target');
      if (!canvasElement) {
        throw new Error('Canvas element not found. Please ensure the label canvas is visible.');
      }

      // Temporarily hide selection handles and delete buttons for clean capture
      const originalDisplay = {};
      const buttons = canvasElement.querySelectorAll('button');
      buttons.forEach((btn, index) => {
        originalDisplay[`btn_${index}`] = btn.style.display;
        btn.style.display = 'none';
      });

      // Store original styles to restore later
      const originalBorder = canvasElement.style.border;
      const originalBorderRadius = canvasElement.style.borderRadius;
      const originalBoxShadow = canvasElement.style.boxShadow;
      const originalPadding = canvasElement.style.padding;
      const originalMargin = canvasElement.style.margin;

      // Remove border, shadow, and padding for clean capture
      canvasElement.style.border = 'none';
      canvasElement.style.borderRadius = '0';
      canvasElement.style.boxShadow = 'none';
      canvasElement.style.padding = '0';
      canvasElement.style.margin = '0';

      // Temporarily hide QR codes in canvas (we'll add them directly to PDF)
      const qrElements = canvasElement.querySelectorAll('svg[class*="QRCode"], svg[viewBox]');
      const qrOriginalDisplay = {};
      qrElements.forEach((qr, index) => {
        qrOriginalDisplay[`qr_${index}`] = qr.style.display;
        qr.style.display = 'none';
      });

      // Get actual content dimensions (without border/padding)
      // Use the label layout dimensions directly - these are the exact label dimensions
      const labelWidthPx = labelLayout.page.width * zoomLevel;
      const labelHeightPx = labelLayout.page.height * zoomLevel;

      // Capture canvas as image using html2canvas (without QR codes)
      // Use scale 3 for high quality print output
      const canvas = await html2canvas(canvasElement, {
        scale: 3, // High resolution for print quality
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: labelWidthPx,
        height: labelHeightPx,
        windowWidth: labelWidthPx,
        windowHeight: labelHeightPx,
        removeContainer: false,
        x: 0,
        y: 0,
        ignoreElements: (element) => {
          // Ignore delete buttons, selection handles, and QR codes
          return element.tagName === 'BUTTON' || 
                 (element.tagName === 'svg' && element.querySelector('path'));
        }
      });

      // Restore original styles
      canvasElement.style.border = originalBorder;
      canvasElement.style.borderRadius = originalBorderRadius;
      canvasElement.style.boxShadow = originalBoxShadow;
      canvasElement.style.padding = originalPadding;
      canvasElement.style.margin = originalMargin;

      // Restore QR code visibility
      qrElements.forEach((qr, index) => {
        qr.style.display = qrOriginalDisplay[`qr_${index}`] || '';
      });

      // Restore button visibility
      buttons.forEach((btn, index) => {
        btn.style.display = originalDisplay[`btn_${index}`] || '';
      });

      // Convert canvas to image data URL
      const imgData = canvas.toDataURL('image/png', 1.0);

      // Get dimensions in mm (exact label dimensions)
      const dimensions = getDimensionsInMm();
      const labelWidthMm = dimensions.width;
      const labelHeightMm = dimensions.height;

      // Conversion factor: 1mm = 3.779527559 pixels (at 72 DPI)
      const mmToPx = 3.779527559;
      const pxToMm = 1 / mmToPx;

      // Create PDF with exact label dimensions (no margins, no padding)
      const doc = new jsPDF({
        orientation: labelWidthMm > labelHeightMm ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [labelHeightMm, labelWidthMm], // [height, width]
        compress: true
      });

      // Remove any default margins
      doc.setProperties({
        title: 'Label',
        subject: 'Label Print',
        author: 'RFID Dashboard',
        creator: 'RFID Dashboard'
      });

      // Get PDF page dimensions (should match label dimensions exactly)
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();

      // Add background image to PDF
      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

      // Generate and add QR codes directly to PDF for perfect quality
      const qrCodeElements = labelLayout.elements.filter(el => el.type === 'qrcode' && el.id !== 'vertical_line');
      
      for (const qrElement of qrCodeElements) {
        const itemCodeValue = labelData.ItemCode || '';
        if (itemCodeValue) {
          try {
            // Generate high-quality QR code as data URL
            // Use error correction level 'M' (Medium) for good balance
            // Use margin: 1 for minimal white space
            const qrDataUrl = await QRCode.toDataURL(String(itemCodeValue), {
              errorCorrectionLevel: 'M',
              type: 'image/png',
              quality: 1.0,
              margin: 1,
              width: qrElement.qrSize * 3, // High resolution (3x for print quality)
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });

            // Convert pixel positions to mm
            // Canvas uses: 1mm = 10px (for display)
            // PDF uses: 1mm = actual mm
            const qrXmm = (qrElement.x / 10); // Convert px to mm
            const qrYmm = (qrElement.y / 10); // Convert px to mm
            const qrWidthMm = (qrElement.width / 10); // Convert px to mm
            const qrHeightMm = (qrElement.height / 10); // Convert px to mm

            // Add QR code to PDF at exact position
            doc.addImage(qrDataUrl, 'PNG', qrXmm, qrYmm, qrWidthMm, qrHeightMm, undefined, 'FAST');
          } catch (qrError) {
            console.error('Error generating QR code:', qrError);
            // If QR code generation fails, continue without it
          }
        }
      }

      // Open PDF in new tab
      const pdfDataUri = doc.output('datauristring');
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(`
          <html>
            <head>
              <title>Label Preview</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  background: #f5f5f5; 
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                }
                iframe { 
                  width: 100%; 
                  max-width: 800px;
                  height: calc(100vh - 40px); 
                  border: none; 
                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
              </style>
            </head>
            <body>
              <iframe src="${pdfDataUri}"></iframe>
            </body>
          </html>
        `);
        newTab.document.close();
      }

      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Label PDF generated successfully!'
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to generate PDF. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Save template
  const handleSave = () => {
    setShowSavePopup(true);
  };

  const handleSaveConfirm = async () => {
    try {
      // Serialize layout for save (store binding keys, not resolved values)
      const serializeLayoutForSave = (layout) => {
        const serialized = {
          page: { ...layout.page },
          elements: (layout.elements || [])
            .filter((el) => el.id !== 'vertical_line')
            .map((element) => {
              const base = {
                type: element.type,
                id: element.id,
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height,
                zIndex: element.zIndex,
              };

              if (element.type === 'text') {
                return {
                  ...base,
                  label: element.label,
                  binding: element.binding || null,
                  fontSize: element.fontSize,
                  fontWeight: element.fontWeight,
                  color: element.color,
                };
              }

              if (element.type === 'qrcode') {
                return {
                  ...base,
                  binding: 'ItemCode', // QR codes always use ItemCode
                  qrSize: element.qrSize,
                };
              }

              if (element.type === 'barcode') {
                return {
                  ...base,
                  binding: element.binding || null,
                  barcodeType: element.barcodeType || 'code128',
                };
              }

              if (element.type === 'shape') {
                return {
                  ...base,
                  shapeType: element.shapeType,
                  borderColor: element.borderColor,
                  borderWidth: element.borderWidth,
                  lineDirection: element.lineDirection,
                };
              }

              return base;
            }),
        };
        return serialized;
      };

      const layoutJson = serializeLayoutForSave(labelLayout);
      const bindingKeys = Array.from(
        new Set(
          (layoutJson.elements || [])
            .map((e) => e.binding)
            .filter((b) => typeof b === 'string' && b.length > 0)
        )
      );

      // Use custom template name if provided, otherwise generate one
      let templateName = templateNameInput.trim();
      
      if (!templateName) {
        // Generate template name if not provided
        const sanitize = (str) =>
          String(str || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (saveOption === 'category' && selectedCategory) {
          templateName = `category-${selectedCategory.value}-${sanitize(selectedCategory.label)}`;
        } else if (saveOption === 'categoryProduct' && selectedCategory && selectedProduct) {
          templateName = `category-${selectedCategory.value}-${sanitize(selectedCategory.label)}__product-${selectedProduct.value}-${sanitize(selectedProduct.label)}`;
        } else {
          templateName = 'single-all-products';
        }
      }

      // Create FormData for multipart/form-data request
      const formData = new FormData();
      formData.append('ClientCode', userInfo.ClientCode);
      formData.append('SaveOption', saveOption);
      formData.append('CategoryId', String(selectedCategory?.value || 0));
      formData.append('ProductId', String(selectedProduct?.value || 0));
      formData.append('TemplateName', templateName);
      formData.append('Version', '1.0');
      formData.append('LayoutJson', JSON.stringify(layoutJson));
      formData.append('BindingKeysJson', JSON.stringify(bindingKeys));
      // Add ImagesJson (empty object if no images)
      formData.append('ImagesJson', JSON.stringify({}));

      // If editing, add the template ID
      if (isEditingTemplate && editingTemplateId) {
        formData.append('Id', String(editingTemplateId));
        formData.append('LabelTemplateId', String(editingTemplateId));
      }

      // Choose API endpoint
      const apiEndpoint = isEditingTemplate
        ? 'https://rrgold.loyalstring.co.in/api/LabelTemplates/UpdateLabelTemplate'
        : 'https://rrgold.loyalstring.co.in/api/LabelTemplates/AddLabelTemplate';

      // Use separate axios instance that properly handles FormData
      // This avoids conflicts with global interceptors that set Content-Type: application/json
      const response = await formDataAxios.post(apiEndpoint, formData);

      if (response.data) {
        // Refresh templates list
        await fetchSavedTemplates();

        // Show success notification with template name
        addNotification({
          type: 'success',
          title: 'Success',
          message: `Template "${templateName}" ${isEditingTemplate ? 'updated' : 'saved'} successfully!`
        });

        // Clear form
        setSaveOption('single');
        setSelectedCategory(null);
        setSelectedProduct(null);
        setTemplateNameInput('');
        setShowSavePopup(false);
        setIsEditingTemplate(false);
        setEditingTemplateId(null);
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save template. Please try again.'
      });
    }
  };

  const handleSaveCancel = () => {
    setShowSavePopup(false);
    setSaveOption('single');
    setSelectedCategory(null);
    setSelectedProduct(null);
    if (!isEditingTemplate) {
      setTemplateNameInput('');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            handleZoomIn();
            break;
          case '-':
            e.preventDefault();
            handleZoomOut();
            break;
          case '0':
            e.preventDefault();
            handleZoomReset();
            break;
        }
      }
      if (e.key === 'Delete' && selectedElement) {
        handleRemoveElement(selectedElement.id);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [zoomLevel, selectedElement]);

  return (
    <div style={{ 
      backgroundColor: '#f8f9fa', 
      minHeight: '100vh',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 700,
          color: '#1e293b'
        }}>
          Create Label
        </h1>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Template Selector */}
          <div style={{ minWidth: '200px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={selectedTemplate?.value || ''}
              onChange={(e) => {
                const selectedValue = e.target.value;
                console.log('Template selected:', selectedValue, 'Options:', templateOptions);
                
                if (selectedValue === '') {
                  // Reset to new template when "Select Template" is chosen
                  handleNewTemplate();
                } else {
                  const option = templateOptions.find(opt => String(opt.value) === String(selectedValue));
                  console.log('Found option:', option);
                  if (option) {
                    handleTemplateSelect(option);
                  } else {
                    console.error('Template option not found for value:', selectedValue);
                    addNotification({
                      type: 'error',
                      title: 'Error',
                      message: 'Template not found. Please try selecting again.'
                    });
                  }
                }
              }}
              disabled={templatesLoading}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                outline: 'none',
                background: templatesLoading ? '#f1f5f9' : '#ffffff',
                cursor: templatesLoading ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="">Select Template</option>
              {templateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedTemplate && selectedTemplate.template && (
              <button
                onClick={() => {
                  const template = selectedTemplate.template;
                  handleDeleteTemplate(
                    template.Id || template.id || template.LabelTemplateId,
                    template.TemplateName || 'Unnamed Template'
                  );
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.2s',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ef4444';
                }}
                title="Delete Template"
              >
                <FaTrash /> Delete
              </button>
            )}
          </div>

          {/* Label Dimensions */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Width (mm):</label>
            <input
              type="number"
              value={getDimensionsInMm().width}
              onChange={(e) => handleDimensionChange('width', parseInt(e.target.value) || 27)}
              min="10"
              style={{
                width: '60px',
                padding: '6px 8px',
                fontSize: '13px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                outline: 'none'
              }}
            />
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Height (mm):</label>
            <input
              type="number"
              value={getDimensionsInMm().height}
              onChange={(e) => handleDimensionChange('height', parseInt(e.target.value) || 14)}
              min="5"
              max="30"
              style={{
                width: '60px',
                padding: '6px 8px',
                fontSize: '13px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                outline: 'none'
              }}
            />
          </div>

          {/* Zoom Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 12px', background: '#f1f5f9', borderRadius: '8px' }}>
            <button
              onClick={handleZoomOut}
              style={{
                padding: '4px 8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
              title="Zoom Out"
            >
              <FaCompress />
            </button>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '50px', textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              style={{
                padding: '4px 8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
              title="Zoom In"
            >
              <FaExpand />
            </button>
            <button
              onClick={handleZoomReset}
              style={{
                padding: '4px 8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '11px'
              }}
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleNewTemplate}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaPlus /> New
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: '#3b82f6',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaSave /> {isEditingTemplate ? 'Update' : 'Save'}
            </button>
            <button
              onClick={handlePrint}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: '#10b981',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaPrint /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '250px 1fr 300px',
        gap: '16px',
        height: 'calc(100vh - 200px)'
      }}>
        {/* Left Sidebar - Toolbox */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          overflowY: 'auto'
        }}>
          <LabelToolbox onAddElement={handleAddElement} />
        </div>

        {/* Center - Canvas Area */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start'
        }} className="labelCanvasArea">
          <LabelCanvasArea
            layout={labelLayout}
            selectedElement={selectedElement}
            onSelect={setSelectedElement}
            onChange={handleLayoutChange}
            onAddElement={handleAddElement}
            onRemoveElement={handleRemoveElement}
            labelData={labelData}
            zoomLevel={zoomLevel}
          />
        </div>

        {/* Right Sidebar - Properties Panel */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          overflowY: 'auto'
        }}>
          <LabelPropertiesPanel
            selectedElement={selectedElement}
            onUpdateElement={handleUpdateElement}
            labelData={labelData}
            onLabelDataChange={setLabelData}
            layout={labelLayout}
            onLayoutChange={handleLayoutChange}
          />
        </div>
      </div>

      {/* Save Popup Modal */}
      {showSavePopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
                {isEditingTemplate ? 'Update Label Template' : 'Save Label Template'}
              </h3>
              <button
                onClick={handleSaveCancel}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Template Name Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                Template Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={templateNameInput}
                onChange={(e) => setTemplateNameInput(e.target.value)}
                placeholder="Enter template name (e.g., Standard Label, Product Label)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                }}
              />
              <div style={{ 
                marginTop: '4px', 
                fontSize: '11px', 
                color: '#64748b',
                fontStyle: 'italic'
              }}>
                {templateNameInput ? `Will save as: "${templateNameInput}"` : 'Leave empty to auto-generate name based on save option'}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                Save Option:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="saveOption"
                    value="single"
                    checked={saveOption === 'single'}
                    onChange={(e) => setSaveOption(e.target.value)}
                  />
                  <span>Single Template (All Products)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="saveOption"
                    value="category"
                    checked={saveOption === 'category'}
                    onChange={(e) => setSaveOption(e.target.value)}
                  />
                  <span>Category Specific</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="saveOption"
                    value="categoryProduct"
                    checked={saveOption === 'categoryProduct'}
                    onChange={(e) => setSaveOption(e.target.value)}
                  />
                  <span>Category & Product Specific</span>
                </label>
              </div>
            </div>

            {saveOption === 'category' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  Select Category:
                </label>
                <select
                  value={selectedCategory?.value || ''}
                  onChange={(e) => {
                    const category = categoryList.find(cat => cat.value === e.target.value);
                    setSelectedCategory(category || null);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                >
                  <option value="">Select Category</option>
                  {categoryList.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {saveOption === 'categoryProduct' && (
              <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    Select Category:
                  </label>
                  <select
                    value={selectedCategory?.value || ''}
                    onChange={(e) => {
                      const category = categoryList.find(cat => cat.value === e.target.value);
                      setSelectedCategory(category || null);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  >
                    <option value="">Select Category</option>
                    {categoryList.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    Select Product:
                  </label>
                  <select
                    value={selectedProduct?.value || ''}
                    onChange={(e) => {
                      const product = productList.find(prod => prod.value === e.target.value);
                      setSelectedProduct(product || null);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  >
                    <option value="">Select Product</option>
                    {productList.map((prod) => (
                      <option key={prod.value} value={prod.value}>
                        {prod.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={handleSaveCancel}
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfirm}
                disabled={
                  (saveOption === 'category' && !selectedCategory) ||
                  (saveOption === 'categoryProduct' && (!selectedCategory || !selectedProduct))
                }
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  background: (saveOption === 'category' && !selectedCategory) ||
                    (saveOption === 'categoryProduct' && (!selectedCategory || !selectedProduct))
                    ? '#cbd5e1' : '#3b82f6',
                  color: '#ffffff',
                  cursor: (saveOption === 'category' && !selectedCategory) ||
                    (saveOption === 'categoryProduct' && (!selectedCategory || !selectedProduct))
                    ? 'not-allowed' : 'pointer'
                }}
              >
                <FaSave style={{ marginRight: '6px' }} />
                {isEditingTemplate ? 'Update Template' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateLabel;

