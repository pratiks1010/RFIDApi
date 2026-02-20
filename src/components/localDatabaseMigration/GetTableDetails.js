import React, { useState, useEffect } from 'react';
import { FaTable, FaInfoCircle, FaSpinner } from 'react-icons/fa';
import { localDatabaseMigrationService } from '../../services/localDatabaseMigrationService';
import { toast } from 'react-toastify';

const GetTableDetails = ({ userInfo }) => {
  const [loading, setLoading] = useState(false);
  const [tableDetails, setTableDetails] = useState(null);
  const [formData, setFormData] = useState({
    ClientCode: userInfo?.ClientCode || userInfo?.clientCode || userInfo?.clientcode || '',
    TableName: '',
    SampleRowCount: 5
  });
  const [availableTables, setAvailableTables] = useState([]);

  useEffect(() => {
    // Load connection info from sessionStorage
    const dbConnection = sessionStorage.getItem('dbConnection');
    if (dbConnection) {
      try {
        const connection = JSON.parse(dbConnection);
        // You could use this to pre-fill or validate
      } catch (err) {
        console.error('Error parsing connection info:', err);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'SampleRowCount' ? parseInt(value) || 5 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTableDetails(null);

    try {
      if (!formData.ClientCode) {
        toast.error('Client Code is required');
        setLoading(false);
        return;
      }

      if (!formData.TableName) {
        toast.error('Table Name is required');
        setLoading(false);
        return;
      }

      const response = await localDatabaseMigrationService.getTableDetails(formData);
      setTableDetails(response);
      toast.success('Table details retrieved successfully!');
    } catch (error) {
      const errorMessage = error.message || error.response?.data?.message || 'Failed to get table details';
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
          <FaTable style={{ color: '#10b981' }} />
          Get Table Details
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          View detailed information about a specific table including column structure and sample data.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
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
              Table Name *
            </label>
            <input
              type="text"
              name="TableName"
              value={formData.TableName}
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
              onFocus={(e) => e.target.style.borderColor = '#10b981'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
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
              Sample Row Count
            </label>
            <input
              type="number"
              name="SampleRowCount"
              value={formData.SampleRowCount}
              onChange={handleInputChange}
              min="1"
              max="100"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#10b981'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 32px',
            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
            boxShadow: loading ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}
        >
          {loading ? (
            <>
              <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
              Loading...
            </>
          ) : (
            <>
              <FaInfoCircle />
              Get Table Details
            </>
          )}
        </button>
      </form>

      {/* Table Details Result */}
      {tableDetails && (
        <div style={{ marginTop: '32px' }}>
          {/* Summary Card */}
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '12px',
            color: 'white',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
              {tableDetails.tableName}
            </h3>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
              Total Rows: <strong>{tableDetails.totalRows}</strong> | 
              Columns: <strong>{tableDetails.columns?.length || 0}</strong>
            </p>
          </div>

          {/* Columns */}
          <div style={{ marginBottom: '32px' }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
              Column Structure
            </h4>
            <div style={{
              overflowX: 'auto',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Column Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Data Type</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Nullable</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Max Length</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Sample Value</th>
                  </tr>
                </thead>
                <tbody>
                  {tableDetails.columns?.map((column, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>
                        {column.columnName}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                        {column.dataType}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: column.isNullable ? '#fef3c7' : '#dbeafe',
                          color: column.isNullable ? '#92400e' : '#1e40af'
                        }}>
                          {column.isNullable ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                        {column.maxLength || '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#64748b', fontFamily: 'monospace' }}>
                        {column.sampleValue !== null && column.sampleValue !== undefined 
                          ? String(column.sampleValue).substring(0, 50)
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sample Data */}
          {tableDetails.sampleData && tableDetails.sampleData.length > 0 && (
            <div>
              <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
                Sample Data ({tableDetails.sampleData.length} rows)
              </h4>
              <div style={{
                overflowX: 'auto',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                maxHeight: '500px',
                overflowY: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10 }}>
                    <tr>
                      {Object.keys(tableDetails.sampleData[0] || {}).map((key) => (
                        <th key={key} style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          borderBottom: '2px solid #e2e8f0'
                        }}>
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableDetails.sampleData.map((row, rowIndex) => (
                      <tr key={rowIndex} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {Object.entries(row).map(([key, value]) => (
                          <td key={key} style={{
                            padding: '12px',
                            fontSize: '14px',
                            color: '#64748b',
                            fontFamily: 'monospace'
                          }}>
                            {value !== null && value !== undefined ? String(value).substring(0, 100) : '-'}
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

export default GetTableDetails;
