import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import RfidAdminPage from './RfidAdminPage';
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
      <RfidAdminPage title="Edit Employee" backTo="/rfid-admin/users">
        <div className="rfid-empty">Loading…</div>
      </RfidAdminPage>
    );
  }

  return (
    <RfidAdminPage
      title="Edit Employee"
      subtitle="Password optional — leave blank to keep current"
      backTo="/rfid-admin/users"
    >
      <div className="rfid-card">
        <form className="rfid-form-body" onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, maxWidth: 720 }}>
            <div className="rfid-field">
              <label>Employee ID</label>
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
            <div className="rfid-field">
              <label>New password (optional)</label>
              <input
                type="password"
                value={form.Password}
                onChange={(e) => setForm((p) => ({ ...p, Password: e.target.value }))}
              />
            </div>
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
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 8 }}>
            Update{' '}
            <Link to={`/rfid-admin/users/${userId}/permissions`} style={{ color: '#0f4c81' }}>permissions</Link>
            {' or '}
            <Link to={`/rfid-admin/users/${userId}/branches`} style={{ color: '#0f4c81' }}>branch access</Link>
            {' separately.'}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button type="submit" className="rfid-btn rfid-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="rfid-btn rfid-btn-ghost" onClick={() => navigate('/rfid-admin/users')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </RfidAdminPage>
  );
};

export default SubUserEdit;
