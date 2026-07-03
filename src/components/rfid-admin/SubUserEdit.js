import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import RfidAdminPage from './RfidAdminPage';
import FormFooter from './FormFooter';
import PasswordField from './PasswordField';
import { ROLE_OPTIONS } from '../../constants/rfidPermissions';
import {
  authHeaders,
  extractApiMessage,
  normalizeList,
  rfidUserUrls,
} from '../../services/rfidUserManagementApi';
import '../../styles/rfidAdmin.css';

const SubUserEdit = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    UserName: '',
    Email: '',
    Password: '',
    RoleType: 'User',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(rfidUserUrls.getAllSubUsers(), { headers: authHeaders() });
        const list = normalizeList(res.data);
        const user = list.find((u) => (u.UserId || u.userId) === userId);
        if (!user) {
          toast.error('User not found');
          navigate('/rfid-admin/users');
          return;
        }
        setForm({
          UserName: user.UserName || user.userName || '',
          Email: user.Email || user.email || '',
          Password: '',
          RoleType: user.RoleType || user.roleType || 'User',
        });
      } catch (err) {
        toast.error(extractApiMessage(err));
        navigate('/rfid-admin/users');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        UserId: userId,
        UserName: form.UserName.trim(),
        Email: form.Email.trim(),
        RoleType: form.RoleType,
      };
      if (form.Password) payload.Password = form.Password;
      await axios.post(rfidUserUrls.updateSubUser(), payload, { headers: authHeaders() });
      toast.success('User updated');
      navigate('/rfid-admin/users');
    } catch (err) {
      toast.error(extractApiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <RfidAdminPage title="Edit Employee" backTo="/rfid-admin/users" backLabel="User Management">
        <div className="rfid-card">
          <div className="rfid-empty">Loading employee…</div>
        </div>
      </RfidAdminPage>
    );
  }

  return (
    <RfidAdminPage
      title="Edit Employee"
      subtitle="Update login details. Leave password blank to keep the current one."
      backTo="/rfid-admin/users"
      backLabel="User Management"
    >
      <div className="rfid-card">
        <form className="rfid-form-body" onSubmit={submit}>
          <div className="rfid-section-header">
            <div>
              <h3 className="rfid-section-title">Account details</h3>
              <p className="rfid-section-desc">Modify credentials and role for this employee.</p>
            </div>
          </div>
          <div className="rfid-form-grid">
            <div className="rfid-field">
              <label>Login username</label>
              <input
                value={form.UserName}
                onChange={(e) => setForm((p) => ({ ...p, UserName: e.target.value }))}
              />
            </div>
            <div className="rfid-field">
              <label>Email</label>
              <input
                type="email"
                value={form.Email}
                onChange={(e) => setForm((p) => ({ ...p, Email: e.target.value }))}
              />
            </div>
            <PasswordField
              label="New password (optional)"
              value={form.Password}
              onChange={(e) => setForm((p) => ({ ...p, Password: e.target.value }))}
              placeholder="Leave blank to keep current"
              defaultVisible
            />
            <div className="rfid-field">
              <label>Role</label>
              <select
                value={form.RoleType}
                onChange={(e) => setForm((p) => ({ ...p, RoleType: e.target.value }))}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="rfid-edit-links">
            Manage{' '}
            <Link to={`/rfid-admin/users/${userId}/permissions`}>module permissions</Link>
            {' or '}
            <Link to={`/rfid-admin/users/${userId}/branches`}>branch access</Link>
            {' separately.'}
          </div>
          <FormFooter
            onCancel={() => navigate('/rfid-admin/users')}
            onSubmit={submit}
            submitLabel="Save changes"
            saving={saving}
          />
        </form>
      </div>
    </RfidAdminPage>
  );
};

export default SubUserEdit;
