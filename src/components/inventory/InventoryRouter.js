import React, { useState } from 'react';
import {
  LabelStockList,
  RFIDDeviceDetails,
  RFIDTags,
  TagUsage,
  StockVerification,
  StockTransfer
} from './';
import { FaList, FaMicrochip, FaTags, FaTag, FaClipboardCheck, FaExchangeAlt } from 'react-icons/fa';

const InventoryRouter = () => {
  const [activeTab, setActiveTab] = useState('labelStock');

  const tabs = [
    {
      id: 'labelStock',
      label: 'Label Stock List',
      icon: FaList,
      component: LabelStockList
    },
    {
      id: 'rfidDevices',
      label: 'RFID Device Details',
      icon: FaMicrochip,
      component: RFIDDeviceDetails
    },
    {
      id: 'rfidTags',
      label: 'RFID Tags',
      icon: FaTags,
      component: RFIDTags
    },
    {
      id: 'tagUsage',
      label: 'Used/Unused Tags',
      icon: FaTag,
      component: TagUsage
    },
    {
      id: 'stockVerification',
      label: 'Stock Verification',
      icon: FaClipboardCheck,
      component: StockVerification
    },
    {
      id: 'stockTransfer',
      label: 'Stock Transfer',
      icon: FaExchangeAlt,
      component: StockTransfer
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 24px',
        display: 'flex',
        gap: '4px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: '-ms-autohiding-scrollbar'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 20px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? '#0077d4' : 'transparent'}`,
                color: activeTab === tab.id ? '#0077d4' : '#6b7280',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#374151';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#6b7280';
                }
              }}
            >
              <Icon style={{ fontSize: '16px' }} />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', background: '#f9fafb' }}>
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default InventoryRouter; 