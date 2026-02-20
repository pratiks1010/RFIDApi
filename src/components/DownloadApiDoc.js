import React from 'react';
import { FaFilePdf, FaDownload, FaUserCircle, FaClock, FaCheckCircle } from 'react-icons/fa';
import BackToProfileMenu from './common/BackToProfileMenu';
import { apiDocs } from '../data/apiDocs';

const DocCard = ({ doc }) => {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
        position: 'relative',
        border: '1px solid #f0f0f0'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      }}
    >
      {/* Top Section: Title & Subtitle */}
      <div>
        <h3 style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#1f2937',
          margin: '0 0 4px 0',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {doc.title}
        </h3>
        <p style={{
          fontSize: 12,
          color: '#9ca3af',
          margin: 0
        }}>
          {doc.subtitle}
        </p>
      </div>

      {/* Middle Section: Icon */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px 0'
      }}>
        <div style={{
          width: 80,
          height: 80,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: `${doc.iconColor}15`, // Light bg based on icon color
          borderRadius: 20,
        }}>
           {/* Using a generic file icon or folder icon similar to the image */}
           <FaFilePdf size={42} color={doc.iconColor} />
        </div>
      </div>

       {/* Status Icons (Mocking the checkmarks/clocks in image) */}
       <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <div style={{ padding: 4, borderRadius: '50%', background: '#f3f4f6', color: '#9ca3af' }}>
            <FaClock size={12} />
          </div>
          <div style={{ padding: 4, borderRadius: '50%', background: '#dcfce7', color: '#16a34a' }}>
            <FaCheckCircle size={12} />
          </div>
           <div style={{ padding: 4, borderRadius: '50%', background: '#f3f4f6', color: '#9ca3af' }}>
             <span style={{ fontSize: 10, fontWeight: 'bold' }}>...</span>
           </div>
       </div>


      {/* Bottom Section: Avatar, Date & Action */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'auto',
        paddingTop: 16,
        borderTop: '1px solid #f3f4f6'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
           {/* Avatar */}
          <div style={{
             width: 28,
             height: 28,
             borderRadius: '50%',
             overflow: 'hidden',
             background: '#e5e7eb',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center'
          }}>
             <FaUserCircle size={28} color="#9ca3af" />
          </div>
           <div style={{ display: 'flex', flexDirection: 'column' }}>
             <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{doc.author}</span>
             <span style={{ fontSize: 10, color: '#9ca3af' }}>{doc.date}</span>
           </div>
        </div>

        <a
          href={doc.downloadLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#eff6ff',
            color: '#3b82f6',
            transition: 'background 0.2s',
            border: 'none',
            cursor: 'pointer'
          }}
           title="Download"
        >
          <FaDownload size={14} />
        </a>
      </div>
    </div>
  );
};

const DownloadApiDoc = () => {
  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: '#ffffff', // White background as requested
      fontFamily: 'Inter, Poppins, sans-serif'
    }}>
      <div style={{ padding: '24px 32px' }}>
         <BackToProfileMenu />
      </div>

      <div style={{ padding: '0 32px 32px 32px' }}>
        {/* Header Section */}
        <div style={{ marginBottom: 32 }}>
            <h1 style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#111827',
              marginBottom: 8
            }}>
              RFID Useful Documentation
            </h1>
             <p style={{ color: '#6b7280', margin: 0 }}>
               Download SOPs and API documentation.
             </p>
        </div>

        {/* Filter/Tabs Section (Visual only as per request) */}
         <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            borderBottom: '1px solid #e5e7eb',
            marginBottom: 32,
            paddingBottom: 16
         }}>
            <span style={{ color: '#3b82f6', fontWeight: 600, borderBottom: '2px solid #3b82f6', paddingBottom: 16, marginBottom: -17, cursor: 'pointer' }}>
               All Files
            </span>
            <span style={{ color: '#6b7280', cursor: 'pointer' }}>Important</span>
         </div>


        {/* Grid Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 24
        }}>
          {apiDocs.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DownloadApiDoc;
