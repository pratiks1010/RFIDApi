import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { rfidUserUrls } from '../../services/rfidUserManagementApi';
import { authHeaders } from '../../services/rfidUserManagementApi';

const PlanBanner = ({ onPlanLoaded }) => {
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(rfidUserUrls.getMyRFIDPlan(), { headers: authHeaders() });
        if (!cancelled) {
          setPlan(res.data);
          onPlanLoaded?.(res.data);
        }
      } catch (_) {
        if (!cancelled) setPlan(null);
      }
    })();
    return () => { cancelled = true; };
  }, [onPlanLoaded]);

  if (!plan) return null;

  const used = plan.CurrentSubUsers ?? plan.currentSubUsers ?? 0;
  const max = plan.MaxSubUsers ?? plan.maxSubUsers ?? 0;
  const remaining = plan.RemainingSubUsers ?? plan.remainingSubUsers ?? Math.max(0, max - used);
  const expired = plan.IsExpired ?? plan.isExpired;
  const warn = expired || remaining === 0;

  return (
    <div className={`rfid-plan-banner${warn ? ' warning' : ''}`}>
      <span>
        <strong>Plan:</strong> {plan.PlanName || '—'}
        {' · '}
        <strong>Sub-users:</strong> {used}/{max}
        {plan.PlanExpiryDate && (
          <>
            {' · '}
            <strong>Expires:</strong>{' '}
            {new Date(plan.PlanExpiryDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </>
        )}
      </span>
      {expired && <span>Plan expired — cannot add users.</span>}
      {!expired && remaining === 0 && <span>Sub-user limit reached.</span>}
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
        const res = await axios.get(rfidUserUrls.getMyRFIDPlan(), { headers: authHeaders() });
        if (!cancelled) setPlan(res.data);
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
    if (plan.IsExpired || plan.isExpired) return false;
    const remaining = plan.RemainingSubUsers ?? plan.remainingSubUsers;
    if (remaining !== undefined && remaining !== null) return remaining > 0;
    const used = plan.CurrentSubUsers ?? plan.currentSubUsers ?? 0;
    const max = plan.MaxSubUsers ?? plan.maxSubUsers ?? 0;
    return used < max;
  };

  return { plan, loading, canAddUser: canAddUser() };
};

export default PlanBanner;
