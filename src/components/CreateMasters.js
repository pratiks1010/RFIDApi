import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FaTags,
  FaBox,
  FaPaintBrush,
  FaGem,
  FaCalculator,
  FaArchive,
  FaMapMarkerAlt,
  FaSpinner,
  FaChevronRight,
  FaCheck,
  FaRedoAlt,
  FaTimes,
} from 'react-icons/fa';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'https://rrgold.loyalstring.co.in';
const API_BASE_SONI = 'https://soni.loyalstring.co.in';

const MASTER_OPTIONS = [
  { id: 'category', label: 'Category', icon: FaTags, color: '#0d9488' },
  { id: 'product', label: 'Product', icon: FaBox, color: '#2563eb' },
  { id: 'design', label: 'Design', icon: FaPaintBrush, color: '#7c3aed' },
  { id: 'purity', label: 'Purity', icon: FaGem, color: '#d97706' },
  { id: 'counter', label: 'Counter', icon: FaCalculator, color: '#059669' },
  { id: 'box', label: 'Box', icon: FaArchive, color: '#dc2626' },
  { id: 'branch', label: 'Branch', icon: FaMapMarkerAlt, color: '#0891b2' },
];

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const getClientCode = () => {
  try {
    const u = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return u.ClientCode || u.clientCode || u.clientcode || '';
  } catch {
    return '';
  }
};

const CreateMasters = () => {
  const [activeOption, setActiveOption] = useState('category');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [dropdownData, setDropdownData] = useState({
    categories: [],
    products: [],
    designs: [],
    purities: [],
    branches: [],
    counters: [],
  });
  const [navOpen, setNavOpen] = useState(false);

  const clientCode = getClientCode();

  useEffect(() => {
    if (!clientCode) return;
    const body = { ClientCode: clientCode };
    const headers = getAuthHeaders();
    Promise.all([
      axios.post(`${API_BASE}/api/ProductMaster/GetAllCategory`, body, { headers }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
      axios.post(`${API_BASE}/api/ProductMaster/GetAllProductMaster`, body, { headers }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
      axios.post(`${API_BASE}/api/ProductMaster/GetAllDesign`, body, { headers }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
      axios.post(`${API_BASE}/api/ProductMaster/GetAllPurity`, body, { headers }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
      axios.post(`${API_BASE}/api/ClientOnboarding/GetAllBranchMaster`, body, { headers }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
      axios.post(`${API_BASE}/api/ClientOnboarding/GetAllCounters`, body, { headers }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
    ]).then(([categories, products, designs, purities, branches, counters]) => {
      setDropdownData({
        categories: Array.isArray(categories) ? categories : [],
        products: Array.isArray(products) ? products : [],
        designs: Array.isArray(designs) ? designs : [],
        purities: Array.isArray(purities) ? purities : [],
        branches: Array.isArray(branches) ? branches : [],
        counters: Array.isArray(counters) ? counters : [],
      });
    });
  }, [clientCode]);

  useEffect(() => {
    setFormData({});
  }, [activeOption]);

  const updateField = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const getFieldConfig = () => {
    const cats = { options: dropdownData.categories, optionLabel: 'CategoryName', optionValue: 'Id' };
    const prods = { options: dropdownData.products, optionLabel: 'ProductName', optionValue: 'Id' };
    const placeholder = (t) => ({ placeholder: t });
    switch (activeOption) {
      case 'category':
        return [
          { key: 'name', label: 'Category Name', type: 'text', required: true, ...placeholder('Enter category name'), colSpan: 1 },
          { key: 'code', label: 'Code', type: 'text', required: false, ...placeholder('Code (optional)'), colSpan: 1 },
          { key: 'description', label: 'Description', type: 'text', required: false, ...placeholder('Enter description'), colSpan: 1 },
        ];
      case 'product':
        return [
          { key: 'categoryId', label: 'Category Name', type: 'select', required: true, placeholder: 'Select an option', ...cats, colSpan: 1 },
          { key: 'productName', label: 'Product Name', type: 'text', required: true, ...placeholder('Enter product name'), colSpan: 1 },
          { key: 'shortName', label: 'Short Name', type: 'text', required: true, ...placeholder('Enter short name'), colSpan: 1 },
          { key: 'description', label: 'Description', type: 'textarea', required: false, ...placeholder('Enter description'), colSpan: 3 },
          { key: 'slug', label: 'Slug', type: 'text', required: false, ...placeholder('Enter slug'), colSpan: 1 },
        ];
      case 'design':
        return [
          { key: 'categoryId', label: 'Category Name', type: 'select', required: true, placeholder: 'Select an option', ...cats, colSpan: 1 },
          { key: 'productId', label: 'Product Name', type: 'select', required: true, placeholder: 'Select an option', ...prods, colSpan: 1 },
          { key: 'designName', label: 'Design Name', type: 'text', required: true, ...placeholder('Enter design name'), colSpan: 1 },
          { key: 'description', label: 'Description', type: 'text', required: false, ...placeholder('Enter description'), colSpan: 1 },
          { key: 'slug', label: 'Slug', type: 'text', required: false, ...placeholder('Enter slug'), colSpan: 1 },
          { key: 'labelCode', label: 'Label Code', type: 'text', required: true, placeholder: 'Only Capitals', colSpan: 1 },
          { key: 'minQuantity', label: 'Min Quantity', type: 'number', required: false, ...placeholder('0'), colSpan: 1 },
          { key: 'minWeight', label: 'Min Weight', type: 'number', required: false, ...placeholder('0'), colSpan: 1 },
        ];
      case 'purity':
        return [
          { key: 'categoryId', label: 'Category', type: 'select', required: true, placeholder: 'Select an option', ...cats, colSpan: 1 },
          { key: 'purityName', label: 'Purity Name', type: 'text', required: true, ...placeholder('Enter purity name'), colSpan: 1 },
          { key: 'shortName', label: 'Short Name', type: 'text', required: true, ...placeholder('Enter short name'), colSpan: 1 },
          { key: 'finePercentage', label: 'Fine Percentage', type: 'text', required: true, ...placeholder('Enter fine %'), colSpan: 1 },
          { key: 'description', label: 'Description', type: 'text', required: false, ...placeholder('Enter description'), colSpan: 1 },
          { key: 'todaysRate', label: "Today's Rate", type: 'text', required: false, ...placeholder("Enter today's rate"), colSpan: 1 },
        ];
      case 'counter':
        return [
          { key: 'name', label: 'Counter Name', type: 'text', required: true, ...placeholder('Enter counter name'), colSpan: 1 },
          { key: 'branchId', label: 'Branch', type: 'select', options: dropdownData.branches, optionLabel: 'BranchName', optionValue: 'Id', required: false, placeholder: 'Select branch', colSpan: 1 },
        ];
      case 'box':
        return [
          { key: 'name', label: 'Box Name', type: 'text', required: true, ...placeholder('Enter box name'), colSpan: 1 },
          { key: 'code', label: 'Code', type: 'text', required: false, ...placeholder('Code (optional)'), colSpan: 1 },
          { key: 'categoryId', label: 'Category', type: 'select', required: false, placeholder: 'Select an option', ...cats, colSpan: 1 },
        ];
      case 'branch':
        return [
          { key: 'name', label: 'Branch Name', type: 'text', required: true, ...placeholder('Enter branch name'), colSpan: 1 },
          { key: 'address', label: 'Address', type: 'textarea', required: false, ...placeholder('Address (optional)'), colSpan: 2 },
          { key: 'code', label: 'Code', type: 'text', required: false, ...placeholder('Code (optional)'), colSpan: 1 },
        ];
      default:
        return [{ key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Enter name', colSpan: 1 }];
    }
  };

  const getEndpoint = () => {
    const base = API_BASE_SONI;
    const map = {
      category: `${base}/api/ProductMaster/AddCategory`,
      product: `${base}/api/ProductMaster/AddProductMaster`,
      design: `${base}/api/ProductMaster/AddDesign`,
      purity: `${base}/api/ProductMaster/AddPurity`,
      counter: `${base}/api/ClientOnboarding/AddCounter`,
      box: `${base}/api/ProductMaster/AddBox`,
      branch: `${base}/api/ClientOnboarding/AddBranch`,
    };
    return map[activeOption] || map.category;
  };

  const buildPayload = () => {
    const payload = { ClientCode: clientCode };
    const str = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null);
    const num = (v) => (v != null && v !== '' ? Number(v) : undefined);
    if (activeOption === 'product') {
      if (formData.categoryId != null && formData.categoryId !== '') payload.CategoryId = formData.categoryId;
      if (str(formData.productName)) payload.Name = str(formData.productName);
      if (str(formData.shortName)) payload.ShortName = str(formData.shortName);
      if (str(formData.description)) payload.Description = str(formData.description);
      if (str(formData.slug)) payload.Slug = str(formData.slug);
      return payload;
    }
    if (activeOption === 'design') {
      if (formData.categoryId != null && formData.categoryId !== '') payload.CategoryId = formData.categoryId;
      if (formData.productId != null && formData.productId !== '') payload.ProductId = formData.productId;
      if (str(formData.designName)) payload.Name = str(formData.designName);
      if (str(formData.description)) payload.Description = str(formData.description);
      if (str(formData.slug)) payload.Slug = str(formData.slug);
      if (str(formData.labelCode)) payload.LabelCode = str(formData.labelCode);
      if (num(formData.minQuantity) !== undefined) payload.MinQuantity = num(formData.minQuantity);
      if (num(formData.minWeight) !== undefined) payload.MinWeight = num(formData.minWeight);
      return payload;
    }
    if (activeOption === 'purity') {
      if (formData.categoryId != null && formData.categoryId !== '') payload.CategoryId = formData.categoryId;
      if (str(formData.purityName)) payload.Name = str(formData.purityName);
      if (str(formData.shortName)) payload.ShortName = str(formData.shortName);
      if (str(formData.finePercentage)) payload.FinePercentage = str(formData.finePercentage);
      if (str(formData.description)) payload.Description = str(formData.description);
      if (str(formData.todaysRate)) payload.TodaysRate = str(formData.todaysRate);
      return payload;
    }
    if (str(formData.name)) payload.Name = str(formData.name);
    if (str(formData.code)) payload.Code = str(formData.code);
    if (str(formData.description)) payload.Description = str(formData.description);
    if (str(formData.address)) payload.Address = str(formData.address);
    if (formData.categoryId != null && formData.categoryId !== '') payload.CategoryId = formData.categoryId;
    if (formData.branchId != null && formData.branchId !== '') payload.BranchId = formData.branchId;
    return payload;
  };

  const handleResetForm = () => setFormData({});
  const handleCancel = () => setFormData({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientCode) {
      toast.error('Client code not found. Please log in again.');
      return;
    }
    const requiredFields = getFieldConfig().filter(f => f.required);
    const missing = requiredFields.find(f => !formData[f.key]?.toString().trim());
    if (missing) {
      toast.warning(`${missing.label} is required.`);
      return;
    }
    setLoading(true);
    try {
      const payload = buildPayload();
      const res = await axios.post(getEndpoint(), payload, { headers: getAuthHeaders() });
      const data = res.data;
      if (data?.status === 'success' || data?.success === true || res.status === 200) {
        toast.success(data?.message || 'Created successfully.');
        setFormData({});
      } else {
        toast.error(data?.message || data?.error || 'Create failed.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Request failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const current = MASTER_OPTIONS.find(o => o.id === activeOption) || MASTER_OPTIONS[0];
  const CurrentIcon = current.icon;
  const fields = getFieldConfig();

  const baseStyles = {
    page: {
      minHeight: '100%',
      background: '#f5f6f8',
      display: 'flex',
      flexDirection: 'column',
    },
    topBar: {
      background: '#fff',
      borderBottom: '1px solid #e4e6eb',
      padding: '14px 24px',
      flexShrink: 0,
    },
    title: { margin: 0, fontSize: 20, fontWeight: 600, color: '#1f2933' },
    subtitle: { margin: '4px 0 0', fontSize: 13, color: '#6b7280' },
    layout: {
      flex: 1,
      display: 'flex',
      flexDirection: 'row',
      minHeight: 0,
    },
    nav: {
      width: 240,
      flexShrink: 0,
      background: '#fff',
      borderRight: '1px solid #e4e6eb',
      padding: '8px 0',
    },
    navItem: (active, color) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      padding: '10px 20px',
      border: 'none',
      borderLeft: active ? `3px solid ${color}` : '3px solid transparent',
      background: active ? `${color}14` : 'transparent',
      color: active ? color : '#4a5568',
      fontSize: 14,
      fontWeight: active ? 600 : 500,
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'background 0.15s, color 0.15s',
    }),
    content: {
      flex: 1,
      padding: 24,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    },
    card: {
      background: '#fff',
      borderRadius: 8,
      border: '1px solid #e4e6eb',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      padding: 24,
      width: '100%',
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: 600,
      color: '#1f2933',
      marginBottom: 20,
      paddingBottom: 12,
      borderBottom: '1px solid #e4e6eb',
      flexShrink: 0,
    },
    fieldGroup: { marginBottom: 18 },
    label: {
      display: 'block',
      fontSize: 13,
      fontWeight: 500,
      color: '#4a5568',
      marginBottom: 6,
    },
    input: {
      width: '100%',
      padding: '9px 12px',
      fontSize: 14,
      border: '1px solid #d1d5db',
      borderRadius: 6,
      background: '#fff',
      color: '#1f2933',
      boxSizing: 'border-box',
    },
    textarea: {
      width: '100%',
      padding: '9px 12px',
      fontSize: 14,
      border: '1px solid #d1d5db',
      borderRadius: 6,
      background: '#fff',
      color: '#1f2933',
      resize: 'vertical',
      minHeight: 80,
      fontFamily: 'inherit',
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '9px 12px',
      fontSize: 14,
      border: '1px solid #d1d5db',
      borderRadius: 6,
      background: '#fff',
      color: '#1f2933',
      cursor: 'pointer',
      boxSizing: 'border-box',
    },
    btnPrimary: (color) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '9px 20px',
      fontSize: 14,
      fontWeight: 600,
      color: '#fff',
      background: loading ? '#94a3b8' : color,
      border: 'none',
      borderRadius: 6,
      cursor: loading ? 'not-allowed' : 'pointer',
      marginTop: 8,
    }),
    btnSecondary: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '9px 18px',
      fontSize: 14,
      fontWeight: 600,
      color: '#4a5568',
      background: '#fff',
      border: '1px solid #d1d5db',
      borderRadius: 6,
      cursor: 'pointer',
      marginTop: 8,
    },
    mobileNavTrigger: {
      display: 'none',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      padding: '12px 16px',
      background: '#fff',
      border: '1px solid #e4e6eb',
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 500,
      color: '#4a5568',
      cursor: 'pointer',
      marginBottom: 16,
    },
  };

  return (
    <div style={baseStyles.page} className={`create-masters-zoho${navOpen ? ' create-masters-nav-open' : ''}`}>
      <header style={baseStyles.topBar}>
        <h1 style={baseStyles.title}>Create Masters</h1>
        <p style={baseStyles.subtitle}>Add and manage categories, products, designs, purity, counters, boxes, and branches.</p>
      </header>

      {navOpen && (
        <div
          role="button"
          tabIndex={-1}
          onClick={() => setNavOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setNavOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 999,
            display: 'none',
          }}
          className="create-masters-nav-overlay"
          aria-hidden="true"
        />
      )}

      <div style={baseStyles.layout} className="create-masters-layout">
        <div
          style={{ ...baseStyles.mobileNavTrigger, display: 'flex' }}
          className="create-masters-mobile-trigger"
          onClick={() => setNavOpen(prev => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setNavOpen(prev => !prev)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `${current.color}20`,
              color: current.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CurrentIcon size={16} />
            </span>
            {current.label}
          </span>
          <FaChevronRight size={14} style={{ transform: navOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        <nav
          style={{
            ...baseStyles.nav,
            display: 'flex',
            flexDirection: 'column',
          }}
          className="create-masters-nav"
        >
          {MASTER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = activeOption === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setActiveOption(opt.id);
                  setNavOpen(false);
                }}
                style={baseStyles.navItem(isActive, opt.color)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.color = '#1f2933';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#4a5568';
                  }
                }}
              >
                <span style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: isActive ? opt.color : `${opt.color}20`,
                  color: isActive ? '#fff' : opt.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={16} />
                </span>
                <span style={{ flex: 1, textAlign: 'left' }}>{opt.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={baseStyles.content} className="create-masters-layout-content">
          <div style={{ ...baseStyles.card, ['--create-masters-accent']: current.color }} className="create-masters-form-card">
            <h2 style={baseStyles.cardTitle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: `${current.color}18`,
                  color: current.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <CurrentIcon size={18} />
                </span>
                ADD {current.label.toUpperCase()}
              </span>
            </h2>
            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px 24px', alignContent: 'start' }} className="create-masters-fields-grid">
                {fields.map((f) => (
                  <div key={f.key} data-colspan={f.colSpan || 1} style={{ ...baseStyles.fieldGroup }}>
                    <label style={baseStyles.label}>
                      {f.label} {f.required && <span style={{ color: '#dc2626' }}>*</span>}
                    </label>
                    {f.type === 'select' ? (
                      <select
                        value={formData[f.key] ?? ''}
                        onChange={(e) => updateField(f.key, e.target.value)}
                        style={baseStyles.select}
                      >
                        <option value="">{f.placeholder || `Select ${f.label}`}</option>
                        {(f.options || []).map((opt, i) => (
                          <option key={i} value={opt[f.optionValue] ?? opt.Id ?? opt.id ?? ''}>
                            {opt[f.optionLabel] ?? opt.Name ?? opt.CategoryName ?? opt.ProductName ?? opt.DesignName ?? opt.PurityName ?? opt.BranchName ?? opt.CounterName ?? ''}
                          </option>
                        ))}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        value={formData[f.key] ?? ''}
                        onChange={(e) => updateField(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        style={{ ...baseStyles.textarea, minHeight: f.colSpan === 3 ? 88 : 72 }}
                      />
                    ) : (
                      <input
                        type={f.type || 'text'}
                        value={formData[f.key] ?? ''}
                        onChange={(e) => updateField(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        style={baseStyles.input}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ flexShrink: 0, paddingTop: 24, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'flex-end' }}>
                <button type="button" onClick={handleResetForm} style={baseStyles.btnSecondary}>
                  <FaRedoAlt size={14} />
                  Reset Form
                </button>
                <button type="button" onClick={handleCancel} style={baseStyles.btnSecondary}>
                  <FaTimes size={14} />
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={baseStyles.btnPrimary(current.color)}>
                  {loading ? <FaSpinner size={14} style={{ animation: 'create-masters-spin 0.7s linear infinite' }} /> : <FaCheck size={14} />}
                  {loading ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .create-masters-zoho .create-masters-form-card input:focus,
        .create-masters-zoho .create-masters-form-card select:focus,
        .create-masters-zoho .create-masters-form-card textarea:focus {
          outline: none;
          border-color: var(--create-masters-accent, #2164eb);
          box-shadow: 0 0 0 2px rgba(33, 100, 235, 0.18);
        }
        @keyframes create-masters-spin { to { transform: rotate(360deg); } }
        .create-masters-zoho .create-masters-fields-grid {
          grid-template-columns: 1fr 1fr 1fr;
        }
        .create-masters-zoho .create-masters-fields-grid > [data-colspan="2"] { grid-column: span 2; }
        .create-masters-zoho .create-masters-fields-grid > [data-colspan="3"] { grid-column: 1 / -1; }
        @media (max-width: 900px) {
          .create-masters-zoho .create-masters-fields-grid {
            grid-template-columns: 1fr 1fr;
          }
          .create-masters-zoho .create-masters-fields-grid > [data-colspan="3"] { grid-column: 1 / -1; }
        }
        @media (max-width: 560px) {
          .create-masters-zoho .create-masters-fields-grid {
            grid-template-columns: 1fr;
          }
          .create-masters-zoho .create-masters-fields-grid > [data-colspan="2"],
          .create-masters-zoho .create-masters-fields-grid > [data-colspan="3"] {
            grid-column: span 1;
          }
        }
        @media (max-width: 768px) {
          .create-masters-zoho .create-masters-nav {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 1001;
            width: 260px;
            box-shadow: 4px 0 16px rgba(0,0,0,0.12);
            transform: translateX(-100%);
            transition: transform 0.2s ease;
          }
          .create-masters-zoho.create-masters-nav-open .create-masters-nav {
            transform: translateX(0);
          }
          .create-masters-zoho .create-masters-nav-overlay {
            display: block !important;
          }
          .create-masters-zoho .create-masters-mobile-trigger { display: flex !important; }
          .create-masters-zoho .create-masters-layout-content { padding: 16px !important; }
          .create-masters-zoho .create-masters-layout .create-masters-nav { display: flex !important; flex-direction: column !important; }
          .create-masters-zoho .create-masters-layout { flex-direction: column !important; }
        }
        @media (min-width: 769px) {
          .create-masters-zoho .create-masters-mobile-trigger { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default CreateMasters;
