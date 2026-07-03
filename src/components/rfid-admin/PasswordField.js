import React, { useId, useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const PasswordField = ({
  label,
  value,
  onChange,
  placeholder = '',
  autoComplete = 'new-password',
  defaultVisible = false,
  error,
}) => {
  const [show, setShow] = useState(defaultVisible);
  const inputId = useId();

  return (
    <div className={`rfid-field${error ? ' has-error' : ''}`}>
      <label htmlFor={inputId}>{label}</label>
      <div className="rfid-password-wrap">
        <input
          id={inputId}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="rfid-password-toggle"
          onClick={() => setShow((prev) => !prev)}
          aria-label={show ? 'Hide password' : 'Show password'}
          title={show ? 'Hide password' : 'Show password'}
        >
          {show ? <FaEyeSlash size={15} aria-hidden /> : <FaEye size={15} aria-hidden />}
        </button>
      </div>
      {error ? <p className="rfid-field-error">{error}</p> : null}
    </div>
  );
};

export default PasswordField;
