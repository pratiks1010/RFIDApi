import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import RfidAdminPage from './RfidAdminPage';
import FormFooter from './FormFooter';
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
          setRows(branchList.map((b) => ({ ...b, assigned: true })));
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
      subtitle={userName ? `Configure branches for ${userName}` : ''}
      backTo="/rfid-admin/users"
      backLabel="User Management"
    >
      <div className="rfid-card">
        {loading ? (
          <div className="rfid-empty">Loading branches…</div>
        ) : (
          <div className="rfid-form-body">
            <div className="rfid-section-header">
              <div>
                <h3 className="rfid-section-title">Branch access</h3>
                <p className="rfid-section-desc">Choose which store branches this employee can access.</p>
              </div>
            </div>
            <div className="rfid-segmented">
              <button
                type="button"
                className={`rfid-segment${allBranches ? ' active' : ''}`}
                onClick={() => {
                  setAllBranches(true);
                  setRows((prev) => prev.map((r) => ({ ...r, assigned: true })));
                }}
              >
                All branches
              </button>
              <button
                type="button"
                className={`rfid-segment${!allBranches ? ' active' : ''}`}
                onClick={() => setAllBranches(false)}
              >
                Selected only
              </button>
            </div>
            {allBranches ? (
              <div className="rfid-branch-all-note">
                Full access to every branch linked to your account.
              </div>
            ) : (
              <div className="rfid-table-wrap rfid-branch-table">
                <table className="rfid-table">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }} aria-label="Assigned" />
                      <th>Branch</th>
                      <th>Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((b) => {
                      const id = b.BranchId ?? b.branchId ?? b.Id ?? b.id;
                      const name = b.BranchName ?? b.branchName ?? b.Name ?? '—';
                      const code = b.BranchCode ?? b.branchCode ?? b.Code ?? '—';
                      const checked = Boolean(b.assigned);
                      return (
                        <tr
                          key={id}
                          className={`rfid-branch-row${checked ? ' selected' : ''}`}
                          onClick={() => toggleRow(id)}
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRow(id)}
                            />
                          </td>
                          <td>{name}</td>
                          <td><span className="rfid-code">{code}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && (
                  <p className="rfid-empty rfid-empty-sm">No branches returned from API.</p>
                )}
              </div>
            )}
            <FormFooter
              onCancel={() => navigate('/rfid-admin/users')}
              onSubmit={submit}
              submitLabel="Save branch access"
              saving={saving}
            />
          </div>
        )}
      </div>
    </RfidAdminPage>
  );
};

export default SubUserBranches;
