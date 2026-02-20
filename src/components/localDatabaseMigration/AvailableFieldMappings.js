import React, { useState, useEffect } from 'react';
import { FaMapMarkedAlt, FaCheckCircle, FaTimesCircle, FaSpinner, FaInfoCircle } from 'react-icons/fa';
import { localDatabaseMigrationService } from '../../services/localDatabaseMigrationService';
import { toast } from 'react-toastify';

const AvailableFieldMappings = () => {
  const [loading, setLoading] = useState(false);
  const [fieldMappings, setFieldMappings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadFieldMappings();
  }, []);

  const loadFieldMappings = async () => {
    setLoading(true);
    try {
      const response = await localDatabaseMigrationService.getAvailableFieldMappings();
      setFieldMappings(response);
    } catch (error) {
      const errorMessage = error.message || error.response?.data?.message || 'Failed to load field mappings';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredMappings = fieldMappings.filter(mapping =>
    mapping.fieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mapping.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const requiredFields = filteredMappings.filter(f => f.isRequired);
  const optionalFields = filteredMappings.filter(f => !f.isRequired);

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#1e293b',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <FaMapMarkedAlt style={{ color: '#8b5cf6' }} />
          Available Field Mappings
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          View all available fields that can be mapped from local database to RFIDGunTransaction format.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '14px',
            transition: 'all 0.2s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
          onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FaSpinner style={{ fontSize: '48px', color: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '16px', color: '#64748b' }}>Loading field mappings...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px'
          }}>
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: '12px',
              color: 'white'
            }}>
              <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
                {fieldMappings.length}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Fields</div>
            </div>
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              borderRadius: '12px',
              color: 'white'
            }}>
              <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
                {requiredFields.length}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Required Fields</div>
            </div>
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '12px',
              color: 'white'
            }}>
              <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
                {optionalFields.length}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Optional Fields</div>
            </div>
          </div>

          {/* Required Fields */}
          {requiredFields.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FaCheckCircle style={{ color: '#ef4444' }} />
                Required Fields ({requiredFields.length})
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '12px'
              }}>
                {requiredFields.map((field, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      background: 'white',
                      borderRadius: '8px',
                      border: '2px solid #ef4444',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', fontFamily: 'monospace' }}>
                        {field.fieldName}
                      </div>
                      <span style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>
                        Required
                      </span>
                    </div>
                    {field.description && (
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                        {field.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Fields */}
          {optionalFields.length > 0 && (
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FaInfoCircle style={{ color: '#10b981' }} />
                Optional Fields ({optionalFields.length})
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '12px'
              }}>
                {optionalFields.map((field, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', fontFamily: 'monospace' }}>
                        {field.fieldName}
                      </div>
                      <span style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        background: '#e2e8f0',
                        color: '#64748b',
                        borderRadius: '4px',
                        fontWeight: '500'
                      }}>
                        Optional
                      </span>
                    </div>
                    {field.description && (
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                        {field.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredMappings.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#f8f9fa',
              borderRadius: '12px',
              border: '1px dashed #e2e8f0'
            }}>
              <FaTimesCircle style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '16px' }} />
              <p style={{ color: '#64748b', fontSize: '16px' }}>
                No field mappings found matching "{searchTerm}"
              </p>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AvailableFieldMappings;
