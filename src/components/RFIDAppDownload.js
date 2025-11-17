import React, { useState, useEffect } from 'react';
import { FaDownload, FaAndroid, FaClock, FaCheckCircle, FaInfoCircle, FaExternalLinkAlt, FaMobile, FaWifi, FaCheck } from 'react-icons/fa';
import apkService from '../services/apkService';

const RFIDAppDownload = () => {
  const [downloading, setDownloading] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [appVersions, setAppVersions] = useState([]);
  const [systemRequirements, setSystemRequirements] = useState([]);
  const [appInfo, setAppInfo] = useState({});
  const [userInfo, setUserInfo] = useState({});

  useEffect(() => {
    // Load only latest version from APK service
    const latestVersion = apkService.getLatestVersion();
    setAppVersions(latestVersion ? [latestVersion] : []);
    setSystemRequirements(apkService.getSystemRequirements());
    setAppInfo(apkService.getAppInfo());

    // Get user info from localStorage
    try {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        setUserInfo(JSON.parse(stored));
      }
    } catch (err) {
      setUserInfo({});
    }
  }, []);

  const handleDownload = async (version) => {
    setDownloading(version.id);
    setDownloadProgress({ [version.id]: { phase: 'starting', progress: 0 } });
    
    try {
      // Use APK service to download
      const result = await apkService.downloadAPK(version, (progress) => {
        setDownloadProgress(prev => ({
          ...prev,
          [version.id]: progress
        }));
      });

      if (result.success) {
        console.log(`Download started: ${result.fileName} (${result.size})`);
        // Show success notification
        setTimeout(() => {
          setDownloadProgress(prev => ({
            ...prev,
            [version.id]: { phase: 'completed', progress: 100 }
          }));
        }, 1000);
      } else {
        console.error('Download failed:', result.message);
      }
      
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setTimeout(() => {
        setDownloading(null);
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[version.id];
          return newProgress;
        });
      }, 3000);
    }
  };

  return (
    <div className="rfid-app-download-container">
      {/* Background Animation */}
      <div className="rfid-bg-animation">
        <div className="rfid-floating-icon"><FaMobile /></div>
        <div className="rfid-floating-icon"><FaAndroid /></div>
        <div className="rfid-floating-icon"><FaDownload /></div>
        <div className="rfid-floating-icon"><FaWifi /></div>
        <div className="rfid-floating-icon"><FaCheckCircle /></div>
        <div className="rfid-floating-icon"><FaMobile /></div>
      </div>
      <style jsx>{`
        .rfid-app-download-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #f8fafc;
          min-height: calc(100vh - 112px);
          position: relative;
          overflow: hidden;
        }

        .rfid-bg-animation {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
          opacity: 0.1;
          pointer-events: none;
        }

        .rfid-floating-icon {
          position: absolute;
          font-size: 24px;
          color: #3b82f6;
          animation: rfid-float 6s ease-in-out infinite;
          opacity: 0.6;
        }

        .rfid-floating-icon:nth-child(1) {
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .rfid-floating-icon:nth-child(2) {
          top: 20%;
          right: 15%;
          animation-delay: 1s;
          font-size: 30px;
        }

        .rfid-floating-icon:nth-child(3) {
          top: 60%;
          left: 5%;
          animation-delay: 2s;
          font-size: 20px;
        }

        .rfid-floating-icon:nth-child(4) {
          top: 70%;
          right: 10%;
          animation-delay: 3s;
          font-size: 26px;
        }

        .rfid-floating-icon:nth-child(5) {
          top: 40%;
          left: 80%;
          animation-delay: 4s;
          font-size: 22px;
        }

        .rfid-floating-icon:nth-child(6) {
          top: 80%;
          left: 50%;
          animation-delay: 5s;
          font-size: 28px;
        }

        @keyframes rfid-float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.6;
          }
          25% {
            transform: translateY(-20px) rotate(5deg);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-10px) rotate(-3deg);
            opacity: 0.4;
          }
          75% {
            transform: translateY(-15px) rotate(3deg);
            opacity: 0.7;
          }
        }

        .rfid-download-header {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          color: #1e293b;
          margin-bottom: 32px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
        }

        .rfid-download-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6);
          opacity: 0.6;
        }

        .rfid-download-header h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 12px 0;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #1e293b 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .rfid-download-header p {
          font-size: 16px;
          color: #64748b;
          margin: 0;
          line-height: 1.6;
          font-weight: 500;
        }

        .rfid-download-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .rfid-stat-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 12px;
          padding: 24px 16px;
          text-align: center;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(226, 232, 240, 0.8);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .rfid-stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #06b6d4, #10b981);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .rfid-stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
        }

        .rfid-stat-card:hover::before {
          opacity: 1;
        }

        .rfid-stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-size: 20px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .rfid-stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 6px;
          letter-spacing: -0.5px;
        }

        .rfid-stat-label {
          color: #64748b;
          font-size: 14px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .rfid-versions-section {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
        }

        .rfid-versions-title {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 6px;
        }

        .rfid-versions-subtitle {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .rfid-version-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .rfid-version-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.15);
        }

        .rfid-version-card.latest {
          border-color: #10b981;
          background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
        }

        .rfid-version-card.latest::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #10b981, #059669);
        }

        .rfid-version-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .rfid-version-info h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 6px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rfid-latest-badge {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .rfid-version-meta {
          display: flex;
          gap: 16px;
          color: #6b7280;
          font-size: 13px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .rfid-version-meta span {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .rfid-version-features {
          margin-bottom: 16px;
        }

        .rfid-version-features h4 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .rfid-features-list {
          display: grid;
          gap: 6px;
        }

        .rfid-feature-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #4b5563;
          font-size: 13px;
        }

        .rfid-download-btn {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          min-width: 140px;
          justify-content: center;
        }

        .rfid-download-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
        }

        .rfid-download-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .rfid-download-btn.latest {
          background: linear-gradient(135deg, #10b981, #059669);
        }

        .rfid-download-btn.latest:hover:not(:disabled) {
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
        }

        .rfid-spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .rfid-requirements {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
        }

        .rfid-requirements h3 {
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .rfid-requirements-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .rfid-requirement-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #4b5563;
          font-size: 13px;
        }

        @media (max-width: 768px) {
          .rfid-app-download-container {
            padding: 16px;
          }

          .rfid-download-header {
            padding: 20px 16px;
          }

          .rfid-download-header h1 {
            font-size: 20px;
          }

          .rfid-download-header p {
            font-size: 13px;
          }

          .rfid-versions-section {
            padding: 16px;
          }

          .rfid-version-card {
            padding: 16px;
          }

          .rfid-version-header {
            flex-direction: column;
            gap: 12px;
          }

          .rfid-version-meta {
            flex-direction: column;
            gap: 6px;
          }
        }
      `}</style>

      {/* Header Section */}
      <div className="rfid-download-header">
        <h1>RFID Mobile App</h1>
        <p>Download the latest version of our RFID mobile application for seamless inventory management</p>
      </div>

      {/* Stats Section */}
      <div className="rfid-download-stats">
        <div className="rfid-stat-card">
          <div className="rfid-stat-icon" style={{ 
            background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)', 
            color: '#0284c7' 
          }}>
            <FaAndroid />
          </div>
          <div className="rfid-stat-value">Android</div>
          <div className="rfid-stat-label">Platform</div>
        </div>
        <div className="rfid-stat-card">
          <div className="rfid-stat-icon" style={{ 
            background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', 
            color: '#059669' 
          }}>
            <FaCheckCircle />
          </div>
          <div className="rfid-stat-value">v{appVersions[0]?.version}</div>
          <div className="rfid-stat-label">Latest Version</div>
        </div>
        <div className="rfid-stat-card">
          <div className="rfid-stat-icon" style={{ 
            background: 'linear-gradient(135deg, #fef7ed 0%, #fffbeb 100%)', 
            color: '#ea580c' 
          }}>
            <FaDownload />
          </div>
          <div className="rfid-stat-value">{appVersions[0]?.size}</div>
          <div className="rfid-stat-label">Download Size</div>
        </div>
      </div>

      {/* Latest Version Section */}
      <div className="rfid-versions-section">
        <h2 className="rfid-versions-title">Latest Version</h2>
        <p className="rfid-versions-subtitle">Download the most recent stable release of our RFID mobile app</p>

        {appVersions.map((version) => (
          <div key={version.id} className={`rfid-version-card ${version.isLatest ? 'latest' : ''}`}>
            <div className="rfid-version-header">
              <div className="rfid-version-info">
                <h3>
                  Version {version.version}
                  {version.isLatest && <span className="rfid-latest-badge">Latest</span>}
                </h3>
                <div className="rfid-version-meta">
                  <span>
                    <FaClock />
                    Released {new Date(version.releaseDate).toLocaleDateString()}
                  </span>
                  <span>
                    <FaAndroid />
                    {version.size}
                  </span>
                  <span>
                    Build {version.buildNumber}
                  </span>
                  <span>
                    Android {version.minAndroidVersion}+
                  </span>
                </div>
              </div>
              <button
                className={`rfid-download-btn ${version.isLatest ? 'latest' : ''}`}
                onClick={() => handleDownload(version)}
                disabled={downloading === version.id}
              >
                {downloading === version.id ? (
                  downloadProgress[version.id]?.phase === 'completed' ? (
                    <>
                      <FaCheck />
                      Downloaded
                    </>
                  ) : (
                    <>
                      <FaDownload className="rfid-spinning" />
                      {downloadProgress[version.id]?.phase === 'starting' ? 'Starting...' : 'Downloading...'}
                    </>
                  )
                ) : (
                  <>
                    <FaDownload />
                    Download APK
                  </>
                )}
              </button>
            </div>

            <div className="rfid-version-features">
              <h4>What's New:</h4>
              <div className="rfid-features-list">
                {version.features.map((feature, index) => (
                  <div key={index} className="rfid-feature-item">
                    <FaCheckCircle style={{ color: '#10b981', fontSize: '12px' }} />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* System Requirements */}
        <div className="rfid-requirements">
          <h3>
            <FaInfoCircle style={{ color: '#3b82f6' }} />
            System Requirements
          </h3>
          <div className="rfid-requirements-list">
            {systemRequirements.map((requirement, index) => (
              <div key={index} className="rfid-requirement-item">
                <FaCheckCircle style={{ color: '#10b981' }} />
                {requirement}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RFIDAppDownload; 