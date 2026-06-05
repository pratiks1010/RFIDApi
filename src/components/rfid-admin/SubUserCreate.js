import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import RfidAdminPage from './RfidAdminPage';
import PlanBanner, { useRfidPlan } from './PlanBanner';
import { emptyPermissions, PERMISSION_LABELS, PERMISSION_KEYS, ROLE_OPTIONS } from '../../constants/rfidPermissions';
import { getClientCode, permissionsToApiPayload } from '../../utils/authState';
import { getGetAllBranchMasterUrl } from '../../services/memberOnboardingApi';
import {
  authHeaders,
  extractApiMessage,
  normalizeList,
  rfidUserUrls,
} from '../../services/rfidUserManagementApi';
import '../../styles/rfidAdmin.css';

const TABS = ['Basic', 'Permissions', 'Branches'];

const SubUserCreate = () => {
  const navigate = useNavigate();
  const { canAddUser } = useRfidPlan();
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchMode, setBranchMode] = useState('all');
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [form, setForm] = useState({
    UserName: '',
    Password: '',
    Email: '',
    RoleType: 'User',
    Permissions: emptyPermissions(),
  });

  const clientCode = getClientCode();

  useEffect(() => {
    if (!canAddUser) return;
    (async () => {
      try {
        const modRes = await axios.get(rfidUserUrls.getAvailableModules(), { headers: authHeaders() });
        const list = normalizeList(modRes.data);
        setModules(list);
        if (list.length) {
          const keysFromModules = list
            .map((m) => m.Key || m.key)
            .filter((k) => PERMISSION_KEYS.includes(k));
          if (keysFromModules.length) {
            setForm((prev) => ({
              ...prev,
              Permissions: keysFromModules.reduce((acc, k) => {
                acc[k] = prev.Permissions[k] ?? false;
                return acc;
              }, { ...emptyPermissions() }),
            }));
          }
        }
      } catch (_) {
        /* use default keys */
      }
      if (clientCode) {
        try {
          const br = await axios.post(
            getGetAllBranchMasterUrl(),
            { ClientCode: clientCode },
            { headers: authHeaders() }
          );
          setBranches(normalizeList(br.data));
        } catch (_) {
          setBranches([]);
        }
      }
    })();
  }, [canAddUser, clientCode]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const togglePerm = (key) =>
    setForm((prev) => ({
      ...prev,
      Permissions: { ...prev.Permissions, [key]: !prev.Permissions[key] },
    }));

  const toggleBranch = (id) => {
    const n = Number(id);
    setSelectedBranchIds((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  };

  const permKeys =
    modules.length > 0
      ? modules.map((m) => m.Key || m.key).filter((k) => k && PERMISSION_KEYS.includes(k))
      : PERMISSION_KEYS;

  const validateTab = () => {
    if (tab === 0) {
      if (!form.UserName.trim()) {
        toast.error('Employee ID is required');
        return false;
      }
      if (!form.Password || form.Password.length < 6) {
        toast.error('Password is required (min 6 characters)');
        return false;
      }
    }
    return true;
  };

  const nextTab = () => {
    if (!validateTab()) return;
    setTab((t) => Math.min(t + 1, TABS.length - 1));
  };

  const submit = async () => {
    if (!validateTab()) return;
    if (!canAddUser) {
      toast.error('Cannot add users — plan expired or limit reached');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        UserName: form.UserName.trim(),
        Password: form.Password,
        Email: form.Email.trim(),
        RoleType: form.RoleType,
        Permissions: permissionsToApiPayload(form.Permissions),
        AllowedBranchIds:
          branchMode === 'all' ? null : selectedBranchIds.length ? selectedBranchIds : [],
      };
      await axios.post(rfidUserUrls.createDashboardUser(), payload, { headers: authHeaders() });
      toast.success(`Employee ${form.UserName} created`);
      navigate('/rfid-admin/users');
    } catch (err) {
      toast.error(extractApiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <RfidAdminPage
      title="Add Employee"
      subtitle="Employee ID is used at login (LoginName)"
      backTo="/rfid-admin/users"
      backLabel="User Management"
    >
      <PlanBanner />
      <div className="rfid-card">
        <div className="rfid-step-dots" style={{ padding: '16px 20px 0' }}>
          {TABS.map((_, i) => (
            <div
              key={TABS[i]}
              className={`rfid-step-dot${i < tab ? ' done' : ''}${i === tab ? ' current' : ''}`}
            />
          ))}
        </div>
        <div className="rfid-tabs">
          {TABS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={`rfid-tab${tab === i ? ' active' : ''}`}
              onClick={() => (i <= tab || validateTab()) && setTab(i)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="rfid-form-body">
          {tab === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              <div className="rfid-field">
                <label>Employee ID *</label>
                <input
                  value={form.UserName}
                  onChange={(e) => update('UserName', e.target.value)}
                  placeholder="e.g. EMP178353"
                />
              </div>
              <div className="rfid-field">
                <label>Password *</label>
                <input
                  type="password"
                  value={form.Password}
                  onChange={(e) => update('Password', e.target.value)}
                  placeholder="Staff@123"
                />
              </div>
              <div className="rfid-field">
                <label>Email</label>
                <input
                  type="email"
                  value={form.Email}
                  onChange={(e) => update('Email', e.target.value)}
                  placeholder="emp@shop.com"
                />
              </div>
              <div className="rfid-field">
                <label>Role</label>
                <select value={form.RoleType} onChange={(e) => update('RoleType', e.target.value)}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {tab === 1 && (
            <div className="rfid-perm-grid">
              {permKeys.map((key) => (
                <label key={key} className="rfid-perm-item">
                  <input
                    type="checkbox"
                    checked={Boolean(form.Permissions[key])}
                    onChange={() => togglePerm(key)}
                  />
                  <span>{PERMISSION_LABELS[key] || key}</span>
                </label>
              ))}
            </div>
          )}
          {tab === 2 && (
            <>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={branchMode === 'all'}
                    onChange={() => setBranchMode('all')}
                  />
                  All branches
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={branchMode === 'selected'}
                    onChange={() => setBranchMode('selected')}
                  />
                  Selected branches only
                </label>
              </div>
              {branchMode === 'selected' && (
                <div className="rfid-table-wrap rfid-branch-table">
                  <table className="rfid-table">
                    <thead>
                      <tr>
                        <th style={{ width: 48 }} />
                        <th>Branch</th>
                        <th>Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branches.map((b) => {
                        const id = b.Id ?? b.id ?? b.BranchId ?? b.branchId;
                        const name = b.BranchName ?? b.branchName ?? b.Name ?? '—';
                        const code = b.BranchCode ?? b.branchCode ?? b.Code ?? '—';
                        return (
                          <tr key={id} className="rfid-branch-row">
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedBranchIds.includes(Number(id))}
                                onChange={() => toggleBranch(id)}
                              />
                            </td>
                            <td>{name}</td>
                            <td>{code}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {branches.length === 0 && (
                    <p className="rfid-empty" style={{ padding: 24 }}>No branches loaded for client.</p>
                  )}
                </div>
              )}
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            <button type="button" className="rfid-btn rfid-btn-ghost" onClick={() => navigate('/rfid-admin/users')}>
              Cancel
            </button>
            {tab < TABS.length - 1 ? (
              <button type="button" className="rfid-btn rfid-btn-primary" onClick={nextTab}>
                Next
              </button>
            ) : (
              <button
                type="button"
                className="rfid-btn rfid-btn-primary"
                onClick={submit}
                disabled={saving || !canAddUser}
              >
                {saving ? 'Creating…' : 'Create User'}
              </button>
            )}
          </div>
        </div>
      </div>
    </RfidAdminPage>
  );
};

export default SubUserCreate;
