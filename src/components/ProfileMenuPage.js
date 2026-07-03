import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import {
  RiTestTubeFill,
  RiBookReadFill,
  RiFlashlightFill,
  RiFileDownloadFill,
  RiFolderDownloadFill,
  RiPriceTag3Fill,
  RiFingerprintFill,
  RiCamera2Fill,
  RiGlobalLine,
  RiFolderOpenLine,
  RiLockPasswordLine,
} from 'react-icons/ri';
import { getApiMode } from '../services/apiBaseConfig';

// Profile menu shows only API & resources; sidebar has the rest
const buildMenuItems = () => {
  const base = [
  { path: '/change-password', icon: RiLockPasswordLine, label: 'Change password', color: '#6366f1', description: 'Update your login password using current password verification. Parent and sub-user accounts.' },
  { path: '/download-folder-settings', icon: RiFolderOpenLine, label: 'Download folders (exports & PRN)', color: '#0f766e', description: 'Choose where labelled stock exports (Excel/PDF) and PRN label files are saved. EXE writes to the folder you pick; browser uses normal downloads.' },
  { path: '/dashboard', icon: RiTestTubeFill, label: 'API Testing (Postman)', color: '#ff6b35', description: 'Test all integrated APIs with request payload and response. Developer API playground.' },
  { path: '/api-documentation', icon: RiBookReadFill, label: 'API Integration Guide', color: '#9333ea', description: 'Documentation and examples for third-party integration.' },
  { path: '/rfid-integration', icon: RiFlashlightFill, label: 'Quick Integration', color: '#8b5cf6', description: 'Get started with RFID API in minutes.' },
  { path: '/download-api-doc', icon: RiFileDownloadFill, label: 'Download API Doc', color: '#0ea5e9', description: 'Download API documentation and reference files.' },
  { path: '/download-resources', icon: RiFolderDownloadFill, label: 'Download Resources', color: '#14b8a6', description: 'Templates, guides, and other resources.' },
  { path: '/single-use-tags', icon: RiPriceTag3Fill, label: 'Single Use Tags', color: '#a855f7', description: 'Manage and track single-use RFID tags.' },
  { path: '/fingerprint-register', icon: RiFingerprintFill, label: 'Fingerprint Login Settings', color: '#4f46e5', description: 'Morpho RD capture, PIN, and fingerprint login management.' },
  { path: '/face-register', icon: RiCamera2Fill, label: 'Face Login Settings', color: '#7c3aed', description: 'Register and manage Face ID for camera-based sign-in.' },
  ];
  if (getApiMode() === 'offline') {
    return [
      {
        path: '/offline-api-settings',
        icon: RiGlobalLine,
        label: 'Offline API base URLs',
        color: '#0d9488',
        description: 'Set Soni (ProductMaster) and RRGOLD base URLs for this PC. Defaults: localhost:8080 and 8081.',
      },
      ...base,
    ];
  }
  return base;
};

const Card = ({ item, index }) => {
  const { icon: Icon, label, color, description, path } = item;
  
  return (
    <Link
      to={path}
      className="profile-card"
      style={{
        textDecoration: 'none',
        animationDelay: `${index * 100}ms`
      }}
    >
      <div 
        className="card-content"
        style={{
          background: `linear-gradient(135deg, ${color}08 0%, ${color}14 100%)`,
          borderRadius: 20,
          padding: '28px 24px',
          height: '100%',
          border: `1px solid ${color}30`,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background Decoration */}
        <div 
          style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
            zIndex: 0,
            transition: 'all 0.5s ease',
            opacity: 0.6
          }}
          className="card-bg-decoration"
        />

        <div style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: `${color}10`,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          fontSize: 26,
          position: 'relative',
          zIndex: 1,
          border: `1px solid ${color}20`, // Subtle border around icon
          transition: 'transform 0.3s ease, background 0.3s ease'
        }} className="card-icon">
          <Icon />
        </div>

        <h3 style={{ 
          fontSize: 18, 
          fontWeight: 700, 
          color: '#1e293b', 
          marginBottom: 10,
          position: 'relative', 
          zIndex: 1,
          letterSpacing: '-0.02em'
        }}>
          {label}
        </h3>

        <p style={{ 
          fontSize: 14, 
          color: '#64748b', 
          lineHeight: 1.5, 
          marginBottom: 20,
          flex: 1,
          position: 'relative', 
          zIndex: 1,
          fontWeight: 400
        }}>
          {description}
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          color: color,
          marginTop: 'auto',
          position: 'relative', 
          zIndex: 1,
          padding: '6px 12px',
          background: `${color}10`,
          borderRadius: 99,
          transition: 'all 0.2s ease'
        }} className="explore-btn">
          Explore <FaArrowRight size={12} style={{ transition: 'transform 0.2s' }} className="arrow-icon"/>
        </div>
      </div>
    </Link>
  );
};

const ProfileMenuPage = () => {
  const menuItems = buildMenuItems();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: '"Plus Jakarta Sans", Inter, Poppins, sans-serif',
      padding: '20px 24px',
      boxSizing: 'border-box'
    }} className="profile-page-padding">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .profile-card {
            opacity: 0;
            animation: fadeInUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            display: block;
            height: 100%;
          }

          .card-content:hover {
            transform: translateY(-8px);
            box-shadow: 0 25px 30px -5px rgba(0, 0, 0, 0.08), 0 15px 15px -5px rgba(0, 0, 0, 0.04) !important;
            border-color: var(--hover-border-color) !important;
            background: linear-gradient(135deg, color-mix(in srgb, var(--hover-color) 10%, #ffffff) 0%, color-mix(in srgb, var(--hover-color) 20%, #ffffff) 100%) !important;
          }

          .card-content:hover .card-bg-decoration {
            transform: scale(1.6);
            opacity: 1;
          }

          .card-content:hover .card-icon {
            transform: scale(1.1) rotate(5deg);
            background: var(--hover-color);
            color: #fff; /* Icon turns white on hover */
            border-color: transparent;
            box-shadow: 0 10px 15px -3px var(--hover-shadow-color);
          }

          .card-content:hover .explore-btn {
            background: var(--hover-color);
            color: #fff;
            padding-right: 20px; /* Slight expansion */
          }

          .card-content:hover .arrow-icon {
            transform: translateX(4px);
          }

          @media (max-width: 1400px) {
            .grid-container {
              grid-template-columns: repeat(3, 1fr) !important;
            }
          }

          @media (max-width: 1024px) {
            .grid-container {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 16px !important;
            }
          }

          @media (max-width: 640px) {
            .grid-container {
              grid-template-columns: 1fr !important;
              gap: 14px !important;
            }
            .profile-page-padding {
               padding: 14px !important;
            }
          }
        `}
      </style>

      <div style={{ 
        maxWidth: 1600, 
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        <div style={{ 
          marginBottom: 24, 
          animation: 'fadeInUp 0.8s ease-out',
          textAlign: 'left'
        }}>
          <h1 style={{ 
            fontSize: 'clamp(24px, 2.2vw, 32px)',
            fontWeight: 800, 
            color: '#0f172a', 
            marginBottom: 6,
            letterSpacing: '-0.03em',
            background: 'linear-gradient(to right, #0f172a, #334155)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Developer Hub & Resources
          </h1>
        </div>

        <div className="grid-container" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)', // Changed to 4 columns for a more compact look
          gap: 18,
          paddingBottom: 20
        }}>
          {menuItems.map((item, index) => (
            <div 
              key={item.path} 
              style={{ 
                '--hover-color': item.color,
                '--hover-border-color': `${item.color}60`, // Semi-transparent border on hover
                '--hover-shadow-color': `${item.color}40`
              }}
            >
              <Card item={item} index={index} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileMenuPage;
