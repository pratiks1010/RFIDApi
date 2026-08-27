import React from 'react';

const MasterFormField = ({ label, required, children }) => (
  <div className="cm-field">
    {label ? (
      <label className="cm-field-label">
        {label}
        {required ? <span className="cm-req"> *</span> : null}
      </label>
    ) : null}
    {children}
  </div>
);

export default MasterFormField;
