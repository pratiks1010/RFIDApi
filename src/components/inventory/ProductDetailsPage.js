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
  FaGem,
  FaWeightHanging,
  FaRupeeSign,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaBox,
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
    const paths = item.Images.split(',').map((s) => s.trim()).filter(Boolean);
    const lastPath = paths.length > 0 ? paths[paths.length - 1] : null;
    if (lastPath) {
      const base = IMAGE_BASE_URL.replace(/\/$/, '');
      const path = lastPath.replace(/^\//, '');
      return `${base}/${path}`;
    }
  }
  return item.Image1 || item.imageurl || item.ImageUrl || null;
};

const formatValue = (value, type = 'text') => {
  if (value === null || value === undefined || value === '') return '';
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
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    } catch (e) {}
  }
  return value;
};

const statusStyle = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'sold') return { bg: '#dbeafe', color: '#1d4ed8', label: 'Sold' };
  if (v === 'apiactive' || v === 'active') return { bg: '#dcfce7', color: '#15803d', label: 'Active' };
  return { bg: '#f1f5f9', color: '#475569', label: s || '' };
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
  box_details: p.BoxName ?? p.BoxDetails ?? p.box_details ?? '',
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

const btnSmall = {
  padding: '6px 12px',
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 6,
  minHeight: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  cursor: 'pointer',
  border: '1px solid #e5e7eb',
  background: '#fff',
  color: '#374151',
  fontFamily: 'inherit',
  transition: 'all 0.2s',
};

const EditField = ({ label, formKey, type = 'text', placeholder = '', options = [], form, setForm, fullWidth = false }) => {
  const inputStyle = {
    width: '100%',
    padding: '6px 8px',
    fontSize: 11,
    borderRadius: 4,
    border: '1px solid #cbd5e1',
    outline: 'none',
    background: '#fff',
    color: '#0f172a',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: fullWidth ? '100%' : 'auto' }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{label}</label>
      {options.length > 0 ? (
        <select
          value={form[formKey] ?? ''}
          onChange={(e) => setForm(formKey, e.target.value)}
          style={inputStyle}
          onFocus={(e) => e.target.style.borderColor = '#2563eb'}
          onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
        >
          <option value="">Select...</option>
          {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
        </select>
      ) : (
        <input
          type={type}
          value={form[formKey] ?? ''}
          onChange={(e) => setForm(formKey, e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
          onFocus={(e) => e.target.style.borderColor = '#2563eb'}
          onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
        />
      )}
    </div>
  );
};

const InfoRow = ({ label, value, icon: Icon, isPrice }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
      {Icon && <Icon size={10} />} {label}
    </span>
    <span style={{ fontSize: 11, color: isPrice ? '#b45309' : '#0f172a', fontWeight: isPrice ? 700 : 500 }}>
      {value || ''}
    </span>
  </div>
);

const SectionHeader = ({ title, icon: Icon, accent }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6, borderBottom: `2px solid ${accent || '#e2e8f0'}`, marginBottom: 8,
  }}>
    {Icon && <Icon size={12} style={{ color: accent || '#64748b' }} />}
    <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</span>
  </div>
);

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
          BoxDetails: f.box_details || product.BoxName || product.BoxDetails,
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
    const isUpdate = Boolean(displayImageUrl);
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('ClientCode', clientCode);
      formData.append('DesignId', String(designId));
      formData.append('ItemCode', itemCode);
      formData.append('file1', file);
      if (isUpdate) formData.append('IsUpdate', 'true');
      const response = await formDataAxios.post(UPLOAD_IMAGE_API, formData);
      if (response.data && response.data.success !== false) {
        if (displayImageUrl && typeof displayImageUrl === 'string' && displayImageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(displayImageUrl);
        }
        setDisplayImageUrl(URL.createObjectURL(file));
        showNotification(isUpdate ? 'Image updated' : 'Image uploaded', isUpdate ? 'Product image updated successfully.' : 'Product image uploaded successfully.');
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
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Product not found.</p>
          <button onClick={() => navigate('/label-stock')} style={{ ...btnSmall, background: '#2563eb', color: '#fff', border: 'none' }}>
            Back to List
          </button>
        </div>
      </div>
    );
  }

  const st = statusStyle(product.Status);
  const isMobile = windowWidth <= 768;
  const imageSize = isMobile ? 140 : 200;

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: isMobile ? 10 : 16,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      <SuccessNotification title={successMessage.title} message={successMessage.message} isVisible={showSuccess} onClose={() => setShowSuccess(false)} />

      {showImagePopup && displayImageUrl && (
        <div onClick={() => setShowImagePopup(false)} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <button onClick={() => setShowImagePopup(false)} style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaTimes size={20} /></button>
          <img src={displayImageUrl} alt="Product" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
        </div>
      )}

      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
        <button onClick={handleBack} style={{ ...btnSmall, padding: '5px 10px' }}><FaArrowLeft size={11} /> Back</button>
        <div style={{ display: 'flex', gap: 6 }}>
          {editMode ? (
            <>
              <button onClick={handleCancelEdit} disabled={saveLoading} style={{ ...btnSmall }}>Cancel</button>
              <button onClick={handleSave} disabled={saveLoading} style={{ ...btnSmall, background: '#0ea5e9', color: '#fff', border: 'none' }}>
                {saveLoading ? <FaSpinner className="spin" /> : <FaSave />} Save
              </button>
            </>
          ) : (
            <button onClick={handleStartEdit} style={{ ...btnSmall, background: '#0ea5e9', color: '#fff', border: 'none' }}>
              <FaEdit /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Main: full-width layout — image left, content fills remaining space */}
      <div style={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        maxWidth: '100%',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : `${imageSize}px minmax(0, 1fr)`,
        gap: isMobile ? 12 : 16,
        alignItems: 'stretch',
        overflow: 'auto',
      }}>
        {/* Image: fixed small size */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            width: imageSize,
            height: imageSize,
            maxWidth: '100%',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: displayImageUrl ? 'zoom-in' : 'default',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }} onClick={() => displayImageUrl && setShowImagePopup(true)}>
            {displayImageUrl ? (
              <img src={displayImageUrl} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
                <FaCamera size={32} />
                <span style={{ fontSize: 10 }}>No Image</span>
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 6, right: 6 }}>
              <label htmlFor="pdp-upload" style={{ ...btnSmall, padding: '4px 8px', fontSize: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.08)', background: '#fff', color: '#334155' }} onClick={(e) => e.stopPropagation()}>
                {imageUploading ? <FaSpinner className="spin" /> : <FaCamera />} {displayImageUrl ? 'Change' : 'Upload'}
              </label>
              <input id="pdp-upload" type="file" accept="image/*" onChange={handleImageChange} disabled={imageUploading} style={{ display: 'none' }} />
            </div>
          </div>
        </div>

        {/* Content: fills all remaining width, proper alignment */}
        <div style={{ minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Row 1: Title + MRP — full width */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{product.CategoryName}</span>
                <span style={{ padding: '2px 6px', borderRadius: 6, background: st.bg, color: st.color, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>{st.label}</span>
              </div>
              <h1 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{product.ProductName}</h1>
              <div style={{ fontSize: 11, color: '#64748b' }}>Item: <strong style={{ color: '#0f172a' }}>{product.ItemCode}</strong> · RFID: <strong style={{ color: '#0f172a' }}>{product.RFIDCode || product.RFIDNumber}</strong></div>
            </div>
            <div style={{ flexShrink: 0, background: '#fff', padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 10, color: '#64748b', marginRight: 6 }}>MRP</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#b45309' }}>₹ {formatValue(product.MRP, 'amount')}</span>
            </div>
          </div>

          {/* Row 2: Specs | Weights | Pricing — three equal columns to use full width */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12, flex: '0 0 auto' }}>
            <div style={{ background: '#fff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 0 }}>
              <SectionHeader title="Specifications" icon={FaInfoCircle} accent="#0ea5e9" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 10 }}>
                {editMode ? (
                  <>
                    <EditField label="Category" formKey="category_id" form={form} setForm={setForm} options={getOptions('category_id')} />
                    <EditField label="Product" formKey="product_id" form={form} setForm={setForm} options={getOptions('product_id')} />
                    <EditField label="Design" formKey="design_id" form={form} setForm={setForm} options={getOptions('design_id')} />
                    <EditField label="Purity" formKey="purity_id" form={form} setForm={setForm} options={getOptions('purity_id')} />
                    <EditField label="Branch" formKey="branch_id" form={form} setForm={setForm} options={getOptions('branch_id')} />
                    <EditField label="Counter" formKey="counter_id" form={form} setForm={setForm} options={getOptions('counter_id')} />
                    <EditField label="Box" formKey="box_details" form={form} setForm={setForm} />
                    <EditField label="Status" formKey="status" form={form} setForm={setForm} options={['ApiActive', 'Sold']} />
                  </>
                ) : (
                  <>
                    <InfoRow label="Category" value={product.CategoryName} />
                    <InfoRow label="Product" value={product.ProductName} />
                    <InfoRow label="Design" value={product.DesignName || product.Design} />
                    <InfoRow label="Purity" value={product.PurityName || product.Purity} />
                    <InfoRow label="Branch" value={product.Branch || product.BranchName} icon={FaMapMarkerAlt} />
                    <InfoRow label="Counter" value={product.CounterName} icon={FaMapMarkerAlt} />
                    <InfoRow label="Box" value={product.BoxName ?? product.BoxDetails} icon={FaBox} />
                    <InfoRow label="Size" value={product.Size} />
                  </>
                )}
              </div>
            </div>
            <div style={{ background: '#fff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 0 }}>
              <SectionHeader title="Weights" icon={FaWeightHanging} accent="#059669" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10 }}>
                {editMode ? (
                  <>
                    <EditField label="Gross Wt" formKey="grosswt" type="number" form={form} setForm={setForm} />
                    <EditField label="Net Wt" formKey="netwt" type="number" form={form} setForm={setForm} />
                    <EditField label="Stone Wt" formKey="stonewt" type="number" form={form} setForm={setForm} />
                    <EditField label="Diamond Wt" formKey="diamondWeight" type="number" form={form} setForm={setForm} />
                  </>
                ) : (
                  <>
                    <InfoRow label="Gross Wt" value={`${formatValue(product.GrossWt, 'number')} g`} />
                    <InfoRow label="Net Wt" value={`${formatValue(product.NetWt, 'number')} g`} />
                    <InfoRow label="Stone Wt" value={`${formatValue(product.StoneWt, 'number')} g`} />
                    <InfoRow label="Diamond Wt" value={`${formatValue(product.DiamondWt, 'number')} ct`} />
                  </>
                )}
              </div>
            </div>
            <div style={{ background: '#fff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 0 }}>
              <SectionHeader title="Pricing" icon={FaRupeeSign} accent="#b45309" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10 }}>
                {editMode ? (
                  <>
                    <EditField label="Stone Amt" formKey="stoneamount" type="number" form={form} setForm={setForm} />
                    <EditField label="Diamond Amt" formKey="diamondAmount" type="number" form={form} setForm={setForm} />
                    <EditField label="Making/g" formKey="MakingPerGram" type="number" form={form} setForm={setForm} />
                    <EditField label="Making Fix" formKey="MakingFixedAmt" type="number" form={form} setForm={setForm} />
                    <EditField label="Hallmark" formKey="HallmarkAmount" type="number" form={form} setForm={setForm} />
                    <EditField label="MRP" formKey="MRP" type="number" form={form} setForm={setForm} />
                  </>
                ) : (
                  <>
                    <InfoRow label="Stone Amt" value={formatValue(product.StoneAmt, 'amount')} isPrice />
                    <InfoRow label="Diamond Amt" value={formatValue(product.DiamondAmt, 'amount')} isPrice />
                    <InfoRow label="Making/g" value={formatValue(product.MakingPerGram, 'amount')} isPrice />
                    <InfoRow label="Making Fix" value={formatValue(product.MakingFixedAmt, 'amount')} isPrice />
                    <InfoRow label="Hallmark" value={formatValue(product.HallmarkAmount, 'amount')} isPrice />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Stone & Diamond — equal columns, use full width */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, minHeight: 0 }}>
            {(product.Stones && product.Stones.length > 0) && (
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #fcd34d', overflow: 'hidden', boxShadow: '0 1px 2px rgba(251,191,36,0.15)' }}>
                <SectionHeader title={`Stones (${product.Stones.length})`} icon={FaGem} accent="#d97706" />
                <div style={{ maxHeight: 160, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#fef3c7', zIndex: 1 }}>
                      <tr>
                        {['Name', 'Pcs', 'Wt', 'Rate', 'Amt'].map(h => (
                          <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 600, color: '#92400e' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {product.Stones.map((s, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fffbeb' : '#fff' }}>
                          <td style={{ padding: '4px 8px', color: '#1e293b' }}>{s.StoneName || ''}</td>
                          <td style={{ padding: '4px 8px', color: '#1e293b' }}>{s.StonePieces ?? ''}</td>
                          <td style={{ padding: '4px 8px', color: '#1e293b' }}>{formatValue(s.StoneWeight, 'number')}</td>
                          <td style={{ padding: '4px 8px', color: '#1e293b' }}>{formatValue(s.StoneRate, 'amount')}</td>
                          <td style={{ padding: '4px 8px', color: '#b45309', fontWeight: 600 }}>{formatValue(s.StoneAmount, 'amount')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {(product.Diamonds && product.Diamonds.length > 0) && (
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #c4b5fd', overflow: 'hidden', boxShadow: '0 1px 2px rgba(139,92,246,0.12)' }}>
                <SectionHeader title={`Diamonds (${product.Diamonds.length})`} icon={FaGem} accent="#7c3aed" />
                <div style={{ maxHeight: 160, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#ede9fe', zIndex: 1 }}>
                      <tr>
                        {['Name', 'Shape', 'Color', 'Clarity', 'Wt', 'Amt'].map(h => (
                          <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 600, color: '#5b21b6' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {product.Diamonds.map((d, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#f5f3ff' : '#fff' }}>
                          <td style={{ padding: '4px 8px', color: '#1e293b' }}>{d.DiamondName || ''}</td>
                          <td style={{ padding: '4px 8px', color: '#1e293b' }}>{d.DiamondShape || ''}</td>
                          <td style={{ padding: '4px 8px', color: '#1e293b' }}>{d.DiamondColour || ''}</td>
                          <td style={{ padding: '4px 8px', color: '#1e293b' }}>{d.DiamondClarity || ''}</td>
                          <td style={{ padding: '4px 8px', color: '#1e293b' }}>{formatValue(d.DiamondWeight, 'number')}</td>
                          <td style={{ padding: '4px 8px', color: '#7c3aed', fontWeight: 600 }}>{formatValue(d.DiamondSellAmount, 'amount')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ProductDetailsPage;
