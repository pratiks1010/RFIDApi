import React, { useState, useEffect } from 'react';
import { FaServer, FaDatabase, FaUser, FaLock, FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import { localDatabaseMigrationService } from '../../services/localDatabaseMigrationService';
import { toast } from 'react-toastify';

const ConnectLocalDatabase = ({ userInfo }) => {
  const [loading, setLoading] = useState(false);
  const [connectionResult, setConnectionResult] = useState(null);
  const [currentUserInfo, setCurrentUserInfo] = useState(null);
  
  // Get client code from localStorage or props
  const getClientCode = () => {
    if (currentUserInfo) {
      return currentUserInfo.ClientCode || currentUserInfo.clientCode || currentUserInfo.clientcode || '';
    }
    if (userInfo) {
      return userInfo.ClientCode || userInfo.clientCode || userInfo.clientcode || '';
    }
    try {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.ClientCode || parsed.clientCode || parsed.clientcode || '';
      }
    } catch (err) {
      console.error('Error loading user info:', err);
    }
    return '';
  };

  const [formData, setFormData] = useState({
    ServerName: '',
    DatabaseName: '',
    UserId: '',
    Password: '',
    UseWindowsAuthentication: false,
    ClientCode: ''
  });

  // Load user info from localStorage on mount and update ClientCode
  useEffect(() => {
    try {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUserInfo(parsed);
        setFormData(prev => ({
          ...prev,
          ClientCode: parsed.ClientCode || parsed.clientCode || parsed.clientcode || ''
        }));
      } else if (userInfo) {
        setCurrentUserInfo(userInfo);
        setFormData(prev => ({
          ...prev,
          ClientCode: userInfo.ClientCode || userInfo.clientCode || userInfo.clientcode || ''
        }));
      }
    } catch (err) {
      console.error('Error loading user info:', err);
    }
  }, [userInfo]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setConnectionResult(null);

    try {
      // Validation
      if (!formData.ClientCode) {
        toast.error('Client Code is required');
        setLoading(false);
        return;
      }

      if (!formData.ServerName) {
        toast.error('Server Name is required');
        setLoading(false);
        return;
      }

      if (!formData.DatabaseName) {
        toast.error('Database Name is required');
        setLoading(false);
        return;
      }

      if (!formData.UseWindowsAuthentication) {
        // SQL Server Authentication - UserId and Password are REQUIRED
        if (!formData.UserId) {
          toast.error('User ID is required when not using Windows Authentication');
          setLoading(false);
          return;
        }
        if (!formData.Password) {
          toast.error('Password is required when not using Windows Authentication');
          setLoading(false);
          return;
        }
      }

      // Build payload dynamically based on authentication type
      // Following API_USAGE_EXAMPLES.md guidelines:
      // 
      // Windows Authentication (UseWindowsAuthentication: true):
      //   - Send: ServerName, DatabaseName, UseWindowsAuthentication, ClientCode
      //   - Do NOT send: UserId, Password (they are ignored by API)
      //
      // SQL Server Authentication (UseWindowsAuthentication: false):
      //   - Send: ServerName, DatabaseName, UserId, Password, UseWindowsAuthentication, ClientCode
      //   - All fields are required
      const payload = {
        ServerName: formData.ServerName, // Backslashes will be auto-escaped by JSON.stringify
        DatabaseName: formData.DatabaseName,
        UseWindowsAuthentication: formData.UseWindowsAuthentication,
        ClientCode: formData.ClientCode
      };

      // Only include UserId and Password for SQL Server Authentication
      if (!formData.UseWindowsAuthentication) {
        payload.UserId = formData.UserId;
        payload.Password = formData.Password;
      }
      // Note: When UseWindowsAuthentication is true, we don't send UserId/Password
      // as they are ignored by the API anyway (per API documentation)

      const response = await localDatabaseMigrationService.connectLocalDatabase(payload);
      setConnectionResult(response);
      
      if (response.isConnected) {
        toast.success('Successfully connected to database!');
        // Store connection info in sessionStorage for other components
        sessionStorage.setItem('dbConnection', JSON.stringify({
          ...formData,
          connectionId: response.connectionId
        }));
      } else {
        toast.error(response.message || 'Connection failed');
      }
    } catch (error) {
      const errorMessage = error.message || error.response?.data?.message || 'Failed to connect to database';
      setConnectionResult({
        isConnected: false,
        message: errorMessage,
        tables: []
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
          <FaServer style={{ color: '#3b82f6' }} />
          Connect to Local Database
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Connect to your local SQL Server database to view available tables and their structure.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          {/* Server Name */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              <FaServer style={{ marginRight: '6px', color: '#3b82f6' }} />
              Server Name *
            </label>
            <input
              type="text"
              name="ServerName"
              value={formData.ServerName}
              onChange={handleInputChange}
              placeholder="e.g., LAPTOP-R4AMQFP2\\SQLEXPRESS"
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
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Use double backslash (\\) in JSON: SERVERNAME\\SQLEXPRESS
            </small>
          </div>

          {/* Database Name */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              <FaDatabase style={{ marginRight: '6px', color: '#10b981' }} />
              Database Name *
            </label>
            <input
              type="text"
              name="DatabaseName"
              value={formData.DatabaseName}
              onChange={handleInputChange}
              placeholder="e.g., RfidJewelryDB"
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
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Client Code */}
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
                transition: 'all 0.2s',
                boxSizing: 'border-box',
                background: '#f8f9fa',
                fontWeight: '500'
              }}
              readOnly
              placeholder="Loading client code..."
            />
          </div>

          {/* Windows Authentication Toggle */}
          <div style={{ gridColumn: '1 / -1' }}>
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
                name="UseWindowsAuthentication"
                checked={formData.UseWindowsAuthentication}
                onChange={handleInputChange}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Use Windows Authentication
              </span>
            </label>
            <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block', marginLeft: '30px' }}>
              If enabled, User ID and Password will be ignored
            </small>
          </div>

          {/* User ID */}
          {!formData.UseWindowsAuthentication && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                <FaUser style={{ marginRight: '6px', color: '#8b5cf6' }} />
                User ID *
              </label>
              <input
                type="text"
                name="UserId"
                value={formData.UserId}
                onChange={handleInputChange}
                placeholder="e.g., sa"
                required={!formData.UseWindowsAuthentication}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          )}

          {/* Password */}
          {!formData.UseWindowsAuthentication && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                <FaLock style={{ marginRight: '6px', color: '#ef4444' }} />
                Password *
              </label>
              <input
                type="password"
                name="Password"
                value={formData.Password}
                onChange={handleInputChange}
                placeholder="Enter password"
                required={!formData.UseWindowsAuthentication}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 32px',
            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
            boxShadow: loading ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            }
          }}
        >
          {loading ? (
            <>
              <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
              Connecting...
            </>
          ) : (
            <>
              <FaCheckCircle />
              Connect to Database
            </>
          )}
        </button>
      </form>

      {/* Connection Result */}
      {connectionResult && (
        <div style={{
          marginTop: '32px',
          padding: '24px',
          background: connectionResult.isConnected ? '#f0fdf4' : '#fef2f2',
          border: `2px solid ${connectionResult.isConnected ? '#10b981' : '#ef4444'}`,
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            {connectionResult.isConnected ? (
              <FaCheckCircle style={{ color: '#10b981', fontSize: '24px' }} />
            ) : (
              <FaTimesCircle style={{ color: '#ef4444', fontSize: '24px' }} />
            )}
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: connectionResult.isConnected ? '#10b981' : '#ef4444'
            }}>
              {connectionResult.isConnected ? 'Connection Successful' : 'Connection Failed'}
            </h3>
          </div>
          <p style={{ color: '#374151', marginBottom: '16px' }}>
            {connectionResult.message}
          </p>

          {connectionResult.isConnected && connectionResult.tables && connectionResult.tables.length > 0 && (
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1e293b' }}>
                Available Tables ({connectionResult.tables.length})
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '12px'
              }}>
                {connectionResult.tables.map((table, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                        {table.tableName}
                      </h5>
                      {table.hasData && (
                        <span style={{
                          fontSize: '12px',
                          padding: '4px 8px',
                          background: '#10b981',
                          color: 'white',
                          borderRadius: '4px',
                          fontWeight: '500'
                        }}>
                          {table.rowCount} rows
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      {table.columns?.length || 0} columns
                    </p>
                  </div>
                ))}
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

export default ConnectLocalDatabase;
