import React, { useEffect, useState } from 'react';
import { FaTimes, FaSave } from 'react-icons/fa';

const MARITAL_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];
const GENDER_OPTIONS = ['Male', 'Female'];
const COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+61'];
const COUNTRIES = ['India', 'UAE', 'USA', 'UK'];
const STATES = ['Andhra Pradesh', 'Gujarat', 'Karnataka', 'Maharashtra', 'Tamil Nadu', 'Telangana'];

const getInitial = () => ({
  name: '',
  companyName: '',
  email: '',
  countryCode: '+91',
  mobile: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  dateOfMarriage: '',
  aadharNo: '',
  panNo: '',
  street: '',
  area: '',
  town: '',
  city: '',
  country: 'India',
  state: '',
  pincode: '',
});

const CustomerSidebarForm = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState(getInitial);
  const [dobInputType, setDobInputType] = useState('text');
  const [domInputType, setDomInputType] = useState('text');

  useEffect(() => {
    if (open) {
      setForm(getInitial());
      setDobInputType('text');
      setDomInputType('text');
    }
  }, [open]);

  if (!open) return null;

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(form);
    onClose?.();
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
    transition: 'all 0.22s ease',
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)', zIndex: 1200 }}
      />
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
        }}
      >
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Add Customer Profile</h3>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 14, overflowY: 'auto', flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Customer Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <input className="customer-sidebar-control" style={inputStyle} placeholder="Name" value={form.name} onChange={(e) => update('name', e.target.value)} />
            <input className="customer-sidebar-control" style={inputStyle} placeholder="Company Name" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} />
            <input className="customer-sidebar-control" style={inputStyle} placeholder="Email Address" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            <div style={{ display: 'flex', gap: 6 }}>
              <select className="customer-sidebar-control" style={{ ...inputStyle, width: 90 }} value={form.countryCode} onChange={(e) => update('countryCode', e.target.value)}>
                {COUNTRY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
              <input className="customer-sidebar-control" style={{ ...inputStyle, flex: 1 }} placeholder="Mobile Number" value={form.mobile} onChange={(e) => update('mobile', e.target.value)} />
            </div>
            <input
              className="customer-sidebar-control"
              style={inputStyle}
              type={dobInputType}
              placeholder="Date of Birth (dd/mm/yyyy)"
              value={form.dateOfBirth}
              onFocus={() => setDobInputType('date')}
              onBlur={() => { if (!form.dateOfBirth) setDobInputType('text'); }}
              onChange={(e) => update('dateOfBirth', e.target.value)}
            />
            <select className="customer-sidebar-control" style={inputStyle} value={form.gender} onChange={(e) => update('gender', e.target.value)}>
              <option value="">Gender</option>
              {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select className="customer-sidebar-control" style={inputStyle} value={form.maritalStatus} onChange={(e) => update('maritalStatus', e.target.value)}>
              <option value="">Marital Status</option>
              {MARITAL_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <input
              className="customer-sidebar-control"
              style={inputStyle}
              type={domInputType}
              placeholder="Date of Marriage (dd/mm/yyyy)"
              value={form.dateOfMarriage}
              onFocus={() => setDomInputType('date')}
              onBlur={() => { if (!form.dateOfMarriage) setDomInputType('text'); }}
              onChange={(e) => update('dateOfMarriage', e.target.value)}
            />
            <input className="customer-sidebar-control" style={inputStyle} placeholder="Aadhar Number" value={form.aadharNo} onChange={(e) => update('aadharNo', e.target.value)} />
            <input className="customer-sidebar-control" style={inputStyle} placeholder="PAN Number" value={form.panNo} onChange={(e) => update('panNo', e.target.value)} />
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: '14px 0 8px' }}>Address Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <input className="customer-sidebar-control" style={inputStyle} placeholder="Street" value={form.street} onChange={(e) => update('street', e.target.value)} />
            <input className="customer-sidebar-control" style={inputStyle} placeholder="Area" value={form.area} onChange={(e) => update('area', e.target.value)} />
            <input className="customer-sidebar-control" style={inputStyle} placeholder="Town" value={form.town} onChange={(e) => update('town', e.target.value)} />
            <input className="customer-sidebar-control" style={inputStyle} placeholder="City" value={form.city} onChange={(e) => update('city', e.target.value)} />
            <select className="customer-sidebar-control" style={inputStyle} value={form.country} onChange={(e) => update('country', e.target.value)}>
              {COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
            </select>
            <select className="customer-sidebar-control" style={inputStyle} value={form.state} onChange={(e) => update('state', e.target.value)}>
              <option value="">State</option>
              {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
            <input className="customer-sidebar-control" style={inputStyle} placeholder="Pincode" value={form.pincode} onChange={(e) => update('pincode', e.target.value)} />
          </div>
        </form>

        <div style={{ borderTop: '1px solid #e5e7eb', padding: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #0d9488', background: '#0d9488', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FaSave /> Save
          </button>
        </div>
      </aside>

      <style>{`
        .customer-sidebar-control:focus {
          border-color: #0d9488 !important;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.16) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </>
  );
};

export default CustomerSidebarForm;

