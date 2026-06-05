import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import RfidAdminPage from './RfidAdminPage';
import {
  authHeaders,
  extractApiMessage,
  normalizeList,
  rfidUserUrls,
} from '../../services/rfidUserManagementApi';
import '../../styles/rfidAdmin.css';

const SubUserBranches = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [rows, setRows] = useState([]);
  const [allBranches, setAllBranches] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [usersRes, branchRes] = await Promise.all([
          axios.get(rfidUserUrls.getAllSubUsers(), { headers: authHeaders() }),
          axios.get(rfidUserUrls.getUserBranchAccess(userId), { headers: authHeaders() }),
        ]);
        const list = normalizeList(usersRes.data);
        const user = list.find((u) => (u.UserId || u.userId) === userId);
        setUserName(user?.UserName || user?.userName || '');

        const data = branchRes.data;
        const branchList = normalizeList(data?.Branches ?? data?.branches ?? data);
        const hasAll =
          data?.HasAllBranchAccess ??
          data?.hasAllBranchAccess ??
          user?.HasAllBranchAccess ??
          false;

        if (hasAll) {
          setAllBranches(true);
          setRows(
            branchList.map((b) => ({
              ...b,
              assigned: true,
            }))
          );
        } else {
          setAllBranches(false);
          setRows(
            branchList.map((b) => ({
              ...b,
              assigned: Boolean(b.IsAssigned ?? b.isAssigned ?? b.Assigned ?? b.assigned),
            }))
          );
        }
      } catch (err) {
        toast.error(extractApiMessage(err));
        navigate('/rfid-admin/users');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, navigate]);

  const toggleRow = (id) => {
    setAllBranches(false);
    setRows((prev) =>
      prev.map((r) => {
        const rid = r.BranchId ?? r.branchId ?? r.Id ?? r.id;
        if (Number(rid) !== Number(id)) return r;
        return { ...r, assigned: !r.assigned };
      })
    );
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        UserId: userId,
        BranchIds: allBranches
          ? null
          : rows.filter((r) => r.assigned).map((r) => Number(r.BranchId ?? r.branchId ?? r.Id ?? r.id)),
      };
      await axios.post(rfidUserUrls.assignBranches(), payload, { headers: authHeaders() });
      toast.success('Branch access saved');
      navigate('/rfid-admin/users');
    } catch (err) {
      toast.error(extractApiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <RfidAdminPage
      title="Branch Access"
      subtitle={userName ? `Employee: ${userName}` : ''}
      backTo="/rfid-admin/users"
    >
      <div className="rfid-card">
        {loading ? (
          <div className="rfid-empty">Loading branches…</div>
        ) : (
          <div className="rfid-form-body">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allBranches}
                onChange={(e) => {
                  setAllBranches(e.target.checked);
                  if (e.target.checked) {
                    setRows((prev) => prev.map((r) => ({ ...r, assigned: true })));
                  }
                }}
              />
              <strong>All branches</strong>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>(sends null — full access)</span>
            </label>
            {!allBranches && (
              <div className="rfid-table-wrap">
                <table className="rfid-table rfid-branch-table">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}>Assigned</th>
                      <th>Branch</th>
                      <th>Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((b) => {
                      const id = b.BranchId ?? b.branchId ?? b.Id ?? b.id;
                      const name = b.BranchName ?? b.branchName ?? b.Name ?? '—';
                      const code = b.BranchCode ?? b.branchCode ?? b.Code ?? '—';
                      return (
                        <tr key={id} className="rfid-branch-row">
                          <td>
                            <input
                              type="checkbox"
                              checked={Boolean(b.assigned)}
                              onChange={() => toggleRow(id)}
                            />
                          </td>
                          <td>{name}</td>
                          <td>{code}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && (
                  <p className="rfid-empty">No branches returned from API.</p>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button type="button" className="rfid-btn rfid-btn-primary" onClick={submit} disabled={saving}>
                {saving ? 'Saving…' : 'Save branch access'}
              </button>
              <button type="button" className="rfid-btn rfid-btn-ghost" onClick={() => navigate('/rfid-admin/users')}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </RfidAdminPage>
  );
};

export default SubUserBranches;
