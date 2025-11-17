// UploadRFID.js - RFID Excel uploader for /upload-rfid route
// Modified to read Excel files and send all data in single payload
import React, { useRef, useState, useEffect } from 'react';
import { FaCloudUploadAlt, FaFileExcel, FaTimes, FaCheckCircle, FaDownload } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import Header from './Header';

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
            setSuccess(`File uploaded successfully!`);
            setShowSuccessModal(true);
            handleRemoveFile();
          } catch (err) {
            setSuccess('File uploaded successfully!');
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
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8faff 0%, #f0f5ff 100%)',
      padding: '24px 20px',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        position: 'relative',
      }}>
        {/* Decorative Elements */}
        <div style={{
          position: 'absolute',
          top: -20,
          right: -80,
          width: '160px',
          height: '160px',
          background: 'linear-gradient(45deg, rgba(37, 99, 235, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          zIndex: 0,
        }} />
        <div style={{
          position: 'absolute',
          bottom: 80,
          left: -120,
          width: '240px',
          height: '240px',
          background: 'linear-gradient(45deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
          zIndex: 0,
        }} />

        {/* Content Container */}
        <div style={{
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Header Section */}
          <div style={{
            textAlign: 'center',
            marginBottom: '32px',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'white',
              padding: '6px 12px',
              borderRadius: '16px',
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            }}>
              <FaCheckCircle style={{ color: '#10B981', marginRight: '6px' }} />
              <span style={{ color: '#1E293B', fontWeight: 500, fontSize: '14px' }}>Bulk Upload Process</span>
            </div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)',
            WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '12px',
              letterSpacing: '-0.02em',
          }}>
            Upload Bulk Stock in RFID
          </h1>
            <p style={{
              fontSize: '15px',
              color: '#64748B',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: '1.5',
            }}>
              Upload your Excel file to quickly add multiple RFID records to your inventory.
              All data will be processed and sent in a single request for maximum efficiency.
            </p>
          </div>
          
          {/* Download Template Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '24px',
          }}>
            <button
              onClick={downloadTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
              }}
            >
              <FaDownload style={{ fontSize: '16px' }} />
              Download Excel Template
            </button>
          </div>

          {/* File Uploader Section */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
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
                border: `2px dashed ${dragActive ? '#2563EB' : '#E2E8F0'}`,
                borderRadius: '12px',
                padding: '40px 20px',
                transition: 'all 0.3s ease',
                background: dragActive ? '#F8FAFC' : 'white',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {selectedFile ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      style={{
                position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#EF4444',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <FaTimes style={{ fontSize: '12px', color: 'white' }} />
                    </button>
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      uploadFile();
                    }}
                    disabled={uploading || !processedData}
                    style={{
                      background: uploading || !processedData ? '#94A3B8' : 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 24px',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: uploading || !processedData ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <FaCloudUploadAlt style={{ fontSize: '16px' }} />
                    {uploading ? 'Uploading...' : 'Upload RFID Sheet'}
                  </button>
                  {uploading && (
                    <div style={{
                      width: '100%',
                      maxWidth: '300px',
                      textAlign: 'center',
                    }}>
                      <div style={{
                        fontSize: '14px',
                        color: '#64748B',
                        marginBottom: '8px',
                      }}>
                        Uploading file... {uploadProgress}%
                      </div>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        background: '#E2E8F0',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}>
                        <div
                          style={{
                            width: `${uploadProgress}%`,
                            height: '100%',
                            background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                            transition: 'width 0.3s ease',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#64748B',
                        marginTop: '4px',
                      }}>
                        {uploadProgress === 100 ? 'Processing...' : 'Uploading...'}
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
                    borderRadius: '10px',
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
              }}>
                <FaTimes style={{ fontSize: '16px' }} />
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
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
              }}>
                <FaCheckCircle style={{ fontSize: '16px' }} />
                {success}
              </div>
            )}
          </div>
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
          background: 'rgba(0,0,0,0.18)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Poppins, Inter, sans-serif'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.85)',
            borderRadius: 22,
            boxShadow: '0 8px 32px #0078d422, 0 2px 8px #5470ff33',
            padding: '2.5rem 2.5rem 2rem 2.5rem',
            minWidth: 320,
            maxWidth: 380,
            textAlign: 'center',
            fontFamily: 'Poppins, Inter, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
            position: 'relative',
            border: '2.5px solid',
            borderImage: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%) 1',
            overflow: 'hidden',
            backdropFilter: 'blur(8px)'
          }}>
            {/* Animated checkmark icon */}
            <div style={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: '#f1f1f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
              boxShadow: '0 4px 18px rgba(0, 119, 212, 0.13)',
              position: 'relative',
              animation: 'popIn 0.5s cubic-bezier(.68,-0.55,.27,1.55)'
            }}>
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="19" cy="19" r="18" stroke="#0077d4" strokeWidth="3" fill="#ffffff" />
                <path d="M11 20.5L17 26.5L27 14.5" stroke="#0077d4" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <animate attributeName="stroke-dasharray" from="0,40" to="40,0" dur="0.7s" fill="freeze" />
                </path>
              </svg>
            </div>
            <div style={{
              fontWeight: 800,
              fontSize: 24,
              color: '#38414a',
              marginBottom: 8,
              fontFamily: 'Poppins, Inter, sans-serif',
              letterSpacing: 0.1,
            }}>
              File uploaded successfully!
            </div>
            <div style={{
              fontSize: 16,
              color: '#64748b',
              marginBottom: 16,
            }}>
              Your Excel file has been processed and uploaded to the system.
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '13px 38px',
                fontWeight: 700,
                fontSize: 18,
                cursor: 'pointer',
                boxShadow: '0 2px 12px #0078d422',
                marginTop: 8,
                fontFamily: 'Poppins, Inter, sans-serif',
                transition: 'background 0.2s, transform 0.2s',
                letterSpacing: 0.1
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'linear-gradient(90deg, #5470FF 0%, #0078d4 100%)';
                e.currentTarget.style.transform = 'scale(1.04)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)';
                e.currentTarget.style.transform = 'scale(1)';
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
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadRFID; 
