import React, { useState, useEffect } from 'react';
import { 
  FaDatabase, 
  FaPlug, 
  FaTable, 
  FaExchangeAlt, 
  FaList, 
  FaCog,
  FaMapMarkedAlt,
  FaCheckCircle
} from 'react-icons/fa';
import ConnectLocalDatabase from './ConnectLocalDatabase';
import GetTableDetails from './GetTableDetails';
import MapAndStoreLocalData from './MapAndStoreLocalData';
import MigrationConfigurations from './MigrationConfigurations';
import AvailableFieldMappings from './AvailableFieldMappings';

const LocalDatabaseMigration = () => {
  const [activeTab, setActiveTab] = useState('connect');
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        setUserInfo(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading user info:', err);
    }
  }, []);

  const tabs = [
    {
      id: 'connect',
      label: 'Connect Database',
      icon: FaPlug,
      color: '#3b82f6',
      description: 'Connect to local SQL Server database'
    },
    {
      id: 'table-details',
      label: 'Table Details',
      icon: FaTable,
      color: '#10b981',
      description: 'View table structure and sample data'
    },
    {
      id: 'field-mappings',
      label: 'Field Mappings',
      icon: FaMapMarkedAlt,
      color: '#8b5cf6',
      description: 'View available field mappings'
    },
    {
      id: 'map-store',
      label: 'Map & Store Data',
      icon: FaExchangeAlt,
      color: '#f59e0b',
      description: 'Map and migrate data to RFIDGunTransaction'
    },
    {
      id: 'configurations',
      label: 'Configurations',
      icon: FaList,
      color: '#ef4444',
      description: 'Manage migration configurations'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px'
          }}>
            <FaDatabase />
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: '600',
              color: '#1e293b',
              letterSpacing: '-0.5px'
            }}>
              Local Database Migration
            </h1>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: '#64748b'
            }}>
              Migrate data from local SQL Server databases to RFID system
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '8px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        scrollbarWidth: 'thin'
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: '1 1 auto',
                minWidth: '180px',
                padding: '16px 20px',
                border: 'none',
                borderRadius: '8px',
                background: isActive 
                  ? `linear-gradient(135deg, ${tab.color}15 0%, ${tab.color}25 100%)`
                  : 'transparent',
                color: isActive ? tab.color : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontWeight: isActive ? '600' : '500',
                fontSize: '14px',
                position: 'relative',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#f1f5f9';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon style={{ fontSize: '18px' }} />
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontWeight: isActive ? '600' : '500' }}>
                  {tab.label}
                </div>
                <div style={{
                  fontSize: '11px',
                  opacity: 0.7,
                  marginTop: '2px'
                }}>
                  {tab.description}
                </div>
              </div>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '40px',
                  height: '3px',
                  background: tab.color,
                  borderRadius: '2px'
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minHeight: '500px'
      }}>
        {activeTab === 'connect' && <ConnectLocalDatabase userInfo={userInfo} />}
        {activeTab === 'table-details' && <GetTableDetails userInfo={userInfo} />}
        {activeTab === 'field-mappings' && <AvailableFieldMappings />}
        {activeTab === 'map-store' && <MapAndStoreLocalData userInfo={userInfo} />}
        {activeTab === 'configurations' && <MigrationConfigurations userInfo={userInfo} />}
      </div>
    </div>
  );
};

export default LocalDatabaseMigration;
