import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import RfidAdminPage from './RfidAdminPage';
import PlanBanner, { useRfidPlan } from './PlanBanner';
import FormStepper from './FormStepper';
import FormFooter from './FormFooter';
import PermissionsPanel from './PermissionsPanel';
import BranchAccessPanel from './BranchAccessPanel';
import PasswordField from './PasswordField';
import { emptyPermissions, PERMISSION_KEYS, ROLE_OPTIONS } from '../../constants/rfidPermissions';
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
  const [errors, setErrors] = useState({});
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

  const validateBasic = () => {
    const next = {};
    if (!form.UserName.trim()) {
      next.userName = 'Login username is required';
    }
    if (!form.Password || form.Password.length < 6) {
      next.password = 'Password is required (minimum 6 characters)';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateTab = () => {
    if (tab === 0) return validateBasic();
    return true;
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
      subtitle="Create a dashboard login. Login username is used at sign-in."
      backTo="/rfid-admin/users"
      backLabel="User Management"
    >
      <PlanBanner />
      <div className="rfid-card">
        <FormStepper
          steps={TABS}
          current={tab}
          onStepClick={goToTab}
        />
        <div className="rfid-form-body">
          {tab === 0 && (
            <>
              <div className="rfid-section-header">
                <div>
                  <h3 className="rfid-section-title">Account details</h3>
                  <p className="rfid-section-desc">Set the login credentials and role for this employee.</p>
                </div>
              </div>
              <div className="rfid-form-grid">
                <div className={`rfid-field${errors.userName ? ' has-error' : ''}`}>
                  <label>Login username *</label>
                  <input
                    value={form.UserName}
                    onChange={(e) => {
                      update('UserName', e.target.value);
                      if (errors.userName) setErrors((p) => ({ ...p, userName: undefined }));
                    }}
                    placeholder="e.g. EMP178353 or staff.name"
                    autoComplete="off"
                  />
                  {errors.userName ? (
                    <p className="rfid-field-error">{errors.userName}</p>
                  ) : (
                    <p className="rfid-field-hint">This is the username used to sign in to the dashboard</p>
                  )}
                </div>
                <PasswordField
                  label="Password *"
                  value={form.Password}
                  onChange={(e) => {
                    update('Password', e.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  placeholder="Staff@123"
                  defaultVisible
                  error={errors.password}
                />
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
            </>
          )}
          {tab === 1 && (
            <PermissionsPanel
              permKeys={permKeys}
              permissions={form.Permissions}
              onToggle={togglePerm}
            />
          )}
          {tab === 2 && (
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
            submitLabel="Create User"
            saving={saving}
            submitDisabled={!canAddUser}
          />
        </div>
      </div>
    </RfidAdminPage>
  );
};

export default SubUserCreate;
