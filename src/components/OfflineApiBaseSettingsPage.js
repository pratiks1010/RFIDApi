import React from 'react';
import { Navigate } from 'react-router-dom';
import { getApiMode } from '../services/apiBaseConfig';
import OfflineApiBaseSettingsForm from './OfflineApiBaseSettingsForm';

const OfflineApiBaseSettingsPage = () => {
  if (getApiMode() !== 'offline') {
    return <Navigate to="/profile-menu" replace />;
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Offline API base URLs</h1>
      <OfflineApiBaseSettingsForm variant="page" />
    </div>
  );
};

export default OfflineApiBaseSettingsPage;
