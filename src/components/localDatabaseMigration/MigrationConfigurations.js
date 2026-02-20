import React, { useState, useEffect } from 'react';
import { FaList, FaEdit, FaTrash, FaSpinner, FaPlus, FaSearch, FaSync } from 'react-icons/fa';
import { localDatabaseMigrationService } from '../../services/localDatabaseMigrationService';
import { toast } from 'react-toastify';

const MigrationConfigurations = ({ userInfo }) => {
  const [loading, setLoading] = useState(false);
  const [configurations, setConfigurations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingConfig, setEditingConfig] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    clientCode: userInfo?.ClientCode || userInfo?.clientCode || userInfo?.clientcode || '',
    serverName: '',
    databaseName: '',
    localTableName: '',
    mappingConfiguration: '',
    status: 'Pending',
    totalRecords: 0,
    processedRecords: 0,
    failedRecords: 0,
    lastSyncDate: '',
    errorLog: '',
    connectionString: ''
  });

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    const clientCode = userInfo?.ClientCode || userInfo?.clientCode || userInfo?.clientcode || '';
    if (!clientCode) {
      toast.error('Client Code is required');
      return;
    }

    setLoading(true);
    try {
      const response = await localDatabaseMigrationService.getMigrationConfigurations(clientCode);
      setConfigurations(Array.isArray(response) ? response : []);
    } catch (error) {
      const errorMessage = error.message || error.response?.data?.message || 'Failed to load configurations';
      toast.error(errorMessage);
      setConfigurations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      await localDatabaseMigrationService.deleteMigrationConfiguration(id);
      toast.success('Configuration deleted successfully');
      loadConfigurations();
    } catch (error) {
      const errorMessage = error.message || error.response?.data?.message || 'Failed to delete configuration';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setFormData({
      id: config.id,
      clientCode: config.clientCode || userInfo?.ClientCode || userInfo?.clientCode || userInfo?.clientcode || '',
      serverName: config.serverName || '',
      databaseName: config.databaseName || '',
      localTableName: config.localTableName || '',
      mappingConfiguration: config.mappingConfiguration || '',
      status: config.status || 'Pending',
      totalRecords: config.totalRecords || 0,
      processedRecords: config.processedRecords || 0,
      failedRecords: config.failedRecords || 0,
      lastSyncDate: config.lastSyncDate || '',
      errorLog: config.errorLog || '',
      connectionString: config.connectionString || ''
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await localDatabaseMigrationService.updateMigrationConfiguration(formData);
      toast.success('Configuration updated successfully');
      setShowEditModal(false);
      setEditingConfig(null);
      loadConfigurations();
    } catch (error) {
      const errorMessage = error.message || error.response?.data?.message || 'Failed to update configuration';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filteredConfigurations = configurations.filter(config =>
    config.localTableName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    config.databaseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    config.serverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    config.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#10b981';
      case 'inprogress':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1e293b',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FaList style={{ color: '#ef4444' }} />
            Migration Configurations
          </h2>
          <button
            onClick={loadConfigurations}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
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
              e.currentTarget.style.background = '#2563eb';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <FaSync />
            Refresh
          </button>
        </div>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          View and manage all saved migration configurations for your client.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <FaSearch style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8'
          }} />
          <input
            type="text"
            placeholder="Search configurations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 40px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              transition: 'all 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#ef4444'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>
      </div>

      {loading && configurations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FaSpinner style={{ fontSize: '48px', color: '#ef4444', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '16px', color: '#64748b' }}>Loading configurations...</p>
        </div>
      ) : filteredConfigurations.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#f8f9fa',
          borderRadius: '12px',
          border: '1px dashed #e2e8f0'
        }}>
          <FaList style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '16px' }} />
          <p style={{ color: '#64748b', fontSize: '16px' }}>
            {searchTerm ? 'No configurations found matching your search.' : 'No migration configurations found.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: '20px'
        }}>
          {filteredConfigurations.map((config) => (
            <div
              key={config.id}
              style={{
                padding: '20px',
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                    {config.localTableName || 'Untitled'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    {config.databaseName} @ {config.serverName}
                  </p>
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: getStatusColor(config.status) + '20',
                  color: getStatusColor(config.status)
                }}>
                  {config.status || 'Pending'}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '16px',
                padding: '12px',
                background: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Total</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
                    {config.totalRecords || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Processed</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>
                    {config.processedRecords || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Failed</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#ef4444' }}>
                    {config.failedRecords || 0}
                  </div>
                </div>
              </div>

              {config.lastSyncDate && (
                <div style={{ marginBottom: '16px', fontSize: '12px', color: '#64748b' }}>
                  Last Sync: {new Date(config.lastSyncDate).toLocaleString()}
                </div>
              )}

              {config.errorLog && (
                <div style={{
                  marginBottom: '16px',
                  padding: '8px',
                  background: '#fef2f2',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#991b1b',
                  maxHeight: '60px',
                  overflow: 'auto'
                }}>
                  {config.errorLog.substring(0, 100)}...
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleEdit(config)}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                >
                  <FaEdit />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(config.id)}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                >
                  <FaTrash />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setShowEditModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#1e293b' }}>
              Edit Configuration
            </h3>

            <form onSubmit={handleUpdate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    Status *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="InProgress">InProgress</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    Total Records
                  </label>
                  <input
                    type="number"
                    name="totalRecords"
                    value={formData.totalRecords}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Processed Records
                    </label>
                    <input
                      type="number"
                      name="processedRecords"
                      value={formData.processedRecords}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Failed Records
                    </label>
                    <input
                      type="number"
                      name="failedRecords"
                      value={formData.failedRecords}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    Error Log
                  </label>
                  <textarea
                    name="errorLog"
                    value={formData.errorLog}
                    onChange={handleInputChange}
                    rows="4"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingConfig(null);
                  }}
                  style={{
                    padding: '10px 24px',
                    background: '#e2e8f0',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '10px 24px',
                    background: loading ? '#94a3b8' : '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
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

export default MigrationConfigurations;
