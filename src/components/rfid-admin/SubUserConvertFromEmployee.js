import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaSearch } from 'react-icons/fa';
import RfidAdminPage from './RfidAdminPage';
import PlanBanner, { useRfidPlan } from './PlanBanner';
import FormStepper from './FormStepper';
import FormFooter from './FormFooter';
import PermissionsPanel from './PermissionsPanel';
import BranchAccessPanel from './BranchAccessPanel';
import InfoCallout from './InfoCallout';
import PasswordField from './PasswordField';
import { emptyPermissions, PERMISSION_KEYS, ROLE_OPTIONS } from '../../constants/rfidPermissions';
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
const getExistingUserName = (row) => pickField(row, 'ExistingUserName', 'existingUserName');
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
  const [errors, setErrors] = useState({});

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
    const next = {};
    if (tab === 0) {
      if (!selectedEmployee) {
        next.employee = 'Select an employee from the list below';
      }
    }
    if (tab === 1) {
      if (!form.Password || form.Password.length < 6) {
        next.password = 'Password is required (minimum 6 characters)';
      }
      if (!loginPreview) {
        next.login = 'Could not resolve login username for this employee';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goToTab = (i) => {
    if (i > tab && !validateTab()) return;
    setTab(i);
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
      subtitle="Convert Employee Master records into dashboard logins"
      backTo="/rfid-admin/users"
      backLabel="User Management"
    >
      <PlanBanner />
      <InfoCallout>
        Add employees in{' '}
        <Link to="/create-masters">Employee Master (Create Masters)</Link>
        {' '}first. Default login is <strong>EmployeeCode</strong>. After convert, use the returned{' '}
        <strong>userId</strong> (GUID) in Sample Out Assign To — not integer EmployeeId.
      </InfoCallout>
      <div className="rfid-card">
        <FormStepper
          steps={TABS}
          current={tab}
          onStepClick={goToTab}
        />
        <div className="rfid-form-body">
          {tab === 0 && (
            <>
              {errors.employee && (
                <p className="rfid-field-error" style={{ marginBottom: 14 }}>{errors.employee}</p>
              )}
              <div className="rfid-toolbar" style={{ margin: '0 0 20px', padding: '14px 16px', borderRadius: 10 }}>
                <div className="rfid-search-wrap">
                  <FaSearch className="rfid-search-icon" size={14} />
                  <input
                    className="rfid-search-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, code, email…"
                  />
                </div>
                <span className="rfid-toolbar-meta">
                  {loadingEmployees
                    ? 'Loading…'
                    : `${filteredEmployees.length} to convert · ${alreadyConvertedCount} already sub-users`}
                </span>
              </div>
              {!clientCode && (
                <p className="rfid-empty rfid-empty-sm">Client code not found. Log in again as plan owner.</p>
              )}
              {clientCode && !loadingEmployees && filteredEmployees.length === 0 && filteredConverted.length === 0 && (
                <p className="rfid-empty rfid-empty-sm">
                  No employees returned. Add staff in Create Masters first.
                </p>
              )}
              {filteredEmployees.length > 0 && (
                <>
                  <p className="rfid-subsection-label">Ready to convert</p>
                  <div className="rfid-table-wrap">
                    <table className="rfid-table">
                      <thead>
                        <tr>
                          <th style={{ width: 48 }} />
                          <th>Name</th>
                          <th>Employee code</th>
                          <th>Email</th>
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
                              className={`rfid-branch-row${selected ? ' selected' : ''}`}
                              onClick={() => {
                                setSelectedEmployeeId(id);
                                if (errors.employee) setErrors((p) => ({ ...p, employee: undefined }));
                              }}
                            >
                              <td onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="radio"
                                  name="employeePick"
                                  checked={selected}
                                  onChange={() => setSelectedEmployeeId(id)}
                                />
                              </td>
                              <td>
                                <div className="rfid-user-cell">
                                  <div className="rfid-user-avatar">{initials(getEmployeeDisplayName(emp))}</div>
                                  <strong>{getEmployeeDisplayName(emp)}</strong>
                                </div>
                              </td>
                              <td><span className="rfid-code">{getEmployeeCode(emp) || '—'}</span></td>
                              <td>{getEmployeeEmail(emp) || '—'}</td>
                              <td><span className="rfid-code">{getEmployeeCode(emp) || '—'}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {clientCode && !loadingEmployees && filteredEmployees.length === 0 && filteredConverted.length > 0 && (
                <p className="rfid-empty rfid-empty-sm" style={{ marginBottom: 12 }}>
                  All listed employees are already sub-users.
                </p>
              )}
              {filteredConverted.length > 0 && (
                <>
                  <p className="rfid-subsection-label">Already sub-users</p>
                  <div className="rfid-table-wrap">
                    <table className="rfid-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Code</th>
                          <th>Login</th>
                          <th>User ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredConverted.map((emp) => {
                          const id = getEmployeeId(emp);
                          return (
                            <tr key={`converted-${id}`} style={{ opacity: 0.75 }}>
                              <td>{getEmployeeDisplayName(emp)}</td>
                              <td><span className="rfid-code">{getEmployeeCode(emp) || '—'}</span></td>
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
            <>
              <div className="rfid-section-header">
                <div>
                  <h3 className="rfid-section-title">Login credentials</h3>
                  <p className="rfid-section-desc">Set password and optional overrides for the selected employee.</p>
                </div>
              </div>
              <div className="rfid-form-grid">
                <div className="rfid-field rfid-form-grid-full">
                  <label>Selected employee</label>
                  <div className="rfid-field-readonly">
                    <strong>{getEmployeeDisplayName(selectedEmployee)}</strong>
                    {' · '}
                    {getEmployeeCode(selectedEmployee) || 'No code'}
                  </div>
                </div>
                <div className="rfid-field">
                  <label>Login username override (optional)</label>
                  <input
                    value={form.UserName}
                    onChange={(e) => update('UserName', e.target.value)}
                    placeholder={`Default: ${getEmployeeCode(selectedEmployee) || 'EmployeeCode'}`}
                  />
                  <p className="rfid-field-hint">Leave blank to use employee code as login username</p>
                </div>
                <div className="rfid-field">
                  <label>Override email (optional)</label>
                  <input
                    type="email"
                    value={form.Email}
                    onChange={(e) => update('Email', e.target.value)}
                    placeholder="Uses employee email if blank"
                  />
                </div>
                <PasswordField
                  label="Password *"
                  value={form.Password}
                  onChange={(e) => {
                    update('Password', e.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  placeholder="YourSecurePassword1!"
                  defaultVisible
                  error={errors.password}
                />
                <div className="rfid-field">
                  <label>Role</label>
                  <select value={form.RoleType} onChange={(e) => update('RoleType', e.target.value)}>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="rfid-field rfid-form-grid-full">
                  <label>Resolved login & email</label>
                  <div className="rfid-preview-box">
                    <div><strong>Login username:</strong> {loginPreview || '—'}</div>
                    <div><strong>Email:</strong> {emailPreview || '—'}</div>
                    {errors.login && <p className="rfid-field-error" style={{ marginTop: 8 }}>{errors.login}</p>}
                  </div>
                </div>
              </div>
            </>
          )}
          {tab === 1 && !selectedEmployee && (
            <p className="rfid-empty rfid-empty-sm">Go back and select an employee first.</p>
          )}
          {tab === 2 && (
            <PermissionsPanel
              permKeys={permKeys}
              permissions={form.Permissions}
              onToggle={togglePerm}
            />
          )}
          {tab === 3 && (
            <BranchAccessPanel
              branchMode={branchMode}
              onModeChange={setBranchMode}
              branches={branches}
              selectedBranchIds={selectedBranchIds}
              onToggleBranch={toggleBranch}
            />
          )}
          <FormFooter
            showBack={tab > 0}
            onBack={() => setTab((t) => t - 1)}
            onCancel={() => navigate('/rfid-admin/users')}
            onNext={tab < TABS.length - 1 ? nextTab : undefined}
            onSubmit={tab === TABS.length - 1 ? submit : undefined}
            submitLabel="Convert to Sub-User"
            saving={saving}
            submitDisabled={!canAddUser || !selectedEmployee}
          />
        </div>
      </div>
    </RfidAdminPage>
  );
};

const initials = (name) => {
  const parts = String(name || '?').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || '?').slice(0, 2).toUpperCase();
};

export default SubUserConvertFromEmployee;
