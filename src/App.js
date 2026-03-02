import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import DashboardAnalytics from './components/DashboardAnalytics';
import APIDocumentation from './components/APIDocumentation';
import RFIDIntegration from './components/RFIDIntegration';
import {
  LabelStockList,
  Labeling,
  RFIDDeviceDetails,
  RFIDTags,
  TagUsage,
  StockVerification,
  StockTransfer,
  InvoiceStock,
  RFIDLabel,
  AddStock,
  OrderList
} from './components/inventory/components';
import ProductDetailsPage from './components/inventory/ProductDetailsPage';
import CreateLabel from './components/inventory/CreateLabel';
import CreateInvoice from './components/inventory/CreateInvoice';
import SampleOut from './components/inventory/SampleOut';
import SampleOutList from './components/inventory/SampleOutList';
import SampleIn from './components/inventory/SampleIn';
import SessionDetails from './components/inventory/SessionDetails';
import QuotationNew from './components/quotation/QuotationNew';
import QuotationWithRFIDTray from './components/quotation/QuotationWithRFIDTray';
import QuotationList from './components/quotation/QuotationList';
import Reports from './components/Reports';
import StockReportSummary from './components/StockReportSummary';
import Footer from './components/Footer';
import UploadRFID from './components/UploadRFID';
import RFIDTransactions from './components/RFIDTransactions';
import RFIDAppDownload from './components/RFIDAppDownload';
import NotFound from './components/NotFound';
import { AdminLogin, AdminDashboard } from './components/admin';
import AdminRfidTagsReport from './components/admin/AdminRfidTagsReport';
import SingleUseTags from './components/SingleUseTags';
import ThirdPartySoftwareIntegration from './components/ThirdPartySoftwareIntegration';
import DownloadApiDoc from './components/DownloadApiDoc';
import DownloadResources from './components/DownloadResources';
import ProfileMenuPage from './components/ProfileMenuPage';
import UserProfile from './components/UserProfile';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import './styles/rtl.css';
import { ToastContainer } from 'react-toastify';
import Layout from './components/Layout';
import ZohoLoader from './components/common/Loader';
import { NotificationProvider } from './context/NotificationContext';
import { TranslationProvider } from './context/TranslationContext';
import WelcomeModal from './components/common/WelcomeModal';
import { Provider } from 'react-redux';
import { store } from './store/store';
import AuthInitializer from './components/common/AuthInitializer';
import './i18n';

// Global loading context
export const LoadingContext = createContext({ loading: false, setLoading: () => { } });
export const useLoading = () => useContext(LoadingContext);

const LoadingProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      {loading && <ZohoLoader />}
      {children}
    </LoadingContext.Provider>
  );
};

// Enhanced authentication check with navigation protection
const useAuthProtection = () => {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const adminToken = localStorage.getItem('adminToken');
    let isAuth = false;
    let isAdminAuth = false;

    // Check user authentication
    if (token) {
      try {
        // Validate token is not expired
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const tokenPayload = JSON.parse(window.atob(base64));

        // Check if token is expired (if exp field exists)
        if (tokenPayload.exp) {
          const currentTime = Math.floor(Date.now() / 1000);
          isAuth = tokenPayload.exp > currentTime;

          // If token is expired, clear storage
          if (!isAuth) {
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            localStorage.removeItem('permissions');
            localStorage.removeItem('roleType');
            localStorage.removeItem('isSubUser');
            localStorage.removeItem('allowedBranchIds');
            localStorage.removeItem('hasAllBranchAccess');
            localStorage.removeItem('lastLoginTime');
          }
        } else {
          isAuth = true; // If no expiry, consider valid
        }
      } catch (error) {
        // Invalid token format, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('permissions');
        localStorage.removeItem('roleType');
        localStorage.removeItem('isSubUser');
        localStorage.removeItem('allowedBranchIds');
        localStorage.removeItem('hasAllBranchAccess');
        localStorage.removeItem('lastLoginTime');
        isAuth = false;
      }
    }

    // Check admin authentication
    if (adminToken) {
      try {
        // Validate admin token is not expired
        const base64Url = adminToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const tokenPayload = JSON.parse(window.atob(base64));

        // Check if token is expired (if exp field exists)
        if (tokenPayload.exp) {
          const currentTime = Math.floor(Date.now() / 1000);
          isAdminAuth = tokenPayload.exp > currentTime;

          // If token is expired, clear storage
          if (!isAdminAuth) {
            localStorage.removeItem('adminToken');
          }
        } else {
          isAdminAuth = true; // If no expiry, consider valid
        }
      } catch (error) {
        // Invalid token format, clear storage
        localStorage.removeItem('adminToken');
        isAdminAuth = false;
      }
    }

    // Handle navigation based on authentication status
    const currentPath = location.pathname;

    // If user is authenticated and tries to access login/register pages
    if (isAuth && (currentPath === '/login' || currentPath === '/register')) {
      navigate('/dashboard', { replace: true });
    }

    // If admin is authenticated and tries to access admin-login
    if (isAdminAuth && currentPath === '/admin-login') {
      navigate('/admin-dashboard', { replace: true });
    }

    // If no authentication and trying to access protected routes
    if (!isAuth && !isAdminAuth) {
      const protectedRoutes = [
        '/dashboard',
        '/analytics',
        '/rfid-integration',
        '/label-stock',
        '/rfid-devices',
        '/rfid-tags',
        '/tag-usage',
        '/stock-verification',
        '/upload-rfid',
        '/rfid-transactions',
        '/rfid-app-download',
        '/third-party-integration',
        '/download-api-doc',
        '/download-resources',
        '/single-use-tags',
        '/profile-menu'
      ];
      const adminRoutes = ['/admin-dashboard'];

      if (protectedRoutes.includes(currentPath)) {
        navigate('/login', { replace: true });
      } else if (adminRoutes.includes(currentPath)) {
        navigate('/admin-login', { replace: true });
      } else if (currentPath === '/') {
        navigate('/login', { replace: true });
      }
    }

    // If user is authenticated but tries to access admin routes
    if (isAuth && !isAdminAuth && currentPath === '/admin-dashboard') {
      navigate('/dashboard', { replace: true });
    }

    // If admin is authenticated but tries to access user routes
    if (isAdminAuth && !isAuth && ['/dashboard', '/analytics', '/api-documentation', '/rfid-integration', '/label-stock', '/invoice-stock', '/rfid-label', '/rfid-devices', '/rfid-tags', '/tag-usage', '/stock-verification', '/stock-transfer', '/upload-rfid', '/rfid-transactions', '/rfid-app-download', '/download-api-doc', '/download-resources', '/single-use-tags', '/profile-menu', '/profile'].includes(currentPath)) {
      navigate('/admin-dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Add popstate listener to handle browser back/forward buttons
  React.useEffect(() => {
    const handlePopState = () => {
      const token = localStorage.getItem('token');
      const adminToken = localStorage.getItem('adminToken');
      const isAuth = !!token;
      const isAdminAuth = !!adminToken;
      const currentPath = window.location.pathname;

      // If not authenticated, always redirect to login/admin-login on protected routes
      const protectedRoutes = [
        '/dashboard',
        '/analytics',
        '/rfid-integration',
        '/label-stock',
        '/invoice-stock',
        '/rfid-label',
        '/rfid-devices',
        '/rfid-tags',
        '/tag-usage',
        '/stock-verification',
        '/upload-rfid',
        '/rfid-transactions',
        '/rfid-app-download',
        '/third-party-integration',
        '/download-api-doc',
        '/download-resources',
        '/single-use-tags',
        '/profile-menu'
      ];
      const adminRoutes = ['/admin-dashboard'];

      if (!isAuth && !isAdminAuth) {
        if (protectedRoutes.includes(currentPath)) {
          navigate('/login', { replace: true });
        } else if (adminRoutes.includes(currentPath)) {
          navigate('/admin-login', { replace: true });
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);
};

// Protected route authentication check with enhanced validation
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    // Validate token format and expiry
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const tokenPayload = JSON.parse(window.atob(base64));

    // Check if token is expired (if exp field exists)
    if (tokenPayload.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      const isValid = tokenPayload.exp > currentTime;

      // If token is expired, clear storage
      if (!isValid) {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('permissions');
        localStorage.removeItem('roleType');
        localStorage.removeItem('isSubUser');
        localStorage.removeItem('allowedBranchIds');
        localStorage.removeItem('hasAllBranchAccess');
        localStorage.removeItem('lastLoginTime');
      }

      return isValid;
    }

    return true; // If no expiry field, consider valid
  } catch (error) {
    // Invalid token format, clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('permissions');
    localStorage.removeItem('roleType');
    localStorage.removeItem('isSubUser');
    localStorage.removeItem('allowedBranchIds');
    localStorage.removeItem('hasAllBranchAccess');
    localStorage.removeItem('lastLoginTime');
    return false;
  }
};

// Admin authentication check
const isAdminAuthenticated = () => {
  const adminToken = localStorage.getItem('adminToken');
  if (!adminToken) return false;

  try {
    // Validate admin token format and expiry
    const base64Url = adminToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const tokenPayload = JSON.parse(window.atob(base64));

    // Check if token is expired (if exp field exists)
    if (tokenPayload.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      const isValid = tokenPayload.exp > currentTime;

      // If token is expired, clear storage
      if (!isValid) {
        localStorage.removeItem('adminToken');
      }

      return isValid;
    }

    return true; // If no expiry field, consider valid
  } catch (error) {
    // Invalid token format, clear storage
    localStorage.removeItem('adminToken');
    return false;
  }
};

// Common page wrapper component with smooth scroll
const PageWrapper = ({ children }) => (
  <div className="page-wrapper" style={{
    height: '100vh',
    overflowY: 'auto',
    scrollBehavior: 'smooth',
    msOverflowStyle: 'none', /* IE and Edge */
    scrollbarWidth: 'none'  /* Firefox */
    /* Chrome, Safari, Opera scrollbar is handled via CSS class */
  }}>
    {children}
  </div>
);

// Session timeout management
const useSessionTimeout = () => {
  const navigate = useNavigate();
  const timeoutRef = React.useRef(null);
  const warningRef = React.useRef(null);

  const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  const WARNING_DURATION = 5 * 60 * 1000; // 5 minutes before timeout

  const logout = React.useCallback(() => {
    // Clear all authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('permissions');
    localStorage.removeItem('roleType');
    localStorage.removeItem('isSubUser');
    localStorage.removeItem('allowedBranchIds');
    localStorage.removeItem('hasAllBranchAccess');
    localStorage.removeItem('lastLoginTime');
    localStorage.removeItem('showWelcomeToast');
    localStorage.removeItem('adminToken');
    sessionStorage.clear();

    // Navigate to login
    navigate('/login?session_expired=true', { replace: true });
  }, [navigate]);

  const resetTimeout = React.useCallback(() => {
    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    // Only set timeout if user is authenticated
    const token = localStorage.getItem('token');
    const adminToken = localStorage.getItem('adminToken');

    if (token || adminToken) {
      // Set warning timeout
      warningRef.current = setTimeout(() => {
        console.warn('Session will expire in 5 minutes');
      }, TIMEOUT_DURATION - WARNING_DURATION);

      // Set logout timeout
      timeoutRef.current = setTimeout(() => {
        logout();
      }, TIMEOUT_DURATION);
    }
  }, [logout, TIMEOUT_DURATION, WARNING_DURATION]);

  React.useEffect(() => {
    // Events that reset the timeout
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const resetTimeoutHandler = () => resetTimeout();

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimeoutHandler, true);
    });

    // Initial timeout setup
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimeoutHandler, true);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [resetTimeout]);
};

// Global Authentication Guard Component
const AuthGuard = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Add session timeout management
  useSessionTimeout();

  React.useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const adminToken = localStorage.getItem('adminToken');
      const currentPath = location.pathname;

      // Public routes that don't require authentication
      const publicRoutes = ['/login', '/register', '/admin-login'];

      // If on a public route, allow access
      if (publicRoutes.includes(currentPath)) {
        return;
      }

      // Protected user routes
      const userRoutes = ['/analytics', '/dashboard', '/api-documentation', '/rfid-integration', '/label-stock', '/invoice-stock', '/rfid-label', '/rfid-devices', '/rfid-tags', '/tag-usage', '/stock-verification', '/stock-transfer', '/upload-rfid', '/rfid-transactions', '/rfid-app-download', '/third-party-integration', '/download-api-doc', '/download-resources', '/single-use-tags', '/profile-menu', '/profile'];

      // Admin routes
      const adminRoutes = ['/admin-dashboard'];

      // Check if trying to access user routes
      if (userRoutes.includes(currentPath)) {
        if (!isAuthenticated()) {
          navigate('/login', { replace: true });
          return;
        }
      }

      // Check if trying to access admin routes
      if (adminRoutes.includes(currentPath)) {
        if (!isAdminAuthenticated()) {
          navigate('/admin-login', { replace: true });
          return;
        }
      }

      // Handle root path
      if (currentPath === '/') {
        if (isAuthenticated()) {
          navigate('/analytics', { replace: true });
        } else if (isAdminAuthenticated()) {
          navigate('/admin-dashboard', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }
    };

    // Check authentication on every route change
    checkAuth();
  }, [location.pathname, navigate]);

  return children;
};

// Routes wrapper component with authentication protection
const RoutesWrapper = () => {
  useAuthProtection();

  return (
    <AuthGuard>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Admin dashboard (protected) */}
        <Route
          path="/admin-dashboard"
          element={
            <AuthGuard>
              <AdminDashboard />
            </AuthGuard>
          }
        />

        {/* User protected routes (all require AuthGuard) */}
        <Route element={<Layout />}>
          <Route path="/analytics" element={<AuthGuard><PageWrapper><DashboardAnalytics /></PageWrapper></AuthGuard>} />
          <Route path="/dashboard" element={<AuthGuard><PageWrapper><Dashboard /></PageWrapper></AuthGuard>} />
          <Route path="/api-documentation" element={<AuthGuard><PageWrapper><APIDocumentation /></PageWrapper></AuthGuard>} />
          <Route
            path="/rfid-integration"
            element={
              <AuthGuard>
                <PageWrapper>
                  <RFIDIntegration />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/label-stock"
            element={
              <AuthGuard>
                <PageWrapper>
                  <LabelStockList />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/product-details"
            element={
              <AuthGuard>
                <PageWrapper>
                  <ProductDetailsPage />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/labeling"
            element={
              <AuthGuard>
                <PageWrapper>
                  <Labeling />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/stock"
            element={
              <AuthGuard>
                <PageWrapper>
                  <AddStock />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/quotation"
            element={
              <AuthGuard>
                <PageWrapper>
                  <QuotationNew />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/quotation-rfid-tray"
            element={
              <AuthGuard>
                <PageWrapper>
                  <QuotationWithRFIDTray />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/quotation_list"
            element={
              <AuthGuard>
                <PageWrapper>
                  <QuotationList />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/create-invoice"
            element={
              <AuthGuard>
                <PageWrapper>
                  <CreateInvoice />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/invoice-stock"
            element={
              <AuthGuard>
                <PageWrapper>
                  <InvoiceStock />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/order-list"
            element={
              <AuthGuard>
                <PageWrapper>
                  <OrderList />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/reports"
            element={
              <AuthGuard>
                <PageWrapper>
                  <Reports />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/stock-report-summary"
            element={
              <AuthGuard>
                <PageWrapper>
                  <StockReportSummary />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/rfid-label"
            element={
              <AuthGuard>
                <PageWrapper>
                  <RFIDLabel />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/single-use-tags"
            element={
              <AuthGuard>
                <PageWrapper>
                  <SingleUseTags />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/profile-menu"
            element={
              <AuthGuard>
                <PageWrapper>
                  <ProfileMenuPage />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/profile"
            element={
              <AuthGuard>
                <PageWrapper>
                  <UserProfile />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/create-label"
            element={
              <AuthGuard>
                <PageWrapper>
                  <CreateLabel />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/sample-out"
            element={
              <AuthGuard>
                <PageWrapper>
                  <SampleOut />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/sample-out-list"
            element={
              <AuthGuard>
                <PageWrapper>
                  <SampleOutList />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/sample-in"
            element={
              <AuthGuard>
                <PageWrapper>
                  <SampleIn />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/rfid-devices"
            element={
              <AuthGuard>
                <PageWrapper>
                  <RFIDDeviceDetails />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/rfid-tags"
            element={
              <AuthGuard>
                <PageWrapper>
                  <RFIDTags />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/tag-usage"
            element={
              <AuthGuard>
                <PageWrapper>
                  <TagUsage />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/stock-verification"
            element={
              <AuthGuard>
                <PageWrapper>
                  <StockVerification />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/stock-transfer"
            element={
              <AuthGuard>
                <PageWrapper>
                  <StockTransfer />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/session-details/:sessionId"
            element={
              <AuthGuard>
                <PageWrapper>
                  <SessionDetails />
                </PageWrapper>
              </AuthGuard>
            }
          />

          <Route
            path="/upload-rfid"
            element={
              <AuthGuard>
                <PageWrapper>
                  <UploadRFID />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/rfid-transactions"
            element={
              <AuthGuard>
                <PageWrapper>
                  <RFIDTransactions />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/rfid-app-download"
            element={
              <AuthGuard>
                <PageWrapper>
                  <RFIDAppDownload />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/download-api-doc"
            element={
              <AuthGuard>
                <PageWrapper>
                  <DownloadApiDoc />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/download-resources"
            element={
              <AuthGuard>
                <PageWrapper>
                  <DownloadResources />
                </PageWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/third-party-integration"
            element={
              <AuthGuard>
                <PageWrapper>
                  <ThirdPartySoftwareIntegration />
                </PageWrapper>
              </AuthGuard>
            }
          />
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin-rfid-tags-report"
          element={
            <AuthGuard>
              <PageWrapper>
                <AdminRfidTagsReport />
              </PageWrapper>
            </AuthGuard>
          }
        />

        {/* Not found route */}
        <Route path="*" element={<NotFound />} />
        <Route path="/" element={<Navigate to="/analytics" replace />} />
      </Routes>
    </AuthGuard>
  );
};

function App() {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Listen for custom event from Login.js
    const handler = () => setShowWelcome(true);
    window.addEventListener('rfid-welcome', handler);
    return () => window.removeEventListener('rfid-welcome', handler);
  }, []);

  return (
    <Provider store={store}>
      <TranslationProvider>
        <NotificationProvider>
          <LoadingProvider>
            <AuthInitializer>
              <Router>
            {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
            <div style={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
            }}>
              <style>{`
                /* Global Roboto Font Application */
                * {
                  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                }
                
                .page-wrapper {
                  height: 100vh;
                  overflow-y: auto;
                  scroll-behavior: smooth;
                  -ms-overflow-style: none;  /* IE and Edge */
                  scrollbar-width: none;  /* Firefox */
                }
                .page-wrapper::-webkit-scrollbar {
                  display: none; /* Chrome, Safari, Opera */
                }
                /* Hide vertical scrollbar globally */
                html, body {
                  scrollbar-width: none; /* Firefox */
                  -ms-overflow-style: none; /* IE and Edge */
                }
                html::-webkit-scrollbar, body::-webkit-scrollbar {
                  display: none;
                }
                .content-fade-in {
                  animation: fadeIn 0.5s ease-in-out;
                }
                
                @keyframes fadeIn {
                  from {
                    opacity: 0;
                    transform: translateY(10px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                
                .smooth-scroll {
                  scroll-behavior: smooth;
                  transition: all 0.3s ease;
                }
                
                /* Add smooth transition for route changes */
                .route-transition {
                  animation: routeChange 0.3s ease-out;
                }
                
                @keyframes routeChange {
                  from {
                    opacity: 0;
                    transform: translateY(20px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>

              <RoutesWrapper />
            </div>
            <ToastContainer
              position="bottom-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
              className="smooth-scroll"
            />
              </Router>
            </AuthInitializer>
          </LoadingProvider>
        </NotificationProvider>
      </TranslationProvider>
    </Provider>
  );
}

export default App; 