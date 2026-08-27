import React from 'react';

const UiButton = ({
  variant = 'secondary',
  type = 'button',
  disabled,
  onClick,
  children,
  className = '',
  title,
}) => (
  <button
    type={type}
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={`ui-btn ui-btn--${variant}${className ? ` ${className}` : ''}`}
  >
    {children}
  </button>
);

export default UiButton;
