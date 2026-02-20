import React, { useState, useEffect } from 'react';
import { 
  FaDownload, 
  FaPrint, 
  FaMobileAlt, 
  FaDatabase, 
  FaCloudUploadAlt,
  FaSpinner,
  FaFileDownload
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import downloadResourcesData from '../data/downloadResources.json';
import BackToProfileMenu from './common/BackToProfileMenu';

// Icon mapping
const iconMap = {
  FaPrint: FaPrint,
  FaMobileAlt: FaMobileAlt,
  FaDatabase: FaDatabase,
  FaCloudUploadAlt: FaCloudUploadAlt,
  FaDownload: FaDownload
};

const ResourceCard = ({ resource, onDownload, downloading }) => {
  const Icon = iconMap[resource.icon] || FaFileDownload;
  const isDownloading = downloading === resource.id;

  return (
    <div 
      onClick={() => onDownload(resource)}
      style={{
        background: '#ffffff',
        borderRadius: 16,
        padding: '20px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        cursor: 'pointer',
        height: '100%',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}
      className="resource-card"
    >
      <style>
        {`
          .resource-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1) !important;
            border-color: ${resource.color}60 !important;
          }
          .resource-card:hover .icon-container {
            transform: scale(1.1);
            background: ${resource.color}20 !important;
          }
          .resource-card:hover .download-btn {
            background: ${resource.color} !important;
            color: #fff !important;
          }
        `}
      </style>

      <div 
        className="icon-container"
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${resource.color}10`,
          color: resource.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          fontSize: 20,
          transition: 'all 0.3s ease',
          border: `1px solid ${resource.color}20`
        }}
      >
        <Icon />
      </div>

      <h3 style={{
        fontSize: 16,
        fontWeight: 700,
        color: '#1e293b',
        marginBottom: 8,
        lineHeight: 1.3
      }}>
        {resource.title}
      </h3>

      <p style={{
        fontSize: 13,
        color: '#64748b',
        lineHeight: 1.5,
        marginBottom: 20,
        flex: 1
      }}>
        {resource.description}
      </p>

      <div style={{
        marginTop: 'auto',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
         <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#94a3b8',
            background: '#f1f5f9',
            padding: '3px 8px',
            borderRadius: 6
         }}>
           v1.0.0
         </span>

        <button
          className="download-btn"
          style={{
            background: isDownloading ? '#e2e8f0' : `${resource.color}10`,
            color: isDownloading ? '#94a3b8' : resource.color,
            border: 'none',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: isDownloading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s ease'
          }}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <FaSpinner className="fa-spin" /> Downloading...
            </>
          ) : (
            <>
              Download <FaDownload size={10} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const DownloadResources = () => {
  const [sparkleResources, setSparkleResources] = useState([]);
  const [printerDriverResources, setPrinterDriverResources] = useState([]);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    setSparkleResources(downloadResourcesData.sparkleResources || []);
    setPrinterDriverResources(downloadResourcesData.printerDriverResources || []);
  }, []);

  const convertDriveUrl = (shareUrl) => {
    if (!shareUrl) return null;
    if (shareUrl.includes('uc?export=download')) return shareUrl;
    const fileIdMatch = shareUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
    if (shareUrl.length < 50 && !shareUrl.includes('http')) return `https://drive.google.com/uc?export=download&id=${shareUrl}`;
    return shareUrl;
  };

  const handleDownload = async (resource) => {
    if (!resource.driveLink || resource.driveLink.trim() === '') {
      toast.error('Download link not available.');
      return;
    }

    setDownloading(resource.id);

    try {
      const downloadUrl = convertDriveUrl(resource.driveLink);
      
      if (!downloadUrl) {
        toast.error('Invalid download link');
        setDownloading(null);
        return;
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = '';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${resource.title} download started!`);
      
      setTimeout(() => {
        setDownloading(null);
      }, 1000);

    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed.');
      setDownloading(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: '"Plus Jakarta Sans", Inter, Poppins, sans-serif',
      padding: '32px 40px',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <BackToProfileMenu />
        </div>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ 
            fontSize: 28, 
            fontWeight: 800, 
            color: '#0f172a', 
            marginBottom: 8,
            letterSpacing: '-0.03em',
            background: 'linear-gradient(to right, #0f172a, #334155)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Download Center
          </h1>
          <p style={{ 
            fontSize: 15, 
            color: '#64748b', 
            maxWidth: 600,
            lineHeight: 1.5,
            fontWeight: 500
          }}>
            Essential software, drivers, and tools for your RFID ecosystem.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {/* Sparkle Resources Section */}
          <section>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              marginBottom: 16,
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 12
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#334155', margin: 0 }}>
                Sparkle Software Suite
              </h2>
              <span style={{ 
                background: '#e2e8f0', 
                color: '#64748b', 
                fontSize: 11, 
                fontWeight: 600, 
                padding: '2px 8px', 
                borderRadius: 12 
              }}>
                {sparkleResources.length} Items
              </span>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20
            }}>
              {sparkleResources.map((resource) => (
                <ResourceCard 
                  key={resource.id} 
                  resource={resource} 
                  onDownload={handleDownload}
                  downloading={downloading}
                />
              ))}
            </div>
          </section>

          {/* Printer Driver Resources Section */}
          <section>
             <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              marginBottom: 16,
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 12
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#334155', margin: 0 }}>
                Printer Drivers & Tools
              </h2>
              <span style={{ 
                background: '#e2e8f0', 
                color: '#64748b', 
                fontSize: 11, 
                fontWeight: 600, 
                padding: '2px 8px', 
                borderRadius: 12 
              }}>
                {printerDriverResources.length} Items
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20
            }}>
              {printerDriverResources.map((resource) => (
                <ResourceCard 
                  key={resource.id} 
                  resource={resource} 
                  onDownload={handleDownload}
                  downloading={downloading}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DownloadResources;
