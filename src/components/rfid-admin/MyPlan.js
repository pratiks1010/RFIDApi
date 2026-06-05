import React from 'react';
import { Link } from 'react-router-dom';
import RfidAdminPage from './RfidAdminPage';
import PlanBanner, { useRfidPlan } from './PlanBanner';
import '../../styles/rfidAdmin.css';

const MyPlan = () => {
  const { plan, loading } = useRfidPlan();

  const used = plan?.CurrentSubUsers ?? plan?.currentSubUsers ?? 0;
  const max = plan?.MaxSubUsers ?? plan?.maxSubUsers ?? 0;
  const remaining = plan?.RemainingSubUsers ?? plan?.remainingSubUsers ?? Math.max(0, max - used);
  const expired = plan?.IsExpired ?? plan?.isExpired;

  return (
    <RfidAdminPage title="My RFID Plan" subtitle="Subscription and sub-user limits">
      <PlanBanner />
      <div className="rfid-card">
        <div className="rfid-form-body">
          {loading ? (
            <div className="rfid-empty">Loading plan…</div>
          ) : !plan ? (
            <div className="rfid-empty">Plan details unavailable.</div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 16,
              }}
            >
              <Stat label="Plan" value={plan.PlanName || '—'} />
              <Stat label="Sub-users used" value={`${used} / ${max}`} />
              <Stat label="Remaining slots" value={String(remaining)} highlight={remaining === 0} />
              <Stat
                label="Expiry"
                value={
                  plan.PlanExpiryDate
                    ? new Date(plan.PlanExpiryDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '—'
                }
                highlight={expired}
              />
              <Stat label="Status" value={expired ? 'Expired' : 'Active'} highlight={expired} />
            </div>
          )}
          <div style={{ marginTop: 24 }}>
            <Link to="/rfid-admin/users" className="rfid-btn rfid-btn-primary" style={{ textDecoration: 'none' }}>
              Manage employees
            </Link>
          </div>
        </div>
      </div>
    </RfidAdminPage>
  );
};

const Stat = ({ label, value, highlight }) => (
  <div
    style={{
      padding: 20,
      borderRadius: 12,
      background: highlight ? '#fef2f2' : '#f8fafc',
      border: `1px solid ${highlight ? '#fecaca' : '#e2e8f0'}`,
    }}
  >
    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
      {label}
    </div>
    <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 6, color: highlight ? '#b91c1c' : '#0f172a' }}>
      {value}
    </div>
  </div>
);

export default MyPlan;
