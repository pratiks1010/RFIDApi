import React from 'react';

const StatusBadge = ({ value }) => {
  const raw = value == null ? '' : String(value).trim();
  if (!raw || raw === '—') {
    return <span className="cm-muted">—</span>;
  }
  const lower = raw.toLowerCase();
  let kind = 'neutral';
  if (['active', 'tagged', 'yes', 'main'].includes(lower)) kind = 'success';
  else if (['inactive', 'not tagged', 'no'].includes(lower)) kind = 'danger';
  else if (['sub', 'pending'].includes(lower)) kind = 'warn';
  return <span className={`cm-badge cm-badge--${kind}`}>{raw}</span>;
};

export default StatusBadge;
