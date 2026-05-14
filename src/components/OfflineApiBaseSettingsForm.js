import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getApiMode, getRrgoldApiBaseUrl, getSoniApiBaseUrl } from '../services/apiBaseConfig';
import {
  clearUserOfflineApiBases,
  DEFAULT_OFFLINE_RRGOLD_BASE,
  DEFAULT_OFFLINE_SONI_BASE,
  OFFLINE_API_BASES_EVENT,
  getUserOfflineRrgoldBase,
  getUserOfflineSoniBase,
  notifyOfflineApiBasesChanged,
  parseApiBaseUrl,
  setUserOfflineRrgoldBase,
  setUserOfflineSoniBase,
} from '../services/offlineApiBaseStorage';

const inputStyleCompact = {
  width: '100%',
  padding: '8px 10px',
  fontSize: '0.72rem',
  borderRadius: 10,
  border: '1px solid rgba(99, 102, 241, 0.25)',
  boxSizing: 'border-box',
  fontFamily: 'ui-monospace, monospace',
};

const btnRow = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 };

export default function OfflineApiBaseSettingsForm({ variant = 'page', onApplied }) {
  const isOffline = getApiMode() === 'offline';
  const [soni, setSoni] = useState('');
  const [rrgold, setRrgold] = useState('');

  const reloadFields = useCallback(() => {
    setSoni(getUserOfflineSoniBase() || DEFAULT_OFFLINE_SONI_BASE);
    setRrgold(getUserOfflineRrgoldBase() || DEFAULT_OFFLINE_RRGOLD_BASE);
  }, []);

  useEffect(() => {
    reloadFields();
  }, [reloadFields]);

  useEffect(() => {
    if (!isOffline || typeof window === 'undefined') return undefined;
    const onChange = () => reloadFields();
    window.addEventListener('storage', onChange);
    window.addEventListener(OFFLINE_API_BASES_EVENT, onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener(OFFLINE_API_BASES_EVENT, onChange);
    };
  }, [isOffline, reloadFields]);

  if (!isOffline) return null;

  const persistPreferClear = (rawSoni, rawRrgold) => {
    const s = parseApiBaseUrl(rawSoni);
    const r = parseApiBaseUrl(rawRrgold);
    if (!s || !r) {
      toast.error('Enter valid http(s) base URLs for both servers.', { theme: 'colored', position: 'top-right' });
      return false;
    }
    if (s === parseApiBaseUrl(DEFAULT_OFFLINE_SONI_BASE)) setUserOfflineSoniBase('');
    else setUserOfflineSoniBase(s);
    if (r === parseApiBaseUrl(DEFAULT_OFFLINE_RRGOLD_BASE)) setUserOfflineRrgoldBase('');
    else setUserOfflineRrgoldBase(r);
    notifyOfflineApiBasesChanged();
    reloadFields();
    return true;
  };

  const handleSave = () => {
    if (persistPreferClear(soni, rrgold)) {
      toast.success(`Saved. Soni: ${getSoniApiBaseUrl()} · RRGOLD: ${getRrgoldApiBaseUrl()}`, {
        theme: 'colored',
        position: 'top-right',
        autoClose: 3200,
      });
      if (typeof onApplied === 'function') onApplied();
    }
  };

  const handleReset = () => {
    clearUserOfflineApiBases();
    notifyOfflineApiBasesChanged();
    reloadFields();
    toast.info(`Reset to defaults (${DEFAULT_OFFLINE_SONI_BASE}, ${DEFAULT_OFFLINE_RRGOLD_BASE}).`, {
      theme: 'colored',
      position: 'top-right',
    });
  };

  if (variant === 'page') {
    return (
      <div style={{ maxWidth: 560 }}>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
          Offline builds use these hosts for ProductMaster (Soni) and RRGOLD APIs. Defaults are localhost ports 8080 and 8081; change them if your LAN servers use different addresses.
        </p>
        <p style={{ color: '#475569', fontSize: 13, marginBottom: 16, lineHeight: 1.5, padding: '10px 12px', background: '#f1f5f9', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <strong style={{ color: '#0f172a' }}>Applies app-wide:</strong> after you save, login, inventory, samples, and all calls that use these bases will use the new URLs until you change them again.
        </p>
        <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#0f172a', marginBottom: 6 }}>Soni API base URL</label>
        <input value={soni} onChange={(e) => setSoni(e.target.value)} style={{ ...inputStyleCompact, fontSize: 14, padding: '10px 12px', marginBottom: 14 }} />
        <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#0f172a', marginBottom: 6 }}>RRGOLD API base URL</label>
        <input value={rrgold} onChange={(e) => setRrgold(e.target.value)} style={{ ...inputStyleCompact, fontSize: 14, padding: '10px 12px', marginBottom: 16 }} />
        <div style={btnRow}>
          <button type="button" onClick={handleSave} style={{ border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' }}>
            Save and apply everywhere
          </button>
          <button type="button" onClick={handleReset} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#334155' }}>
            Reset to defaults
          </button>
        </div>
      </div>
    );
  }

  return null;
}
