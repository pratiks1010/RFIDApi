import React from 'react';
import { FaUpload, FaTimes, FaExclamationTriangle, FaFileExcel, FaArrowRight } from 'react-icons/fa';

const RFIDUploadPrompt = ({ isOpen, onClose, onUploadClick, onNavigateToUpload, userInfo = {} }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="rfid-upload-prompt-overlay" onClick={handleOverlayClick}>
      <div className="rfid-upload-prompt-modal">
        <div className="rfid-upload-prompt-header">
          <div className="rfid-upload-prompt-icon">
            <FaExclamationTriangle />
          </div>
          <button className="rfid-upload-prompt-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="rfid-upload-prompt-content">
          <h2>Welcome, {userInfo.name || 'User'}!</h2>
          <h3>RFID tags is not uploaded</h3>

          <div className="rfid-upload-prompt-stats">
            <div className="rfid-upload-stat-item">
              <div className="rfid-upload-stat-number">0</div>
              <div className="rfid-upload-stat-label">RFID Tags</div>
            </div>
          </div>

          <div className="rfid-upload-prompt-benefits">
            <h4>Problems if you don't upload RFID sheet:</h4>
            <ul>
              <li>
                <FaArrowRight className="rfid-problem-icon" />
                RFID gun data will not come
              </li>
              <li>
                <FaArrowRight className="rfid-problem-icon" />
                Date will not sync properly without uploading RFID tags
              </li>
              <li>
                <FaArrowRight className="rfid-problem-icon" />
                Inventory tracking will be completely unavailable
              </li>
              <li>
                <FaArrowRight className="rfid-problem-icon" />
                Cannot generate any stock reports
              </li>
            </ul>
          </div>

          <div className="rfid-upload-prompt-file-info">
            <FaFileExcel className="rfid-file-icon" />
            <div>
              <div className="rfid-file-title">Upload Excel/CSV File</div>
              <div className="rfid-file-desc">
                Upload your RFID inventory data to start tracking
              </div>
            </div>
          </div>
        </div>

        <div className="rfid-upload-prompt-actions">
          <button className="rfid-upload-btn-secondary" onClick={onClose}>
            Skip for now
          </button>
          <button className="rfid-upload-btn-primary" onClick={onNavigateToUpload || onUploadClick}>
            <FaUpload />
            Upload RFID Data
          </button>
        </div>
      </div>

      <style jsx>{`
        .rfid-upload-prompt-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
          backdrop-filter: blur(3px);
          animation: rfid-fade-in 0.3s ease-out;
        }

        .rfid-upload-prompt-modal {
          background: white;
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          animation: rfid-slide-up 0.3s ease-out;
        }

        .rfid-upload-prompt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 28px 0;
          position: relative;
        }

        .rfid-upload-prompt-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d97706;
          font-size: 20px;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
        }

        .rfid-upload-prompt-close {
          background: none;
          border: none;
          font-size: 18px;
          color: #6b7280;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .rfid-upload-prompt-close:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .rfid-upload-prompt-content {
          padding: 16px 28px 20px;
        }

        .rfid-upload-prompt-content h2 {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px 0;
          line-height: 1.3;
          text-align: center;
        }

        .rfid-upload-prompt-content h3 {
          font-size: 15px;
          font-weight: 500;
          color: #dc2626;
          margin: 0 0 20px 0;
          line-height: 1.4;
          text-align: center;
        }

        .rfid-upload-prompt-content p {
          color: #6b7280;
          line-height: 1.6;
          margin: 0 0 24px 0;
          font-size: 15px;
        }

        .rfid-upload-prompt-stats {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .rfid-upload-stat-item {
          text-align: center;
          padding: 14px 20px;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border-radius: 10px;
          border: 1px solid #fecaca;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.1);
        }

        .rfid-upload-stat-number {
          font-size: 22px;
          font-weight: 600;
          color: #ef4444;
          margin-bottom: 4px;
        }

        .rfid-upload-stat-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .rfid-upload-prompt-benefits {
          margin-bottom: 18px;
        }

        .rfid-upload-prompt-benefits h4 {
          font-size: 14px;
          font-weight: 600;
          color: #dc2626;
          margin: 0 0 10px 0;
        }

        .rfid-upload-prompt-benefits ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .rfid-upload-prompt-benefits li {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
          color: #4b5563;
          font-size: 14px;
        }

        .rfid-problem-icon {
          color: #ef4444;
          font-size: 12px;
          flex-shrink: 0;
        }

        .rfid-upload-prompt-file-info {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
          border-radius: 8px;
          border: 1px solid #bfdbfe;
          margin-bottom: 18px;
        }

        .rfid-file-icon {
          font-size: 20px;
          color: #2563eb;
          flex-shrink: 0;
        }

        .rfid-file-title {
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 2px;
          font-size: 13px;
        }

        .rfid-file-desc {
          font-size: 11px;
          color: #3b82f6;
          line-height: 1.4;
        }

        .rfid-upload-prompt-actions {
          display: flex;
          gap: 12px;
          padding: 16px 28px 20px;
          border-top: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 0 0 12px 12px;
        }

        .rfid-upload-btn-secondary {
          flex: 1;
          padding: 10px 20px;
          border: 1px solid #d1d5db;
          background: white;
          color: #6b7280;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 13px;
        }

        .rfid-upload-btn-secondary:hover {
          background: #f9fafb;
          border-color: #9ca3af;
          color: #374151;
        }

        .rfid-upload-btn-primary {
          flex: 1;
          padding: 10px 20px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 13px;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }

        .rfid-upload-btn-primary:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        @keyframes rfid-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes rfid-slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .rfid-upload-prompt-modal {
            margin: 20px;
            max-width: none;
            width: calc(100% - 40px);
          }

          .rfid-upload-prompt-stats {
            grid-template-columns: 1fr;
          }

          .rfid-upload-prompt-actions {
            flex-direction: column;
          }

          .rfid-upload-btn-secondary,
          .rfid-upload-btn-primary {
            flex: none;
          }
        }
      `}</style>
    </div>
  );
};

export default RFIDUploadPrompt; 