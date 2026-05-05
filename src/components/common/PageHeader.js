import React from 'react';

const defaultBar = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 0,
  padding: '0 0 12px 0',
  borderBottom: '1px solid #e5e7eb',
};

/**
 * Shared page title row: icon, title, optional subtitle, optional actions.
 */
const PageHeader = ({
  isSmallScreen = false,
  title,
  subtitle,
  icon,
  iconGradient = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  iconShadow,
  barStyle,
  actions,
}) => {
  return (
    <div style={{ ...defaultBar, ...barStyle }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flex: '1 1 auto',
          minWidth: 0,
        }}
      >
        {icon != null && (
          <div
            style={{
              width: isSmallScreen ? 36 : 42,
              height: isSmallScreen ? 36 : 42,
              borderRadius: 10,
              background: iconGradient,
              boxShadow: iconShadow || '0 2px 8px rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: isSmallScreen ? '1.05rem' : '1.2rem',
              fontWeight: 800,
              color: '#0f172a',
              fontFamily: 'var(--font-family)',
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          {subtitle ? <div style={{ marginTop: 4 }}>{subtitle}</div> : null}
        </div>
      </div>
      {actions != null ? (
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
          {actions}
        </div>
      ) : null}
    </div>
  );
};

export default PageHeader;
