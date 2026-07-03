import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import RfidAdminPage from './RfidAdminPage';
import FormFooter from './FormFooter';
import {
  fetchMyRFIDPlan,
  postChangeRFIDPlan,
} from '../../services/rfidUserManagementApi';
import '../../styles/rfidAdmin.css';

const PLAN_OPTIONS = ['Basic', 'Pro'];

const formatDate = (value, long = false) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: long ? 'long' : 'short',
    year: 'numeric',
  });
};

const toDatetimeLocalValue = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromDatetimeLocalValue = (local) => {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const MyPlan = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    planName: '',
    maxSubUsers: '',
    extendDays: '',
    planExpiryDate: '',
  });

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyRFIDPlan();
      setPlan(data);
    } catch (_) {
      setPlan(null);
      toast.error('Could not load plan details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    if (!plan) return;
    setForm({
      planName: plan.planName || 'Basic',
      maxSubUsers: String(plan.maxSubUsers ?? ''),
      extendDays: '',
      planExpiryDate: toDatetimeLocalValue(plan.planExpiryDate),
    });
  }, [plan]);

  const update = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const buildPayload = () => {
    const payload = {};
    const name = form.planName?.trim();
    if (name && name !== plan?.planName) payload.planName = name;

    const maxRaw = form.maxSubUsers?.trim();
    if (maxRaw !== '' && maxRaw !== String(plan?.maxSubUsers ?? '')) {
      const max = Number(maxRaw);
      if (!Number.isFinite(max) || max < 1) {
        toast.error('Max sub-users must be a positive number');
        return null;
      }
      if (max < (plan?.currentSubUsers ?? 0)) {
        toast.error(`Max sub-users cannot be less than current count (${plan.currentSubUsers})`);
        return null;
      }
      payload.maxSubUsers = max;
    }

    const extendRaw = form.extendDays?.trim();
    if (extendRaw !== '') {
      const days = Number(extendRaw);
      if (!Number.isFinite(days) || days < 1) {
        toast.error('Extend days must be a positive number');
        return null;
      }
      payload.extendDays = days;
    }

    const expiryIso = fromDatetimeLocalValue(form.planExpiryDate);
    const currentExpiryIso = plan?.planExpiryDate
      ? new Date(plan.planExpiryDate).toISOString()
      : null;
    if (expiryIso && expiryIso !== currentExpiryIso) {
      payload.planExpiryDate = expiryIso;
    }

    if (Object.keys(payload).length === 0) {
      toast.info('No changes to save');
      return null;
    }
    return payload;
  };

  const submit = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      const { message, plan: updated } = await postChangeRFIDPlan(payload);
      toast.success(message);
      if (updated) setPlan(updated);
      await loadPlan();
    } catch (err) {
      toast.error(err?.message || 'Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset) => {
    if (preset === 'pro') {
      setForm((p) => ({ ...p, planName: 'Pro', maxSubUsers: '100' }));
    } else if (preset === 'basic') {
      setForm((p) => ({ ...p, planName: 'Basic', maxSubUsers: '2' }));
    } else if (preset === 'extend365') {
      setForm((p) => ({ ...p, extendDays: '365' }));
    } else if (preset === 'pro10') {
      setForm((p) => ({ ...p, planName: 'Pro', maxSubUsers: '10', extendDays: '365' }));
    }
  };

  const used = plan?.currentSubUsers ?? 0;
  const max = plan?.maxSubUsers ?? 0;
  const remaining = plan?.remainingSubUsers ?? Math.max(0, max - used);
  const expired = plan?.isExpired;

  return (
    <RfidAdminPage
      title="My RFID Plan"
      subtitle="View subscription limits and update plan settings (parent account only)"
      backTo="/rfid-admin/users"
      backLabel="User Management"
    >
      {loading ? (
        <div className="rfid-card">
          <div className="rfid-empty">Loading plan…</div>
        </div>
      ) : !plan ? (
        <div className="rfid-card">
          <div className="rfid-empty">Plan details unavailable.</div>
        </div>
      ) : (
        <>
          <div className={`rfid-plan-banner${expired || remaining === 0 ? ' warning' : ''}`} style={{ marginBottom: 20 }}>
            <div className="rfid-plan-stats">
              <span className="rfid-plan-stat">
                Plan <strong>{plan.planName || '—'}</strong>
              </span>
              <span className="rfid-plan-stat">
                Sub-users <strong>{used}/{max}</strong>
              </span>
              <span className="rfid-plan-stat">
                Remaining <strong>{remaining}</strong>
              </span>
              <span className="rfid-plan-stat">
                Expires <strong>{formatDate(plan.planExpiryDate)}</strong>
              </span>
              {plan.clientCode && (
                <span className="rfid-plan-stat">
                  Client <strong>{plan.clientCode}</strong>
                </span>
              )}
            </div>
            {expired && <span className="rfid-plan-warn">Plan expired</span>}
            {!expired && remaining === 0 && <span className="rfid-plan-warn">Sub-user limit reached</span>}
          </div>

          <div className="rfid-plan-stat-grid">
            <PlanStat label="Plan tier" value={plan.planName || '—'} />
            <PlanStat label="Sub-users used" value={`${used} / ${max}`} />
            <PlanStat label="Remaining slots" value={String(remaining)} warn={remaining === 0} />
            <PlanStat label="Started" value={formatDate(plan.planStartDate, true)} />
            <PlanStat label="Expiry" value={formatDate(plan.planExpiryDate, true)} warn={expired} />
            <PlanStat label="Status" value={expired ? 'Expired' : 'Active'} warn={expired} />
          </div>

          <div className="rfid-card" style={{ marginTop: 20 }}>
            <div className="rfid-form-body">
              <div className="rfid-section-header">
                <div>
                  <h3 className="rfid-section-title">Change plan</h3>
                  <p className="rfid-section-desc">
                    Basic includes 2 sub-users; Pro includes 100. Override max sub-users or extend expiry as needed.
                  </p>
                </div>
                <div className="rfid-section-actions">
                  <button type="button" className="rfid-btn rfid-btn-sm rfid-btn-ghost" onClick={() => applyPreset('pro10')}>
                    Pro · 10 users · +1yr
                  </button>
                  <button type="button" className="rfid-btn rfid-btn-sm rfid-btn-ghost" onClick={() => applyPreset('extend365')}>
                    Extend 365 days
                  </button>
                </div>
              </div>

              <div className="rfid-form-grid">
                <div className="rfid-field">
                  <label>Plan name</label>
                  <select value={form.planName} onChange={(e) => update('planName', e.target.value)}>
                    {PLAN_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <p className="rfid-field-hint">Basic → 2 users, Pro → 100 (unless max override is set)</p>
                </div>
                <div className="rfid-field">
                  <label>Max sub-users (override)</label>
                  <input
                    type="number"
                    min={used || 1}
                    value={form.maxSubUsers}
                    onChange={(e) => update('maxSubUsers', e.target.value)}
                    placeholder={`Current: ${max}`}
                  />
                  <p className="rfid-field-hint">Cannot be less than current sub-users ({used})</p>
                </div>
                <div className="rfid-field">
                  <label>Extend expiry (days)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.extendDays}
                    onChange={(e) => update('extendDays', e.target.value)}
                    placeholder="e.g. 365"
                  />
                  <p className="rfid-field-hint">Extends from current expiry or today, whichever is later</p>
                </div>
                <div className="rfid-field">
                  <label>Exact expiry (UTC)</label>
                  <input
                    type="datetime-local"
                    value={form.planExpiryDate}
                    onChange={(e) => update('planExpiryDate', e.target.value)}
                  />
                  <p className="rfid-field-hint">Optional — sets a fixed expiry date instead of extend days</p>
                </div>
              </div>

              <FormFooter
                onSubmit={submit}
                submitLabel="Update plan"
                saving={saving}
              />
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/rfid-admin/users" className="rfid-btn rfid-btn-primary" style={{ textDecoration: 'none' }}>
              Manage employees
            </Link>
            <button type="button" className="rfid-btn rfid-btn-ghost" onClick={loadPlan} disabled={loading}>
              Refresh plan
            </button>
          </div>
        </>
      )}
    </RfidAdminPage>
  );
};

const PlanStat = ({ label, value, warn }) => (
  <div className={`rfid-plan-stat-card${warn ? ' warn' : ''}`}>
    <div className="rfid-plan-stat-card-label">{label}</div>
    <div className="rfid-plan-stat-card-value">{value}</div>
  </div>
);

export default MyPlan;
