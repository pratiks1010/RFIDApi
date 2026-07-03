import React from 'react';

const FormFooter = ({ onCancel, onBack, onNext, onSubmit, nextLabel = 'Next', submitLabel = 'Save', saving, submitDisabled, showBack }) => (
  <div className="rfid-form-footer">
    <div className="rfid-form-footer-left">
      {showBack && onBack && (
        <button type="button" className="rfid-btn rfid-btn-ghost" onClick={onBack}>
          Back
        </button>
      )}
    </div>
    <div className="rfid-form-footer-right">
      {onCancel && (
        <button type="button" className="rfid-btn rfid-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      )}
      {onNext && (
        <button type="button" className="rfid-btn rfid-btn-primary" onClick={onNext}>
          {nextLabel}
        </button>
      )}
      {onSubmit && (
        <button
          type="button"
          className="rfid-btn rfid-btn-primary"
          onClick={onSubmit}
          disabled={saving || submitDisabled}
        >
          {saving ? `${submitLabel}…` : submitLabel}
        </button>
      )}
    </div>
  </div>
);

export default FormFooter;
