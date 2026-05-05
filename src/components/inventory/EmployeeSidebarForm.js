import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaTimes, FaSave, FaSpinner } from 'react-icons/fa';
import {
  getGetAllBranchMasterUrl,
  getGetAllCountersUrl,
  getGetAllEmployeeUrl,
} from '../../services/memberOnboardingApi';

const COUNTRY_OPTIONS = [{ id: 'India', name: 'India' }];
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry',
].sort();
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const ROLE_OPTIONS = ['Admin', 'Manager', 'Staff', 'Operator', 'Sales'];
const DEPARTMENT_OPTIONS = ['Sales', 'Inventory', 'Accounts', 'HR', 'Operations'];

const getInitial = () => ({
  firstName: '',
  lastName: '',
  empEmail: '',
  contactNo: '',
  streetAddress: '',
  town: '',
  country: 'India',
  state: '',
  city: '',
  aadharNo: '',
  panNo: '',
  joiningDate: '',
  dob: '',
  gender: '',
  branch: '',
  department: '',
  counter: '',
  roles: '',
  reportingTo: '',
});

const ACCENT = '#0ea5e9';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const normalizeList = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.result)) return data.result;
  return [];
};

const EmployeeSidebarForm = ({ open, onClose, onSave, clientCode }) => {
  const [form, setForm] = useState(getInitial);
  const [branches, setBranches] = useState([]);
  const [counters, setCounters] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    if (open) setForm(getInitial());
  }, [open]);

  useEffect(() => {
    if (!open || !clientCode) return;
    setLoadingMeta(true);
    const body = { ClientCode: clientCode };
    const h = authHeaders();
    Promise.all([
      axios.post(getGetAllBranchMasterUrl(), body, { headers: h }).then((r) => normalizeList(r.data)).catch(() => []),
      axios.post(getGetAllCountersUrl(), body, { headers: h }).then((r) => normalizeList(r.data)).catch(() => []),
      axios.post(getGetAllEmployeeUrl(), body, { headers: h }).then((r) => normalizeList(r.data)).catch(() => []),
    ])
      .then(([b, c, e]) => {
        setBranches(b);
        setCounters(c);
        setEmployees(e);
      })
      .finally(() => setLoadingMeta(false));
  }, [open, clientCode]);

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
          width: 'min(540px, 94vw)',
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
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Add Employee</h3>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
            <FaTimes />
          </button>
        </div>

        <div style={{ padding: 14, overflowY: 'auto', flex: 1 }}>
          {loadingMeta ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 12 }}>
              <FaSpinner style={{ animation: 'spin 0.8s linear infinite' }} /> Loading branches & counters…
            </div>
          ) : null}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Personal</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <div><label style={labelStyle}>First Name *</label><input className="emp-sidebar-ctl" style={inputStyle} value={form.firstName} onChange={(e) => update('firstName', e.target.value)} /></div>
            <div><label style={labelStyle}>Last Name *</label><input className="emp-sidebar-ctl" style={inputStyle} value={form.lastName} onChange={(e) => update('lastName', e.target.value)} /></div>
            <div><label style={labelStyle}>Email *</label><input className="emp-sidebar-ctl" style={inputStyle} type="email" value={form.empEmail} onChange={(e) => update('empEmail', e.target.value)} /></div>
            <div><label style={labelStyle}>Contact *</label><input className="emp-sidebar-ctl" style={inputStyle} value={form.contactNo} onChange={(e) => update('contactNo', e.target.value)} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Street *</label><input className="emp-sidebar-ctl" style={inputStyle} value={form.streetAddress} onChange={(e) => update('streetAddress', e.target.value)} /></div>
            <div><label style={labelStyle}>Town</label><input className="emp-sidebar-ctl" style={inputStyle} value={form.town} onChange={(e) => update('town', e.target.value)} /></div>
            <div><label style={labelStyle}>City *</label><input className="emp-sidebar-ctl" style={inputStyle} value={form.city} onChange={(e) => update('city', e.target.value)} /></div>
            <div><label style={labelStyle}>Country *</label><select className="emp-sidebar-ctl" style={inputStyle} value={form.country} onChange={(e) => update('country', e.target.value)}>{COUNTRY_OPTIONS.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
            <div><label style={labelStyle}>State *</label><select className="emp-sidebar-ctl" style={inputStyle} value={form.state} onChange={(e) => update('state', e.target.value)}><option value="">Select</option>{INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label style={labelStyle}>Aadhar</label><input className="emp-sidebar-ctl" style={inputStyle} value={form.aadharNo} onChange={(e) => update('aadharNo', e.target.value)} /></div>
            <div><label style={labelStyle}>PAN</label><input className="emp-sidebar-ctl" style={inputStyle} value={form.panNo} onChange={(e) => update('panNo', e.target.value)} /></div>
            <div><label style={labelStyle}>Joining</label><input className="emp-sidebar-ctl" style={inputStyle} type="date" value={form.joiningDate} onChange={(e) => update('joiningDate', e.target.value)} /></div>
            <div><label style={labelStyle}>DOB</label><input className="emp-sidebar-ctl" style={inputStyle} type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} /></div>
            <div><label style={labelStyle}>Gender</label><select className="emp-sidebar-ctl" style={inputStyle} value={form.gender} onChange={(e) => update('gender', e.target.value)}><option value="">—</option>{GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}</select></div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: '14px 0 8px' }}>System</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <div><label style={labelStyle}>Branch *</label><select className="emp-sidebar-ctl" style={inputStyle} value={form.branch} onChange={(e) => update('branch', e.target.value)}><option value="">Select</option>{branches.map((b, i) => <option key={i} value={b.Id ?? b.id ?? ''}>{b.BranchName ?? b.Name ?? 'Branch'}</option>)}</select></div>
            <div><label style={labelStyle}>Department *</label><select className="emp-sidebar-ctl" style={inputStyle} value={form.department} onChange={(e) => update('department', e.target.value)}><option value="">Select</option>{DEPARTMENT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
            <div><label style={labelStyle}>Counter *</label><select className="emp-sidebar-ctl" style={inputStyle} value={form.counter} onChange={(e) => update('counter', e.target.value)}><option value="">Select</option>{counters.map((c, i) => <option key={i} value={c.Id ?? c.id ?? ''}>{c.Name ?? c.CounterName ?? 'Counter'}</option>)}</select></div>
            <div><label style={labelStyle}>Roles *</label><select className="emp-sidebar-ctl" style={inputStyle} value={form.roles} onChange={(e) => update('roles', e.target.value)}><option value="">Select</option>{ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Reporting To</label><select className="emp-sidebar-ctl" style={inputStyle} value={form.reportingTo} onChange={(e) => update('reportingTo', e.target.value)}><option value="">—</option>{employees.map((emp, i) => { const id = emp.Id ?? emp.id ?? ''; const name = emp.FirstName ? `${emp.FirstName}${emp.LastName ? ` ${emp.LastName}` : ''}`.trim() : emp.EmployeeName || emp.Name || '—'; return <option key={i} value={id}>{name}</option>; })}</select></div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', padding: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
          <button type="button" disabled={loadingMeta} onClick={() => handleSubmit()} style={{ padding: '7px 12px', borderRadius: 6, border: `1px solid ${ACCENT}`, background: loadingMeta ? '#94a3b8' : ACCENT, color: '#fff', cursor: loadingMeta ? 'not-allowed' : 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FaSave /> Save
          </button>
        </div>
      </aside>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .emp-sidebar-ctl:focus { border-color: ${ACCENT} !important; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2) !important; }
      `}</style>
    </>
  );
};

export default EmployeeSidebarForm;
