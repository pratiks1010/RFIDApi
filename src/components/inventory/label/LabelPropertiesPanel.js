import React from 'react';

const LabelPropertiesPanel = ({
  selectedElement,
  onUpdateElement,
  labelData,
  onLabelDataChange,
  layout,
  onLayoutChange
}) => {
  // Available binding fields - All fields from Add Stock form
  const availableBindings = [
    { value: 'ItemCode', label: 'Item Code' },
    { value: 'RFIDNumber', label: 'RFID Number' },
    { value: 'RFIDCode', label: 'RFID Code' },
    { value: 'ProductTitle', label: 'Product Title' },
    { value: 'ProductName', label: 'Product Name' },
    { value: 'CategoryName', label: 'Category Name' },
    { value: 'BranchName', label: 'Branch Name' },
    { value: 'CounterName', label: 'Counter Name' },
    { value: 'DesignName', label: 'Design Name' },
    { value: 'PurityName', label: 'Purity Name' },
    { value: 'GrossWt', label: 'Gross Weight' },
    { value: 'NetWt', label: 'Net Weight' },
    { value: 'TotalStoneWeight', label: 'Stone Weight' },
    { value: 'StoneWeight', label: 'Stone Weight (Alt)' },
    { value: 'DiamondWeight', label: 'Diamond Weight' },
    { value: 'Size', label: 'Size' },
    { value: 'BoxDetails', label: 'Box Details' },
    { value: 'StoneAmount', label: 'Stone Amount' },
    { value: 'DiamondAmount', label: 'Diamond Amount' },
    { value: 'HallmarkAmount', label: 'Hallmark Amount' },
    { value: 'MakingPerGram', label: 'Making Per Gram' },
    { value: 'MakingPercentage', label: 'Making Percentage' },
    { value: 'MakingFixedAmt', label: 'Making Fixed Amount' },
    { value: 'MRP', label: 'MRP' },
    { value: 'ImageURL', label: 'Image URL' },
    { value: 'Status', label: 'Status' }
  ];

  if (!selectedElement) {
    return (
      <div>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          fontWeight: 600,
          color: '#1e293b'
        }}>
          Properties
        </h3>
        <p style={{
          margin: 0,
          fontSize: '13px',
          color: '#64748b',
          fontStyle: 'italic'
        }}>
          Select an element to edit its properties
        </p>
      </div>
    );
  }

  const handleUpdate = (updates) => {
    onUpdateElement(selectedElement.id, updates);
  };

  return (
    <div>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '14px',
        fontWeight: 600,
        color: '#1e293b'
      }}>
        Properties
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Position & Size */}
        <div>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569'
          }}>
            Position & Size
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>X</label>
              <input
                type="number"
                value={selectedElement.x || 0}
                onChange={(e) => handleUpdate({ x: parseInt(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Y</label>
              <input
                type="number"
                value={selectedElement.y || 0}
                onChange={(e) => handleUpdate({ y: parseInt(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Width</label>
              <input
                type="number"
                value={selectedElement.width || 0}
                onChange={(e) => handleUpdate({ width: parseInt(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Height</label>
              <input
                type="number"
                value={selectedElement.height || 0}
                onChange={(e) => handleUpdate({ height: parseInt(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Text Properties */}
        {selectedElement.type === 'text' && (
          <>
            <div>
              <h4 style={{
                margin: '0 0 8px 0',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569'
              }}>
                Text Properties
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Label</label>
                  <input
                    type="text"
                    value={selectedElement.label || ''}
                    onChange={(e) => handleUpdate({ label: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Binding</label>
                  <select
                    value={selectedElement.binding || ''}
                    onChange={(e) => handleUpdate({ binding: e.target.value || null })}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none'
                    }}
                  >
                    <option value="">None (Static Text)</option>
                    {availableBindings.map((binding) => (
                      <option key={binding.value} value={binding.value}>
                        {binding.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Font Size</label>
                  <input
                    type="number"
                    value={selectedElement.fontSize || 12}
                    onChange={(e) => handleUpdate({ fontSize: parseInt(e.target.value) || 12 })}
                    min="6"
                    max="72"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Font Weight</label>
                  <select
                    value={selectedElement.fontWeight || 'normal'}
                    onChange={(e) => handleUpdate({ fontWeight: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none'
                    }}
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Color</label>
                  <input
                    type="color"
                    value={selectedElement.color || '#000000'}
                    onChange={(e) => handleUpdate({ color: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '2px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                      height: '32px'
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* QR Code Properties */}
        {selectedElement.type === 'qrcode' && (
          <div>
            <h4 style={{
              margin: '0 0 8px 0',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569'
            }}>
              QR Code Properties
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                  Binding <span style={{ color: '#ef4444' }}>*</span>
                  <span style={{ fontSize: '10px', color: '#10b981', marginLeft: '4px', fontWeight: 'bold' }}>(Always uses ItemCode)</span>
                </label>
                <select
                  value="ItemCode"
                  disabled={true}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    background: '#f1f5f9',
                    color: '#64748b',
                    cursor: 'not-allowed'
                  }}
                >
                  <option value="ItemCode">ItemCode (Fixed for QR Codes)</option>
                </select>
                <div style={{ 
                  marginTop: '4px', 
                  fontSize: '10px', 
                  color: '#64748b',
                  fontStyle: 'italic'
                }}>
                  QR codes always display the ItemCode value
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Size</label>
                <input
                  type="number"
                  value={selectedElement.qrSize || 60}
                  onChange={(e) => {
                    const size = parseInt(e.target.value) || 60;
                    handleUpdate({ qrSize: size, width: size, height: size });
                  }}
                  min="20"
                  max="200"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Barcode Properties */}
        {selectedElement.type === 'barcode' && (
          <div>
            <h4 style={{
              margin: '0 0 8px 0',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569'
            }}>
              Barcode Properties
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Binding</label>
                <select
                  value={selectedElement.binding || ''}
                  onChange={(e) => handleUpdate({ binding: e.target.value || null })}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                >
                  <option value="">Select Field</option>
                  {availableBindings.map((binding) => (
                    <option key={binding.value} value={binding.value}>
                      {binding.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Barcode Type</label>
                <select
                  value={selectedElement.barcodeType || 'code128'}
                  onChange={(e) => handleUpdate({ barcodeType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                >
                  <option value="code128">Code 128</option>
                  <option value="code39">Code 39</option>
                  <option value="ean13">EAN-13</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Shape Properties */}
        {selectedElement.type === 'shape' && (
          <div>
            <h4 style={{
              margin: '0 0 8px 0',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569'
            }}>
              Shape Properties
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Shape Type</label>
                <select
                  value={selectedElement.shapeType || 'rectangle'}
                  onChange={(e) => handleUpdate({ shapeType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                >
                  <option value="rectangle">Rectangle</option>
                  <option value="circle">Circle</option>
                  <option value="line">Line</option>
                </select>
              </div>
              {selectedElement.shapeType === 'line' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Direction</label>
                  <select
                    value={selectedElement.lineDirection || 'horizontal'}
                    onChange={(e) => handleUpdate({ lineDirection: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none'
                    }}
                  >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Border Color</label>
                <input
                  type="color"
                  value={selectedElement.borderColor || '#000000'}
                  onChange={(e) => handleUpdate({ borderColor: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '2px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    height: '32px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Border Width</label>
                <input
                  type="number"
                  value={selectedElement.borderWidth || 1}
                  onChange={(e) => handleUpdate({ borderWidth: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="10"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Preview Data Section */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569'
          }}>
            Preview Data
          </h4>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px', 
            fontSize: '11px',
            maxHeight: '300px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            {availableBindings.map((binding) => (
              <div key={binding.value} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', flexShrink: 0, minWidth: '120px' }}>{binding.label}:</span>
                <input
                  type="text"
                  value={labelData[binding.value] || ''}
                  onChange={(e) => onLabelDataChange({ ...labelData, [binding.value]: e.target.value })}
                  style={{
                    width: '60%',
                    padding: '4px 6px',
                    fontSize: '11px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    outline: 'none'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelPropertiesPanel;

