import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  FaSync,
  FaFolder,
  FaSave,
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaToggleOn,
  FaToggleOff,
  FaHistory,
  FaFileExcel
} from 'react-icons/fa';
import { useLoading } from '../App';

const AutomaticDataSync = () => {
  const { setLoading } = useLoading();
  const [userInfo, setUserInfo] = useState(null);
  const [clientCode, setClientCode] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [fieldMappings, setFieldMappings] = useState({});
  const [excelPath, setExcelPath] = useState('');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [syncHistory, setSyncHistory] = useState([]);
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'monitoring' | 'processing' | 'error'
  const [excelFilesData, setExcelFilesData] = useState([]); // Store Excel files and their data for dashboard
  const [loadingExcelData, setLoadingExcelData] = useState(false);

  const pollingIntervalRef = useRef(null);
  const processedFilesRef = useRef(new Set()); // Track processed files to avoid duplicates

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsed = JSON.parse(storedUserInfo);
        setUserInfo(parsed);
        setClientCode(parsed.ClientCode || parsed.clientCode || '');
      } catch (err) {
        console.error('Error parsing user info:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (clientCode) {
      fetchTemplates();
    }
  }, [clientCode]);

  useEffect(() => {
    if (selectedTemplate) {
      fetchFieldMappings();
      fetchExcelPath();
    }
  }, [selectedTemplate, clientCode]);

  // Load Excel data from path when path is available
  useEffect(() => {
    if (excelPath && selectedTemplate && Object.keys(fieldMappings).length > 0) {
      loadExcelDataFromPath();
    }
  }, [excelPath, selectedTemplate, fieldMappings]);

  // Start/Stop monitoring based on isMonitoring state
  useEffect(() => {
    if (isMonitoring && excelPath && selectedTemplate) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [isMonitoring, excelPath, selectedTemplate]);

  // Fetch all templates
  const fetchTemplates = async () => {
    if (!clientCode) return;

    setLoading(true);
    try {
      const response = await axios.post(
        'https://localhost:7095/api/Invoice/alltemplate',
        { ClientCode: clientCode },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const templatesData = Array.isArray(response.data) ? response.data : [];
      setTemplates(templatesData);

      if (templatesData.length > 0 && !selectedTemplate) {
        setSelectedTemplate(templatesData[0]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Get field mappings from TemplateData
  const fetchFieldMappings = async () => {
    if (!clientCode || !selectedTemplate) return;

    try {
      const response = await axios.post(
        'https://localhost:7095/api/ExcelTemplate/GetFieldMappingFromTemplate',
        {
          ClientCode: clientCode,
          TemplateId: selectedTemplate.Id || selectedTemplate.id
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success && response.data.fieldMappings) {
        setFieldMappings(response.data.fieldMappings);
      } else {
        toast.error('No field mappings found in template');
        setFieldMappings({});
      }
    } catch (error) {
      console.error('Error fetching field mappings:', error);
      toast.error(error.response?.data?.error || 'Failed to load field mappings');
      setFieldMappings({});
    }
  };

  // Get Excel path
  const fetchExcelPath = async () => {
    if (!clientCode || !selectedTemplate) return;

    try {
      const response = await axios.post(
        'https://localhost:7095/api/ExcelTemplate/GetExcelPath',
        {
          ClientCode: clientCode,
          TemplateId: selectedTemplate.Id || selectedTemplate.id
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success && response.data.excelPath) {
        setExcelPath(response.data.excelPath);
      }
    } catch (error) {
      console.error('Error fetching Excel path:', error);
      // Don't show error - path might not be set yet
    }
  };

  // Save Excel path
  const saveExcelPath = async () => {
    if (!clientCode || !selectedTemplate) {
      toast.error('Please select a template first');
      return;
    }

    try {
      const response = await axios.post(
        'https://localhost:7095/api/ExcelTemplate/UpdateExcelPath',
        {
          ClientCode: clientCode,
          TemplateId: selectedTemplate.Id || selectedTemplate.id,
          ExcelPath: excelPath
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        toast.success('Excel path saved successfully');
      }
    } catch (error) {
      console.error('Error saving Excel path:', error);
      toast.error(error.response?.data?.error || 'Failed to save Excel path');
    }
  };

  // Read Excel file from server path and return as blob/array buffer
  const readExcelFileFromPath = async (fileName) => {
    try {
      console.log('Reading Excel file:', {
        fileName: fileName || '(auto-detect)',
        excelPath,
        clientCode,
        templateId: selectedTemplate?.Id || selectedTemplate?.id
      });

      const response = await axios.post(
        'https://localhost:7095/api/ExcelTemplate/GetExcelFile',
        {
          ClientCode: clientCode,
          TemplateId: selectedTemplate.Id || selectedTemplate.id,
          ExcelPath: excelPath,
          FileName: fileName || '' // Empty filename - backend finds any Excel file
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer' // Get file as array buffer for XLSX
        }
      );

      console.log('Excel file read successfully, size:', response.data.byteLength);
      return response.data;
    } catch (error) {
      console.error('Error reading Excel file:', {
        fileName,
        excelPath,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        error: error.response?.data
      });
      throw error;
    }
  };

  // Load all Excel data from path and display in dashboard
  const loadExcelDataFromPath = async () => {
    if (!clientCode || !selectedTemplate || !excelPath || Object.keys(fieldMappings).length === 0) {
      return;
    }

    setLoadingExcelData(true);
    try {
      // Try common Excel file names and extensions
      const commonFileNames = [
        '', // Empty - let backend find any file
        'UploadStock.xlsx',
        'UploadStock.xls',
        'data.xlsx',
        'data.xls',
        'upload.xlsx',
        'upload.xls'
      ];

      let excelDataLoaded = false;
      let lastError = null;

      // Try each filename until one works
      for (const fileName of commonFileNames) {
        try {
          // Read Excel file from path
          const arrayBuffer = await readExcelFileFromPath(fileName);
          const data = new Uint8Array(arrayBuffer);
          
          // Read Excel using XLSX library
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);

          if (jsonData && jsonData.length > 0) {
            // Map Excel data using template field mappings for display
            const mappedData = jsonData.map((row, index) => {
              const mappedRow = {
                _rowNumber: index + 1,
                _originalData: row,
                _fileName: fileName || 'Auto-detected'
              };

              // Map each Excel column to API field using template mappings
              Object.keys(fieldMappings).forEach(excelColumnTitle => {
                const apiField = fieldMappings[excelColumnTitle];
                const value = row[excelColumnTitle];
                mappedRow[apiField] = value !== undefined && value !== null ? String(value).trim() : '';
              });

              return mappedRow;
            });

            setExcelFilesData(mappedData);
            excelDataLoaded = true;
            toast.success(`Loaded ${mappedData.length} record(s) from Excel file`);
            break; // Success - stop trying other filenames
          }
        } catch (fileError) {
          lastError = fileError;
          // Continue to next filename
          continue;
        }
      }

      if (!excelDataLoaded) {
        // No file found with any of the common names
        setExcelFilesData([]);
        const errorMsg = lastError?.response?.data?.message || lastError?.message || 'File not found';
        
        if (lastError?.response?.status === 404) {
          // Check if it's API endpoint not found or file not found
          if (lastError?.config?.url?.includes('GetExcelFile')) {
            toast.error(
              `Backend API endpoint '/api/ExcelTemplate/GetExcelFile' not found. ` +
              `Please implement this API endpoint on the backend to read Excel files from: ${excelPath}`,
              { autoClose: 8000 }
            );
            console.error('API Endpoint Missing:', {
              endpoint: '/api/ExcelTemplate/GetExcelFile',
              path: excelPath,
              triedFiles: commonFileNames,
              error: lastError.response
            });
          } else {
            toast.warning(`No Excel files found in: ${excelPath}. Make sure the file exists and the backend API can access it.`);
            console.error('Excel file not found. Tried:', commonFileNames);
            console.error('Path:', excelPath);
          }
        } else {
          toast.error(`Error loading Excel data: ${errorMsg}`);
          console.error('Error details:', lastError);
        }
      }
    } catch (error) {
      console.error('Error loading Excel data:', error);
      setExcelFilesData([]);
      toast.error('Error loading Excel data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingExcelData(false);
    }
  };


  // Process Excel file - Read from path, auto-map using template, send to API (all automatic)
  const processExcelFile = async (fileName) => {
    try {
      // Step 1: Read Excel file from path (get as array buffer) - No manual browse needed
      const arrayBuffer = await readExcelFileFromPath(fileName);
      const data = new Uint8Array(arrayBuffer);
      
      // Step 2: Read Excel using XLSX library (like bulk upload)
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Step 3: Convert Excel to JSON - Excel column titles become keys automatically
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      if (!jsonData || jsonData.length === 0) {
        throw new Error('No data found in Excel file');
      }

      // Step 4: Auto-map Excel data using template field mappings (no manual mapping needed)
      // fieldMappings from GetFieldMappingFromTemplate: { "ExcelColumnTitle": "APIFieldName" }
      // Example: { "RFIDNumber": "RFIDNumber", "Itemcode": "Itemcode", "category_id": "category_id" }
      const mappedData = jsonData.map((row) => {
        const apiRow = {
          client_code: clientCode,
          created_datetime: new Date().toISOString(),
          status: "ApiActive"
        };

        // Automatically map each Excel column title to API field using template mappings
        // No manual selection - uses template mappings directly
        Object.keys(fieldMappings).forEach(excelColumnTitle => {
          const apiField = fieldMappings[excelColumnTitle];
          const value = row[excelColumnTitle];
          
          if (value !== undefined && value !== null && value !== '') {
            apiRow[apiField] = String(value).trim();
          }
        });

        return apiRow;
      });

      if (mappedData.length === 0) {
        throw new Error('No valid data after mapping');
      }

      // Step 5: Send all Excel data to SaveRFIDTransactionDetails API (like bulk upload button)
      await axios.post(
        'https://localhost:7095/api/ProductMaster/SaveRFIDTransactionDetails',
        mappedData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Step 6: Delete the Excel file after successful processing
      try {
        await axios.post(
          'https://localhost:7095/api/ExcelTemplate/DeleteExcelFile',
          {
            ClientCode: clientCode,
            TemplateId: selectedTemplate.Id || selectedTemplate.id,
            ExcelPath: excelPath,
            FileName: fileName
          },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (deleteError) {
        console.error('Error deleting file:', deleteError);
      }

      return {
        fileName,
        recordCount: mappedData.length,
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error processing Excel file:', error);
      throw error;
    }
  };


  // Start monitoring - No API call, just start local polling
  const startMonitoring = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setStatus('monitoring');
    setLastCheckTime(new Date());

    // Check immediately
    checkAndProcessFiles();

    // Then check every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      checkAndProcessFiles();
    }, 5000);
  };

  // Stop monitoring - Just stop local polling
  const stopMonitoring = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setStatus('idle');
  };

  // Check for new Excel files and process them - Read directly from path (no list API)
  const checkAndProcessFiles = async () => {
    if (processing || !isMonitoring) return;

    setProcessing(true);
    setStatus('processing');
    setLastCheckTime(new Date());

    try {
      const processedFiles = [];

      // Read Excel file directly from path - Backend GetExcelFile should return any available Excel file
      // If FileName is empty or not provided, backend should find and return the first Excel file
      try {
        const result = await processExcelFile(''); // Empty filename - backend finds any Excel file from path
        const fileKey = `auto_${Date.now()}`;
        processedFilesRef.current.add(fileKey);
        processedFiles.push(result);
      } catch (fileError) {
        // If no files found (404), that's okay - just continue
        if (fileError.response?.status === 404) {
          // No Excel files in path yet
        } else {
          const errorMessage = fileError.response?.data?.message || fileError.message || 'Failed to process file';
          processedFiles.push({
            fileName: 'Unknown',
            recordCount: 0,
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Add to history
      if (processedFiles.length > 0) {
        setSyncHistory(prev => [...processedFiles, ...prev].slice(0, 50));
        
        const successCount = processedFiles.filter(f => f.success).length;
        const totalRecords = processedFiles.reduce((sum, f) => sum + (f.recordCount || 0), 0);
        
        if (successCount > 0) {
          toast.success(`Processed ${successCount} file(s) with ${totalRecords} record(s)`);
        }
        
        const errorFiles = processedFiles.filter(f => !f.success);
        if (errorFiles.length > 0) {
          toast.error(`${errorFiles.length} file(s) failed to process`);
        }
      }
      
      setStatus('monitoring');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to check for files';
      toast.error(`Error: ${errorMessage}`);
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  // Toggle monitoring - No API calls when clicking button
  const toggleMonitoring = () => {
    if (isMonitoring) {
      setIsMonitoring(false);
      stopMonitoring();
      toast.info('Automatic monitoring stopped');
    } else {
      if (!excelPath) {
        toast.error('Please set Excel folder path first');
        return;
      }
      if (Object.keys(fieldMappings).length === 0) {
        toast.error('No field mappings found. Please check template configuration.');
        return;
      }
      setIsMonitoring(true);
      startMonitoring(); // No API call - just start local polling
      toast.success('Automatic monitoring started');
    }
  };

  if (!userInfo) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <FaExclamationTriangle style={{ fontSize: '48px', color: '#f59e0b', marginBottom: '16px' }} />
        <p>Please login to access Automatic DataSync</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 700,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FaSync style={{ color: '#6366f1' }} />
              Automatic DataSync
            </h1>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '14px',
              color: '#64748b'
            }}>
              Automatically monitors Excel folder and syncs data when new files are detected
            </p>
          </div>
          <div style={{
            fontSize: '12px',
            color: '#64748b',
            fontWeight: 600,
            padding: '8px 16px',
            background: '#f1f5f9',
            borderRadius: '8px'
          }}>
            Client: {clientCode}
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px'
      }}>
        {/* Left Column - Configuration */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Template Selection */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FaFolder style={{ color: '#10b981' }} />
              Template & Path Configuration
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569'
              }}>
                Select Template
              </label>
              <select
                value={selectedTemplate?.Id || selectedTemplate?.id || ''}
                onChange={(e) => {
                  const template = templates.find(t => (t.Id || t.id) === parseInt(e.target.value));
                  setSelectedTemplate(template);
                  setSyncHistory([]);
                  processedFilesRef.current.clear();
                }}
                disabled={isMonitoring}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  background: isMonitoring ? '#f8fafc' : '#ffffff',
                  cursor: isMonitoring ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <option value="">Select a template...</option>
                {templates.map((template) => (
                  <option key={template.Id || template.id} value={template.Id || template.id}>
                    {template.TemplateName || template.templateName || 'Unnamed Template'}
                  </option>
                ))}
              </select>
            </div>

            {/* Excel Path */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569'
              }}>
                Excel Folder Path
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={excelPath}
                  onChange={(e) => setExcelPath(e.target.value)}
                  placeholder="C:/LSI"
                  disabled={isMonitoring}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: isMonitoring ? '#f8fafc' : '#ffffff',
                    transition: 'all 0.2s'
                  }}
                />
                <button
                  onClick={saveExcelPath}
                  disabled={!selectedTemplate || isMonitoring}
                  style={{
                    padding: '10px 16px',
                    background: (!selectedTemplate || isMonitoring) ? '#e2e8f0' : '#6366f1',
                    color: (!selectedTemplate || isMonitoring) ? '#94a3b8' : '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: (!selectedTemplate || isMonitoring) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <FaSave />
                  Save
                </button>
              </div>
            </div>

            {/* Field Mappings Display */}
            {Object.keys(fieldMappings).length > 0 && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569'
                }}>
                  Field Mappings
                </label>
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '8px',
                  padding: '12px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(fieldMappings, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Monitoring Control */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {isMonitoring ? (
                <FaToggleOn style={{ color: '#10b981', fontSize: '20px' }} />
              ) : (
                <FaToggleOff style={{ color: '#64748b', fontSize: '20px' }} />
              )}
              Automatic Monitoring
            </h3>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1e293b',
                  marginBottom: '4px'
                }}>
                  Status: {status === 'monitoring' ? 'Monitoring' : status === 'processing' ? 'Processing...' : 'Idle'}
                </div>
                {lastCheckTime && (
                  <div style={{
                    fontSize: '12px',
                    color: '#64748b'
                  }}>
                    Last check: {new Date(lastCheckTime).toLocaleTimeString()}
                  </div>
                )}
              </div>
              <button
                onClick={toggleMonitoring}
                disabled={!excelPath || !selectedTemplate || Object.keys(fieldMappings).length === 0}
                style={{
                  padding: '12px 24px',
                  background: isMonitoring
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: (!excelPath || !selectedTemplate || Object.keys(fieldMappings).length === 0)
                    ? 'not-allowed'
                    : 'pointer',
                  opacity: (!excelPath || !selectedTemplate || Object.keys(fieldMappings).length === 0) ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: isMonitoring
                    ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                    : '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                {isMonitoring ? (
                  <>
                    <FaToggleOff />
                    <span>Stop Monitoring</span>
                  </>
                ) : (
                  <>
                    <FaToggleOn />
                    <span>Start Monitoring</span>
                  </>
                )}
              </button>
            </div>

            {processing && (
              <div style={{
                padding: '12px',
                background: '#eff6ff',
                borderRadius: '8px',
                border: '1px solid #3b82f6',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                color: '#1e40af'
              }}>
                <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                <span>Processing Excel file...</span>
              </div>
            )}

            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#64748b'
            }}>
              <FaInfoCircle style={{ marginRight: '8px' }} />
              <strong>How it works:</strong> When monitoring is enabled, the system checks the Excel folder every 5 seconds. 
              New Excel files are automatically processed and deleted after successful sync.
            </div>
          </div>
        </div>

        {/* Right Column - Excel Data Dashboard & Sync History */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Excel Data Dashboard */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            flex: 1
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FaFileExcel style={{ color: '#10b981' }} />
                Excel Data from Path
              </h3>
              <button
                onClick={loadExcelDataFromPath}
                disabled={loadingExcelData || !excelPath || Object.keys(fieldMappings).length === 0}
                style={{
                  padding: '6px 12px',
                  background: loadingExcelData || !excelPath || Object.keys(fieldMappings).length === 0
                    ? '#e2e8f0'
                    : '#6366f1',
                  color: loadingExcelData || !excelPath || Object.keys(fieldMappings).length === 0
                    ? '#94a3b8'
                    : '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: loadingExcelData || !excelPath || Object.keys(fieldMappings).length === 0
                    ? 'not-allowed'
                    : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {loadingExcelData ? (
                  <>
                    <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                    Loading...
                  </>
                ) : (
                  <>
                    <FaSync />
                    Refresh
                  </>
                )}
              </button>
            </div>

            {loadingExcelData ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <FaSpinner style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>Loading Excel data from path...</p>
              </div>
            ) : excelFilesData.length === 0 ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#94a3b8'
              }}>
                <FaFileExcel style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '14px', marginBottom: '8px', fontWeight: 600 }}>
                  {excelPath ? `No Excel data loaded from: ${excelPath}` : 'Excel path not set'}
                </p>
                {excelPath && (
                  <>
                    <p style={{ margin: '8px 0', fontSize: '12px', color: '#64748b' }}>
                      Path: <strong>{excelPath}</strong>
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '11px', color: '#ef4444', fontStyle: 'italic' }}>
                      Note: Backend API '/api/ExcelTemplate/GetExcelFile' needs to be implemented to read Excel files from this path.
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                      Click Refresh to try again
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px'
                }}>
                  <thead style={{
                    background: '#f8fafc',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                  }}>
                    <tr>
                      <th style={{
                        padding: '10px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#475569',
                        borderBottom: '2px solid #e5e7eb',
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        left: 0,
                        background: '#f8fafc',
                        zIndex: 11
                      }}>
                        #
                      </th>
                      {Object.values(fieldMappings).map((apiField, index) => (
                        <th key={index} style={{
                          padding: '10px',
                          textAlign: 'left',
                          fontWeight: 600,
                          color: '#475569',
                          borderBottom: '2px solid #e5e7eb',
                          whiteSpace: 'nowrap'
                        }}>
                          {apiField}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {excelFilesData.map((row, rowIndex) => (
                      <tr key={rowIndex} style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc'
                      }}>
                        <td style={{
                          padding: '10px',
                          color: '#64748b',
                          fontWeight: 600,
                          position: 'sticky',
                          left: 0,
                          background: rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                          zIndex: 10
                        }}>
                          {row._rowNumber}
                        </td>
                        {Object.values(fieldMappings).map((apiField, colIndex) => (
                          <td key={colIndex} style={{
                            padding: '10px',
                            color: '#1e293b',
                            whiteSpace: 'nowrap',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {row[apiField] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#64748b',
                  background: '#f8fafc',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  Showing {excelFilesData.length} record(s) from Excel file
                </div>
              </div>
            )}
          </div>

          {/* Sync History */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            flex: 1
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FaHistory style={{ color: '#6366f1' }} />
              Sync History
            </h3>

            {syncHistory.length === 0 ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#94a3b8'
              }}>
                <FaInfoCircle style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '14px' }}>
                  No sync history yet. Start monitoring to see processed files.
                </p>
              </div>
            ) : (
              <div style={{
                maxHeight: '600px',
                overflowY: 'auto'
              }}>
                {syncHistory.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: item.success ? '#ecfdf5' : '#fef2f2',
                      borderRadius: '8px',
                      border: `1px solid ${item.success ? '#10b981' : '#ef4444'}`,
                      display: 'flex',
                      alignItems: 'start',
                      gap: '12px'
                    }}
                  >
                    {item.success ? (
                      <FaCheckCircle style={{ color: '#10b981', fontSize: '20px', flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '20px', flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: item.success ? '#059669' : '#dc2626',
                        marginBottom: '4px'
                      }}>
                        {item.fileName}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#64748b',
                        marginBottom: '4px'
                      }}>
                        {item.success
                          ? `Successfully synced ${item.recordCount} record(s)`
                          : `Error: ${item.error || 'Unknown error'}`}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#94a3b8'
                      }}>
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AutomaticDataSync;
