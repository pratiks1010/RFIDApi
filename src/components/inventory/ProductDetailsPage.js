import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  FaArrowLeft,
  FaEdit,
  FaTimes,
  FaSave,
  FaCamera,
  FaSpinner,
  FaInfoCircle,
  FaWeightHanging,
  FaRupeeSign,
  FaMapMarkerAlt,
  FaGem,
  FaExpand,
} from 'react-icons/fa';
import SuccessNotification from '../common/SuccessNotification';

const formDataAxios = axios.create();
formDataAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    if (config.data instanceof FormData) delete config.headers['Content-Type'];
    return config;
  },
  (err) => Promise.reject(err)
);

const IMAGE_BASE_URL = 'https://rrgold.loyalstring.co.in/';
const getItemImageUrl = (item) => {
  if (!item) return null;
  if (item.Images && typeof item.Images === 'string') {
    const firstPath = item.Images.split(',')[0]?.trim();
    if (firstPath) {
      const base = IMAGE_BASE_URL.replace(/\/$/, '');
      const path = firstPath.replace(/^\//, '');
      return `${base}/${path}`;
    }
  }
  return item.Image1 || item.imageurl || item.ImageUrl || null;
};

const formatValue = (value, type = 'text') => {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'number') {
    const num = parseFloat(value);
    return isNaN(num) ? value : num.toFixed(3);
  }
  if (type === 'amount') {
    const num = parseFloat(value);
    return isNaN(num) ? value : num.toFixed(2);
  }
  if (type === 'date') {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
          date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {}
  }
  return value;
};

const statusStyle = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'sold') return { bg: '#dbeafe', color: '#1d4ed8', label: 'Sold' };
  if (v === 'apiactive' || v === 'active') return { bg: '#dcfce7', color: '#15803d', label: 'Active' };
  return { bg: '#f1f5f9', color: '#475569', label: s || '—' };
};

const buildEditFormFromProduct = (p) => ({
  category_id: p.CategoryName ?? p.category_id ?? '',
  product_id: p.ProductName ?? p.product_id ?? '',
  design_id: p.DesignName ?? p.Design ?? p.design_id ?? '',
  purity_id: p.PurityName ?? p.purity_id ?? '',
  branch_id: p.Branch ?? p.BranchName ?? p.branch_id ?? '',
  counter_id: p.CounterName ?? p.counter_id ?? '',
  grosswt: p.GrossWt != null && p.GrossWt !== '' ? String(p.GrossWt) : '',
  netwt: p.NetWt != null && p.NetWt !== '' ? String(p.NetWt) : '',
  stonewt: p.StoneWt != null && p.StoneWt !== '' ? String(p.StoneWt) : '',
  stoneamount: p.StoneAmt != null && p.StoneAmt !== '' ? String(p.StoneAmt) : '',
  diamondAmount: p.DiamondAmt != null && p.DiamondAmt !== '' ? String(p.DiamondAmt) : '',
  diamondWeight: p.DiamondWt != null && p.DiamondWt !== '' ? String(p.DiamondWt) : '',
  box_details: p.BoxDetails ?? p.box_details ?? '',
  MRP: p.MRP != null && p.MRP !== '' ? String(p.MRP) : '',
  HallmarkAmount: p.HallmarkAmount != null && p.HallmarkAmount !== '' ? String(p.HallmarkAmount) : '',
  MakingPerGram: p.MakingPerGram != null && p.MakingPerGram !== '' ? String(p.MakingPerGram) : '',
  MakingPercentage: p.MakingPercentage != null && p.MakingPercentage !== '' ? String(p.MakingPercentage) : '',
  MakingFixedAmt: p.MakingFixedAmt != null && p.MakingFixedAmt !== '' ? String(p.MakingFixedAmt) : '',
  status: p.Status ?? 'ApiActive',
});

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'https://rrgold.loyalstring.co.in';
const UPDATE_API = 'https://soni.loyalstring.co.in/api/ProductMaster/UpdateExistingProducts';
const UPLOAD_IMAGE_API = `${API_BASE.replace(/\/$/, '')}/api/ProductMaster/UploadImagesByClientCode`;

const DetailCard = ({ title, icon: Icon, iconColor, children }) => (
  <div style={{
    background: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
  }}>
    <div style={{
      padding: '6px 10px',
      background: `linear-gradient(135deg, ${iconColor}18 0%, ${iconColor}12 100%)`,
      borderLeft: `3px solid ${iconColor}`,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <span style={{ width: 28, height: 28, borderRadius: 6, background: iconColor, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {Icon && <Icon size={16} style={{ color: '#ffffff' }} />}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{title}</span>
    </div>
    <div style={{ padding: 0 }}>{children}</div>
  </div>
);

const DetailRow = ({ label, value, type = 'text' }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    padding: '4px 10px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: 11,
  }}>
    <span style={{ color: '#64748b', fontWeight: 500, flexShrink: 0 }}>{label}</span>
    <span style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>
      {formatValue(value, type)}
    </span>
  </div>
);

const EditField = ({ label, formKey, type = 'text', placeholder = '', options = [], form, setForm }) => {
  const inputStyle = {
    width: '55%', minWidth: 80, maxWidth: 140, padding: '4px 8px', fontSize: 11, borderRadius: 6,
    border: '1px solid #e2e8f0', outline: 'none', background: '#fff',
  };
  const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '4px 10px', borderBottom: '1px solid #f1f5f9', fontSize: 11 };
  if (options.length) {
    return (
      <div style={rowStyle}>
        <span style={{ color: '#64748b', fontWeight: 500, flexShrink: 0 }}>{label}</span>
        <select value={form[formKey] ?? ''} onChange={(e) => setForm(formKey, e.target.value)} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = '#6366f1'; }} onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}>
          {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
        </select>
      </div>
    );
  }
  return (
    <div style={rowStyle}>
      <span style={{ color: '#64748b', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <input type={type} value={form[formKey] ?? ''} onChange={(e) => setForm(formKey, e.target.value)} placeholder={placeholder} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = '#6366f1'; }} onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }} />
    </div>
  );
};

const ProductDetailsPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const productFromState = state?.product ?? null;
  const apiFilterDataFromState = state?.apiFilterData ?? null;

  const [product, setProduct] = useState(productFromState);
  const [apiFilterData, setApiFilterData] = useState(apiFilterDataFromState || {
    products: [], designs: [], categories: [], purities: [], counters: [], branches: []
  });
  const [displayImageUrl, setDisplayImageUrl] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  const userInfo = (() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo') || 'null');
    } catch (_) {
      return null;
    }
  })();

  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    if (productFromState) {
      setProduct(productFromState);
      setDisplayImageUrl(getItemImageUrl(productFromState));
    }
  }, [productFromState]);

  useEffect(() => {
    if (!apiFilterDataFromState && userInfo?.ClientCode) {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      };
      const body = { ClientCode: userInfo.ClientCode };
      Promise.all([
        axios.post(`${API_BASE}/api/ProductMaster/GetAllProductMaster`, body, { headers }),
        axios.post(`${API_BASE}/api/ProductMaster/GetAllDesign`, body, { headers }),
        axios.post(`${API_BASE}/api/ProductMaster/GetAllCategory`, body, { headers }),
        axios.post(`${API_BASE}/api/ProductMaster/GetAllPurity`, body, { headers }),
        axios.post(`${API_BASE}/api/ClientOnboarding/GetAllCounters`, body, { headers }),
        axios.post(`${API_BASE}/api/ClientOnboarding/GetAllBranchMaster`, body, { headers }),
      ]).then(([p, d, c, pur, cnt, b]) => {
        setApiFilterData({
          products: p.data?.data ?? p.data ?? [],
          designs: d.data?.data ?? d.data ?? [],
          categories: c.data?.data ?? c.data ?? [],
          purities: pur.data?.data ?? pur.data ?? [],
          counters: cnt.data?.data ?? cnt.data ?? [],
          branches: b.data?.data ?? b.data ?? [],
        });
      }).catch(() => {});
    } else if (apiFilterDataFromState) {
      setApiFilterData(apiFilterDataFromState);
    }
  }, [userInfo?.ClientCode, apiFilterDataFromState]);

  const showNotification = (title, message) => {
    setSuccessMessage({ title, message });
    setShowSuccess(true);
  };

  const form = editForm || (product ? buildEditFormFromProduct(product) : {});
  const setForm = (key, value) => setEditForm(prev => ({ ...(prev || (product ? buildEditFormFromProduct(product) : {})), [key]: value }));

  const handleBack = () => navigate('/label-stock', { replace: true });

  const handleStartEdit = () => {
    if (product) {
      setEditForm(buildEditFormFromProduct(product));
      setEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditForm(null);
  };

  const handleSave = async () => {
    if (!product) return;
    const clientCode = userInfo?.ClientCode;
    const rfid = product.RFIDCode || product.RFIDNumber;
    const itemcode = product.ItemCode;
    if (!clientCode || !rfid || !itemcode) {
      showNotification('Error', 'Client code, RFID, or Item code is missing.');
      return;
    }
    const f = editForm || buildEditFormFromProduct(product);
    const payload = [{
      client_code: clientCode,
      RFIDNumber: rfid,
      itemcode,
      category_id: f.category_id || undefined,
      product_id: f.product_id || undefined,
      design_id: f.design_id || undefined,
      purity_id: f.purity_id || undefined,
      branch_id: f.branch_id || undefined,
      counter_id: f.counter_id || undefined,
      grosswt: f.grosswt || undefined,
      netwt: f.netwt || undefined,
      stonewt: f.stonewt || undefined,
      stoneamount: f.stoneamount || undefined,
      diamondAmount: f.diamondAmount || undefined,
      diamondWeight: f.diamondWeight || undefined,
      box_details: f.box_details || undefined,
      MRP: f.MRP || undefined,
      HallmarkAmount: f.HallmarkAmount || undefined,
      MakingPerGram: f.MakingPerGram || undefined,
      MakingPercentage: f.MakingPercentage || undefined,
      MakingFixedAmt: f.MakingFixedAmt || undefined,
      status: f.status || 'ApiActive',
    }];
    setSaveLoading(true);
    try {
      const response = await axios.post(UPDATE_API, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      });
      const data = response.data;
      if (data && data.status === 'success') {
        const updated = {
          ...product,
          CategoryName: f.category_id || product.CategoryName,
          ProductName: f.product_id || product.ProductName,
          DesignName: f.design_id || product.DesignName,
          PurityName: f.purity_id || product.PurityName,
          Branch: f.branch_id || product.Branch,
          BranchName: f.branch_id || product.BranchName,
          CounterName: f.counter_id || product.CounterName,
          GrossWt: f.grosswt != null && f.grosswt !== '' ? parseFloat(f.grosswt) : product.GrossWt,
          NetWt: f.netwt != null && f.netwt !== '' ? parseFloat(f.netwt) : product.NetWt,
          StoneWt: f.stonewt != null && f.stonewt !== '' ? parseFloat(f.stonewt) : product.StoneWt,
          StoneAmt: f.stoneamount != null && f.stoneamount !== '' ? parseFloat(f.stoneamount) : product.StoneAmt,
          DiamondAmt: f.diamondAmount != null && f.diamondAmount !== '' ? parseFloat(f.diamondAmount) : product.DiamondAmt,
          DiamondWt: f.diamondWeight != null && f.diamondWeight !== '' ? parseFloat(f.diamondWeight) : product.DiamondWt,
          BoxDetails: f.box_details || product.BoxDetails,
          MRP: f.MRP != null && f.MRP !== '' ? parseFloat(f.MRP) : product.MRP,
          HallmarkAmount: f.HallmarkAmount != null && f.HallmarkAmount !== '' ? parseFloat(f.HallmarkAmount) : product.HallmarkAmount,
          MakingPerGram: f.MakingPerGram != null && f.MakingPerGram !== '' ? parseFloat(f.MakingPerGram) : product.MakingPerGram,
          MakingPercentage: f.MakingPercentage != null && f.MakingPercentage !== '' ? parseFloat(f.MakingPercentage) : product.MakingPercentage,
          MakingFixedAmt: f.MakingFixedAmt != null && f.MakingFixedAmt !== '' ? parseFloat(f.MakingFixedAmt) : product.MakingFixedAmt,
          Status: f.status || product.Status,
        };
        setProduct(updated);
        setEditMode(false);
        setEditForm(null);
        showNotification('Saved', data.message || 'Product details updated successfully.');
      } else {
        throw new Error(data?.message || 'Update failed');
      }
    } catch (err) {
      showNotification('Update failed', err.response?.data?.message || err.message || 'Failed to update product.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const clientCode = userInfo?.ClientCode;
    const itemCode = product?.ItemCode;
    let designId = product?.DesignId ?? product?.DesignID ?? 0;
    if (!designId && (product?.DesignName || product?.Design) && apiFilterData.designs?.length) {
      const designName = product.DesignName || product.Design;
      const found = apiFilterData.designs.find(d =>
        (d.DesignName || d.Name || d.designName) === designName
      );
      if (found) designId = found.Id ?? found.DesignId ?? found.ID ?? 0;
    }
    if (!clientCode || !itemCode) {
      showNotification('Error', 'Client code or item code is missing.');
      return;
    }
    if (!designId) {
      showNotification('Error', 'Design is missing for this product.');
      return;
    }
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('ClientCode', clientCode);
      formData.append('DesignId', String(designId));
      formData.append('ItemCode', itemCode);
      formData.append('file1', file);
      const response = await formDataAxios.post(UPLOAD_IMAGE_API, formData);
      if (response.data && response.data.success !== false) {
        setDisplayImageUrl(URL.createObjectURL(file));
        showNotification('Image uploaded', 'Product image uploaded successfully.');
      } else {
        showNotification('Upload failed', response.data?.message || 'Could not upload image.');
      }
    } catch (err) {
      showNotification('Upload failed', err.response?.data?.message || err.message || 'Could not upload image.');
    } finally {
      setImageUploading(false);
    }
    e.target.value = '';
  };

  const getOptions = (key) => {
    const map = {
      category_id: apiFilterData.categories,
      product_id: apiFilterData.products,
      design_id: apiFilterData.designs,
      purity_id: apiFilterData.purities,
      branch_id: apiFilterData.branches,
      counter_id: apiFilterData.counters,
    };
    const list = map[key] || [];
    const nameKey = key === 'category_id' ? 'CategoryName' : key === 'product_id' ? 'ProductName' : key === 'design_id' ? 'DesignName' : key === 'purity_id' ? 'PurityName' : key === 'branch_id' ? 'BranchName' : 'CounterName';
    const names = list.map(x => x[nameKey] ?? x.Name ?? x[nameKey.replace('_id', '')]).filter(Boolean);
    return [...new Set(names)].sort((a, b) => String(a).localeCompare(String(b)));
  };

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, color: '#64748b', marginBottom: 16 }}>Product not found.</p>
          <button
            onClick={() => navigate('/label-stock')}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: '1px solid #6366f1',
              background: '#eef2ff',
              color: '#4f46e5',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to Label Stock
          </button>
        </div>
      </div>
    );
  }

  const st = statusStyle(product.Status);
  const isNarrow = windowWidth <= 768;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    }}>
      <SuccessNotification title={successMessage.title} message={successMessage.message} isVisible={showSuccess} onClose={() => setShowSuccess(false)} />

      {/* Image popup - large image on click */}
      {showImagePopup && displayImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Product image"
          onClick={() => setShowImagePopup(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <button
            onClick={() => setShowImagePopup(false)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2001,
            }}
            aria-label="Close"
          >
            <FaTimes size={20} style={{ color: '#ffffff' }} />
          </button>
          <img
            src={displayImageUrl}
            alt="Product"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain' }}
          />
        </div>
      )}

      {/* Header */}
      <header style={{
        background: '#ffffff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleBack}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600,
                borderRadius: 6, border: 'none', background: '#475569', color: '#ffffff', cursor: 'pointer',
              }}
            >
              <FaArrowLeft size={16} style={{ color: '#ffffff' }} /> Back
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: isNarrow ? 14 : 16, fontWeight: 700, color: '#0f172a' }}>
                Product Details
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Item: <strong style={{ color: '#1e293b' }}>{product.ItemCode || '—'}</strong></span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>RFID: <strong style={{ color: '#1e293b' }}>{product.RFIDCode || product.RFIDNumber || '—'}</strong></span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10, background: st.bg, color: st.color }}>
                  {st.label}
                </span>
              </div>
            </div>
            {editMode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={handleCancelEdit} disabled={saveLoading} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 11, fontWeight: 600,
                  borderRadius: 6, border: 'none', background: '#64748b', color: '#ffffff', cursor: saveLoading ? 'not-allowed' : 'pointer',
                }}>
                  <FaTimes size={16} style={{ color: '#ffffff' }} /> Cancel
                </button>
                <button onClick={handleSave} disabled={saveLoading} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 11, fontWeight: 600,
                  borderRadius: 6, border: 'none', background: '#059669', color: '#ffffff', cursor: saveLoading ? 'not-allowed' : 'pointer',
                }}>
                  {saveLoading ? <FaSpinner size={16} style={{ animation: 'spin 0.8s linear infinite', color: '#ffffff' }} /> : <FaSave size={16} style={{ color: '#ffffff' }} />}
                  {saveLoading ? 'Saving…' : 'Save'}
                </button>
              </div>
            ) : (
              <button onClick={handleStartEdit} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 11, fontWeight: 600,
                borderRadius: 6, border: 'none', background: '#6366f1', color: '#ffffff', cursor: 'pointer',
              }}>
                <FaEdit size={16} style={{ color: '#ffffff' }} /> Edit
              </button>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 12 }}>
        {/* Top row: Image section (left) + Key stats (right) - different layout */}
        <div style={{
          display: isNarrow ? 'block' : 'flex',
          gap: 12,
          marginBottom: 12,
          alignItems: 'flex-start',
        }}>
          {/* Image section - separate card, click to enlarge */}
          <section style={{
            background: '#ffffff',
            borderRadius: 8,
            padding: 12,
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flexShrink: 0,
            width: isNarrow ? '100%' : 160,
          }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => (displayImageUrl ? setShowImagePopup(true) : document.getElementById('product-detail-image-upload')?.click())}
              onKeyDown={(e) => { if (e.key === 'Enter' && displayImageUrl) setShowImagePopup(true); }}
              style={{
                width: isNarrow ? 100 : 120,
                height: isNarrow ? 100 : 120,
                borderRadius: 8,
                background: displayImageUrl ? '#f8fafc' : '#94a3b8',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: displayImageUrl ? 'pointer' : 'default',
                position: 'relative',
              }}
            >
              {displayImageUrl ? (
                <>
                  <img src={displayImageUrl} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <span style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 4, padding: '2px 4px', display: 'flex' }}>
                    <FaExpand size={12} style={{ color: '#ffffff' }} />
                  </span>
                </>
              ) : (
                <FaCamera size={36} style={{ color: '#ffffff' }} />
              )}
            </div>
            <label htmlFor="product-detail-image-upload" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8,
              padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: 'none',
              background: imageUploading ? '#94a3b8' : '#64748b', color: '#ffffff', cursor: imageUploading ? 'not-allowed' : 'pointer',
              width: '100%',
            }}>
              {imageUploading ? <FaSpinner size={14} style={{ animation: 'spin 0.8s linear infinite', color: '#ffffff' }} /> : <FaCamera size={14} style={{ color: '#ffffff' }} />}
              {imageUploading ? 'Uploading…' : (displayImageUrl ? 'Change image' : 'Upload image')}
            </label>
            <input id="product-detail-image-upload" type="file" accept="image/*" onChange={handleImageChange} disabled={imageUploading} style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }} />
          </section>

          {/* Top section - key stats */}
          <section style={{
            flex: 1,
            minWidth: 0,
            background: '#ffffff',
            borderRadius: 8,
            padding: 12,
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, width: '100%' }}>
              {[
                { label: 'Product', value: formatValue(product.ProductName), color: '#6366f1' },
                { label: 'Category', value: formatValue(product.CategoryName), color: '#059669' },
                { label: 'MRP', value: `₹ ${formatValue(product.MRP, 'amount')}`, color: '#d97706' },
                { label: 'Net Wt', value: `${formatValue(product.NetWt, 'number')} g`, color: '#7c3aed' },
                { label: 'Design', value: formatValue(product.DesignName || product.Design), color: '#0ea5e9' },
                { label: 'Purity', value: formatValue(product.PurityName || product.Purity), color: '#b45309' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  padding: '8px 10px', background: `${color}15`, borderRadius: 6, border: `1px solid ${color}40`,
                }}>
                  <div style={{ fontSize: 10, color, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', lineHeight: 1.2 }}>{value}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: windowWidth > 1100 ? 'repeat(2, 1fr)' : '1fr',
          gap: 8,
        }}>
          <DetailCard title="Basic info" Icon={FaInfoCircle} iconColor="#2563eb">
            {editMode ? (
              <>
                <EditField label="Category" formKey="category_id" form={form} setForm={setForm} options={getOptions('category_id')} />
                <EditField label="Product" formKey="product_id" form={form} setForm={setForm} options={getOptions('product_id')} />
                <EditField label="Design" formKey="design_id" form={form} setForm={setForm} options={getOptions('design_id')} />
                <EditField label="Purity" formKey="purity_id" form={form} setForm={setForm} options={getOptions('purity_id')} />
                <EditField label="Status" formKey="status" form={form} setForm={setForm} options={['ApiActive', 'Sold']} />
              </>
            ) : (
              <>
                <DetailRow label="Item Code" value={product.ItemCode} />
                <DetailRow label="RFID" value={product.RFIDCode || product.RFIDNumber} />
                <DetailRow label="Category" value={product.CategoryName} />
                <DetailRow label="Product" value={product.ProductName} />
                <DetailRow label="Design" value={product.DesignName || product.Design} />
                <DetailRow label="Purity" value={product.PurityName || product.Purity} />
                <DetailRow label="Status" value={product.Status} />
                <DetailRow label="Description" value={product.Description || product.description} />
              </>
            )}
          </DetailCard>

          <DetailCard title="Weight" Icon={FaWeightHanging} iconColor="#059669">
            {editMode ? (
              <>
                <EditField label="Gross Wt (g)" formKey="grosswt" type="number" form={form} setForm={setForm} />
                <EditField label="Net Wt (g)" formKey="netwt" type="number" form={form} setForm={setForm} />
                <EditField label="Stone Wt" formKey="stonewt" type="number" form={form} setForm={setForm} />
                <EditField label="Diamond Wt" formKey="diamondWeight" type="number" form={form} setForm={setForm} />
              </>
            ) : (
              <>
                <DetailRow label="Gross Wt" value={product.GrossWt} type="number" />
                <DetailRow label="Net Wt" value={product.NetWt} type="number" />
                <DetailRow label="Stone Wt" value={product.StoneWt} type="number" />
                <DetailRow label="Diamond Wt" value={product.DiamondWt} type="number" />
                <DetailRow label="Packing Wt" value={product.PackingWeight} type="number" />
                <DetailRow label="Total Wt" value={product.TotalWeight} type="number" />
              </>
            )}
          </DetailCard>

          <DetailCard title="Amount & pricing" Icon={FaRupeeSign} iconColor="#d97706">
            {editMode ? (
              <>
                <EditField label="Stone Amt" formKey="stoneamount" type="number" form={form} setForm={setForm} />
                <EditField label="Diamond Amt" formKey="diamondAmount" type="number" form={form} setForm={setForm} />
                <EditField label="Hallmark Amt" formKey="HallmarkAmount" type="number" form={form} setForm={setForm} />
                <EditField label="Making/Gram" formKey="MakingPerGram" type="number" form={form} setForm={setForm} />
                <EditField label="Making %" formKey="MakingPercentage" type="number" form={form} setForm={setForm} />
                <EditField label="Making Fixed" formKey="MakingFixedAmt" type="number" form={form} setForm={setForm} />
                <EditField label="MRP" formKey="MRP" type="number" form={form} setForm={setForm} />
              </>
            ) : (
              <>
                <DetailRow label="Stone Amt" value={product.StoneAmt} type="amount" />
                <DetailRow label="Diamond Amt" value={product.DiamondAmt} type="amount" />
                <DetailRow label="Fixed Amt" value={product.FixedAmt} type="amount" />
                <DetailRow label="Making/Gram" value={product.MakingPerGram} type="amount" />
                <DetailRow label="Making %" value={product.MakingPercentage} type="amount" />
                <DetailRow label="MRP" value={product.MRP} type="amount" />
              </>
            )}
          </DetailCard>

          <DetailCard title="Location & meta" Icon={FaMapMarkerAlt} iconColor="#7c3aed">
            {editMode ? (
              <>
                <EditField label="Branch" formKey="branch_id" form={form} setForm={setForm} options={getOptions('branch_id')} />
                <EditField label="Counter" formKey="counter_id" form={form} setForm={setForm} options={getOptions('counter_id')} />
                <EditField label="Box" formKey="box_details" form={form} setForm={setForm} />
              </>
            ) : (
              <>
                <DetailRow label="Branch" value={product.Branch || product.BranchName} />
                <DetailRow label="Counter" value={product.CounterName} />
                <DetailRow label="Box" value={product.BoxDetails} />
                <DetailRow label="Vendor" value={product.Vendor} />
                <DetailRow label="Size" value={product.Size} />
                <DetailRow label="Created" value={product.CreatedDate || product.CreatedOn} type="date" />
              </>
            )}
          </DetailCard>
        </div>

        {/* Stones & Diamonds */}
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr', gap: 8, marginTop: 8 }}>
          <DetailCard title={product.Stones?.length ? `Stones (${product.Stones.length})` : 'Stones'} Icon={FaGem} iconColor="#d97706">
            {product.Stones?.length > 0 ? (
              <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#fffbeb', zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '4px 10px', textAlign: 'left', fontWeight: 600, color: '#92400e' }}>Name</th>
                      <th style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 600, color: '#92400e' }}>Wt</th>
                      <th style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 600, color: '#92400e' }}>Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.Stones.map((stone, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? '#fffbeb' : '#fff' }}>
                        <td style={{ padding: '3px 10px', color: '#1e293b' }}>{stone.StoneName || '—'}</td>
                        <td style={{ padding: '3px 10px', textAlign: 'right', color: '#1e293b' }}>{formatValue(stone.StoneWeight, 'number')}</td>
                        <td style={{ padding: '3px 10px', textAlign: 'right', color: '#1e293b' }}>{formatValue(stone.StoneAmount, 'amount')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '8px 10px', fontSize: 11, color: '#94a3b8' }}>No stones</div>
            )}
          </DetailCard>
          <DetailCard title={product.Diamonds?.length ? `Diamonds (${product.Diamonds.length})` : 'Diamonds'} Icon={FaGem} iconColor="#7c3aed">
            {product.Diamonds?.length > 0 ? (
              <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f5f3ff', zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '4px 10px', textAlign: 'left', fontWeight: 600, color: '#5b21b6' }}>Name</th>
                      <th style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 600, color: '#5b21b6' }}>Wt</th>
                      <th style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 600, color: '#5b21b6' }}>Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.Diamonds.map((diamond, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? '#f5f3ff' : '#fff' }}>
                        <td style={{ padding: '3px 10px', color: '#1e293b' }}>{diamond.DiamondName || '—'}</td>
                        <td style={{ padding: '3px 10px', textAlign: 'right', color: '#1e293b' }}>{formatValue(diamond.DiamondWeight, 'number')}</td>
                        <td style={{ padding: '3px 10px', textAlign: 'right', color: '#1e293b' }}>{formatValue(diamond.DiamondSellAmount, 'amount')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '8px 10px', fontSize: 11, color: '#94a3b8' }}>No diamonds</div>
            )}
          </DetailCard>
        </div>
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ProductDetailsPage;
