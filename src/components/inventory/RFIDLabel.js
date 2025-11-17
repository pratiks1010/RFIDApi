import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
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
  FaCode
} from 'react-icons/fa';
import { rfidLabelService } from '../../services/rfidLabelService';
import { useTranslation } from '../../hooks/useTranslation';
import { useNotifications } from '../../context/NotificationContext';

const RFIDLabel = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotifications();
  
  // User Info
  const [userInfo, setUserInfo] = useState(null);
  const clientCode = userInfo?.ClientCode || '';

  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Tab Management
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' or 'generate'

  // Template Management
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
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
  const [generatedLabels, setGeneratedLabels] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');
  
  // Pagination for products
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(50);

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
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (clientCode) {
      fetchTemplates();
      if (activeTab === 'generate') {
        fetchLabelledStock();
      }
    }
  }, [clientCode, activeTab]);

  // Fetch Templates
  const fetchTemplates = async () => {
    if (!clientCode) return;
    
    setLoading(true);
    try {
      const data = await rfidLabelService.getAllTemplates(clientCode);
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error(error.response?.data?.Message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Labelled Stock
  const fetchLabelledStock = async () => {
    if (!clientCode) return;
    
    try {
      const data = await rfidLabelService.getLabelledStock(clientCode, 'ApiActive');
      setLabelledStock(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching labelled stock:', error);
      toast.error('Failed to load products');
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

    setLoading(true);
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
      setLoading(false);
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

    if (selectedItems.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    if (!clientCode) {
      toast.error('Client code not found');
      return;
    }

    setGenerating(true);
    try {
      const itemCodes = selectedItems.map(item => item.ItemCode);
      
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

  // Select All Products
  const handleSelectAll = () => {
    if (selectedItems.length === filteredProducts.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...filteredProducts]);
    }
  };

  // Filter Templates
  const filteredTemplates = templates.filter(template =>
    template.TemplateName?.toLowerCase().includes(searchTemplate.toLowerCase())
  );

  // Filter Products
  const filteredProducts = labelledStock.filter(item =>
    item.ItemCode?.toLowerCase().includes(searchProduct.toLowerCase()) ||
    item.ProductName?.toLowerCase().includes(searchProduct.toLowerCase())
  );

  // Pagination for products
  const totalProductPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentProductPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentProductPage(1);
  }, [searchProduct]);

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
          {/* Actions Bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: '1 1 300px', minWidth: '200px', position: 'relative' }}>
              <FaSearch style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                fontSize: '14px'
              }} />
              <input
                type="text"
                placeholder={t('rfidLabel.searchTemplates', 'Search templates...')}
                value={searchTemplate}
                onChange={(e) => setSearchTemplate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  resetTemplateForm();
                  setShowTemplateModal(true);
                }}
                style={{
                  padding: '10px 16px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap'
                }}
              >
                <FaPlus />
                {t('rfidLabel.newTemplate', 'New Template')}
              </button>
              <button
                onClick={fetchTemplates}
                style={{
                  padding: '10px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap'
                }}
              >
                <FaSync />
                {t('common.refresh', 'Refresh')}
              </button>
            </div>
          </div>

          {/* Templates List */}
          {loading ? (
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
                    padding: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    border: '1px solid #e5e7eb',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1f2937' }}>
                      {template.TemplateName}
                    </h3>
                    <span style={{
                      padding: '4px 8px',
                      background: template.IsActive ? '#d1fae5' : '#fee2e2',
                      color: template.IsActive ? '#065f46' : '#991b1b',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      {template.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                    <div><strong>Type:</strong> {template.TemplateType}</div>
                    <div><strong>Version:</strong> {template.Version || '1.0'}</div>
                    <div><strong>Fields:</strong> {template.FieldReplacements?.length || 0}</div>
                  </div>

                  {template.FieldReplacements && template.FieldReplacements.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                        Dynamic Fields:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {template.FieldReplacements.map((field, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: '2px 8px',
                              background: '#e0e7ff',
                              color: '#3730a3',
                              borderRadius: '4px',
                              fontSize: '11px'
                            }}
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button
                      onClick={() => handleEditTemplate(template)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaEdit />
                      {t('common.edit', 'Edit')}
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaTrash />
                      {t('common.delete', 'Delete')}
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
          {/* Template Selection - Compact */}
          <div style={{ 
            background: 'white', 
            padding: isMobile ? '12px' : '14px', 
            borderRadius: '8px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <label style={{ 
              fontWeight: 600, 
              fontSize: '13px',
              color: '#374151',
              whiteSpace: 'nowrap',
              minWidth: '100px'
            }}>
              {t('rfidLabel.selectTemplate', 'Select Template')}:
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              style={{
                flex: 1,
                minWidth: '200px',
                maxWidth: isMobile ? '100%' : '300px',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '13px',
                background: 'white'
              }}
            >
              <option value="">{t('rfidLabel.chooseTemplate', 'Choose a template...')}</option>
              {templates.filter(t => t.IsActive).map((template) => (
                <option key={template.Id} value={template.Id}>
                  {template.TemplateName} (v{template.Version || '1.0'})
                </option>
              ))}
            </select>
          </div>

          {/* Product Selection */}
          <div style={{ 
            background: 'white', 
            padding: isMobile ? '16px' : '20px', 
            borderRadius: '12px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                {t('rfidLabel.selectProducts', 'Select Products')}
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: 400, 
                  color: '#6b7280',
                  marginLeft: '8px'
                }}>
                  ({filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'})
                </span>
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ 
                  fontSize: '13px', 
                  color: '#6b7280', 
                  whiteSpace: 'nowrap',
                  fontWeight: 500
                }}>
                  {selectedItems.length} selected
                </span>
                <button
                  onClick={handleSelectAll}
                  style={{
                    padding: '6px 12px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    minWidth: 'auto'
                  }}
                >
                  {selectedItems.length === filteredProducts.length && filteredProducts.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <FaSearch style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                fontSize: '14px',
                zIndex: 1
              }} />
              <input
                type="text"
                placeholder={t('rfidLabel.searchProducts', 'Search by ItemCode or Product Name...')}
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ 
              maxHeight: isMobile ? '400px' : '500px', 
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflowX: 'auto',
              background: '#fafafa'
            }}>
              {filteredProducts.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  {t('rfidLabel.noProducts', 'No products found')}
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div style={{ display: !isMobile ? 'block' : 'none' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px', background: 'white' }}>
                      <thead style={{ background: '#f9fafb', position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600, width: '40px' }}>
                            <input
                              type="checkbox"
                              checked={selectedItems.length === filteredProducts.length && filteredProducts.length > 0}
                              onChange={handleSelectAll}
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                          </th>
                          <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>ItemCode</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Product Name</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Gross Wt</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Net Wt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedProducts.map((item) => {
                          const isSelected = selectedItems.some(p => p.ItemCode === item.ItemCode);
                          return (
                            <tr
                              key={item.ItemCode}
                              style={{
                                background: isSelected ? '#eff6ff' : 'white',
                                borderBottom: '1px solid #e5e7eb',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease'
                              }}
                              onClick={() => handleToggleProduct(item)}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.background = '#f9fafb';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.background = 'white';
                              }}
                            >
                              <td style={{ padding: '10px' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleProduct(item)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                />
                              </td>
                              <td style={{ padding: '10px', fontSize: '13px', fontWeight: 600 }}>{item.ItemCode}</td>
                              <td style={{ padding: '10px', fontSize: '13px' }}>{item.ProductName || '-'}</td>
                              <td style={{ padding: '10px', fontSize: '13px' }}>{item.GrossWt || '-'}</td>
                              <td style={{ padding: '10px', fontSize: '13px' }}>{item.NetWt || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile Card View */}
                  <div style={{ display: isMobile ? 'block' : 'none', padding: '8px' }}>
                    {paginatedProducts.map((item) => {
                      const isSelected = selectedItems.some(p => p.ItemCode === item.ItemCode);
                      return (
                        <div
                          key={item.ItemCode}
                          onClick={() => handleToggleProduct(item)}
                          style={{
                            background: isSelected ? '#eff6ff' : 'white',
                            border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleProduct(item)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{item.ItemCode}</div>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{item.ProductName || '-'}</div>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#9ca3af' }}>
                              <span>GW: {item.GrossWt || '-'}</span>
                              <span>NW: {item.NetWt || '-'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredProducts.length > productsPerPage && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
                padding: '12px',
                background: '#f9fafb',
                borderRadius: '8px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
                  </span>
                  <select
                    value={productsPerPage}
                    onChange={(e) => {
                      setProductsPerPage(Number(e.target.value));
                      setCurrentProductPage(1);
                    }}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: 'white'
                    }}
                  >
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={200}>200 per page</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={() => setCurrentProductPage(prev => Math.max(1, prev - 1))}
                    disabled={currentProductPage === 1}
                    style={{
                      padding: '6px 12px',
                      background: currentProductPage === 1 ? '#e5e7eb' : '#3b82f6',
                      color: currentProductPage === 1 ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: currentProductPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '13px', color: '#6b7280', padding: '0 8px' }}>
                    Page {currentProductPage} of {totalProductPages}
                  </span>
                  <button
                    onClick={() => setCurrentProductPage(prev => Math.min(totalProductPages, prev + 1))}
                    disabled={currentProductPage === totalProductPages}
                    style={{
                      padding: '6px 12px',
                      background: currentProductPage === totalProductPages ? '#e5e7eb' : '#3b82f6',
                      color: currentProductPage === totalProductPages ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: currentProductPage === totalProductPages ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Generate Button - Compact */}
          <div style={{ 
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleGenerateLabels}
              disabled={!selectedTemplateId || selectedItems.length === 0 || generating}
              style={{
                padding: isMobile ? '10px 20px' : '12px 32px',
                background: (!selectedTemplateId || selectedItems.length === 0 || generating) ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (!selectedTemplateId || selectedItems.length === 0 || generating) ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: isMobile ? '14px' : '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minWidth: 'auto',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: (!selectedTemplateId || selectedItems.length === 0 || generating) ? 'none' : '0 2px 4px rgba(16, 185, 129, 0.3)'
              }}
              onMouseEnter={(e) => {
                if (!(!selectedTemplateId || selectedItems.length === 0 || generating)) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!(!selectedTemplateId || selectedItems.length === 0 || generating)) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.3)';
                }
              }}
            >
              {generating ? (
                <>
                  <FaSpinner className="fa-spin" />
                  {t('rfidLabel.generating', 'Generating...')}
                </>
              ) : (
                <>
                  <FaPrint />
                  {t('rfidLabel.generateLabels', 'Generate Labels')} ({selectedItems.length})
                </>
              )}
            </button>
          </div>

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

      {/* Template Modal */}
      {showTemplateModal && (
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
          zIndex: 1000,
          padding: '16px',
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: isMobile ? '16px' : '24px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            margin: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
                {isEditing ? t('rfidLabel.editTemplate', 'Edit Template') : t('rfidLabel.newTemplate', 'New Template')}
              </h2>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  resetTemplateForm();
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Template Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                  {t('rfidLabel.templateName', 'Template Name')} *
                </label>
                <input
                  type="text"
                  value={templateForm.TemplateName}
                  onChange={(e) => handleTemplateFormChange('TemplateName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="e.g., Standard RFID Label Template"
                />
              </div>

              {/* Template Type */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                  {t('rfidLabel.templateType', 'Template Type')}
                </label>
                <input
                  type="text"
                  value={templateForm.TemplateType}
                  onChange={(e) => handleTemplateFormChange('TemplateType', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="RFID"
                />
              </div>

              {/* PRN Code */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: 600, fontSize: '14px' }}>
                    {t('rfidLabel.prnCode', 'PRN Code')} *
                  </label>
                  <button
                    onClick={handlePRNCodeSelect}
                    style={{
                      padding: '6px 12px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Select quoted text and click to make it dynamic"
                  >
                    <FaCode />
                    Configure Fields
                  </button>
                </div>
                <textarea
                  ref={prnCodeRef}
                  value={templateForm.PrnCode}
                  onChange={(e) => handleTemplateFormChange('PrnCode', e.target.value)}
                  onSelect={handlePRNCodeSelect}
                  style={{
                    width: '100%',
                    minHeight: '200px',
                    padding: '10px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    resize: 'vertical'
                  }}
                  placeholder="Paste PRN code from Bartender application here..."
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Select quoted text and click "Configure Fields" to make it dynamic
                </p>
              </div>

              {/* Dynamic Fields */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                  {t('rfidLabel.dynamicFields', 'Dynamic Fields')}
                </label>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px',
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  minHeight: '60px'
                }}>
                  {templateForm.FieldReplacements.map((field, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '6px 12px',
                        background: '#e0e7ff',
                        color: '#3730a3',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
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
                          fontSize: '14px',
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
                    <span style={{ color: '#9ca3af', fontSize: '13px' }}>
                      No dynamic fields configured. Select text in PRN code to add fields.
                    </span>
                  )}
                </div>
              </div>

              {/* Available Fields */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                  {t('rfidLabel.availableFields', 'Available Fields')}
                </label>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px',
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px'
                }}>
                  {availableFields.map((field) => (
                    <button
                      key={field}
                      onClick={() => handleAddField(field)}
                      disabled={templateForm.FieldReplacements.includes(field)}
                      style={{
                        padding: '6px 12px',
                        background: templateForm.FieldReplacements.includes(field) ? '#d1d5db' : '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: templateForm.FieldReplacements.includes(field) ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        opacity: templateForm.FieldReplacements.includes(field) ? 0.5 : 1
                      }}
                    >
                      {field}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Option */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                  {t('rfidLabel.saveOption', 'Save Option')}
                </label>
                <select
                  value={templateForm.SaveOption}
                  onChange={(e) => handleTemplateFormChange('SaveOption', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value="single">Single (All Products)</option>
                  <option value="category">Category Specific</option>
                  <option value="categoryProduct">Category & Product Specific</option>
                </select>
              </div>

              {/* Active Status */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={templateForm.IsActive}
                    onChange={(e) => handleTemplateFormChange('IsActive', e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>
                    {t('rfidLabel.isActive', 'Active Template')}
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={handleSaveTemplate}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: loading ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {loading ? (
                    <>
                      <FaSpinner className="fa-spin" />
                      {t('common.saving', 'Saving...')}
                    </>
                  ) : (
                    <>
                      <FaSave />
                      {t('common.save', 'Save')}
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
                    padding: '12px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '15px'
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default RFIDLabel;
