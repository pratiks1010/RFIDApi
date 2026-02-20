// UploadRFID.js - RFID Excel uploader for /upload-rfid route
// Modified to read Excel files and send all data in single payload
import React, { useRef, useState, useEffect } from 'react';
import { FaCloudUploadAlt, FaFileExcel, FaTimes, FaCheckCircle, FaDownload, FaSpinner, FaTrash } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const API_URL = 'https://rrgold.loyalstring.co.in/api/Device/BulkUploadRFIDData';

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
  const [uploadResult, setUploadResult] = useState(null);
  
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
        
        // Convert to JSON array (no headers, just raw data)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (jsonData.length < 1) {
          setError('Excel file must contain at least one data row');
          setSelectedFile(null);
          return;
        }

        // Process data rows - Column 0: BarcodeNumber, Column 1: TidValue
        const processedRows = jsonData
          .map((row, index) => {
            // Skip empty rows
            if (!row || row.length === 0 || (!row[0] && !row[1])) {
              return null;
            }
            
            return {
              BarcodeNumber: row[0] ? String(row[0]).trim() : '',
              TidValue: row[1] ? String(row[1]).trim() : ''
            };
          })
          .filter(row => {
            // Filter out null rows and rows with missing required data
            return row && row.BarcodeNumber && row.TidValue;
          });

        if (processedRows.length === 0) {
          setError('No valid data found. Ensure Column 0 contains BarcodeNumber and Column 1 contains TidValue');
          setSelectedFile(null);
          return;
        }

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
    setUploadResult(null);
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
      // API expects: Form field: ClientCode, Form file: Excel file
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
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const result = JSON.parse(xhr.responseText);
            // API returns detailed response with statistics
            const message = result.message || `File uploaded successfully!`;
            const stats = result.statistics || {};
            const inserted = stats.inserted || stats.insertedCount || 0;
            const updated = stats.updated || stats.updatedCount || 0;
            const total = stats.total || stats.totalCount || totalRecords;
            
            let successMessage = message;
            if (inserted > 0 || updated > 0) {
              successMessage += ` (${inserted} inserted, ${updated} updated)`;
            } else if (total > 0) {
              successMessage += ` (${total} records processed)`;
            }
            
            // Store result for modal display
            setUploadResult({
              message: successMessage,
              statistics: {
                inserted,
                updated,
                total: total || totalRecords
              },
              fullResponse: result
            });
            
            setSuccess(successMessage);
            setShowSuccessModal(true);
            handleRemoveFile();
          } catch (err) {
            // If response is not JSON, still show success
            setSuccess(`File uploaded successfully! ${totalRecords} records processed.`);
            setShowSuccessModal(true);
            handleRemoveFile();
          }
        } else {
          let errorMessage = `Upload failed with status: ${xhr.status}`;
          try {
            if (xhr.responseText) {
              const errorData = JSON.parse(xhr.responseText);
              errorMessage = errorData.message || errorData.error || errorMessage;
            }
          } catch (e) {
            // If response is not JSON, use default message
          }
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
  // Template format: Column 0 = BarcodeNumber, Column 1 = TidValue
  const downloadTemplate = () => {
    // Create template data as array of arrays (no headers)
    // Column 0: BarcodeNumber, Column 1: TidValue
    const templateData = [
      ['RJ0001', 'E280119120006013217D032D'],
      ['RJ0002', 'E2801191200065A721B7032D'],
      ['RJ0003', 'E280119120006013217D032E']
    ];

    // Create worksheet from array of arrays
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'RFID Template');
    
    // Set column widths
    const wscols = [
      { wch: 15 }, // Column 0: BarcodeNumber
      { wch: 30 }  // Column 1: TidValue
    ];
    worksheet['!cols'] = wscols;

    const filename = 'Upload RFID Template.xlsx';
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: '"Plus Jakarta Sans", Inter, sans-serif',
      padding: '32px 40px',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      `}</style>
      
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header Section */}
        <div style={{
          marginBottom: 40,
          textAlign: 'left'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 12px 0',
            letterSpacing: '-0.03em',
            background: 'linear-gradient(to right, #0f172a, #334155)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Bulk RFID Upload
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#64748b',
            margin: 0,
            maxWidth: '600px',
            lineHeight: 1.6
          }}>
            Upload your Excel file to quickly add multiple RFID records to your inventory. 
            All data will be processed efficiently in a single batch.
          </p>
        </div>

        {/* Template & Upload Container */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          
          {/* Template Info Card */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '16px',
            padding: '20px 24px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                <FaFileExcel />
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>Need a template?</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Download our sample Excel file to get started correctly.</p>
              </div>
            </div>
            
            <button
              onClick={downloadTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                color: '#475569',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#16a34a';
                e.currentTarget.style.color = '#16a34a';
                e.currentTarget.style.background = '#f0fdf4';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              <FaDownload size={14} /> Download Template
            </button>
          </div>

          {/* File Uploader Area */}
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '40px',
            border: `2px dashed ${dragActive ? '#3b82f6' : '#e2e8f0'}`,
            transition: 'all 0.3s ease',
            backgroundColor: dragActive ? '#eff6ff' : '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            position: 'relative'
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          >
            {selectedFile ? (
              <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '20px',
                  background: '#dbeafe',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  margin: '0 auto 24px'
                }}>
                  <FaFileExcel />
                </div>
                
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                  {selectedFile.name}
                </h3>
                <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748b' }}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {totalRecords} records found
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={uploadFile}
                    disabled={uploading || !processedData}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 24px',
                      background: uploading ? '#94a3b8' : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                    }}
                  >
                    {uploading ? (
                      <>
                        <FaSpinner className="fa-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <FaCloudUploadAlt size={16} /> Upload File
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleRemoveFile}
                    disabled={uploading}
                    style={{
                      padding: '12px',
                      background: '#fee2e2',
                      color: '#ef4444',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Remove file"
                  >
                    <FaTrash size={16} />
                  </button>
                </div>

                {uploading && (
                  <div style={{ marginTop: '24px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>
                      <span style={{ color: '#64748b' }}>Progress</span>
                      <span style={{ color: '#2563eb' }}>{uploadProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#2563eb', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  marginBottom: '24px'
                }}>
                  <FaCloudUploadAlt />
                </div>
                
                <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
                  Drag & Drop file here
                </h3>
                <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: '#64748b' }}>
                  or click below to browse your files
                </p>
                
                <button
                  onClick={handleBrowseClick}
                  style={{
                    padding: '12px 32px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    color: '#334155',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.color = '#3b82f6';
                    e.currentTarget.style.background = '#eff6ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.color = '#334155';
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  Browse Files
                </button>
                
                <p style={{ marginTop: '24px', fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaFileExcel /> Supports .xlsx and .xls files
                </p>
              </>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {/* Messages Area */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#ef4444'
            }}>
              <FaTimes size={18} />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {success && !showSuccessModal && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#16a34a'
            }}>
              <FaCheckCircle size={18} />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{success}</span>
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
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Plus Jakarta Sans", sans-serif'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '40px',
            width: '100%',
            maxWidth: '420px',
            textAlign: 'center',
            animation: 'popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto 24px'
            }}>
              <FaCheckCircle />
            </div>
            
            <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
              Upload Successful!
            </h2>
            
            <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: '#64748b', lineHeight: 1.6 }}>
              {uploadResult?.message || `Your Excel file has been processed successfully. ${totalRecords} records were handled.`}
            </p>

            {uploadResult?.statistics && (uploadResult.statistics.inserted > 0 || uploadResult.statistics.updated > 0) && (
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Statistics
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {uploadResult.statistics.inserted > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: '#334155' }}>New Records</span>
                      <span style={{ fontWeight: 600, color: '#16a34a' }}>+{uploadResult.statistics.inserted}</span>
                    </div>
                  )}
                  {uploadResult.statistics.updated > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: '#334155' }}>Updated Records</span>
                      <span style={{ fontWeight: 600, color: '#3b82f6' }}>{uploadResult.statistics.updated}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                width: '100%',
                padding: '14px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'transform 0.1s ease'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Done
            </button>
          </div>
          <style>{`
            @keyframes popIn {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default UploadRFID;
