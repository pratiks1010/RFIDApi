import React, { useEffect, useState } from 'react';
import { FaTimes, FaSave } from 'react-icons/fa';

const COUNTRY_OPTIONS = [{ id: 'India', name: 'India' }];
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry',
].sort();

const getInitial = () => ({
  vendorName: '',
  companyName: '',
  email: '',
  contactNumber: '',
  aadharNumber: '0',
  panNumber: '',
  remarks: '',
  street: '',
  area: '',
  town: '',
  city: '',
  country: 'India',
  state: '',
  pincode: '',
});

const ACCENT = '#a855f7';

const VendorSidebarForm = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState(getInitial);

  useEffect(() => {
    if (open) setForm(getInitial());
  }, [open]);

  if (!open) return null;

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    try {
      await Promise.resolve(onSave?.(form));
      onClose?.();
    } catch {
      /* parent handles errors */
    }
  };

  const inputStyle = {
    width: '100%',
    height: 34,
    padding: '6px 10px',
    fontSize: 12,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fff',
  };

  const labelStyle = { fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)', zIndex: 1200 }} />
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 'min(520px, 92vw)',
          height: '100vh',
          background: '#ffffff',
          zIndex: 1201,
          boxShadow: '-8px 0 28px rgba(15, 23, 42, 0.16)',
          display: 'flex',
          flexDirection: 'column',
          borderTop: `3px solid ${ACCENT}`,
        }}
      >
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Add Vendor</h3>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
            <FaTimes />
          </button>
        </div>

        <div style={{ padding: 14, overflowY: 'auto', flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Vendor Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <div><label style={labelStyle}>Vendor Name *</label><input className="vendor-sidebar-ctl" style={inputStyle} value={form.vendorName} onChange={(e) => update('vendorName', e.target.value)} /></div>
            <div><label style={labelStyle}>Company Name *</label><input className="vendor-sidebar-ctl" style={inputStyle} value={form.companyName} onChange={(e) => update('companyName', e.target.value)} /></div>
            <div><label style={labelStyle}>Email</label><input className="vendor-sidebar-ctl" style={inputStyle} type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></div>
            <div><label style={labelStyle}>Contact *</label><input className="vendor-sidebar-ctl" style={inputStyle} value={form.contactNumber} onChange={(e) => update('contactNumber', e.target.value)} /></div>
            <div><label style={labelStyle}>Aadhar</label><input className="vendor-sidebar-ctl" style={inputStyle} value={form.aadharNumber} onChange={(e) => update('aadharNumber', e.target.value)} /></div>
            <div><label style={labelStyle}>PAN</label><input className="vendor-sidebar-ctl" style={inputStyle} value={form.panNumber} onChange={(e) => update('panNumber', e.target.value)} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Remarks</label><input className="vendor-sidebar-ctl" style={inputStyle} value={form.remarks} onChange={(e) => update('remarks', e.target.value)} /></div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: '14px 0 8px' }}>Address</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <div><label style={labelStyle}>Street</label><input className="vendor-sidebar-ctl" style={inputStyle} value={form.street} onChange={(e) => update('street', e.target.value)} /></div>
            <div><label style={labelStyle}>Area</label><input className="vendor-sidebar-ctl" style={inputStyle} value={form.area} onChange={(e) => update('area', e.target.value)} /></div>
            <div><label style={labelStyle}>Town</label><input className="vendor-sidebar-ctl" style={inputStyle} value={form.town} onChange={(e) => update('town', e.target.value)} /></div>
            <div><label style={labelStyle}>City</label><input className="vendor-sidebar-ctl" style={inputStyle} value={form.city} onChange={(e) => update('city', e.target.value)} /></div>
            <div><label style={labelStyle}>Country *</label><select className="vendor-sidebar-ctl" style={inputStyle} value={form.country} onChange={(e) => update('country', e.target.value)}>{COUNTRY_OPTIONS.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
            <div><label style={labelStyle}>State *</label><select className="vendor-sidebar-ctl" style={inputStyle} value={form.state} onChange={(e) => update('state', e.target.value)}><option value="">Select</option>{INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label style={labelStyle}>Pincode</label><input className="vendor-sidebar-ctl" style={inputStyle} inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} /></div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', padding: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
          <button type="button" onClick={() => handleSubmit()} style={{ padding: '7px 12px', borderRadius: 6, border: `1px solid ${ACCENT}`, background: ACCENT, color: '#fff', cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FaSave /> Save
          </button>
        </div>
      </aside>
      <style>{`
        .vendor-sidebar-ctl:focus { border-color: ${ACCENT} !important; box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.2) !important; }
      `}</style>
    </>
  );
};

export default VendorSidebarForm;
