import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import RfidAdminPage from './RfidAdminPage';
import FormFooter from './FormFooter';
import PermissionsPanel from './PermissionsPanel';
import { emptyPermissions, PERMISSION_KEYS } from '../../constants/rfidPermissions';
import { permissionsToApiPayload } from '../../utils/authState';
import {
  authHeaders,
  extractApiMessage,
  normalizeList,
  rfidUserUrls,
} from '../../services/rfidUserManagementApi';
import '../../styles/rfidAdmin.css';

const SubUserPermissions = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [permissions, setPermissions] = useState(emptyPermissions());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(rfidUserUrls.getAllSubUsers(), { headers: authHeaders() });
        const list = normalizeList(res.data);
        const user = list.find((u) => (u.UserId || u.userId) === userId);
        if (!user) {
          toast.error('User not found');
          navigate('/rfid-admin/users');
          return;
        }
        setUserName(user.UserName || user.userName || '');
        const raw = user.Permissions || user.permissions || {};
        const merged = { ...emptyPermissions(), ...raw };
        PERMISSION_KEYS.forEach((k) => {
          const camel = k.charAt(0).toLowerCase() + k.slice(1);
          if (merged[k] === undefined && raw[camel] !== undefined) merged[k] = raw[camel];
          if (merged[k] === undefined) merged[k] = false;
        });
        setPermissions(merged);
      } catch (err) {
        toast.error(extractApiMessage(err));
        navigate('/rfid-admin/users');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, navigate]);

  const toggle = (key) =>
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));

  const selectAll = (value) =>
    setPermissions(PERMISSION_KEYS.reduce((acc, k) => ({ ...acc, [k]: value }), {}));

  const submit = async () => {
    setSaving(true);
    try {
      await axios.post(
        rfidUserUrls.updateModulePermissions(),
        { userId, permissions: permissionsToApiPayload(permissions) },
        { headers: authHeaders() }
      );
      toast.success('Permissions saved');
      navigate('/rfid-admin/users');
    } catch (err) {
      toast.error(extractApiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <RfidAdminPage
      title="Module Permissions"
      subtitle={userName ? `Configure access for ${userName}` : ''}
      backTo="/rfid-admin/users"
      backLabel="User Management"
    >
      <div className="rfid-card">
        {loading ? (
          <div className="rfid-empty">Loading permissions…</div>
        ) : (
          <div className="rfid-form-body">
            <PermissionsPanel
              permKeys={PERMISSION_KEYS}
              permissions={permissions}
              onToggle={toggle}
              onSelectAll={selectAll}
            />
            <FormFooter
              onCancel={() => navigate('/rfid-admin/users')}
              onSubmit={submit}
              submitLabel="Save permissions"
              saving={saving}
            />
          </div>
        )}
      </div>
    </RfidAdminPage>
  );
};

export default SubUserPermissions;
