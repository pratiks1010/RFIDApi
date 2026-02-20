import React, { useState, useEffect } from 'react';
import { FaExchangeAlt, FaPlus, FaTrash, FaSpinner, FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';
import { localDatabaseMigrationService } from '../../services/localDatabaseMigrationService';
import { toast } from 'react-toastify';

const MapAndStoreLocalData = ({ userInfo }) => {
  const [loading, setLoading] = useState(false);
  const [availableFields, setAvailableFields] = useState([]);
  const [formData, setFormData] = useState({
    ClientCode: userInfo?.ClientCode || userInfo?.clientCode || userInfo?.clientcode || '',
    LocalTableName: '',
    FieldMappings: [],
    FilterCondition: '',
    DryRun: true
  });
  const [migrationResult, setMigrationResult] = useState(null);
  const [localTableColumns, setLocalTableColumns] = useState([]);

  useEffect(() => {
    loadAvailableFields();
    // Try to get table columns from sessionStorage if available
    const dbConnection = sessionStorage.getItem('dbConnection');
    if (dbConnection) {
      try {
        const connection = JSON.parse(dbConnection);
        // You could load table info here if stored
      } catch (err) {
        console.error('Error parsing connection info:', err);
      }
    }
  }, []);

  const loadAvailableFields = async () => {
    try {
      const response = await localDatabaseMigrationService.getAvailableFieldMappings();
      setAvailableFields(response);
      
      // Initialize with required fields
      const requiredFields = response.filter(f => f.isRequired);
      setFormData(prev => ({
        ...prev,
        FieldMappings: requiredFields.map(field => ({
          LocalTableColumn: '',
          TargetField: field.fieldName,
          DefaultValue: '',
          TransformationRule: ''
        }))
      }));
    } catch (error) {
      console.error('Error loading available fields:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFieldMappingChange = (index, field, value) => {
    setFormData(prev => {
      const newMappings = [...prev.FieldMappings];
      newMappings[index] = {
        ...newMappings[index],
        [field]: value
      };
      return {
        ...prev,
        FieldMappings: newMappings
      };
    });
  };

  const addFieldMapping = () => {
    setFormData(prev => ({
      ...prev,
      FieldMappings: [
        ...prev.FieldMappings,
        {
          LocalTableColumn: '',
          TargetField: '',
          DefaultValue: '',
          TransformationRule: ''
        }
      ]
    }));
  };

  const removeFieldMapping = (index) => {
    setFormData(prev => ({
      ...prev,
      FieldMappings: prev.FieldMappings.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMigrationResult(null);

    try {
      // Validation
      if (!formData.ClientCode) {
        toast.error('Client Code is required');
        setLoading(false);
        return;
      }

      if (!formData.LocalTableName) {
        toast.error('Local Table Name is required');
        setLoading(false);
        return;
      }

      if (!formData.FieldMappings || formData.FieldMappings.length === 0) {
        toast.error('At least one field mapping is required');
        setLoading(false);
        return;
      }

      // Validate required fields are mapped
      const requiredFields = availableFields.filter(f => f.isRequired);
      const mappedRequiredFields = formData.FieldMappings
        .filter(m => m.TargetField && requiredFields.some(rf => rf.fieldName === m.TargetField))
        .filter(m => m.LocalTableColumn || m.DefaultValue);

      if (mappedRequiredFields.length < requiredFields.length) {
        const missingFields = requiredFields
          .filter(rf => !mappedRequiredFields.some(mrf => mrf.TargetField === rf.fieldName))
          .map(rf => rf.fieldName)
          .join(', ');
        toast.error(`Missing required field mappings: ${missingFields}`);
        setLoading(false);
        return;
      }

      const response = await localDatabaseMigrationService.mapAndStoreLocalData(formData);
      setMigrationResult(response);
      
      if (response.success) {
        toast.success(response.message || 'Migration completed successfully!');
      } else {
        toast.warning(response.message || 'Migration completed with warnings');
      }
    } catch (error) {
      const errorMessage = error.message || error.response?.data?.message || 'Failed to map and store data';
      setMigrationResult({
        success: false,
        message: errorMessage,
        errors: [errorMessage]
      });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
          <FaExchangeAlt style={{ color: '#f59e0b' }} />
          Map & Store Local Data
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Map data from local database table to RFIDGunTransaction format and store it in the labeled stock table.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Client Code *
            </label>
            <input
              type="text"
              name="ClientCode"
              value={formData.ClientCode}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                background: '#f8f9fa',
                boxSizing: 'border-box'
              }}
              readOnly
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Local Table Name *
            </label>
            <input
              type="text"
              name="LocalTableName"
              value={formData.LocalTableName}
              onChange={handleInputChange}
              placeholder="e.g., Products"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
        </div>

        {/* Filter Condition */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Filter Condition (SQL WHERE clause, without WHERE keyword)
          </label>
          <textarea
            name="FilterCondition"
            value={formData.FilterCondition}
            onChange={handleInputChange}
            placeholder="e.g., Status = 'Active' AND CreatedDate >= '2024-01-01'"
            rows="3"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'monospace',
              transition: 'all 0.2s',
              boxSizing: 'border-box',
              resize: 'vertical'
            }}
            onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        {/* Field Mappings */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
              Field Mappings
            </h3>
            <button
              type="button"
              onClick={addFieldMapping}
              style={{
                padding: '8px 16px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#059669';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#10b981';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <FaPlus />
              Add Mapping
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {formData.FieldMappings.map((mapping, index) => {
              const fieldInfo = availableFields.find(f => f.fieldName === mapping.TargetField);
              return (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    background: fieldInfo?.isRequired ? '#fef2f2' : '#f8f9fa',
                    borderRadius: '8px',
                    border: `1px solid ${fieldInfo?.isRequired ? '#fecaca' : '#e2e8f0'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                      Mapping #{index + 1}
                      {fieldInfo?.isRequired && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '11px',
                          padding: '2px 6px',
                          background: '#ef4444',
                          color: 'white',
                          borderRadius: '4px'
                        }}>
                          Required
                        </span>
                      )}
                    </div>
                    {formData.FieldMappings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFieldMapping(index)}
                        style={{
                          padding: '4px 8px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#64748b' }}>
                        Target Field *
                      </label>
                      <select
                        value={mapping.TargetField}
                        onChange={(e) => handleFieldMappingChange(index, 'TargetField', e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">Select field...</option>
                        {availableFields.map(field => (
                          <option key={field.fieldName} value={field.fieldName}>
                            {field.fieldName} {field.isRequired ? '(Required)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#64748b' }}>
                        Local Table Column
                      </label>
                      <input
                        type="text"
                        value={mapping.LocalTableColumn}
                        onChange={(e) => handleFieldMappingChange(index, 'LocalTableColumn', e.target.value)}
                        placeholder="e.g., ProductCode"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#64748b' }}>
                        Default Value
                      </label>
                      <input
                        type="text"
                        value={mapping.DefaultValue}
                        onChange={(e) => handleFieldMappingChange(index, 'DefaultValue', e.target.value)}
                        placeholder="Static value if no column"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {fieldInfo?.description && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                      {fieldInfo.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dry Run Toggle */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            padding: '12px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <input
              type="checkbox"
              name="DryRun"
              checked={formData.DryRun}
              onChange={handleInputChange}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Dry Run (Test Mode)
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Validate mapping without storing data. Recommended for testing.
              </p>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 32px',
            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}
        >
          {loading ? (
            <>
              <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
              {formData.DryRun ? 'Validating...' : 'Migrating...'}
            </>
          ) : (
            <>
              <FaExchangeAlt />
              {formData.DryRun ? 'Validate Mapping' : 'Migrate Data'}
            </>
          )}
        </button>
      </form>

      {/* Migration Result */}
      {migrationResult && (
        <div style={{
          marginTop: '32px',
          padding: '24px',
          background: migrationResult.success ? '#f0fdf4' : '#fef2f2',
          border: `2px solid ${migrationResult.success ? '#10b981' : '#ef4444'}`,
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            {migrationResult.success ? (
              <FaCheckCircle style={{ color: '#10b981', fontSize: '24px' }} />
            ) : (
              <FaTimesCircle style={{ color: '#ef4444', fontSize: '24px' }} />
            )}
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: migrationResult.success ? '#10b981' : '#ef4444'
            }}>
              {formData.DryRun ? 'Validation Result' : 'Migration Result'}
            </h3>
          </div>

          <p style={{ color: '#374151', marginBottom: '16px', fontSize: '15px' }}>
            {migrationResult.message}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ padding: '12px', background: 'white', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total Found</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
                {migrationResult.totalRecordsFound || 0}
              </div>
            </div>
            <div style={{ padding: '12px', background: 'white', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Processed</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>
                {migrationResult.recordsProcessed || 0}
              </div>
            </div>
            <div style={{ padding: '12px', background: 'white', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Skipped</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#ef4444' }}>
                {migrationResult.recordsSkipped || 0}
              </div>
            </div>
          </div>

          {migrationResult.errors && migrationResult.errors.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#ef4444' }}>
                Errors:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', fontSize: '13px' }}>
                {migrationResult.errors.map((error, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {migrationResult.sampleMappedData && migrationResult.sampleMappedData.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>
                Sample Mapped Data:
              </h4>
              <div style={{
                overflowX: 'auto',
                background: 'white',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                    <tr>
                      {Object.keys(migrationResult.sampleMappedData[0] || {}).map((key) => (
                        <th key={key} style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {migrationResult.sampleMappedData.map((row, rowIndex) => (
                      <tr key={rowIndex} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {Object.entries(row).map(([key, value]) => (
                          <td key={key} style={{ padding: '8px', color: '#64748b', fontFamily: 'monospace' }}>
                            {value !== null && value !== undefined ? String(value).substring(0, 50) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
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

export default MapAndStoreLocalData;
