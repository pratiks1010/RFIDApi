import React, { useEffect, useState } from 'react';
import { FaArrowLeft, FaCheckCircle, FaFolderOpen, FaTrashAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import {
  canResolveLocalItemImages,
  clearItemImageDirectoryHandle,
  getItemImageDirectoryMeta,
  isLocalItemImageFolderSupported,
  resolveLocalItemImageBlobUrl,
  saveItemImageDirectoryHandle,
  warmupLocalItemImageIndex,
} from '../services/localItemImageService';

const ItemImageFolderUtility = () => {
  const navigate = useNavigate();
  const [supported, setSupported] = useState(isLocalItemImageFolderSupported());
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [testCode, setTestCode] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const refreshMeta = async () => {
    const nextMeta = await getItemImageDirectoryMeta();
    setMeta(nextMeta);
  };

  useEffect(() => {
    setSupported(isLocalItemImageFolderSupported());
    refreshMeta();
  }, []);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const chooseFolder = async () => {
    if (!supported) {
      setStatus('This browser does not support folder picker. Use the desktop app Chromium build.');
      return;
    }
    setLoading(true);
    setStatus('');
    try {
      const directoryHandle = await window.showDirectoryPicker({ mode: 'read' });
      await saveItemImageDirectoryHandle(directoryHandle);
      const warmup = await warmupLocalItemImageIndex();
      const enabled = await canResolveLocalItemImages();
      await refreshMeta();
      setStatus(enabled ? `Image folder connected successfully. Indexed ${warmup?.count || 0} files.` : 'Folder selected, but read permission is pending.');
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setStatus(err?.message || 'Unable to select folder.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearFolder = async () => {
    setLoading(true);
    try {
      await clearItemImageDirectoryHandle();
      await refreshMeta();
      setStatus('Image folder setting cleared.');
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
    } finally {
      setLoading(false);
    }
  };

  const testImage = async () => {
    const code = String(testCode || '').trim();
    if (!code) {
      setStatus('Enter item code to test image match.');
      return;
    }
    setLoading(true);
    setStatus('');
    try {
      const url = await resolveLocalItemImageBlobUrl(code);
      if (!url) {
        setStatus(`No image found for item code "${code}". Keep file name exactly same as item code.`);
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      setStatus(`Image matched for item code "${code}".`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 16 }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
          border: '1px solid #dbeafe',
          borderRadius: 14,
          padding: 18,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Item Image Folder Utility</h2>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#475569', maxWidth: 700, lineHeight: 1.5 }}>
              Link your local item image folder where file names match item codes. Example: <strong>ABC123.jpg</strong> for item code <strong>ABC123</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/rfid-utility')}
            style={{
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#334155',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
            }}
          >
            <FaArrowLeft />
            Go Back
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 3px 10px rgba(15, 23, 42, 0.04)' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <button
            type="button"
            onClick={chooseFolder}
            disabled={loading}
            style={{
              border: '1px solid #1d4ed8',
              background: '#2563eb',
              color: '#fff',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
            }}
          >
            <FaFolderOpen />
            {loading ? 'Working...' : 'Browse Folder'}
          </button>
          <button
            type="button"
            onClick={clearFolder}
            disabled={loading}
            style={{
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#475569',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FaTrashAlt />
            Clear
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 14 }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>Browser Support</div>
            <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>{supported ? 'Supported' : 'Not Supported'}</div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>Selected Folder</div>
            <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>{meta?.name || 'Not selected'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            type="text"
            value={testCode}
            onChange={(e) => setTestCode(e.target.value)}
            placeholder="Enter item code to test (e.g. LS1001)"
            style={{
              minWidth: 260,
              flex: 1,
              maxWidth: 360,
              height: 38,
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              padding: '0 12px',
              fontSize: 13,
              color: '#0f172a',
              background: '#fff',
            }}
          />
          <button
            type="button"
            onClick={testImage}
            disabled={loading}
            style={{
              border: '1px solid #0f766e',
              background: '#0f766e',
              color: '#fff',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15, 118, 110, 0.2)',
            }}
          >
            Test Image
          </button>
        </div>

        {!!status && (
          <div
            style={{
              fontSize: 12,
              color: status.toLowerCase().includes('success') || status.toLowerCase().includes('matched') ? '#166534' : '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginBottom: previewUrl ? 12 : 0,
              border: '1px solid #d1fae5',
              borderRadius: 10,
              padding: '10px 12px',
              background: '#f0fdf4',
            }}
          >
            <FaCheckCircle style={{ color: '#16a34a', minWidth: 14 }} />
            {status}
          </div>
        )}

        {!!previewUrl && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', width: 260, boxShadow: '0 3px 10px rgba(15, 23, 42, 0.08)' }}>
            <img src={previewUrl} alt="Item preview" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemImageFolderUtility;
