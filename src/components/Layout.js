import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

const Layout = () => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#ffffff',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      <Header userInfo={userInfo} />
      <main style={{ 
        paddingTop: '120px', // Increased spacing between header and content
        minHeight: 'calc(100vh - 120px)',
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
        overflowX: 'hidden',
        background: '#ffffff'
      }}>
        <Outlet />
      </main>
      <style jsx>{`
        @media (max-width: 768px) {
          main {
            padding-top: 112px !important;
            min-height: calc(100vh - 112px) !important;
          }
        }
        @media (max-width: 640px) {
          main {
            padding-top: 108px !important;
            min-height: calc(100vh - 108px) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout; 