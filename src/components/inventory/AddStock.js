import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FaPlus, 
  FaTrash, 
  FaFileExcel, 
  FaUpload, 
  FaDownload,
  FaSave,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaMap,
  FaColumns,
  FaChevronDown,
  FaTimes,
  FaList
} from 'react-icons/fa';
import { useLoading } from '../../App';
import { rfidService } from '../../services/rfidService';
import { useNotifications } from '../../context/NotificationContext';

// Searchable Dropdown Component
const SearchableDropdown = ({ 
  options = [], 
  value = '', 
  onChange, 
  placeholder = 'Select...', 
  disabled = false,
  required = false,
  label = '',
  style = {},
  tabIndex,
  inputStyle = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get display value
  const displayValue = value || '';

  // Handle option selection
  const handleSelect = (option) => {
    onChange(option);
    setSearchTerm('');
    setIsOpen(false);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    // If user clears the input, clear the selection
    if (!newValue && value) {
      onChange('');
    }
  };

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
    setSearchTerm(value || '');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Reset search term when value changes externally
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [value, isOpen]);

  const defaultInputStyle = {
    width: '100%',
    padding: '8px 32px 8px 12px',
    fontSize: '13px',
    border: '1px solid #f1f1f1',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    background: disabled ? '#f8f9fa' : '#f1f1f1',
    cursor: disabled ? 'not-allowed' : 'text',
    color: disabled ? '#94a3b8' : '#38414a',
    height: '36px',
    minHeight: '36px',
    fontFamily: 'Inter, Poppins, sans-serif',
    fontWeight: 400,
    ...inputStyle
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', ...style }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={handleInputChange}
          placeholder={!value ? placeholder : ''}
          disabled={disabled}
          required={required}
          tabIndex={tabIndex}
          style={defaultInputStyle}
          onFocus={(e) => {
            handleFocus();
            if (!disabled) {
              e.target.style.borderColor = '#0077d4';
              e.target.style.background = '#ffffff';
              e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
            }
            if (!isOpen) {
              e.target.select();
            }
          }}
          onBlur={(e) => {
            if (!disabled) {
              e.target.style.borderColor = '#f1f1f1';
              e.target.style.background = '#f1f1f1';
              e.target.style.boxShadow = 'none';
            }
            // Reset search term when closing if no selection was made
            if (!value) {
              setSearchTerm('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isOpen && filteredOptions.length > 0) {
              e.preventDefault();
              handleSelect(filteredOptions[0]);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const form = e.target.form || e.target.closest('form') || document.querySelector('form');
              if (form) {
                const inputs = Array.from(form.querySelectorAll('input, select, textarea, button')).filter(
                  el => !el.disabled && el.tabIndex >= 0
                );
                const currentIndex = inputs.indexOf(e.target);
                if (currentIndex < inputs.length - 1) {
                  inputs[currentIndex + 1].focus();
                }
              }
            } else if (e.key === 'Escape') {
              setIsOpen(false);
              setSearchTerm('');
            }
          }}
        />
        <div style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {value && !disabled && (
            <FaTimes
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearchTerm('');
              }}
              style={{
                cursor: 'pointer',
                fontSize: '10px',
                color: '#94a3b8',
                pointerEvents: 'auto'
              }}
            />
          )}
          <FaChevronDown
            style={{
              fontSize: '10px',
              color: '#94a3b8',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          />
        </div>
      </div>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          zIndex: 1000,
          maxHeight: '200px',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={index}
                onClick={() => handleSelect(option)}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  color: '#1e293b',
                  transition: 'background-color 0.15s',
                  backgroundColor: value === option ? '#eff6ff' : 'transparent',
                  borderBottom: index < filteredOptions.length - 1 ? '1px solid #f1f5f9' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (value !== option) {
                    e.target.style.backgroundColor = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== option) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {option}
              </div>
            ))
          ) : (
            <div style={{
              padding: '12px',
              fontSize: '12px',
              color: '#94a3b8',
              textAlign: 'center'
            }}>
              No options found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Enhanced Searchable Dropdown with Add New functionality
const SearchableDropdownWithAdd = ({ 
  options = [], 
  value = '', 
  onChange, 
  placeholder = 'Select or type to add...', 
  disabled = false,
  required = false,
  label = '',
  style = {},
  tabIndex,
  inputStyle = {},
  allowAdd = false,
  onAddNew = null,
  fieldType = '', // 'branch', 'counter', 'category', 'product', 'design', 'purity'
  userInfo = null,
  onOptionsUpdate = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntryData, setNewEntryData] = useState({});
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const blurTimerRef = useRef(null);
  const listRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if search term doesn't match any option
  const exactMatch = searchTerm && options.some(opt => opt.toLowerCase() === searchTerm.toLowerCase());
  const showAddOption = allowAdd && searchTerm && !exactMatch && filteredOptions.length === 0;

  // Get display value
  const displayValue = value || '';

  // Handle option selection (used from mousedown so selection works before blur)
  const handleSelect = (option) => {
    onChange(option);
    setSearchTerm('');
    setHighlightedIndex(-1);
    setIsOpen(false);
  };

  // Handle Add New option click
  const handleAddNewClick = () => {
    setNewEntryData({ name: searchTerm });
    setShowAddModal(true);
    setIsOpen(false);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    // If user clears the input, clear the selection
    if (!newValue && value) {
      onChange('');
    }
    // If allowAdd is true and user types something not in options, allow direct input
    if (allowAdd && newValue && !exactMatch && filteredOptions.length === 0) {
      // Allow user to type freely
    }
  };

  // Handle input blur - close dropdown on tab/focus loss; if allowAdd, accept typed value
  const handleBlur = (e) => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    if (allowAdd && searchTerm && !exactMatch && !value) {
      onChange(searchTerm);
      setSearchTerm('');
    }
    if (!disabled) {
      e.target.style.borderColor = '#f1f1f1';
      e.target.style.background = '#f1f1f1';
      e.target.style.boxShadow = 'none';
    }
    // Close dropdown when focus leaves (e.g. Tab) - delay so click on option registers first
    blurTimerRef.current = setTimeout(() => setIsOpen(false), 120);
  };

  // Handle input focus
  const handleFocus = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = null;
    setIsOpen(true);
    setSearchTerm(value || '');
    setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        if (!allowAdd || !searchTerm) {
          setSearchTerm('');
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, allowAdd, searchTerm]);

  // Reset search term when value changes externally
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [value, isOpen]);

  // Keep highlighted index in range when filtered options change
  useEffect(() => {
    if (filteredOptions.length === 0) {
      setHighlightedIndex(-1);
    } else if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(filteredOptions.length - 1);
    }
  }, [filteredOptions.length, highlightedIndex]);

  // Handle saving new entry from modal
  const handleSaveNewEntry = async () => {
    try {
      const entryName = newEntryData.name || searchTerm || '';
      if (!entryName.trim()) return;

      // If onAddNew callback is provided, use it
      if (onAddNew) {
        const result = await onAddNew(fieldType, entryName, newEntryData);
        if (result && result.success) {
          // Update options if callback provided
          if (onOptionsUpdate) {
            onOptionsUpdate(fieldType, entryName);
          }
          onChange(entryName);
          setShowAddModal(false);
          setNewEntryData({});
          setSearchTerm('');
        }
      } else {
        // Simple case: just use the name
        onChange(entryName);
        if (onOptionsUpdate) {
          onOptionsUpdate(fieldType, entryName);
        }
        setShowAddModal(false);
        setNewEntryData({});
        setSearchTerm('');
      }
    } catch (error) {
      console.error('Error adding new entry:', error);
    }
  };

  const defaultInputStyle = {
    width: '100%',
    padding: '8px 32px 8px 12px',
    fontSize: '13px',
    border: '1px solid #f1f1f1',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    background: disabled ? '#f8f9fa' : '#f1f1f1',
    cursor: disabled ? 'not-allowed' : 'text',
    color: disabled ? '#94a3b8' : '#38414a',
    height: '36px',
    minHeight: '36px',
    fontFamily: 'Inter, Poppins, sans-serif',
    fontWeight: 400,
    ...inputStyle
  };

  // Get field-specific form fields for the modal
  const getModalFields = () => {
    const baseFields = [{ key: 'name', label: 'Name', type: 'text', required: true, placeholder: `Enter ${fieldType} name` }];
    
    switch (fieldType) {
      case 'branch':
        return [
          ...baseFields,
          { key: 'address', label: 'Address', type: 'text', required: false, placeholder: 'Enter branch address' },
          { key: 'phone', label: 'Phone', type: 'text', required: false, placeholder: 'Enter phone number' },
          { key: 'email', label: 'Email', type: 'email', required: false, placeholder: 'Enter email address' }
        ];
      case 'counter':
        return [
          ...baseFields,
          { key: 'branchId', label: 'Branch', type: 'text', required: false, placeholder: 'Select branch' },
          { key: 'location', label: 'Location', type: 'text', required: false, placeholder: 'Enter location' }
        ];
      case 'category':
        return [
          ...baseFields,
          { key: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Enter description' }
        ];
      case 'product':
        return [
          ...baseFields,
          { key: 'categoryId', label: 'Category', type: 'text', required: false, placeholder: 'Select category' },
          { key: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Enter description' }
        ];
      case 'design':
        return [
          ...baseFields,
          { key: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Enter description' }
        ];
      case 'purity':
        return [
          ...baseFields,
          { key: 'value', label: 'Purity Value', type: 'text', required: false, placeholder: 'e.g., 22CT, 18K' },
          { key: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Enter description' }
        ];
      default:
        return baseFields;
    }
  };

  return (
    <>
      <div ref={dropdownRef} style={{ position: 'relative', width: '100%', ...style }}>
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchTerm : displayValue}
            onChange={handleInputChange}
            placeholder={!value ? placeholder : ''}
            disabled={disabled}
            required={required}
            tabIndex={tabIndex}
            style={defaultInputStyle}
            onFocus={(e) => {
              handleFocus();
              if (!disabled) {
                e.target.style.borderColor = '#0077d4';
                e.target.style.background = '#ffffff';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
              }
              if (!isOpen) {
                e.target.select();
              }
            }}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                setIsOpen(false);
                if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                blurTimerRef.current = null;
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!isOpen) {
                  setIsOpen(true);
                  setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
                } else if (filteredOptions.length > 0) {
                  setHighlightedIndex(i => (i < filteredOptions.length - 1 ? i + 1 : i));
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (isOpen && filteredOptions.length > 0) {
                  setHighlightedIndex(i => (i > 0 ? i - 1 : 0));
                }
              } else if (e.key === 'Enter') {
                if (isOpen && filteredOptions.length > 0 && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                  e.preventDefault();
                  handleSelect(filteredOptions[highlightedIndex]);
                } else if (allowAdd && searchTerm && !filteredOptions.some(opt => opt.toLowerCase() === searchTerm.toLowerCase())) {
                  e.preventDefault();
                  if (showAddOption) handleAddNewClick();
                  else { onChange(searchTerm); setIsOpen(false); setSearchTerm(''); }
                } else {
                e.preventDefault();
                const form = e.target.form || e.target.closest('form') || document.querySelector('form');
                if (form) {
                  const inputs = Array.from(form.querySelectorAll('input, select, textarea, button')).filter(
                    el => !el.disabled && el.tabIndex >= 0
                  );
                  const currentIndex = inputs.indexOf(e.target);
                  if (currentIndex < inputs.length - 1) {
                    inputs[currentIndex + 1].focus();
                    }
                  }
                }
              } else if (e.key === 'Escape') {
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
              }
            }}
          />
          <div style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {value && !disabled && (
              <FaTimes
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                  setSearchTerm('');
                }}
                style={{
                  cursor: 'pointer',
                  fontSize: '10px',
                  color: '#94a3b8',
                  pointerEvents: 'auto'
                }}
              />
            )}
            <FaChevronDown
              style={{
                fontSize: '10px',
                color: '#94a3b8',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            />
          </div>
        </div>

        {isOpen && !disabled && (
          <div
            ref={listRef}
            style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto',
            overflowX: 'hidden'
            }}
          >
            {filteredOptions.length > 0 ? (
              <>
                {filteredOptions.map((option, index) => (
                  <div
                    key={index}
                    role="option"
                    aria-selected={index === highlightedIndex || value === option}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(option);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: '#1e293b',
                      transition: 'background-color 0.15s',
                      backgroundColor: (index === highlightedIndex || value === option) ? '#eff6ff' : 'transparent',
                      borderBottom: index < filteredOptions.length - 1 ? '1px solid #f1f5f9' : 'none'
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseLeave={() => setHighlightedIndex(-1)}
                  >
                    {option}
                  </div>
                ))}
                {showAddOption && (
                  <div
                    onMouseDown={(e) => { e.preventDefault(); handleAddNewClick(); }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: '#0077d4',
                      fontWeight: 500,
                      borderTop: '1px solid #e2e8f0',
                      backgroundColor: '#f0f9ff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#e0f2fe';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f0f9ff';
                    }}
                  >
                    <FaPlus style={{ fontSize: '10px' }} />
                    <span>Add "{searchTerm}"</span>
                  </div>
                )}
              </>
            ) : showAddOption ? (
              <div
                onMouseDown={(e) => { e.preventDefault(); handleAddNewClick(); }}
                style={{
                  padding: '12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  color: '#0077d4',
                  fontWeight: 500,
                  textAlign: 'center',
                  backgroundColor: '#f0f9ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e0f2fe';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f0f9ff';
                }}
              >
                <FaPlus style={{ fontSize: '10px' }} />
                <span>Add "{searchTerm}"</span>
              </div>
            ) : (
              <div style={{
                padding: '12px',
                fontSize: '12px',
                color: '#94a3b8',
                textAlign: 'center'
              }}>
                {allowAdd ? 'Type to add new or select from list' : 'No options found'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add New Entry Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAddModal(false);
            setNewEntryData({});
          }
        }}
        >
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#232a36',
                margin: 0
              }}>
                Add New {fieldType.charAt(0).toUpperCase() + fieldType.slice(1)}
              </h3>
              <FaTimes
                onClick={() => {
                  setShowAddModal(false);
                  setNewEntryData({});
                }}
                style={{
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#94a3b8'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {getModalFields().map((field) => (
                <div key={field.key}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#0077d4',
                    marginBottom: '6px'
                  }}>
                    {field.label}
                    {field.required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
                  </label>
                  <input
                    type={field.type}
                    value={newEntryData[field.key] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewEntryData({ ...newEntryData, [field.key]: val });
                    }}
                    placeholder={field.placeholder}
                    required={field.required}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #f1f1f1',
                      borderRadius: '8px',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box',
                      background: '#f1f1f1',
                      color: '#38414a',
                      height: '36px',
                      fontFamily: 'Inter, Poppins, sans-serif',
                      fontWeight: 400
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0077d4';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#f1f1f1';
                      e.target.style.background = '#f1f1f1';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px'
            }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewEntryData({});
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#64748b',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f1f5f9';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewEntry}
                disabled={!newEntryData.name?.trim() && !searchTerm?.trim()}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#ffffff',
                  background: (!newEntryData.name?.trim() && !searchTerm?.trim()) ? '#94a3b8' : '#0077d4',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (!newEntryData.name?.trim() && !searchTerm?.trim()) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (newEntryData.name?.trim() || searchTerm?.trim()) {
                    e.target.style.background = '#005ba3';
                  }
                }}
                onMouseLeave={(e) => {
                  if (newEntryData.name?.trim() || searchTerm?.trim()) {
                    e.target.style.background = '#0077d4';
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const AddStock = () => {
  const navigate = useNavigate();
  const { loading, setLoading } = useLoading();
  const { addNotification } = useNotifications();
  const fileInputRef = useRef(null);
  const [activeSection, setActiveSection] = useState(1); // 1: Stock Entry, 3: Bulk Upload
  const [addedRecords, setAddedRecords] = useState([]); // Records added via "+ Add", submitted together on "Add Stock"
  const [addedRecordTids, setAddedRecordTids] = useState([]); // per-row { tid: string|null, loading: boolean } for RFID check in table
  const [addStockQuantity, setAddStockQuantity] = useState(1); // Quantity: add N rows with same details
  const [addFormValidationErrors, setAddFormValidationErrors] = useState([]); // Why data was not added (shown below Add button)
  const [showStoneDiamondModal, setShowStoneDiamondModal] = useState(false);
  const [stoneDiamondData, setStoneDiamondData] = useState({ type: 'stone', productIndex: null }); // 'stone' or 'diamond', productIndex for multiple entry
  const [userInfo, setUserInfo] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({
    RFIDNumber: '',
    Itemcode: ''
  });
  const [tidByBarcode, setTidByBarcode] = useState(null); // TID value from GetTidByBarcode for current RFID
  const [tidLoading, setTidLoading] = useState(false);

  // Single Product Form State
  const [singleProduct, setSingleProduct] = useState({
    client_code: '',
    RFIDNumber: '',
    Itemcode: '',
    category_id: '',
    product_id: '',
    design_id: '',
    purity_id: '',
    grosswt: '',
    stonewt: '',
    netwt: '',
    box_details: '',
    size: 0,
    stoneamount: '',
    HallmarkAmount: '',
    MakingPerGram: '',
    MakingPercentage: '',
    MakingFixedAmt: '',
    MRP: '',
    imageurl: '',
    status: 'ApiActive',
    stoneList: []
  });

  // Multiple Products Form State
  const [multipleProducts, setMultipleProducts] = useState([]);

  // Template form for adding products (hidden after adding)
  const [productTemplate, setProductTemplate] = useState({
    RFIDNumber: '',
    Itemcode: '',
    quantity: 1,
    category_id: '',
    product_id: '',
    design_id: '',
    purity_id: '',
    grosswt: '',
    stonewt: '',
    netwt: '',
    box_details: '',
    size: 0,
    stoneamount: '',
    HallmarkAmount: '',
    MakingPerGram: '',
    MakingPercentage: '',
    MakingFixedAmt: '',
    MRP: '',
    imageurl: '',
    status: 'ApiActive' // Always ApiActive, non-editable
  });

  // Helper function to generate sequential codes
  const generateSequentialCode = (baseCode, index) => {
    if (!baseCode) return '';
    const code = String(baseCode).toUpperCase();
    // Extract base (letters) and number from code
    // Examples: "SOP004" -> base: "SOP", number: 4; "CZ5898" -> base: "CZ", number: 5898
    const match = code.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      const base = match[1];
      const number = parseInt(match[2], 10);
      const newNumber = number + index;
      const paddedNumber = String(newNumber).padStart(match[2].length, '0');
      return `${base}${paddedNumber}`;
    }
    const lastNumberMatch = code.match(/(\d+)([^0-9]*)$/);
    if (lastNumberMatch) {
      const number = parseInt(lastNumberMatch[1], 10);
      const suffix = lastNumberMatch[2] || '';
      const newNumber = number + index;
      const paddedNumber = String(newNumber).padStart(lastNumberMatch[1].length, '0');
      return code.replace(/\d+([^0-9]*)$/, `${paddedNumber}${suffix}`);
    }
    return `${code}${index > 0 ? index : ''}`;
  };
  const [showTemplateForm, setShowTemplateForm] = useState(true);
  
  // Pagination and search for multiple products
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProducts, setExpandedProducts] = useState(new Set());

  // Bulk Upload State
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploadType, setBulkUploadType] = useState('excel');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [excelColumns, setExcelColumns] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({});
  const [showMappingSidebar, setShowMappingSidebar] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [rawExcelData, setRawExcelData] = useState([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, percentage: 0, successCount: 0, errorCount: 0 });
  const [uploading, setUploading] = useState(false);
  const [batchErrors, setBatchErrors] = useState([]);
  const [serverMessages, setServerMessages] = useState([]);

  // Common shared state
  const [sharedData, setSharedData] = useState({
    branch_name: '',
    counter_name: '',
    Itemcode: ''
  });

  // Branches and Counters data
  const [branches, setBranches] = useState([]);
  const [counters, setCounters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [purities, setPurities] = useState([]);
  const [loadingBranchesCounters, setLoadingBranchesCounters] = useState(false);
  const [loadingMasterData, setLoadingMasterData] = useState(false);

  // Locally added entries (for entries added during form session)
  const [localBranches, setLocalBranches] = useState([]);
  const [localCounters, setLocalCounters] = useState([]);
  const [localCategories, setLocalCategories] = useState([]);
  const [localProducts, setLocalProducts] = useState([]);
  const [localDesigns, setLocalDesigns] = useState([]);
  const [localPurities, setLocalPurities] = useState([]);

  // Normalize response data helper
  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      return data.data || data.items || data.results || data.list || [];
    }
    return [];
  };

  // Fetch branches and counters
  const fetchBranchesAndCounters = async () => {
    if (!userInfo?.ClientCode) return;
    
    setLoadingBranchesCounters(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const requestBody = { ClientCode: userInfo.ClientCode };

      const [branchesResponse, countersResponse] = await Promise.all([
        axios.post('https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllBranchMaster', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllCounters', requestBody, { headers })
      ]);

      setBranches(normalizeArray(branchesResponse.data));
      setCounters(normalizeArray(countersResponse.data));
    } catch (error) {
      console.error('Error fetching branches and counters:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load branches and counters. Please refresh the page.'
      });
    } finally {
      setLoadingBranchesCounters(false);
    }
  };

  // Fetch master data (Category, Product, Design, Purity)
  const fetchMasterData = async () => {
    if (!userInfo?.ClientCode) return;
    
    setLoadingMasterData(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const requestBody = { ClientCode: userInfo.ClientCode };
      

      const [
        categoriesResponse,
        productsResponse,
        designsResponse,
        puritiesResponse
      ] = await Promise.all([
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllCategory', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllProductMaster', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllDesign', requestBody, { headers }),
        axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllPurity', requestBody, { headers })
      ]);

      setCategories(normalizeArray(categoriesResponse.data));
      setProducts(normalizeArray(productsResponse.data));
      setDesigns(normalizeArray(designsResponse.data));
      setPurities(normalizeArray(puritiesResponse.data));
    } catch (error) {
      console.error('Error fetching master data:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load master data. Please refresh the page.'
      });
    } finally {
      setLoadingMasterData(false);
    }
  };

  // Helper functions to get combined options (API + local)
  const getBranchOptions = () => {
    const apiBranches = branches.map(b => b.BranchName || b.Name || b.branchName || b.name || '').filter(Boolean);
    return [...new Set([...apiBranches, ...localBranches])].sort();
  };

  const getCounterOptions = () => {
    const apiCounters = counters.map(c => c.CounterName || c.Name || c.counterName || c.name || '').filter(Boolean);
    return [...new Set([...apiCounters, ...localCounters])];
  };

  const getCategoryOptions = () => {
    const apiCategories = categories.map(c => c.CategoryName || c.Name || c.Category || c.categoryName || c.name || c.category || '').filter(Boolean);
    return [...new Set([...apiCategories, ...localCategories])];
  };

  const getProductOptions = () => {
    const apiProducts = products.map(p => p.ProductName || p.Name || p.Product || p.productName || p.name || p.product || '').filter(Boolean);
    return [...new Set([...apiProducts, ...localProducts])];
  };

  const getDesignOptions = (productName) => {
    let apiDesigns = designs.map(d => ({ name: d.DesignName || d.Name || d.Design || d.designName || d.name || d.design || '', item: d })).filter(x => x.name);
    if (productName) {
      apiDesigns = apiDesigns.filter(d => {
        const prod = d.item.ProductName || d.item.Product || d.item.productName || d.item.product || '';
        const prodId = d.item.ProductId || d.item.ProductID || d.item.productId || '';
        return !prod || prod === productName || prodId === productName;
      });
    }
    const names = apiDesigns.map(d => d.name);
    return [...new Set([...names, ...localDesigns])].sort();
  };

  const getPurityOptions = (categoryName, productName) => {
    let apiPurities = purities.map(p => ({ name: p.PurityName || p.Name || p.Purity || p.purityName || p.name || p.purity || '', item: p })).filter(x => x.name);
    if (categoryName || productName) {
      apiPurities = apiPurities.filter(p => {
        const cat = p.item.CategoryName || p.item.Category || p.item.categoryName || p.item.category || '';
        const prod = p.item.ProductName || p.item.Product || p.item.productName || p.item.product || '';
        const catMatch = !categoryName || !cat || cat === categoryName;
        const prodMatch = !productName || !prod || prod === productName;
        return catMatch && prodMatch;
      });
    }
    const names = apiPurities.map(p => p.name);
    return [...new Set([...names, ...localPurities])].sort();
  };

  // Handle adding new entries
  const handleAddNewEntry = async (fieldType, entryName, entryData) => {
    try {
      // Add to local state
      switch (fieldType) {
        case 'branch':
          if (!localBranches.includes(entryName)) {
            setLocalBranches([...localBranches, entryName]);
          }
          break;
        case 'counter':
          if (!localCounters.includes(entryName)) {
            setLocalCounters([...localCounters, entryName]);
          }
          break;
        case 'category':
          if (!localCategories.includes(entryName)) {
            setLocalCategories([...localCategories, entryName]);
          }
          break;
        case 'product':
          if (!localProducts.includes(entryName)) {
            setLocalProducts([...localProducts, entryName]);
          }
          break;
        case 'design':
          if (!localDesigns.includes(entryName)) {
            setLocalDesigns([...localDesigns, entryName]);
          }
          break;
        case 'purity':
          if (!localPurities.includes(entryName)) {
            setLocalPurities([...localPurities, entryName]);
          }
          break;
      }

      addNotification({
        type: 'success',
        title: 'Success',
        message: `${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} "${entryName}" added successfully.`
      });

      return { success: true };
    } catch (error) {
      console.error('Error adding new entry:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: `Failed to add ${fieldType}. Please try again.`
      });
      return { success: false };
    }
  };

  // Handle options update after adding new entry
  const handleOptionsUpdate = (fieldType, newValue) => {
    // This is already handled in handleAddNewEntry, but kept for compatibility
    switch (fieldType) {
      case 'branch':
        if (!localBranches.includes(newValue)) {
          setLocalBranches([...localBranches, newValue]);
        }
        break;
      case 'counter':
        if (!localCounters.includes(newValue)) {
          setLocalCounters([...localCounters, newValue]);
        }
        break;
      case 'category':
        if (!localCategories.includes(newValue)) {
          setLocalCategories([...localCategories, newValue]);
        }
        break;
      case 'product':
        if (!localProducts.includes(newValue)) {
          setLocalProducts([...localProducts, newValue]);
        }
        break;
      case 'design':
        if (!localDesigns.includes(newValue)) {
          setLocalDesigns([...localDesigns, newValue]);
        }
        break;
      case 'purity':
        if (!localPurities.includes(newValue)) {
          setLocalPurities([...localPurities, newValue]);
        }
        break;
    }
  };

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsed = JSON.parse(storedUserInfo);
        setUserInfo(parsed);
        setSingleProduct(prev => ({
          ...prev,
          client_code: parsed.ClientCode || ''
        }));
      } catch (err) {
        console.error('Error parsing user info:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (userInfo?.ClientCode) {
      fetchBranchesAndCounters();
      fetchMasterData();
      fetchTemplates();
    }
  }, [userInfo?.ClientCode]);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch templates
  const fetchTemplates = async () => {
    if (!userInfo?.ClientCode) return;
    
    setLoadingTemplates(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const requestBody = { ClientCode: userInfo.ClientCode };

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/Invoice/alltemplate',
        requestBody,
        { headers }
      );

      const normalizeArray = (data) => {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
          return data.data || data.items || data.results || data.list || [];
        }
        return [];
      };

      setTemplates(normalizeArray(response.data));
    } catch (error) {
      console.error('Error fetching templates:', error);
      // Don't show error notification as templates are optional
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Save template
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please enter a template name'
      });
      return;
    }

    if (Object.keys(fieldMappings).length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please map at least one field before saving'
      });
      return;
    }

    setSavingTemplate(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };

      const payload = {
        TemplateName: templateName.trim(),
        Template: JSON.stringify(fieldMappings),
        ClientCode: userInfo?.ClientCode
      };

      await axios.post(
        'https://rrgold.loyalstring.co.in/api/Invoice/CreateTemplate',
        payload,
        { headers }
      );

      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Template saved successfully!'
      });

      setTemplateName('');
      await fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to save template'
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  // Apply template
  const applyTemplate = () => {
    if (!selectedTemplate) return;

    const template = templates.find(t => 
      (t.Id || t.id || t.TemplateId || t.templateId) === selectedTemplate
    );

    if (template) {
      try {
        let templateData = {};
        
        // Handle double-encoded JSON string
        if (typeof template.TemplateData === 'string') {
          try {
            // First parse to get the string
            const firstParse = JSON.parse(template.TemplateData);
            // If it's still a string, parse again
            if (typeof firstParse === 'string') {
              templateData = JSON.parse(firstParse);
            } else {
              templateData = firstParse;
            }
          } catch (e) {
            // If single parse fails, try direct parse
            templateData = JSON.parse(template.TemplateData);
          }
        } else {
          templateData = template.TemplateData || template.Template || {};
        }
        
        setFieldMappings(templateData);
        addNotification({
          type: 'success',
          title: 'Template Applied',
          message: 'Template mappings applied successfully!'
        });
      } catch (error) {
        console.error('Error parsing template:', error);
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to apply template'
        });
      }
    }
  };

  // Process Excel data with mappings (supports multiple stones/diamonds per row via StoneName_2, DiamondName_2, etc.)
  const processExcelDataWithMappings = (jsonData, mappings) => {
    const preview = [];
    const errors = [];

    const stoneBaseKeys = ['StoneName', 'StoneWeight', 'StonePieces', 'StoneRate', 'StoneAmount', 'StoneDescription', 'StoneLessPercent', 'StoneCertificate', 'StoneSettingType', 'StoneRatePerPiece', 'StoneRateKarate', 'StoneStatusType'];
    const diamondBaseKeys = ['DiamondName', 'DiamondWeight', 'DiamondSellRate', 'DiamondPieces', 'DiamondClarity', 'DiamondColour', 'DiamondCut', 'DiamondShape', 'DiamondSize', 'DiamondCertificate', 'DiamondSettingType', 'DiamondSellAmount', 'DiamondPurchaseAmount', 'DiamondDescription', 'DiamondMargin', 'TotalDiamondWeight'];
    const numericFields = ['grosswt', 'stonewt', 'diamondheight', 'diamondweight', 'netwt', 'stoneamount', 'diamondAmount', 'HallmarkAmount', 'MakingPerGram', 'MakingPercentage', 'MakingFixedAmt', 'MRP'];
    const stoneNumericFields = ['StoneWeight', 'StonePieces', 'StoneRate', 'StoneAmount', 'StoneLessPercent', 'StoneRatePerPiece', 'StoneRateKarate'];
    const diamondNumericFields = ['DiamondWeight', 'DiamondSellRate', 'DiamondPieces', 'DiamondSize', 'DiamondSellAmount', 'DiamondPurchaseAmount', 'DiamondMargin', 'TotalDiamondWeight'];

    const getStoneBaseKey = (key) => {
      const m = key.match(/^(Stone\w+)(?:_(\d+))?$/);
      return m ? { baseKey: m[1], index: m[2] ? parseInt(m[2], 10) : 1 } : null;
    };
    const getDiamondBaseKey = (key) => {
      const m = key.match(/^(Diamond\w+)(?:_(\d+))?$/);
      return m ? { baseKey: m[1], index: m[2] ? parseInt(m[2], 10) : 1 } : null;
    };
    const isStoneField = (key) => getStoneBaseKey(key) !== null;
    const isDiamondField = (key) => getDiamondBaseKey(key) !== null;

    jsonData.forEach((row, index) => {
      const product = {
        client_code: userInfo?.ClientCode || '',
        branch_id: '',
        counter_id: '',
        RFIDNumber: '',
        Itemcode: '',
        category_id: '',
        product_id: '',
        design_id: '',
        purity_id: '',
        grosswt: '0',
        stonewt: '0',
        diamondheight: '0',
        diamondweight: '0',
        netwt: '0',
        box_details: '',
        size: 0,
        stoneamount: '0',
        diamondAmount: '0',
        HallmarkAmount: '0',
        MakingPerGram: '0',
        MakingPercentage: '0',
        MakingFixedAmt: '0',
        MRP: '0',
        imageurl: '',
        status: 'ApiActive',
        Stones: [],
        Diamonds: []
      };

      const stoneEntries = {};
      const diamondEntries = {};

      const setStoneValue = (entry, baseKey, value) => {
        if (stoneNumericFields.includes(baseKey)) {
          entry[baseKey] = value !== '' && value !== null && value !== undefined ? String(value) : '0';
            } else {
          entry[baseKey] = value !== null && value !== undefined && value !== '' ? String(value).trim() : '';
        }
        if (baseKey === 'StoneDescription') {
          entry['Description'] = entry[baseKey];
          delete entry['StoneDescription'];
        }
      };
      const setDiamondValue = (entry, baseKey, value) => {
        if (diamondNumericFields.includes(baseKey)) {
          entry[baseKey] = value !== '' && value !== null && value !== undefined ? String(value) : '0';
            } else {
          entry[baseKey] = value !== null && value !== undefined && value !== '' ? String(value).trim() : '';
        }
        if (baseKey === 'DiamondDescription') {
          entry['Description'] = entry[baseKey];
          delete entry['DiamondDescription'];
        }
        if (baseKey === 'DiamondCertificate') {
          entry['Certificate'] = entry[baseKey];
          delete entry['DiamondCertificate'];
        }
        if (baseKey === 'DiamondSettingType') {
          entry['SettingType'] = entry[baseKey];
          delete entry['DiamondSettingType'];
        }
      };

      // Apply mappings
      Object.keys(mappings).forEach(fieldKey => {
        const excelColumn = mappings[fieldKey];
        if (excelColumn && row[excelColumn] !== undefined && row[excelColumn] !== null) {
          const value = row[excelColumn];

          const stoneInfo = getStoneBaseKey(fieldKey);
          if (stoneInfo && stoneBaseKeys.includes(stoneInfo.baseKey)) {
            const idx = stoneInfo.index;
            if (!stoneEntries[idx]) stoneEntries[idx] = {};
            setStoneValue(stoneEntries[idx], stoneInfo.baseKey, value);
            return;
          }
          const diamondInfo = getDiamondBaseKey(fieldKey);
          if (diamondInfo && diamondBaseKeys.includes(diamondInfo.baseKey)) {
            const idx = diamondInfo.index;
            if (!diamondEntries[idx]) diamondEntries[idx] = {};
            setDiamondValue(diamondEntries[idx], diamondInfo.baseKey, value);
            return;
          }

          // Handle main product numeric fields
          if (numericFields.includes(fieldKey)) {
            product[fieldKey] = value !== '' && value !== null && value !== undefined ? String(value) : '0';
          } else if (fieldKey === 'size') {
            product[fieldKey] = value !== '' && value !== null && value !== undefined ? Number(value) : 0;
          } else {
            let stringValue = '';
            if (value !== null && value !== undefined && value !== '') {
              stringValue = typeof value === 'number' ? String(value) : String(value).trim();
            }
            product[fieldKey] = stringValue;
          }
        }
      });

      const sortedStoneIndexes = Object.keys(stoneEntries).map(Number).sort((a, b) => a - b);
      sortedStoneIndexes.forEach(i => {
        if (Object.keys(stoneEntries[i]).length > 0) product.Stones.push(stoneEntries[i]);
      });
      const sortedDiamondIndexes = Object.keys(diamondEntries).map(Number).sort((a, b) => a - b);
      sortedDiamondIndexes.forEach(i => {
        if (Object.keys(diamondEntries[i]).length > 0) product.Diamonds.push(diamondEntries[i]);
      });

      // Use shared data for branch and counter if not mapped
      if (!product.branch_id && sharedData.branch_name) {
        product.branch_id = sharedData.branch_name;
      }
      if (!product.counter_id && sharedData.counter_name) {
        product.counter_id = sharedData.counter_name;
      }

      // Validate product
      const rowErrors = validateProduct(product, true);
      if (rowErrors.length > 0) {
        errors.push(`Row ${index + 2}: ${rowErrors.join(', ')}`);
      }

      preview.push(product);
    });

    return { preview, errors };
  };

  // Get branch ID from branch name
  const getBranchId = (branchName) => {
    if (!branchName) return '';
    const branch = branches.find(b => 
      b.BranchName === branchName || 
      b.Name === branchName || 
      b.branchName === branchName ||
      b.name === branchName
    );
    return branch ? (branch.Id || branch.id || branch.BranchId || '') : '';
  };

  // Get counter ID from counter name
  const getCounterId = (counterName) => {
    if (!counterName) return '';
    const counter = counters.find(c => 
      c.CounterName === counterName || 
      c.Name === counterName || 
      c.counterName === counterName ||
      c.name === counterName
    );
    return counter ? (counter.Id || counter.id || counter.CounterId || '') : '';
  };

  // Get category ID from category name
  const getCategoryId = (categoryName) => {
    if (!categoryName) return '';
    const category = categories.find(c => 
      c.CategoryName === categoryName || 
      c.Name === categoryName || 
      c.Category === categoryName ||
      c.categoryName === categoryName ||
      c.name === categoryName ||
      c.category === categoryName
    );
    return category ? (category.Id || category.id || category.CategoryId || categoryName) : categoryName;
  };

  // Get product ID from product name
  const getProductId = (productName) => {
    if (!productName) return '';
    // Check ProductName first to match API response
    const product = products.find(p => 
      p.ProductName === productName || 
      p.productName === productName ||
      p.Name === productName || 
      p.Product === productName ||
      p.name === productName ||
      p.product === productName
    );
    return product ? (product.Id || product.id || product.ProductId || productName) : productName;
  };

  // Get design ID from design name
  const getDesignId = (designName) => {
    if (!designName) return '';
    // Check DesignName first to match API response
    const design = designs.find(d => 
      d.DesignName === designName || 
      d.designName === designName ||
      d.Name === designName || 
      d.Design === designName ||
      d.name === designName ||
      d.design === designName
    );
    return design ? (design.Id || design.id || design.DesignId || designName) : designName;
  };

  // Get purity ID from purity name
  const getPurityId = (purityName) => {
    if (!purityName) return '';
    // Check PurityName first to match API response
    const purity = purities.find(p => 
      p.PurityName === purityName || 
      p.purityName === purityName ||
      p.Name === purityName || 
      p.Purity === purityName ||
      p.name === purityName ||
      p.purity === purityName
    );
    return purity ? (purity.Id || purity.id || purity.PurityId || purityName) : purityName;
  };

  // Reset single product form
  const resetSingleForm = () => {
    setSingleProduct({
      client_code: userInfo?.ClientCode || '',
      RFIDNumber: '',
      Itemcode: '',
      category_id: '',
      product_id: '',
      design_id: '',
      purity_id: '',
      grosswt: '',
      stonewt: '',
      netwt: '',
      box_details: '',
      size: 0,
      stoneamount: '',
      HallmarkAmount: '',
      MakingPerGram: '',
      MakingPercentage: '',
      MakingFixedAmt: '',
      MRP: '',
      imageurl: '',
      status: 'ApiActive',
      stoneList: []
    });
    // Clear field errors
    setFieldErrors({
      RFIDNumber: '',
      Itemcode: ''
    });
  };

  // Add products based on quantity
  const handleAddProducts = () => {
    // Validate required fields in product template
    // RFID Number is now optional - removed validation
    if (!productTemplate.Itemcode) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill Item Code for this product'
      });
      return;
    }

    // Validate required fields in product template
    const errors = validateProduct(productTemplate, false, []);
    if (errors.length > 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: `Please fill required fields: ${errors.join(', ')}`
      });
      return;
    }

    // Validate quantity
    const quantity = productTemplate.quantity || 1;
    if (quantity < 1 || quantity > 100) {
      addNotification({
        type: 'error',
        title: 'Invalid Quantity',
        message: 'Quantity must be between 1 and 100'
      });
      return;
    }

    // Get existing codes to check for conflicts
    const existingRFIDs = multipleProducts.map(p => p.RFIDNumber);
    const existingItemCodes = multipleProducts.map(p => p.Itemcode);
    
    // Generate sequential products
    const newProducts = [];
    for (let i = 0; i < quantity; i++) {
      const sequentialItemCode = i === 0 
        ? productTemplate.Itemcode 
        : generateSequentialCode(productTemplate.Itemcode, i);
      
      const sequentialRFID = i === 0 
        ? productTemplate.RFIDNumber 
        : generateSequentialCode(productTemplate.RFIDNumber, i);
      
      // Check for duplicates
      if (existingItemCodes.includes(sequentialItemCode)) {
        addNotification({
          type: 'error',
          title: 'Duplicate Item Code',
          message: `Item Code "${sequentialItemCode}" already exists. Please use a different base code.`
        });
        return;
      }
      
      if (existingRFIDs.includes(sequentialRFID)) {
        addNotification({
          type: 'error',
          title: 'Duplicate RFID',
          message: `RFID Number "${sequentialRFID}" already exists. Please use a different base code.`
        });
        return;
      }
      
      newProducts.push({
        ...productTemplate,
        Itemcode: sequentialItemCode,
        RFIDNumber: sequentialRFID,
        quantity: 1 // Each product has quantity 1
      });
      
      existingItemCodes.push(sequentialItemCode);
      existingRFIDs.push(sequentialRFID);
    }

    setMultipleProducts(prev => [...prev, ...newProducts]);
    
    // Reset template form
    setProductTemplate({
      RFIDNumber: '',
      Itemcode: '',
      quantity: 1,
      category_id: '',
      product_id: '',
      design_id: '',
      purity_id: '',
      grosswt: '',
      stonewt: '',
      diamondweight: '',
      netwt: '',
      box_details: '',
      size: 0,
      stoneamount: '',
      diamondAmount: '',
      HallmarkAmount: '',
      MakingPerGram: '',
      MakingPercentage: '',
      MakingFixedAmt: '',
      MRP: '',
      imageurl: '',
      status: 'ApiActive'
    });
    setShowTemplateForm(false);

    addNotification({
      type: 'success',
      title: 'Products Added',
      message: quantity > 1 
        ? `${quantity} products added successfully with sequential codes! You can now edit them or add more products.`
        : 'Product added successfully! You can now edit it or add more products.'
    });
  };

  // Show template form again
  const showAddProductForm = () => {
    setShowTemplateForm(true);
  };

  // Build one record from current form (same details; RFID and Itemcode can be overridden)
  const buildRecordFromForm = (rfidOverride, itemCodeOverride) => {
    const rfidValue = rfidOverride != null ? rfidOverride : singleProduct.RFIDNumber || '';
    const itemCodeValue = itemCodeOverride != null ? itemCodeOverride : singleProduct.Itemcode || '';
    const record = {
    category_id: String(singleProduct.category_id || ''),
    product_id: String(singleProduct.product_id || ''),
    design_id: String(singleProduct.design_id || ''),
    purity_id: String(singleProduct.purity_id || ''),
    grosswt: String(singleProduct.grosswt || '0'),
    stonewt: String(singleProduct.stonewt || '0'),
    netwt: String(singleProduct.netwt || '0'),
    box_details: String(singleProduct.box_details || ''),
    size: Number(singleProduct.size || 0),
    stoneamount: String(singleProduct.stoneamount || '0'),
    HallmarkAmount: String(singleProduct.HallmarkAmount || '0'),
    MakingPerGram: String(singleProduct.MakingPerGram || '0'),
    MakingPercentage: String(singleProduct.MakingPercentage || '0'),
    MakingFixedAmt: String(singleProduct.MakingFixedAmt || '0'),
    MRP: String(singleProduct.MRP || '0'),
    status: 'ApiActive',
    stoneList: Array.isArray(singleProduct.stoneList) ? singleProduct.stoneList : []
  };
    // Only add RFIDNumber and Itemcode if they have values
    if (rfidValue.trim()) {
      record.RFIDNumber = String(rfidValue);
    }
    if (itemCodeValue.trim()) {
      record.Itemcode = String(itemCodeValue);
    }
    return record;
  };

  // Add current form data to record list. When Quantity > 1, first row uses form RFID/ItemCode; rest have empty RFID/ItemCode for user to fill in the table.
  const handleAddToRecordList = () => {
    const errors = [];
    if (!singleProduct.category_id?.trim()) errors.push('Category is not selected');
    if (!singleProduct.product_id?.trim()) errors.push('Product is not selected');
    const qty = Math.max(1, parseInt(addStockQuantity, 10) || 1);
    const baseRfid = String(singleProduct.RFIDNumber || '').trim();
    const baseItemCode = String(singleProduct.Itemcode || '').trim();
    if (qty === 1) {
      if (!baseItemCode) errors.push('Item Code is not entered');
      const existingItemCodes = new Set(addedRecords.map(r => String(r.Itemcode || '').toLowerCase()).filter(code => code));
      const existingRfids = new Set(addedRecords.map(r => String(r.RFIDNumber || '').toLowerCase()).filter(rfid => rfid));
      if (baseItemCode && existingItemCodes.has(baseItemCode.toLowerCase())) errors.push(`Item Code "${baseItemCode}" is already in the list`);
      if (baseRfid && existingRfids.has(baseRfid.toLowerCase())) errors.push(`RFID Number "${baseRfid}" is already in the list`);
    }
    if (errors.length > 0) {
      setAddFormValidationErrors(errors);
      addNotification({ type: 'error', title: 'Data not added', message: 'Please fix the issues below and try again. ' + errors.join('. ') });
      return;
    }
    setAddFormValidationErrors([]);
    const newRecords = [];
    for (let i = 0; i < qty; i++) {
      const rfid = qty === 1 ? baseRfid : (i === 0 ? baseRfid : '');
      const itemCode = qty === 1 ? baseItemCode : (i === 0 ? baseItemCode : '');
      newRecords.push(buildRecordFromForm(rfid, itemCode));
    }
    setAddedRecords(prev => [...prev, ...newRecords]);
    setAddedRecordTids(prev => [...prev, ...newRecords.map(() => ({ tid: null, loading: false }))]);
    resetSingleForm();
    setAddStockQuantity(1);
    addNotification({ type: 'success', title: 'Added', message: qty === 1 ? '1 record added. You can edit RFID and Item Code in the table.' : `${qty} rows added. Enter RFID and Item Code for each row in the table below.` });
  };

  // Update a single field of an added record (e.g. RFIDNumber, Itemcode)
  const updateAddedRecordField = (index, field, value) => {
    setAddedRecords(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
    if (field === 'RFIDNumber' && (value || '').trim().length <= 4) {
      setAddedRecordTids(prev => prev.map((t, i) => i === index ? { tid: null, loading: false } : t));
    }
  };

  // Fetch TID for an RFID in the added records table (same check as main form: only when length > 4)
  const fetchTidForAddedRecord = async (index, rfidValue) => {
    const barcode = (rfidValue || '').trim();
    if (!barcode || barcode.length <= 4) {
      setAddedRecordTids(prev => prev.map((t, i) => i === index ? { tid: null, loading: false } : t));
      return;
    }
    const clientCode = userInfo?.ClientCode || '';
    if (!clientCode) {
      setAddedRecordTids(prev => prev.map((t, i) => i === index ? { tid: null, loading: false } : t));
      return;
    }
    setAddedRecordTids(prev => prev.map((t, i) => i === index ? { ...t, loading: true } : t));
    try {
      const res = await rfidService.getTidByBarcode(clientCode, barcode);
      let tidStr = null;
      if (res != null) {
        if (typeof res === 'string') tidStr = res;
        else if (typeof res.tidValue === 'string') tidStr = res.tidValue;
        else if (typeof res.Tid === 'string') tidStr = res.Tid;
        else if (typeof res.TID === 'string') tidStr = res.TID;
        else if (Array.isArray(res) && res.length > 0) {
          const first = res[0];
          tidStr = typeof first === 'string' ? first : (first?.tidValue ?? first?.Tid ?? first?.TID ?? null);
          if (tidStr != null && typeof tidStr !== 'string') tidStr = null;
        }
      }
      const finalTid = tidStr != null ? String(tidStr).trim() : null;
      setAddedRecordTids(prev => prev.map((t, i) => i === index ? { tid: finalTid, loading: false } : t));
    } catch (err) {
      setAddedRecordTids(prev => prev.map((t, i) => i === index ? { tid: null, loading: false } : t));
    }
  };

  // Remove record from added list
  const handleRemoveFromRecordList = (index) => {
    setAddedRecords(prev => prev.filter((_, i) => i !== index));
    setAddedRecordTids(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all added records
  const clearAddedRecords = () => {
    setAddedRecords([]);
    setAddedRecordTids([]);
    addNotification({ type: 'info', title: 'Cleared', message: 'All records cleared.' });
  };

  // Collect all error messages from API response for user-friendly display
  const collectErrorMessages = (error) => {
    const list = [];
    const data = error?.response?.data;
    if (data) {
      if (Array.isArray(data.errors)) {
        data.errors.forEach((e) => list.push(typeof e === 'string' ? e : (e?.message || e?.Message || JSON.stringify(e))));
      }
      const combined = (data.Message || data.message || '').trim();
      if (combined) {
        const parts = combined.split(/[;\n]+/).map((s) => s.trim()).filter(Boolean);
        if (parts.length > 1) parts.forEach((p) => list.push(p));
        else if (parts.length === 1) list.push(parts[0]);
      }
    }
    if (list.length === 0) list.push(error?.message || 'Failed to add stock.');
    return [...new Set(list)];
  };

  // Pre-submit validation: required fields per record and shared (branch, counter)
  const validateAddedRecordsForSubmit = () => {
    const errors = [];
    if (!sharedData.branch_name?.trim()) errors.push('• Branch is not selected. Please select Branch above.');
    if (!sharedData.counter_name?.trim()) errors.push('• Counter is not selected. Please select Counter above.');
    addedRecords.forEach((record, idx) => {
      const row = idx + 1;
      if (!(record.RFIDNumber || '').trim()) errors.push(`• Row ${row}: RFID Number is required.`);
      if (!(record.Itemcode || '').trim()) errors.push(`• Row ${row}: Item Code is required.`);
      if (!(record.category_id || '').trim()) errors.push(`• Row ${row}: Category is required.`);
      if (!(record.product_id || '').trim()) errors.push(`• Row ${row}: Product is required.`);
    });
    return errors;
  };

  // Submit all added records to API
  const handleSubmitAllRecords = async () => {
    if (addedRecords.length === 0) {
      const msg = 'Add at least one record using the + Add button before submitting.';
      addNotification({ type: 'error', title: 'Cannot Add Stock', message: msg });
      toast.error(msg, { position: toast.POSITION.TOP_RIGHT, autoClose: 6000 });
      return;
    }
    const validationErrors = validateAddedRecordsForSubmit();
    if (validationErrors.length > 0) {
      const title = 'Please fix the following before adding stock:';
      const fullMessage = [title, ...validationErrors].join('\n');
      addNotification({ type: 'error', title: 'Validation Failed', message: fullMessage });
      toast.error(
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: 13 }}>
            {validationErrors.map((e, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{e.replace(/^•\s*/, '')}</li>
            ))}
          </ul>
        </div>,
        { position: toast.POSITION.TOP_RIGHT, autoClose: 12000, closeButton: true }
      );
      return;
    }
    const validProducts = addedRecords.map(record => {
      const { Stones, Diamonds } = rfidService.getStonesAndDiamondsForApi(
        record.stoneList,
        record.diamondList
      );
      return {
        client_code: String(userInfo?.ClientCode || ''),
        branch_id: String(sharedData.branch_name || ''),
        counter_id: String(sharedData.counter_name || ''),
        RFIDNumber: String(record.RFIDNumber || ''),
        Itemcode: String(record.Itemcode || ''),
        category_id: String(record.category_id || ''),
        product_id: String(record.product_id || ''),
        design_id: String(record.design_id || ''),
        purity_id: String(record.purity_id || ''),
        grosswt: String(record.grosswt || '0'),
        stonewt: String(record.stonewt || '0'),
        diamondheight: String(record.diamondheight || '0'),
        diamondweight: String(record.diamondweight || '0'),
        netwt: String(record.netwt || '0'),
        box_details: String(record.box_details || ''),
        size: Number(record.size || 0),
        stoneamount: String(record.stoneamount || '0'),
        diamondAmount: String(record.diamondAmount || '0'),
        HallmarkAmount: String(record.HallmarkAmount || '0'),
        MakingPerGram: String(record.MakingPerGram || '0'),
        MakingPercentage: String(record.MakingPercentage || '0'),
        MakingFixedAmt: String(record.MakingFixedAmt || '0'),
        MRP: String(record.MRP || '0'),
        imageurl: String(record.imageurl || ''),
        status: 'ApiActive',
        Stones,
        Diamonds
      };
    });
    setLoading(true);
    try {
      const response = await axios.post(
        'https://soni.loyalstring.co.in/api/ProductMaster/SaveRFIDTransactionDetails',
        validProducts,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' } }
      );
      if (response.data?.Status === 400 || response.data?.status === 400) {
        throw new Error(response.data?.Message || response.data?.message || 'Failed to add stock.');
      }
      const successMsg = response.data?.message || `${validProducts.length} stock item(s) added successfully!`;
      addNotification({ type: 'success', title: 'Success', message: successMsg });
      toast.success('Stock added successfully!', {
        position: toast.POSITION.TOP_RIGHT,
        autoClose: 3000
      });
      setAddedRecords([]);
      resetSingleForm();
      setSharedData({ branch_name: '', counter_name: '', Itemcode: '' });
    } catch (error) {
      const errorList = collectErrorMessages(error);
      const title = 'Add Stock Failed';
      const fullMessage = errorList.join('\n');
      addNotification({ type: 'error', title, message: fullMessage });
      toast.error(
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: 13 }}>
            {errorList.map((e, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{e}</li>
            ))}
          </ul>
        </div>,
        { position: toast.POSITION.TOP_RIGHT, autoClose: 15000, closeButton: true }
      );
    } finally {
      setLoading(false);
    }
  };

  // Clear all products (kept for compatibility if referenced elsewhere)
  const clearAllProducts = () => {
    setMultipleProducts([]);
    setSearchTerm('');
    setCurrentPage(1);
    setExpandedProducts(new Set());
    setShowTemplateForm(true);
    addNotification({ type: 'info', title: 'Cleared', message: 'All products cleared.' });
  };

  // Remove product row
  const removeProductRow = (index) => {
    setMultipleProducts(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate net weight: grosswt - stonewt
  const calculateNetWeight = (grosswt, stonewt) => {
    const gross = parseFloat(grosswt) || 0;
    const stone = parseFloat(stonewt) || 0;
    const net = gross - stone;
    return net >= 0 ? net.toFixed(3) : '0';
  };

  // Update single product field
  // Parse error message to extract field-specific errors
  // Fetch products based on category selection
  const fetchProductsByCategory = async (categoryName) => {
    if (!userInfo?.ClientCode) return;
    
    // If no category selected, fetch all products
    if (!categoryName) {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const requestBody = { ClientCode: userInfo.ClientCode };
      
      setLoadingMasterData(true);
      try {
        const response = await axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllProductMaster', requestBody, { headers });
        setProducts(normalizeArray(response.data));
      } catch (error) {
        console.error('Error fetching all products:', error);
      } finally {
        setLoadingMasterData(false);
      }
      return;
    }

    // Find category ID from name
    const categoryObj = categories.find(c => 
      (c.CategoryName === categoryName) || 
      (c.Name === categoryName) || 
      (c.Category === categoryName) || 
      (c.categoryName === categoryName) ||
      (c.name === categoryName) ||
      (c.category === categoryName)
    );

    const categoryId = categoryObj?.CategoryId || categoryObj?.id || categoryObj?.Id || categoryObj?.categoryId;

    if (categoryId) {
      setLoadingMasterData(true);
      try {
        const headers = {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        };
        const requestBody = { 
          ClientCode: userInfo.ClientCode,
          CategoryId: categoryId
        };

        const response = await axios.post('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllProductMaster', requestBody, { headers });
        setProducts(normalizeArray(response.data));
      } catch (error) {
        console.error('Error fetching products by category:', error);
        toast.error('Failed to load products for selected category');
      } finally {
        setLoadingMasterData(false);
      }
    }
  };

  const parseFieldErrors = (errorMessage) => {
    const errors = {
      RFIDNumber: '',
      Itemcode: ''
    };
    
    if (!errorMessage) return errors;
    
    // Split by semicolon to handle multiple errors
    const errorParts = errorMessage.split(';').map(part => part.trim());
    
    errorParts.forEach(part => {
      // Check for RFIDNumber errors - handle both "RFIDNumber" and "RFID Number"
      if (part.toLowerCase().includes('rfidnumber') || part.toLowerCase().includes('rfid number')) {
        // Try to extract the RFID value from patterns like:
        // "RFIDNumber 'CZ3506' already exists"
        // "RFID Number 'CZ3506' already exists in database"
        const rfidMatch = part.match(/(?:RFIDNumber|RFID\s+Number)\s*['"]([^'"]+)['"][^;]*/i);
        if (rfidMatch && rfidMatch[1]) {
          errors.RFIDNumber = `RFID Number '${rfidMatch[1]}' already exists in database`;
        } else {
          errors.RFIDNumber = 'RFID Number already exists in database';
        }
      }
      
      // Check for Itemcode errors - handle both "itemcode" and "item code"
      if (part.toLowerCase().includes('itemcode') || part.toLowerCase().includes('item code')) {
        // Try to extract the Item Code value from patterns like:
        // "itemcode 'SAU124' already exists"
        // "Item Code 'SAU124' already exists in database"
        const itemCodeMatch = part.match(/(?:itemcode|item\s+code)\s*['"]([^'"]+)['"][^;]*/i);
        if (itemCodeMatch && itemCodeMatch[1]) {
          errors.Itemcode = `Item Code '${itemCodeMatch[1]}' already exists in database`;
        } else {
          errors.Itemcode = 'Item Code already exists in database';
        }
      }
    });
    
    return errors;
  };

  const updateSingleField = (field, value) => {
    // Clear error for this field when user starts typing
    if (field === 'RFIDNumber' || field === 'Itemcode') {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
    // Clear "why data was not added" message when user fixes a required field
    if (['RFIDNumber', 'Itemcode', 'category_id', 'product_id'].includes(field) && addFormValidationErrors.length > 0) {
      setAddFormValidationErrors([]);
    }
    // Prevent status from being changed - always keep it as 'ApiActive'
    if (field === 'status') {
      return; // Don't allow status changes
    }
    if (field === 'RFIDNumber') {
      const trimmed = (value || '').trim();
      if (!trimmed || trimmed.length <= 4) setTidByBarcode(null);
    }
    
    // Fetch products based on category selection
    if (field === 'category_id') {
      fetchProductsByCategory(value);
    }

    setSingleProduct(prev => {
      const updated = { ...prev, [field]: value };
      
      // When product changes, clear design if it's not in the filtered list
      if (field === 'product_id') {
        const designOpts = getDesignOptions(value);
        if (prev.design_id && !designOpts.includes(prev.design_id)) {
          updated.design_id = '';
        }
        const purityOpts = getPurityOptions(prev.category_id, value);
        if (prev.purity_id && !purityOpts.includes(prev.purity_id)) {
          updated.purity_id = '';
        }
      }
      // When category changes, clear purity if it's not in the filtered list
      if (field === 'category_id') {
        const purityOpts = getPurityOptions(value, prev.product_id);
        if (prev.purity_id && !purityOpts.includes(prev.purity_id)) {
          updated.purity_id = '';
        }
      }
      
      // Auto-calculate net weight when grosswt or stonewt changes
      if (field === 'grosswt' || field === 'stonewt') {
        updated.netwt = calculateNetWeight(updated.grosswt, updated.stonewt);
      }
      
      return updated;
    });
  };

  // Fetch TID by current RFID (barcode) from rrgold API; only when user has entered more than 4 characters
  const fetchTidForRfid = async (rfidValue) => {
    const barcode = (rfidValue || singleProduct.RFIDNumber || '').trim();
    if (!barcode || barcode.length <= 4) {
      setTidByBarcode(null);
      return;
    }
    const clientCode = userInfo?.ClientCode || '';
    if (!clientCode) {
      setTidByBarcode(null);
      return;
    }
    setTidLoading(true);
    setTidByBarcode(null);
    try {
      const res = await rfidService.getTidByBarcode(clientCode, barcode);
      // API may return { status, tidValue } or { Tid: "..." } or { TID: "..." } or array
      let tidStr = null;
      if (res != null) {
        if (typeof res === 'string') {
          tidStr = res;
        } else if (typeof res.tidValue === 'string') {
          tidStr = res.tidValue;
        } else if (typeof res.Tid === 'string') {
          tidStr = res.Tid;
        } else if (typeof res.TID === 'string') {
          tidStr = res.TID;
        } else if (Array.isArray(res) && res.length > 0) {
          const first = res[0];
          tidStr = typeof first === 'string' ? first : (first?.tidValue ?? first?.Tid ?? first?.TID ?? null);
          if (tidStr != null && typeof tidStr !== 'string') tidStr = null;
        }
      }
      setTidByBarcode(tidStr != null ? String(tidStr).trim() : null);
    } catch (err) {
      setTidByBarcode(null);
    } finally {
      setTidLoading(false);
    }
  };

  // Update multiple product field
  const updateMultipleField = (index, field, value) => {
    // Prevent status from being changed - always keep it as 'ApiActive'
    if (field === 'status') {
      return; // Don't allow status changes
    }
    
    // Fetch products based on category selection
    if (field === 'category_id') {
      fetchProductsByCategory(value);
    }
    
    setMultipleProducts(prev => prev.map((product, i) => {
      if (i !== index) return product;
      
      const updated = { ...product, [field]: value };
      
      // Auto-calculate net weight when grosswt or stonewt changes
      if (field === 'grosswt' || field === 'stonewt') {
        updated.netwt = calculateNetWeight(updated.grosswt, updated.stonewt);
      }
      
      return updated;
    }));
  };

  // Update template form field
  const updateTemplateField = (field, value) => {
    // Prevent status from being changed - always keep it as 'ApiActive'
    if (field === 'status') {
      return; // Don't allow status changes
    }
    
    setProductTemplate(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate net weight when grosswt or stonewt changes
      if (field === 'grosswt' || field === 'stonewt') {
        updated.netwt = calculateNetWeight(updated.grosswt, updated.stonewt);
      }
      
      return updated;
    });
  };

  // Validate required fields
  const validateProduct = (product, isBulk = false, allProducts = []) => {
    const errors = [];
    const requiredFields = ['Itemcode', 'category_id', 'product_id'];
    
    requiredFields.forEach(field => {
      if (!product[field] || product[field].toString().trim() === '') {
        const fieldName = field === 'RFIDNumber' ? 'RFID Number' :
                         field === 'Itemcode' ? 'Item Code' :
                         field === 'category_id' ? 'Category' :
                         field === 'product_id' ? 'Product' : field;
        errors.push(`${fieldName} is required`);
      }
    });

    // Check for unique ItemCode
    if (product.Itemcode && allProducts.length > 0) {
      const duplicateCount = allProducts.filter(p => 
        p.Itemcode && p.Itemcode.toString().trim().toLowerCase() === product.Itemcode.toString().trim().toLowerCase()
      ).length;
      if (duplicateCount > 1) {
        errors.push('Item Code must be unique');
      }
    }

    // Validate net weight: netwt should not be greater than grosswt
    const grosswt = parseFloat(product.grosswt) || 0;
    const netwt = parseFloat(product.netwt) || 0;
    if (grosswt > 0 && netwt > grosswt) {
      errors.push('Net Weight cannot be greater than Gross Weight');
    }

    return errors;
  };

  // Submit single product
  const handleSubmitSingle = async () => {
    const errors = validateProduct(singleProduct, false, [singleProduct]);
    if (errors.length > 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: errors.join(', ')
      });
      return;
    }

    setLoading(true);
    try {
      // Use rfidService to save transaction
      const response = await rfidService.saveRFIDTransaction({
        clientCode: singleProduct.client_code || userInfo?.ClientCode || '',
        branchId: sharedData.branch_name || '',
        counterId: sharedData.counter_name || '',
        rfidNumber: singleProduct.RFIDNumber || '',
        itemCode: singleProduct.Itemcode || '',
        categoryId: singleProduct.category_id || '',
        productId: singleProduct.product_id || '',
        designId: singleProduct.design_id || '',
        purityId: singleProduct.purity_id || '',
        grossWeight: singleProduct.grosswt || '0',
        stoneWeight: singleProduct.stonewt || '0',
        diamondHeight: singleProduct.diamondheight || '0',
        diamondWeight: singleProduct.diamondweight || '0',
        netWeight: singleProduct.netwt || '0',
        boxDetails: singleProduct.box_details || '',
        size: Number(singleProduct.size || 0),
        stoneAmount: singleProduct.stoneamount || '0',
        diamondAmount: singleProduct.diamondAmount || '0',
        hallmarkAmount: singleProduct.HallmarkAmount || '0',
        makingPerGram: singleProduct.MakingPerGram || '0',
        makingPercentage: singleProduct.MakingPercentage || '0',
        makingFixedAmount: singleProduct.MakingFixedAmt || '0',
        mrp: singleProduct.MRP || '0',
        imageUrl: singleProduct.imageurl || '',
        status: singleProduct.status || 'ApiActive',
        stoneList: Array.isArray(singleProduct.stoneList) ? singleProduct.stoneList : [],
        diamondList: Array.isArray(singleProduct.diamondList) ? singleProduct.diamondList : []
      });

      // Handle response - could be object or array
      const responseData = Array.isArray(response) ? response[0] : response;
      
      // Debug: Log response to see structure
      console.log('SaveRFIDTransactionDetails Response:', responseData);
      
      // Check for validation errors in the response (backend returns errors array)
      if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
        // Extract all error messages from the errors array
        const errorMessages = responseData.errors.map(err => err.error || err.message || 'Validation error').join('; ');
        const errorMessage = responseData.message 
          ? `${responseData.message}: ${errorMessages}`
          : errorMessages;
        
        // Parse errors and set field-specific errors
        const parsedErrors = parseFieldErrors(errorMessage);
        setFieldErrors(parsedErrors);
        
        // Show error toast popup (but don't show the full message, just a summary)
        toast.error('Validation failed. Please check the form fields for details.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        addNotification({
          type: 'error',
          title: 'Validation Error',
          message: errorMessage
        });
        return;
      }

      // Check for failed items (backend returns failedItems count)
      if (responseData?.failedItems > 0 || (responseData?.successfulItems === 0 && responseData?.totalItems > 0)) {
        let errorMessage = responseData?.message || 'Failed to add stock item.';
        
        // Extract errors from errors array if available
        if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
          const errorDetails = responseData.errors.map(err => err.error || err.message || 'Validation error').join('; ');
          errorMessage = `${errorMessage} ${errorDetails}`;
          
          // Parse errors and set field-specific errors
          const parsedErrors = parseFieldErrors(errorMessage);
          setFieldErrors(parsedErrors);
        }
        
        // Show error toast popup (but don't show the full message, just a summary)
        toast.error('Validation failed. Please check the form fields for details.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        addNotification({
          type: 'error',
          title: 'Error',
          message: errorMessage
        });
        return;
      }
      
      // Check for error status first (400, etc.)
      if (responseData?.Status === 400 || responseData?.status === 400) {
        const errorMessage = responseData?.Message || responseData?.message || responseData?.error || 'Failed to add stock item.';
        
        // Show error toast popup
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        addNotification({
          type: 'error',
          title: 'Error',
          message: errorMessage
        });
        return;
      }

      // Check for success status (200) or if no error status, assume success
      const isSuccess = responseData?.Status === 200 || 
                       responseData?.status === 200 || 
                       responseData?.successfulItems > 0 || // Backend returns successfulItems
                       (!responseData?.Status && !responseData?.status && !responseData?.errors && !responseData?.failedItems) || // No error indicators
                       response === null || // Some APIs return null on success
                       (Array.isArray(response) && response.length > 0); // Array response means success

      if (isSuccess) {
        // Extract success message from backend
        const successMessage = responseData?.Message || 
                              responseData?.message || 
                              responseData?.SuccessMessage ||
                              responseData?.successMessage ||
                              'Stock item added successfully!';
        
        // Show success toast popup
        toast.success(successMessage, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        addNotification({
          type: 'success',
          title: 'Success',
          message: successMessage
        });
        resetSingleForm();
      } else {
        // Fallback: if we got here and no error, show generic success
        const fallbackMessage = 'Stock item added successfully!';
        
        toast.success(fallbackMessage, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        addNotification({
          type: 'success',
          title: 'Success',
          message: fallbackMessage
        });
        resetSingleForm();
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      
      // Extract error message from various possible locations
      let errorMessage = 'Failed to add stock item. Please try again.';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Check for errors array format (backend validation errors)
        if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          // Extract all error messages from the errors array
          const errorMessages = errorData.errors.map(err => err.error || err.message || 'Validation error').join('; ');
          errorMessage = errorData.message 
            ? `${errorData.message}: ${errorMessages}`
            : errorMessages;
          
          // Parse errors and set field-specific errors
          const parsedErrors = parseFieldErrors(errorMessage);
          setFieldErrors(parsedErrors);
        }
        // Check for failedItems format
        else if (errorData.failedItems > 0 || (errorData.successfulItems === 0 && errorData.totalItems > 0)) {
          errorMessage = errorData.message || 'Failed to add stock item.';
          if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
            const errorDetails = errorData.errors.map(err => err.error || err.message || 'Validation error').join('; ');
            errorMessage = `${errorMessage} ${errorDetails}`;
            
            // Parse errors and set field-specific errors
            const parsedErrors = parseFieldErrors(errorMessage);
            setFieldErrors(parsedErrors);
          }
        }
        // Check for message in various formats
        else {
          errorMessage = errorData.Message || 
                        errorData.message || 
                        errorData.error || 
                        errorData.Error ||
                        errorData.title ||
                        errorMessage;
          
          // Check for errors object (validation errors as object)
          if (errorData.errors && typeof errorData.errors === 'object' && !Array.isArray(errorData.errors)) {
            const errorsObj = errorData.errors;
            const errorMessages = [];
            Object.keys(errorsObj).forEach(key => {
              if (Array.isArray(errorsObj[key])) {
                errorMessages.push(...errorsObj[key]);
              } else {
                errorMessages.push(errorsObj[key]);
              }
            });
            if (errorMessages.length > 0) {
              errorMessage = errorMessages.join(', ');
            }
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error toast popup
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 7000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit multiple products
  const handleSubmitMultiple = async () => {
    const allErrors = [];
    const validProducts = [];

    multipleProducts.forEach((product, index) => {
      const errors = validateProduct(product, false, multipleProducts);
      if (errors.length > 0) {
        allErrors.push(`Product ${index + 1}: ${errors.join(', ')}`);
      } else {
        // Match exact API payload structure - same as single product
        // Send names directly (not IDs) for branch, counter, category, product, design, and purity
        validProducts.push({
          client_code: String(userInfo?.ClientCode || ''),
          branch_id: String(sharedData.branch_name || ''), // Shared branch name
          counter_id: String(sharedData.counter_name || ''), // Shared counter name
          RFIDNumber: String(product.RFIDNumber || ''),
          Itemcode: String(product.Itemcode || ''),
          category_id: String(product.category_id || ''),
          product_id: String(product.product_id || ''),
          design_id: String(product.design_id || ''),
          purity_id: String(product.purity_id || ''),
          grosswt: String(product.grosswt || '0'),
          stonewt: String(product.stonewt || '0'),
          diamondweight: String(product.diamondweight || '0'),
          netwt: String(product.netwt || '0'),
          box_details: String(product.box_details || ''),
          size: Number(product.size || 0),
          stoneamount: String(product.stoneamount || '0'),
          diamondAmount: String(product.diamondAmount || '0'),
          HallmarkAmount: String(product.HallmarkAmount || '0'),
          MakingPerGram: String(product.MakingPerGram || '0'),
          MakingPercentage: String(product.MakingPercentage || '0'),
          MakingFixedAmt: String(product.MakingFixedAmt || '0'),
          MRP: String(product.MRP || '0'),
          imageurl: String(product.imageurl || ''),
          status: String(product.status || 'ApiActive')
        });
      }
    });

    if (allErrors.length > 0) {
      addNotification({
        type: 'error',
        title: 'Validation Errors',
        message: allErrors.join('\n')
      });
      return;
    }

    if (validProducts.length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No valid products to add'
      });
      return;
    }

    setLoading(true);
    try {
      // Call SaveRFIDTransactionDetails API to add multiple stock items
      const response = await axios.post(
        'https://soni.loyalstring.co.in/api/ProductMaster/SaveRFIDTransactionDetails',
        validProducts,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Check if API returned an error status
      if (response.data?.Status === 400 || response.data?.status === 400) {
        throw new Error(response.data?.Message || response.data?.message || 'Failed to add stock items');
      }

      // Check for success status or message
      if (response.data?.Status === 200 || response.data?.status === 200 || response.data?.message) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: response.data?.message || `${validProducts.length} stock item(s) added successfully!`
        });
      } else {
        // If no error status but also no clear success, show success anyway
        addNotification({
          type: 'success',
          title: 'Success',
          message: `${validProducts.length} stock item(s) added successfully!`
        });
      }
      setMultipleProducts([{
        RFIDNumber: '',
        Itemcode: '',
        category_id: '',
        product_id: '',
        design_id: '',
        purity_id: '',
        grosswt: '',
        stonewt: '',
        diamondweight: '',
        netwt: '',
        box_details: '',
        size: 0,
        stoneamount: '',
        diamondAmount: '',
        HallmarkAmount: '',
        MakingPerGram: '',
        MakingPercentage: '',
        MakingFixedAmt: '',
        MRP: '',
        imageurl: '',
        status: 'ApiActive'
      }]);
    } catch (error) {
      console.error('Error adding multiple stock:', error);
      
      // Extract error message from various possible locations
      let errorMessage = 'Failed to add stock items. Please try again.';
      
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.Message) {
          errorMessage = error.response.data.Message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.Error) {
          errorMessage = error.response.data.Error;
        } else if (error.response.data.errors) {
          const errorsObj = error.response.data.errors;
          const errorMessages = [];
          Object.keys(errorsObj).forEach(key => {
            if (Array.isArray(errorsObj[key])) {
              errorMessages.push(`${key}: ${errorsObj[key].join(', ')}`);
            } else {
              errorMessages.push(`${key}: ${errorsObj[key]}`);
            }
          });
          errorMessage = errorMessages.length > 0 ? errorMessages.join(' | ') : 'Validation errors occurred';
        } else if (error.response.data.title) {
          errorMessage = error.response.data.title;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // Download Excel template - templateType: 'normal' | 'withStoneDiamond'
  const downloadExcelTemplate = (templateType = 'normal') => {
    const baseRow = {
      'client_code': userInfo?.ClientCode || 'LS000123',
      'branch_id': '',
      'counter_id': '',
      'RFIDNumber': 'CZ3506',
      'Itemcode': 'SAU124',
      'category_id': 'Gold',
      'product_id': 'Tops',
      'design_id': 'Fancy Top',
      'purity_id': '22CT',
      'grosswt': '20.800',
      'stonewt': '0.500',
      'diamondweight': '0.250',
      'netwt': '19.250',
      'box_details': 'Box A',
      'size': '0',
      'stoneamount': '20',
      'diamondAmount': '20',
      'HallmarkAmount': '35',
      'MakingPerGram': '10',
      'MakingPercentage': '5',
      'MakingFixedAmt': '37',
      'MRP': '5000',
      'imageurl': '',
      'status': 'ApiActive'
    };

    let templateData;
    let fileName;
    let sheetName;

    if (templateType === 'withStoneDiamond') {
      // Add Stock template (Stone & Diamond): multiple stones/diamonds per product via StoneName_2, StoneName_3, DiamondName_2, DiamondName_3, etc.
      const stone1 = { StoneName: 'Ruby', StoneWeight: '1.5', StonePieces: '5', StoneRate: '1000', StoneAmount: '5000', StoneDescription: 'Premium Ruby', StoneLessPercent: '2', StoneCertificate: 'Cert123', StoneSettingType: 'Prong', StoneRatePerPiece: '1000', StoneRateKarate: '500', StoneStatusType: 'Active' };
      const stone2 = { StoneName_2: 'Emerald', StoneWeight_2: '0.80', StonePieces_2: '3', StoneRate_2: '2500', StoneAmount_2: '6000', StoneDescription_2: 'Natural Emerald', StoneLessPercent_2: '1.5', StoneCertificate_2: 'Cert456', StoneSettingType_2: 'Bezel', StoneRatePerPiece_2: '2000', StoneRateKarate_2: '7500', StoneStatusType_2: 'Active' };
      const stone3 = { StoneName_3: 'Sapphire', StoneWeight_3: '1.20', StonePieces_3: '4', StoneRate_3: '1800', StoneAmount_3: '8640', StoneDescription_3: 'Blue Sapphire', StoneLessPercent_3: '2', StoneCertificate_3: 'Cert789', StoneSettingType_3: 'Pave', StoneRatePerPiece_3: '2160', StoneRateKarate_3: '1800', StoneStatusType_3: 'Active' };
      const diamond1 = { DiamondName: 'Round Diamond', DiamondWeight: '0.5', DiamondSellRate: '50000', DiamondPieces: '1', DiamondClarity: 'VS1', DiamondColour: 'D', DiamondCut: 'Excellent', DiamondShape: 'Round', DiamondSize: '0.5', DiamondCertificate: 'GIA123', DiamondSettingType: 'Prong', DiamondSellAmount: '25000', DiamondPurchaseAmount: '20000', DiamondDescription: 'Premium Diamond', DiamondMargin: '25', TotalDiamondWeight: '0.5' };
      const diamond2 = { DiamondName_2: 'Princess Cut', DiamondWeight_2: '0.75', DiamondSellRate_2: '60000', DiamondPieces_2: '1', DiamondClarity_2: 'VVS2', DiamondColour_2: 'E', DiamondCut_2: 'Very Good', DiamondShape_2: 'Princess', DiamondSize_2: '0.75', DiamondCertificate_2: 'GIA456', DiamondSettingType_2: 'Channel', DiamondSellAmount_2: '45000', DiamondPurchaseAmount_2: '38000', DiamondDescription_2: 'Princess Cut', DiamondMargin_2: '18', TotalDiamondWeight_2: '0.75' };
      const diamond3 = { DiamondName_3: 'Oval Diamond', DiamondWeight_3: '0.30', DiamondSellRate_3: '35000', DiamondPieces_3: '2', DiamondClarity_3: 'SI1', DiamondColour_3: 'G', DiamondCut_3: 'Good', DiamondShape_3: 'Oval', DiamondSize_3: '0.30', DiamondCertificate_3: 'GIA789', DiamondSettingType_3: 'Prong', DiamondSellAmount_3: '21000', DiamondPurchaseAmount_3: '17500', DiamondDescription_3: 'Oval Pair', DiamondMargin_3: '20', TotalDiamondWeight_3: '0.60' };

      const row1 = { ...baseRow, RFIDNumber: 'CZ3506', Itemcode: 'SAU124', ...stone1, ...stone2, ...diamond1, ...diamond2 };
      const row2 = { ...baseRow, RFIDNumber: 'CZ3507', Itemcode: 'SAU125', ...stone1, ...stone2, ...stone3, ...diamond1, ...diamond2 };

      templateData = [row1, row2];
      fileName = 'Add Stock template (Stone & Diamond).xlsx';
      sheetName = 'Add Stock (Stone & Diamond)';
    } else {
      templateData = [baseRow];
      fileName = 'Add Stock template.xlsx';
      sheetName = 'Add Stock template';
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    if (templateType === 'withStoneDiamond') {
      try {
        ws['!tabColor'] = { rgb: 'FF7C3AED' };
      } catch (_) {}
      const instructionRows = [
        ['Add Stock template (Stone & Diamond) – Instructions'],
        [],
        ['One row = one product. You can add multiple stones and multiple diamonds per product in the same row.'],
        ['• Use columns Stone Name, Stone Weight, … for the 1st stone.'],
        ['• Use Stone Name (2nd), Stone Weight (2nd), … for the 2nd stone; Stone Name (3rd), … for the 3rd.'],
        ['• Same for diamonds: Diamond Name, … for 1st; Diamond Name (2nd), … for 2nd; Diamond Name (3rd), … for 3rd.'],
        ['• Leave 2nd/3rd stone or diamond columns blank if a product has only one.'],
        ['Sample rows in the data sheet show 2 stones + 2 diamonds (row 1) and 3 stones + 2 diamonds (row 2).']
      ];
      const wsInstructions = XLSX.utils.aoa_to_sheet(instructionRows);
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
      try {
        wsInstructions['!tabColor'] = { rgb: 'FF7C3AED' };
      } catch (_) {}
    }

    XLSX.writeFile(wb, fileName);
    
    addNotification({
      type: 'success',
      title: 'Download Started',
      message: templateType === 'withStoneDiamond'
        ? 'Add Stock template (Stone & Diamond) downloaded! Use 2nd/3rd columns for multiple stones and diamonds per product.'
        : 'Add Stock template downloaded successfully!'
    });
  };

  // Handle Excel file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setBulkUploadFile(file);
    setUploadPreview([]);
    setUploadErrors([]);
    setFieldMappings({});
    setSelectedTemplate('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          setUploadErrors(['No data found in Excel file']);
          return;
        }

        // Extract Excel column names
        const columns = Object.keys(jsonData[0] || {});
        setExcelColumns(columns);
        setRawExcelData(jsonData);

        // Show mapping sidebar
        setShowMappingSidebar(true);

      } catch (error) {
        console.error('Error reading Excel file:', error);
        setUploadErrors(['Error reading Excel file. Please check the format.']);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Apply mappings and process data
  const applyMappings = () => {
    if (Object.keys(fieldMappings).length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please map at least one field before proceeding'
      });
      return;
    }

    const { preview, errors } = processExcelDataWithMappings(rawExcelData, fieldMappings);
    setUploadPreview(preview);
    setUploadErrors(errors);
    
    addNotification({
      type: 'success',
      title: 'Mappings Applied',
      message: `Processed ${preview.length} row(s) with ${errors.length} error(s)`
    });
  };

  // Handle bulk stock upload with progress
  const handleBulkStockUpload = async () => {
    if (Object.keys(fieldMappings).length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please map at least one field before uploading'
      });
      return;
    }

    // Process data with mappings
    const { preview, errors } = processExcelDataWithMappings(rawExcelData, fieldMappings);
    
    if (errors.length > 0) {
      addNotification({
        type: 'error',
        title: 'Validation Errors',
        message: `Please fix ${errors.length} error(s) before uploading`
      });
      setUploadErrors(errors);
      setUploadPreview(preview);
      return;
    }

    if (preview.length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No valid products to upload'
      });
      return;
    }

    // Close sidebar and show progress in main section
    setShowMappingSidebar(false);
    setUploading(true);
    setUploadProgress({ current: 0, total: preview.length, percentage: 0, successCount: 0, errorCount: 0 });
    setBatchErrors([]);
    setServerMessages([]);
    setUploadPreview(preview);
    setUploadErrors([]);

    try {
      // Send in batches of 2000 products to handle large uploads (up to 5k+ products)
      const batchSize = 2000;
      const totalBatches = Math.ceil(preview.length / batchSize);
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      const batchErrorDetails = [];
      const serverMessageDetails = [];

      for (let i = 0; i < preview.length; i += batchSize) {
        const batchNumber = Math.floor(i / batchSize) + 1;
        const chunk = preview.slice(i, i + batchSize).map(product => {
          // Get branch and counter names (send names as strings, not IDs)
          const branchValue = product.branch_id || sharedData.branch_name || '';
          const counterValue = product.counter_id || sharedData.counter_name || '';

          // Ensure product_id is always a valid string (not null, undefined, or number)
          let productIdValue = product.product_id;
          if (productIdValue === null || productIdValue === undefined) {
            productIdValue = '';
          } else if (typeof productIdValue === 'number') {
            productIdValue = String(productIdValue);
          } else {
            productIdValue = String(productIdValue);
          }

          return {
            client_code: String(product.client_code || userInfo?.ClientCode || ''),
            branch_id: String(branchValue || ''), // Send branch name as string, not ID
            counter_id: String(counterValue || ''), // Send counter name as string, not ID
            RFIDNumber: String(product.RFIDNumber || ''),
            Itemcode: String(product.Itemcode || ''),
            category_id: String(product.category_id || ''), // Send category name as string, not ID
            product_id: productIdValue, // Send product name as string, not ID
            design_id: String(product.design_id || ''), // Send design name as string, not ID
            purity_id: String(product.purity_id || ''), // Send purity name as string, not ID
            grosswt: String(product.grosswt || '0'),
            stonewt: String(product.stonewt || '0'),
            diamondweight: String(product.diamondweight || '0'),
            netwt: String(product.netwt || '0'),
            box_details: String(product.box_details || ''),
            size: Number(product.size) || 0,
            stoneamount: String(product.stoneamount || '0'),
            diamondAmount: String(product.diamondAmount || '0'),
            HallmarkAmount: String(product.HallmarkAmount || '0'),
            MakingPerGram: String(product.MakingPerGram || '0'),
            MakingPercentage: String(product.MakingPercentage || '0'),
            MakingFixedAmt: String(product.MakingFixedAmt || '0'),
            MRP: String(product.MRP || '0'),
            imageurl: String(product.imageurl || ''),
            status: String(product.status || 'ApiActive'),
            Stones: Array.isArray(product.Stones) ? product.Stones : [],
            Diamonds: Array.isArray(product.Diamonds) ? product.Diamonds : []
          };
        });

        try {
          console.log(`Uploading batch ${batchNumber}/${totalBatches} (${chunk.length} products)...`);
          const response = await axios.post(
            'https://soni.loyalstring.co.in/api/ProductMaster/SaveRFIDTransactionDetails',
            chunk,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            }
          );

          // Check if response contains error message (even on 200 status)
          const responseData = response.data || {};
          let hasError = false;
          let errorMessage = '';
          let errorDetails = {};
          
          // Check for error indicators in response
          if (responseData.message) {
            const msg = String(responseData.message).toLowerCase();
            // Check for error keywords
            if (msg.includes('duplicate') || 
                msg.includes('error') || 
                msg.includes('failed') || 
                msg.includes('invalid') ||
                msg.includes('not found') ||
                msg.includes('already exists')) {
              hasError = true;
              errorMessage = responseData.message;
              errorDetails = responseData;
            }
          }
          
          // Check for error field
          if (responseData.error) {
            hasError = true;
            errorMessage = responseData.error;
            errorDetails = responseData;
          }
          
          // Check for errors object
          if (responseData.errors && Object.keys(responseData.errors).length > 0) {
            hasError = true;
            const errorsObj = responseData.errors;
            const errorMessages = [];
            Object.keys(errorsObj).forEach(key => {
              if (Array.isArray(errorsObj[key])) {
                errorMessages.push(`${key}: ${errorsObj[key].join(', ')}`);
              } else {
                errorMessages.push(`${key}: ${errorsObj[key]}`);
              }
            });
            errorMessage = errorMessages.length > 0 ? errorMessages.join(' | ') : 'Validation errors occurred';
            errorDetails = responseData;
          }
          
          if (hasError) {
            // This is an error, not a success
            errorCount += chunk.length;
            
            // Capture server error message
            setServerMessages(prev => [...prev, {
              type: 'error',
              batch: batchNumber,
              message: errorMessage,
              details: errorDetails,
              timestamp: new Date().toLocaleTimeString()
            }]);
            
            errors.push({
              batch: batchNumber,
              range: `${i + 1}-${Math.min(i + chunk.length, preview.length)}`,
              message: errorMessage,
              details: errorDetails
            });
          } else {
            // This is a success
            successCount += chunk.length;
            
            // Capture server success message
            if (responseData.message) {
              setServerMessages(prev => [...prev, {
                type: 'success',
                batch: batchNumber,
                message: responseData.message,
                timestamp: new Date().toLocaleTimeString()
              }]);
            }
          }
          
          // Update progress
          const current = Math.min(i + chunk.length, preview.length);
          const percentage = Math.round((current / preview.length) * 100);
          setUploadProgress({ 
            current, 
            total: preview.length, 
            percentage, 
            successCount, 
            errorCount 
          });
        } catch (error) {
          errorCount += chunk.length;
          
          // Extract error message from various possible locations
          let errorMessage = '';
          let errorDetails = {};
          
          if (error.response?.data) {
            errorDetails = error.response.data;
            
            // Check for message field
            if (error.response.data.message) {
              errorMessage = error.response.data.message;
            }
            // Check for error field
            else if (error.response.data.error) {
              errorMessage = error.response.data.error;
            }
            // Check for errors object (validation errors)
            else if (error.response.data.errors) {
              const errorsObj = error.response.data.errors;
              const errorMessages = [];
              Object.keys(errorsObj).forEach(key => {
                if (Array.isArray(errorsObj[key])) {
                  errorMessages.push(`${key}: ${errorsObj[key].join(', ')}`);
                } else {
                  errorMessages.push(`${key}: ${errorsObj[key]}`);
                }
              });
              errorMessage = errorMessages.length > 0 ? errorMessages.join(' | ') : 'Validation errors occurred';
            }
            // Check for title field
            else if (error.response.data.title) {
              errorMessage = error.response.data.title;
            }
          }
          
          // Fallback to generic error message
          if (!errorMessage) {
            errorMessage = error.message || 'Unknown error occurred';
          }
          
          // Capture server error message
          setServerMessages(prev => [...prev, {
            type: 'error',
            batch: batchNumber,
            message: errorMessage,
            details: errorDetails,
            timestamp: new Date().toLocaleTimeString()
          }]);
          
          errors.push({
            batch: batchNumber,
            range: `${i + 1}-${Math.min(i + chunk.length, preview.length)}`,
            message: errorMessage,
            details: error.response?.data || {}
          });

          // Update progress even on error
          const current = Math.min(i + chunk.length, preview.length);
          const percentage = Math.round((current / preview.length) * 100);
          setUploadProgress({ 
            current, 
            total: preview.length, 
            percentage, 
            successCount, 
            errorCount 
          });

          // Add to batch error details
          batchErrorDetails.push({
            batch: batchNumber,
            products: chunk.length,
            error: errorMessage
          });
        }

        // Small delay between batches to avoid overwhelming the server
        if (i + batchSize < preview.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setBatchErrors(batchErrorDetails);
      setServerMessages(prev => [...prev, ...serverMessageDetails]);

      // Final progress update
      setUploadProgress(prev => ({
        ...prev,
        current: preview.length,
        percentage: 100,
        successCount,
        errorCount
      }));

      // Don't auto-close - keep progress section visible
      if (errorCount === 0) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: `${successCount} stock item(s) uploaded successfully in ${totalBatches} batch(es)!`
        });
        // Keep progress section visible - user can manually clear
        setUploading(false); // Stop uploading state but keep messages visible
      } else if (successCount > 0) {
        addNotification({
          type: 'warning',
          title: 'Partial Success',
          message: `${successCount} items uploaded successfully, ${errorCount} failed across ${totalBatches} batch(es). Check server messages for details.`
        });
        setUploading(false); // Stop uploading state but keep messages visible
      } else {
        addNotification({
          type: 'error',
          title: 'Upload Failed',
          message: `All ${errorCount} items failed to upload across ${totalBatches} batch(es). Check server messages for details.`
        });
        setUploading(false); // Stop uploading state but keep messages visible
      }
    } catch (error) {
      console.error('Error uploading bulk stock:', error);
      
      // Extract error message
      let errorMessage = 'Failed to upload stock items. Please try again.';
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      // Add error to server messages
      setServerMessages(prev => [...prev, {
        type: 'error',
        batch: 'General',
        message: errorMessage,
        details: error.response?.data || {},
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
      
      // Don't hide uploading state immediately - let user see the error
      // Only hide if it's a network error or critical failure
      if (!error.response) {
        setUploading(false);
      }
    }
  };

  // Submit bulk upload
  const handleSubmitBulk = async () => {
    if (uploadPreview.length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please upload an Excel file first'
      });
      return;
    }

    if (uploadErrors.length > 0) {
      addNotification({
        type: 'error',
        title: 'Validation Errors',
        message: `Please fix ${uploadErrors.length} error(s) before uploading`
      });
      return;
    }

    // Filter out invalid products
    const validProducts = uploadPreview.filter((product, index) => {
      const errors = validateProduct(product, true);
      return errors.length === 0;
    });

    if (validProducts.length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No valid products to upload'
      });
      return;
    }

    setLoading(true);
    setUploading(true);
    setUploadProgress({ current: 0, total: validProducts.length, percentage: 0, successCount: 0, errorCount: 0 });
    setBatchErrors([]);
    setServerMessages([]);

    try {
      // Send in batches of 2000 products to handle large uploads (up to 5k+ products)
      const batchSize = 2000;
      const totalBatches = Math.ceil(validProducts.length / batchSize);
      let successCount = 0;
      let errorCount = 0;
      const batchErrorDetails = [];
      const serverMessageDetails = [];

      for (let i = 0; i < validProducts.length; i += batchSize) {
        const batchNumber = Math.floor(i / batchSize) + 1;
        const batch = validProducts.slice(i, i + batchSize);
        
        // Update progress
        setUploadProgress({
          current: i + batch.length,
          total: validProducts.length,
          percentage: Math.round(((i + batch.length) / validProducts.length) * 100),
          successCount: successCount,
          errorCount: errorCount
        });

        // Match exact API payload structure from documentation
        // Send names directly (not IDs) for branch, counter, category, product, design, and purity
        const batchPayload = batch.map(product => ({
          client_code: String(product.client_code || userInfo?.ClientCode || ''),
          branch_id: String(product.branch_id || sharedData.branch_name || ''), // Send branch name as string, not ID
          counter_id: String(product.counter_id || sharedData.counter_name || ''), // Send counter name as string, not ID
          RFIDNumber: String(product.RFIDNumber || product.RFIDCode || ''),
          Itemcode: String(product.Itemcode || ''),
          category_id: String(product.category_id || ''),
          product_id: String(product.product_id || ''),
          design_id: String(product.design_id || ''), // Send design name as string, not ID
          purity_id: String(product.purity_id || ''),
          grosswt: String(product.grosswt || '0'),
          stonewt: String(product.stonewt || '0'),
          diamondweight: String(product.diamondweight || '0'),
          netwt: String(product.netwt || '0'),
          box_details: String(product.box_details || ''),
          size: Number(product.size || 0),
          stoneamount: String(product.stoneamount || '0'),
          diamondAmount: String(product.diamondAmount || '0'),
          HallmarkAmount: String(product.HallmarkAmount || '0'),
          MakingPerGram: String(product.MakingPerGram || '0'),
          MakingPercentage: String(product.MakingPercentage || '0'),
          MakingFixedAmt: String(product.MakingFixedAmt || '0'),
          MRP: String(product.MRP || '0'),
          imageurl: String(product.imageurl || ''),
          status: String(product.status || 'ApiActive')
        }));

        try {
          console.log(`Uploading batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);
          const response = await axios.post(
            'https://soni.loyalstring.co.in/api/ProductMaster/SaveRFIDTransactionDetails',
            batchPayload,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            }
          );

          // Check response for success/errors
          if (response.data) {
            if (response.data.Status === 200 || response.status === 200) {
              successCount += batch.length;
              if (response.data.Message || response.data.message) {
                serverMessageDetails.push({
                  batch: batchNumber,
                  type: 'success',
                  message: response.data.Message || response.data.message,
                  timestamp: new Date().toLocaleTimeString()
                });
              }
            } else {
              // Partial success or error in response
              const failedCount = batch.length;
              errorCount += failedCount;
              batchErrorDetails.push({
                batch: batchNumber,
                products: failedCount,
                error: response.data.Message || response.data.message || 'Unknown error'
              });
            }
          } else {
            successCount += batch.length;
          }
        } catch (error) {
          console.error(`Error uploading batch ${batchNumber}/${totalBatches}:`, error);
          const errorMessage = error.response?.data?.Message || 
                             error.response?.data?.message || 
                             error.response?.data?.error ||
                             error.message || 
                             'Failed to upload batch';
          
          errorCount += batch.length;
          batchErrorDetails.push({
            batch: batchNumber,
            products: batch.length,
            error: errorMessage
          });
        }

        // Small delay between batches to avoid overwhelming the server
        if (i + batchSize < validProducts.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Final progress update
      setUploadProgress({
        current: validProducts.length,
        total: validProducts.length,
        percentage: 100,
        successCount: successCount,
        errorCount: errorCount
      });

      setBatchErrors(batchErrorDetails);
      setServerMessages(serverMessageDetails);

      if (errorCount === 0) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: `${successCount} stock item(s) uploaded successfully in ${totalBatches} batch(es)!`
        });
        setBulkUploadFile(null);
        setUploadPreview([]);
        setUploadErrors([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else if (successCount > 0) {
        addNotification({
          type: 'warning',
          title: 'Partial Success',
          message: `${successCount} items uploaded successfully, ${errorCount} failed across ${totalBatches} batch(es)`
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Upload Failed',
          message: `Failed to upload ${errorCount} items. Please check the errors and try again.`
        });
      }
    } catch (error) {
      console.error('Error uploading bulk stock:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || error.message || 'Failed to upload stock items. Please try again.'
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  // Form field configuration
  // Note: RFID Number and Item Code are in Common Information for single product, but in formFields for multiple products
  const formFields = [
    { key: 'RFIDNumber', label: 'RFID Number', type: 'text', required: false, placeholder: 'Enter RFID number' },
    { key: 'Itemcode', label: 'Item Code (Must be Unique)', type: 'text', required: true, placeholder: 'Enter item code' },
    { key: 'category_id', label: 'Category', type: 'select', required: true, options: 'categories' },
    { key: 'product_id', label: 'Product', type: 'select', required: true, options: 'products' },
    { key: 'branch_id', label: 'Branch', type: 'text', required: false, placeholder: 'Enter branch name' },
    { key: 'counter_id', label: 'Counter ID', type: 'text', required: false, placeholder: 'Enter counter name' },
    { key: 'design_id', label: 'Design', type: 'select', required: false, options: 'designs' },
    { key: 'purity_id', label: 'Purity', type: 'select', required: false, options: 'purities' },
    { key: 'grosswt', label: 'Gross Weight', type: 'number', required: false, placeholder: 'Enter gross wt', step: '0.001' },
    { key: 'stonewt', label: 'Stone Weight', type: 'number', required: false, placeholder: 'Enter stone wt', step: '0.001' },
    { key: 'netwt', label: 'Net Weight', type: 'number', required: false, placeholder: 'Auto-calculated', step: '0.001', readOnly: true },
    { key: 'box_details', label: 'Box Details', type: 'text', required: false, placeholder: 'Enter box details' },
    { key: 'size', label: 'Size', type: 'number', required: false, placeholder: 'Enter size', step: '1' },
    { key: 'stoneamount', label: 'Stone Amount', type: 'number', required: false, placeholder: 'Enter stone amount', step: '0.01' },
    { key: 'HallmarkAmount', label: 'Hallmark Amount', type: 'number', required: false, placeholder: 'Enter hallmark amount', step: '0.01' },
    { key: 'MakingPerGram', label: 'Making Per Gram', type: 'number', required: false, placeholder: 'Enter making per gram', step: '0.01' },
    { key: 'MakingPercentage', label: 'Making Percentage', type: 'number', required: false, placeholder: 'Enter making percentage', step: '0.01' },
    { key: 'MakingFixedAmt', label: 'Making Fixed Amount', type: 'number', required: false, placeholder: 'Enter making fixed amount', step: '0.01' },
    { key: 'MRP', label: 'MRP', type: 'number', required: false, placeholder: 'Enter MRP', step: '0.01' },
    { key: 'status', label: 'Status', type: 'select', required: false, options: ['ApiActive'], disabled: true },
    // Stone fields (for first stone entry)
    { key: 'StoneName', label: 'Stone Name', type: 'text', required: false, placeholder: 'e.g., Ruby', group: 'stone' },
    { key: 'StoneWeight', label: 'Stone Weight (Detail)', type: 'number', required: false, placeholder: 'e.g., 1.5', step: '0.001', group: 'stone' },
    { key: 'StonePieces', label: 'Stone Pieces', type: 'number', required: false, placeholder: 'e.g., 5', step: '1', group: 'stone' },
    { key: 'StoneRate', label: 'Stone Rate', type: 'number', required: false, placeholder: 'e.g., 1000', step: '0.01', group: 'stone' },
    { key: 'StoneAmount', label: 'Stone Amount (Detail)', type: 'number', required: false, placeholder: 'e.g., 5000', step: '0.01', group: 'stone' },
    { key: 'StoneDescription', label: 'Stone Description', type: 'text', required: false, placeholder: 'e.g., Premium Ruby', group: 'stone' },
    { key: 'StoneLessPercent', label: 'Stone Less Percent', type: 'number', required: false, placeholder: 'e.g., 2', step: '0.01', group: 'stone' },
    { key: 'StoneCertificate', label: 'Stone Certificate', type: 'text', required: false, placeholder: 'e.g., Cert123', group: 'stone' },
    { key: 'StoneSettingType', label: 'Stone Setting Type', type: 'text', required: false, placeholder: 'e.g., Prong', group: 'stone' },
    { key: 'StoneRatePerPiece', label: 'Stone Rate Per Piece', type: 'number', required: false, placeholder: 'e.g., 1000', step: '0.01', group: 'stone' },
    { key: 'StoneRateKarate', label: 'Stone Rate Karate', type: 'number', required: false, placeholder: 'e.g., 500', step: '0.01', group: 'stone' },
    { key: 'StoneStatusType', label: 'Stone Status Type', type: 'text', required: false, placeholder: 'e.g., Active', group: 'stone' },
    // Stone 2 (multiple stones per product)
    { key: 'StoneName_2', label: 'Stone Name (2nd)', type: 'text', required: false, placeholder: 'e.g., Emerald', group: 'stone' },
    { key: 'StoneWeight_2', label: 'Stone Weight (2nd)', type: 'number', required: false, placeholder: 'e.g., 0.8', step: '0.001', group: 'stone' },
    { key: 'StonePieces_2', label: 'Stone Pieces (2nd)', type: 'number', required: false, placeholder: 'e.g., 3', step: '1', group: 'stone' },
    { key: 'StoneRate_2', label: 'Stone Rate (2nd)', type: 'number', required: false, placeholder: 'e.g., 2500', step: '0.01', group: 'stone' },
    { key: 'StoneAmount_2', label: 'Stone Amount (2nd)', type: 'number', required: false, placeholder: 'e.g., 6000', step: '0.01', group: 'stone' },
    { key: 'StoneDescription_2', label: 'Stone Description (2nd)', type: 'text', required: false, placeholder: 'e.g., Natural Emerald', group: 'stone' },
    { key: 'StoneLessPercent_2', label: 'Stone Less % (2nd)', type: 'number', required: false, placeholder: 'e.g., 1.5', step: '0.01', group: 'stone' },
    { key: 'StoneCertificate_2', label: 'Stone Certificate (2nd)', type: 'text', required: false, placeholder: 'e.g., Cert456', group: 'stone' },
    { key: 'StoneSettingType_2', label: 'Stone Setting (2nd)', type: 'text', required: false, placeholder: 'e.g., Bezel', group: 'stone' },
    { key: 'StoneRatePerPiece_2', label: 'Stone Rate/Piece (2nd)', type: 'number', required: false, placeholder: 'e.g., 2000', step: '0.01', group: 'stone' },
    { key: 'StoneRateKarate_2', label: 'Stone Rate/Karate (2nd)', type: 'number', required: false, placeholder: 'e.g., 7500', step: '0.01', group: 'stone' },
    { key: 'StoneStatusType_2', label: 'Stone Status (2nd)', type: 'text', required: false, placeholder: 'e.g., Active', group: 'stone' },
    // Stone 3
    { key: 'StoneName_3', label: 'Stone Name (3rd)', type: 'text', required: false, placeholder: 'e.g., Sapphire', group: 'stone' },
    { key: 'StoneWeight_3', label: 'Stone Weight (3rd)', type: 'number', required: false, placeholder: 'e.g., 1.2', step: '0.001', group: 'stone' },
    { key: 'StonePieces_3', label: 'Stone Pieces (3rd)', type: 'number', required: false, placeholder: 'e.g., 4', step: '1', group: 'stone' },
    { key: 'StoneRate_3', label: 'Stone Rate (3rd)', type: 'number', required: false, placeholder: 'e.g., 1800', step: '0.01', group: 'stone' },
    { key: 'StoneAmount_3', label: 'Stone Amount (3rd)', type: 'number', required: false, placeholder: 'e.g., 8640', step: '0.01', group: 'stone' },
    { key: 'StoneDescription_3', label: 'Stone Description (3rd)', type: 'text', required: false, placeholder: 'e.g., Blue Sapphire', group: 'stone' },
    { key: 'StoneLessPercent_3', label: 'Stone Less % (3rd)', type: 'number', required: false, placeholder: 'e.g., 2', step: '0.01', group: 'stone' },
    { key: 'StoneCertificate_3', label: 'Stone Certificate (3rd)', type: 'text', required: false, placeholder: 'e.g., Cert789', group: 'stone' },
    { key: 'StoneSettingType_3', label: 'Stone Setting (3rd)', type: 'text', required: false, placeholder: 'e.g., Pave', group: 'stone' },
    { key: 'StoneRatePerPiece_3', label: 'Stone Rate/Piece (3rd)', type: 'number', required: false, placeholder: 'e.g., 2160', step: '0.01', group: 'stone' },
    { key: 'StoneRateKarate_3', label: 'Stone Rate/Karate (3rd)', type: 'number', required: false, placeholder: 'e.g., 1800', step: '0.01', group: 'stone' },
    { key: 'StoneStatusType_3', label: 'Stone Status (3rd)', type: 'text', required: false, placeholder: 'e.g., Active', group: 'stone' },
    // Diamond fields (for first diamond entry)
    { key: 'DiamondName', label: 'Diamond Name', type: 'text', required: false, placeholder: 'e.g., Round Diamond', group: 'diamond' },
    { key: 'DiamondWeight', label: 'Diamond Weight (Detail)', type: 'number', required: false, placeholder: 'e.g., 0.5', step: '0.001', group: 'diamond' },
    { key: 'DiamondSellRate', label: 'Diamond Sell Rate', type: 'number', required: false, placeholder: 'e.g., 50000', step: '0.01', group: 'diamond' },
    { key: 'DiamondPieces', label: 'Diamond Pieces', type: 'number', required: false, placeholder: 'e.g., 1', step: '1', group: 'diamond' },
    { key: 'DiamondClarity', label: 'Diamond Clarity', type: 'text', required: false, placeholder: 'e.g., VS1', group: 'diamond' },
    { key: 'DiamondColour', label: 'Diamond Colour', type: 'text', required: false, placeholder: 'e.g., D', group: 'diamond' },
    { key: 'DiamondCut', label: 'Diamond Cut', type: 'text', required: false, placeholder: 'e.g., Excellent', group: 'diamond' },
    { key: 'DiamondShape', label: 'Diamond Shape', type: 'text', required: false, placeholder: 'e.g., Round', group: 'diamond' },
    { key: 'DiamondSize', label: 'Diamond Size', type: 'number', required: false, placeholder: 'e.g., 0.5', step: '0.01', group: 'diamond' },
    { key: 'DiamondCertificate', label: 'Diamond Certificate', type: 'text', required: false, placeholder: 'e.g., GIA123', group: 'diamond' },
    { key: 'DiamondSettingType', label: 'Diamond Setting Type', type: 'text', required: false, placeholder: 'e.g., Prong', group: 'diamond' },
    { key: 'DiamondSellAmount', label: 'Diamond Sell Amount', type: 'number', required: false, placeholder: 'e.g., 25000', step: '0.01', group: 'diamond' },
    { key: 'DiamondPurchaseAmount', label: 'Diamond Purchase Amount', type: 'number', required: false, placeholder: 'e.g., 20000', step: '0.01', group: 'diamond' },
    { key: 'DiamondDescription', label: 'Diamond Description', type: 'text', required: false, placeholder: 'e.g., Premium Diamond', group: 'diamond' },
    { key: 'DiamondMargin', label: 'Diamond Margin', type: 'number', required: false, placeholder: 'e.g., 25', step: '0.01', group: 'diamond' },
    { key: 'TotalDiamondWeight', label: 'Total Diamond Weight', type: 'number', required: false, placeholder: 'e.g., 0.5', step: '0.001', group: 'diamond' },
    // Diamond 2 (multiple diamonds per product)
    { key: 'DiamondName_2', label: 'Diamond Name (2nd)', type: 'text', required: false, placeholder: 'e.g., Princess Cut', group: 'diamond' },
    { key: 'DiamondWeight_2', label: 'Diamond Weight (2nd)', type: 'number', required: false, placeholder: 'e.g., 0.75', step: '0.001', group: 'diamond' },
    { key: 'DiamondSellRate_2', label: 'Diamond Sell Rate (2nd)', type: 'number', required: false, placeholder: 'e.g., 60000', step: '0.01', group: 'diamond' },
    { key: 'DiamondPieces_2', label: 'Diamond Pieces (2nd)', type: 'number', required: false, placeholder: 'e.g., 1', step: '1', group: 'diamond' },
    { key: 'DiamondClarity_2', label: 'Diamond Clarity (2nd)', type: 'text', required: false, placeholder: 'e.g., VVS2', group: 'diamond' },
    { key: 'DiamondColour_2', label: 'Diamond Colour (2nd)', type: 'text', required: false, placeholder: 'e.g., E', group: 'diamond' },
    { key: 'DiamondCut_2', label: 'Diamond Cut (2nd)', type: 'text', required: false, placeholder: 'e.g., Very Good', group: 'diamond' },
    { key: 'DiamondShape_2', label: 'Diamond Shape (2nd)', type: 'text', required: false, placeholder: 'e.g., Princess', group: 'diamond' },
    { key: 'DiamondSize_2', label: 'Diamond Size (2nd)', type: 'number', required: false, placeholder: 'e.g., 0.75', step: '0.01', group: 'diamond' },
    { key: 'DiamondCertificate_2', label: 'Diamond Certificate (2nd)', type: 'text', required: false, placeholder: 'e.g., GIA456', group: 'diamond' },
    { key: 'DiamondSettingType_2', label: 'Diamond Setting (2nd)', type: 'text', required: false, placeholder: 'e.g., Channel', group: 'diamond' },
    { key: 'DiamondSellAmount_2', label: 'Diamond Sell Amount (2nd)', type: 'number', required: false, placeholder: 'e.g., 45000', step: '0.01', group: 'diamond' },
    { key: 'DiamondPurchaseAmount_2', label: 'Diamond Purchase Amount (2nd)', type: 'number', required: false, placeholder: 'e.g., 38000', step: '0.01', group: 'diamond' },
    { key: 'DiamondDescription_2', label: 'Diamond Description (2nd)', type: 'text', required: false, placeholder: 'e.g., Princess Cut', group: 'diamond' },
    { key: 'DiamondMargin_2', label: 'Diamond Margin (2nd)', type: 'number', required: false, placeholder: 'e.g., 18', step: '0.01', group: 'diamond' },
    { key: 'TotalDiamondWeight_2', label: 'Total Diamond Wt (2nd)', type: 'number', required: false, placeholder: 'e.g., 0.75', step: '0.001', group: 'diamond' },
    // Diamond 3
    { key: 'DiamondName_3', label: 'Diamond Name (3rd)', type: 'text', required: false, placeholder: 'e.g., Oval Diamond', group: 'diamond' },
    { key: 'DiamondWeight_3', label: 'Diamond Weight (3rd)', type: 'number', required: false, placeholder: 'e.g., 0.30', step: '0.001', group: 'diamond' },
    { key: 'DiamondSellRate_3', label: 'Diamond Sell Rate (3rd)', type: 'number', required: false, placeholder: 'e.g., 35000', step: '0.01', group: 'diamond' },
    { key: 'DiamondPieces_3', label: 'Diamond Pieces (3rd)', type: 'number', required: false, placeholder: 'e.g., 2', step: '1', group: 'diamond' },
    { key: 'DiamondClarity_3', label: 'Diamond Clarity (3rd)', type: 'text', required: false, placeholder: 'e.g., SI1', group: 'diamond' },
    { key: 'DiamondColour_3', label: 'Diamond Colour (3rd)', type: 'text', required: false, placeholder: 'e.g., G', group: 'diamond' },
    { key: 'DiamondCut_3', label: 'Diamond Cut (3rd)', type: 'text', required: false, placeholder: 'e.g., Good', group: 'diamond' },
    { key: 'DiamondShape_3', label: 'Diamond Shape (3rd)', type: 'text', required: false, placeholder: 'e.g., Oval', group: 'diamond' },
    { key: 'DiamondSize_3', label: 'Diamond Size (3rd)', type: 'number', required: false, placeholder: 'e.g., 0.30', step: '0.01', group: 'diamond' },
    { key: 'DiamondCertificate_3', label: 'Diamond Certificate (3rd)', type: 'text', required: false, placeholder: 'e.g., GIA789', group: 'diamond' },
    { key: 'DiamondSettingType_3', label: 'Diamond Setting (3rd)', type: 'text', required: false, placeholder: 'e.g., Prong', group: 'diamond' },
    { key: 'DiamondSellAmount_3', label: 'Diamond Sell Amount (3rd)', type: 'number', required: false, placeholder: 'e.g., 21000', step: '0.01', group: 'diamond' },
    { key: 'DiamondPurchaseAmount_3', label: 'Diamond Purchase Amount (3rd)', type: 'number', required: false, placeholder: 'e.g., 17500', step: '0.01', group: 'diamond' },
    { key: 'DiamondDescription_3', label: 'Diamond Description (3rd)', type: 'text', required: false, placeholder: 'e.g., Oval Pair', group: 'diamond' },
    { key: 'DiamondMargin_3', label: 'Diamond Margin (3rd)', type: 'number', required: false, placeholder: 'e.g., 20', step: '0.01', group: 'diamond' },
    { key: 'TotalDiamondWeight_3', label: 'Total Diamond Wt (3rd)', type: 'number', required: false, placeholder: 'e.g., 0.60', step: '0.001', group: 'diamond' }
  ];

  const renderField = (field, value, onChange, isMultiple = false, index = null, tabIndex = null) => {
    const fieldId = isMultiple ? `${field.key}_${index}` : field.key;
    
    // Get options for dropdown fields
    let dropdownOptions = [];
    if (field.type === 'select' && typeof field.options === 'string') {
      // Dynamic options from master data
      let dataArray = [];
      if (field.options === 'categories') {
        dataArray = categories;
      } else if (field.options === 'products') {
        dataArray = products;
      } else if (field.options === 'designs') {
        dataArray = designs;
      } else if (field.options === 'purities') {
        dataArray = purities;
      }
      
      // Extract names from data array - specific to each type
      dropdownOptions = dataArray.map(item => {
        if (field.options === 'categories') {
          return item.CategoryName || item.Name || item.Category || item.categoryName || item.name || item.category || '';
        } else if (field.options === 'products') {
          return item.ProductName || item.Name || item.Product || item.productName || item.name || item.product || '';
        } else if (field.options === 'designs') {
          return item.DesignName || item.Name || item.Design || item.designName || item.name || item.design || '';
        } else if (field.options === 'purities') {
          return item.PurityName || item.Name || item.Purity || item.purityName || item.name || item.purity || '';
        }
        return '';
      }).filter(Boolean).sort();
    } else if (Array.isArray(field.options)) {
      dropdownOptions = field.options;
    }
    
    return (
      <div key={field.key} style={{ marginBottom: '6px' }}>
        <label htmlFor={fieldId} style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '3px' }}>
          {field.label}
          {field.required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
        {field.type === 'select' ? (
          <SearchableDropdown
            options={dropdownOptions}
            value={field.disabled ? (field.options && field.options[0]) : (value || '')}
            onChange={(val) => !field.disabled && onChange(field.key, val)}
            placeholder={`Select ${field.label}`}
            disabled={field.disabled || (loadingMasterData && typeof field.options === 'string')}
            required={field.required}
            inputStyle={{ height: '30px', minHeight: '30px', padding: '6px 28px 6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, Poppins, sans-serif' }}
            tabIndex={tabIndex}
          />
        ) : (
          <input
            id={fieldId}
            type={field.type}
            value={value || ''}
            onChange={(e) => !field.readOnly && onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            step={field.step}
            required={field.required}
            readOnly={field.readOnly}
            tabIndex={tabIndex}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              outline: 'none',
              boxSizing: 'border-box',
              background: field.readOnly ? '#f1f5f9' : '#f8fafc',
              cursor: field.readOnly ? 'not-allowed' : 'text',
              color: field.readOnly ? '#94a3b8' : '#1e293b',
              height: '30px',
              minHeight: '30px',
              fontFamily: 'Inter, Poppins, sans-serif'
            }}
            onFocus={(e) => {
              if (!field.readOnly) {
                e.target.style.borderColor = '#0077d4';
                e.target.style.background = '#ffffff';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
              }
            }}
            onBlur={(e) => {
              if (!field.readOnly) {
                e.target.style.borderColor = '#f1f1f1';
                e.target.style.background = '#f1f1f1';
                e.target.style.boxShadow = 'none';
              }
            }}
            onKeyDown={(e) => {
              // Allow Enter key to move to next field
              if (e.key === 'Enter' && !field.readOnly) {
                e.preventDefault();
                const form = e.target.form || e.target.closest('form') || document.querySelector('form');
                if (form) {
                  const inputs = Array.from(form.querySelectorAll('input, select, textarea, button')).filter(
                    el => !el.disabled && el.tabIndex >= 0
                  );
                  const currentIndex = inputs.indexOf(e.target);
                  if (currentIndex < inputs.length - 1) {
                    inputs[currentIndex + 1].focus();
                  }
                }
              }
            }}
          />
        )}
      </div>
    );
  };

  // Stone/Diamond Modal Component - image-style UI: row add (+), row delete (trash), exact fields only. Supports single product, multiple products, or added record.
  const StoneDiamondModal = () => {
    const isStone = stoneDiamondData.type === 'stone';
    const addedIdx = stoneDiamondData.addedRecordIndex;
    const currentProduct = addedIdx !== null && addedIdx !== undefined
      ? addedRecords[addedIdx]
      : stoneDiamondData.productIndex !== null
        ? multipleProducts[stoneDiamondData.productIndex]
        : singleProduct;
    const listKey = isStone ? 'stoneList' : 'diamondList';
    const list = currentProduct?.[listKey] || [];

    // Stone: Stone Name, Size, Weight, Pieces, Rate/Pieces, Rate/Weight, Amount, Description (Stone Deduct removed)
    const stoneEmptyEntry = {
      StoneName: '', StoneSize: '', StoneWeight: '', StonePieces: '', StoneRatePerPiece: '',
      StoneRateKarate: '', StoneAmount: '', StoneDescription: ''
    };
    // Diamond: Diamond Name, Diamond Sieve, Diamond Size, Weight, Pieces, Rate, Amount, Diamond Cut, Setting Type, Description (Diamond Deduct removed)
    const diamondEmptyEntry = {
      DiamondName: '', DiamondSieve: '', DiamondSize: '', DiamondWeight: '', DiamondPieces: '',
      DiamondSellRate: '', DiamondSellAmount: '', DiamondCut: '', DiamondSettingType: '',
      DiamondDescription: ''
    };
    const emptyEntry = isStone ? stoneEmptyEntry : diamondEmptyEntry;

    const [entries, setEntries] = useState(list.length > 0 ? list.map(e => ({ ...emptyEntry, ...e })) : [{ ...emptyEntry }]);

    const updateEntry = (index, key, value) => {
      setEntries(prev => prev.map((e, i) => i === index ? { ...e, [key]: value } : e));
    };

    const addRow = () => setEntries(prev => [...prev, { ...emptyEntry }]);
    const removeRow = (index) => {
      if (entries.length > 1) setEntries(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
      const totalStoneWt = isStone ? entries.reduce((s, e) => s + (parseFloat(e.StoneWeight) || 0), 0) : 0;
      const totalStonePcs = isStone ? entries.reduce((s, e) => s + (parseInt(e.StonePieces) || 0), 0) : 0;
      const totalDiaWt = !isStone ? entries.reduce((s, e) => s + (parseFloat(e.DiamondWeight) || 0), 0) : 0;
      const totalDiaPcs = !isStone ? entries.reduce((s, e) => s + (parseInt(e.DiamondPieces) || 0), 0) : 0;

      if (addedIdx !== null && addedIdx !== undefined) {
        setAddedRecords(prev => prev.map((r, i) => i !== addedIdx ? r : {
          ...r,
          [listKey]: entries,
          ...(isStone ? { stonewt: String(totalStoneWt), stoneamount: String(totalStonePcs) } : { diamondweight: String(totalDiaWt), diamondAmount: String(totalDiaPcs) })
        }));
      } else if (stoneDiamondData.productIndex !== null) {
        const updatedProducts = [...multipleProducts];
        updatedProducts[stoneDiamondData.productIndex] = {
          ...updatedProducts[stoneDiamondData.productIndex],
          [listKey]: entries,
          ...(isStone ? { stonewt: String(totalStoneWt), stoneamount: String(totalStonePcs) } : { diamondweight: String(totalDiaWt), diamondAmount: String(totalDiaPcs) })
        };
        setMultipleProducts(updatedProducts);
      } else {
        setSingleProduct(prev => ({
          ...prev,
          [listKey]: entries,
          ...(isStone ? { stonewt: String(totalStoneWt), stoneamount: String(totalStonePcs) } : { diamondweight: String(totalDiaWt), diamondAmount: String(totalDiaPcs) }),
          netwt: calculateNetWeight(prev.grosswt, isStone ? String(totalStoneWt) : prev.stonewt)
        }));
      }
      setShowStoneDiamondModal(false);
      addNotification({ type: 'success', title: 'Success', message: `${isStone ? 'Stone' : 'Diamond'} details saved (${entries.length} ${entries.length === 1 ? 'entry' : 'entries'})!` });
    };

    if (!showStoneDiamondModal) return null;

    const stoneFields = [
      { key: 'StoneName', label: 'Stone Name', type: 'text', placeholder: 'Select Stone' },
      { key: 'StoneSize', label: 'Size', type: 'text', placeholder: 'Select Size' },
      { key: 'StoneWeight', label: 'Weight', type: 'number', placeholder: 'Weight', step: '0.001' },
      { key: 'StonePieces', label: 'Pieces', type: 'number', placeholder: 'Pieces', step: '1' },
      { key: 'StoneRatePerPiece', label: 'Rate/Pieces', type: 'number', placeholder: 'Rate/Pieces', step: '0.01' },
      { key: 'StoneRateKarate', label: 'Rate/Weight', type: 'number', placeholder: 'Rate/Weight', step: '0.01' },
      { key: 'StoneAmount', label: 'Amount', type: 'number', placeholder: 'Amount', step: '0.01' },
      { key: 'StoneDescription', label: 'Description', type: 'text', placeholder: 'Description' }
    ];
    const diamondFields = [
      { key: 'DiamondName', label: 'Diamond Name', type: 'text', placeholder: 'Select Diamo' },
      { key: 'DiamondSieve', label: 'Diamond Sieve', type: 'text', placeholder: 'Select Diamo' },
      { key: 'DiamondSize', label: 'Diamond Size', type: 'text', placeholder: 'Select Diamo' },
      { key: 'DiamondWeight', label: 'Weight', type: 'number', placeholder: 'Weight', step: '0.001' },
      { key: 'DiamondPieces', label: 'Pieces', type: 'number', placeholder: 'Pieces', step: '1' },
      { key: 'DiamondSellRate', label: 'Rate', type: 'number', placeholder: 'Rate', step: '0.01' },
      { key: 'DiamondSellAmount', label: 'Amount', type: 'number', placeholder: 'Amount', step: '0.01' },
      { key: 'DiamondCut', label: 'Diamond Cut', type: 'text', placeholder: 'Select Diamo' },
      { key: 'DiamondSettingType', label: 'Setting Type', type: 'text', placeholder: 'Select Setting' },
      { key: 'DiamondDescription', label: 'Description', type: 'text', placeholder: 'Description' }
    ];
    const fields = isStone ? stoneFields : diamondFields;

    const renderInput = (idx, field) => (
      <div key={field.key} style={{ minWidth: 0, flex: '1 1 0' }}>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 500, color: '#475569', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{field.label}</label>
        <input
          type={field.type}
          value={entries[idx]?.[field.key] || ''}
          onChange={(e) => updateEntry(idx, field.key, e.target.value)}
          placeholder={field.placeholder}
          step={field.step}
          style={{
            width: '100%',
            padding: '4px 6px',
            fontSize: '11px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            outline: 'none',
            background: '#f8fafc',
            color: '#1e293b',
            fontFamily: 'Inter, Poppins, sans-serif',
            height: '26px',
            boxSizing: 'border-box',
            minWidth: 0
          }}
        />
      </div>
    );

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }} onClick={() => setShowStoneDiamondModal(false)}>
        <div style={{
          background: '#ffffff',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }} onClick={(e) => e.stopPropagation()}>
          {/* Modal Header - dark bar, title left, X right */}
          <div style={{
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: isStone ? '#374151' : '#1e3a5f'
          }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
              {isStone ? 'Add Stone Details' : 'Add Diamond Details'}
            </h3>
            <button
              type="button"
              onClick={() => setShowStoneDiamondModal(false)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: '#4b5563',
                color: '#ffffff',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
            >
              <FaTimes />
            </button>
          </div>

          {/* Modal Body - one row per entry: all fields in single row, then + and trash */}
          <div style={{ padding: '12px 16px', overflow: 'auto', minHeight: 0, flex: 1 }}>
            {entries.map((entry, idx) => (
              <div key={idx} style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'flex-end',
                marginBottom: '10px',
                flexWrap: 'nowrap',
                minWidth: 0
              }}>
                {fields.map(f => renderInput(idx, f))}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={addRow}
                    title="Add new row"
                    style={{
                      width: '28px',
                      height: '26px',
                      padding: 0,
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      background: '#e2e8f0',
                      color: '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px'
                    }}
                  >
                    <FaPlus />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    title="Delete this row"
                    style={{
                      width: '28px',
                      height: '26px',
                      padding: 0,
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      background: '#e2e8f0',
                      color: '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px'
                    }}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Footer - Cancel (X) and Save (check) blue buttons */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            background: '#f8fafc'
          }}>
            <button
              type="button"
              onClick={() => setShowStoneDiamondModal(false)}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: '#3b82f6',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaTimes style={{ fontSize: '12px' }} /> Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: '#3b82f6',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaCheckCircle style={{ fontSize: '12px' }} /> Save
            </button>
          </div>
        </div>
      </div>
    );

  };

  return (
    <div style={{ 
      padding: '32px', 
      fontFamily: 'Inter, Poppins, sans-serif', 
      background: '#ffffff', 
      minHeight: '100vh',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .product-details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }
        @media (max-width: 1200px) {
          .product-details-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
        }
        @media (max-width: 768px) {
          .product-details-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
        /* Zoho-style focus ring */
        input:focus-visible,
        select:focus-visible,
        button:focus-visible {
          outline: 2px solid #0077d4;
          outline-offset: 2px;
        }
        /* Custom scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      {/* Header with Toggle Buttons */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e0e7ef',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        flexShrink: 0
      }}>
        {/* Left Side - Title */}
        <div>
          <h2 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: 700, 
            color: '#232a36',
            letterSpacing: '-0.01em',
            lineHeight: '1.2'
          }}>
            Add Stock
          </h2>
          <p style={{ 
            margin: '6px 0 0', 
            fontSize: '13px', 
            color: '#64748b',
            fontWeight: 400
          }}>
            Add new RFID transaction details with complete product information
          </p>
        </div>

        {/* Right Side - Toggle Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Main Section Toggle */}
          <div style={{ 
            display: 'flex', 
            background: '#f1f5f9', 
            padding: '4px', 
            borderRadius: '10px', 
            gap: '4px',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <button
              onClick={() => setActiveSection(1)}
              tabIndex={3}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: activeSection === 1 ? '#ffffff' : 'transparent',
                color: activeSection === 1 ? '#0077d4' : '#64748b',
                boxShadow: activeSection === 1 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'Inter, Poppins, sans-serif'
              }}
              onMouseEnter={(e) => {
                if (activeSection !== 1) {
                  e.target.style.color = '#0077d4';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== 1) {
                  e.target.style.color = '#64748b';
                }
              }}
            >
              Stock Entry
            </button>
            <button
              onClick={() => setActiveSection(3)}
              tabIndex={4}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: activeSection === 3 ? '#ffffff' : 'transparent',
                color: activeSection === 3 ? '#0077d4' : '#64748b',
                boxShadow: activeSection === 3 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'Inter, Poppins, sans-serif'
              }}
              onMouseEnter={(e) => {
                if (activeSection !== 3) {
                  e.target.style.color = '#0077d4';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== 3) {
                  e.target.style.color = '#64748b';
                }
              }}
            >
              <FaFileExcel /> Bulk Upload
            </button>
          </div>
          {activeSection === 3 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px', flexWrap: 'wrap' }}>
            <button
                onClick={() => downloadExcelTemplate('normal')}
              style={{
                  padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                  border: '1px solid #10b981',
                  background: '#ffffff',
                  color: '#10b981',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                  e.target.style.background = '#10b981';
                  e.target.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                  e.target.style.background = '#ffffff';
                  e.target.style.color = '#10b981';
              }}
            >
                <FaDownload /> Add Stock Template
            </button>
            <button
                onClick={() => downloadExcelTemplate('withStoneDiamond')}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                  border: '1px solid #3b82f6',
                background: '#ffffff',
                  color: '#3b82f6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                  e.target.style.background = '#3b82f6';
                e.target.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#ffffff';
                  e.target.style.color = '#3b82f6';
              }}
            >
                <FaDownload /> Stone & Diamond Template
            </button>
            </div>
          )}
        </div>
      </div>

      {/* Stone/Diamond Modal */}
      <StoneDiamondModal />

      {/* Section 1: Stock Entry (Single or Multiple) */}
      {activeSection === 1 && (
        <>
          {/* Single Entry Mode */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e0e7ef',
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>

          {/* Common Information - single line, proper alignment */}
          <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
          
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 80px)',
              gap: '12px',
              alignItems: 'end'
            }}>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                  RFID Number <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {(() => {
                  const rfidTrim = (singleProduct.RFIDNumber || '').trim();
                  const hasRfidMoreThan4 = rfidTrim.length > 4;
                  const showTidPresent = tidByBarcode != null;
                  const showTidMissing = hasRfidMoreThan4 && !tidLoading && tidByBarcode === null;
                  const isGreen = showTidPresent && !fieldErrors.RFIDNumber;
                  const isRed = fieldErrors.RFIDNumber || showTidMissing;
                  const isReadOnly = false;
                  return (
                    <>
                <input
                  type="text"
                  value={singleProduct.RFIDNumber}
                        readOnly={isReadOnly}
                        onChange={(e) => !isReadOnly && updateSingleField('RFIDNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        onBlur={(e) => {
                          e.target.style.borderColor = isRed ? '#dc2626' : isGreen ? '#16a34a' : '#f1f1f1';
                          e.target.style.background = isRed ? '#fef2f2' : isGreen ? '#f0fdf4' : '#f1f1f1';
                          e.target.style.boxShadow = 'none';
                          if ((singleProduct.RFIDNumber || '').trim().length > 4) fetchTidForRfid(singleProduct.RFIDNumber);
                        }}
                        placeholder="e.g., CZ5898"
                  required
                  tabIndex={10}
                  style={{
                    width: '100%',
                          padding: '6px 10px',
                          fontSize: '12px',
                          border: isRed ? '1px solid #dc2626' : isGreen ? '1px solid #16a34a' : '1px solid #e2e8f0',
                          borderRadius: '6px',
                    outline: 'none',
                    boxSizing: 'border-box',
                          height: '30px',
                          minHeight: '30px',
                          background: isRed ? '#fef2f2' : isGreen ? '#f0fdf4' : '#f8fafc',
                          color: '#1e293b',
                    fontFamily: 'Inter, Poppins, sans-serif',
                          cursor: isReadOnly ? 'default' : 'text'
                  }}
                  onFocus={(e) => {
                          e.target.style.borderColor = isRed ? '#dc2626' : isGreen ? '#16a34a' : '#0077d4';
                          e.target.style.background = isRed ? '#fef2f2' : isGreen ? '#f0fdf4' : '#ffffff';
                          e.target.style.boxShadow = isRed
                      ? '0 0 0 3px rgba(220, 38, 38, 0.1)' 
                            : isGreen ? '0 0 0 3px rgba(22, 163, 74, 0.1)' : '0 0 0 3px rgba(0, 119, 212, 0.1)';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                            const nextGridCell = e.target.closest('div[style*="minWidth"]')?.parentElement?.nextElementSibling;
                            const nextInput = nextGridCell?.querySelector('input, [role="combobox"]');
                      if (nextInput) nextInput.focus();
                    }
                  }}
                />
                {fieldErrors.RFIDNumber && (
                  <div style={{
                    marginTop: '4px',
                          fontSize: '11px',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                          <FaExclamationTriangle style={{ fontSize: '11px' }} />
                    <span>{fieldErrors.RFIDNumber}</span>
                  </div>
                )}
                    </>
                  );
                })()}
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>TID</label>
                <div
                  title={tidByBarcode != null ? tidByBarcode : ''}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                  fontSize: '12px', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    color: '#475569',
                    height: '30px',
                    minHeight: '30px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tidLoading ? '...' : (tidByBarcode != null ? tidByBarcode : '—')}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                  Item Code (Must be Unique) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={singleProduct.Itemcode}
                  onChange={(e) => updateSingleField('Itemcode', e.target.value)}
                  placeholder="e.g., SAU124"
                  required
                  tabIndex={11}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: '12px',
                    border: fieldErrors.Itemcode ? '1px solid #dc2626' : '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    height: '30px',
                    minHeight: '30px',
                    background: fieldErrors.Itemcode ? '#fef2f2' : '#f8fafc',
                    color: '#1e293b',
                    fontFamily: 'Inter, Poppins, sans-serif'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = fieldErrors.Itemcode ? '#dc2626' : '#0077d4';
                    e.target.style.background = fieldErrors.Itemcode ? '#fef2f2' : '#ffffff';
                    e.target.style.boxShadow = fieldErrors.Itemcode 
                      ? '0 0 0 3px rgba(220, 38, 38, 0.1)' 
                      : '0 0 0 3px rgba(0, 119, 212, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = fieldErrors.Itemcode ? '#dc2626' : '#f1f1f1';
                    e.target.style.background = fieldErrors.Itemcode ? '#fef2f2' : '#f1f1f1';
                    e.target.style.boxShadow = 'none';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const nextInput = e.target.parentElement.nextElementSibling?.querySelector('input, select');
                      if (nextInput) nextInput.focus();
                    }
                  }}
                />
                {fieldErrors.Itemcode && (
                  <div style={{
                    marginTop: '4px',
                    fontSize: '12px',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <FaExclamationTriangle style={{ fontSize: '12px' }} />
                    <span>{fieldErrors.Itemcode}</span>
                  </div>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>Branch Name</label>
                <SearchableDropdownWithAdd
                  options={getBranchOptions()}
                  value={sharedData.branch_name}
                  onChange={(value) => setSharedData(prev => ({ ...prev, branch_name: value }))}
                  placeholder="Select Branch"
                  disabled={loadingBranchesCounters}
                  allowAdd={true}
                  fieldType="branch"
                  userInfo={userInfo}
                  onAddNew={handleAddNewEntry}
                  onOptionsUpdate={handleOptionsUpdate}
                  tabIndex={12}
                  inputStyle={{ height: '30px', minHeight: '30px', padding: '6px 28px 6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, Poppins, sans-serif' }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>Counter Name</label>
                <SearchableDropdownWithAdd
                  options={getCounterOptions()}
                  value={sharedData.counter_name}
                  onChange={(value) => setSharedData(prev => ({ ...prev, counter_name: value }))}
                  placeholder="Select Counter"
                  disabled={loadingBranchesCounters}
                  allowAdd={true}
                  fieldType="counter"
                  userInfo={userInfo}
                  onAddNew={handleAddNewEntry}
                  onOptionsUpdate={handleOptionsUpdate}
                  tabIndex={13}
                  inputStyle={{ height: '30px', minHeight: '30px', padding: '6px 28px 6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, Poppins, sans-serif' }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={addStockQuantity}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setAddStockQuantity(isNaN(v) || v < 1 ? 1 : v);
                  }}
                  placeholder="1"
                  tabIndex={14}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                  fontSize: '12px', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    height: '30px',
                    minHeight: '30px',
                    background: '#f8fafc',
                    color: '#1e293b',
                    fontFamily: 'Inter, Poppins, sans-serif'
                  }}
                />
              </div>
            </div>
              </div>

          {/* Product Details & Weights - 11 fields per row, 2 rows; Stone/Diamond after Status; responsive */}
          <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
            <h4 style={{ marginBottom: '10px', fontSize: '13px', fontWeight: 600, color: '#232a36' }}>Product Details & Weights</h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(125px, 1fr))',
              gap: '10px',
              alignItems: 'end'
            }}>
              {/* Row 1: Category, Product, Design, Purity, Gross Wt, Stone Wt, Diamond Ht, Diamond Wt, Net Wt, Box Details, Size (11) */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '3px' }}>Category <span style={{ color: '#dc2626' }}>*</span></label>
                <SearchableDropdownWithAdd options={getCategoryOptions()} value={singleProduct.category_id} onChange={(v) => updateSingleField('category_id', v)} placeholder="Category" disabled={loadingMasterData} required allowAdd fieldType="category" userInfo={userInfo} onAddNew={handleAddNewEntry} onOptionsUpdate={handleOptionsUpdate} tabIndex={14} inputStyle={{ height: '30px', minHeight: '30px', padding: '6px 28px 6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, Poppins, sans-serif', width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '3px' }}>Product <span style={{ color: '#dc2626' }}>*</span></label>
                <SearchableDropdownWithAdd options={getProductOptions()} value={singleProduct.product_id} onChange={(v) => updateSingleField('product_id', v)} placeholder="Product" disabled={loadingMasterData} required allowAdd fieldType="product" userInfo={userInfo} onAddNew={handleAddNewEntry} onOptionsUpdate={handleOptionsUpdate} tabIndex={15} inputStyle={{ height: '30px', minHeight: '30px', padding: '6px 28px 6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, Poppins, sans-serif', width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '3px' }}>Design</label>
                <SearchableDropdownWithAdd options={getDesignOptions(singleProduct.product_id)} value={singleProduct.design_id} onChange={(v) => updateSingleField('design_id', v)} placeholder="Design" disabled={loadingMasterData} allowAdd fieldType="design" userInfo={userInfo} onAddNew={handleAddNewEntry} onOptionsUpdate={handleOptionsUpdate} tabIndex={16} inputStyle={{ height: '30px', minHeight: '30px', padding: '6px 28px 6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, Poppins, sans-serif', width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '3px' }}>Purity</label>
                <SearchableDropdownWithAdd options={getPurityOptions(singleProduct.category_id, singleProduct.product_id)} value={singleProduct.purity_id} onChange={(v) => updateSingleField('purity_id', v)} placeholder="Purity" disabled={loadingMasterData} allowAdd fieldType="purity" userInfo={userInfo} onAddNew={handleAddNewEntry} onOptionsUpdate={handleOptionsUpdate} tabIndex={17} inputStyle={{ height: '30px', minHeight: '30px', padding: '6px 28px 6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, Poppins, sans-serif', width: '100%', boxSizing: 'border-box' }} />
              </div>
              {['grosswt', 'stonewt', 'netwt', 'box_details', 'size'].map((key, i) => {
                const field = formFields.find(f => f.key === key);
                return field ? <div key={key} style={{ minWidth: 0 }}>{renderField(field, singleProduct[field.key], updateSingleField, false, null, 18 + i)}</div> : null;
              })}
              {/* Row 2: Stone Amount, Hallmark, Making Per Gram, Making %, Making Fixed Amt, MRP - Status always ApiActive, not shown */}
              {['stoneamount', 'HallmarkAmount', 'MakingPerGram', 'MakingPercentage', 'MakingFixedAmt', 'MRP'].map((key, i) => {
                const field = formFields.find(f => f.key === key);
                return field ? <div key={key} style={{ minWidth: 0 }}>{renderField(field, singleProduct[field.key], updateSingleField, false, null, 26 + i)}</div> : null;
              })}
            </div>
              </div>

          {/* Stone section - below Product Details & Weights */}
          <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
            <h4 style={{ marginBottom: '10px', fontSize: '13px', fontWeight: 600, color: '#232a36' }}>Stone</h4>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
              <button type="button" tabIndex={35} onClick={() => { setStoneDiamondData({ type: 'stone', productIndex: null, addedRecordIndex: null }); setShowStoneDiamondModal(true); }} style={{ padding: '8px 20px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', border: '1px solid #fbbf24', background: '#fef3c7', color: '#92400e', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter, Poppins, sans-serif' }}>💎 Stone</button>
            </div>
            {/* Show added stone data below buttons */}
            {singleProduct.stoneList && singleProduct.stoneList.length > 0 && (
              <div style={{ marginTop: '12px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', marginBottom: '6px' }}>💎 Stone details ({singleProduct.stoneList.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {singleProduct.stoneList.map((entry, idx) => (
                    <div key={`stone-${idx}`} style={{ fontSize: '11px', padding: '6px 10px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fcd34d' }}>
                      {entry.StoneName && <span>{entry.StoneName}</span>}
                      {entry.StoneWeight && <span> · {entry.StoneWeight}g</span>}
                      {entry.StonePieces != null && entry.StonePieces !== '' && <span> · {entry.StonePieces} pcs</span>}
                      {(!entry.StoneName && !entry.StoneWeight && entry.StonePieces == null) && <span>Entry #{idx + 1}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/label-stock')}
              tabIndex={100}
              style={{
                padding: '8px 18px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #10b981',
                background: '#ffffff',
                color: '#10b981',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                fontFamily: 'Inter, Poppins, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#10b981';
                e.target.style.color = '#ffffff';
                e.target.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#ffffff';
                e.target.style.color = '#10b981';
                e.target.style.boxShadow = 'none';
              }}
            >
              <FaList /> Inventory List
            </button>
            <button
              onClick={handleAddToRecordList}
              tabIndex={101}
              style={{
                padding: '8px 18px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                background: '#10b981',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                fontFamily: 'Inter, Poppins, sans-serif',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#059669';
                e.target.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#10b981';
                e.target.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
              }}
            >
              <FaPlus /> Add
            </button>
            <button
              onClick={resetSingleForm}
              tabIndex={102}
              style={{
                padding: '8px 18px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'Inter, Poppins, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f1f5f9';
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.color = '#475569';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#ffffff';
                e.target.style.borderColor = '#e0e7ef';
                e.target.style.color = '#64748b';
              }}
            >
              Reset
            </button>
            {addedRecords.length > 0 && (
            <button
                onClick={clearAddedRecords}
              style={{
                  padding: '8px 18px',
                  fontSize: '12px',
                fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  background: '#ffffff',
                  color: '#dc2626',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Inter, Poppins, sans-serif'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#fef2f2';
                  e.target.style.borderColor = '#f87171';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ffffff';
                  e.target.style.borderColor = '#fecaca';
                }}
              >
                <FaTrash /> Clear All
              </button>
            )}
            <button
              onClick={handleSubmitAllRecords}
              disabled={loading || addedRecords.length === 0}
              tabIndex={103}
              style={{
                padding: '8px 18px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                background: loading ? '#94a3b8' : '#0077d4',
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                fontFamily: 'Inter, Poppins, sans-serif',
                boxShadow: loading ? 'none' : '0 2px 4px rgba(0, 119, 212, 0.2)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = '#005fa3';
                  e.target.style.boxShadow = '0 4px 8px rgba(0, 119, 212, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = '#0077d4';
                  e.target.style.boxShadow = '0 2px 4px rgba(0, 119, 212, 0.2)';
                }
              }}
            >
              <FaSave /> Add Stock
            </button>
          </div>

          {/* Why data was not added - validation messages below Add button */}
          {addFormValidationErrors.length > 0 && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontFamily: 'Inter, Poppins, sans-serif'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#b91c1c', marginBottom: '6px' }}>
                Data was not added because:
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#991b1b', lineHeight: 1.6 }}>
                {addFormValidationErrors.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
        </div>
      )}

          {/* Added Records Table */}
          {addedRecords.length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <h4 style={{ marginBottom: '10px', fontSize: '13px', fontWeight: 600, color: '#232a36' }}>
                Added Records ({addedRecords.length})
              </h4>
              <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#e2e8f0', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px' }}>Sr.No.</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px' }}>RFID Code</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px' }}>Item Code</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px' }}>Branch (From)</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px' }}>Counter (From)</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px' }}>Category</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px' }}>Product</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px' }}>Design</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px' }}>Gross Wt</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px' }}>Stones</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px' }}>Net Wt</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px' }}>MRP</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '11px' }}>Stone / Diamond</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '11px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addedRecords.map((record, index) => {
                      const rowTid = addedRecordTids[index] || { tid: null, loading: false };
                      const rfidTrim = (record.RFIDNumber || '').trim();
                      const hasRfidMoreThan4 = rfidTrim.length > 4;
                      const showTidPresent = rowTid.tid != null;
                      const showTidMissing = hasRfidMoreThan4 && !rowTid.loading && rowTid.tid === null;
                      const rfidGreen = showTidPresent;
                      const rfidRed = showTidMissing;
                      const rfidReadOnly = false;
                      const recordCategory = (record.category_id || '').toLowerCase();
                      const canAddDiamond = recordCategory.includes('diamond');
                      return (
                      <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '6px 10px', color: '#1e293b', fontSize: '11px' }}>{index + 1}</td>
                        <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>
                          <input
                            type="text"
                            value={record.RFIDNumber || ''}
                            readOnly={rfidReadOnly}
                            onChange={(e) => !rfidReadOnly && updateAddedRecordField(index, 'RFIDNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                            onBlur={() => { if ((record.RFIDNumber || '').trim().length > 4) fetchTidForAddedRecord(index, record.RFIDNumber); }}
                            placeholder="RFID"
                            style={{
                              width: '100%',
                              minWidth: '70px',
                              padding: '4px 6px',
                              fontSize: '11px',
                              border: rfidRed ? '1px solid #dc2626' : rfidGreen ? '1px solid #16a34a' : '1px solid #e2e8f0',
                              borderRadius: '4px',
                              outline: 'none',
                              boxSizing: 'border-box',
                              background: rfidRed ? '#fef2f2' : rfidGreen ? '#f0fdf4' : '#f8fafc',
                              color: '#1e293b',
                              cursor: rfidReadOnly ? 'default' : 'text'
                            }}
                          />
                        </td>
                        <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>
                          <input
                            type="text"
                            value={record.Itemcode || ''}
                            onChange={(e) => updateAddedRecordField(index, 'Itemcode', e.target.value)}
                            placeholder="Item Code"
                            style={{
                              width: '100%',
                              minWidth: '80px',
                              padding: '4px 6px',
                              fontSize: '11px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '4px',
                              outline: 'none',
                              boxSizing: 'border-box',
                              background: '#f8fafc',
                              color: '#1e293b'
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px 10px', color: '#1e293b', fontSize: '11px' }}>
                          {sharedData.branch_name || <span style={{ color: '#94a3b8' }}>Select Branch above</span>}
                        </td>
                        <td style={{ padding: '6px 10px', color: '#1e293b', fontSize: '11px' }}>
                          {sharedData.counter_name || <span style={{ color: '#94a3b8' }}>Select Counter above</span>}
                        </td>
                        <td style={{ padding: '6px 10px', color: '#1e293b', fontSize: '11px' }}>{record.category_id}</td>
                        <td style={{ padding: '6px 10px', color: '#1e293b', fontSize: '11px' }}>{record.product_id}</td>
                        <td style={{ padding: '6px 10px', color: '#1e293b', fontSize: '11px' }}>{record.design_id}</td>
                        <td style={{ padding: '6px 10px', color: '#1e293b', fontSize: '11px' }}>{record.grosswt}</td>
                        <td style={{ padding: '6px 10px', color: '#1e293b', fontSize: '11px' }}>{record.stonewt || record.stoneamount || '-'}</td>
                        <td style={{ padding: '6px 10px', color: '#1e293b', fontSize: '11px' }}>{record.diamondweight || record.diamondAmount || '-'}</td>
                        <td style={{ padding: '6px 10px', color: '#1e293b', fontSize: '11px' }}>{record.netwt}</td>
                        <td style={{ padding: '6px 10px', color: '#1e293b', fontSize: '11px' }}>{record.MRP}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => { setStoneDiamondData({ type: 'stone', productIndex: null, addedRecordIndex: index }); setShowStoneDiamondModal(true); }}
                              style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 600, borderRadius: '4px', border: '1px solid #fbbf24', background: '#fef3c7', color: '#92400e', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              💎 Stone
                            </button>
                            {canAddDiamond && (
                              <button
                                type="button"
                                onClick={() => { setStoneDiamondData({ type: 'diamond', productIndex: null, addedRecordIndex: index }); setShowStoneDiamondModal(true); }}
                                style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 600, borderRadius: '4px', border: '1px solid #60a5fa', background: '#dbeafe', color: '#1e40af', cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                💠 Diamond
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveFromRecordList(index)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '6px',
                              border: '1px solid #ef4444',
                              background: '#ffffff',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseEnter={(e) => { e.target.style.background = '#ef4444'; e.target.style.color = '#ffffff'; }}
                            onMouseLeave={(e) => { e.target.style.background = '#ffffff'; e.target.style.color = '#ef4444'; }}
                          >
                            <FaTrash /> Remove
                          </button>
                        </td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

          {/* Multiple Entry Mode - REMOVED - unified into single flow above */}
          {false && (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          {/* Header Bar - Clear Products count and actions */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderBottom: '2px solid #e2e8f0',
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b', letterSpacing: '-0.02em' }}>
                Products
              </h3>
              <span style={{
                padding: '6px 14px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#0077d4',
                background: '#eff6ff',
                borderRadius: '20px',
                border: '1px solid #bfdbfe',
                minWidth: '36px',
                textAlign: 'center'
              }}>
                {multipleProducts.length}
              </span>
              {multipleProducts.length > 0 && (
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                  {multipleProducts.length === 1 ? '1 item ready' : `${multipleProducts.length} items ready`}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {multipleProducts.length > 0 && (
                <button
                  onClick={clearAllProducts}
                  style={{
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    background: '#ffffff',
                    color: '#dc2626',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#fef2f2';
                    e.target.style.borderColor = '#f87171';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#ffffff';
                    e.target.style.borderColor = '#fecaca';
                  }}
                >
                  <FaTrash style={{ fontSize: '12px' }} /> Clear All
                </button>
              )}
              {!showTemplateForm && (
                <button
                  onClick={showAddProductForm}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: 'none',
                    background: '#10b981',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#059669';
                    e.target.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#10b981';
                    e.target.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.3)';
                  }}
                >
                  <FaPlus style={{ fontSize: '14px' }} /> Add New Product
                </button>
              )}
            </div>
          </div>

          {/* Template Form - Add New Product card */}
          {showTemplateForm && (
            <div style={{
              margin: '20px 24px',
              padding: '24px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '2px dashed #94a3b8',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              borderLeft: '4px solid #10b981'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '2px solid #e5e7eb'
              }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10b981'
                  }} />
                  Add New Product
                </h4>
                  <button
                    onClick={handleAddProducts}
                    style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                      fontWeight: 600,
                    borderRadius: '8px',
                      border: 'none',
                      background: '#10b981',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    gap: '8px',
                      transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#059669';
                    e.target.style.boxShadow = '0 4px 10px rgba(16, 185, 129, 0.45)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#10b981';
                    e.target.style.boxShadow = '0 2px 6px rgba(16, 185, 129, 0.35)';
                    }}
                  >
                  <FaPlus style={{ fontSize: '14px' }} /> Add Product
                  </button>
              </div>

              {/* Product Identification - RFID, Item Code, Branch, Counter, Quantity */}
              <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <h5 style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 700, color: '#1e293b', letterSpacing: '0.02em' }}>
                  Product Identification
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      RFID Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={productTemplate.RFIDNumber}
                      onChange={(e) => updateTemplateField('RFIDNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="e.g., CZ5898"
                      required
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                        height: '28px',
                        minHeight: '28px'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      Item Code (Base) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={productTemplate.Itemcode}
                      onChange={(e) => updateTemplateField('Itemcode', e.target.value)}
                      placeholder="e.g., SOP004"
                      required
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                        height: '28px',
                        minHeight: '28px'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                      Sequential codes will be generated (SOP005, SOP006...)
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      Quantity <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={productTemplate.quantity || 1}
                      onChange={(e) => updateTemplateField('quantity', Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                      placeholder="1"
                      required
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                        height: '28px',
                        minHeight: '28px'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      Branch Name
                    </label>
                    <SearchableDropdownWithAdd
                      options={getBranchOptions()}
                      value={sharedData.branch_name}
                      onChange={(value) => setSharedData(prev => ({ ...prev, branch_name: value }))}
                      placeholder="Select or type to add Branch"
                      disabled={loadingBranchesCounters}
                      allowAdd={true}
                      fieldType="branch"
                      userInfo={userInfo}
                      onAddNew={handleAddNewEntry}
                      onOptionsUpdate={handleOptionsUpdate}
                      inputStyle={{ height: '28px', minHeight: '28px', padding: '4px 24px 4px 8px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      Counter Name
                    </label>
                    <SearchableDropdownWithAdd
                      options={getCounterOptions()}
                      value={sharedData.counter_name}
                      onChange={(value) => setSharedData(prev => ({ ...prev, counter_name: value }))}
                      placeholder="Select or type to add Counter"
                      disabled={loadingBranchesCounters}
                      allowAdd={true}
                      fieldType="counter"
                      userInfo={userInfo}
                      onAddNew={handleAddNewEntry}
                      onOptionsUpdate={handleOptionsUpdate}
                      inputStyle={{ height: '28px', minHeight: '28px', padding: '4px 24px 4px 8px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Product Details Section */}
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 700, color: '#1e293b', letterSpacing: '0.02em' }}>
                  Product Details
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
                  {/* Category Field */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                      Category <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <SearchableDropdownWithAdd
                      options={getCategoryOptions()}
                      value={productTemplate.category_id}
                      onChange={(value) => updateTemplateField('category_id', value)}
                      placeholder="Select or add Category"
                      disabled={loadingMasterData}
                      required={true}
                      allowAdd={true}
                      fieldType="category"
                      userInfo={userInfo}
                      onAddNew={handleAddNewEntry}
                      onOptionsUpdate={handleOptionsUpdate}
                      inputStyle={{ height: '28px', minHeight: '28px', padding: '4px 24px 4px 8px', fontSize: '12px' }}
                    />
                  </div>

                  {/* Product Field */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                      Product <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <SearchableDropdownWithAdd
                      options={getProductOptions()}
                      value={productTemplate.product_id}
                      onChange={(value) => updateTemplateField('product_id', value)}
                      placeholder="Select or add Product"
                      disabled={loadingMasterData}
                      required={true}
                      allowAdd={true}
                      fieldType="product"
                      userInfo={userInfo}
                      onAddNew={handleAddNewEntry}
                      onOptionsUpdate={handleOptionsUpdate}
                      inputStyle={{ height: '28px', minHeight: '28px', padding: '4px 24px 4px 8px', fontSize: '12px' }}
                    />
                  </div>

                  {/* Design Field */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                      Design
                    </label>
                    <SearchableDropdownWithAdd
                      options={getDesignOptions()}
                      value={productTemplate.design_id}
                      onChange={(value) => updateTemplateField('design_id', value)}
                      placeholder="Select or add Design"
                      disabled={loadingMasterData}
                      allowAdd={true}
                      fieldType="design"
                      userInfo={userInfo}
                      onAddNew={handleAddNewEntry}
                      onOptionsUpdate={handleOptionsUpdate}
                      inputStyle={{ height: '28px', minHeight: '28px', padding: '4px 24px 4px 8px', fontSize: '12px' }}
                    />
                  </div>

                  {/* Purity Field */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                      Purity
                    </label>
                    <SearchableDropdownWithAdd
                      options={getPurityOptions()}
                      value={productTemplate.purity_id}
                      onChange={(value) => updateTemplateField('purity_id', value)}
                      placeholder="Select or add Purity"
                      disabled={loadingMasterData}
                      allowAdd={true}
                      fieldType="purity"
                      userInfo={userInfo}
                      onAddNew={handleAddNewEntry}
                      onOptionsUpdate={handleOptionsUpdate}
                      inputStyle={{ height: '28px', minHeight: '28px', padding: '4px 24px 4px 8px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Other Product Fields Template (excluding RFID, Item Code, Category, Product, Design, Purity, Stone/Diamond) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '12px' }}>
                {formFields.filter(field => 
                  field.key !== 'RFIDNumber' && 
                  field.key !== 'Itemcode' && 
                  field.key !== 'category_id' && 
                  field.key !== 'product_id' && 
                  field.key !== 'design_id' && 
                  field.key !== 'purity_id' &&
                  field.key !== 'branch_id' &&
                  field.key !== 'counter_id' &&
                  field.group !== 'stone' &&
                  field.group !== 'diamond'
                ).map(field => renderField(field, productTemplate[field.key], updateTemplateField))}
              </div>
            </div>
          )}

          {/* Product Rows - Show added products */}
          {multipleProducts.length > 0 && (
            <div style={{ margin: '0 24px 24px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '18px',
                flexWrap: 'wrap',
                gap: '12px',
                paddingBottom: '12px',
                borderBottom: '2px solid #e2e8f0'
              }}>
                <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaCheckCircle style={{ color: '#10b981', fontSize: '18px' }} />
                Added Products ({multipleProducts.length} {multipleProducts.length === 1 ? 'item' : 'items'})
              </h4>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Search Input */}
                  <input
                    type="text"
                    placeholder="Search by RFID, Item Code..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      outline: 'none',
                      width: '250px',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <button
                    onClick={clearAllProducts}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: '1px solid #ef4444',
                      background: '#ffffff',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#ef4444';
                      e.target.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#ffffff';
                      e.target.style.color = '#ef4444';
                    }}
                  >
                    <FaTrash /> Clear All
                  </button>
                </div>
              </div>

              {/* Filtered and Paginated Products */}
              {(() => {
                // Filter products based on search term
                const filteredProducts = multipleProducts.filter(product => {
                  if (!searchTerm) return true;
                  const search = searchTerm.toLowerCase();
                  return (
                    (product.RFIDNumber || '').toLowerCase().includes(search) ||
                    (product.Itemcode || '').toLowerCase().includes(search) ||
                    (product.category_id || '').toLowerCase().includes(search) ||
                    (product.product_id || '').toLowerCase().includes(search)
                  );
                });

                // Calculate pagination
                const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
                const startIndex = (currentPage - 1) * productsPerPage;
                const endIndex = startIndex + productsPerPage;
                const currentProducts = filteredProducts.slice(startIndex, endIndex);

                return (
                  <>
                    {filteredProducts.length === 0 ? (
                      <div style={{
                        padding: '40px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px dashed #cbd5e1'
                      }}>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                          No products found matching "{searchTerm}"
                        </p>
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom: '16px' }}>
                          {currentProducts.map((product, displayIndex) => {
                            const actualIndex = multipleProducts.indexOf(product);
                            const isExpanded = expandedProducts.has(actualIndex);
                            
                            return (
                              <div
                                key={actualIndex}
                style={{
                                  marginBottom: '16px',
                                  padding: '18px',
                                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                                  background: actualIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                                  position: 'relative',
                                  transition: 'all 0.2s',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                                {/* Compact Header - Always Visible */}
                                <div 
                                  style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    const newExpanded = new Set(expandedProducts);
                                    if (isExpanded) {
                                      newExpanded.delete(actualIndex);
                                    } else {
                                      newExpanded.add(actualIndex);
                                    }
                                    setExpandedProducts(newExpanded);
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                                      Product {actualIndex + 1}
                  </h4>
                                    <div style={{ 
                                      display: 'flex', 
                                      gap: '12px', 
                                      flexWrap: 'wrap',
                                      padding: '6px 12px',
                                      background: '#f1f5f9',
                                      borderRadius: '6px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>RFID:</span>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{product.RFIDNumber || 'N/A'}</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Item:</span>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{product.Itemcode || 'N/A'}</span>
                                      </div>
                                      {(product.category_id || product.product_id) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>
                                            {product.category_id || ''} / {product.product_id || ''}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ 
                                      fontSize: '12px', 
                                      color: '#64748b',
                                      marginRight: '8px'
                                    }}>
                                      {isExpanded ? '▼' : '▶'}
                                    </span>
                  {multipleProducts.length > 1 && (
                    <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeProductRow(actualIndex);
                                        }}
                      style={{
                                          padding: '4px 8px',
                                          fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid #ef4444',
                        background: '#ffffff',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                                          gap: '4px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#ef4444';
                        e.target.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#ffffff';
                        e.target.style.color = '#ef4444';
                      }}
                    >
                                        <FaTrash style={{ fontSize: '10px' }} /> Remove
                    </button>
                  )}
                </div>
                </div>

                                {/* Expanded Content - Show when clicked */}
                                {isExpanded && (
                                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                    {/* Product Identification */}
                                    <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                      <h5 style={{ marginBottom: '10px', fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                                        Product Identification
                                      </h5>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                                        <div>
                                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                            RFID Number <span style={{ color: '#ef4444' }}>*</span>
                                          </label>
                                          <input
                                            type="text"
                                            value={product.RFIDNumber || ''}
                                            onChange={(e) => updateMultipleField(actualIndex, 'RFIDNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                            placeholder="e.g., CZ5898"
                                            required
                                            style={{
                                              width: '100%',
                                              padding: '6px 8px',
                                              fontSize: '12px',
                                              border: '1px solid #e2e8f0',
                                              borderRadius: '6px',
                                              outline: 'none',
                                              transition: 'all 0.2s',
                                              boxSizing: 'border-box'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                          />
              </div>
                                        <div>
                                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                            Item Code <span style={{ color: '#ef4444' }}>*</span>
                                          </label>
                                          <input
                                            type="text"
                                            value={product.Itemcode || ''}
                                            onChange={(e) => updateMultipleField(actualIndex, 'Itemcode', e.target.value)}
                                            placeholder="e.g., SAU124"
                                            required
                                            style={{
                                              width: '100%',
                                              padding: '6px 8px',
                                              fontSize: '12px',
                                              border: '1px solid #e2e8f0',
                                              borderRadius: '6px',
                                              outline: 'none',
                                              transition: 'all 0.2s',
                                              boxSizing: 'border-box'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Product Details Section */}
                                    <div style={{ marginBottom: '16px' }}>
                                      <h5 style={{ marginBottom: '10px', fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                                        Product Details
                                      </h5>
                                      <div className="product-details-grid">
                                        {/* Category Field */}
                                        <div>
                                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                            Category <span style={{ color: '#ef4444' }}>*</span>
                                          </label>
                                          <SearchableDropdownWithAdd
                                            options={getCategoryOptions()}
                                            value={product.category_id || ''}
                                            onChange={(value) => updateMultipleField(actualIndex, 'category_id', value)}
                                            placeholder="Select or add Category"
                                            disabled={loadingMasterData}
                                            required={true}
                                            allowAdd={true}
                                            fieldType="category"
                                            userInfo={userInfo}
                                            onAddNew={handleAddNewEntry}
                                            onOptionsUpdate={handleOptionsUpdate}
                                          />
                                        </div>

                                        {/* Product Field */}
                                        <div>
                                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                            Product <span style={{ color: '#ef4444' }}>*</span>
                                          </label>
                                          <SearchableDropdownWithAdd
                                            options={getProductOptions()}
                                            value={product.product_id || ''}
                                            onChange={(value) => updateMultipleField(actualIndex, 'product_id', value)}
                                            placeholder="Select or add Product"
                                            disabled={loadingMasterData}
                                            required={true}
                                            allowAdd={true}
                                            fieldType="product"
                                            userInfo={userInfo}
                                            onAddNew={handleAddNewEntry}
                                            onOptionsUpdate={handleOptionsUpdate}
                                          />
                                        </div>

                                        {/* Design Field */}
                                        <div>
                                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                            Design
                                          </label>
                                          <SearchableDropdownWithAdd
                                            options={getDesignOptions(product.product_id)}
                                            value={product.design_id || ''}
                                            onChange={(value) => updateMultipleField(actualIndex, 'design_id', value)}
                                            placeholder="Select or add Design"
                                            disabled={loadingMasterData}
                                            allowAdd={true}
                                            fieldType="design"
                                            userInfo={userInfo}
                                            onAddNew={handleAddNewEntry}
                                            onOptionsUpdate={handleOptionsUpdate}
                                          />
                                        </div>

                                        {/* Purity Field */}
                                        <div>
                                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                            Purity
                                          </label>
                                          <SearchableDropdownWithAdd
                                            options={getPurityOptions(product.category_id, product.product_id)}
                                            value={product.purity_id || ''}
                                            onChange={(value) => updateMultipleField(actualIndex, 'purity_id', value)}
                                            placeholder="Select or add Purity"
                                            disabled={loadingMasterData}
                                            allowAdd={true}
                                            fieldType="purity"
                                            userInfo={userInfo}
                                            onAddNew={handleAddNewEntry}
                                            onOptionsUpdate={handleOptionsUpdate}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Other Product Fields */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
                                      {formFields.filter(field => 
                                        field.key !== 'category_id' && 
                                        field.key !== 'product_id' && 
                                        field.key !== 'design_id' && 
                                        field.key !== 'purity_id' &&
                                        field.key !== 'branch_id' &&
                                        field.key !== 'counter_id' &&
                                        field.group !== 'stone' &&
                                        field.group !== 'diamond'
                                      ).map(field => renderField(field, product[field.key], (fieldKey, value) => updateMultipleField(actualIndex, fieldKey, value), true, actualIndex))}
              </div>
                                    
                                    {/* Stone & Diamond Details Buttons - Diamond only when category is Diamond Gold */}
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setStoneDiamondData({ type: 'stone', productIndex: actualIndex, addedRecordIndex: null });
                                          setShowStoneDiamondModal(true);
                                        }}
                                        style={{
                                          padding: '8px 16px',
                                          fontSize: '12px',
                                          fontWeight: 600,
                                          borderRadius: '6px',
                                          border: '1px solid #fbbf24',
                                          background: '#fef3c7',
                                          color: '#92400e',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          transition: 'all 0.2s',
                                          fontFamily: 'Inter, Poppins, sans-serif'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.background = '#fde68a';
                                          e.target.style.borderColor = '#f59e0b';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.background = '#fef3c7';
                                          e.target.style.borderColor = '#fbbf24';
                                        }}
                                      >
                                        💎 Stone Details
                                      </button>
                                      {(product.category_id || '').toLowerCase().includes('diamond') && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setStoneDiamondData({ type: 'diamond', productIndex: actualIndex, addedRecordIndex: null });
                                            setShowStoneDiamondModal(true);
                                          }}
                                          style={{
                                            padding: '8px 16px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            borderRadius: '6px',
                                            border: '1px solid #60a5fa',
                                            background: '#dbeafe',
                                            color: '#1e40af',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s',
                                            fontFamily: 'Inter, Poppins, sans-serif'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.target.style.background = '#bfdbfe';
                                            e.target.style.borderColor = '#3b82f6';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.target.style.background = '#dbeafe';
                                            e.target.style.borderColor = '#60a5fa';
                                          }}
                                        >
                                          💠 Diamond Details
                                        </button>
                                      )}
                                    </div>
            </div>
          )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '20px',
                            padding: '12px',
                            background: '#f8fafc',
                            borderRadius: '8px'
                          }}>
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                background: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                                color: currentPage === 1 ? '#94a3b8' : '#1e293b',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Previous
                            </button>
                            <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                              Page {currentPage} of {totalPages} ({filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'})
                            </span>
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                background: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                                color: currentPage === totalPages ? '#94a3b8' : '#1e293b',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}
                

          {/* Submit Button - Save all products */}
          {multipleProducts.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              alignItems: 'center',
              margin: '24px 24px 0',
              padding: '20px 0 24px',
              borderTop: '2px solid #e5e7eb',
              background: '#ffffff'
            }}>
              <span style={{ fontSize: '13px', color: '#64748b', marginRight: 'auto' }}>
                {multipleProducts.length} {multipleProducts.length === 1 ? 'product' : 'products'} ready to save
              </span>
              <button
                onClick={handleSubmitMultiple}
                disabled={loading}
                style={{
                  padding: '14px 28px',
                  fontSize: '15px',
                  fontWeight: 600,
                  borderRadius: '10px',
                  border: 'none',
                  background: loading ? '#94a3b8' : '#0077d4',
                  color: '#ffffff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s',
                  boxShadow: loading ? 'none' : '0 4px 12px rgba(0, 119, 212, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background = '#005fa3';
                    e.target.style.boxShadow = '0 6px 16px rgba(0, 119, 212, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.background = '#0077d4';
                    e.target.style.boxShadow = '0 4px 12px rgba(0, 119, 212, 0.3)';
                  }
                }}
              >
                <FaSave style={{ fontSize: '16px' }} /> Save All Products ({multipleProducts.length})
              </button>
            </div>
          )}

          {/* Empty State - When no products and form hidden */}
          {multipleProducts.length === 0 && !showTemplateForm && (
            <div style={{
              textAlign: 'center',
              padding: '64px 24px',
              margin: '24px',
              background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '12px',
              border: '2px dashed #cbd5e1'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#eff6ff',
                border: '2px solid #bfdbfe',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <FaPlus style={{ fontSize: '32px', color: '#3b82f6' }} />
              </div>
              <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#1e293b' }}>No products added yet</p>
              <p style={{ fontSize: '14px', marginBottom: '28px', color: '#64748b', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                Click below to open the form, fill in details, then click &quot;Add Product&quot; to add items. You can add multiple products before saving.
              </p>
              <button
                onClick={showAddProductForm}
                style={{
                  padding: '14px 28px',
                  fontSize: '15px',
                  fontWeight: 600,
                  borderRadius: '10px',
                  border: 'none',
                  background: '#10b981',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#059669';
                  e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#10b981';
                  e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.35)';
                }}
              >
                <FaPlus style={{ fontSize: '16px' }} /> Add New Product
              </button>
            </div>
          )}
        </div>
      )}

        </>
      )}

      {/* Section 3: Bulk Upload with Excel */}
      {activeSection === 3 && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Main Content - scrollable */}
          <div style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            marginRight: showMappingSidebar && windowWidth > 768 ? '500px' : '0',
            transition: 'margin-right 0.3s ease'
          }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
            Bulk Upload
          </h3>

          {/* Sub-section Toggle */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
            <button
              onClick={() => setBulkUploadType('excel')}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
                borderBottom: bulkUploadType === 'excel' ? '2px solid #3b82f6' : '2px solid transparent',
                color: bulkUploadType === 'excel' ? '#3b82f6' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Upload Excel Sheet
            </button>
            <button
              onClick={() => setBulkUploadType('google')}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
                borderBottom: bulkUploadType === 'google' ? '2px solid #3b82f6' : '2px solid transparent',
                color: bulkUploadType === 'google' ? '#3b82f6' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Upload Google Sheet
            </button>
          </div>

          {bulkUploadType === 'excel' ? (
            <>
              <div style={{ marginBottom: '32px', padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                  Instructions:
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#64748b', lineHeight: '1.8' }}>
                  <li>Download a template: use <strong>Normal Template</strong> for basic stock fields, or <strong>Stone & Diamond Template</strong> to include stone and diamond detail columns</li>
                  <li>Fill in all required fields (marked with *): RFID Number, Item Code, Category, Product</li>
                  <li>Ensure data matches the template format exactly</li>
                  <li>Upload the completed Excel file below</li>
                  <li>Review the preview and fix any errors before submitting</li>
                </ul>
              </div>

              {/* File Upload */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    Select Excel File
                  </label>
                  <button
                    onClick={() => {
                      if (excelColumns.length > 0 || bulkUploadFile) {
                        setShowMappingSidebar(true);
                      } else {
                        addNotification({
                          type: 'info',
                          title: 'Info',
                          message: 'Please upload an Excel file first to map columns'
                        });
                      }
                    }}
                    disabled={!bulkUploadFile && excelColumns.length === 0}
                    style={{
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: '1px solid #10b981',
                      background: (!bulkUploadFile && excelColumns.length === 0) ? '#f1f5f9' : '#ffffff',
                      color: (!bulkUploadFile && excelColumns.length === 0) ? '#94a3b8' : '#10b981',
                      cursor: (!bulkUploadFile && excelColumns.length === 0) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      if (bulkUploadFile || excelColumns.length > 0) {
                        e.target.style.background = '#10b981';
                        e.target.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (bulkUploadFile || excelColumns.length > 0) {
                        e.target.style.background = '#ffffff';
                        e.target.style.color = '#10b981';
                      }
                    }}
                  >
                    <FaMap /> Map Columns
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: '1px solid #3b82f6',
                      background: '#ffffff',
                      color: '#3b82f6',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#3b82f6';
                      e.target.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#ffffff';
                      e.target.style.color = '#3b82f6';
                    }}
                  >
                    <FaUpload /> Choose File
                  </button>
                  {bulkUploadFile && (
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      {bulkUploadFile.name}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '32px', padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                  Google Sheets Instructions:
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#64748b', lineHeight: '1.8' }}>
                  <li>Open your Google Sheet</li>
                  <li>Ensure the first row contains headers (Field Titles)</li>
                  <li>Click <strong>File &gt; Share &gt; Publish to web</strong></li>
                  <li>Select "Entire Document" or the specific sheet, and choose "Comma-separated values (.csv)"</li>
                  <li>Copy the generated link and paste it below</li>
                  <li>Click "Load Data" to fetch columns and map them</li>
                </ul>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  Google Sheet URL (CSV Format)
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    placeholder="e.g., https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => {
                      // Placeholder logic for fetching Google Sheet data
                      // In a real implementation, this would fetch the CSV, parse it, and set rawExcelData/excelColumns
                      if (!googleSheetUrl) {
                        addNotification({ type: 'error', title: 'Error', message: 'Please enter a URL' });
                        return;
                      }
                      // Simulate fetching for UI demonstration
                      addNotification({ type: 'info', title: 'Info', message: 'Fetching data from Google Sheet...' });
                      // Mock parsing logic or future implementation
                    }}
                    style={{
                      padding: '10px 24px',
                      fontSize: '14px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: 'none',
                      background: '#3b82f6',
                      color: '#ffffff',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Load Data
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Errors */}
          {uploadErrors.length > 0 && (
            <div style={{ marginBottom: '24px', padding: '16px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <FaExclamationTriangle style={{ color: '#ef4444' }} />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#991b1b' }}>
                  Validation Errors ({uploadErrors.length})
                </h4>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#991b1b' }}>
                {uploadErrors.map((error, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Upload Progress - Main Section - Show when uploading OR when there are messages */}
          {(uploading || serverMessages.length > 0) && (
            <div style={{
              marginBottom: '24px',
              padding: '24px',
              background: '#ffffff',
              borderRadius: '12px',
              border: uploadProgress.errorCount > 0 ? '2px solid #ef4444' : uploadProgress.successCount > 0 && uploadProgress.errorCount === 0 ? '2px solid #10b981' : '2px solid #e5e7eb',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: '16px', 
                    fontWeight: 600, 
                    color: uploadProgress.errorCount > 0 ? '#dc2626' : uploadProgress.successCount > 0 && uploadProgress.errorCount === 0 ? '#059669' : '#1e293b'
                  }}>
                    {uploading ? 'Uploading Products...' : uploadProgress.errorCount > 0 ? 'Upload Completed with Errors' : 'Upload Completed Successfully'}
                  </h4>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {uploadProgress.successCount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaCheckCircle style={{ color: '#10b981', fontSize: '16px' }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                          {uploadProgress.successCount} Success
                        </span>
                      </div>
                    )}
                    {uploadProgress.errorCount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaTimesCircle style={{ color: '#ef4444', fontSize: '16px' }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>
                          {uploadProgress.errorCount} Failed
                        </span>
                      </div>
                    )}
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      color: uploadProgress.errorCount > 0 ? '#ef4444' : '#3b82f6'
                    }}>
                      {uploadProgress.current} / {uploadProgress.total} ({uploadProgress.percentage}%)
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  height: '32px',
                  background: '#e2e8f0',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: `${uploadProgress.percentage}%`,
                    height: '100%',
                    background: uploadProgress.errorCount > 0 
                      ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)' 
                      : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                    borderRadius: '16px',
                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {uploadProgress.percentage > 20 && (
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                        {uploadProgress.percentage}%
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Progress Stats */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '12px',
                  color: '#64748b',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <span>Processing: {uploadProgress.current} of {uploadProgress.total} products</span>
                  <span>Remaining: {uploadProgress.total - uploadProgress.current} products</span>
                  {uploadProgress.total > 0 && (
                    <span>Batch Size: 2000 products per batch</span>
                  )}
                </div>
              </div>

              {/* Server Messages - Always show if there are messages */}
              {serverMessages.length > 0 && (
                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                        Server Messages ({serverMessages.length})
                      </span>
                      {serverMessages.filter(m => m.type === 'error').length > 0 && (
                        <span style={{ 
                          fontSize: '12px', 
                          padding: '2px 8px',
                          background: '#fef2f2',
                          color: '#dc2626',
                          borderRadius: '12px',
                          fontWeight: 600
                        }}>
                          {serverMessages.filter(m => m.type === 'error').length} Error(s)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setServerMessages([]);
                        setBatchErrors([]);
                        setUploading(false);
                        setUploadProgress({ current: 0, total: 0, percentage: 0, successCount: 0, errorCount: 0 });
                      }}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        background: '#e5e7eb',
                        color: '#475569',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#cbd5e1';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#e5e7eb';
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {serverMessages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        style={{
                          padding: '12px',
                          background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4',
                          borderRadius: '8px',
                          border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
                          borderLeft: `4px solid ${msg.type === 'error' ? '#ef4444' : '#10b981'}`
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          marginBottom: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {msg.type === 'error' ? (
                              <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '14px' }} />
                            ) : (
                              <FaCheckCircle style={{ color: '#10b981', fontSize: '14px' }} />
                            )}
                            <span style={{ 
                              fontSize: '12px', 
                              fontWeight: 600, 
                              color: msg.type === 'error' ? '#991b1b' : '#166534'
                            }}>
                              Batch {msg.batch}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {msg.timestamp}
                          </span>
                        </div>
                        <div style={{ 
                          fontSize: '13px', 
                          color: msg.type === 'error' ? '#dc2626' : '#166534',
                          paddingLeft: '22px',
                          lineHeight: '1.6',
                          wordBreak: 'break-word'
                        }}>
                          {msg.message}
                        </div>
                        {msg.details && msg.details.errors && Object.keys(msg.details.errors).length > 0 && (
                          <div style={{ 
                            marginTop: '8px',
                            padding: '10px',
                            background: '#ffffff',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#991b1b',
                            paddingLeft: '22px',
                            maxHeight: '120px',
                            overflowY: 'auto',
                            border: '1px solid #fecaca'
                          }}>
                            <div style={{ fontWeight: 600, marginBottom: '6px', color: '#dc2626' }}>Error Details:</div>
                            {Object.entries(msg.details.errors).map(([key, value], errIdx) => (
                              <div key={errIdx} style={{ marginBottom: '6px', lineHeight: '1.5' }}>
                                <strong style={{ color: '#991b1b' }}>{key}:</strong> {Array.isArray(value) ? value.join(', ') : String(value)}
                              </div>
                            ))}
                          </div>
                        )}
                        {msg.details && msg.details.status && (
                          <div style={{ 
                            marginTop: '6px',
                            fontSize: '11px',
                            color: '#64748b',
                            paddingLeft: '22px',
                            fontStyle: 'italic'
                          }}>
                            Status: {msg.details.status}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Batch Errors - Show if there are batch errors */}
              {batchErrors.length > 0 && (
                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  background: '#fef2f2',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #fecaca'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '16px' }} />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                        Batch Errors ({batchErrors.length})
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setBatchErrors([]);
                      }}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        background: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#fecaca';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#fee2e2';
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {batchErrors.map((error, idx) => (
                      <div 
                        key={idx} 
                        style={{
                          padding: '12px',
                          background: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #fecaca',
                          borderLeft: '4px solid #ef4444'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          marginBottom: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '14px' }} />
                            <span style={{ 
                              fontSize: '12px', 
                              fontWeight: 600, 
                              color: '#991b1b'
                            }}>
                              Batch {error.batch} - {error.products} product(s) failed
                            </span>
                          </div>
                        </div>
                        <div style={{ 
                          fontSize: '13px', 
                          color: '#dc2626',
                          paddingLeft: '22px',
                          lineHeight: '1.6',
                          wordBreak: 'break-word'
                        }}>
                          {error.error}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #e5e7eb' }}>
            <button
              onClick={handleSubmitBulk}
              disabled={loading || uploadPreview.length === 0 || uploadErrors.length > 0 || uploading}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: (loading || uploadPreview.length === 0 || uploadErrors.length > 0 || uploading) ? '#94a3b8' : '#3b82f6',
                color: '#ffffff',
                cursor: (loading || uploadPreview.length === 0 || uploadErrors.length > 0 || uploading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <FaUpload /> Upload Products ({uploadPreview.length > 0 ? uploadPreview.length - uploadErrors.length : 0} valid)
            </button>
          </div>
          </div>

          {/* Mapping Sidebar */}
          {showMappingSidebar && (
            <div style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: windowWidth <= 768 ? '100%' : windowWidth <= 1024 ? '450px' : '500px',
              maxWidth: '90vw',
              height: '100vh',
              background: '#ffffff',
              boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* Sidebar Header */}
              <div style={{
                padding: windowWidth <= 768 ? '16px' : '20px',
                borderBottom: '1px solid #e5e7eb',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                  Map Excel Columns
                </h3>
                <button
                  onClick={() => setShowMappingSidebar(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e2e8f0';
                    e.target.style.color = '#1e293b';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'none';
                    e.target.style.color = '#64748b';
                  }}
                >
                  ×
                </button>
              </div>

              {/* Sidebar Content */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: windowWidth <= 768 ? '16px' : '20px',
                paddingBottom: '20px'
              }}>
                {/* Template Selection - At Top */}
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    Select Template (Optional)
                  </h4>
                  {templates.length > 0 ? (
                    <div style={{ marginBottom: '16px' }}>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => {
                          const templateId = e.target.value;
                          setSelectedTemplate(templateId);
                          if (templateId) {
                            // Auto-apply template when selected
                            const template = templates.find(t => 
                              (t.Id || t.id || t.TemplateId || t.templateId) == templateId
                            );
                            if (template) {
                              try {
                                let templateData = {};
                                
                                // Handle double-encoded JSON string
                                if (typeof template.TemplateData === 'string') {
                                  try {
                                    // First parse to get the string
                                    const firstParse = JSON.parse(template.TemplateData);
                                    // If it's still a string, parse again
                                    if (typeof firstParse === 'string') {
                                      templateData = JSON.parse(firstParse);
                                    } else {
                                      templateData = firstParse;
                                    }
                                  } catch (e) {
                                    // If single parse fails, try direct parse
                                    templateData = JSON.parse(template.TemplateData);
                                  }
                                } else {
                                  templateData = template.TemplateData || template.Template || {};
                                }
                                
                                setFieldMappings(templateData);
                                addNotification({
                                  type: 'success',
                                  title: 'Template Applied',
                                  message: 'Template mappings applied successfully!'
                                });
                              } catch (error) {
                                console.error('Error parsing template:', error);
                                addNotification({
                                  type: 'error',
                                  title: 'Error',
                                  message: 'Failed to apply template'
                                });
                              }
                            }
                          } else {
                            // Clear mappings if no template selected
                            setFieldMappings({});
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '13px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          outline: 'none',
                          background: '#ffffff',
                          cursor: 'pointer',
                          marginBottom: '12px'
                        }}
                      >
                        <option value="">Select Template</option>
                        {templates.map((template, idx) => {
                          const templateId = template.Id || template.id || template.TemplateId || template.templateId || idx;
                          const templateName = template.TemplateName || template.templateName || template.Name || template.name || `Template ${idx + 1}`;
                          return (
                            <option key={idx} value={templateId}>{templateName}</option>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                      No templates saved yet
                    </p>
                  )}

                  {/* Save Template */}
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      Save Current Mapping as Template
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Enter template name"
                        style={{
                          flex: 1,
                          minWidth: '120px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                      <button
                        onClick={saveTemplate}
                        disabled={savingTemplate || !templateName.trim()}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          border: 'none',
                          background: (savingTemplate || !templateName.trim()) ? '#94a3b8' : '#3b82f6',
                          color: '#ffffff',
                          cursor: (savingTemplate || !templateName.trim()) ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {savingTemplate ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Field Mappings - Grouped by type */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    Map Fields (Excluding Status)
                  </h4>
                  
                  {/* Main Product Fields */}
                  <div style={{ marginBottom: '20px' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#3b82f6', borderBottom: '2px solid #3b82f6', paddingBottom: '6px' }}>
                      Main Product Fields
                    </h5>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: windowWidth <= 480 ? 'repeat(1, 1fr)' : windowWidth <= 768 ? 'repeat(2, 1fr)' : windowWidth <= 1024 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
                      gap: '12px'
                    }}>
                      {formFields.filter(field => field.key !== 'status' && !field.group).map(field => {
                        const selectedValue = fieldMappings[field.key] || '';
                        const usedColumns = Object.values(fieldMappings).filter(Boolean);
                        const isMapped = !!selectedValue;
                        
                        return (
                          <div key={field.key} style={{
                            padding: '10px',
                            background: isMapped ? '#dbeafe' : '#f8fafc',
                            borderRadius: '8px',
                            border: isMapped ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                            transition: 'all 0.2s ease'
                          }}>
                            <label style={{
                              display: 'block',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#475569',
                              marginBottom: '6px'
                            }}>
                              {field.label}
                              {field.required && <span style={{ color: '#ef4444' }}> *</span>}
                            </label>
                            <select
                              value={selectedValue}
                              onChange={(e) => {
                                const newValue = e.target.value || undefined;
                                setFieldMappings(prev => {
                                  const updated = { ...prev };
                                  if (newValue) {
                                    updated[field.key] = newValue;
                                  } else {
                                    delete updated[field.key];
                                  }
                                  return updated;
                                });
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                fontSize: '12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                outline: 'none',
                                background: '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            >
                              <option value="">-- Select --</option>
                              {excelColumns.map((column, idx) => {
                                const isSelected = selectedValue === column;
                                const isUsedByOther = usedColumns.includes(column) && !isSelected;
                                
                                return (
                                  <option
                                    key={idx}
                                    value={column}
                                    disabled={isUsedByOther}
                                    style={{
                                      backgroundColor: isSelected ? '#e3f2fd' : 'white',
                                      color: isUsedByOther ? '#94a3b8' : '#1e293b'
                                    }}
                                  >
                                    {column} {isSelected ? '✓' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stone Fields */}
                  <div style={{ marginBottom: '20px' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#f59e0b', borderBottom: '2px solid #f59e0b', paddingBottom: '6px' }}>
                      Stone Details (Optional)
                    </h5>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: windowWidth <= 480 ? 'repeat(1, 1fr)' : windowWidth <= 768 ? 'repeat(2, 1fr)' : windowWidth <= 1024 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
                      gap: '12px'
                    }}>
                      {formFields.filter(field => field.group === 'stone').map(field => {
                        const selectedValue = fieldMappings[field.key] || '';
                        const usedColumns = Object.values(fieldMappings).filter(Boolean);
                        const isMapped = !!selectedValue;
                        
                        return (
                          <div key={field.key} style={{
                            padding: '10px',
                            background: isMapped ? '#fef3c7' : '#f8fafc',
                            borderRadius: '8px',
                            border: isMapped ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                            transition: 'all 0.2s ease'
                          }}>
                            <label style={{
                              display: 'block',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#475569',
                              marginBottom: '6px'
                            }}>
                              {field.label}
                            </label>
                            <select
                              value={selectedValue}
                              onChange={(e) => {
                                const newValue = e.target.value || undefined;
                                setFieldMappings(prev => {
                                  const updated = { ...prev };
                                  if (newValue) {
                                    updated[field.key] = newValue;
                                  } else {
                                    delete updated[field.key];
                                  }
                                  return updated;
                                });
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                fontSize: '12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                outline: 'none',
                                background: '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            >
                              <option value="">-- Select --</option>
                              {excelColumns.map((column, idx) => {
                                const isSelected = selectedValue === column;
                                const isUsedByOther = usedColumns.includes(column) && !isSelected;
                                
                                return (
                                  <option
                                    key={idx}
                                    value={column}
                                    disabled={isUsedByOther}
                                    style={{
                                      backgroundColor: isSelected ? '#fef3c7' : 'white',
                                      color: isUsedByOther ? '#94a3b8' : '#1e293b'
                                    }}
                                  >
                                    {column} {isSelected ? '✓' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Diamond Fields */}
                  <div style={{ marginBottom: '20px' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#8b5cf6', borderBottom: '2px solid #8b5cf6', paddingBottom: '6px' }}>
                      Diamond Details (Optional)
                    </h5>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: windowWidth <= 480 ? 'repeat(1, 1fr)' : windowWidth <= 768 ? 'repeat(2, 1fr)' : windowWidth <= 1024 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
                      gap: '12px'
                    }}>
                      {formFields.filter(field => field.group === 'diamond').map(field => {
                        const selectedValue = fieldMappings[field.key] || '';
                        const usedColumns = Object.values(fieldMappings).filter(Boolean);
                        const isMapped = !!selectedValue;
                        
                        return (
                          <div key={field.key} style={{
                            padding: '10px',
                            background: isMapped ? '#ede9fe' : '#f8fafc',
                            borderRadius: '8px',
                            border: isMapped ? '2px solid #8b5cf6' : '1px solid #e5e7eb',
                            transition: 'all 0.2s ease'
                          }}>
                            <label style={{
                              display: 'block',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#475569',
                              marginBottom: '6px'
                            }}>
                              {field.label}
                            </label>
                            <select
                              value={selectedValue}
                              onChange={(e) => {
                                const newValue = e.target.value || undefined;
                                setFieldMappings(prev => {
                                  const updated = { ...prev };
                                  if (newValue) {
                                    updated[field.key] = newValue;
                                  } else {
                                    delete updated[field.key];
                                  }
                                  return updated;
                                });
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                fontSize: '12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                outline: 'none',
                                background: '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            >
                              <option value="">-- Select --</option>
                              {excelColumns.map((column, idx) => {
                                const isSelected = selectedValue === column;
                                const isUsedByOther = usedColumns.includes(column) && !isSelected;
                                
                                return (
                                  <option
                                    key={idx}
                                    value={column}
                                    disabled={isUsedByOther}
                                    style={{
                                      backgroundColor: isSelected ? '#ede9fe' : 'white',
                                      color: isUsedByOther ? '#94a3b8' : '#1e293b'
                                    }}
                                  >
                                    {column} {isSelected ? '✓' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>


              {/* Sidebar Footer */}
              <div style={{
                padding: windowWidth <= 768 ? '16px' : '20px',
                borderTop: '1px solid #e5e7eb',
                background: '#f8fafc',
                display: 'flex',
                gap: '12px',
                flexShrink: 0
              }}>
                <button
                  onClick={() => {
                    if (!uploading) {
                      setShowMappingSidebar(false);
                      setFieldMappings({});
                      setSelectedTemplate('');
                      setBatchErrors([]);
                      setUploadProgress({ current: 0, total: 0, percentage: 0 });
                    }
                  }}
                  disabled={uploading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: uploading ? '#f1f5f9' : '#ffffff',
                    color: uploading ? '#94a3b8' : '#64748b',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading) {
                      e.target.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!uploading) {
                      e.target.style.background = '#ffffff';
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkStockUpload}
                  disabled={uploading || Object.keys(fieldMappings).length === 0}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: 'none',
                    background: (uploading || Object.keys(fieldMappings).length === 0) ? '#94a3b8' : '#10b981',
                    color: '#ffffff',
                    cursor: (uploading || Object.keys(fieldMappings).length === 0) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading && Object.keys(fieldMappings).length > 0) {
                      e.target.style.background = '#059669';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!uploading && Object.keys(fieldMappings).length > 0) {
                      e.target.style.background = '#10b981';
                    }
                  }}
                >
                  {uploading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #ffffff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaUpload /> Add Bulk Stock
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Overlay for mobile */}
          {showMappingSidebar && windowWidth <= 768 && (
            <div
              onClick={() => setShowMappingSidebar(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 999
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default AddStock;

