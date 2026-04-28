import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight, FaClipboardList, FaCogs, FaInfoCircle, FaMicrochip, FaProjectDiagram, FaSyncAlt, FaWaveSquare } from 'react-icons/fa';
import '../styles/RFIDUtility.css';

const utilityMenus = [
  {
    id: 'auto-push-stock',
    title: 'Auto Push Stock',
    subtitle: 'Smart Sync',
    description: 'Automatically push inventory updates to your connected endpoints.',
    icon: FaSyncAlt,
    theme: 'rfid-card-orange',
    route: '/rfid-utility/auto-push-stock',
  },
  {
    id: 'check-rfid',
    title: 'Check RFID',
    subtitle: 'Validation',
    description: 'Verify tag health, read status, and scan confidence instantly.',
    icon: FaWaveSquare,
    theme: 'rfid-card-blue',
  },
  {
    id: 'device-settings',
    title: 'Device Settings',
    subtitle: 'Configuration',
    description: 'Manage scanner connectivity, speed, and read preferences.',
    icon: FaCogs,
    theme: 'rfid-card-teal',
  },
  {
    id: 'about',
    title: 'About',
    subtitle: 'System Info',
    description: 'Check utility version, compatibility, and support information.',
    icon: FaInfoCircle,
    theme: 'rfid-card-indigo',
  },
  {
    id: 'map-fields',
    title: 'Map Fields',
    subtitle: 'Template Mapping',
    description: 'Review template fields and source-column mapping for auto push workflows.',
    icon: FaProjectDiagram,
    theme: 'rfid-card-purple',
    route: '/rfid-utility/map-fields',
  },
  {
    id: 'template',
    title: 'Templates',
    subtitle: 'Create Mapping',
    description: 'Select Excel columns and save reusable mapping templates.',
    icon: FaClipboardList,
    theme: 'rfid-card-rose',
    route: '/rfid-utility/template',
  },
  {
    id: 'firmware-tools',
    title: 'Firmware Tools',
    subtitle: 'Maintenance',
    description: 'Check scanner firmware status and prepare maintenance actions.',
    icon: FaCogs,
    theme: 'rfid-card-green',
  },
  {
    id: 'system-status',
    title: 'System Status',
    subtitle: 'Live Monitor',
    description: 'View utility service health, queue load, and connectivity.',
    icon: FaMicrochip,
    theme: 'rfid-card-coral',
  },
];

const RFIDUtility = () => {
  const navigate = useNavigate();

  return (
    <div className="rfid-utility-page">
      <div className="rfid-utility-header">
       
        <h1>RFID Utility Center</h1>
        <p>Quick access menus for RFID operations and settings.</p>
      </div>

      <div className="rfid-utility-grid">
        {utilityMenus.map((menu) => {
          const Icon = menu.icon;
          return (
            <button
              key={menu.id}
              type="button"
              className={`rfid-utility-card ${menu.theme}`}
              onClick={() => {
                if (menu.route) {
                  navigate(menu.route);
                }
              }}
            >
              <div className="rfid-card-content">
                <span className="rfid-card-icon">
                  <Icon />
                </span>
                <h3>{menu.title}</h3>
                <p>{menu.description}</p>
                <div className="rfid-card-footer">
                  <span className="rfid-card-action">
                    Explore <FaArrowRight />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RFIDUtility;
