import React from 'react';

const UiIconButton = ({
  variant = 'neutral',
  title,
  onClick,
  disabled,
  children,
  className = '',
  'aria-label': ariaLabel,
}) => (
  <button
    type="button"
    className={`ui-icon-btn ui-icon-btn--${variant} cm-icon-btn cm-icon-btn--${variant}${className ? ` ${className}` : ''}`}
    title={title}
    aria-label={ariaLabel || title}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

export default UiIconButton;
