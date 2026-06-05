import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaSearch } from 'react-icons/fa';
import RfidAdminPage from './RfidAdminPage';
import PlanBanner, { useRfidPlan } from './PlanBanner';
import { emptyPermissions, PERMISSION_LABELS, PERMISSION_KEYS, ROLE_OPTIONS } from '../../constants/rfidPermissions';
import { getClientCode, permissionsToApiPayload } from '../../utils/authState';
import { getGetAllBranchMasterUrl } from '../../services/memberOnboardingApi';
import {
  authHeaders,
  extractApiMessage,
  extractConvertUserId,
  normalizeList,
  rfidUserUrls,
} from '../../services/rfidUserManagementApi';
import '../../styles/rfidAdmin.css';

const TABS = ['Employee', 'Login', 'Permissions', 'Branches'];

const pickField = (row, ...keys) => {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

const getEmployeeId = (row) => row?.EmployeeId ?? row?.employeeId ?? row?.Id ?? row?.id;

const isAlreadySubUser = (row) => Boolean(row?.IsAlreadySubUser ?? row?.isAlreadySubUser);

const getEmployeeCode = (row) => pickField(row, 'EmployeeCode', 'employeeCode');

const getEmployeeUserName = (row) => pickField(row, 'UserName', 'userName');

const getEmployeeEmail = (row) =>
  pickField(row, 'EmpEmail', 'empEmail', 'EmployeeEmail', 'employeeEmail');

const getExistingUserName = (row) =>
  pickField(row, 'ExistingUserName', 'existingUserName');

const getExistingUserId = (row) =>
  pickField(row, 'ExistingUserId', 'existingUserId', 'ExistingSubUserId', 'existingSubUserId');

const getEmployeeDisplayName = (row) => {
  const full = pickField(row, 'EmployeeName', 'employeeName');
  if (full) return full;
  const first = pickField(row, 'FirstName', 'firstName');
  const last = pickField(row, 'LastName', 'lastName');
  const combined = [first, last].filter(Boolean).join(' ');
  return combined || getEmployeeCode(row) || '—';
};

/** Default login: EmployeeCode; admin override via UserName in convert request */
const resolveLoginName = (employee, userNameOverride) => {
  const override = String(userNameOverride || '').trim();
  if (override) return override;
  if (!employee) return '';
  return getEmployeeCode(employee) || getEmployeeUserName(employee);
};

const resolveEmail = (employee, loginName, emailOverride) => {
  const override = String(emailOverride || '').trim();
  if (override) return override;
  const email = employee ? getEmployeeEmail(employee) : '';
  if (email) return email;
  if (loginName) return `${loginName}@rfid.local`;
  return '';
};

const SubUserConvertFromEmployee = () => {
  const navigate = useNavigate();
  const { canAddUser } = useRfidPlan();
  const clientCode = getClientCode();
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [modules, setModules] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchMode, setBranchMode] = useState('all');
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [form, setForm] = useState({
    UserName: '',
    Email: '',
    Password: '',
    RoleType: 'User',
    Permissions: emptyPermissions(),
  });

  const availableEmployees = useMemo(
    () => employees.filter((e) => !isAlreadySubUser(e)),
    [employees]
  );

  const convertedEmployees = useMemo(
    () => employees.filter(isAlreadySubUser),
    [employees]
  );

  const filterBySearch = (list) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => {
      const hay = [
        getEmployeeDisplayName(e),
        getEmployeeCode(e),
        getEmployeeUserName(e),
        getEmployeeEmail(e),
        getExistingUserName(e),
        getExistingUserId(e),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  };

  const filteredEmployees = useMemo(
    () => filterBySearch(availableEmployees),
    [availableEmployees, search]
  );

  const filteredConverted = useMemo(
    () => filterBySearch(convertedEmployees),
    [convertedEmployees, search]
  );

  const selectedEmployee = useMemo(
    () => availableEmployees.find((e) => String(getEmployeeId(e)) === String(selectedEmployeeId)),
    [availableEmployees, selectedEmployeeId]
  );

  const loginPreview = resolveLoginName(selectedEmployee, form.UserName);
  const emailPreview = resolveEmail(selectedEmployee, loginPreview, form.Email);

  useEffect(() => {
    if (!clientCode) {
      setLoadingEmployees(false);
      setEmployees([]);
      return;
    }
    (async () => {
      setLoadingEmployees(true);
      try {
        const res = await axios.post(
          rfidUserUrls.getEmployeesForSubUser(),
          { ClientCode: clientCode },
          { headers: authHeaders() }
        );
        setEmployees(normalizeList(res.data));
      } catch (err) {
        toast.error(extractApiMessage(err));
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    })();
  }, [clientCode]);

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
        /* default permission keys */
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
      if (!selectedEmployee) {
        toast.error('Select an employee from Employee Master');
        return false;
      }
    }
    if (tab === 1) {
      if (!form.Password || form.Password.length < 6) {
        toast.error('Password is required (min 6 characters)');
        return false;
      }
      if (!loginPreview) {
        toast.error('Could not resolve login name for this employee');
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
    const employeeId = getEmployeeId(selectedEmployee);
    if (!employeeId) {
      toast.error('Invalid employee selection');
      return;
    }
    setSaving(true);
    try {
      const userNameTrim = form.UserName.trim();
      const emailTrim = form.Email.trim();
      const payload = {
        ClientCode: clientCode,
        EmployeeId: Number(employeeId),
        Password: form.Password,
        UserName: userNameTrim || null,
        Email: emailTrim || null,
        RoleType: form.RoleType,
        Permissions: permissionsToApiPayload(form.Permissions),
        AllowedBranchIds:
          branchMode === 'all' ? null : selectedBranchIds.length ? selectedBranchIds : [],
      };
      const res = await axios.post(rfidUserUrls.convertEmployeeToSubUser(), payload, {
        headers: authHeaders(),
      });
      const dashboardUserId = extractConvertUserId(res.data);
      const idNote = dashboardUserId
        ? ` User ID (Sample Out assignee): ${dashboardUserId}`
        : '';
      toast.success(`Dashboard login created for ${loginPreview}.${idNote}`, { autoClose: 8000 });
      navigate('/rfid-admin/users');
    } catch (err) {
      toast.error(extractApiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const alreadyConvertedCount = convertedEmployees.length;

  return (
    <RfidAdminPage
      title="From employees"
      subtitle="POST GetEmployeesForSubUser → ConvertEmployeeToSubUser (links EmployeeId in main DB)"
      backTo="/rfid-admin/users"
      backLabel="User Management"
    >
      <PlanBanner />
      <div className="rfid-card" style={{ marginBottom: 16, padding: '14px 18px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#0c4a6e', lineHeight: 1.5 }}>
          Add employees in{' '}
          <Link to="/create-masters" style={{ color: '#0369a1', fontWeight: 600 }}>
            Employee Master (Create Masters)
          </Link>
          {' '}first. Select employees with <strong>No</strong> (not yet a sub-user). Default login is <strong>EmployeeCode</strong>; optional UserName override.
          Sample Out assignee must be the returned <strong>userId</strong> (GUID), not integer EmployeeId — use Assign To sub-users list after convert.
        </p>
      </div>
      <div className="rfid-card">
        <div className="rfid-step-dots" style={{ padding: '16px 20px 0' }}>
          {TABS.map((label, i) => (
            <div
              key={label}
              className={`rfid-step-dot${i < tab ? ' done' : ''}${i === tab ? ' current' : ''}`}
              title={label}
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
            <>
              <div className="rfid-toolbar" style={{ marginBottom: 12 }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                  <FaSearch
                    size={14}
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, code, email…"
                    style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                </div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {loadingEmployees
                    ? 'Loading…'
                    : `${filteredEmployees.length} to convert · ${alreadyConvertedCount} already sub-users`}
                </span>
              </div>
              {!clientCode && (
                <p className="rfid-empty">Client code not found. Log in again as plan owner.</p>
              )}
              {clientCode && !loadingEmployees && filteredEmployees.length === 0 && filteredConverted.length === 0 && (
                <p className="rfid-empty">
                  No employees returned. Add staff in Create Masters first.
                </p>
              )}
              {filteredEmployees.length > 0 && (
                <>
                  <h4 style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                    Ready to convert (IsAlreadySubUser = false)
                  </h4>
                  <div className="rfid-table-wrap" style={{ marginBottom: 20 }}>
                    <table className="rfid-table">
                      <thead>
                        <tr>
                          <th style={{ width: 48 }} />
                          <th>Name</th>
                          <th>Employee code</th>
                          <th>Mobile / email</th>
                          <th>Default login</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmployees.map((emp) => {
                          const id = getEmployeeId(emp);
                          const selected = String(selectedEmployeeId) === String(id);
                          return (
                            <tr
                              key={id}
                              className={selected ? 'rfid-branch-row' : ''}
                              style={{ ...(selected ? { background: '#eff6ff' } : {}), cursor: 'pointer' }}
                              onClick={() => setSelectedEmployeeId(id)}
                            >
                              <td>
                                <input
                                  type="radio"
                                  name="employeePick"
                                  checked={selected}
                                  onChange={() => setSelectedEmployeeId(id)}
                                />
                              </td>
                              <td><strong>{getEmployeeDisplayName(emp)}</strong></td>
                              <td>{getEmployeeCode(emp) || '—'}</td>
                              <td>{getEmployeeEmail(emp) || '—'}</td>
                              <td><code>{getEmployeeCode(emp) || '—'}</code></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {clientCode && !loadingEmployees && filteredEmployees.length === 0 && filteredConverted.length > 0 && (
                <p className="rfid-empty" style={{ marginBottom: 12 }}>
                  All listed employees are already sub-users. Add new staff in Create Masters to convert more.
                </p>
              )}
              {filteredConverted.length > 0 && (
                <>
                  <h4 style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                    Already sub-users (existing dashboard login)
                  </h4>
                  <div className="rfid-table-wrap">
                    <table className="rfid-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Employee code</th>
                          <th>Login</th>
                          <th>User ID (Sample Out)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredConverted.map((emp) => {
                          const id = getEmployeeId(emp);
                          return (
                            <tr key={`converted-${id}`} style={{ background: '#f8fafc', color: '#64748b' }}>
                              <td>{getEmployeeDisplayName(emp)}</td>
                              <td>{getEmployeeCode(emp) || '—'}</td>
                              <td>
                                <span className="rfid-badge rfid-badge-active" style={{ marginRight: 8 }}>
                                  Yes
                                </span>
                                {getExistingUserName(emp) || '—'}
                              </td>
                              <td style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                                {getExistingUserId(emp) || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
          {tab === 1 && selectedEmployee && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              <div className="rfid-field" style={{ gridColumn: '1 / -1' }}>
                <label>Selected employee</label>
                <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <strong>{getEmployeeDisplayName(selectedEmployee)}</strong>
                  {' · '}
                  {getEmployeeCode(selectedEmployee) || 'No code'}
                </div>
              </div>
              <div className="rfid-field">
                <label>Override login (UserName, optional)</label>
                <input
                  value={form.UserName}
                  onChange={(e) => update('UserName', e.target.value)}
                  placeholder={`Default: ${getEmployeeCode(selectedEmployee) || 'EmployeeCode'}`}
                />
              </div>
              <div className="rfid-field">
                <label>Override email (optional)</label>
                <input
                  type="email"
                  value={form.Email}
                  onChange={(e) => update('Email', e.target.value)}
                  placeholder="null = employee email or login@rfid.local"
                />
              </div>
              <div className="rfid-field">
                <label>Password *</label>
                <input
                  type="password"
                  value={form.Password}
                  onChange={(e) => update('Password', e.target.value)}
                  placeholder="YourSecurePassword1!"
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
              <div className="rfid-field" style={{ gridColumn: '1 / -1' }}>
                <label>Resolved login & email</label>
                <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
                  <div><strong>Login:</strong> {loginPreview || '—'}</div>
                  <div><strong>Email:</strong> {emailPreview || '—'}</div>
                  <div style={{ marginTop: 6, color: '#64748b' }}>
                    After convert, use the returned userId (GUID) in Sample Out Assign To — not EmployeeId.
                  </div>
                </div>
              </div>
            </div>
          )}
          {tab === 1 && !selectedEmployee && (
            <p className="rfid-empty">Go back and select an employee first.</p>
          )}
          {tab === 2 && (
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
          {tab === 3 && (
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid #e2e8f0',
            }}
          >
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
                disabled={saving || !canAddUser || !selectedEmployee}
              >
                {saving ? 'Converting…' : 'Convert to Sub-User'}
              </button>
            )}
          </div>
        </div>
      </div>
    </RfidAdminPage>
  );
};

export default SubUserConvertFromEmployee;
