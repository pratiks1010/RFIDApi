// UploadRFID.js - RFID Excel uploader for /upload-rfid route
// Modified to read Excel files and send all data in single payload
import React, { useRef, useState, useEffect } from 'react';
import { FaCloudUploadAlt, FaFileExcel, FaTimes, FaCheckCircle, FaDownload, FaSpinner, FaTrash } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const API_URL = 'https://rrgold.loyalstring.co.in/api/Device/ImportRFIDData';

const UploadRFID = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [processedData, setProcessedData] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentRecord, setCurrentRecord] = useState(0);
  const fileInputRef = useRef(null);
  const [userInfo, setUserInfo] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Get clientCode and userInfo from localStorage
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('userInfo'));
      setUserInfo(user);
    } catch (err) {
      console.error('Error parsing userInfo:', err);
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file) => {
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      setError('');
      setSuccess(null);
      setProcessedData(null);
      setTotalRecords(0);
      setCurrentRecord(0);
      // Read and process the file immediately
      processExcelFile(file);
    } else {
      setError('Please select a valid Excel file (.xlsx or .xls)');
      setSelectedFile(null);
    }
  };

  const processExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          setError('Excel file must contain at least a header row and one data row');
          setSelectedFile(null);
          return;
        }

        // Get headers from first row
        const headers = jsonData[0];
        const dataRows = jsonData.slice(1);

        // Validate required fields
        const requiredFields = ['BarcodeNumber', 'TidValue'];
        const missingFields = requiredFields.filter(field => 
          !headers.some(header => 
            header && header.toString().toLowerCase().includes(field.toLowerCase())
          )
        );

        if (missingFields.length > 0) {
          setError(`Missing required fields: ${missingFields.join(', ')}`);
          setSelectedFile(null);
          return;
        }

        // Process data rows
        const processedRows = dataRows.map((row, index) => {
          const rowData = {};
          headers.forEach((header, colIndex) => {
            if (header) {
              rowData[header.toString().trim()] = row[colIndex] || '';
            }
          });
          return rowData;
        }).filter(row => {
          // Filter out empty rows
          return Object.values(row).some(value => value !== '' && value !== null && value !== undefined);
        });

        setProcessedData(processedRows);
        setTotalRecords(processedRows.length);
        console.log(`Processed ${processedRows.length} records from Excel file`);
        
      } catch (err) {
        console.error('Error processing Excel file:', err);
        setError('Error processing Excel file. Please check the file format.');
        setSelectedFile(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Ensure Browse files button always opens the file picker
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.disabled = false; // Ensure not disabled
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setSuccess(null);
    setError('');
    setProcessedData(null);
    setTotalRecords(0);
    setCurrentRecord(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !userInfo?.ClientCode) {
      setError('Unable to upload: ' + (!selectedFile ? 'No file selected.' : 'No client code found.'));
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess(null);
    setShowSuccessModal(false);

    try {
      // Create FormData to send file and ClientCode
      const formData = new FormData();
      formData.append('ClientCode', userInfo.ClientCode);
      formData.append('file', selectedFile);

      console.log(`Uploading file: ${selectedFile.name} for client: ${userInfo.ClientCode}`);
      
      // Create XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      // Handle response
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            setSuccess(`File uploaded successfully! ${totalRecords} records processed.`);
            setShowSuccessModal(true);
            handleRemoveFile();
          } catch (err) {
            setSuccess(`File uploaded successfully! ${totalRecords} records processed.`);
            setShowSuccessModal(true);
            handleRemoveFile();
          }
        } else {
          const errorMessage = xhr.responseText ? JSON.parse(xhr.responseText)?.message || `Upload failed with status: ${xhr.status}` : `Upload failed with status: ${xhr.status}`;
          throw new Error(errorMessage);
        }
        setUploading(false);
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        throw new Error('Network error occurred during upload');
      });

      // Open and send request
      xhr.open('POST', API_URL);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.send(formData);

    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed: ' + err.message);
      setUploading(false);
    }
  };

  // Download Excel Template Function
  const downloadTemplate = () => {
    const templateData = [
      { 
        BarcodeNumber: 'RJ0001', 
        TidValue: 'E280119120006013217D032D'
      },
      { 
        BarcodeNumber: 'RJ0002', 
        TidValue: 'E2801191200065A721B7032D'
      },
      { 
        BarcodeNumber: 'RJ0003', 
        TidValue: 'E280119120006013217D032E'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'RFID Template');
    
    const wscols = [
      { wch: 15 }, // BarcodeNumber
      { wch: 30 }  // TidValue
    ];
    worksheet['!cols'] = wscols;

    const filename = 'Upload RFID Template.xlsx';
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: '#f8fafc',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* Header Section */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#1e293b',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
              }}>
                <FaCloudUploadAlt style={{ fontSize: '20px', color: '#ffffff' }} />
              </div>
              Upload Bulk Stock in RFID
            </h1>
            <div style={{
              fontSize: '14px',
              color: '#64748b',
              fontWeight: 500
            }}>
              {totalRecords > 0 && `Total: ${totalRecords} records`}
            </div>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            margin: 0,
            lineHeight: 1.6,
            marginBottom: '16px'
          }}>
            Upload your Excel file to quickly add multiple RFID records to your inventory. All data will be processed and sent in a single request for maximum efficiency.
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #bbf7d0'
          }}>
            <FaFileExcel style={{ fontSize: '18px', color: '#10b981' }} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '2px'
              }}>
                Need a template?
              </div>
              <div style={{
                fontSize: '12px',
                color: '#64748b'
              }}>
                Download our Excel template with sample data to get started
              </div>
            </div>
            <button
              onClick={downloadTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid #10b981',
                background: '#ffffff',
                color: '#10b981',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
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
              <FaDownload />
              <span>Download Template</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          {/* Remove File Button */}
          {selectedFile && (
            <button
              onClick={handleRemoveFile}
              disabled={uploading}
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
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!uploading) {
                  e.target.style.background = '#ef4444';
                  e.target.style.color = '#ffffff';
                }
              }}
              onMouseLeave={(e) => {
                if (!uploading) {
                  e.target.style.background = '#ffffff';
                  e.target.style.color = '#ef4444';
                }
              }}
            >
              <FaTrash />
              <span>Remove File</span>
            </button>
          )}
        </div>

        {/* File Uploader Section */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
            gap: '10px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#EFF6FF',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FaFileExcel style={{ fontSize: '16px', color: '#2563EB' }} />
            </div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1E293B',
              margin: 0,
            }}>
              File Uploader
            </h2>
          </div>

          {/* Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? '#3b82f6' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '60px 20px',
              transition: 'all 0.3s ease',
              background: dragActive ? '#f8fafc' : '#ffffff',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {selectedFile ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: '#10B981',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                  <FaFileExcel style={{ fontSize: '24px', color: 'white' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1E293B',
                    margin: '0 0 4px 0',
                  }}>
                    {selectedFile.name}
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: '#64748B',
                    margin: '0 0 8px 0',
                  }}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {processedData && (
                    <p style={{
                      fontSize: '14px',
                      color: '#10B981',
                      fontWeight: '600',
                      margin: 0,
                    }}>
                      {totalRecords} records processed
                    </p>
                  )}
                </div>

                {/* Upload Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    uploadFile();
                  }}
                  disabled={uploading || !processedData}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #3b82f6',
                    background: uploading || !processedData ? '#94A3B8' : '#ffffff',
                    color: uploading || !processedData ? '#ffffff' : '#3b82f6',
                    cursor: uploading || !processedData ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: uploading || !processedData ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading && processedData) {
                      e.target.style.background = '#3b82f6';
                      e.target.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!uploading && processedData) {
                      e.target.style.background = '#ffffff';
                      e.target.style.color = '#3b82f6';
                    }
                  }}
                >
                  {uploading ? (
                    <>
                      <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <FaCloudUploadAlt />
                      <span>Upload RFID Sheet</span>
                    </>
                  )}
                </button>

                {/* Progress Bar */}
                {uploading && (
                  <div style={{
                    width: '100%',
                    maxWidth: '500px',
                    marginTop: '20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#1e293b'
                      }}>
                        Upload Progress
                      </span>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#3b82f6'
                      }}>
                        {uploadProgress}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '10px',
                      background: '#e2e8f0',
                      borderRadius: '5px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div
                        style={{
                          width: `${uploadProgress}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                          transition: 'width 0.3s ease',
                          borderRadius: '5px',
                          position: 'relative',
                          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                          animation: 'shimmer 1.5s infinite'
                        }} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#64748B',
                      marginTop: '8px',
                      textAlign: 'center'
                    }}>
                      {uploadProgress < 100 ? 'Uploading file to server...' : 'Processing data...'}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                position: 'relative',
                zIndex: 1,
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)',
                  transition: 'transform 0.3s ease',
                  transform: dragActive ? 'scale(1.1)' : 'scale(1)',
                }}>
                  <FaCloudUploadAlt style={{ fontSize: '28px', color: 'white' }} />
                </div>

                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1E293B',
                  marginBottom: '8px',
                  textAlign: 'center',
                }}>
                  Drag and drop your files here
                </h3>

                <p style={{
                  color: '#64748B',
                  marginBottom: '16px',
                  fontSize: '14px',
                  textAlign: 'center',
                }}>
                  OR
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBrowseClick();
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '0 auto',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.2)';
                  }}
                >
                  <FaFileExcel style={{ fontSize: '16px' }} />
                  Browse files
                </button>

                <p style={{
                  fontSize: '13px',
                  color: '#64748B',
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}>
                  <FaFileExcel style={{ color: '#2563EB' }} />
                  Only .xlsx or .xls files are supported.
                </p>
              </div>
            )}
            {/* Place the file input here, always present and accessible by ref */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#FEF2F2',
              color: '#DC2626',
              padding: '12px 16px',
              borderRadius: '8px',
              marginTop: '16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid #FECACA'
            }}>
              <FaTimes style={{ fontSize: '16px' }} />
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && !showSuccessModal && (
            <div style={{
              background: '#F0FDF4',
              color: '#10B981',
              padding: '12px 16px',
              borderRadius: '8px',
              marginTop: '16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid #BBF7D0'
            }}>
              <FaCheckCircle style={{ fontSize: '16px' }} />
              {success}
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            padding: '32px',
            minWidth: '320px',
            maxWidth: '400px',
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px',
              boxShadow: '0 4px 18px rgba(16, 185, 129, 0.3)',
              animation: 'popIn 0.5s cubic-bezier(.68,-0.55,.27,1.55)'
            }}>
              <FaCheckCircle style={{ fontSize: '36px', color: '#ffffff' }} />
            </div>
            <div style={{
              fontWeight: 700,
              fontSize: '22px',
              color: '#1e293b',
              marginBottom: '4px',
              fontFamily: 'Inter, sans-serif',
            }}>
              Upload Successful!
            </div>
            <div style={{
              fontSize: '14px',
              color: '#64748b',
              marginBottom: '8px',
              lineHeight: 1.6
            }}>
              Your Excel file has been processed and uploaded successfully. {totalRecords} records have been added to the system.
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 32px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                marginTop: '8px',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
              }}
            >
              Close
            </button>
            <style>{`
              @keyframes popIn {
                0% { transform: scale(0.7); opacity: 0; }
                80% { transform: scale(1.1); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadRFID;
