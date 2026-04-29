import React from 'react';

const fallbackStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f8fafc',
  color: '#0f172a',
  padding: 24
};

const cardStyle = {
  width: 'min(760px, 95vw)',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 10px 30px rgba(2,6,23,0.08)'
};

const actionBtn = {
  border: 0,
  borderRadius: 8,
  padding: '10px 14px',
  background: '#2563eb',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 600
};

const secondaryBtn = {
  ...actionBtn,
  background: '#0f172a'
};

// Class-based boundary is required by React for render-time crash capture.
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected UI error'
    };
  }

  componentDidCatch(error, info) {
    // Keep diagnostics in console for support/debugging.
    console.error('Renderer crash captured by AppErrorBoundary:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleLoginFallback = () => {
    try {
      window.location.hash = '#/login';
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div style={fallbackStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ margin: '0 0 8px', color: '#334155' }}>
            The app is still running, but this screen crashed. Please reload and continue.
          </p>
          <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: 13 }}>
            Error: {this.state.errorMessage}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" style={actionBtn} onClick={this.handleReload}>Reload App</button>
            <button type="button" style={secondaryBtn} onClick={this.handleLoginFallback}>Go To Login</button>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
