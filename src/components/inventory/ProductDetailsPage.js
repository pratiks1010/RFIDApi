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

const DetailCard = ({ title, icon: Icon, iconColor, children, compact }) => (
  <div className="pdp-card" style={{
    background: '#ffffff',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: '1px solid #e5e7eb',
  }}>
    <div style={{
      padding: compact ? '10px 14px' : '12px 16px',
      background: '#fafafa',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <span style={{ width: 32, height: 32, borderRadius: 8, background: iconColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {Icon && <Icon size={16} style={{ color: '#fff' }} />}
      </span>
      <span className="pdp-card-title" style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{title}</span>
    </div>
    <div style={{ padding: 0 }}>{children}</div>
  </div>
);

const DetailRow = ({ label, value, type = 'text' }) => (
  <div className="pdp-detail-row" style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    borderBottom: '1px solid #f3f4f6',
    fontSize: 13,
    minHeight: 44,
  }}>
    <span style={{ color: '#6b7280', fontWeight: 500, flexShrink: 0 }}>{label}</span>
    <span style={{ color: '#111827', fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>
      {formatValue(value, type)}
    </span>
  </div>
);

const EditField = ({ label, formKey, type = 'text', placeholder = '', options = [], form, setForm, isMobile }) => {
  const inputStyle = {
    flex: isMobile ? '1' : '0 1 auto',
    width: isMobile ? '100%' : '55%',
    minWidth: isMobile ? 0 : 80,
    maxWidth: isMobile ? 'none' : 180,
    padding: '8px 12px',
    fontSize: 13,
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
  };
  const rowStyle = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: isMobile ? 'flex-start' : 'space-between',
    alignItems: isMobile ? 'stretch' : 'center',
    gap: isMobile ? 6 : 12,
    padding: '10px 14px',
    borderBottom: '1px solid #f3f4f6',
    fontSize: 13,
    minHeight: 44,
  };
  if (options.length) {
    return (
      <div style={rowStyle}>
        <span style={{ color: '#6b7280', fontWeight: 500, flexShrink: 0 }}>{label}</span>
        <select value={form[formKey] ?? ''} onChange={(e) => setForm(formKey, e.target.value)} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = '#2563eb'; }} onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}>
          {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
        </select>
      </div>
    );
  }
  return (
    <div style={rowStyle}>
      <span style={{ color: '#6b7280', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <input type={type} value={form[formKey] ?? ''} onChange={(e) => setForm(formKey, e.target.value)} placeholder={placeholder} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = '#2563eb'; }} onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }} />
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
      <div className="pdp-page" style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>Product not found. Go back to the list to select a product.</p>
          <button
            onClick={() => navigate('/label-stock')}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              color: '#2563eb',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            Back to Label Stock
          </button>
        </div>
      </div>
    );
  }

  const st = statusStyle(product.Status);
  const isMobile = windowWidth <= 576;
  const isTablet = windowWidth > 576 && windowWidth <= 992;
  const isNarrow = windowWidth <= 768;
  const isDesktop = windowWidth > 992;
  const containerPadding = isMobile ? 16 : isTablet ? 20 : 24;
  const mainMaxWidth = 1100;

  return (
    <div className="pdp-page" style={{
      minHeight: '100vh',
      background: '#f9fafb',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: windowWidth <= 576 ? 16 : 24,
          }}
        >
          <button
            onClick={() => setShowImagePopup(false)}
            style={{
              position: 'absolute',
              top: windowWidth <= 576 ? 12 : 20,
              right: windowWidth <= 576 ? 12 : 20,
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2001,
            }}
            aria-label="Close"
          >
            <FaTimes size={22} />
          </button>
          <img
            src={displayImageUrl}
            alt="Product"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }}
          />
        </div>
      )}

      {/* Header - Zoho-style */}
      <header className="pdp-header" style={{
        background: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: mainMaxWidth, margin: '0 auto', padding: isMobile ? '12px 16px' : isTablet ? '14px 20px' : '16px 24px' }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: isMobile ? 12 : 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={handleBack}
                aria-label="Back to list"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: isMobile ? '10px 14px' : '8px 14px',
                  fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid #e5e7eb',
                  background: '#fff', color: '#374151', cursor: 'pointer', minHeight: 40,
                }}
              >
                <FaArrowLeft size={18} style={{ color: '#374151' }} /> Back
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: 600, color: '#111827' }}>
                  Product Details
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Item: <strong style={{ color: '#111827' }}>{product.ItemCode || '—'}</strong></span>
                  <span style={{ color: '#d1d5db' }}>|</span>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>RFID: <strong style={{ color: '#111827' }}>{product.RFIDCode || product.RFIDNumber || '—'}</strong></span>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, ...(isMobile && { justifyContent: 'flex-end' }) }}>
              {editMode ? (
                <>
                  <button onClick={handleCancelEdit} disabled={saveLoading} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                    borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: saveLoading ? 'not-allowed' : 'pointer', minHeight: 40,
                  }}>
                    <FaTimes size={16} /> Cancel
                  </button>
                  <button onClick={handleSave} disabled={saveLoading} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                    borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: saveLoading ? 'not-allowed' : 'pointer', minHeight: 40,
                  }}>
                    {saveLoading ? <FaSpinner size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FaSave size={16} />}
                    {saveLoading ? 'Saving…' : 'Save'}
                  </button>
                </>
              ) : (
                <button onClick={handleStartEdit} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                  borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', minHeight: 40,
                }}>
                  <FaEdit size={16} /> Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="pdp-main" style={{ maxWidth: mainMaxWidth, margin: '0 auto', padding: containerPadding }}>
        {/* Top: Image + Key stats - responsive row */}
        <div className="pdp-hero" style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 16 : 20,
          marginBottom: 20,
          alignItems: isMobile ? 'stretch' : 'flex-start',
        }}>
          {/* Image card */}
          <section className="pdp-image-card" style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: isMobile ? 20 : 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flexShrink: 0,
            width: isMobile ? '100%' : 200,
          }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => (displayImageUrl ? setShowImagePopup(true) : document.getElementById('product-detail-image-upload')?.click())}
              onKeyDown={(e) => { if (e.key === 'Enter' && displayImageUrl) setShowImagePopup(true); }}
              style={{
                width: isMobile ? 160 : 152,
                height: isMobile ? 160 : 152,
                borderRadius: 12,
                background: displayImageUrl ? '#f9fafb' : '#e5e7eb',
                border: '1px solid #e5e7eb',
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
                  <span style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 6, padding: '4px 6px' }}>
                    <FaExpand size={14} />
                  </span>
                </>
              ) : (
                <FaCamera size={40} style={{ color: '#9ca3af' }} />
              )}
            </div>
            <label htmlFor="product-detail-image-upload" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14,
              padding: '10px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid #e5e7eb',
              background: imageUploading ? '#f3f4f6' : '#fff', color: imageUploading ? '#9ca3af' : '#374151', cursor: imageUploading ? 'not-allowed' : 'pointer',
              width: '100%', minHeight: 44,
            }}>
              {imageUploading ? <FaSpinner size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FaCamera size={16} />}
              {imageUploading ? 'Uploading…' : (displayImageUrl ? 'Change image' : 'Upload image')}
            </label>
            <input id="product-detail-image-upload" type="file" accept="image/*" onChange={handleImageChange} disabled={imageUploading} style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }} aria-hidden="true" />
          </section>

          {/* Key stats - Zoho-style stat chips */}
          <section className="pdp-stats" style={{
            flex: 1,
            minWidth: 0,
            background: '#ffffff',
            borderRadius: 12,
            padding: isMobile ? 16 : 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)',
              gap: isMobile ? 10 : 14,
              width: '100%',
            }}>
              {[
                { label: 'Product', value: formatValue(product.ProductName), color: '#2563eb' },
                { label: 'Category', value: formatValue(product.CategoryName), color: '#059669' },
                { label: 'MRP', value: `₹ ${formatValue(product.MRP, 'amount')}`, color: '#d97706' },
                { label: 'Net Wt', value: `${formatValue(product.NetWt, 'number')} g`, color: '#7c3aed' },
                { label: 'Design', value: formatValue(product.DesignName || product.Design), color: '#0284c7' },
                { label: 'Purity', value: formatValue(product.PurityName || product.Purity), color: '#b45309' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  padding: isMobile ? '12px 14px' : '14px 16px',
                  background: '#fafafa',
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                }}>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>{value}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Detail cards grid - 1 col mobile, 2 col tablet+ */}
        <div className="pdp-cards-grid" style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? 'repeat(2, 1fr)' : '1fr',
          gap: 16,
        }}>
          <DetailCard title="Basic info" Icon={FaInfoCircle} iconColor="#2563eb" compact={isMobile}>
            {editMode ? (
              <>
                <EditField label="Category" formKey="category_id" form={form} setForm={setForm} options={getOptions('category_id')} isMobile={isMobile} />
                <EditField label="Product" formKey="product_id" form={form} setForm={setForm} options={getOptions('product_id')} isMobile={isMobile} />
                <EditField label="Design" formKey="design_id" form={form} setForm={setForm} options={getOptions('design_id')} isMobile={isMobile} />
                <EditField label="Purity" formKey="purity_id" form={form} setForm={setForm} options={getOptions('purity_id')} isMobile={isMobile} />
                <EditField label="Status" formKey="status" form={form} setForm={setForm} options={['ApiActive', 'Sold']} isMobile={isMobile} />
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

          <DetailCard title="Weight" Icon={FaWeightHanging} iconColor="#059669" compact={isMobile}>
            {editMode ? (
              <>
                <EditField label="Gross Wt (g)" formKey="grosswt" type="number" form={form} setForm={setForm} isMobile={isMobile} />
                <EditField label="Net Wt (g)" formKey="netwt" type="number" form={form} setForm={setForm} isMobile={isMobile} />
                <EditField label="Stone Wt" formKey="stonewt" type="number" form={form} setForm={setForm} isMobile={isMobile} />
                <EditField label="Diamond Wt" formKey="diamondWeight" type="number" form={form} setForm={setForm} isMobile={isMobile} />
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

          <DetailCard title="Amount & pricing" Icon={FaRupeeSign} iconColor="#d97706" compact={isMobile}>
            {editMode ? (
              <>
                <EditField label="Stone Amt" formKey="stoneamount" type="number" form={form} setForm={setForm} isMobile={isMobile} />
                <EditField label="Diamond Amt" formKey="diamondAmount" type="number" form={form} setForm={setForm} isMobile={isMobile} />
                <EditField label="Hallmark Amt" formKey="HallmarkAmount" type="number" form={form} setForm={setForm} isMobile={isMobile} />
                <EditField label="Making/Gram" formKey="MakingPerGram" type="number" form={form} setForm={setForm} isMobile={isMobile} />
                <EditField label="Making %" formKey="MakingPercentage" type="number" form={form} setForm={setForm} isMobile={isMobile} />
                <EditField label="Making Fixed" formKey="MakingFixedAmt" type="number" form={form} setForm={setForm} isMobile={isMobile} />
                <EditField label="MRP" formKey="MRP" type="number" form={form} setForm={setForm} isMobile={isMobile} />
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

          <DetailCard title="Location & meta" Icon={FaMapMarkerAlt} iconColor="#7c3aed" compact={isMobile}>
            {editMode ? (
              <>
                <EditField label="Branch" formKey="branch_id" form={form} setForm={setForm} options={getOptions('branch_id')} isMobile={isMobile} />
                <EditField label="Counter" formKey="counter_id" form={form} setForm={setForm} options={getOptions('counter_id')} isMobile={isMobile} />
                <EditField label="Box" formKey="box_details" form={form} setForm={setForm} isMobile={isMobile} />
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
        <div className="pdp-stones-diamonds" style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 16,
          marginTop: 20,
        }}>
          <DetailCard title={product.Stones?.length ? `Stones (${product.Stones.length})` : 'Stones'} Icon={FaGem} iconColor="#d97706" compact={isMobile}>
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
          <DetailCard title={product.Diamonds?.length ? `Diamonds (${product.Diamonds.length})` : 'Diamonds'} Icon={FaGem} iconColor="#7c3aed" compact={isMobile}>
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
        .pdp-page { -webkit-tap-highlight-color: transparent; }
        .pdp-header .pdp-card-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pdp-detail-row:last-child { border-bottom: none; }
        .pdp-card { transition: box-shadow 0.2s ease; }
        @media (max-width: 576px) {
          .pdp-main { padding: 16px !important; }
          .pdp-hero { flex-direction: column !important; gap: 16px !important; }
          .pdp-image-card { width: 100% !important; }
          .pdp-stats { padding: 16px !important; }
          .pdp-cards-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .pdp-stones-diamonds { grid-template-columns: 1fr !important; }
          .pdp-card table { font-size: 12px !important; }
          .pdp-card th, .pdp-card td { padding: 8px 10px !important; }
        }
        @media (min-width: 577px) and (max-width: 992px) {
          .pdp-main { padding: 20px !important; }
          .pdp-cards-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 993px) {
          .pdp-cards-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
};

export default ProductDetailsPage;
