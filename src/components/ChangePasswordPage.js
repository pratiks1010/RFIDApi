import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaLock } from 'react-icons/fa';
import PasswordField from './rfid-admin/PasswordField';
import { changeAuthPassword } from '../services/authPasswordService';
import { clearAuthState, getClientCode } from '../utils/authState';
import '../styles/rfidAdmin.css';

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const userInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo') || '{}');
    } catch {
      return {};
    }
  }, []);

  const defaultLoginName = String(
    userInfo.Username || userInfo.UserName || userInfo.LoginName || ''
  ).trim();
  const defaultClientCode = getClientCode();

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    loginName: defaultLoginName,
    clientCode: defaultClientCode,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const update = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.loginName.trim()) next.loginName = 'Login username is required';
    if (!form.clientCode.trim()) next.clientCode = 'Client code is required';
    if (!form.currentPassword) next.currentPassword = 'Current password is required';
    if (!form.newPassword) next.newPassword = 'New password is required';
    else if (form.newPassword.length < 6) next.newPassword = 'New password must be at least 6 characters';
    if (form.confirmPassword && form.newPassword !== form.confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }
    if (form.newPassword && form.currentPassword && form.newPassword === form.currentPassword) {
      next.newPassword = 'New password must be different from the current password';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const result = await changeAuthPassword({
        loginName: form.loginName,
        clientCode: form.clientCode,
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword || undefined,
      });
      toast.success(result.message);
      setDone(true);
      clearAuthState();
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      toast.error(err?.message || 'Unable to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rfid-admin-page">
      <div className="rfid-admin-hero">
        <div className="rfid-admin-hero-inner">
          <div>
            <Link to="/profile-menu" className="rfid-back-link">
              <FaArrowLeft size={12} /> All Apps & Resources
            </Link>
            <h1>Change password</h1>
            <p>Update your dashboard login password. You will need to sign in again afterward.</p>
          </div>
        </div>
      </div>

      <div className="rfid-card">
        <div className="rfid-form-body">
          {done ? (
            <div className="rfid-empty rfid-empty-sm">
              Password updated. Redirecting to login…
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="rfid-section-header">
                <div>
                  <h3 className="rfid-section-title">
                    <FaLock style={{ marginRight: 8, opacity: 0.7 }} />
                    Account credentials
                  </h3>
                  <p className="rfid-section-desc">
                    Works for parent accounts and RFID sub-users. Old password is verified before change.
                  </p>
                </div>
              </div>
              <div className="rfid-form-grid">
                <div className={`rfid-field${errors.loginName ? ' has-error' : ''}`}>
                  <label>Login username *</label>
                  <input
                    value={form.loginName}
                    onChange={(e) => update('loginName', e.target.value)}
                    placeholder="Same as sign-in username"
                    autoComplete="username"
                  />
                  {errors.loginName && <p className="rfid-field-error">{errors.loginName}</p>}
                </div>
                <div className={`rfid-field${errors.clientCode ? ' has-error' : ''}`}>
                  <label>Client code *</label>
                  <input
                    value={form.clientCode}
                    onChange={(e) => update('clientCode', e.target.value.toUpperCase())}
                    placeholder="e.g. LS000410"
                    autoComplete="off"
                  />
                  {errors.clientCode && <p className="rfid-field-error">{errors.clientCode}</p>}
                </div>
                <PasswordField
                  label="Current password *"
                  value={form.currentPassword}
                  onChange={(e) => update('currentPassword', e.target.value)}
                  autoComplete="current-password"
                  defaultVisible
                  error={errors.currentPassword}
                />
                <PasswordField
                  label="New password *"
                  value={form.newPassword}
                  onChange={(e) => update('newPassword', e.target.value)}
                  autoComplete="new-password"
                  defaultVisible
                  error={errors.newPassword}
                />
                <div className={`rfid-field rfid-form-grid-full${errors.confirmPassword ? ' has-error' : ''}`}>
                  <label>Confirm new password (optional)</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => update('confirmPassword', e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                  />
                  {errors.confirmPassword ? (
                    <p className="rfid-field-error">{errors.confirmPassword}</p>
                  ) : (
                    <p className="rfid-field-hint">Optional — if provided, must match new password</p>
                  )}
                </div>
              </div>
              <div className="rfid-form-footer">
                <div className="rfid-form-footer-left" />
                <div className="rfid-form-footer-right">
                  <button type="button" className="rfid-btn rfid-btn-ghost" onClick={() => navigate(-1)}>
                    Cancel
                  </button>
                  <button type="submit" className="rfid-btn rfid-btn-primary" disabled={saving}>
                    {saving ? 'Updating…' : 'Update password'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
