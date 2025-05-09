import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import RFIDIntegration from './components/RFIDIntegration';
import Inventory from './components/Inventory';
import Footer from './components/Footer';
import UploadRFID from './components/UploadRFID';
import RFIDTransactions from './components/RFIDTransactions';
import NotFound from './components/NotFound';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

// Protected route authentication check
const isAuthenticated = () => !!localStorage.getItem('token');

// Common page wrapper component with smooth scroll
const PageWrapper = ({ children }) => (
  <div className="page-wrapper" style={{
    height: '100vh',
    overflowY: 'auto',
    scrollBehavior: 'smooth',
    msOverflowStyle: 'none', /* IE and Edge */
    scrollbarWidth: 'none',  /* Firefox */
    '&::-webkit-scrollbar': {
      display: 'none' /* Chrome, Safari, Opera */
    }
  }}>
    {children}
  </div>
);

function App() {
  return (
    <Router>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
      }}>
        <style>{`
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

        <Routes>
          <Route path="/login" element={
            <div className="page-wrapper">
              <Login />
              <Footer />
            </div>
          } />
          <Route path="/register" element={
            <div className="page-wrapper">
              <Register />
              <Footer />
            </div>
          } />
          <Route path="/dashboard" element={
            isAuthenticated() ? (
              <div className="page-wrapper">
                <div className="route-transition content-fade-in">
                  <Dashboard />
                </div>
              </div>
            ) : <Navigate to="/login" />
          } />
          <Route path="/rfid-integration" element={
            isAuthenticated() ? (
              <div className="page-wrapper">
                <div className="route-transition content-fade-in">
                  <RFIDIntegration />
                </div>
              </div>
            ) : <Navigate to="/login" />
          } />
          <Route path="/inventory" element={
            isAuthenticated() ? (
              <div className="page-wrapper">
                <div className="route-transition content-fade-in">
                  <Inventory />
                </div>
              </div>
            ) : <Navigate to="/login" />
          } />
          <Route path="/upload-rfid" element={
            isAuthenticated() ? (
              <div className="page-wrapper">
                <div className="route-transition content-fade-in">
                  <UploadRFID />
                </div>
              </div>
            ) : <Navigate to="/login" />
          } />
          <Route path="/rfid-transactions" element={
            isAuthenticated() ? (
              <div className="page-wrapper">
                <div className="route-transition content-fade-in">
                  <RFIDTransactions />
                </div>
              </div>
            ) : <Navigate to="/login" />
          } />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
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
  );
}

export default App; 