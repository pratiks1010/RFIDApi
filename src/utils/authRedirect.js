/** True when running packaged Electron (loadFile + HashRouter). */
export const isElectronFileProtocol = () =>
  typeof window !== 'undefined' && window.location.protocol === 'file:';

/**
 * Do not hard-redirect on 401 for login/register/forgot-password calls —
 * those should show inline errors on the form.
 */
export const shouldRedirectOn401 = (config) => {
  if (!config) return true;
  if (config.skipAuthRedirect === true) return false;

  const url = String(config.url || '').toLowerCase();
  const skipPaths = [
    'authlogin',
    'auth/login',
    'forgotpassword',
    'adminlogin',
    '/auth/register',
    'registeruser',
    'clientregister',
  ];
  return !skipPaths.some((part) => url.includes(part));
};

/**
 * Navigate to login without breaking Electron file:// builds.
 * BrowserRouter: full navigation. HashRouter / file: hash only.
 */
export const redirectToLogin = ({ sessionExpired = false, admin = false } = {}) => {
  if (typeof window === 'undefined') return;

  if (!admin) {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('lastLoginTime');
    localStorage.removeItem('showWelcomeToast');
  } else {
    localStorage.removeItem('adminToken');
  }

  const path = admin ? '/admin-login' : '/login';
  const query = sessionExpired && !admin ? '?session_expired=true' : '';
  const target = `${path}${query}`;

  if (isElectronFileProtocol()) {
    window.location.hash = `#${target}`;
    return;
  }

  const origin = window.location.origin || '';
  window.location.href = `${origin}${target}`;
};

/** Shared axios 401 handler — use in global interceptors. */
export const handleAxios401 = (error) => {
  const originalRequest = error?.config;
  const status = error?.response?.status;

  if (status !== 401 || !originalRequest || originalRequest._auth401Handled) {
    return Promise.reject(error);
  }

  originalRequest._auth401Handled = true;

  if (!shouldRedirectOn401(originalRequest)) {
    return Promise.reject(error);
  }

  const isAdmin = String(originalRequest.url || '').toLowerCase().includes('/api/admin/');
  redirectToLogin({ sessionExpired: true, admin: isAdmin });
  return Promise.reject(error);
};
