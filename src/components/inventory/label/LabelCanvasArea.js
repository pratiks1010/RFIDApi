import React, { useRef, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaTrash } from 'react-icons/fa';

const LabelCanvasArea = ({
  layout,
  selectedElement,
  onSelect,
  onChange,
  onAddElement,
  onRemoveElement,
  labelData,
  zoomLevel
}) => {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragElement, setDragElement] = useState(null);

  // Get binding value
  const getBindingValue = (binding) => {
    if (!binding) return '';
    return labelData[binding] || '';
  };

  // Handle element click
  const handleElementClick = (e, element) => {
    e.stopPropagation();
    onSelect(element);
  };

  // Handle drag start
  const handleMouseDown = (e, element) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragElement(element);
    const rect = canvasRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left - element.x * zoomLevel,
      y: e.clientY - rect.top - element.y * zoomLevel
    });
    onSelect(element);
  };

  // Handle drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !dragElement) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left - dragStart.x) / zoomLevel;
      const newY = (e.clientY - rect.top - dragStart.y) / zoomLevel;

      onChange({
        ...layout,
        elements: layout.elements.map((el) =>
          el.id === dragElement.id
            ? { ...el, x: Math.max(0, Math.min(newX, layout.page.width - el.width)), y: Math.max(0, Math.min(newY, layout.page.height - el.height)) }
            : el
        ),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragElement(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragElement, dragStart, zoomLevel, layout, onChange]);

  // Render element
  const renderElement = (element) => {
    const isSelected = selectedElement?.id === element.id;
    const style = {
      position: 'absolute',
      left: `${element.x * zoomLevel}px`,
      top: `${element.y * zoomLevel}px`,
      width: `${element.width * zoomLevel}px`,
      height: `${element.height * zoomLevel}px`,
      border: isSelected ? '2px solid #3b82f6' : '1px dashed transparent',
      cursor: 'move',
      zIndex: element.zIndex || 10,
      boxSizing: 'border-box'
    };

    if (element.type === 'text') {
      // Get the binding value if binding exists
      const bindingValue = element.binding ? getBindingValue(element.binding) : '';
      // Get the label text
      const labelText = element.label || '';
      
      // Display format: "Label: Value" if both exist, or just one if only one exists
      let displayText = '';
      if (labelText && bindingValue) {
        displayText = `${labelText}: ${bindingValue}`;
      } else if (labelText) {
        displayText = labelText;
      } else if (bindingValue) {
        displayText = bindingValue;
      } else {
        displayText = 'Text';
      }
      
      return (
        <div
          key={element.id}
          style={style}
          onClick={(e) => handleElementClick(e, element)}
          onMouseDown={(e) => handleMouseDown(e, element)}
        >
          <div style={{
            fontSize: `${(element.fontSize || 12) * zoomLevel}px`,
            fontWeight: element.fontWeight || 'normal',
            color: element.color || '#000000',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {displayText}
          </div>
          {isSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveElement(element.id);
              }}
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: 'none',
                background: '#ef4444',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}
            >
              <FaTrash />
            </button>
          )}
        </div>
      );
    }

    if (element.type === 'qrcode') {
      // QR codes should always use ItemCode value
      // Get ItemCode directly from labelData
      const itemCodeValue = getBindingValue('ItemCode');
      
      return (
        <div
          key={element.id}
          style={style}
          onClick={(e) => handleElementClick(e, element)}
          onMouseDown={(e) => handleMouseDown(e, element)}
        >
          {itemCodeValue ? (
            <QRCodeSVG
              value={String(itemCodeValue)}
              size={element.qrSize * zoomLevel}
              level="M"
              includeMargin={false}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              border: '1px dashed #ccc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#999'
            }}>
              QR Code (ItemCode: {labelData.ItemCode || 'Not set'})
            </div>
          )}
          {isSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveElement(element.id);
              }}
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: 'none',
                background: '#ef4444',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}
            >
              <FaTrash />
            </button>
          )}
        </div>
      );
    }

    if (element.type === 'barcode') {
      const value = getBindingValue(element.binding);
      return (
        <div
          key={element.id}
          style={style}
          onClick={(e) => handleElementClick(e, element)}
          onMouseDown={(e) => handleMouseDown(e, element)}
        >
          <div style={{
            width: '100%',
            height: '100%',
            border: '1px solid #000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${10 * zoomLevel}px`,
            fontWeight: 'bold',
            background: '#ffffff'
          }}>
            {value || 'BARCODE'}
          </div>
          {isSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveElement(element.id);
              }}
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: 'none',
                background: '#ef4444',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}
            >
              <FaTrash />
            </button>
          )}
        </div>
      );
    }

    if (element.type === 'shape') {
      const shapeStyle = {
        width: '100%',
        height: '100%',
        border: `${element.borderWidth || 1}px solid ${element.borderColor || '#000000'}`,
        borderRadius: element.shapeType === 'circle' ? '50%' : '0',
        background: 'transparent'
      };

      if (element.shapeType === 'line') {
        if (element.lineDirection === 'vertical') {
          shapeStyle.width = `${element.borderWidth || 1}px`;
          shapeStyle.height = '100%';
        } else {
          shapeStyle.width = '100%';
          shapeStyle.height = `${element.borderWidth || 1}px`;
        }
      }

      return (
        <div
          key={element.id}
          style={style}
          onClick={(e) => handleElementClick(e, element)}
          onMouseDown={(e) => handleMouseDown(e, element)}
        >
          <div style={shapeStyle} />
          {isSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveElement(element.id);
              }}
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: 'none',
                background: '#ef4444',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}
            >
              <FaTrash />
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      ref={canvasRef}
      className="label-canvas-print-target"
      onClick={() => onSelect(null)}
      style={{
        position: 'relative',
        width: `${layout.page.width * zoomLevel}px`,
        height: `${layout.page.height * zoomLevel}px`,
        background: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        overflow: 'visible'
      }}
    >
      {/* Render all elements */}
      {layout.elements.map((element) => renderElement(element))}
    </div>
  );
};

export default LabelCanvasArea;

