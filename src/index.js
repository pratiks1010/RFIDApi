import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './index.css';

const renderFatalScreen = (message) => {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:24px;">
      <div style="width:min(760px,95vw);background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
        <h2 style="margin:0 0 8px;color:#0f172a;">Application error</h2>
        <p style="margin:0 0 8px;color:#334155;">The page hit an unexpected runtime error, but the app process is still alive.</p>
        <p style="margin:0 0 16px;color:#64748b;font-size:13px;">${String(message || 'Unknown error')}</p>
        <button style="border:0;border-radius:8px;padding:10px 14px;background:#2563eb;color:#fff;cursor:pointer;font-weight:600;" onclick="window.location.reload()">Reload App</button>
      </div>
    </div>
  `;
};

window.addEventListener('error', (event) => {
  console.error('Global window error:', event?.error || event?.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event?.reason);
});

const root = ReactDOM.createRoot(document.getElementById('root'));
try {
  root.render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
} catch (error) {
  console.error('Fatal React bootstrap error:', error);
  renderFatalScreen(error?.message || 'Failed to bootstrap application UI.');
}