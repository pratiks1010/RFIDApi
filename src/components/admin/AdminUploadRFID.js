import React, { useState, useRef, useEffect } from 'react';

const AdminUploadRFID = () => {
  const [clientCode, setClientCode] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleFileChange = e => {
    const f = e.target.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f);
      setError('');
      setSuccess('');
    } else {
      setError('Please select a valid Excel file (.xlsx or .xls)');
      setFile(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const f = e.dataTransfer.files[0];
      if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
        setFile(f);
        setError('');
        setSuccess('');
      } else {
        setError('Please select a valid Excel file (.xlsx or .xls)');
        setFile(null);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  const handleRemoveFile = () => {
    setFile(null);
    setProgress(0);
    setSuccess('');
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setProgress(0);
    if (!clientCode.trim() || !file) {
      setError('Client code and Excel file are required.');
      return;
    }
    setLoading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('ClientCode', clientCode);
      formData.append('file', file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://testing.loyalstring.co.in/api/Device/ImportRFIDData');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setSuccess('RFID sheet uploaded successfully!');
          setFile(null);
          setClientCode('');
        } else {
          setError(`Upload failed: ${xhr.statusText}`);
        }
        setLoading(false);
        setProgress(0);
      };
      xhr.onerror = () => {
        setError('Upload failed. Network error.');
        setLoading(false);
        setProgress(0);
      };
      xhr.send(formData);
    } catch (err) {
      setError('Upload failed. Please try again.');
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: 1200, 
      margin: '0 auto', 
      padding: isMobile ? '16px' : '24px', 
      boxSizing: 'border-box', 
      background: '#f8f9fa', 
      minHeight: 'calc(100vh - 72px)', 
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      {/* Header Section */}
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        padding: isMobile ? '24px 16px' : '48px 32px',
        marginBottom: isMobile ? '16px' : '32px',
        border: '1px solid #e4e7ec',
        textAlign: 'center'
      }}>
        {/* Upload Icon */}
        <div style={{
          width: isMobile ? 60 : 80, 
          height: isMobile ? 60 : 80, 
          background: '#0077d4',
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 24px', 
          boxShadow: '0 8px 16px rgba(0, 119, 212, 0.15)'
        }}>
          <i className="fas fa-cloud-upload-alt" style={{ fontSize: isMobile ? 24 : 32, color: '#ffffff' }}></i>
        </div>

        {/* Title */}
        <h1 style={{ 
          fontWeight: 700, 
          fontSize: isMobile ? '24px' : '32px', 
          color: '#101828',
          marginBottom: '8px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
          Upload RFID Data
        </h1>

        {/* Subtitle */}
        <p style={{ 
          fontWeight: 500, 
          fontSize: isMobile ? '14px' : '16px', 
          color: '#475467',
          margin: 0,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
          Upload Excel Sheet
        </p>

        {/* Blue underline */}
        <div style={{
          height: 3,
          width: 80,
          background: '#0077d4',
          borderRadius: 2,
          margin: '24px auto 0'
        }} />
      </div>

      {/* Main Content Container */}
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e4e7ec',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 400px',
          minHeight: isMobile ? 'auto' : '500px'
        }}>
          {/* Left Column - File Upload Area */}
          <div style={{
            padding: isMobile ? '20px' : '32px',
            borderRight: isMobile ? 'none' : '1px solid #e4e7ec',
            borderBottom: isMobile ? '1px solid #e4e7ec' : 'none',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* File Format Info */}
            <div style={{ 
              background: '#eff6ff',
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid #bfdbfe',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-info-circle" style={{ color: '#0077d4', fontSize: 16 }}></i>
              <span style={{ color: '#1e40af', fontSize: 14, fontWeight: 500, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                Only .xlsx or .xls files are supported
              </span>
            </div>

            {/* Drag and Drop Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              style={{
                border: '2px dashed #0077d4',
                borderRadius: 12,
                background: '#fbfcfd',
              padding: isMobile ? '32px 16px' : '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: isMobile ? '200px' : '300px'
              }}
              onClick={handleBrowseClick}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#0056b3';
                e.currentTarget.style.background = '#f0f9ff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#0077d4';
                e.currentTarget.style.background = '#fbfcfd';
              }}
            >
              {file ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    background: '#10b981',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-file-excel" style={{ color: '#ffffff', fontSize: 24 }}></i>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontWeight: 600, 
                      color: '#101828', 
                      fontSize: '16px',
                      marginBottom: '4px',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                    }}>
                      {file.name}
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#475467',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                    }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    style={{
                      background: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                    }}
                    onMouseEnter={e => e.target.style.background = '#b91c1c'}
                    onMouseLeave={e => e.target.style.background = '#dc2626'}
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    background: '#0077d4',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-cloud-upload-alt" style={{ color: '#ffffff', fontSize: 24 }}></i>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontWeight: 600, 
                      color: '#101828', 
                      fontSize: '18px',
                      marginBottom: '4px',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                    }}>
                      Drop your Excel file here
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#475467',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                    }}>
                      or click to browse
                    </div>
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {/* Progress Bar */}
            {loading && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 500, 
                    color: '#101828',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                  }}>
                    Uploading...
                  </span>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#0077d4',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                  }}>
                    {progress}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: 6,
                  background: '#e4e7ec',
                  borderRadius: 3,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: '#0077d4',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Form */}
          <div style={{
            padding: isMobile ? '20px' : '32px',
            background: '#f8f9fa',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <form onSubmit={handleSubmit} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Client Code Field */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: 600,
                  color: '#0077d4',
                  fontSize: '14px',
                  marginBottom: '8px',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                }}>
                  Client Code <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 32,
                    height: 32,
                    background: '#0077d4',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-id-badge" style={{ color: '#ffffff', fontSize: 14 }}></i>
                  </div>
                  <input
                    type="text"
                    value={clientCode}
                    onChange={e => setClientCode(e.target.value)}
                    placeholder="Enter client code"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 56px',
                      borderRadius: 8,
                      border: '1px solid #e4e7ec',
                      fontSize: '14px',
                      background: '#ffffff',
                      color: '#101828',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#0077d4';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e4e7ec';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: '16px',
                  fontWeight: 500,
                  fontSize: '14px',
                  border: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                }}>
                  <i className="fas fa-exclamation-triangle" style={{ fontSize: 14 }}></i>
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div style={{
                  background: '#f0fdf4',
                  color: '#16a34a',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: '16px',
                  fontWeight: 500,
                  fontSize: '14px',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                }}>
                  <i className="fas fa-check-circle" style={{ fontSize: 14 }}></i>
                  {success}
                </div>
              )}

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !clientCode.trim() || !file}
                style={{
                  width: '100%',
                  background: (loading || !clientCode.trim() || !file) ? '#9ca3af' : '#0077d4',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 20px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: (loading || !clientCode.trim() || !file) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  outline: 'none',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                }}
                onMouseEnter={e => {
                  if (!loading && clientCode.trim() && file) {
                    e.target.style.background = '#0056b3';
                  }
                }}
                onMouseLeave={e => {
                  if (!loading && clientCode.trim() && file) {
                    e.target.style.background = '#0077d4';
                  }
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: 16,
                      height: 16,
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid #ffffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt" style={{ fontSize: 14 }}></i>
                    Upload RFID Data
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminUploadRFID; 