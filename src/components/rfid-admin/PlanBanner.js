import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyRFIDPlan } from '../../services/rfidUserManagementApi';

const PlanBanner = ({ onPlanLoaded }) => {
  const [plan, setPlan] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchMyRFIDPlan();
      setPlan(data);
      onPlanLoaded?.(data);
    } catch (_) {
      setPlan(null);
    }
  }, [onPlanLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  if (!plan) return null;

  const used = plan.currentSubUsers ?? 0;
  const max = plan.maxSubUsers ?? 0;
  const remaining = plan.remainingSubUsers ?? Math.max(0, max - used);
  const expired = plan.isExpired;
  const warn = expired || remaining === 0;

  const expiryLabel = plan.planExpiryDate
    ? new Date(plan.planExpiryDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className={`rfid-plan-banner${warn ? ' warning' : ''}`}>
      <div className="rfid-plan-stats">
        <span className="rfid-plan-stat">
          Plan <strong>{plan.planName || '—'}</strong>
        </span>
        <span className="rfid-plan-stat">
          Sub-users <strong>{used}/{max}</strong>
        </span>
        {expiryLabel && (
          <span className="rfid-plan-stat">
            Expires <strong>{expiryLabel}</strong>
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {expired && <span className="rfid-plan-warn">Plan expired — cannot add users</span>}
        {!expired && remaining === 0 && <span className="rfid-plan-warn">Sub-user limit reached</span>}
        <Link to="/rfid-admin/my-plan" className="rfid-btn rfid-btn-sm rfid-btn-ghost" style={{ textDecoration: 'none' }}>
          Manage plan
        </Link>
      </div>
    </div>
  );
};

export const useRfidPlan = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchMyRFIDPlan();
        if (!cancelled) setPlan(data);
      } catch (_) {
        if (!cancelled) setPlan(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const canAddUser = () => {
    if (!plan) return true;
    if (plan.isExpired) return false;
    const remaining = plan.remainingSubUsers;
    if (remaining !== undefined && remaining !== null) return remaining > 0;
    const used = plan.currentSubUsers ?? 0;
    const max = plan.maxSubUsers ?? 0;
    return used < max;
  };

  return { plan, loading, canAddUser: canAddUser(), reloadPlan: fetchMyRFIDPlan };
};

export default PlanBanner;
