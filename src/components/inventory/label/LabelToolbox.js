import React from 'react';
import { 
  FaFont, 
  FaQrcode, 
  FaBarcode, 
  FaSquare,
  FaMinus,
  FaCircle
} from 'react-icons/fa';

const LabelToolbox = ({ onAddElement }) => {
  const handleAddText = () => {
    onAddElement({
      type: 'text',
      label: 'Text',
      binding: null,
      fontSize: 12,
      fontWeight: 'normal',
      color: '#000000',
      x: 10,
      y: 10,
      width: 100,
      height: 30,
      zIndex: 10
    });
  };

  const handleAddQRCode = () => {
    onAddElement({
      type: 'qrcode',
      binding: 'ItemCode',
      qrSize: 60,
      x: 10,
      y: 10,
      width: 60,
      height: 60,
      zIndex: 10
    });
  };

  const handleAddBarcode = () => {
    onAddElement({
      type: 'barcode',
      binding: 'ItemCode',
      barcodeType: 'code128',
      x: 10,
      y: 10,
      width: 150,
      height: 40,
      zIndex: 10
    });
  };

  const handleAddLine = () => {
    onAddElement({
      type: 'shape',
      shapeType: 'line',
      borderColor: '#000000',
      borderWidth: 1,
      lineDirection: 'horizontal',
      x: 10,
      y: 10,
      width: 100,
      height: 2,
      zIndex: 10
    });
  };

  const handleAddRectangle = () => {
    onAddElement({
      type: 'shape',
      shapeType: 'rectangle',
      borderColor: '#000000',
      borderWidth: 1,
      x: 10,
      y: 10,
      width: 100,
      height: 50,
      zIndex: 10
    });
  };

  const handleAddCircle = () => {
    onAddElement({
      type: 'shape',
      shapeType: 'circle',
      borderColor: '#000000',
      borderWidth: 1,
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      zIndex: 10
    });
  };

  const toolboxItems = [
    { icon: FaFont, label: 'Text', onClick: handleAddText, color: '#3b82f6' },
    { icon: FaQrcode, label: 'QR Code', onClick: handleAddQRCode, color: '#10b981' },
    { icon: FaBarcode, label: 'Barcode', onClick: handleAddBarcode, color: '#f59e0b' },
    { icon: FaMinus, label: 'Line', onClick: handleAddLine, color: '#8b5cf6' },
    { icon: FaSquare, label: 'Rectangle', onClick: handleAddRectangle, color: '#ec4899' },
    { icon: FaCircle, label: 'Circle', onClick: handleAddCircle, color: '#06b6d4' },
  ];

  return (
    <div>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '14px',
        fontWeight: 600,
        color: '#1e293b'
      }}>
        Elements
      </h3>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {toolboxItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={item.onClick}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = item.color;
                e.target.style.background = `${item.color}10`;
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.background = '#ffffff';
              }}
            >
              <Icon style={{ color: item.color, fontSize: '16px' }} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LabelToolbox;

