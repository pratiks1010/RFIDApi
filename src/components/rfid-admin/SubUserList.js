import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FaEllipsisV,
  FaPlus,
  FaIdCard,
  FaUserEdit,
  FaKey,
  FaCodeBranch,
  FaSignOutAlt,
  FaTrash,
  FaUserSlash,
  FaUserCheck,
  FaSync,
} from 'react-icons/fa';
import RfidAdminPage from './RfidAdminPage';
import PlanBanner, { useRfidPlan } from './PlanBanner';
import {
  authHeaders,
  extractApiMessage,
  normalizeList,
  rfidUserUrls,
} from '../../services/rfidUserManagementApi';
import '../../styles/rfidAdmin.css';

const formatTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const initials = (name) => {
  const parts = String(name || '?').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || '?').slice(0, 2).toUpperCase();
};

const SubUserList = () => {
  const navigate = useNavigate();
  const { canAddUser } = useRfidPlan();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuUserId, setMenuUserId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(rfidUserUrls.getAllSubUsers(), { headers: authHeaders() });
      setUsers(normalizeList(res.data));
    } catch (err) {
      toast.error(extractApiMessage(err));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!menuUserId) return;
    const close = () => setMenuUserId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuUserId]);

  const runAction = async (userId, fn) => {
    setActionLoading(userId);
    setMenuUserId(null);
    try {
      await fn();
      await loadUsers();
    } catch (err) {
      toast.error(extractApiMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStatus = (user, activate) =>
    runAction(user.UserId || user.userId, () =>
      axios.post(
        rfidUserUrls.toggleUserStatus(),
        { UserId: user.UserId || user.userId, IsActive: activate },
        { headers: authHeaders() }
      ).then(() =>
        toast.success(activate ? 'User activated' : 'User deactivated')
      )
    );

  const forceLogout = (user) =>
    runAction(user.UserId || user.userId, () =>
      axios.post(
        rfidUserUrls.forceLogout(),
        { UserId: user.UserId || user.userId },
        { headers: authHeaders() }
      ).then(() => toast.success('User logged out from all sessions'))
    );

  const deleteUser = (user) => {
    const name = user.UserName || user.userName || 'this user';
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    runAction(user.UserId || user.userId, () =>
      axios.post(
        rfidUserUrls.deleteSubUser(),
        { UserId: user.UserId || user.userId },
        { headers: authHeaders() }
      ).then(() => toast.success('User deleted'))
    );
  };

  const uid = (u) => u.UserId || u.userId;

  return (
    <RfidAdminPage
      title="User Management"
      subtitle="Manage employee logins, permissions, and branch access"
      actions={
        <>
          <Link to="/rfid-admin/my-plan" className="rfid-btn rfid-btn-ghost" style={{ textDecoration: 'none' }}>
            My Plan
          </Link>
          <button
            type="button"
            className="rfid-btn rfid-btn-ghost"
            disabled={!canAddUser}
            onClick={() => navigate('/rfid-admin/users/convert-from-employee')}
            title={!canAddUser ? 'Plan limit or expiry blocks new users' : 'Convert Employee Master row to dashboard login'}
          >
            <FaIdCard /> From employees
          </button>
          <button
            type="button"
            className="rfid-btn rfid-btn-primary"
            disabled={!canAddUser}
            onClick={() => navigate('/rfid-admin/users/create')}
            title={!canAddUser ? 'Plan limit or expiry blocks new users' : 'Manual login without Employee Master'}
          >
            <FaPlus /> Add Employee
          </button>
        </>
      }
    >
      <PlanBanner />
      <div className="rfid-card">
        <div className="rfid-toolbar">
          <div>
            <div className="rfid-toolbar-title">
              {loading ? 'Loading…' : `${users.length} employee${users.length === 1 ? '' : 's'}`}
            </div>
            <div className="rfid-toolbar-meta">Dashboard sub-users linked to your plan</div>
          </div>
          <button type="button" className="rfid-btn rfid-btn-sm rfid-btn-ghost" onClick={loadUsers} disabled={loading}>
            <FaSync /> Refresh
          </button>
        </div>
        <div className="rfid-table-wrap">
          {loading ? (
            <div className="rfid-empty">Loading employees…</div>
          ) : users.length === 0 ? (
            <div className="rfid-empty">
              No sub-users yet.{' '}
              {canAddUser && (
                <Link to="/rfid-admin/users/create">Add your first employee</Link>
              )}
            </div>
          ) : (
            <table className="rfid-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Online</th>
                  <th>Status</th>
                  <th>Last seen</th>
                  <th style={{ width: 72 }} />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const id = uid(user);
                  const active = user.IsActive !== false && user.isActive !== false;
                  const online = Boolean(user.IsOnline ?? user.isOnline);
                  const displayName = user.employeeName || user.EmployeeName || user.UserName || user.userName || '—';
                  const code = user.employeeCode || user.EmployeeCode;
                  return (
                    <tr key={id}>
                      <td>
                        <div className="rfid-user-cell">
                          <div className="rfid-user-avatar">{initials(displayName)}</div>
                          <div>
                            <strong>{displayName}</strong>
                            {code && <div className="rfid-table-sub">{code}</div>}
                          </div>
                        </div>
                      </td>
                      <td>{user.Email || user.email || '—'}</td>
                      <td>
                        <span className="rfid-badge rfid-badge-role">
                          {user.RoleType || user.roleType || 'User'}
                        </span>
                      </td>
                      <td>
                        <span className={`rfid-online-dot ${online ? 'on' : 'off'}`} />
                        {online ? 'Online' : 'Offline'}
                      </td>
                      <td>
                        <span className={`rfid-badge ${active ? 'rfid-badge-active' : 'rfid-badge-inactive'}`}>
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{formatTime(user.LastActiveTime || user.lastActiveTime)}</td>
                      <td>
                        <div className="rfid-actions-menu" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="rfid-btn rfid-btn-sm rfid-btn-ghost"
                            style={{ padding: '8px 10px' }}
                            disabled={actionLoading === id}
                            onClick={() => setMenuUserId(menuUserId === id ? null : id)}
                            aria-label="Actions"
                          >
                            <FaEllipsisV />
                          </button>
                          {menuUserId === id && (
                            <div className="rfid-actions-dropdown">
                              <ActionItem
                                icon={FaUserEdit}
                                label="Edit"
                                onClick={() => navigate(`/rfid-admin/users/${id}/edit`)}
                              />
                              <ActionItem
                                icon={FaKey}
                                label="Permissions"
                                onClick={() => navigate(`/rfid-admin/users/${id}/permissions`)}
                              />
                              <ActionItem
                                icon={FaCodeBranch}
                                label="Branches"
                                onClick={() => navigate(`/rfid-admin/users/${id}/branches`)}
                              />
                              <div className="rfid-action-divider" />
                              {active ? (
                                <ActionItem
                                  icon={FaUserSlash}
                                  label="Deactivate"
                                  onClick={() => toggleStatus(user, false)}
                                />
                              ) : (
                                <ActionItem
                                  icon={FaUserCheck}
                                  label="Activate"
                                  onClick={() => toggleStatus(user, true)}
                                />
                              )}
                              <ActionItem
                                icon={FaSignOutAlt}
                                label="Force logout"
                                onClick={() => forceLogout(user)}
                              />
                              <div className="rfid-action-divider" />
                              <ActionItem
                                icon={FaTrash}
                                label="Delete"
                                danger
                                onClick={() => deleteUser(user)}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </RfidAdminPage>
  );
};

const ActionItem = ({ icon: Icon, label, onClick, danger }) => (
  <button type="button" className={`rfid-action-item${danger ? ' danger' : ''}`} onClick={onClick}>
    <Icon size={14} /> {label}
  </button>
);

export default SubUserList;
