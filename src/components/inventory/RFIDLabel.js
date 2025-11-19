import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const searchTimeoutRef = useRef(null);

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
      setWindowWidth(window.innerWidth);
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
  const fetchLabelledStock = async (search = '') => {
    if (!clientCode) return;
    
    try {
      const data = await rfidLabelService.getLabelledStock(clientCode, 'ApiActive', search);
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

  // Filter Products (client-side filtering for now, can be enhanced with API)
  const filteredProducts = useMemo(() => {
    return labelledStock.filter(item =>
      item.ItemCode?.toLowerCase().includes(searchProduct.toLowerCase()) ||
      item.ProductName?.toLowerCase().includes(searchProduct.toLowerCase())
    );
  }, [labelledStock, searchProduct]);

  // Pagination for products
  const totalProductPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentProductPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

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
                }}>Generate Labels</h2>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 600
              }}>
                Total: {labelledStock.length} products
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
              {/* Template Selection */}
              <div style={{
                minWidth: windowWidth <= 768 ? '100%' : '250px',
                maxWidth: windowWidth <= 768 ? '100%' : '300px'
              }}>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    background: '#ffffff',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                >
                  <option value="">Choose a template...</option>
                  {templates.filter(t => t.IsActive).map((template) => (
                    <option key={template.Id} value={template.Id}>
                      {template.TemplateName} (v{template.Version || '1.0'})
                    </option>
                  ))}
                </select>
              </div>
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
                  placeholder="Search by ItemCode or Product Name..."
                  value={searchProduct}
                  onChange={(e) => handleSearchProductChange(e.target.value)}
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
              {/* Generate Button - Moved Above */}
              <button
                onClick={handleGenerateLabels}
                disabled={!selectedTemplateId || selectedItems.length === 0 || generating}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #10b981',
                  background: (!selectedTemplateId || selectedItems.length === 0 || generating) ? '#f1f5f9' : '#ffffff',
                  color: (!selectedTemplateId || selectedItems.length === 0 || generating) ? '#94a3b8' : '#10b981',
                  cursor: (!selectedTemplateId || selectedItems.length === 0 || generating) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!(!selectedTemplateId || selectedItems.length === 0 || generating)) {
                    e.target.style.background = '#10b981';
                    e.target.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(!selectedTemplateId || selectedItems.length === 0 || generating)) {
                    e.target.style.background = '#ffffff';
                    e.target.style.color = '#10b981';
                  }
                }}
              >
                {generating ? (
                  <>
                    <FaSpinner className="fa-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <FaPrint /> Generate Labels ({selectedItems.length})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Product Selection Table */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            marginTop: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
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
                {selectedItems.length} selected of {filteredProducts.length} products
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
                {selectedItems.length === filteredProducts.length && filteredProducts.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div style={{ overflowX: 'auto', overflowY: 'visible', width: '100%', maxWidth: '100%' }}>
              {filteredProducts.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                  No products found
                </div>
              ) : (
                <table style={{ 
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  tableLayout: 'auto'
                }}>
                  <thead>
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
                          checked={selectedItems.length === filteredProducts.length && filteredProducts.length > 0}
                          onChange={handleSelectAll}
                          style={{
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px'
                          }}
                        />
                      </th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#475569',
                        whiteSpace: 'nowrap'
                      }}>ItemCode</th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#475569',
                        whiteSpace: 'nowrap'
                      }}>Product Name</th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#475569',
                        whiteSpace: 'nowrap'
                      }}>Gross Wt</th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#475569',
                        whiteSpace: 'nowrap'
                      }}>Net Wt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((item, index) => {
                      const isSelected = selectedItems.some(p => p.ItemCode === item.ItemCode);
                      return (
                        <tr
                          key={item.ItemCode}
                          onClick={() => handleToggleProduct(item)}
                          style={{
                            cursor: 'pointer',
                            borderBottom: '1px solid #e5e7eb',
                            background: isSelected 
                              ? '#eff6ff' 
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
                              e.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : '#f8fafc';
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
                              onChange={() => handleToggleProduct(item)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                cursor: 'pointer',
                                width: '16px',
                                height: '16px'
                              }}
                            />
                          </td>
                          <td style={{
                            padding: '12px',
                            fontSize: '12px',
                            color: '#1e293b',
                            whiteSpace: 'nowrap',
                            fontWeight: 600
                          }}>{item.ItemCode}</td>
                          <td style={{
                            padding: '12px',
                            fontSize: '12px',
                            color: '#1e293b',
                            whiteSpace: 'nowrap'
                          }}>{item.ProductName || '-'}</td>
                          <td style={{
                            padding: '12px',
                            fontSize: '12px',
                            color: '#1e293b',
                            whiteSpace: 'nowrap'
                          }}>{item.GrossWt || '-'}</td>
                          <td style={{
                            padding: '12px',
                            fontSize: '12px',
                            color: '#1e293b',
                            whiteSpace: 'nowrap'
                          }}>{item.NetWt || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {filteredProducts.length > productsPerPage && (
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
                  <span>
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Show:</span>
                    <select
                      value={productsPerPage}
                      onChange={(e) => {
                        setProductsPerPage(Number(e.target.value));
                        setCurrentProductPage(1);
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
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                    <span>per page</span>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => setCurrentProductPage(prev => Math.max(1, prev - 1))}
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
                    onMouseEnter={(e) => {
                      if (currentProductPage !== 1) {
                        e.target.style.background = '#f8fafc';
                        e.target.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentProductPage !== 1) {
                        e.target.style.background = '#ffffff';
                        e.target.style.borderColor = '#e2e8f0';
                      }
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '12px', color: '#64748b', padding: '0 8px' }}>
                    Page {currentProductPage} of {totalProductPages}
                  </span>
                  <button
                    onClick={() => setCurrentProductPage(prev => Math.min(totalProductPages, prev + 1))}
                    disabled={currentProductPage === totalProductPages}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      background: currentProductPage === totalProductPages ? '#f1f5f9' : '#ffffff',
                      color: currentProductPage === totalProductPages ? '#94a3b8' : '#475569',
                      cursor: currentProductPage === totalProductPages ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (currentProductPage !== totalProductPages) {
                        e.target.style.background = '#f8fafc';
                        e.target.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentProductPage !== totalProductPages) {
                        e.target.style.background = '#ffffff';
                        e.target.style.borderColor = '#e2e8f0';
                      }
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      background: loading ? '#f1f5f9' : '#ffffff',
                      color: loading ? '#94a3b8' : '#10b981',
                      border: `1px solid ${loading ? '#cbd5e1' : '#10b981'}`,
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.background = '#10b981';
                        e.target.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.target.style.background = '#ffffff';
                        e.target.style.color = '#10b981';
                      }
                    }}
                  >
                    {loading ? (
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
