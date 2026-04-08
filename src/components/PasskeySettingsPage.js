import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaKey, FaShieldAlt, FaTrash } from 'react-icons/fa';
import {
  fetchPasskeyRegisterOptions,
  verifyPasskeyRegistration,
  listPasskeys,
  removePasskey,
  toPublicKeyCreationOptions,
} from '../services/passkeyAuthService';

const PasskeySettingsPage = () => {
  const navigate = useNavigate();
  const userInfo = useMemo(() => {
    try {
      const raw = localStorage.getItem('userInfo');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const loginName = String(userInfo?.Username || userInfo?.UserName || userInfo?.LoginName || '').trim();

  const [friendlyName, setFriendlyName] = useState('My device');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [passkeys, setPasskeys] = useState([]);
  const [removingId, setRemovingId] = useState(null);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await listPasskeys();
      const rows = res?.passkeys || res?.Passkeys || res?.data?.passkeys || [];
      setPasskeys(Array.isArray(rows) ? rows : []);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Could not load passkeys.';
      toast.error(msg);
      setPasskeys([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleRegisterPasskey = async () => {
    if (!window.PublicKeyCredential) {
      toast.error('WebAuthn is not supported in this browser.');
      return;
    }
    if (!loginName) {
      toast.error('Unable to detect login name. Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      const optRes = await fetchPasskeyRegisterOptions(friendlyName.trim());
      const sessionId = optRes.sessionId || optRes.SessionId;
      const rawOptions = optRes.options ?? optRes.Options;
      if (!sessionId || !rawOptions) {
        throw new Error('Invalid passkey registration response from server.');
      }

      const publicKey = toPublicKeyCreationOptions(rawOptions);
      const credential = await navigator.credentials.create({ publicKey });
      if (!credential || credential.type !== 'public-key') {
        throw new Error('Passkey creation was cancelled or failed.');
      }

      await verifyPasskeyRegistration({
        sessionId,
        friendlyName: friendlyName.trim(),
        credential,
      });

      toast.success('Passkey registered successfully.');
      await loadList();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        err?.message ||
        'Passkey registration failed.';
      if (String(msg).toLowerCase().includes('abort') || err?.name === 'NotAllowedError') {
        toast.info('Passkey setup was cancelled.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    if (!id && id !== 0) return;
    setRemovingId(id);
    try {
      await removePasskey(id);
      toast.success('Passkey removed.');
      await loadList();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Could not remove passkey.';
      toast.error(msg);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '12px 4px 22px' }}>
      <style>{`
        .pk-shell {
          border-radius: 22px;
          background: #ffffff;
          border: 1px solid #eef2f7;
          overflow: hidden;
          box-shadow: 0 8px 26px rgba(15, 23, 42, 0.06);
        }
        .pk-hero {
          background: linear-gradient(130deg, #f0fdf4 0%, #f8fafc 45%, #eff6ff 100%);
          color: #0f172a;
          padding: 18px;
          border-bottom: 1px solid #edf2f7;
        }
        .pk-main {
          padding: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .pk-card {
          background: #fff;
          border: 1px solid #edf2f7;
          border-radius: 12px;
          padding: 12px;
        }
        .pk-input {
          width: 100%;
          border: 1px solid #dbe3ef;
          border-radius: 9px;
          padding: 8px 11px;
          outline: none;
          transition: border-color 0.2s;
          font-size: 13px;
        }
        .pk-input:focus {
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.18);
        }
        .pk-btn {
          border: none;
          border-radius: 9px;
          padding: 8px 12px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
        }
        .pk-btn:hover { transform: translateY(-1px); }
        .pk-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .pk-primary { background: linear-gradient(135deg, #0d9488, #0f766e); color: #fff; box-shadow: 0 6px 14px rgba(13, 148, 136, 0.22); }
        .pk-soft { background: #ffffff; border: 1px solid #d9e2ef; color: #475569; }
        .pk-danger { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
        .pk-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid #f1f5f9;
          margin-bottom: 8px;
          background: #fafafa;
        }
        @media (max-width: 920px) {
          .pk-main { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="pk-shell">
        <div className="pk-hero">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <FaKey size={20} color="#0d9488" />
                <h2 style={{ margin: 0, fontSize: 26, color: '#1e293b' }}>Passkey (WebAuthn)</h2>
              </div>
              <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: 13, color: '#64748b' }}>
                Passwordless sign-in with your device or security key. Requires HTTPS in production.
              </p>
            </div>
            <button className="pk-btn pk-soft" type="button" onClick={() => navigate('/profile-menu')}>
              <FaArrowLeft style={{ marginRight: 6 }} />
              Back
            </button>
          </div>
        </div>

        <div className="pk-main">
          <div className="pk-card">
            <h4 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaShieldAlt color="#0d9488" size={16} />
              Register a new passkey
            </h4>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
              Signed in as <strong style={{ color: '#334155' }}>{loginName || '—'}</strong>. Use a friendly label so you can recognize this device later.
            </p>
            <label htmlFor="pkFriendly" style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              Friendly name
            </label>
            <input
              id="pkFriendly"
              type="text"
              className="pk-input"
              style={{ marginTop: 4, marginBottom: 12 }}
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
              placeholder="e.g. Office laptop"
            />
            <button
              type="button"
              className="pk-btn pk-primary"
              disabled={loading}
              onClick={handleRegisterPasskey}
            >
              {loading ? 'Waiting for device…' : 'Add passkey'}
            </button>
          </div>

          <div className="pk-card">
            <h4 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: 17 }}>Registered passkeys</h4>
            {listLoading ? (
              <p style={{ fontSize: 13, color: '#64748b' }}>Loading…</p>
            ) : passkeys.length === 0 ? (
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                No passkeys yet. Add one to enable “Sign in with passkey” on the login page.
              </p>
            ) : (
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {passkeys.map((pk) => {
                  const id = pk.Id ?? pk.id;
                  const name = pk.FriendlyName ?? pk.friendlyName ?? 'Passkey';
                  const created = pk.CreatedOn ?? pk.createdOn;
                  return (
                    <div key={id} className="pk-row">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {created ? new Date(created).toLocaleString() : '—'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="pk-btn pk-danger"
                        disabled={removingId === id}
                        onClick={() => handleRemove(id)}
                        title="Remove passkey"
                      >
                        <FaTrash style={{ marginRight: 6 }} />
                        {removingId === id ? '…' : 'Remove'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasskeySettingsPage;
