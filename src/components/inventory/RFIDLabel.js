import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  FaSave,
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaSpinner,
  FaDownload,
  FaFileAlt,
  FaPrint,
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
  FaSync,
  FaCopy,
  FaCode,
  FaFileExcel,
  FaFilter,
  FaSortAmountDown,
  FaSortAmountUp,
  FaFileExport,
  FaFilePdf,
  FaThList,
  FaThLarge
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { rfidLabelService } from '../../services/rfidLabelService';
import { useTranslation } from '../../hooks/useTranslation';
import { useNotifications } from '../../context/NotificationContext';
import { generateClientPrn } from '../../utils/prnTemplates';
import SuccessNotification from '../common/SuccessNotification';
import { useLoading } from '../../App';

const PAGE_SIZE_OPTIONS = [500, 1000, 2000, 5000];
const DEFAULT_PAGE_SIZE = 500;

const getUniqueOptions = (data, field) => {
  if (!data || !Array.isArray(data)) return ['All'];

  const options = data
    .map(item => item[field])
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort((a, b) => a?.toString().localeCompare(b?.toString()));

  return ['All', ...options];
};

const formatValue = (value) => {
  if (!value) return '-';
  if (typeof value === 'number') return value.toFixed(3);
  return value.toString();
};

const RFIDLabel = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotifications();
  const { setLoading } = useLoading();

  // User Info
  const [userInfo, setUserInfo] = useState(null);
  const clientCode = userInfo?.ClientCode || '';

  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const searchTimeoutRef = useRef(null);

  // Tab Management
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' or 'generate'

  // Template Management
  const [templates, setTemplates] = useState([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    TemplateName: '',
    TemplateType: 'RFID',
    PrnCode: '',
    SaveOption: 'single',
    CategoryId: 0,
    ProductId: 0,
    Version: '1.0',
    IsActive: true,
    FieldReplacements: []
  });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTemplate, setSearchTemplate] = useState('');

  // Available Dynamic Fields
  const availableFields = [
    'ItemCode',
    'ProductCode',
    'GrossWt',
    'NetWt',
    'TotalStoneWeight',
    'Size',
    'RFIDCode',
    'HUIDCode',
    'MRP',
    'ProductName',
    'CategoryName',
    'PurityName',
    'DesignName',
    'BranchName',
    'CollectionName',
    'VendorName'
  ];

  // Label Generation
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [labelledStock, setLabelledStock] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [generatedLabels, setGeneratedLabels] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination for products
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // Filter states
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterValues, setFilterValues] = useState({
    counterName: 'All',
    productId: 'All',
    categoryId: 'All',
    designId: 'All',
    purityId: 'All',
    boxName: 'All',
    vendor: 'All',
    branch: 'All',
    status: 'All',
    dateFrom: '',
    dateTo: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    counterNames: ['All'],
    productNames: ['All'],
    categories: ['All'],
    designs: ['All'],
    boxNames: ['All'],
    vendors: ['All'],
    branches: ['All'],
    statuses: ['All', 'ApiActive', 'Sold']
  });
  const [apiFilterData, setApiFilterData] = useState({
    products: [],
    designs: [],
    categories: [],
    purities: [],
    counters: [],
    branches: []
  });
  const [dropdownStates, setDropdownStates] = useState({
    branch: { isOpen: false, searchTerm: '', filteredOptions: [] },
    counterName: { isOpen: false, searchTerm: '', filteredOptions: [] },
    boxName: { isOpen: false, searchTerm: '', filteredOptions: [] },
    categoryId: { isOpen: false, searchTerm: '', filteredOptions: [] },
    productId: { isOpen: false, searchTerm: '', filteredOptions: [] },
    designId: { isOpen: false, searchTerm: '', filteredOptions: [] },
    purityId: { isOpen: false, searchTerm: '', filteredOptions: [] },
    status: { isOpen: false, searchTerm: '', filteredOptions: [] }
  });
  const [isGridView, setIsGridView] = useState(false);
  const [allFilteredData, setAllFilteredData] = useState([]);
  const [loadingAllData, setLoadingAllData] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [previewLoading, setPreviewLoading] = useState(false);
  const isFetchingRef = useRef(false);

  // PRN Code Editor
  const [selectedText, setSelectedText] = useState(null);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const prnCodeRef = useRef(null);

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

    // Handle window resize for responsive design
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (clientCode) {
      fetchTemplates();
      fetchFilterData();
      if (activeTab === 'generate') {
        fetchLabelledStock(1, productsPerPage, '', filterValues);
      }
    }
  }, [clientCode, activeTab]);

  // Fetch Templates
  const fetchTemplates = async () => {
    if (!clientCode) return;

    setTemplateLoading(true);
    try {
      const data = await rfidLabelService.getAllTemplates(clientCode);
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error(error.response?.data?.Message || 'Failed to load templates');
    } finally {
      setTemplateLoading(false);
    }
  };

  // Helper function to get filter value for API
  const getFilterValueForAPI = (field, value) => {
    if (value === 'All' || value === 0 || !value) return 0;

    switch (field) {
      case 'categoryId':
        const category = apiFilterData.categories?.find(cat =>
          cat.CategoryName === value ||
          cat.Name === value ||
          cat.categoryName === value ||
          (cat.CategoryName && cat.CategoryName.toLowerCase() === value.toLowerCase()) ||
          (cat.Name && cat.Name.toLowerCase() === value.toLowerCase())
        );
        return category ? (category.Id || category.id || 0) : 0;
      case 'productId':
        const product = apiFilterData.products?.find(prod =>
          prod.ProductName === value ||
          prod.Name === value ||
          prod.productName === value ||
          (prod.ProductName && prod.ProductName.toLowerCase() === value.toLowerCase()) ||
          (prod.Name && prod.Name.toLowerCase() === value.toLowerCase())
        );
        return product ? (product.Id || product.id || 0) : 0;
      case 'designId':
        const design = apiFilterData.designs?.find(des =>
          des.DesignName === value ||
          des.Name === value ||
          des.designName === value ||
          (des.DesignName && des.DesignName.toLowerCase() === value.toLowerCase()) ||
          (des.Name && des.Name.toLowerCase() === value.toLowerCase())
        );
        return design ? (design.Id || design.id || 0) : 0;
      case 'purityId':
        const purity = apiFilterData.purities?.find(pur =>
          pur.PurityName === value ||
          pur.Name === value ||
          pur.Purity === value ||
          pur.purityName === value ||
          (pur.PurityName && pur.PurityName.toLowerCase() === value.toLowerCase()) ||
          (pur.Name && pur.Name.toLowerCase() === value.toLowerCase())
        );
        return purity ? (purity.Id || purity.id || 0) : 0;
      default:
        return value;
    }
  };

  // Fetch filter data from APIs
  const fetchFilterData = async () => {
    try {
      if (!clientCode) return;

      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const requestBody = { ClientCode: clientCode };
      const timeoutConfig = { timeout: 20000 };

      const [
        productsResult,
        designsResult,
        categoriesResult,
        puritiesResult,
        countersResult,
        branchesResult
      ] = await Promise.allSettled([
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllProductMaster', requestBody, { headers, ...timeoutConfig }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllDesign', requestBody, { headers, ...timeoutConfig }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllCategory', requestBody, { headers, ...timeoutConfig }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllPurity', requestBody, { headers, ...timeoutConfig }),
        axios.post('https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllCounters', requestBody, { headers, ...timeoutConfig }),
        axios.post('https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllBranchMaster', requestBody, { headers, ...timeoutConfig })
      ]);

      const normalizeArray = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
          return data.data || data.items || data.results || data.list || [];
        }
        return [];
      };

      setApiFilterData({
        products: normalizeArray(productsResult.status === 'fulfilled' ? productsResult.value?.data : null),
        designs: normalizeArray(designsResult.status === 'fulfilled' ? designsResult.value?.data : null),
        categories: normalizeArray(categoriesResult.status === 'fulfilled' ? categoriesResult.value?.data : null),
        purities: normalizeArray(puritiesResult.status === 'fulfilled' ? puritiesResult.value?.data : null),
        counters: normalizeArray(countersResult.status === 'fulfilled' ? countersResult.value?.data : null),
        branches: normalizeArray(branchesResult.status === 'fulfilled' ? branchesResult.value?.data : null)
      });
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  // Fetch Labelled Stock - Updated to match LabelStockList API structure
  const fetchLabelledStock = async (page = currentProductPage, pageSize = productsPerPage, search = searchProduct, filters = filterValues, sort = sortConfig) => {
    if (isFetchingRef.current) return;
    if (!clientCode) return;

    isFetchingRef.current = true;
    try {
      setLoading(true);

      const safeFilters = filters || {
        counterName: 'All',
        productId: 'All',
        categoryId: 'All',
        designId: 'All',
        purityId: 'All',
        boxName: 'All',
        vendor: 'All',
        branch: 'All',
        status: 'All',
        dateFrom: '',
        dateTo: ''
      };

      const payload = {
        ClientCode: clientCode,
        CategoryId: getFilterValueForAPI('categoryId', safeFilters.categoryId),
        ProductId: getFilterValueForAPI('productId', safeFilters.productId),
        DesignId: getFilterValueForAPI('designId', safeFilters.designId),
        PurityId: getFilterValueForAPI('purityId', safeFilters.purityId),
        FromDate: safeFilters.dateFrom && safeFilters.dateFrom.trim() !== '' ? safeFilters.dateFrom.trim() : null,
        ToDate: safeFilters.dateTo && safeFilters.dateTo.trim() !== '' ? safeFilters.dateTo.trim() : null,
        RFIDCode: "",
        PageNumber: page,
        PageSize: pageSize,
        BranchId: safeFilters.branch !== 'All' && safeFilters.branch ? (() => {
          const selectedBranch = apiFilterData.branches?.find(branch => {
            const branchName = branch.BranchName || branch.Name || branch.branchName || branch.name || '';
            return branchName === safeFilters.branch || branchName.toLowerCase() === safeFilters.branch.toLowerCase();
          });
          return selectedBranch ? (selectedBranch.Id || selectedBranch.id || 0) : 0;
        })() : 0,
        Status: safeFilters.status !== 'All' ? safeFilters.status : "ApiActive",
        SearchQuery: search && search.trim() !== '' ? search.trim() : "",
        ListType: sort && sort.direction === 'desc' ? "descending" : "ascending",
        SortColumn: sort && sort.key ? sort.key : null
      };

      if (safeFilters.counterName !== 'All' && safeFilters.counterName) {
        const selectedCounter = apiFilterData.counters?.find(counter =>
          counter.CounterName === safeFilters.counterName ||
          counter.Name === safeFilters.counterName ||
          counter.counterName === safeFilters.counterName
        );
        if (selectedCounter) {
          payload.CounterId = selectedCounter.Id || selectedCounter.id;
        }
      }
      if (safeFilters.boxName !== 'All' && safeFilters.boxName) {
        payload.BoxName = safeFilters.boxName;
      }
      if (safeFilters.vendor !== 'All' && safeFilters.vendor) {
        payload.Vendor = safeFilters.vendor;
      }

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllLabeledStock',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );

      let dataArray = [];
      let totalCount = 0;

      if (response.data) {
        if (Array.isArray(response.data)) {
          dataArray = response.data;
          if (dataArray.length > 0 && dataArray[0].TotalCount !== undefined) {
            totalCount = dataArray[0].TotalCount;
          } else if (dataArray.length > 0 && dataArray[0].TotalRecords !== undefined) {
            totalCount = dataArray[0].TotalRecords;
          }
        } else if (response.data.data && Array.isArray(response.data.data)) {
          dataArray = response.data.data;
          totalCount = response.data.totalRecords || response.data.totalCount || response.data.total || dataArray.length;
        } else if (response.data.success && response.data.data && Array.isArray(response.data.data)) {
          dataArray = response.data.data;
          totalCount = response.data.totalRecords || response.data.totalCount || response.data.total || dataArray.length;
        } else if (response.data.totalRecords !== undefined) {
          totalCount = response.data.totalRecords;
        } else if (response.data.totalCount !== undefined) {
          totalCount = response.data.totalCount;
        } else if (response.data.total !== undefined) {
          totalCount = response.data.total;
        }
      }

      if (dataArray.length > 0 || (Array.isArray(response.data) && response.data.length > 0)) {
        const stockData = dataArray.length > 0 ? dataArray : (Array.isArray(response.data) ? response.data : []);
        const mappedData = stockData.map((item, index) => ({
          ...item,
          srNo: ((page - 1) * pageSize) + index + 1,
          StoneWt: item.TotalStoneWeight !== undefined && item.TotalStoneWeight !== null ? item.TotalStoneWeight : (item.StoneWt || ''),
          StonePcs: item.TotalStonePieces !== undefined && item.TotalStonePieces !== null ? item.TotalStonePieces : (item.StonePcs || ''),
          StoneAmt: item.TotalStoneAmount !== undefined && item.TotalStoneAmount !== null ? item.TotalStoneAmount : (item.StoneAmt || ''),
          DiamondWt: item.TotalDiamondWeight !== undefined && item.TotalDiamondWeight !== null ? item.TotalDiamondWeight : (item.DiamondWt || ''),
          DiamondPcs: item.TotalDiamondPieces !== undefined && item.TotalDiamondPieces !== null ? item.TotalDiamondPieces : (item.DiamondPcs || ''),
          DiamondAmount: item.TotalDiamondAmount !== undefined && item.TotalDiamondAmount !== null ? item.TotalDiamondAmount : (item.DiamondAmount || ''),
          MakingFixedAmt: item.MakingFixedAmt !== undefined && item.MakingFixedAmt !== null ? item.MakingFixedAmt : (item.MakingFixedAmt || ''),
          FixedAmt: item.MakingFixedAmt !== undefined && item.MakingFixedAmt !== null ? item.MakingFixedAmt : (item.FixedAmt || ''),
          CounterName: item.CounterName || '',
          BoxName: item.BoxName || '',
          Vendor: item.VendorName || item.Vendor || '',
          Branch: item.BranchName || item.Branch || '',
          CategoryName: item.CategoryName || item.Category || '',
          DesignName: item.DesignName || item.Design || '',
          PurityName: item.PurityName || item.Purity || '',
          CreatedDate: item.CreatedOn || item.CreatedDate || '',
          PackingWeight: item.PackingWeight !== undefined && item.PackingWeight !== null ? item.PackingWeight : (item.PackingWeight || ''),
          TotalWeight: item.TotalWeight !== undefined && item.TotalWeight !== null ? item.TotalWeight : (item.TotalWeight || '')
        }));

        setLabelledStock(mappedData);
        if (totalCount > 0) {
          setTotalRecords(totalCount);
          setTotalPages(Math.ceil(totalCount / pageSize));
        } else if (mappedData.length > 0) {
          setTotalRecords(mappedData.length);
          setTotalPages(Math.ceil(mappedData.length / pageSize));
        } else {
          setTotalRecords(0);
          setTotalPages(0);
        }
      } else {
        setLabelledStock([]);
        setTotalRecords(0);
        setTotalPages(0);
      }
    } catch (error) {
      console.error('Error fetching labelled stock:', error);
      toast.error('Failed to load products');
      setLabelledStock([]);
      setTotalRecords(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };


  // Handle Template Form Changes
  const handleTemplateFormChange = (field, value) => {
    setTemplateForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Add Dynamic Field
  const handleAddField = (field) => {
    if (!templateForm.FieldReplacements.includes(field)) {
      setTemplateForm(prev => ({
        ...prev,
        FieldReplacements: [...prev.FieldReplacements, field]
      }));
    }
    setShowFieldModal(false);
  };

  // Remove Dynamic Field
  const handleRemoveField = (field) => {
    setTemplateForm(prev => ({
      ...prev,
      FieldReplacements: prev.FieldReplacements.filter(f => f !== field)
    }));
  };

  // Save Template
  const handleSaveTemplate = async () => {
    if (!clientCode) {
      toast.error('Client code not found');
      return;
    }

    if (!templateForm.TemplateName.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (!templateForm.PrnCode.trim()) {
      toast.error('PRN code is required');
      return;
    }

    setTemplateLoading(true);
    try {
      const payload = {
        ...templateForm,
        ClientCode: clientCode,
        CreatedOn: new Date().toISOString()
      };

      if (isEditing && selectedTemplate) {
        await rfidLabelService.updateTemplate({
          ...payload,
          Id: selectedTemplate.Id
        });
        toast.success('Template updated successfully');
      } else {
        await rfidLabelService.addTemplate(payload);
        toast.success('Template saved successfully');
      }

      setShowTemplateModal(false);
      resetTemplateForm();
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.Message || 'Failed to save template');
    } finally {
      setTemplateLoading(false);
    }
  };

  // Edit Template
  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateForm({
      TemplateName: template.TemplateName || '',
      TemplateType: template.TemplateType || 'RFID',
      PrnCode: template.PrnCode || '',
      SaveOption: template.SaveOption || 'single',
      CategoryId: template.CategoryId || 0,
      ProductId: template.ProductId || 0,
      Version: template.Version || '1.0',
      IsActive: template.IsActive !== undefined ? template.IsActive : true,
      FieldReplacements: template.FieldReplacements || []
    });
    setIsEditing(true);
    setShowTemplateModal(true);
  };

  // Delete Template
  const handleDeleteTemplate = async (template) => {
    if (!window.confirm(`Are you sure you want to delete "${template.TemplateName}"?`)) {
      return;
    }

    if (!clientCode) return;

    try {
      await rfidLabelService.deleteTemplate(template.Id, clientCode);
      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(error.response?.data?.Message || 'Failed to delete template');
    }
  };

  // Reset Template Form
  const resetTemplateForm = () => {
    setTemplateForm({
      TemplateName: '',
      TemplateType: 'RFID',
      PrnCode: '',
      SaveOption: 'single',
      CategoryId: 0,
      ProductId: 0,
      Version: '1.0',
      IsActive: true,
      FieldReplacements: []
    });
    setSelectedTemplate(null);
    setIsEditing(false);
  };

  // Handle PRN Code Text Selection
  const handlePRNCodeSelect = () => {
    const textarea = prnCodeRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    if (selectedText && selectedText.length > 0) {
      // Check if it's a quoted string
      const textBefore = textarea.value.substring(0, start);
      const textAfter = textarea.value.substring(end);

      // Simple check for quoted strings
      const beforeQuoteCount = (textBefore.match(/"/g) || []).length;
      const afterQuoteCount = (textAfter.match(/"/g) || []).length;

      if (beforeQuoteCount % 2 === 1) {
        setSelectedText({ start, end, text: selectedText });
        setShowFieldModal(true);
      }
    }
  };

  // Replace Selected Text with Field
  const handleReplaceWithField = (field) => {
    if (!selectedText) return;

    const textarea = prnCodeRef.current;
    if (!textarea) return;

    const before = templateForm.PrnCode.substring(0, selectedText.start);
    const after = templateForm.PrnCode.substring(selectedText.end);
    const newPrnCode = `${before}\${${field}}${after}`;

    setTemplateForm(prev => ({
      ...prev,
      PrnCode: newPrnCode,
      FieldReplacements: prev.FieldReplacements.includes(field)
        ? prev.FieldReplacements
        : [...prev.FieldReplacements, field]
    }));

    setSelectedText(null);
    setShowFieldModal(false);

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      const newPosition = selectedText.start + field.length + 3; // ${field}
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Generate Labels
  const handleGenerateLabels = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template');
      return;
    }

    // Use selectedItems which contains full item data from all selections (across searches)
    // This ensures we get ALL selected items, not just those in current labelledStock
    const itemsToGenerate = selectedItems.length > 0 ? selectedItems : [];

    if (itemsToGenerate.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    if (!clientCode) {
      toast.error('Client code not found');
      return;
    }

    setGenerating(true);
    try {
      const itemCodes = itemsToGenerate.map(item => item.ItemCode).filter(Boolean);

      if (itemCodes.length === 0) {
        toast.error('No valid item codes found in selected items');
        setGenerating(false);
        return;
      }

      console.log(`Generating labels for ${itemCodes.length} items:`, itemCodes);

      const response = await rfidLabelService.generateLabels({
        ClientCode: clientCode,
        TemplateId: parseInt(selectedTemplateId),
        ItemCodes: itemCodes
      });

      setGeneratedLabels(response.Labels || []);

      if (response.SuccessCount > 0) {
        toast.success(`Successfully generated ${response.SuccessCount} label(s)`);
      }

      if (response.FailedCount > 0) {
        toast.warning(`${response.FailedCount} label(s) failed to generate`);
      }
    } catch (error) {
      console.error('Error generating labels:', error);
      toast.error(error.response?.data?.Message || 'Failed to generate labels');
    } finally {
      setGenerating(false);
    }
  };

  // Download PRN File
  const handleDownloadPRN = (label, index) => {
    if (!label.GeneratedPrnCode) {
      toast.error('No PRN code available for this label');
      return;
    }

    const blob = new Blob([label.GeneratedPrnCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `label_${label.ItemCode || index}.prn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Label downloaded successfully');
  };

  // Download All PRN Files
  const handleDownloadAllPRN = () => {
    const successfulLabels = generatedLabels.filter(l => l.IsSuccess && l.GeneratedPrnCode);

    if (successfulLabels.length === 0) {
      toast.error('No labels available to download');
      return;
    }

    successfulLabels.forEach((label, index) => {
      setTimeout(() => {
        handleDownloadPRN(label, index);
      }, index * 200); // Stagger downloads
    });

    toast.success(`Downloading ${successfulLabels.length} label(s)...`);
  };

  // Toggle Product Selection
  const handleToggleProduct = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(p => p.ItemCode === item.ItemCode);
      if (exists) {
        return prev.filter(p => p.ItemCode !== item.ItemCode);
      } else {
        return [...prev, item];
      }
    });
  };

  // Row selection for table (using IDs) - Also stores full item data
  const handleRowSelection = (id) => {
    // Find the item in current items
    const item = currentItems.find(i => (i.Id || i.ItemCode) === id);
    
    setSelectedRows(prev => {
      if (prev.includes(id)) {
        // Remove from selectedRows
        const newSelectedRows = prev.filter(rowId => rowId !== id);
        // Also remove from selectedItems
        setSelectedItems(prevItems => prevItems.filter(i => (i.Id || i.ItemCode) !== id));
        return newSelectedRows;
      } else {
        // Add to selectedRows
        const newSelectedRows = [...prev, id];
        // Also add full item data to selectedItems if item exists
        if (item) {
          setSelectedItems(prevItems => {
            const exists = prevItems.find(p => (p.Id || p.ItemCode) === id);
            if (!exists) {
              return [...prevItems, item];
            }
            return prevItems;
          });
        }
        return newSelectedRows;
      }
    });
  };

  // Select All Products
  const handleSelectAll = () => {
    // Check if all current items are selected
    const allCurrentIds = currentItems.map(item => item.Id || item.ItemCode);
    const allCurrentSelected = allCurrentIds.every(id => selectedRows.includes(id));
    
    if (allCurrentSelected) {
      // Deselect all current items
      const newSelectedRows = selectedRows.filter(id => !allCurrentIds.includes(id));
      const newSelectedItems = selectedItems.filter(item => !allCurrentIds.includes(item.Id || item.ItemCode));
      setSelectedRows(newSelectedRows);
      setSelectedItems(newSelectedItems);
    } else {
      // Select all current items
      const newSelectedRows = [...new Set([...selectedRows, ...allCurrentIds])];
      const newSelectedItems = [...selectedItems];
      
      // Add items that aren't already in selectedItems
      currentItems.forEach(item => {
        const itemId = item.Id || item.ItemCode;
        const exists = newSelectedItems.find(i => (i.Id || i.ItemCode) === itemId);
        if (!exists) {
          newSelectedItems.push(item);
        }
      });
      
      setSelectedRows(newSelectedRows);
      setSelectedItems(newSelectedItems);
    }
  };

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilterValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    setCurrentProductPage(1);
    setLoading(true);
    fetchLabelledStock(1, productsPerPage, searchProduct, filterValues);
    setShowFilterPanel(false);
  };

  // Reset filters
  const handleResetFilters = () => {
    const defaultFilters = {
      counterName: 'All',
      productId: 'All',
      categoryId: 'All',
      designId: 'All',
      purityId: 'All',
      boxName: 'All',
      vendor: 'All',
      branch: 'All',
      status: 'All',
      dateFrom: '',
      dateTo: ''
    };
    setFilterValues(defaultFilters);
    setCurrentProductPage(1);
    setLoading(true);
    fetchLabelledStock(1, productsPerPage, searchProduct, defaultFilters);
  };

  // Close all dropdowns
  const closeAllDropdowns = () => {
    setDropdownStates({
      branch: { isOpen: false, searchTerm: '', filteredOptions: [] },
      counterName: { isOpen: false, searchTerm: '', filteredOptions: [] },
      boxName: { isOpen: false, searchTerm: '', filteredOptions: [] },
      categoryId: { isOpen: false, searchTerm: '', filteredOptions: [] },
      productId: { isOpen: false, searchTerm: '', filteredOptions: [] },
      designId: { isOpen: false, searchTerm: '', filteredOptions: [] },
      purityId: { isOpen: false, searchTerm: '', filteredOptions: [] },
      status: { isOpen: false, searchTerm: '', filteredOptions: [] }
    });
  };

  // Columns definition matching LabelStockList
  const columns = [
    { key: 'srNo', label: 'Sr No', width: '60px' },
    { key: 'CounterName', label: 'Counter Name', width: '150px' },
    { key: 'ItemCode', label: 'Item Code', width: '120px' },
    { key: 'RFIDCode', label: 'RFID Code', width: '120px' },
    { key: 'ProductName', label: 'Product Name', width: '150px' },
    { key: 'CategoryName', label: 'Category', width: '120px' },
    { key: 'DesignName', label: 'Design', width: '120px' },
    { key: 'PurityName', label: 'Purity', width: '100px' },
    { key: 'GrossWt', label: 'Gross Wt', width: '100px' },
    { key: 'StoneWt', label: 'Stone Wt', width: '100px' },
    { key: 'DiamondWt', label: 'Diamond Wt', width: '100px' },
    { key: 'NetWt', label: 'Net Wt', width: '100px' },
    { key: 'StoneAmt', label: 'Stone Amt', width: '120px' },
    { key: 'FixedAmt', label: 'Fixed Amt', width: '120px' },
    { key: 'Vendor', label: 'Vendor', width: '120px' },
    { key: 'Branch', label: 'Branch', width: '120px' },
    { key: 'CreatedDate', label: 'Created Date', width: '150px' },
    { key: 'PackingWeight', label: 'Packing Weight', width: '120px' },
    { key: 'TotalWeight', label: 'Total Weight', width: '120px' }
  ];

  // Filter Templates
  const filteredTemplates = templates.filter(template =>
    template.TemplateName?.toLowerCase().includes(searchTemplate.toLowerCase())
  );

  // Filter Products - using server-side data, so filteredProducts is just the current page data
  const filteredProducts = useMemo(() => {
    return labelledStock; // Server-side filtering, so this is already filtered
  }, [labelledStock]);

  // Pagination for products - currentItems is the current page data
  const currentItems = useMemo(() => {
    if (showAllProducts && allFilteredData.length > 0) return allFilteredData;
    return filteredProducts; // Already paginated from server
  }, [filteredProducts, showAllProducts, allFilteredData]);

  const totalProductPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentProductPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentProductPage(1);
  }, [searchProduct]);

  // Handle search with API debouncing
  const handleSearchProductChange = (value) => {
    setSearchProduct(value);
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    // Debounce search - fetch after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      fetchLabelledStock(value);
    }, 500);
  };

  // Download Client Specific PRN
  const handleDownloadClientPrn = () => {
    // Check if client code is supported
    if (clientCode !== 'LS000428' && clientCode !== 'LS000443') {
      toast.error('Your PRN is not set yet. Please set PRN.');
      return;
    }

    // Use selectedItems which contains full item data from all selections (across searches)
    const itemsToDownload = selectedItems.length > 0 ? selectedItems : [];

    if (itemsToDownload.length === 0) {
      toast.error('Please select items to download labels for');
      return;
    }

    try {
      // Generate all PRN contents and combine them into a single file
      const allPrnContents = [];
      
      itemsToDownload.forEach((item, index) => {
        try {
          const prnContent = generateClientPrn(item, clientCode);
          allPrnContents.push(prnContent);
        } catch (err) {
          console.error('Error generating PRN for item:', item, err);
          toast.error(err.message || `Failed to generate label for ${item.ItemCode}`);
        }
      });

      if (allPrnContents.length === 0) {
        toast.error('No valid PRN content generated');
        return;
      }

      // Combine all PRN contents into a single file
      const combinedPrnContent = allPrnContents.join('\n\n');
      
      // Create and download single file
      const blob = new Blob([combinedPrnContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Generate filename with item codes or use generic name
      const itemCodes = itemsToDownload
        .map(item => item.ItemCode || 'label')
        .slice(0, 3)
        .join('_');
      const filename = itemsToDownload.length === 1 
        ? `${itemCodes}_OPJ.prn`
        : `Multiple_Labels_${itemsToDownload.length}_${itemCodes}.prn`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup after a short delay
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      toast.success(`Downloaded ${allPrnContents.length} label(s) in one file`);
    } catch (err) {
      console.error('Error downloading combined PRN:', err);
      toast.error('Failed to download labels');
    }
  };

  // Single Print Label
  const handleSinglePrint = async (e, item) => {
    e.stopPropagation(); // Prevent row selection

    // Check if client code is supported
    if (clientCode !== 'LS000428' && clientCode !== 'LS000443') {
      toast.error('Your PRN is not set yet. Please set PRN.');
      return;
    }

    if (!clientCode) {
      toast.error('Client code not found');
      return;
    }

    if (!item || !item.ItemCode) {
      toast.error('Invalid item selected');
      return;
    }

    setPreviewLoading(true);
    try {
      // Use client-specific PRN template directly
      const prnContent = generateClientPrn(item, clientCode);
      
      // Create and trigger download
      const blob = new Blob([prnContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${item.ItemCode}_OPJ.prn`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup after a short delay
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast.success(`Label for ${item.ItemCode} downloaded successfully`);
    } catch (error) {
      console.error('Error printing label:', error);
      toast.error(error.message || 'Failed to generate label');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div style={{
      padding: '16px',
      fontFamily: 'Inter, system-ui, sans-serif',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '2px solid #e5e7eb',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('templates')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'templates' ? '#667eea' : 'transparent',
            color: activeTab === 'templates' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '15px',
            transition: 'all 0.2s'
          }}
        >
          <FaFileAlt style={{ marginRight: '8px' }} />
          {t('rfidLabel.templates', 'Templates')}
        </button>
        <button
          onClick={() => {
            setActiveTab('generate');
            if (labelledStock.length === 0) {
              fetchLabelledStock();
            }
          }}
          style={{
            padding: '12px 24px',
            background: activeTab === 'generate' ? '#667eea' : 'transparent',
            color: activeTab === 'generate' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '15px',
            transition: 'all 0.2s'
          }}
        >
          <FaPrint style={{ marginRight: '8px' }} />
          {t('rfidLabel.generate', 'Generate Labels')}
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          {/* Unified Header & Action Section */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#1e293b',
                  lineHeight: '1.2'
                }}>Templates</h2>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 600
              }}>
                Total: {templates.length} templates
              </div>
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb'
            }}>
              {/* Search Input */}
              <div style={{
                position: 'relative',
                flex: '1',
                minWidth: windowWidth <= 768 ? '100%' : '250px',
                maxWidth: windowWidth <= 768 ? '100%' : '350px'
              }}>
                <FaSearch style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: '14px',
                  zIndex: 1
                }} />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTemplate}
                  onChange={(e) => setSearchTemplate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              {/* Action Buttons */}
              <button
                onClick={() => {
                  resetTemplateForm();
                  setShowTemplateModal(true);
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #10b981',
                  background: '#ffffff',
                  color: '#10b981',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
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
                <FaPlus /> New Template
              </button>
              <button
                onClick={fetchTemplates}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #64748b',
                  background: '#ffffff',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#64748b';
                  e.target.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ffffff';
                  e.target.style.color = '#64748b';
                }}
              >
                <FaSync /> Refresh
              </button>
            </div>
          </div>

          {/* Templates List */}
          {templateLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <FaSpinner className="fa-spin" style={{ fontSize: '32px', color: '#667eea' }} />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <FaFileAlt style={{ fontSize: '48px', color: '#9ca3af', marginBottom: '16px' }} />
              <p style={{ color: '#6b7280', fontSize: '16px' }}>
                {t('rfidLabel.noTemplates', 'No templates found')}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
              '@media (max-width: 768px)': {
                gridTemplateColumns: '1fr'
              }
            }}>
              {filteredTemplates.map((template) => (
                <div
                  key={template.Id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                      {template.TemplateName}
                    </h3>
                    <span style={{
                      padding: '3px 8px',
                      background: template.IsActive ? '#d1fae5' : '#fee2e2',
                      color: template.IsActive ? '#065f46' : '#991b1b',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600
                    }}>
                      {template.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div style={{ marginBottom: '10px', fontSize: '12px', color: '#64748b' }}>
                    <div style={{ marginBottom: '4px' }}><strong style={{ fontSize: '10px' }}>Type:</strong> {template.TemplateType}</div>
                    <div style={{ marginBottom: '4px' }}><strong style={{ fontSize: '10px' }}>Version:</strong> {template.Version || '1.0'}</div>
                    <div><strong style={{ fontSize: '10px' }}>Fields:</strong> {template.FieldReplacements?.length || 0}</div>
                  </div>

                  {template.FieldReplacements && template.FieldReplacements.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                        Dynamic Fields:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {template.FieldReplacements.map((field, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: '2px 6px',
                              background: '#e0e7ff',
                              color: '#3730a3',
                              borderRadius: '4px',
                              fontSize: '10px'
                            }}
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => handleEditTemplate(template)}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#ffffff',
                        color: '#3b82f6',
                        border: '1px solid #3b82f6',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
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
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template)}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#ffffff',
                        color: '#ef4444',
                        border: '1px solid #ef4444',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
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
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generate Labels Tab */}
      {activeTab === 'generate' && (
        <div>
          <SuccessNotification
            title={successMessage.title}
            message={successMessage.message}
            isVisible={showSuccess}
            onClose={() => setShowSuccess(false)}
          />

          {/* Unified Header & Action Section - Matching LabelStockList */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            position: 'sticky',
            top: '0',
            zIndex: 100,
            transition: 'box-shadow 0.2s'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {/* Left: Title */}
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#1e293b',
                  lineHeight: '1.2'
                }}>Generate Labels</h2>
              </div>

              {/* Right: Total Count */}
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 600
              }}>
                Total: {showAllProducts && allFilteredData.length > 0
                  ? allFilteredData.length
                  : totalRecords} records
              </div>
            </div>

            {/* Action Buttons & Search Row - Single Line */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb'
            }}>
              {/* Search Input */}
              <div style={{
                position: 'relative',
                flex: '0 1 auto',
                minWidth: windowWidth <= 768 ? '100%' : '250px',
                maxWidth: windowWidth <= 768 ? '100%' : '350px'
              }}>
                <FaSearch style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: '14px',
                  zIndex: 1
                }} />
                <input
                  type="text"
                  placeholder="Search by Product Name, Category, Item Code..."
                  value={searchProduct}
                  onChange={e => {
                    const value = e.target.value;
                    setSearchProduct(value);
                    if (searchTimeoutRef.current) {
                      clearTimeout(searchTimeoutRef.current);
                    }
                    // Debounce search - fetch after user stops typing (300ms)
                    searchTimeoutRef.current = setTimeout(() => {
                      setCurrentProductPage(1);
                      fetchLabelledStock(1, productsPerPage, value.trim(), filterValues);
                    }, 300);
                  }}
                  onKeyDown={e => {
                    // Trigger search immediately on Enter key
                    if (e.key === 'Enter') {
                      if (searchTimeoutRef.current) {
                        clearTimeout(searchTimeoutRef.current);
                      }
                      setCurrentProductPage(1);
                      fetchLabelledStock(1, productsPerPage, searchProduct.trim(), filterValues);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#9ca3af'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {/* Buttons Container - Aligned with Search */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                alignItems: 'center',
                marginLeft: 'auto',
                minWidth: 'fit-content'
              }}>
                {/* Export All Report Button */}
                <button
                  onClick={() => {
                    // Export functionality
                    toast.info('Export functionality coming soon');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #3b82f6',
                    background: '#3b82f6',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                  }}
                >
                  <FaFileExport />
                  <span>Export All Report</span>
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => {
                    if (selectedRows.length === 0) {
                      toast.error('Please select items to delete');
                      return;
                    }
                    if (window.confirm(`Are you sure you want to delete ${selectedRows.length} selected item(s)?`)) {
                      toast.info('Delete functionality coming soon');
                    }
                  }}
                  disabled={selectedRows.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #ef4444',
                    background: '#ffffff',
                    color: '#ef4444',
                    cursor: selectedRows.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: selectedRows.length === 0 ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <FaTrash />
                  <span>Delete</span>
                </button>

                {/* Export Button */}
                <button
                  onClick={() => {
                    toast.info('Export functionality coming soon');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #3b82f6',
                    background: '#ffffff',
                    color: '#3b82f6',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <FaFileExport />
                  <span>Export</span>
                </button>

                {/* Report Button */}
                <button
                  onClick={() => {
                    toast.info('Report functionality coming soon');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #f59e0b',
                    background: '#ffffff',
                    color: '#f59e0b',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <FaFilePdf />
                  <span>Report</span>
                </button>

                {/* Filter Button */}
                <button
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #10b981',
                    background: showFilterPanel ? '#10b981' : '#ffffff',
                    color: showFilterPanel ? '#ffffff' : '#10b981',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <FaFilter />
                  <span>Filter</span>
                </button>

                {/* Print Multiple Labels Button - Disabled for LS000443 (use Download OPJ PRN instead) */}
                {clientCode !== 'LS000443' && (
                  <button
                    onClick={() => {
                      if (!selectedTemplateId) {
                        toast.error('Please select a template first');
                        return;
                      }
                      if (selectedItems.length === 0) {
                        toast.error('Please select items to print labels');
                        return;
                      }
                      handleGenerateLabels();
                    }}
                    disabled={selectedItems.length === 0 || !selectedTemplateId || generating}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: '1px solid #10b981',
                      background: (selectedItems.length > 0 && selectedTemplateId && !generating) ? '#10b981' : '#f1f5f9',
                      color: (selectedItems.length > 0 && selectedTemplateId && !generating) ? '#ffffff' : '#94a3b8',
                      cursor: (selectedItems.length === 0 || !selectedTemplateId || generating) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedItems.length > 0 && selectedTemplateId && !generating) {
                        e.target.style.background = '#059669';
                        e.target.style.borderColor = '#059669';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedItems.length > 0 && selectedTemplateId && !generating) {
                        e.target.style.background = '#10b981';
                        e.target.style.borderColor = '#10b981';
                      }
                    }}
                  >
                    {generating ? (
                      <>
                        <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Printing...</span>
                      </>
                    ) : (
                      <>
                        <FaPrint />
                        <span>Print Multiple Labels ({selectedItems.length})</span>
                      </>
                    )}
                  </button>
                )}

                {/* Download OPJ PRN Button - Show for LS000443 and LS000428 */}
                {(clientCode === 'LS000443' || clientCode === 'LS000428') && (
                  <button
                    onClick={handleDownloadClientPrn}
                    disabled={selectedItems.length === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: '1px solid #6366f1',
                      background: selectedItems.length > 0 ? '#6366f1' : '#f1f5f9',
                      color: selectedItems.length > 0 ? '#ffffff' : '#94a3b8',
                      cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedItems.length > 0) {
                        e.target.style.background = '#4f46e5';
                        e.target.style.borderColor = '#4f46e5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedItems.length > 0) {
                        e.target.style.background = '#6366f1';
                        e.target.style.borderColor = '#6366f1';
                      }
                    }}
                  >
                    <FaDownload />
                    <span>Download OPJ PRN ({selectedItems.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Product Selection Table - Matching LabelStockList */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            marginTop: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            overflow: 'visible',
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 280px)',
            minHeight: '400px'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 600
              }}>
                {selectedItems.length} selected of {showAllProducts && allFilteredData.length > 0 ? allFilteredData.length : totalRecords} products
              </div>
              <button
                onClick={handleSelectAll}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #3b82f6',
                  background: '#ffffff',
                  color: '#3b82f6',
                  cursor: 'pointer',
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
                {currentItems.length > 0 && currentItems.every(item => selectedRows.includes(item.Id || item.ItemCode)) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div style={{
              overflowX: 'auto',
              overflowY: 'scroll',
              width: '100%',
              maxWidth: '100%',
              position: 'relative',
              height: '100%',
              flex: 1,
              scrollbarWidth: 'thin',
              scrollbarColor: '#888 #f1f1f1'
            }}>
              {currentItems.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                  No products found
                </div>
              ) : (
                <table style={{
                  width: '100%',
                  minWidth: '1400px',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  tableLayout: 'auto'
                }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{
                      background: '#f8fafc',
                      borderBottom: '2px solid #e5e7eb'
                    }}>
                      <th style={{
                        padding: '12px',
                        textAlign: 'center',
                        width: '40px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#475569'
                      }}>
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            handleSelectAll();
                          }}
                          checked={currentItems.length > 0 && currentItems.every(item => selectedRows.includes(item.Id || item.ItemCode))}
                          style={{
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px'
                          }}
                        />
                      </th>
                      {columns.map((column) => {
                        return (
                          <th
                            key={column.key}
                            style={{
                              padding: '12px',
                              textAlign: 'left',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#475569',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              width: column.width,
                              transition: 'background 0.2s'
                            }}
                            onClick={() => {
                              const direction = sortConfig.key === column.key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                              const newSortConfig = { key: column.key, direction };
                              setSortConfig(newSortConfig);
                              setCurrentProductPage(1);
                              fetchLabelledStock(1, productsPerPage, searchProduct, filterValues, newSortConfig);
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                            onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {column.label}
                              {sortConfig.key === column.key && (
                                <span>
                                  {sortConfig.direction === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                      <th style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#475569',
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        right: 0,
                        background: '#f8fafc',
                        zIndex: 10,
                        width: '120px',
                        borderLeft: '1px solid #e5e7eb'
                      }}>Print Label</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item, index) => {
                      const itemId = item.Id || item.ItemCode;
                      const isSelected = selectedRows.includes(itemId);
                      return (
                        <tr
                          key={itemId}
                          onClick={() => handleRowSelection(itemId)}
                          style={{
                            cursor: 'pointer',
                            borderBottom: '1px solid #e5e7eb',
                            background: isSelected
                              ? '#f3f4f6'
                              : index % 2 === 0
                                ? '#ffffff'
                                : '#f8fafc',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = '#f1f5f9';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                              e.currentTarget.style.background = bgColor;
                            }
                          }}
                        >
                          <td style={{
                            padding: '12px',
                            textAlign: 'center',
                            fontSize: '12px'
                          }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleRowSelection(itemId)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                cursor: 'pointer',
                                width: '16px',
                                height: '16px'
                              }}
                            />
                          </td>
                          {columns.map(column => {
                            return (
                              <td key={column.key} style={{
                                padding: '12px',
                                fontSize: '12px',
                                color: '#1e293b',
                                whiteSpace: 'nowrap'
                              }}>
                                {column.key === 'srNo' ? ((currentProductPage - 1) * productsPerPage) + index + 1 : (() => {
                                  const value = item[column.key];
                                  if (value === undefined || value === null || value === '') return '-';
                                  // Format numeric fields (weights)
                                  if (['GrossWt', 'NetWt', 'StoneWt', 'DiamondWt', 'PackingWeight', 'TotalWeight'].includes(column.key)) {
                                    const numValue = parseFloat(value);
                                    return isNaN(numValue) ? value : numValue.toFixed(3);
                                  }
                                  // Format amount fields
                                  if (['StoneAmt', 'FixedAmt'].includes(column.key)) {
                                    const numValue = parseFloat(value);
                                    return isNaN(numValue) ? value : numValue.toString();
                                  }
                                  // Format date fields
                                  if (column.key === 'CreatedDate' && value) {
                                    try {
                                      const date = new Date(value);
                                      if (!isNaN(date.getTime())) {
                                        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                      }
                                    } catch (e) {
                                      // If date parsing fails, return original value
                                    }
                                  }
                                  return value;
                                })()}
                              </td>
                            );
                          })}
                          <td style={{
                            padding: '12px',
                            textAlign: 'center',
                            position: 'sticky',
                            right: 0,
                            background: isSelected
                              ? '#f3f4f6'
                              : index % 2 === 0
                                ? '#ffffff'
                                : '#f8fafc',
                            zIndex: 5,
                            borderLeft: '1px solid #e5e7eb'
                          }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSinglePrint(e, item);
                              }}
                              disabled={previewLoading}
                              style={{
                                padding: '8px 12px',
                                fontSize: '14px',
                                borderRadius: '6px',
                                border: '1px solid #3b82f6',
                                background: '#ffffff',
                                color: '#3b82f6',
                                cursor: previewLoading ? 'not-allowed' : 'pointer',
                                opacity: previewLoading ? 0.5 : 1,
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                margin: '0 auto'
                              }}
                              onMouseEnter={(e) => {
                                if (!previewLoading) {
                                  e.target.style.background = '#3b82f6';
                                  e.target.style.color = '#ffffff';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!previewLoading) {
                                  e.target.style.background = '#ffffff';
                                  e.target.style.color = '#3b82f6';
                                }
                              }}
                              title="Print Label"
                            >
                              {previewLoading ? (
                                <FaSpinner style={{ animation: 'spin 1s linear infinite' }} size={14} />
                              ) : (
                                <FaPrint size={14} />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                )}
              </div>

            {/* Pagination */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                fontSize: '12px',
                color: '#64748b'
              }}>
                {showAllProducts && allFilteredData.length > 0 ? (
                  <span>
                    Showing all {allFilteredData.length} filtered records
                  </span>
                ) : (
                  <>
                    <span>
                      Showing {((currentProductPage - 1) * productsPerPage) + 1} to {Math.min(currentProductPage * productsPerPage, totalRecords)} of {totalRecords} entries
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Show:</span>
                      <select
                        value={productsPerPage}
                        onChange={(e) => {
                          const newPageSize = parseInt(e.target.value);
                          setProductsPerPage(newPageSize);
                          setCurrentProductPage(1);
                          setLoading(true);
                          fetchLabelledStock(1, newPageSize, searchProduct, filterValues);
                        }}
                        style={{
                          padding: '6px 10px',
                          fontSize: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {PAGE_SIZE_OPTIONS.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                      <span>per page</span>
                    </div>
                  </>
                )}
              </div>

              {!showAllProducts && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => {
                      const newPage = Math.max(currentProductPage - 1, 1);
                      setCurrentProductPage(newPage);
                      setLoading(true);
                      fetchLabelledStock(newPage, productsPerPage, searchProduct, filterValues);
                    }}
                    disabled={currentProductPage === 1}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      background: currentProductPage === 1 ? '#f1f5f9' : '#ffffff',
                      color: currentProductPage === 1 ? '#94a3b8' : '#475569',
                      cursor: currentProductPage === 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                    const page = i + 1;
                    if (totalPages > 10) {
                      if (page === 1 || page === totalPages || (page >= currentProductPage - 1 && page <= currentProductPage + 1)) {
                        return (
                          <button
                            key={page}
                            onClick={() => {
                              setCurrentProductPage(page);
                              setLoading(true);
                              fetchLabelledStock(page, productsPerPage, searchProduct, filterValues);
                            }}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              borderRadius: '6px',
                              border: '1px solid',
                              background: currentProductPage === page ? '#9ca3af' : '#ffffff',
                              color: currentProductPage === page ? '#ffffff' : '#475569',
                              borderColor: currentProductPage === page ? '#9ca3af' : '#e2e8f0',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              minWidth: '36px'
                            }}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentProductPage - 2 || page === currentProductPage + 2) {
                        return <span key={`ellipsis-${page}`} style={{ padding: '6px 8px', fontSize: '12px', color: '#94a3b8' }}>...</span>;
                      }
                      return null;
                    } else {
                      return (
                        <button
                          key={page}
                          onClick={() => {
                            setCurrentProductPage(page);
                            setLoading(true);
                            fetchLabelledStock(page, productsPerPage, searchProduct, filterValues);
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid',
                            background: currentProductPage === page ? '#9ca3af' : '#ffffff',
                            color: currentProductPage === page ? '#ffffff' : '#475569',
                            borderColor: currentProductPage === page ? '#9ca3af' : '#e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            minWidth: '36px'
                          }}
                        >
                          {page}
                        </button>
                      );
                    }
                  })}
                  <button
                    onClick={() => {
                      const newPage = Math.min(currentProductPage + 1, totalPages);
                      setCurrentProductPage(newPage);
                      setLoading(true);
                      fetchLabelledStock(newPage, productsPerPage, searchProduct, filterValues);
                    }}
                    disabled={currentProductPage === totalPages}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      background: currentProductPage === totalPages ? '#f1f5f9' : '#ffffff',
                      color: currentProductPage === totalPages ? '#94a3b8' : '#475569',
                      cursor: currentProductPage === totalPages ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filter Slider - Right Side */}
          {showFilterPanel && (
            <>
              {/* Overlay */}
              <div
                onClick={() => {
                  closeAllDropdowns();
                  setShowFilterPanel(false);
                }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 9998,
                  animation: 'fadeIn 0.3s ease'
                }}
              />
              {/* Filter Slider Panel */}
              <div style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: windowWidth <= 768 ? '100%' : '400px',
                maxWidth: '90vw',
                height: '100vh',
                background: '#ffffff',
                boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.1)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideInRight 0.3s ease',
                overflowY: 'auto'
              }}>
                {/* Filter Header */}
                <div style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaFilter style={{ color: '#ffffff', fontSize: '16px' }} />
                    <h6 style={{
                      margin: 0,
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#ffffff'
                    }}>Filter Options</h6>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilterPanel(false)}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      borderRadius: '6px',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#ffffff',
                      fontSize: '16px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
                {/* Filter Content */}
                <div style={{ padding: '20px', flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    {/* Branch Filter */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '6px'
                      }}>Branch</label>
                      <select
                        value={filterValues.branch}
                        onChange={e => handleFilterChange('branch', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          outline: 'none',
                          background: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="All">All Branches</option>
                        {apiFilterData.branches?.map((branch) => (
                          <option key={branch.Id || branch.id} value={branch.BranchName || branch.Name || branch.branchName || branch.name}>
                            {branch.BranchName || branch.Name || branch.branchName || branch.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Counter Name Filter */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '6px'
                      }}>Counter Name</label>
                      <select
                        value={filterValues.counterName}
                        onChange={e => handleFilterChange('counterName', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          outline: 'none',
                          background: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="All">All Counters</option>
                        {apiFilterData.counters?.map((counter) => (
                          <option key={counter.Id || counter.id} value={counter.CounterName || counter.Name || counter.counterName}>
                            {counter.CounterName || counter.Name || counter.counterName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '6px'
                      }}>Category</label>
                      <select
                        value={filterValues.categoryId}
                        onChange={e => handleFilterChange('categoryId', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          outline: 'none',
                          background: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="All">All Categories</option>
                        {apiFilterData.categories?.map((category) => (
                          <option key={category.Id || category.id} value={category.CategoryName || category.Name || category.categoryName}>
                            {category.CategoryName || category.Name || category.categoryName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Product Filter */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '6px'
                      }}>Product Name</label>
                      <select
                        value={filterValues.productId}
                        onChange={e => handleFilterChange('productId', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          outline: 'none',
                          background: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="All">All Products</option>
                        {apiFilterData.products?.map((product) => (
                          <option key={product.Id || product.id} value={product.ProductName || product.Name || product.productName}>
                            {product.ProductName || product.Name || product.productName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Design Filter */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '6px'
                      }}>Design</label>
                      <select
                        value={filterValues.designId}
                        onChange={e => handleFilterChange('designId', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          outline: 'none',
                          background: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="All">All Designs</option>
                        {apiFilterData.designs?.map((design) => (
                          <option key={design.Id || design.id} value={design.DesignName || design.Name || design.designName}>
                            {design.DesignName || design.Name || design.designName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Purity Filter */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '6px'
                      }}>Purity</label>
                      <select
                        value={filterValues.purityId}
                        onChange={e => handleFilterChange('purityId', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          outline: 'none',
                          background: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="All">All Purities</option>
                        {apiFilterData.purities?.map((purity) => (
                          <option key={purity.Id || purity.id} value={purity.PurityName || purity.Name || purity.Purity || purity.purityName}>
                            {purity.PurityName || purity.Name || purity.Purity || purity.purityName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '6px'
                      }}>Status</label>
                      <select
                        value={filterValues.status}
                        onChange={e => handleFilterChange('status', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          outline: 'none',
                          background: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="All">All</option>
                        <option value="ApiActive">ApiActive</option>
                        <option value="Sold">Sold</option>
                      </select>
                    </div>

                    {/* From Date */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '6px'
                      }}>From Date</label>
                      <input
                        type="date"
                        value={filterValues.dateFrom}
                        onChange={e => handleFilterChange('dateFrom', e.target.value)}
                        max={filterValues.dateTo || undefined}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          outline: 'none',
                          background: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* To Date */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '6px'
                      }}>To Date</label>
                      <input
                        type="date"
                        value={filterValues.dateTo}
                        onChange={e => handleFilterChange('dateTo', e.target.value)}
                        min={filterValues.dateFrom || undefined}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          outline: 'none',
                          background: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <button
                      onClick={handleResetFilters}
                      style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleApplyFilters}
                      style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: 'none',
                        background: '#10b981',
                        color: '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Generated Labels Results */}
          {generatedLabels.length > 0 && (
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                  {t('rfidLabel.generatedLabels', 'Generated Labels')}
                </h3>
                <button
                  onClick={handleDownloadAllPRN}
                  style={{
                    padding: '8px 16px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <FaDownload />
                  {t('rfidLabel.downloadAll', 'Download All')}
                </button>
              </div>

              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>ItemCode</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Hex Code</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedLabels.map((label, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600 }}>{label.ItemCode}</td>
                        <td style={{ padding: '12px' }}>
                          {label.IsSuccess ? (
                            <span style={{
                              padding: '4px 8px',
                              background: '#d1fae5',
                              color: '#065f46',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}>
                              Success
                            </span>
                          ) : (
                            <span style={{
                              padding: '4px 8px',
                              background: '#fee2e2',
                              color: '#991b1b',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}>
                              Failed
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontSize: '12px', fontFamily: 'monospace' }}>
                          {label.HexCode || '-'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {label.IsSuccess && label.GeneratedPrnCode && (
                            <button
                              onClick={() => handleDownloadPRN(label, index)}
                              style={{
                                padding: '6px 12px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <FaDownload />
                              {t('common.download', 'Download')}
                            </button>
                          )}
                          {!label.IsSuccess && (
                            <span style={{ fontSize: '12px', color: '#ef4444' }}>
                              {label.ErrorMessage || 'Failed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Template Slider - Right Side */}
      {showTemplateModal && (
        <>
          <div
            onClick={() => {
              setShowTemplateModal(false);
              resetTemplateForm();
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              animation: 'fadeIn 0.3s ease'
            }}
          />
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: windowWidth <= 768 ? '100%' : '500px',
            maxWidth: '90vw',
            height: '100vh',
            background: '#ffffff',
            boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInRight 0.3s ease',
            overflowY: 'auto'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaFileAlt style={{ color: '#ffffff', fontSize: '16px' }} />
                <h6 style={{
                  margin: 0,
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#ffffff'
                }}>
                  {isEditing ? 'Edit Template' : 'New Template'}
                </h6>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTemplateModal(false);
                  resetTemplateForm();
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ffffff',
                  fontSize: '16px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              >
                <FaTimes />
              </button>
            </div>
            <div style={{ padding: '20px', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Template Name */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600,
                    fontSize: '10px',
                    color: '#475569'
                  }}>
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateForm.TemplateName}
                    onChange={(e) => handleTemplateFormChange('TemplateName', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    placeholder="e.g., Standard RFID Label Template"
                  />
                </div>

                {/* Template Type */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600,
                    fontSize: '10px',
                    color: '#475569'
                  }}>
                    Template Type
                  </label>
                  <input
                    type="text"
                    value={templateForm.TemplateType}
                    onChange={(e) => handleTemplateFormChange('TemplateType', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    placeholder="RFID"
                  />
                </div>

                {/* PRN Code */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{
                      fontWeight: 600,
                      fontSize: '10px',
                      color: '#475569'
                    }}>
                      PRN Code *
                    </label>
                    <button
                      onClick={handlePRNCodeSelect}
                      style={{
                        padding: '6px 12px',
                        background: '#ffffff',
                        color: '#667eea',
                        border: '1px solid #667eea',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#667eea';
                        e.target.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#ffffff';
                        e.target.style.color = '#667eea';
                      }}
                      title="Select quoted text and click to make it dynamic"
                    >
                      <FaCode /> Configure Fields
                    </button>
                  </div>
                  <textarea
                    ref={prnCodeRef}
                    value={templateForm.PrnCode}
                    onChange={(e) => handleTemplateFormChange('PrnCode', e.target.value)}
                    onSelect={handlePRNCodeSelect}
                    style={{
                      width: '100%',
                      minHeight: '150px',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      resize: 'vertical',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    placeholder="Paste PRN code from Bartender application here..."
                  />
                  <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                    Select quoted text and click "Configure Fields" to make it dynamic
                  </p>
                </div>

                {/* Dynamic Fields */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600,
                    fontSize: '10px',
                    color: '#475569'
                  }}>
                    Dynamic Fields
                  </label>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    padding: '10px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    minHeight: '50px'
                  }}>
                    {templateForm.FieldReplacements.map((field, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '4px 8px',
                          background: '#e0e7ff',
                          color: '#3730a3',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {`${'{'}${field}${'}'}`}
                        <button
                          onClick={() => handleRemoveField(field)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3730a3',
                            cursor: 'pointer',
                            fontSize: '10px',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <FaTimes />
                        </button>
                      </span>
                    ))}
                    {templateForm.FieldReplacements.length === 0 && (
                      <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                        No dynamic fields configured. Select text in PRN code to add fields.
                      </span>
                    )}
                  </div>
                </div>

                {/* Available Fields */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600,
                    fontSize: '10px',
                    color: '#475569'
                  }}>
                    Available Fields
                  </label>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    padding: '10px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {availableFields.map((field) => (
                      <button
                        key={field}
                        onClick={() => handleAddField(field)}
                        disabled={templateForm.FieldReplacements.includes(field)}
                        style={{
                          padding: '4px 8px',
                          background: templateForm.FieldReplacements.includes(field) ? '#d1d5db' : '#ffffff',
                          color: templateForm.FieldReplacements.includes(field) ? '#9ca3af' : '#667eea',
                          border: `1px solid ${templateForm.FieldReplacements.includes(field) ? '#d1d5db' : '#667eea'}`,
                          borderRadius: '4px',
                          cursor: templateForm.FieldReplacements.includes(field) ? 'not-allowed' : 'pointer',
                          fontSize: '10px',
                          fontWeight: 600,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!templateForm.FieldReplacements.includes(field)) {
                            e.target.style.background = '#667eea';
                            e.target.style.color = '#ffffff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!templateForm.FieldReplacements.includes(field)) {
                            e.target.style.background = '#ffffff';
                            e.target.style.color = '#667eea';
                          }
                        }}
                      >
                        {field}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Option */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600,
                    fontSize: '10px',
                    color: '#475569'
                  }}>
                    Save Option
                  </label>
                  <select
                    value={templateForm.SaveOption}
                    onChange={(e) => handleTemplateFormChange('SaveOption', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box',
                      background: '#ffffff',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  >
                    <option value="single">Single (All Products)</option>
                    <option value="category">Category Specific</option>
                    <option value="categoryProduct">Category & Product Specific</option>
                  </select>
                </div>

                {/* Active Status */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={templateForm.IsActive}
                      onChange={(e) => handleTemplateFormChange('IsActive', e.target.checked)}
                      style={{
                        cursor: 'pointer',
                        width: '16px',
                        height: '16px'
                      }}
                    />
                    <span style={{
                      fontWeight: 600,
                      fontSize: '12px',
                      color: '#475569'
                    }}>
                      Active Template
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <button
                    onClick={handleSaveTemplate}
                    disabled={templateLoading}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      background: templateLoading ? '#f1f5f9' : '#ffffff',
                      color: templateLoading ? '#94a3b8' : '#10b981',
                      border: `1px solid ${templateLoading ? '#cbd5e1' : '#10b981'}`,
                      borderRadius: '8px',
                      cursor: templateLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!templateLoading) {
                        e.target.style.background = '#10b981';
                        e.target.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!templateLoading) {
                        e.target.style.background = '#ffffff';
                        e.target.style.color = '#10b981';
                      }
                    }}
                  >
                    {templateLoading ? (
                      <>
                        <FaSpinner className="fa-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <FaSave /> Save
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowTemplateModal(false);
                      resetTemplateForm();
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      background: '#ffffff',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '12px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#f1f5f9';
                      e.target.style.borderColor = '#94a3b8';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#ffffff';
                      e.target.style.borderColor = '#cbd5e1';
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Field Selection Modal */}
      {showFieldModal && selectedText && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: '16px',
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: isMobile ? '16px' : '24px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            margin: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {t('rfidLabel.selectField', 'Select Field')}
              </h3>
              <button
                onClick={() => {
                  setShowFieldModal(false);
                  setSelectedText(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                <FaTimes />
              </button>
            </div>
            <p style={{ marginBottom: '16px', fontSize: '14px', color: '#6b7280' }}>
              Replace "{selectedText.text}" with:
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: '8px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {availableFields.map((field) => (
                <button
                  key={field}
                  onClick={() => handleReplaceWithField(field)}
                  style={{
                    padding: '10px',
                    background: '#f3f4f6',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#667eea';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = '#667eea';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.color = 'inherit';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  {`${'{'}${field}${'}'}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        *::-webkit-scrollbar {
          display: none;
        }
        body, html {
          overflow-x: hidden;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .template-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 480px) {
          .template-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default RFIDLabel;
