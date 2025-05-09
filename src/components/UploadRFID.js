// UploadRFID.js - RFID Excel uploader for /upload-rfid route
// Uses clientCode from localStorage and uploads via multipart/form-data
import React, { useRef, useState, useEffect } from 'react';
import { FaCloudUploadAlt, FaFileExcel, FaTimes, FaCheckCircle } from 'react-icons/fa';
import Header from './Header';

const API_URL = 'https://testing.loyalstring.co.in/api/Device/ImportRFIDData';

const UploadRFID = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef();
  const [userInfo, setUserInfo] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Get clientCode and userInfo from localStorage
  let clientCode = '';
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('userInfo'));
      setUserInfo(user);
      clientCode = user?.ClientCode || '';
    } catch {}
  }, []);
  try {
    const user = JSON.parse(localStorage.getItem('userInfo'));
    clientCode = user?.ClientCode || '';
  } catch {}

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      setError('');
      setSuccess(null);
    } else {
      setError('Please select a valid Excel file (.xlsx or .xls)');
      setSelectedFile(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        setSelectedFile(file);
        setError('');
        setSuccess(null);
      } else {
        setError('Please select a valid Excel file (.xlsx or .xls)');
        setSelectedFile(null);
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
    setSelectedFile(null);
    setUploadProgress(0);
    setSuccess(null);
    setError('');
  };

  // For progress bar, use xhr
  const uploadWithProgress = () => {
    if (!selectedFile || !clientCode) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess(null);
    setShowSuccessModal(false);
    const formData = new FormData();
    formData.append('ClientCode', clientCode);
    formData.append('file', selectedFile);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_URL);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setSuccess('File uploaded successfully!');
        setShowSuccessModal(true);
        setSelectedFile(null);
      } else {
        setError('Upload failed. Please try again.');
      }
      setUploading(false);
      setUploadProgress(100);
    };
    xhr.onerror = () => {
      setError('Upload failed. Please try again.');
      setUploading(false);
    };
    xhr.send(formData);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 60%, #ececec 100%)', fontFamily: 'Poppins, Inter, sans-serif' }}>
      <Header userInfo={userInfo} />
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 0 0 0' }}>
        <div className="text-center" style={{ marginBottom: 18 }}>
          <h1 style={{
            fontWeight: 800,
            fontSize: 30,
            color: '#0078d4',
            letterSpacing: 0.5,
            marginBottom: 8,
            textAlign: 'center',
            textShadow: '0 2px 8px #0078d411',
            borderBottom: '3px solid #0078d4',
            display: 'inline-block',
            paddingBottom: 6,
            background: 'linear-gradient(90deg, #0078d4 0%, #d60000 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Upload Sheet to Add EPC Tags
          </h1>
          <div style={{ fontSize: 14, color: '#444', fontWeight: 500, marginTop: 16, marginBottom: 8, textAlign: 'center', lineHeight: 1.5 }}>
            Upload your Excel file to quickly add multiple EPC tags to your inventory.<br />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: 420 }}>
          <div style={{ background: 'linear-gradient(135deg, #fff 0%, #f7fafd 100%)', borderRadius: 28, boxShadow: '0 10px 40px 0 rgba(0, 120, 212, 0.13)', padding: '2.8rem 2.5rem 2.2rem 2.5rem', minWidth: 400, maxWidth: 440, width: '100%', border: '2px solid #e0e6ed', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 8, background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}></div>
            <div style={{ fontWeight: 700, color: '#0078d4', fontSize: 17, marginBottom: 18, letterSpacing: 0.2, textAlign: 'left' }}>FILE UPLOADER</div>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #ececec 100%)',
                border: '2.5px dashed #0078d4',
                borderRadius: 18,
                padding: '2.2rem 1.2rem',
                textAlign: 'center',
                marginBottom: 18,
                cursor: 'pointer',
                transition: 'border 0.2s',
                boxShadow: '0 2px 12px #0078d422',
                position: 'relative',
              }}
              onClick={handleBrowseClick}
            >
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                <FaCloudUploadAlt size={54} style={{ color: 'url(#blueBlueGradient)', filter: 'drop-shadow(0 4px 16px #0078d4aa) drop-shadow(0 2px 8px #5470FFaa)' }} />
                <svg width="0" height="0">
                  <linearGradient id="blueBlueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop stopColor="#0078d4" offset="0%" />
                    <stop stopColor="#5470FF" offset="100%" />
                  </linearGradient>
                </svg>
              </div>
              <div style={{ margin: '18px 0 8px 0', fontWeight: 600, color: '#333', fontSize: 18 }}>Drag and drop your files here</div>
              <div style={{ color: '#aaa', fontSize: 15, marginBottom: 10 }}>OR</div>
              <button
                type="button"
                style={{
                  background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 32px',
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: 'pointer',
                  boxShadow: '0 2px 12px #0078d422',
                  marginBottom: 0,
                  fontFamily: 'Poppins, Inter, sans-serif',
                  transition: 'background 0.2s, transform 0.2s',
                }}
                onClick={e => { e.stopPropagation(); handleBrowseClick(); }}
                disabled={uploading}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #5470FF 0%, #0078d4 100%)';
                  e.currentTarget.style.transform = 'scale(1.04)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Browse files
              </button>
              <input
                type="file"
                accept=".xlsx,.xls"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={uploading}
              />
              {/* File restriction message always visible below upload field */}
              <div style={{ color: '#0078d4', fontWeight: 600, fontSize: 15, marginTop: 18, marginBottom: 0, textAlign: 'center' }}>
                Only .xlsx or .xls files are supported.
              </div>
            </div>
            {/* File preview and progress */}
            {selectedFile && (
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1rem 1.2rem', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12, position: 'relative', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <FaFileExcel size={32} style={{ color: '#7b4be3', background: '#e6e6fa', borderRadius: 8, padding: 4 }} />
                  <div style={{ flex: 1, marginLeft: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#333', marginBottom: 2 }}>{selectedFile.name}</div>
                    <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>{(selectedFile.size / 1024).toFixed(0)} kb</div>
                  </div>
                  {!uploading && (
                    <button onClick={handleRemoveFile} style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: 20, cursor: 'pointer', marginLeft: 6 }}><FaTimes /></button>
                  )}
                </div>
                {/* Progress bar */}
                {uploading && (
                  <div style={{ width: '100%', marginTop: 12, marginBottom: 0 }}>
                    <div style={{ height: 10, background: '#e3f0ff', borderRadius: 6, overflow: 'hidden', marginBottom: 2 }}>
                      <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)', borderRadius: 6, transition: 'width 0.3s' }}></div>
                    </div>
                    <div style={{ fontSize: 13, color: '#0078d4', fontWeight: 600, textAlign: 'right' }}>{uploadProgress}%</div>
                  </div>
                )}
              </div>
            )}
            {/* Upload button */}
            {selectedFile && (
              <button
                type="button"
                style={{
                  background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 32px',
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 12px #0078d422',
                  width: '100%',
                  marginBottom: 10,
                  fontFamily: 'Poppins, Inter, sans-serif',
                  transition: 'background 0.2s, transform 0.2s',
                }}
                onClick={uploadWithProgress}
                disabled={uploading}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #5470FF 0%, #0078d4 100%)';
                  e.currentTarget.style.transform = 'scale(1.04)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            )}
            {/* Success/Error messages */}
            {success && !showSuccessModal && (
              <div style={{ color: '#2ecc71', fontWeight: 600, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}><FaCheckCircle /> {success}</div>
            )}
            {error && (
              <div style={{ color: '#e74c3c', fontWeight: 600, marginTop: 10 }}>{error}</div>
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
              background: 'linear-gradient(135deg, #e3f0ff 0%, #b3d8ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
              boxShadow: '0 4px 18px #b3d8ff44',
              position: 'relative',
              animation: 'popIn 0.5s cubic-bezier(.68,-0.55,.27,1.55)'
            }}>
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="19" cy="19" r="18" stroke="#22bb33" strokeWidth="3" fill="#fff" />
                <path d="M11 20.5L17 26.5L27 14.5" stroke="#22bb33" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <animate attributeName="stroke-dasharray" from="0,40" to="40,0" dur="0.7s" fill="freeze" />
                </path>
              </svg>
            </div>
            <div style={{
              fontWeight: 800,
              fontSize: 24,
              color: '#0078d4',
              marginBottom: 8,
              fontFamily: 'Poppins, Inter, sans-serif',
              letterSpacing: 0.1,
              background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 8px #b3d8ff22'
            }}>
              Sheet uploaded successfully.
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