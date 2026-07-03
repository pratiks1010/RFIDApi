import React from 'react';
import { FaCheck } from 'react-icons/fa';
import { PERMISSION_LABELS } from '../../constants/rfidPermissions';

const PermissionsPanel = ({ permKeys, permissions, onToggle, onSelectAll, title = 'Module access' }) => (
  <div className="rfid-perm-section">
    <div className="rfid-section-header">
      <div>
        <h3 className="rfid-section-title">{title}</h3>
        <p className="rfid-section-desc">Choose which dashboard modules this employee can use.</p>
      </div>
      {onSelectAll && (
        <div className="rfid-section-actions">
          <button type="button" className="rfid-btn rfid-btn-sm rfid-btn-ghost" onClick={() => onSelectAll(true)}>
            Enable all
          </button>
          <button type="button" className="rfid-btn rfid-btn-sm rfid-btn-ghost" onClick={() => onSelectAll(false)}>
            Disable all
          </button>
        </div>
      )}
    </div>
    <div className="rfid-perm-grid">
      {permKeys.map((key) => {
        const checked = Boolean(permissions[key]);
        return (
          <label key={key} className={`rfid-perm-item${checked ? ' checked' : ''}`}>
            <input type="checkbox" checked={checked} onChange={() => onToggle(key)} />
            <span className="rfid-perm-check">{checked && <FaCheck size={10} aria-hidden />}</span>
            <span className="rfid-perm-label">{PERMISSION_LABELS[key] || key}</span>
          </label>
        );
      })}
    </div>
  </div>
);

export default PermissionsPanel;
